#!/usr/bin/env python3
"""Разбирает видео: описание, субтитры (текст речи) и кадры.

Использование:
    python3 watch.py <ссылка на YouTube или путь к видеофайлу> [--out ПАПКА] [--frames N] [--video]

Что получается в папке --out:
    info.md        название, канал, длительность, описание, ссылки из описания
    transcript.md  текст речи с тайм-кодами (из субтитров YouTube)
    frames/        кадры на сменах сцен (jpg), имя файла = тайм-код
    thumbnail.jpg  обложка ролика (если видео скачать не удалось)
    report.md      короткая сводка: что получилось, что нет
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SUB_LANGS = "ru,ru-orig,en,en-orig"
CLIENTS = [None, "web_embedded", "mweb"]


def run(cmd, timeout=600):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        return 124, "timeout"
    except FileNotFoundError as e:
        return 127, str(e)


def ts(seconds):
    seconds = int(seconds)
    h, m, s = seconds // 3600, seconds % 3600 // 60, seconds % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def vtt_to_lines(path):
    """Субтитры VTT -> список (секунда, текст) без повторов автосубтитров."""
    out, seen, cur = [], set(), 0
    for line in Path(path).read_text(encoding="utf-8", errors="ignore").splitlines():
        m = re.match(r"(\d+):(\d+):(\d+)\.\d+\s+-->", line)
        if m:
            cur = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3])
            continue
        if not line.strip() or line.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        text = re.sub(r"<[^>]+>", "", line).strip()
        if text and text not in seen:
            seen.add(text)
            out.append((cur, text))
    return out


def write_transcript(lines, path, step=30):
    """Склеивает строки в абзацы примерно по `step` секунд."""
    chunks, start, buf = [], None, []
    for sec, text in lines:
        if start is None:
            start = sec
        if sec - start >= step and buf:
            chunks.append((start, " ".join(buf)))
            start, buf = sec, []
        buf.append(text)
    if buf:
        chunks.append((start, " ".join(buf)))
    path.write_text(
        "# Текст речи\n\n" + "\n\n".join(f"**[{ts(s)}]** {t}" for s, t in chunks) + "\n",
        encoding="utf-8",
    )


def extract_frames(video, frames_dir, max_frames):
    """Кадры на сменах сцен; если сцен мало, добирает равномерно."""
    frames_dir.mkdir(parents=True, exist_ok=True)
    code, out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=nw=1:nk=1", str(video)])
    try:
        duration = float(out.strip().splitlines()[0])
    except (ValueError, IndexError):
        duration = 0

    # 1) смены сцен
    code, out = run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf",
                     "select='gt(scene,0.3)',showinfo", "-vsync", "vfr",
                     "-f", "null", "-"], timeout=900)
    times = [float(t) for t in re.findall(r"pts_time:([\d.]+)", out)]
    times = [0.0] + times
    # 2) если сцен мало — добавить равномерные точки
    if duration and len(times) < max_frames // 2:
        n = max_frames - len(times)
        times += [duration * (i + 0.5) / n for i in range(n)]
    times = sorted(set(round(t, 1) for t in times))
    # 3) если слишком много — проредить равномерно
    if len(times) > max_frames:
        k = len(times) / max_frames
        times = [times[int(i * k)] for i in range(max_frames)]

    saved = []
    for t in times:
        name = frames_dir / f"{ts(t).replace(':', '-')}.jpg"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(t),
             "-i", str(video), "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", str(name)])
        if name.exists():
            saved.append(name.name)
    return saved, duration


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="ссылка на YouTube или путь к видеофайлу")
    ap.add_argument("--out", default="watch-out")
    ap.add_argument("--frames", type=int, default=40, help="сколько кадров максимум")
    ap.add_argument("--video", action="store_true",
                    help="скачать и само видео ради кадров (только с разрешения пользователя)")
    a = ap.parse_args()

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    report = []
    video = None
    local = Path(a.source).exists()

    if local:
        video = Path(a.source)
        (out / "info.md").write_text(f"# {video.name}\n\nЛокальный файл.\n", encoding="utf-8")
        report.append("Источник: локальный файл")
    else:
        if not shutil.which("yt-dlp"):
            sys.exit("yt-dlp не установлен: pip install -U yt-dlp")
        tmpl = str(out / "src.%(ext)s")
        # описание + субтитры + обложка. YouTube иногда просит «подтвердить, что не робот»
        # для обычного режима — тогда пробуем другие стандартные режимы yt-dlp.
        info_file = out / "src.info.json"
        log = ""
        for client in CLIENTS:
            extra = ["--extractor-args", f"youtube:player_client={client}"] if client else []
            code, log = run(["yt-dlp", "--skip-download", "--ignore-no-formats-error",
                             "--write-info-json", "--write-thumbnail",
                             "--convert-thumbnails", "jpg", "--write-subs", "--write-auto-subs",
                             "--sub-langs", SUB_LANGS, "--sub-format", "vtt",
                             "--sleep-subtitles", "2", *extra, "-o", tmpl, a.source])
            if info_file.exists():
                break
        if info_file.exists():
            info = json.loads(info_file.read_text(encoding="utf-8"))
            desc = info.get("description") or ""
            links = sorted(set(re.findall(r"https?://\S+", desc)))
            (out / "info.md").write_text(
                f"# {info.get('title')}\n\n"
                f"- Канал: {info.get('channel') or info.get('uploader')}\n"
                f"- Длительность: {ts(info.get('duration') or 0)}\n"
                f"- Дата: {info.get('upload_date')}\n"
                f"- Ссылка: {info.get('webpage_url')}\n\n"
                f"## Описание\n\n{desc}\n\n"
                f"## Ссылки из описания\n\n" + "\n".join(f"- {l}" for l in links) + "\n",
                encoding="utf-8")
            info_file.unlink()
            report.append("Описание: есть")
        else:
            report.append("Описание: НЕ получено\n" + log[-800:])
        thumb = next(out.glob("src.jpg"), None)
        if thumb:
            thumb.rename(out / "thumbnail.jpg")

        # субтитры: русский приоритетнее
        subs = sorted(out.glob("src.*.vtt"), key=lambda p: (".ru" not in p.name, p.name))
        if subs:
            write_transcript(vtt_to_lines(subs[0]), out / "transcript.md")
            report.append(f"Текст речи: есть ({subs[0].name.split('.')[1]})")
        else:
            report.append("Текст речи: субтитров нет")
        for s in subs:
            s.unlink()

        if a.video:
            code, log = run(["yt-dlp", "-f", "bv*[height<=480]+ba/b[height<=480]/worst",
                             "--merge-output-format", "mp4", "-o", str(out / "video.%(ext)s"),
                             a.source], timeout=900)
            video = next(out.glob("video.*"), None)
            if not video:
                report.append("Видео: скачать НЕ удалось (кадров не будет)\n" + log[-600:])

    if video and shutil.which("ffmpeg"):
        saved, duration = extract_frames(video, out / "frames", a.frames)
        report.append(f"Кадры: {len(saved)} шт. в frames/ (длительность {ts(duration)})")
        if not local:
            video.unlink()  # видео больше не нужно, место экономим
    (out / "report.md").write_text("# Сводка\n\n" + "\n".join(f"- {r}" for r in report) + "\n",
                                   encoding="utf-8")
    print("\n".join(report))
    print(f"\nГотово: {out.resolve()}")


if __name__ == "__main__":
    main()
