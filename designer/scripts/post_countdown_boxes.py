from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np
W,H=1080,1350; F="/usr/share/fonts/opentype/inter/"
def font(n,s): return ImageFont.truetype(F+n,s)
def spaced(d,xy,txt,fnt,fill,sp=6,anchor="l"):
    w=sum(d.textlength(c,font=fnt) for c in txt)+sp*(len(txt)-1); x,y=xy
    x = x-w if anchor=="r" else (x-w/2 if anchor=="c" else x)
    for c in txt: d.text((x,y),c,font=fnt,fill=fill); x+=d.textlength(c,font=fnt)+sp
def glow(base,im,xy,blur,times=1):
    g=Image.new("RGBA",base.size,(0,0,0,0)); g.alpha_composite(im,xy); g=g.filter(ImageFilter.GaussianBlur(blur))
    for _ in range(times): base.alpha_composite(g)
bg=Image.new("RGB",(W,H),(6,4,14))
for box,col,r in [((100,150,980,900),(95,30,190),210),((-250,850,550,1550),(140,30,140),230),((600,700,1350,1400),(20,50,190),230)]:
    g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse(box,fill=col); bg=ImageChops.add(bg,g.filter(ImageFilter.GaussianBlur(r)))
bg=bg.convert("RGBA")
# PS SHOP logo top-left
lg=Image.open("assets/logo.png").convert("RGB").crop((250,190,1004,1040))
a=np.array(lg).astype(float); lum=a.max(axis=2)/255
lg=Image.fromarray(np.dstack([a,np.clip((lum-0.05)*3.5,0,1)*255]).astype("uint8"),"RGBA")
lg=lg.resize((int(lg.width*150/lg.height),150),Image.LANCZOS)
bg.alpha_composite(lg,(48,40))
d=ImageDraw.Draw(bg)
spaced(d,(W-60,70),"PSSHOP.UZ",font("Inter-SemiBold.otf",22),(235,230,255),6,"r")
spaced(d,(W-60,104),"ИГРЫ НА PS4 • PS5",font("Inter-Medium.otf",18),(160,150,210),4,"r")
# game emblem from owner's art, soft-masked
art=Image.open("assets/covers/gta6.jpg").convert("RGB").crop((140,340,950,960)).crop((190,40,780,540))
ew=640; art=art.resize((ew,int(ew*art.height/art.width)),Image.LANCZOS)
m=Image.new("L",art.size,0); ImageDraw.Draw(m).rounded_rectangle((40,30,art.width-40,art.height-30),60,fill=255)
m=m.filter(ImageFilter.GaussianBlur(28))
em=art.convert("RGBA"); em.putalpha(m)
ex=(W-ew)//2; ey=215
halo=Image.new("RGBA",em.size,(200,90,255,255)); halo.putalpha(m); glow(bg,halo,(ex,ey),50,2)
bg.alpha_composite(em,(ex,ey))
d=ImageDraw.Draw(bg)
y0=ey+em.height+30
spaced(d,(W/2,y0),"ДО РЕЛИЗА ОСТАЛОСЬ",font("Inter-Bold.otf",30),(255,255,255),8,"c")
# countdown boxes
vals=[("01","ДЕНЬ"),("11","ЧАСОВ"),("20","МИНУТ"),("00","СЕКУНД")]
bw,bh,gap=200,190,26; tot=4*bw+3*gap; x0=(W-tot)/2; by=y0+62
fn=font("InterDisplay-Black.otf",120); fl=font("Inter-SemiBold.otf",20)
for i,(v,l) in enumerate(vals):
    x=x0+i*(bw+gap)
    box=Image.new("RGBA",(W,H),(0,0,0,0)); bd=ImageDraw.Draw(box)
    bd.rounded_rectangle((x,by,x+bw,by+bh),26,fill=(255,255,255,22),outline=(200,170,255,170),width=2)
    bg.alpha_composite(box)
    t=Image.new("RGBA",(W,H),(0,0,0,0)); td=ImageDraw.Draw(t); tw=td.textlength(v,font=fn)
    td.text((x+(bw-tw)/2,by+12),v,font=fn,fill=(255,255,255,255))
    glow(bg,Image.fromarray(np.dstack([np.full((H,W,3),[255,90,220]),np.array(t)[...,3]]).astype("uint8"),"RGBA"),(0,0),16,1)
    bg.alpha_composite(t)
    d=ImageDraw.Draw(bg); spaced(d,(x+bw/2,by+bh-40),l,fl,(200,190,240),4,"c")
    if i<3: d.text((x+bw+gap/2-6,by+50),":",font=font("InterDisplay-Black.otf",60),fill=(200,170,255))
d=ImageDraw.Draw(bg)
spaced(d,(W/2,by+bh+34),"СТАРТ 19 НОЯБРЯ  •  00:00 ПО ТАШКЕНТУ",font("Inter-Medium.otf",24),(215,205,245),4,"c")
# CTA
fc=font("Inter-Black.otf",30); txt="Живой таймер на psshop.uz  →"; tw=d.textlength(txt,font=fc)
pw,ph=tw+90,76; px=(W-pw)/2; py=H-118
pill=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(pill).rounded_rectangle((px,py,px+pw,py+ph),38,fill=(255,255,255,255))
glow(bg,pill,(0,0),18,1); bg.alpha_composite(pill)
ImageDraw.Draw(bg).text((px+45,py+18),txt,font=fc,fill=(55,15,125))
n=np.random.normal(0,5,(H,W,1)); out=np.clip(np.array(bg.convert("RGB")).astype(float)+n,0,255)
Image.fromarray(out.astype("uint8")).save("output/ps_shop_gta_countdown.png"); print(ey+em.height, by+bh+70)
