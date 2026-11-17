"""Публикация готового поста PS SHOP в Telegram через Bot API.

Пост — это папка designer/posts/<имя>/ с двумя файлами:
    image.png  — картинка (1080×1350 или 1080×1920)
    post.html  — текст поста в HTML-разметке Telegram (<b>, <i>, <a href>, <u>, <s>, <code>)

Запуск (обычно из GitHub Actions, workflow «publish-post»):
    python3 designer/scripts/publish.py designer/posts/<имя> --to test      # превью владельцу в личку
    python3 designer/scripts/publish.py designer/posts/<имя> --to channel   # в канал @psshopgo
    python3 designer/scripts/publish.py designer/posts/<имя> --check        # только проверка, без отправки
    python3 designer/scripts/publish.py --whoami                            # показать chat id тех, кто писал боту
    python3 designer/scripts/publish.py --collect-emoji                     # собрать коды премиум-эмодзи из сообщений боту

Премиум-эмодзи: designer/emoji.json (обычный эмодзи → custom_emoji_id) — при отправке подставляются автоматически.
Если Telegram их не примет, пост уйдёт с обычными эмодзи.

Переменные окружения: TELEGRAM_BOT_TOKEN (обязательно), TELEGRAM_CHANNEL (по умолчанию @psshopgo),
TELEGRAM_OWNER_CHAT_ID (для --to test). Можно положить их в designer/.env (файл не попадает в git).
"""
import argparse, json, os, re, sys, uuid, urllib.request, urllib.error
from html.parser import HTMLParser

CAPTION_LIMIT = 1024   # лимит подписи к фото в Telegram
TEXT_LIMIT = 4096
ALLOWED = {"b", "strong", "i", "em", "u", "ins", "s", "strike", "del", "a", "code", "pre", "blockquote", "tg-spoiler", "span", "tg-emoji"}

def load_env():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"'))

