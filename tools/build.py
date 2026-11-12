import json,re,difflib,os,io,urllib.request,concurrent.futures as cf
from PIL import Image
posts={x['id']:x for x in json.load(open('posts.json'))}
g=json.load(open('games.json'))
fix={549:'RESIDENT EVIL RACCOON CITY EDITION (3 ИГРЫ)',68:'OVERCOOKED + OVERCOOKED 2',273:'FAR CRY 5 + FAR CRY NEW DAWN',402:'DOOM: THE DARK AGES',1055:'RATCHET & CLANK: RIFT APART'}
g=[a for a in g if a['post']!=416]
for a in g:
    if a['post'] in fix: a['title']=fix[a['post']]
def cov(i): return next(u for u in posts[i]['imgs'] if 'telesco' in u)
def add(post,title,ps4,ps5,lang,edition='Standard',players='1',notes=None,preorder=False,release=None,editions=None):
    g.append(dict(post=post,date=posts[post]['date'][:10],title=title,ps4=ps4,ps5=ps5,preorder=preorder,release=release,lang=lang,edition=edition,players=players,notes=notes or [],cover=cov(post),editions=editions))
add(1225,'GRAND THEFT AUTO VI',None,890000,'Русские субтитры',players='1',preorder=True,release='19.11.2026',
    notes=['Подключим дистанционно — привозить консоль не нужно','Гарантия 5 лет и поддержка 24/7'],
    editions=[{'name':'Standard','price':890000},{'name':'Ultimate','price':1090000}])
add(476,'STYX: BLADES OF GREED',None,510000,'Русские субтитры',notes=['PS5: Styx: Master of Shadows + Blades of Greed'])
add(979,'GROUNDED 2',None,359000,'Английский язык',players='1–4',editions=[{'name':'Standard Edition','price':359000},{'name':'Founder Edition','price':419000}])
add(1059,'MORTAL SHELL 2',None,449000,'Русские субтитры',editions=[{'name':'Standard','price':449000},{'name':'Devout','price':538000}])
for a in g:
    if a['title']=='RESIDENT EVIL 9: REQUIEM': a['editions']=[{'name':'Standard','price':623000},{'name':'Deluxe','price':656000}]
def norm(s): return re.sub(r'[^a-z0-9а-я]','',s.lower().replace('’',"'"))
bf=re.findall(r'\n([^\n━]+)\n\s+([\d ]+) сум ➜',posts[1228]['text'])
keys={norm(a['title']):a for a in g}
alias={'gtav':'gta5','codmodernwarfare2019':'callofdutymodernwarfare1','marvelsspiderman':'spiderman','codblackopsiii':'callofdutyblackopsiii',
'thelastofuspartι':'','thelastofusparti':'thelastofuspart1','marvelsspiderman2':'spiderman2','eafc26':'fc26','spidermanmilesmorales':'spidermanmilesmorales',
'ведьмак3дикаяохота':'ведьмак3дикаяохота','thelastofuspartiiremastered':'thelastofuspart2remastered','godofwarragnarök':'godofwarragnarok',
'codblackopscoldwar':'callofdutyblackopscoldwar','codwwii':'callofdutywwii','codblackops6':'callofdutyblackops6','ghostofyōtei':'ghostofyotei',
'skyrim':'theelderscrollsvskyrim','mortalkombat11ultimate':'mortalkombat11ultimate','acvalhalla':'assassinscreedvalhalla','acodyssey':'assassinscreedodyssey',
'farcry5newdawn':'','residentevil4remake':'residentevil4remakevr2','residentevilvillage':'residentevilvillage','bloodbornegoty':'bloodbornegameoftheyear',
'crashnsanetrilogyctr':'crashbandicootnsanetrilogyctrnitrofueled','batmanarkhamcollection':'batmanarkhamcollection','diabloiv':'diablo4'}
hits=0
for name,_ in bf:
    k=norm(name); k=alias.get(k,k)
    if not k: continue
    if k not in keys:
        m=difflib.get_close_matches(k,keys.keys(),1,0.75)
        if not m: print('nohit',name); continue
        k=m[0]
    keys[k]['hit']=True; hits+=1
print('hits',hits)
os.makedirs('site/covers',exist_ok=True)
def slug(t): return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',t.lower())).strip('-') or 'game'
used=set()
for a in g:
    s=slug(a['title']); 
    if s=='game' or s in used: s=f"{s}-{a['post']}"
    used.add(s); a['id']=s
def dl(a):
    data=urllib.request.urlopen(a['cover'],timeout=60).read()
    im=Image.open(io.BytesIO(data)).convert('RGB'); im.thumbnail((640,640))
    im.save(f"site/covers/{a['id']}.webp",'WEBP',quality=78); return a['id']
with cf.ThreadPoolExecutor(12) as ex: list(ex.map(dl,g))
out=[]
for a in sorted(g,key=lambda a:-a['post']):
    o={k:a.get(k) for k in ('id','title','ps4','ps5','preorder','release','lang','edition','players','notes','editions','hit','post','date')}
    o['cover']=f"covers/{a['id']}.webp"
    out.append({k:v for k,v in o.items() if v not in (None,[],False,'')})
open('site/games.js','w').write('window.GAMES = '+json.dumps(out,ensure_ascii=False,indent=0)+';\n')
print(len(out))
