"""Собирает внутреннюю страницу «Офис PS SHOP» из docs/team-structure.md.

    python3 tools/office/build_office.py [выходной.html]

Источник фактов — только docs/team-structure.md. Поменялся документ → запустить скрипт и
опубликовать страницу заново (приватный артефакт claude.ai, не GitHub Pages).
"""
import base64
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'docs', 'team-structure.md')


def strip_md(s):
    s = re.sub(r'\*\*(.+?)\*\*', r'\1', s)
    s = re.sub(r'`(.+?)`', r'\1', s)
    return s.strip()


def parse(md):
    people, order, cur = {}, [], None
    hours, questions, version = [], [], ''
    section = ''
    lines = md.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('Версия'):
            version = strip_md(line.split('.')[0] + '.' + line.split('.')[1]) if '.' in line else strip_md(line)
        if line.startswith('## '):
            section = line[3:].strip()
            cur = None
            continue
        if line.startswith('### '):
            name = line[4:].strip()
            name = re.sub(r'\s*\(.*\)$', '', name)
            cur = {'name': name, 'items': [], 'fields': [], 'ask': []}
            people[name] = cur
            order.append(name)
            continue
        if section.startswith('День по часам') and line.startswith('|') and not re.match(r'^\|\s*(Время|---)', line):
            c = [strip_md(x) for x in line.strip('|').split('|')]
            if len(c) >= 3:
                hours.append({'t': c[0], 'what': c[1], 'who': c[2]})
            continue
        if section.startswith('Открытые вопросы'):
            m = re.match(r'^\d+\.\s+(.*)', line)
            if m:
                questions.append(strip_md(m[1]))
            continue
        if cur is None:
            continue
        m = re.match(r'^- \*\*(.+?):\*\*\s*(.*)$', line)
        if m:
            cur['fields'].append({'label': m[1], 'text': strip_md(m[2]), 'sub': []})
            continue
        m = re.match(r'^\s{2,}- (.*)$', line)
        if m and cur['fields']:
            cur['fields'][-1]['sub'].append(strip_md(m[1]))
            continue
        m = re.match(r'^- (.*)$', line)
        if m:
            t = strip_md(m[1])
            if t.startswith('❓'):
                cur['ask'].append(re.sub(r'^❓\s*обсудить с менеджером:\s*', '', t, flags=re.I))
            else:
                cur['items'].append(t)
    # кто кому отчитывается — из дерева в начале документа
    tree = re.search(r'```\n(.*?)```', md, re.S)
    return {'people': [people[n] for n in order], 'hours': hours, 'questions': questions,
            'version': version, 'tree': tree[1].rstrip() if tree else ''}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'office.html')
    data = parse(open(SRC, encoding='utf-8').read())
    logo = base64.b64encode(open(os.path.join(HERE, 'logo.webp'), 'rb').read()).decode()
    tpl = open(os.path.join(HERE, 'office.template.html'), encoding='utf-8').read()
    html = tpl.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False)).replace('LOGO_DATA_URI', 'data:image/webp;base64,' + logo)
    open(out, 'w', encoding='utf-8').write(html)
    print(out, len(html), 'bytes,', len(data['people']), 'people,', len(data['hours']), 'hours')


if __name__ == '__main__':
    main()
