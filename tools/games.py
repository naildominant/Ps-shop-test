import json,re,sys
p=json.load(open('posts.json'))
def num(s): return int(re.sub(r'\D','',s))
games={}; skipped=[]
for x in p:
    t=x['text']
    if not t: continue
    lines=[l.strip() for l in t.split('\n')]
    first=next((l for l in lines if l),'')
    if not re.search(r'ЦЕНА',t,re.I): continue
    title=None
    for l in lines:
        c=re.sub(r'^[^\wА-Яа-яЁё]+|[^\wА-Яа-яЁё)!]+$','',l).strip()
        if not c or re.search(r'(АКЦИЯ|СКИДКА|ИГРЫ СРАЗУ|ИГР СРАЗУ|BLACK FRIDAY|ИГРА ДНЯ|РАСПРОДАЖ)',c,re.I): continue
        title=c; break
    if not title or len(title)>70: skipped.append((x['id'],title)); continue
    title=re.sub(r'[™®]','',title).strip()
    prices={}
    for l in lines:
        mm=re.search(r'(PS[45])\s*[-—–:]\s*([\d][\d .,]*)\s*(uzs|сум)',l,re.I)
        if mm:
            v=num(mm.group(2))
            if v<1000: v*=1000
            prices[mm.group(1).upper()]=v
            if 'ПРЕДЗАКАЗ' in l.upper(): prices['pre']=True
            if 'VR' in l: prices['vr']=True
    if not any(k in prices for k in ('PS4','PS5')): skipped.append((x['id'],title)); continue
    lang=''
    for l in lines:
        ll=l.lower()
        if 'озвучк' in ll: lang='Русская озвучка'; break
        if 'субтитр' in ll: lang='Русские субтитры'; break
        if 'английск' in ll: lang='Английский язык'; break
    ed=re.search(r'Издание\s*-\s*(.+)',t); pl=re.search(r'Кол-во игроков\s*-\s*(.+)',t)
    rd=re.search(r'ДАТА ВЫХОДА\s*-?\s*(\d\d\.\d\d\.\d{4})',t)
    cover=next((i for i in x['imgs'] if 'telesco.pe' in i),None)
    notes=[]
    if 'PS+' in t and 'необходима' in t: notes.append('Нужна подписка PS Plus')
    if prices.get('vr') or 'VR' in title: notes.append('Нужен PS VR / VR2')
    key=re.sub(r'[^a-zа-я0-9]','',title.lower())
    games[key]=dict(post=x['id'],date=x['date'][:10],title=title,ps4=prices.get('PS4'),ps5=prices.get('PS5'),
        preorder=bool(prices.get('pre')),release=rd.group(1) if rd else None,lang=lang,
        edition=ed.group(1).strip() if ed else 'Standard',players=pl.group(1).strip() if pl else None,notes=notes,cover=cover)
g=sorted(games.values(),key=lambda a:-a['post'])
json.dump(g,open('games.json','w'),ensure_ascii=False,indent=1)
print(len(g),'games; skipped',len(skipped),skipped[:20]); print(sum(1 for a in g if a['cover']),'with cover')
