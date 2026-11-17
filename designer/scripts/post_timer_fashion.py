from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, random
random.seed(3)
W,H=1080,1350; F="/usr/share/fonts/opentype/inter/"
def font(n,s): return ImageFont.truetype(F+n,s)
def cond_text(txt,fnt,sx=0.75,fill=(255,255,255,255)):
    d=ImageDraw.Draw(Image.new("L",(1,1))); bb=d.textbbox((0,0),txt,font=fnt)
    im=Image.new("RGBA",(bb[2]-bb[0]+4,bb[3]-bb[1]+4),(0,0,0,0))
    ImageDraw.Draw(im).text((-bb[0]+2,-bb[1]+2),txt,font=fnt,fill=fill)
    return im.resize((int(im.width*sx),im.height),Image.LANCZOS)
def grad(im,c1,c2):
    a=np.array(im).astype(float); w=a.shape[1]
    for x in range(w):
        t=x/w; a[:,x,0]=c1[0]*(1-t)+c2[0]*t; a[:,x,1]=c1[1]*(1-t)+c2[1]*t; a[:,x,2]=c1[2]*(1-t)+c2[2]*t
    return Image.fromarray(a.astype("uint8"))
def glow(base,im,xy,blur,times=2):
    g=Image.new("RGBA",base.size,(0,0,0,0)); g.alpha_composite(im,xy); g=g.filter(ImageFilter.GaussianBlur(blur))
    for _ in range(times): base.alpha_composite(g)
def spaced(d,xy,txt,fnt,fill,sp=6,anchor="l"):
    w=sum(d.textlength(c,font=fnt) for c in txt)+sp*(len(txt)-1); x,y=xy
    x = x-w if anchor=="r" else (x-w/2 if anchor=="c" else x)
    for c in txt: d.text((x,y),c,font=fnt,fill=fill); x+=d.textlength(c,font=fnt)+sp
bg=Image.new("RGB",(W,H),(6,4,14))
for box,col,r in [((-200,150,700,1000),(110,30,210),190),((450,250,1300,1100),(20,70,230),200),((200,900,900,1500),(160,40,200),200)]:
    g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse(box,fill=col); bg=ImageChops.add(bg,g.filter(ImageFilter.GaussianBlur(r)))
bg=bg.convert("RGBA")
# logo cube large in background
logo=Image.open("assets/logo.png").convert("RGB")
cube=logo.crop((300,210,960,900)); a=np.array(cube).astype(float); lum=a.max(axis=2)/255
cube=Image.fromarray(np.dstack([a,np.clip((lum-0.06)*3.2,0,1)*255*0.6]).astype("uint8"),"RGBA")
cube=cube.resize((1000,int(1000*cube.height/cube.width)),Image.LANCZOS)
bg.alpha_composite(cube,((W-cube.width)//2,90))
# hero: user's game art as floating tilted card
art=Image.open("assets/covers/gta6.jpg").convert("RGB").crop((210,0,970,880))
cw=470; art=art.resize((cw,int(cw*art.height/art.width)),Image.LANCZOS)
m=Image.new("L",art.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,art.width-1,art.height-1),34,fill=255)
card=art.convert("RGBA"); card.putalpha(m)
# border
ImageDraw.Draw(card).rounded_rectangle((0,0,card.width-1,card.height-1),34,outline=(220,190,255,230),width=4)
card=card.rotate(-6,resample=Image.BICUBIC,expand=True)
cx=(W-card.width)//2+10; cy=115
sh=Image.new("RGBA",(W,H),(0,0,0,0)); sa=card.split()[3].point(lambda v:int(v*0.8))
shadow=Image.new("RGBA",card.size,(0,0,0,255)); shadow.putalpha(sa); sh.alpha_composite(shadow,(cx+20,cy+40))
bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))
glowcard=Image.new("RGBA",card.size,(170,90,255,255)); glowcard.putalpha(card.split()[3]); glow(bg,glowcard,(cx,cy),40,2)
bg.alpha_composite(card,(cx,cy))
d=ImageDraw.Draw(bg)
# sparks
for _ in range(60):
    x=random.randint(30,W-30); y=random.randint(120,900); r=random.choice([1,2,2,3])
    d.ellipse((x-r,y-r,x+r,y+r),fill=random.choice([(255,180,255),(150,190,255),(255,255,255)])+(random.randint(80,220),))
# top bar
fs=font("Inter-SemiBold.otf",22)
spaced(d,(60,52),"PS SHOP",fs,(240,235,255))
spaced(d,(W-60,52),"PSSHOP.UZ",fs,(240,235,255),6,"r")
# typography
SERIF="/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
big=cond_text("ТАЙМЕР",font("InterDisplay-Black.otf",210),0.70)
yb=800; xb=(W-big.width)//2
glow(bg,Image.fromarray(np.dstack([np.full(np.array(big).shape[:2]+(3,),[160,90,255]),np.array(big)[...,3]]).astype("uint8"),"RGBA"),(xb,yb),22,1)
bg.alpha_composite(big,(xb,yb))
ser=cond_text("живой",ImageFont.truetype(SERIF,128),1.0,(255,150,230,255))
glow(bg,ser,(xb-70,yb-98),12,1); bg.alpha_composite(ser,(xb-70,yb-98))
y2=yb+big.height+6
t2=grad(cond_text("ДО РЕЛИЗА",font("InterDisplay-Black.otf",112),0.70),(255,110,220),(90,210,255))
glow(bg,t2,((W-t2.width)//2,y2),24,2); bg.alpha_composite(t2,((W-t2.width)//2,y2))
d=ImageDraw.Draw(bg)
y3=y2+t2.height+22
f3=font("Inter-Medium.otf",30); txt3="У НАС НА САЙТЕ"; sp=10
w3=sum(d.textlength(c,font=f3) for c in txt3)+sp*(len(txt3)-1)
spaced(d,(W/2,y3),txt3,f3,(240,235,255),sp,"c")
for x1,x2 in [((W-w3)/2-130,(W-w3)/2-30),((W+w3)/2+30,(W+w3)/2+130)]:
    d.line((x1,y3+19,x2,y3+19),fill=(200,170,255),width=2)
# CTA
fc=font("Inter-Black.otf",34); txt="psshop.uz  →"; w=d.textlength(txt,font=fc)
pw,ph=w+100,80; px=(W-pw)/2; py=H-104
pill=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(pill).rounded_rectangle((px,py,px+pw,py+ph),40,fill=(255,255,255,255))
glow(bg,pill,(0,0),20,1); bg.alpha_composite(pill)
ImageDraw.Draw(bg).text((px+50,py+17),txt,font=fc,fill=(60,20,140))
n=np.random.normal(0,8,(H,W,1)); out=np.clip(np.array(bg.convert("RGB")).astype(float)+n,0,255)
Image.fromarray(out.astype("uint8")).save("output/ps_shop_countdown_v5.png")
print(card.height+cy, y3+40)
