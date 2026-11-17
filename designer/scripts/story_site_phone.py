from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, random, math
random.seed(21)
W,H=1080,1920; F="/usr/share/fonts/opentype/inter/"; SERIF="/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
def font(n,s): return ImageFont.truetype(F+n,s)
def cond_text(txt,fnt,sx=0.72,fill=(255,255,255,255)):
    d=ImageDraw.Draw(Image.new("L",(1,1))); bb=d.textbbox((0,0),txt,font=fnt)
    im=Image.new("RGBA",(bb[2]-bb[0]+40,bb[3]-bb[1]+10),(0,0,0,0))
    ImageDraw.Draw(im).text((-bb[0]+20,-bb[1]+5),txt,font=fnt,fill=fill)
    return im.resize((int(im.width*sx),im.height),Image.LANCZOS)
def vgrad(im,c1,c2,alpha=1.0):
    a=np.array(im).astype(float); t=np.linspace(0,1,a.shape[0])[:,None]
    for k in range(3): a[...,k]=c1[k]*(1-t)+c2[k]*t
    a[...,3]*=alpha; return Image.fromarray(a.astype("uint8"))
def hgrad(im,c1,c2):
    a=np.array(im).astype(float); t=np.linspace(0,1,a.shape[1])[None,:]
    for k in range(3): a[...,k]=c1[k]*(1-t)+c2[k]*t
    return Image.fromarray(a.astype("uint8"))
def glow(base,im,xy,blur,times=1):
    g=Image.new("RGBA",base.size,(0,0,0,0)); g.alpha_composite(im,xy); g=g.filter(ImageFilter.GaussianBlur(blur))
    for _ in range(times): base.alpha_composite(g)
def tint(im,col): t=Image.new("RGBA",im.size,col+(255,)); t.putalpha(im.split()[3]); return t
def spaced(d,xy,txt,fnt,fill,sp=6,anchor="l"):
    w=sum(d.textlength(c,font=fnt) for c in txt)+sp*(len(txt)-1); x,y=xy
    x = x-w if anchor=="r" else (x-w/2 if anchor=="c" else x)
    for c in txt: d.text((x,y),c,font=fnt,fill=fill); x+=d.textlength(c,font=fnt)+sp
    return w
# ---------- bg
bg=Image.new("RGB",(W,H),(5,3,12))
for box,col,r in [((100,350,1000,1300),(100,30,200),240),((-300,1100,600,1900),(150,25,140),260),((600,800,1400,1700),(20,60,210),260),((300,-200,900,350),(60,20,130),200)]:
    g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse(box,fill=col); bg=ImageChops.add(bg,g.filter(ImageFilter.GaussianBlur(r)))
bg=bg.convert("RGBA")
# perspective grid floor
d=ImageDraw.Draw(bg); hz=1350
for i in range(-14,15):
    d.line((W/2+i*30,hz,W/2+i*220,H),fill=(140,90,255,50),width=2)
for k in range(12):
    y=hz+(k**1.8)*6
    if y<H: d.line((0,y,W,y),fill=(140,90,255,int(55*(1-k/12))),width=2)
