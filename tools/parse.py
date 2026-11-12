import re,html,json,glob,sys
posts={}
for f in glob.glob(sys.argv[1]+'/p*.html'):
    s=open(f,encoding='utf-8').read()
    for m in re.finditer(r'<div class="tgme_widget_message_wrap.*?(?=<div class="tgme_widget_message_wrap|\Z)',s,re.S):
        b=m.group(0)
        pid=re.search(r'data-post="psshopgo/(\d+)"',b)
        if not pid: continue
        pid=int(pid.group(1))
        t=re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>',b,re.S)
        txt=''
        if t:
            x=re.sub(r'<br\s*/?>','\n',t.group(1)); x=re.sub(r'<[^>]+>','',x); txt=html.unescape(x).strip()
        imgs=re.findall(r"background-image:url\('([^']+)'\)",b)
        imgs=[i for i in imgs if 'telesco.pe' in i or 'telegram' in i]
        date=re.search(r'datetime="([^"]+)"',b)
        posts[pid]={'id':pid,'text':txt,'imgs':imgs,'date':date.group(1) if date else ''}
out=[posts[k] for k in sorted(posts)]
json.dump(out,open('posts.json','w'),ensure_ascii=False,indent=1)
print(len(out), sum(1 for p in out if p['text']), sum(1 for p in out if p['imgs']))
