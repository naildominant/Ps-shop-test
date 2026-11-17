from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, random
random.seed(5)
W,H=1080,1350; F="/usr/share/fonts/opentype/inter/"
def font(n,s): return ImageFont.truetype(F+n,s)
def glow(base,im,xy,blur,times=1):
    g=Image.new("RGBA",base.size,(0,0,0,0)); g.alpha_composite(im,xy); g=g.filter(ImageFilter.GaussianBlur(blur))
    for _ in range(times): base.alpha_composite(g)
def spaced(d,xy,txt,fnt,fill,sp=6,anchor="l"):
    w=sum(d.textlength(c,font=fnt) for c in txt)+sp*(len(txt)-1); x,y=xy
    x = x-w if anchor=="r" else (x-w/2 if anchor=="c" else x)
    for c in txt: d.text((x,y),c,font=fnt,fill=fill); x+=d.textlength(c,font=fnt)+sp
T=250; RAD=26
def face(c1,c2):
    im=Image.new("RGBA",(T,T)); a=np.zeros((T,T,4)); t=np.linspace(0,1,T)
    tt=(t[:,None]+t[None,:])/2
    for k in range(3): a[...,k]=c1[k]*(1-tt)+c2[k]*tt
    a[...,3]=255; return Image.fromarray(a.astype("uint8"))
def rmask(): m=Image.new("L",(T,T),0); ImageDraw.Draw(m).rounded_rectangle((0,0,T-1,T-1),RAD,fill=255); return m
def finish(im,edge=(230,200,255)):
    im.putalpha(rmask()); ImageDraw.Draw(im).rounded_rectangle((1,1,T-2,T-2),RAD,outline=edge+(230,),width=4); return im
def num_tile(n,label,c1,c2):
    im=face(c1,c2); d=ImageDraw.Draw(im); f=font("InterDisplay-Black.otf",150)
    w=d.textlength(n,font=f); d.text(((T-w)/2,12),n,font=f,fill=(255,255,255))
    spaced(d,(T/2,190),label,font("Inter-Bold.otf",24),(255,255,255),5,"c"); return finish(im)
def text_tile(lines,c1,c2,sizes):
    im=face(c1,c2); d=ImageDraw.Draw(im)
    hs=[s*1.05 for s in sizes]; y=(T-sum(hs))/2-8
    for (txt,fnt_name,col),s in zip(lines,sizes):
        f=font(fnt_name,s); w=d.textlength(txt,font=f); d.text(((T-w)/2,y),txt,font=f,fill=col); y+=s*1.05
    return finish(im)
