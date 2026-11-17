# Пост «у нас открылся САЙТ»: объёмный 3D-телефон с открытым psshop.uz выходит из огромного слова.
# 3D-объект + плоский 2D-текст. Логотип только слева сверху, без изменений.
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, random, math
random.seed(11)
W,H=1080,1350; F="/usr/share/fonts/opentype/inter/"; SERIF="/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
SS=2  # суперсэмплинг для телефона
def font(n,s): return ImageFont.truetype(F+n,s)
def cond_text(txt,fnt,sx=0.75,fill=(255,255,255,255),pad=20):
    d=ImageDraw.Draw(Image.new("L",(1,1))); bb=d.textbbox((0,0),txt,font=fnt)
    im=Image.new("RGBA",(bb[2]-bb[0]+2*pad,bb[3]-bb[1]+pad),(0,0,0,0))
    ImageDraw.Draw(im).text((-bb[0]+pad,-bb[1]+pad//2),txt,font=fnt,fill=fill)
    return im.resize((int(im.width*sx),im.height),Image.LANCZOS)
def grad(im,c1,c2,axis=1):
    a=np.array(im).astype(float); n=a.shape[axis]; t=np.linspace(0,1,n)
    t=t[None,:] if axis==1 else t[:,None]
    for k in range(3): a[...,k]=c1[k]*(1-t)+c2[k]*t
    return Image.fromarray(a.astype("uint8"))
def tint(im,col): t=Image.new("RGBA",im.size,col+(255,)); t.putalpha(im.split()[3]); return t
def glow(base,im,xy,blur,times=1):
    g=Image.new("RGBA",base.size,(0,0,0,0)); g.alpha_composite(im,xy); g=g.filter(ImageFilter.GaussianBlur(blur))
    for _ in range(times): base.alpha_composite(g)
def spaced(d,xy,txt,fnt,fill,sp=6,anchor="l"):
    w=sum(d.textlength(c,font=fnt) for c in txt)+sp*(len(txt)-1); x,y=xy
    x = x-w if anchor=="r" else (x-w/2 if anchor=="c" else x)
    for c in txt: d.text((x,y),c,font=fnt,fill=fill); x+=d.textlength(c,font=fnt)+sp
    return w
def coeffs(dst,src):
    A=[];B=[]
    for (x,y),(u,v) in zip(dst,src):
        A.append([x,y,1,0,0,0,-u*x,-u*y]); A.append([0,0,0,x,y,1,-v*x,-v*y]); B+= [u,v]
    return np.linalg.solve(np.array(A,float),np.array(B,float)).tolist()
def warp(img,quad,size):
    s=[(0,0),(img.width,0),(img.width,img.height),(0,img.height)]
    return img.transform(size,Image.PERSPECTIVE,coeffs(quad,s),Image.BICUBIC)

# ---------- фон
bg=Image.new("RGB",(W,H),(6,4,14))
for box,col,r in [((140,120,960,900),(100,32,205),210),((-300,700,500,1500),(150,30,150),230),((620,600,1400,1350),(20,60,215),230)]:
    g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse(box,fill=col); bg=ImageChops.add(bg,g.filter(ImageFilter.GaussianBlur(r)))
bg=bg.convert("RGBA")
d=ImageDraw.Draw(bg)
for i,R in enumerate([470,560,660]):
    d.arc((W//2-R,1180-R,W//2+R,1180+R),200,340,fill=(170,140,255,40-i*10),width=2)

# ---------- лицевая сторона телефона (плоская), потом в 3D
FW,FH=460,960; RAD=70
face=Image.new("RGBA",(FW*SS,FH*SS),(0,0,0,0)); fd=ImageDraw.Draw(face)
fd.rounded_rectangle((0,0,FW*SS-1,FH*SS-1),RAD*SS,fill=(14,11,26,255))
B=14; sr=(RAD-B)*SS
scr=Image.open("assets/shots/m_home.png").convert("RGB")
sw,sh_=(FW-2*B)*SS,(FH-2*B)*SS
SB=50*SS  # строка состояния над сайтом
scr=scr.resize((sw,int(sw*scr.height/scr.width)),Image.LANCZOS).crop((0,0,sw,sh_-SB))
_s=Image.new("RGB",(sw,sh_),(12,9,24)); _s.paste(scr,(0,SB)); scr=_s
ImageDraw.Draw(scr).text((30*SS,14*SS),"9:41",font=font("Inter-SemiBold.otf",17*SS),fill=(235,230,255))
sm=Image.new("L",(sw,sh_),0); ImageDraw.Draw(sm).rounded_rectangle((0,0,sw-1,sh_-1),sr,fill=255)
scr=scr.convert("RGBA"); scr.putalpha(sm)
face.alpha_composite(scr,(B*SS,B*SS))
fd.rounded_rectangle(((FW/2-58)*SS,(B+12)*SS,(FW/2+58)*SS,(B+44)*SS),16*SS,fill=(0,0,0,255))  # «остров»
# блик стекла
gl=Image.new("RGBA",face.size,(0,0,0,0)); gd=ImageDraw.Draw(gl)
gd.polygon([(0,0),(int(FW*SS*0.62),0),(0,int(FH*SS*0.42))],fill=(255,255,255,26))
gl.putalpha(ImageChops.multiply(gl.split()[3],face.split()[3])); face.alpha_composite(gl)
# кромка
rim=Image.new("L",face.size,0); ImageDraw.Draw(rim).rounded_rectangle((0,0,face.width-1,face.height-1),RAD*SS,outline=255,width=5*SS)
e=grad(Image.new("RGBA",face.size,(255,255,255,255)),(255,130,235),(90,200,255)); e.putalpha(rim); face.alpha_composite(e)
fmask=Image.new("L",face.size,0); ImageDraw.Draw(fmask).rounded_rectangle((0,0,face.width-1,face.height-1),RAD*SS,fill=255)

# ---------- 3D-проекция
CX,CY=W/2+10,662; SC=0.80; DEPTH=34; FOC=1500
ry,rx,rz=math.radians(-24),math.radians(10),math.radians(-9)
def proj(X,Y,Z):
    # поворот: Y (рыскание), X (наклон), Z (крен)
    X,Z=X*math.cos(ry)+Z*math.sin(ry),-X*math.sin(ry)+Z*math.cos(ry)
    Y,Z=Y*math.cos(rx)-Z*math.sin(rx),Y*math.sin(rx)+Z*math.cos(rx)
    X,Y=X*math.cos(rz)-Y*math.sin(rz),X*math.sin(rz)+Y*math.cos(rz)
    k=FOC/(FOC+Z)*SC; return ((CX+X*k)*SS,(CY+Y*k)*SS)
def quad(z):
    a,b=FW/2,FH/2; return [proj(-a,-b,z),proj(a,-b,z),proj(a,b,z),proj(-a,b,z)]
SIZE=(W*SS,H*SS)
P=Image.new("RGBA",SIZE,(0,0,0,0))
# корпус: слои от задней стенки к лицевой
N=26
for i in range(N+1):
    t=i/N; z=DEPTH/2-t*DEPTH
    c=(int(60+110*t),int(40+60*t),int(140+100*t)) if t<0.92 else (230,200,255)
    lay=Image.new("RGBA",fmask.size,c+(255,)); lay.putalpha(fmask)
    P.alpha_composite(warp(lay,quad(z),SIZE))
# кнопки на боковой грани
for y0,y1 in [(-250,-170),(-140,-20)]:
    pts=[proj(-FW/2-3,y0,-6),proj(-FW/2-3,y1,-6),proj(-FW/2-3,y1,8),proj(-FW/2-3,y0,8)]
    ImageDraw.Draw(P).polygon(pts,fill=(120,90,210,255))
P.alpha_composite(warp(face,quad(-DEPTH/2),SIZE))
phone=P.resize((W,H),Image.LANCZOS)

# тень и свечение
sh=tint(phone,(0,0,0)); g=Image.new("RGBA",(W,H),(0,0,0,0)); g.alpha_composite(sh,(36,50))
bg.alpha_composite(g.filter(ImageFilter.GaussianBlur(34)))
glow(bg,tint(phone,(170,90,255)),(0,0),55,2)
bg.alpha_composite(phone)

# ---------- «карман»: телефон выходит из слова
band=np.zeros((H,W,4)); y0,y1=800,1020
t=np.clip((np.arange(H)-y0)/(y1-y0),0,1)[:,None]
band[...,0]=8; band[...,1]=5; band[...,2]=22; band[...,3]=(t**1.4)*240
bg.alpha_composite(Image.fromarray(band.astype("uint8")))

# ---------- 2D-текст
big=cond_text("САЙТ",font("InterDisplay-Black.otf",380),0.86)
big=grad(big,(255,150,235),(110,170,255))
bx=(W-big.width)//2; by=800
glow(bg,tint(big,(170,80,255)),(bx,by),30,1)
bg.alpha_composite(big,(bx,by))
import os, sys; sys.path.insert(0,"scripts"); from psfx import font as pfont
_k=os.environ.get("TOP_FONT","unbounded")  # шрифт строки «у нас открылся»
_f={"freeserif":lambda:ImageFont.truetype(SERIF,92),"playfair":lambda:pfont("playfair",86,"SemiBold Italic"),
    "cormorant":lambda:pfont("cormorant",100,"SemiBold Italic"),"unbounded":lambda:pfont("unbounded",62,"Medium"),
    "manrope":lambda:pfont("manrope",72,"Bold")}[_k]()
ser=cond_text("у нас открылся",_f,1.0,(255,255,255,255))
sx,sy=W-56-ser.width,150
glow(bg,tint(ser,(255,80,210)),(sx,sy),14,2); bg.alpha_composite(ser,(sx,sy))
d=ImageDraw.Draw(bg)
yl=by+big.height+8
f3=font("Inter-Medium.otf",24); t3="КАТАЛОГ  •  АРЕНДА PS5  •  ПРЕДЗАКАЗЫ"
w3=spaced(d,(W/2,yl),t3,f3,(225,218,255),5,"c")
for x1,x2 in [((W-w3)/2-90,(W-w3)/2-24),((W+w3)/2+24,(W+w3)/2+90)]:
    d.line((x1,yl+15,x2,yl+15),fill=(200,170,255),width=2)
fc=font("Inter-Black.otf",34); txt="psshop.uz  →"; tw=d.textlength(txt,font=fc)
pw,ph=tw+100,80; px=(W-pw)/2; py=H-108
pill=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(pill).rounded_rectangle((px,py,px+pw,py+ph),40,fill=(255,255,255,255))
glow(bg,pill,(0,0),20,1); bg.alpha_composite(pill)
ImageDraw.Draw(bg).text((px+50,py+17),txt,font=fc,fill=(60,20,140))

# ---------- логотип слева сверху (как есть), подпись справа
lg=Image.open("assets/logo.png").convert("RGB").crop((250,190,1004,1040))
a=np.array(lg).astype(float); lum=a.max(axis=2)/255
lg=Image.fromarray(np.dstack([a,np.clip((lum-0.05)*3.5,0,1)*255]).astype("uint8"),"RGBA")
lg=lg.resize((int(lg.width*132/lg.height),132),Image.LANCZOS)
bg.alpha_composite(lg,(44,34))
d=ImageDraw.Draw(bg)
spaced(d,(W-56,58),"NEW",font("Inter-Black.otf",24),(255,150,230),8,"r")
spaced(d,(W-56,94),"ОНЛАЙН-МАГАЗИН",font("Inter-Medium.otf",18),(190,180,235),5,"r")
for _ in range(45):
    x=random.randint(20,W-20); y=random.randint(260,780); rr=random.choice([1,1,2,2,3])
    if 300<x<780: continue
    d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=random.choice([(255,160,240),(140,190,255),(255,255,255)])+(random.randint(60,190),))
n=np.random.normal(0,6,(H,W,1)); out=np.clip(np.array(bg.convert("RGB")).astype(float)+n,0,255)
Image.fromarray(out.astype("uint8")).save(os.environ.get("OUT","output/ps_shop_site_phone3d.png")); print(by,yl)