class Checker(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.errors = []; self.text = []
    def handle_starttag(self, tag, attrs):
        if tag not in ALLOWED: self.errors.append(f"тег <{tag}> Telegram не поддерживает")
        if tag == "a" and not dict(attrs).get("href", "").startswith(("http://", "https://", "tg://")):
            self.errors.append("у ссылки <a> нет правильного href")
        self.stack.append(tag)
    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag: self.errors.append(f"тег </{tag}> закрыт не по порядку")
        else: self.stack.pop()
    def handle_data(self, data): self.text.append(data)

def visible_len(html):
    c = Checker(); c.feed(html); c.close()
    if c.stack: c.errors.append("не закрыты теги: " + ", ".join(c.stack))
    return len("".join(c.text)), c.errors

def check_post(folder):
    img = os.path.join(folder, "image.png"); txt = os.path.join(folder, "post.html")
    problems = []
    if not os.path.exists(img): problems.append("нет image.png")
    if not os.path.exists(txt): problems.append("нет post.html")
    if problems: return None, None, problems
    html = open(txt, encoding="utf-8").read().strip()
    n, errs = visible_len(html); problems += errs
    if n > TEXT_LIMIT: problems.append(f"текст длиннее {TEXT_LIMIT} символов ({n})")
    if "@Gaynullin_Nail" not in html and "t.me/Gaynullin_Nail" not in html:
        problems.append("нет контакта @Gaynullin_Nail")
    size = os.path.getsize(img)
    if size > 10 * 1024 * 1024: problems.append("картинка больше 10 МБ")
    return img, html, problems

def api(token, method, fields=None, files=None):
    url = f"{os.environ.get('TELEGRAM_API', 'https://api.telegram.org')}/bot{token}/{method}"
    if files:
        b = uuid.uuid4().hex; body = b""
        for k, v in (fields or {}).items():
            body += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        for k, path in files.items():
            body += (f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{os.path.basename(path)}\"\r\n"
                     f"Content-Type: image/png\r\n\r\n").encode() + open(path, "rb").read() + b"\r\n"
        body += f"--{b}--\r\n".encode()
        req = urllib.request.Request(url, body, {"Content-Type": f"multipart/form-data; boundary={b}"})
    else:
        req = urllib.request.Request(url, json.dumps(fields or {}).encode(), {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: res = json.load(r)
    except urllib.error.HTTPError as e:
        res = json.load(e)
    if not res.get("ok"):
        sys.exit(f"Telegram ответил ошибкой: {res.get('description')}")
    return res["result"]

EMOJI_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "emoji.json")

def premium_emoji(html):
    """Заменяет обычные эмодзи на премиум-эмодзи владельца из designer/emoji.json (только в тексте, не в тегах)."""
    if not os.path.exists(EMOJI_FILE): return html
    m = json.load(open(EMOJI_FILE, encoding="utf-8"))
    if not m: return html
    keys = sorted(m, key=len, reverse=True)
    pat = re.compile("|".join(re.escape(k) for k in keys))
    parts = re.split(r"(<[^>]+>)", html); inside_emoji = False
    for i, part in enumerate(parts):
        if part.startswith("<"):
            inside_emoji = part.startswith("<tg-emoji") or (inside_emoji and not part.startswith("</tg-emoji"))
            continue
        if not inside_emoji:
            parts[i] = pat.sub(lambda x: f'<tg-emoji emoji-id="{m[x.group(0)]}">{x.group(0)}</tg-emoji>', part)
    return "".join(parts)

def collect_emoji(token):
    """Читает сообщения, присланные боту, и собирает коды премиум-эмодзи: обычный эмодзи → id."""
    found = {}
    for u in api(token, "getUpdates", {"limit": 100}):
        msg = u.get("message") or u.get("channel_post") or {}
        for text_key, ent_key in (("text", "entities"), ("caption", "caption_entities")):
            t = msg.get(text_key) or ""; b = t.encode("utf-16-le")
            for e in msg.get(ent_key) or []:
                if e.get("type") == "custom_emoji":
                    ch = b[e["offset"] * 2:(e["offset"] + e["length"]) * 2].decode("utf-16-le")
                    found[ch] = e["custom_emoji_id"]
    if not found: print("Премиум-эмодзи не найдено. Отправьте боту сообщение с премиум-эмодзи и запустите снова."); return
    print("EMOJI_JSON_START"); print(json.dumps(found, ensure_ascii=False, indent=1)); print("EMOJI_JSON_END")
    print(f"Найдено эмодзи: {len(found)}")

def publish(token, chat, img, html, buttons=False):
    plain = html; html = premium_emoji(html)
    n, _ = visible_len(html)
    try:
        ids, r = _send(token, chat, img, html, n)
    except SystemExit as e:
        if html == plain: raise
        print(f"Премиум-эмодзи не приняты ({e}). Отправляю с обычными эмодзи.")
        ids, r = _send(token, chat, img, plain, n)
    if buttons:
        _control(token, chat, ids)
    chat_info = r.get("chat", {}); user = chat_info.get("username")
    print("Отправлено:", f"https://t.me/{user}/{r['message_id']}" if user else f"сообщение {r['message_id']}")

POST_NAME = ""  # имя папки поста, попадает в кнопки (для статуса и отзыва при отмене)
WORKER_URL = os.environ.get("WORKER_URL", "https://psshop.psshop.workers.dev")

def _control(token, chat, ids):
    """Под превью — кнопки. «✅ Опубликовать» публикует от аккаунта владельца (премиум-эмодзи сохраняются)."""
    text = "👆 <b>Пост готов.</b> Опубликовать в канал?"
    kb = {"inline_keyboard": [[{"text": "✅ Опубликовать", "callback_data": f"go::{POST_NAME}"[:64]}],
                              [{"text": "❌ Нужна доработка", "callback_data": f"no::{POST_NAME}"[:64]}]]}
    c = api(token, "sendMessage", {"chat_id": chat, "text": text, "parse_mode": "HTML", "reply_to_message_id": ids[0], "reply_markup": kb})
    # сообщить серверу, какой пост ждёт публикации (сервер проверяет токен бота)
    try:
        req = urllib.request.Request(f"{WORKER_URL}/tgpost/pending", json.dumps(
            {"token": token, "post": POST_NAME, "chat": chat, "ctrl": c["message_id"]}).encode(), {"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r: print("Сервер:", r.read().decode()[:200])
    except Exception as e:
        print("Сервер не ответил (статус публикации не будет отслеживаться):", e)

def _send(token, chat, img, html, n):
    if n <= CAPTION_LIMIT:
        r = api(token, "sendPhoto", {"chat_id": chat, "caption": html, "parse_mode": "HTML"}, {"photo": img})
        return [r["message_id"]], r
    ph = api(token, "sendPhoto", {"chat_id": chat}, {"photo": img})  # длинный текст: картинка, затем текст
    r = api(token, "sendMessage", {"chat_id": chat, "text": html, "parse_mode": "HTML", "link_preview_options": {"is_disabled": True}})
    return [ph["message_id"], r["message_id"]], r

def main():
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?")
    ap.add_argument("--to", choices=["test", "channel"], default="test")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--whoami", action="store_true")
    ap.add_argument("--collect-emoji", action="store_true")
    a = ap.parse_args()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if a.collect_emoji:
        if not token: sys.exit("Нет TELEGRAM_BOT_TOKEN")
        collect_emoji(token); return
    if a.whoami:
        if not token: sys.exit("Нет TELEGRAM_BOT_TOKEN")
        seen = {}
        for u in api(token, "getUpdates", {"limit": 100}):
            m = u.get("message") or u.get("channel_post") or u.get("my_chat_member") or {}
            c = m.get("chat") or {}
            if c: seen[c["id"]] = c.get("username") or c.get("title") or c.get("first_name")
        print("Кто писал боту (chat id → имя):" if seen else "Боту ещё никто не писал. Отправьте ему /start и запустите снова.")
        for k, v in seen.items(): print(f"  {k} → {v}")
        return
    if not a.folder: sys.exit("Укажите папку поста, например designer/posts/2026-11-17-sait")
    img, html, problems = check_post(a.folder)
    n = visible_len(html)[0] if html else 0
    print(f"Пост: {a.folder}  |  текст {n} символов  |  {'подпись к фото' if n <= CAPTION_LIMIT else 'фото + отдельное сообщение'}")
    if problems: sys.exit("Нужно поправить:\n  - " + "\n  - ".join(problems))
    print("Проверка пройдена.")
    if a.check: return
    if not token: sys.exit("Нет TELEGRAM_BOT_TOKEN")
    if a.to == "channel": chat = os.environ.get("TELEGRAM_CHANNEL") or "@psshopgo"
    else:
        chat = os.environ.get("TELEGRAM_OWNER_CHAT_ID")
        if not chat: sys.exit("Нет TELEGRAM_OWNER_CHAT_ID для превью. Запустите режим «узнать chat id».")
    global POST_NAME
    POST_NAME = os.path.basename(os.path.normpath(a.folder))
    publish(token, chat, img, html, buttons=(a.to == "test"))

if __name__ == "__main__":
    main()