# tiles
VIO=(120,50,235); PINK=(235,70,190); BLUE=(40,90,240); DEEP=(30,14,70); CYAN=(40,190,240)
tiles={}
tiles[(0,0)]=text_tile([("ДО","InterDisplay-Black.otf",(255,255,255)),("РЕЛИЗА","InterDisplay-Black.otf",(255,255,255)),("ОСТАЛОСЬ","Inter-Bold.otf",(255,210,245))],DEEP,(90,30,170),[70,46,28])
tiles[(0,1)]=num_tile("01","ДЕНЬ",VIO,PINK)
tiles[(0,2)]=num_tile("11","ЧАСОВ",PINK,(255,120,120))
tiles[(1,0)]=text_tile([("СТАРТ","Inter-Bold.otf",(220,235,255)),("19.11","InterDisplay-Black.otf",(255,255,255)),("00:00 ТАШКЕНТ","Inter-Bold.otf",(220,235,255))],BLUE,CYAN,[26,88,20])
tiles[(1,2)]=num_tile("20","МИНУТ",BLUE,VIO)
tiles[(2,1)]=text_tile([("PS5","InterDisplay-Black.otf",(255,255,255))],(60,20,120),PINK,[124])
tiles[(2,2)]=num_tile("00","СЕКУНД",CYAN,BLUE)
# PS SHOP cube tile
lg=Image.open("assets/logo.png").convert("RGB").crop((250,190,1004,1040))
im=face((14,8,30),(40,18,80)); a=np.array(lg).astype(float); lum=a.max(axis=2)/255
lgA=Image.fromarray(np.dstack([a,np.clip((lum-0.05)*3.5,0,1)*255]).astype("uint8"),"RGBA").resize((200,int(200*lg.height/lg.width)),Image.LANCZOS)
im.alpha_composite(lgA,((T-lgA.width)//2,(T-lgA.height)//2)); tiles[(2,0)]=finish(im)
# center emblem tile from owner's art: contain on dark neon tile
art=Image.open("assets/covers/gta6.jpg").convert("RGB").crop((140,340,950,960)).crop((185,55,775,515))
im=face((40,12,80),(110,30,150))
m=Image.new("L",art.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,art.width-1,art.height-1),40,fill=255); m=m.filter(ImageFilter.GaussianBlur(14))
a2=art.convert("RGBA"); a2.putalpha(m)
s_=(T-24)/max(a2.width,a2.height); a2=a2.resize((int(a2.width*s_),int(a2.height*s_)),Image.LANCZOS)
im.alpha_composite(a2,((T-a2.width)//2,(T-a2.height)//2))
tiles[(1,1)]=finish(im,(255,230,255))
# ---- mosaic canvas
G=26; M=Image.new("RGBA",(3*T+2*G+120,3*T+2*G+120),(0,0,0,0)); O=40
def extrude(tile,depth=18):
    al=tile.split()[3]; layer=Image.new("RGBA",(T+depth,T+depth),(0,0,0,0))
    side=Image.new("RGBA",(T,T),(45,15,95,255)); side.putalpha(al)
    for k in range(depth,0,-1):
        c=int(25+60*(1-k/depth)); s2=Image.new("RGBA",(T,T),(c,int(c*0.4),int(c*1.6)+20,255)); s2.putalpha(al); layer.alpha_composite(s2,(k,k))
    layer.alpha_composite(tile,(0,0)); return layer
order=[(r,c) for r in range(3) for c in range(3) if (r,c)!=(1,1)]+[(1,1)]
for r,c in order:
    t=extrude(tiles[(r,c)],26 if (r,c)==(1,1) else 16)
    if (r,c)==(1,1):
        t=t.resize((int(t.width*1.18),int(t.height*1.18)),Image.LANCZOS); x=O+c*(T+G)-int(T*0.09)-12; y=O+r*(T+G)-int(T*0.09)-14
        hal=Image.new("RGBA",t.size,(255,120,240,255)); hal.putalpha(t.split()[3]); glow(M,hal,(x,y),30,2)
    else: x=O+c*(T+G); y=O+r*(T+G)+random.randint(-10,10)
    M.alpha_composite(t,(x,y))
M=M.rotate(8,resample=Image.BICUBIC,expand=True)
# ---- poster
bg=Image.new("RGB",(W,H),(6,4,14))
for box,col,r in [((80,180,1000,1000),(95,30,190),220),((-250,900,550,1600),(140,30,140),230),((600,750,1350,1450),(20,50,190),230)]:
    g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse(box,fill=col); bg=ImageChops.add(bg,g.filter(ImageFilter.GaussianBlur(r)))
bg=bg.convert("RGBA")
sc=0.98; Ms=M.resize((int(M.width*sc),int(M.height*sc)),Image.LANCZOS)
mx=(W-Ms.width)//2; my=150
# shadow + glow
sh=Image.new("RGBA",Ms.size,(0,0,0,220)); sh.putalpha(Ms.split()[3].point(lambda v:int(v*0.85)))
g=Image.new("RGBA",(W,H),(0,0,0,0)); g.alpha_composite(sh,(mx+30,my+50)); bg.alpha_composite(g.filter(ImageFilter.GaussianBlur(35)))
hal=Image.new("RGBA",Ms.size,(150,70,255,255)); hal.putalpha(Ms.split()[3]); glow(bg,hal,(mx,my),45,1)
bg.alpha_composite(Ms,(mx,my))
# reflection
ref=Ms.transpose(Image.FLIP_TOP_BOTTOM); ra=np.array(ref).astype(float); h=ra.shape[0]
ra[...,3]*=np.clip(0.18*(1-np.arange(h)/(h*0.16)),0,1)[:,None]
floor=my+Ms.height-40
bg.alpha_composite(Image.fromarray(ra.astype("uint8")).filter(ImageFilter.GaussianBlur(3)),(mx,floor))
d=ImageDraw.Draw(bg)
# top: PS SHOP logo top-left
lgS=lgA.resize((int(lgA.width*0.62),int(lgA.height*0.62)),Image.LANCZOS)
bg.alpha_composite(lgS,(46,34))
d=ImageDraw.Draw(bg)
spaced(d,(W-60,58),"PSSHOP.UZ",font("Inter-SemiBold.otf",22),(235,230,255),6,"r")
spaced(d,(W-60,92),"ИГРЫ НА PS5",font("Inter-Medium.otf",18),(160,150,210),4,"r")
# CTA
fc=font("Inter-Black.otf",30); txt="Живой таймер на psshop.uz  →"; tw=d.textlength(txt,font=fc)
pw,ph=tw+90,76; px=(W-pw)/2; py=H-112
pill=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(pill).rounded_rectangle((px,py,px+pw,py+ph),38,fill=(255,255,255,255))
glow(bg,pill,(0,0),18,1); bg.alpha_composite(pill)
ImageDraw.Draw(bg).text((px+45,py+18),txt,font=fc,fill=(55,15,125))
n=np.random.normal(0,5,(H,W,1)); out=np.clip(np.array(bg.convert("RGB")).astype(float)+n,0,255)
Image.fromarray(out.astype("uint8")).save("output/ps_shop_gta_mosaic_v2.png"); print(Ms.size, my+Ms.height)
