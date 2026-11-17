from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, random
random.seed(7)
W,H=1080,1350; F="/usr/share/fonts/opentype/inter/"
def font(n,s): return ImageFont.truetype(F+n,s)
def cond_text(txt,fnt,sx=0.72,fill=(255,255,255,255)):
    d=ImageDraw.Draw(Image.new("L",(1,1))); bb=d.textbbox((0,0),txt,font=fnt)
    im=Image.new("RGBA",(bb[2]-bb[0]+4,bb[3]-bb[1]+4),(0,0,0,0))
    ImageDraw.Draw(im).text((-bb[0]+2,-bb[1]+2),txt,font=fnt,fill=fill)
    return im.resize((int(im.width*sx),im.height),Image.LANCZOS)
def spaced(d,xy,txt,fnt,fill,sp=8,anchor="l"):
    w=sum(d.textlength(c,font=fnt) for c in txt)+sp*(len(txt)-1)
    x,y=xy; x = x-w if anchor=="r" else (x-w/2 if anchor=="c" else x)
    for c in txt: d.text((x,y),c,font=fnt,fill=fill); x+=d.textlength(c,font=fnt)+sp
# background
bg=Image.new("RGB",(W,H),(6,5,14))
g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse((140,250,940,1050),fill=(90,30,190)); g=g.filter(ImageFilter.GaussianBlur(170))
bg=ImageChops.add(bg,g)
g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse((500,600,1200,1200),fill=(20,60,200)); g=g.filter(ImageFilter.GaussianBlur(190))
bg=ImageChops.add(bg,g).convert("RGBA")
# giant word behind
big=cond_text("ОТСЧЁТ",font("InterDisplay-Black.otf",400),0.56)
arr=np.array(big).astype(float)
h=arr.shape[0]
for y in range(h):
    t=y/h; arr[y,:,0]=150*(1-t)+40*t; arr[y,:,1]=70*(1-t)+90*t; arr[y,:,2]=255
arr[...,3]*=0.42
big=Image.fromarray(arr.astype("uint8"))
bx=(W-big.width)//2; by=330
bg.alpha_composite(big,(bx,by))
# hero cube from logo
logo=Image.open("assets/logo.png").convert("RGB")
cube=logo.crop((300,210,960,900))
a=np.array(cube).astype(float); lum=a.max(axis=2)/255.0
alpha=np.clip((lum-0.06)*3.2,0,1)*255
cube=Image.fromarray(np.dstack([a,alpha]).astype("uint8"),"RGBA")
ch=560; cube=cube.resize((int(cube.width*ch/cube.height),ch),Image.LANCZOS)
cx=(W-cube.width)//2; cy=300
# glow behind cube
gl=Image.new("RGBA",(W,H),(0,0,0,0)); gl.alpha_composite(cube,(cx,cy))
gl=gl.filter(ImageFilter.GaussianBlur(45)); bg.alpha_composite(gl); bg.alpha_composite(gl)
# reflection
ref=cube.transpose(Image.FLIP_TOP_BOTTOM); ra=np.array(ref).astype(float)
for y in range(ra.shape[0]): ra[y,:,3]*=max(0,0.28*(1-y/(ra.shape[0]*0.45)))
bg.alpha_composite(Image.fromarray(ra.astype("uint8")),(cx,cy+ch-8))
bg.alpha_composite(cube,(cx,cy))
# floor line
d=ImageDraw.Draw(bg)
for i in range(120,W-120):
    t=abs((i-W/2)/(W/2-120)); a_=int(150*(1-t)**1.5); d.point((i,cy+ch-4),fill=(170,150,255,a_))
# particles
for _ in range(70):
    x=random.randint(40,W-40); y=random.randint(200,1000); r=random.choice([1,1,2,2,3])
    c=random.choice([(190,140,255),(120,170,255),(255,255,255)])
    d.ellipse((x-r,y-r,x+r,y+r),fill=c+(random.randint(60,200),))
# decor: dot grid top-left, plus marks top-right
for i in range(6):
    for j in range(3): d.ellipse((60+i*22-2,140+j*22-2,60+i*22+2,140+j*22+2),fill=(150,140,220,150))
for k in range(3):
    x,y=W-70,130+k*34; d.line((x-10,y,x+10,y),fill=(160,150,230,200),width=2); d.line((x,y-10,x,y+10),fill=(160,150,230,200),width=2)
# top bar
fs=font("Inter-SemiBold.otf",22)
spaced(d,(60,58),"PS SHOP",fs,(230,225,255),6)
spaced(d,(W/2,58),"КАТАЛОГ • ТАЙМЕР • ЗАКАЗ",fs,(170,165,210),5,"c")
spaced(d,(W-60,58),"ТАШКЕНТ",fs,(230,225,255),6,"r")
# headline bottom-left
h1=cond_text("ЖИВОЙ ТАЙМЕР",font("InterDisplay-Black.otf",104),0.78)
h2=cond_text("ДО РЕЛИЗА.",font("InterDisplay-Black.otf",104),0.78,(185,120,255,255))
bg.alpha_composite(h1,(60,960)); bg.alpha_composite(h2,(60,960+h1.height+4))
d=ImageDraw.Draw(bg)
fsm=font("Inter-Medium.otf",22)
spaced(d,(62,H-86),"ПОСЕКУНДНО. НА САЙТЕ.",fsm,(200,195,235),4)
# CTA pill
fc=font("Inter-Bold.otf",30); txt="psshop.uz   →"; w=d.textlength(txt,font=fc)
pw,ph=w+90,74; px=W-60-pw; py=H-118
d.rounded_rectangle((px,py,px+pw,py+ph),37,outline=(190,150,255),width=3,fill=(120,60,255,60))
d.text((px+45,py+18),txt,font=fc,fill=(255,255,255))
# grain
n=np.random.normal(0,9,(H,W,1)); base=np.array(bg.convert("RGB")).astype(float)+n
Image.fromarray(np.clip(base,0,255).astype("uint8")).save("output/ps_shop_countdown_v2.png")