# ---------- giant word
word=cond_text("САЙТ",font("InterDisplay-Black.otf",560),0.80)
word=vgrad(word,(255,120,230),(90,90,255),1.0)
wx=(W-word.width)//2; wy=370
glow(bg,tint(word,(170,80,255)),(wx,wy),40,1)
bg.alpha_composite(word,(wx,wy))
# ---------- phone (2x)
S=2; PW,PH=440,900
P=Image.new("RGBA",(PW*S,PH*S),(0,0,0,0)); d=ImageDraw.Draw(P)
d.rounded_rectangle((0,0,PW*S-1,PH*S-1),64*S,fill=(16,13,30,255))
# rim gradient
rim=Image.new("L",P.size,0); ImageDraw.Draw(rim).rounded_rectangle((0,0,PW*S-1,PH*S-1),64*S,outline=255,width=6*S)
P.alpha_composite(tint(Image.merge("RGBA",[rim]*4),(0,0,0)).point(lambda v:v))  # placeholder no-op
rg=hgrad(Image.new("RGBA",P.size,(255,255,255,255)),(200,100,255),(60,200,255)); rg.putalpha(rim); P.alpha_composite(rg)
sx0,sy0,sx1,sy1=16*S,16*S,(PW-16)*S,(PH-16)*S
d.rounded_rectangle((sx0,sy0,sx1,sy1),50*S,fill=(10,8,22,255))
d.rounded_rectangle(((PW/2-55)*S,26*S,(PW/2+55)*S,52*S),14*S,fill=(0,0,0,255))
f=lambda n,s: font(n,s*S)
# header
d.text((36*S,70*S),"PS SHOP",font=f("InterDisplay-Black.otf",30),fill=(255,255,255))
d.ellipse(((PW-80)*S,72*S,(PW-44)*S,108*S),fill=(124,58,237))
d.rounded_rectangle((36*S,124*S,(PW-36)*S,168*S),22*S,fill=(30,25,55),outline=(80,65,140),width=2*S)
d.text((60*S,134*S),"Поиск игры…",font=f("Inter-Medium.otf",20),fill=(150,140,200))
# banner
bn=hgrad(Image.new("RGBA",((PW-72)*S,150*S),(255,255,255,255)),(255,80,210),(80,120,255))
bm=Image.new("L",bn.size,0); ImageDraw.Draw(bm).rounded_rectangle((0,0,bn.width-1,bn.height-1),26*S,fill=255); bn.putalpha(bm)
bd=ImageDraw.Draw(bn); bd.text((22*S,22*S),"ХИТЫ",font=f("InterDisplay-Black.otf",46),fill=(255,255,255)); bd.text((22*S,78*S),"НЕДЕЛИ",font=f("InterDisplay-Black.otf",46),fill=(255,255,255))
ov=Image.new("RGBA",bn.size,(0,0,0,0)); od=ImageDraw.Draw(ov)
for cx_,cy_,r_ in [(300,40,46),(250,120,30),(330,120,18)]: od.ellipse(((cx_-r_)*S,(cy_-r_)*S,(cx_+r_)*S,(cy_+r_)*S),fill=(255,255,255,70))
ov.putalpha(ImageChops.multiply(ov.split()[3],bm)); bn.alpha_composite(ov)
P.alpha_composite(bn,(36*S,186*S))
# game cards grid 2x2 (abstract original art)
pal=[((255,90,200),(255,190,90)),((70,200,255),(120,70,255)),((150,255,170),(40,140,255)),((255,120,120),(150,60,255))]
cw,ch=(PW-72-18)//2,250; gy=356
prices=["389 000","529 000","259 000","449 000"]
for i in range(4):
    x=36+(i%2)*(cw+18); y=gy+(i//2)*(ch+18)
    card=Image.new("RGBA",(cw*S,ch*S),(0,0,0,0)); cd=ImageDraw.Draw(card)
    cd.rounded_rectangle((0,0,cw*S-1,ch*S-1),22*S,fill=(26,22,48))
    art=hgrad(Image.new("RGBA",(cw*S,150*S),(255,255,255,255)),*pal[i])
    am=Image.new("L",art.size,0); ImageDraw.Draw(am).rounded_rectangle((0,0,art.width-1,art.height+40),22*S,fill=255); art.putalpha(am)
    ov=Image.new("RGBA",art.size,(0,0,0,0)); od=ImageDraw.Draw(ov)
    for _ in range(4):
        rx,ry,rr=random.randint(10,cw-10),random.randint(10,140),random.randint(10,40)
        od.ellipse(((rx-rr)*S,(ry-rr)*S,(rx+rr)*S,(ry+rr)*S),fill=(255,255,255,random.randint(40,110)))
    ov.putalpha(ImageChops.multiply(ov.split()[3],am)); art.alpha_composite(ov)
    card.alpha_composite(art)
    cd.rounded_rectangle((14*S,166*S,(cw-40)*S,180*S),7*S,fill=(200,190,240))
    cd.rounded_rectangle((14*S,190*S,(cw-80)*S,200*S),5*S,fill=(110,100,160))
    cd.text((14*S,212*S),prices[i]+" UZS",font=f("Inter-Bold.otf",17),fill=(255,150,230))
    P.alpha_composite(card,(x*S,y*S))
# CTA button in phone
by_=PH-130
btn=hgrad(Image.new("RGBA",((PW-72)*S,72*S),(255,255,255,255)),(255,80,210),(124,58,237))
bm=Image.new("L",btn.size,0); ImageDraw.Draw(bm).rounded_rectangle((0,0,btn.width-1,btn.height-1),36*S,fill=255); btn.putalpha(bm)
bd=ImageDraw.Draw(btn); tf=f("Inter-Black.otf",28); tw=bd.textlength("Оформить",font=tf); bd.text(((btn.width-tw)/2,18*S),"Оформить",font=tf,fill=(255,255,255))
P.alpha_composite(btn,(36*S,by_*S))
phone=P.resize((int(PW*0.86),int(PH*0.86)),Image.LANCZOS).rotate(-9,resample=Image.BICUBIC,expand=True)
px,py=(W-phone.width)//2+10,560
# shadow + glow
sh=tint(phone,(0,0,0)); g=Image.new("RGBA",(W,H),(0,0,0,0)); g.alpha_composite(sh,(px+40,py+60)); g=g.filter(ImageFilter.GaussianBlur(40)); bg.alpha_composite(g)
glow(bg,tint(phone,(170,90,255)),(px,py),55,2)
bg.alpha_composite(phone,(px,py))
# cursor + ripple near button
cxp,cyp=px+phone.width//2+60,py+phone.height-120
d=ImageDraw.Draw(bg)
for rr,a in [(70,60),(48,110),(28,180)]: d.ellipse((cxp-rr,cyp-rr,cxp+rr,cyp+rr),outline=(255,255,255,a),width=3)
cur=[(0,0),(0,62),(16,48),(28,74),(40,68),(28,44),(50,44)]
cur=[(cxp+x,cyp+y) for x,y in cur]
d.polygon([(x+4,y+4) for x,y in cur],fill=(0,0,0,120)); d.polygon(cur,fill=(255,255,255),outline=(30,10,60))
# ---------- floating glass chips
def chip(text,icon_col):
    fnt=font("Inter-Bold.otf",30); w=int(ImageDraw.Draw(Image.new("L",(1,1))).textlength(text,font=fnt))+110
    c=Image.new("RGBA",(w,78),(0,0,0,0)); cd=ImageDraw.Draw(c)
    cd.rounded_rectangle((0,0,w-1,77),39,fill=(255,255,255,40),outline=(255,255,255,140),width=2)
    cd.ellipse((16,17,60,61),fill=icon_col); cd.text((76,20),text,font=fnt,fill=(255,255,255)); return c
for text,col,ang,(x,y) in [("Каталог всех игр",(255,90,210),6,(36,720)),("Заказ в пару кликов",(80,200,255),-5,(600,940)),("Скоро — новые фишки",(150,110,255),4,(30,1075))]:
    c=chip(text,col).rotate(ang,resample=Image.BICUBIC,expand=True)
    glow(bg,tint(c,(160,90,255)),(x,y),18,1); bg.alpha_composite(c,(x,y))
# re-draw top of giant word OVER phone? (phone already in front) -> serif line over word
ser=cond_text("у нас открылся",ImageFont.truetype(SERIF,118),1.0,(255,170,235,255))
glow(bg,tint(ser,(255,80,210)),((W-ser.width)//2,250),14,1); bg.alpha_composite(ser,((W-ser.width)//2,250))
# ---------- logo top-left & top-right text
lg=Image.open("assets/logo.png").convert("RGB").crop((250,190,1004,1040))
a=np.array(lg).astype(float); lum=a.max(axis=2)/255
lg=Image.fromarray(np.dstack([a,np.clip((lum-0.05)*3.5,0,1)*255]).astype("uint8"),"RGBA"); lg=lg.resize((int(lg.width*140/lg.height),140),Image.LANCZOS)
bg.alpha_composite(lg,(48,60))
d=ImageDraw.Draw(bg)
spaced(d,(W-56,82),"NEW",font("Inter-Black.otf",24),(255,150,230),8,"r")
spaced(d,(W-56,118),"ОНЛАЙН-МАГАЗИН",font("Inter-Medium.otf",18),(190,180,235),5,"r")
# vertical side text
vt=Image.new("RGBA",(900,40),(0,0,0,0)); spaced(ImageDraw.Draw(vt),(0,8),"PSSHOP.UZ  —  ИГРЫ И ПОДПИСКИ PS5",font("Inter-Medium.otf",18),(200,190,240,200),7)
bg.alpha_composite(vt.rotate(90,expand=True),(W-46,560))
# ---------- bottom: domain big
dom=cond_text("psshop.uz",font("InterDisplay-Black.otf",150),0.86)
dom=hgrad(dom,(255,255,255),(220,210,255))
dy=1500; glow(bg,tint(dom,(150,90,255)),((W-dom.width)//2,dy),24,1); bg.alpha_composite(dom,((W-dom.width)//2,dy))
d=ImageDraw.Draw(bg)
f3=font("Inter-Medium.otf",28); t3="ЗАХОДИ ПЕРВЫМ"; w3=spaced(d,(W/2,dy+dom.height+26),t3,f3,(240,235,255),10,"c")
for x1,x2 in [((W-w3)/2-120,(W-w3)/2-28),((W+w3)/2+28,(W+w3)/2+120)]: d.line((x1,dy+dom.height+44,x2,dy+dom.height+44),fill=(220,170,255),width=2)
# sparks
for _ in range(80):
    x=random.randint(20,W-20); y=random.randint(200,1650); rr=random.choice([1,1,2,2,3])
    d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=random.choice([(255,160,240),(140,190,255),(255,255,255)])+(random.randint(60,200),))
n=np.random.normal(0,6,(H,W,1)); out=np.clip(np.array(bg.convert("RGB")).astype(float)+n,0,255)
Image.fromarray(out.astype("uint8")).save("output/ps_shop_site_story_v3.png"); print(py+phone.height, dy+dom.height)
