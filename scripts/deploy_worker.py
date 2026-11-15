#!/usr/bin/env python3
"""Выкладывает worker/worker.js в Cloudflare (Worker «psshop»).

    python3 scripts/deploy_worker.py [--sheet-url URL]

Нужен ключ Cloudflare API (в облачной сессии Claude подставляется автоматически).
Секреты (BOT_TOKEN) не трогает: они хранятся в Cloudflare и сохраняются при выкладке.
"""
import json
import os
import sys
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.cloudflare.com/client/v4'
VARS = {
    'CHAT_ID': '5562428297',
    'GH_REPO': 'naildominant/Ps-shop-test',
    'ALLOWED': 'https://psshop.uz,https://www.psshop.uz,https://naildominant.github.io',
}
STATE = os.path.join(ROOT, 'worker', 'vars.json')  # несекретные настройки, которые меняются (адрес таблицы)


def call(method, path, body=None, raw=None, ctype='application/json'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(API + path, data=data, method=method, headers={'Content-Type': ctype})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=60).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b'{}')


def main():
    extra = json.load(open(STATE)) if os.path.exists(STATE) else {}
    if '--sheet-url' in sys.argv:
        extra['SHEET_URL'] = sys.argv[sys.argv.index('--sheet-url') + 1]
    if '--sheet-token' in sys.argv:
        extra['SHEET_TOKEN'] = sys.argv[sys.argv.index('--sheet-token') + 1]
    json.dump(extra, open(STATE, 'w'), indent=1)
    acc = call('GET', '/accounts')['result'][0]['id']
    kv = next(n['id'] for n in call('GET', f'/accounts/{acc}/storage/kv/namespaces?per_page=100')['result'] if n['title'] == 'psshop-store')
    bindings = [{'type': 'kv_namespace', 'name': 'STORE', 'namespace_id': kv}]
    bindings += [{'type': 'plain_text', 'name': k, 'text': v} for k, v in {**VARS, **extra}.items()]
    meta = {'main_module': 'worker.js', 'compatibility_date': '2024-09-23', 'bindings': bindings, 'keep_bindings': ['secret_text']}
    b = uuid.uuid4().hex
    code = open(os.path.join(ROOT, 'worker', 'worker.js'), 'rb').read()
    body = (f'--{b}\r\nContent-Disposition: form-data; name="metadata"; filename="metadata.json"\r\nContent-Type: application/json\r\n\r\n'.encode()
            + json.dumps(meta).encode()
            + f'\r\n--{b}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n'.encode()
            + code + f'\r\n--{b}--\r\n'.encode())
    r = call('PUT', f'/accounts/{acc}/workers/scripts/psshop', raw=body, ctype=f'multipart/form-data; boundary={b}')
    print('Worker выложен' if r.get('success') else f'Ошибка: {r.get("errors")}')


if __name__ == '__main__':
    main()
