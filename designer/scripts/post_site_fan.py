# Пост «у нас открылся САЙТ»: настоящие скриншоты psshop.uz веером выходят из огромного слова.
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, random, math
random.seed(11)
W,H=1080,1350; F="/usr/share/fonts/opentype/inter/"; SERIF="/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
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

# ---------- фон
bg=Image.new("RGB",(W,H),(6,4,14))
for box,col,r in [((140,120,960,900),(100,32,205),210),((-300,700,500,1500),(150,30,150),230),((620,600,1400,1350),(20,60,215),230)]:
    g=Image.new("RGB",(W,H)); ImageDraw.Draw(g).ellipse(box,fill=col); bg=ImageChops.add(bg,g.filter(ImageFilter.GaussianBlur(r)))
bg=bg.convert("RGBA")
d=ImageDraw.Draw(bg)
# тонкие концентрические дуги вокруг точки веера
PX,PY=W//2,1215
for i,R in enumerate([520,600,690]):
    d.arc((PX-R,PY-R,PX+R,PY+R),200,340,fill=(170,140,255,40-i*10),width=2)

# ---------- карточки-скриншоты
def card(path,w,crop_h=1700,edge=((255,120,230),(90,200,255))):
    im=Image.open(path).convert("RGB"); im=im.crop((0,0,im.width,min(crop_h,im.height)))
    im=im.resize((w,int(w*im.height/im.width)),Image.LANCZOS).convert("RGBA")
    r=int(w*0.085); m=Image.new("L",im.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,im.width-1,im.height-1),r,fill=255)
    im.putalpha(m)
    rim=Image.new("L",im.size,0); ImageDraw.Draw(rim).rounded_rectangle((0,0,im.width-1,im.height-1),r,outline=255,width=4)
    e=grad(Image.new("RGBA",im.size,(255,255,255,255)),*edge); e.putalpha(rim); im.alpha_composite(e)
    # блик сверху-слева
    hl=Image.new("RGBA",im.size,(0,0,0,0)); hd=ImageDraw.Draw(hl)
    hd.polygon([(0,0),(int(w*0.55),0),(0,int(im.height*0.32))],fill=(255,255,255,22))
    hl.putalpha(ImageChops.multiply(hl.split()[3],m)); im.alpha_composite(hl)
    return im
def persp(im,k):
    """Поворот вокруг вертикальной оси: k<0 — левый край уходит вглубь, k>0 — правый."""
    a=np.array(im); h,w=a.shape[:2]; out=np.zeros_like(a)
    for x in range(w):
        t=x/(w-1); s=1-abs(k)*((1-t) if k<0 else t)
        nh=max(2,int(h*s)); col=Image.fromarray(a[:,x:x+1]).resize((1,nh),Image.BICUBIC)
        y0=(h-nh)//2; out[y0:y0+nh,x:x+1]=np.array(col)
    im2=Image.fromarray(out); return im2.resize((int(w*(1-abs(k)*0.35)),h),Image.LANCZOS)
def slab(im,depth=14,dx=1,dy=1):
    """Толщина стеклянной пластины: слои торца под лицевой стороной."""
    al=im.split()[3]; L=Image.new("RGBA",(im.width+depth,im.height+depth),(0,0,0,0))
    ox=0 if dx>0 else depth
    for k in range(depth,0,-1):
        t=k/depth; c=(int(40+120*(1-t)),int(20+50*(1-t)),int(110+130*(1-t)))
        s=Image.new("RGBA",im.size,c+(255,)); s.putalpha(al); L.alpha_composite(s,(ox+k*dx,k*dy))
    L.alpha_composite(im,(ox,0)); return L
def cube_img(h):
    lg=Image.open("assets/logo.png").convert("RGB").crop((300,210,960,900))
    a=np.array(lg).astype(float); lum=a.max(axis=2)/255
    c=Image.fromarray(np.dstack([a,np.clip((lum-0.06)*3.2,0,1)*255]).astype("uint8"),"RGBA")
    return c.resize((int(c.width*h/c.height),h),Image.LANCZOS)

shots="assets/shots/"
# имя, угол, ширина, радиус от точки веера, перспектива, сторона торца
fan=[("m_rent.png",-21,300,600,-0.16,1),("m_game.png",-10,320,630,-0.09,1),("m_catalog.png",12,330,630,0.10,-1),("m_home.png",0,340,735,0,1)]
# дальний кубик слева, размыт (глубина резкости)
cb=cube_img(120).rotate(14,resample=Image.BICUBIC,expand=True).filter(ImageFilter.GaussianBlur(3))
ca=np.array(cb).astype(float); ca[...,3]*=0.75; cb=Image.fromarray(ca.astype("uint8"))
glow(bg,tint(cb,(150,80,255)),(40,600),30,1); bg.alpha_composite(cb,(40,600))
# порядок: дальние сначала, главный (главная страница) последним
for name,ang,w,R,k,side in [fan[0],fan[2],fan[1],fan[3]]:
    c=card(shots+name,w)
    if k: c=persp(c,k)
    c=slab(c,16 if name=="m_home.png" else 12,side,1)
    rc=c.rotate(-ang,resample=Image.BICUBIC,expand=True)
    a=math.radians(ang); cx=PX+R*math.sin(a); cy=PY-R*math.cos(a)
    x,y=int(cx-rc.width/2),int(cy-rc.height/2)
    sh=Image.new("RGBA",(W,H),(0,0,0,0)); sh.alpha_composite(tint(rc,(0,0,0)),(x+18,y+34))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    if name=="m_home.png": glow(bg,tint(rc,(190,100,255)),(x,y),46,2)
    bg.alpha_composite(rc,(x,y))

# парящий 3D-куб справа: выходит за край каталога, отбрасывает тень на карточку
cu=cube_img(215).rotate(-10,resample=Image.BICUBIC,expand=True)
ux,uy=W-cu.width-30,470
sh=Image.new("RGBA",(W,H),(0,0,0,0)); sh.alpha_composite(tint(cu,(0,0,0)),(ux-30,uy+60))
bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
glow(bg,tint(cu,(120,90,255)),(ux,uy),40,2)
bg.alpha_composite(cu,(ux,uy))

# ---------- «карман»: тёмная растяжка снизу, из неё выходят карточки
band=np.zeros((H,W,4)); y0,y1=760,1000
t=np.clip((np.arange(H)-y0)/(y1-y0),0,1)[:,None]
band[...,0]=8; band[...,1]=5; band[...,2]=22; band[...,3]=(t**1.4)*235
bg.alpha_composite(Image.fromarray(band.astype("uint8")))

# ---------- огромное слово спереди
big=cond_text("САЙТ",font("InterDisplay-Black.otf",380),0.86)
big=grad(big,(255,150,235),(110,170,255))
bx=(W-big.width)//2; by=780
glow(bg,tint(big,(170,80,255)),(bx,by),30,1)
bg.alpha_composite(big,(bx,by))
# курсивная строка поверх края слова
ser=cond_text("у нас открылся",ImageFont.truetype(SERIF,92),1.0,(255,255,255,255))
sx,sy=W-56-ser.width,150
glow(bg,tint(ser,(255,80,210)),(sx,sy),14,2); bg.alpha_composite(ser,(sx,sy))

d=ImageDraw.Draw(bg)
# тонкая строка с разрядкой и линиями
yl=by+big.height+14
f3=font("Inter-Medium.otf",24); t3="КАТАЛОГ  •  АРЕНДА PS5  •  ПРЕДЗАКАЗЫ"
w3=spaced(d,(W/2,yl),t3,f3,(225,218,255),5,"c")
for x1,x2 in [((W-w3)/2-90,(W-w3)/2-24),((W+w3)/2+24,(W+w3)/2+90)]:
    d.line((x1,yl+15,x2,yl+15),fill=(200,170,255),width=2)

# CTA
fc=font("Inter-Black.otf",34); txt="psshop.uz  →"; tw=d.textlength(txt,font=fc)
pw,ph=tw+100,80; px=(W-pw)/2; py=H-112
pill=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(pill).rounded_rectangle((px,py,px+pw,py+ph),40,fill=(255,255,255,255))
glow(bg,pill,(0,0),20,1); bg.alpha_composite(pill)
ImageDraw.Draw(bg).text((px+50,py+17),txt,font=fc,fill=(60,20,140))

# ---------- логотип слева сверху, подпись справа
lg=Image.open("assets/logo.png").convert("RGB").crop((250,190,1004,1040))
a=np.array(lg).astype(float); lum=a.max(axis=2)/255
lg=Image.fromarray(np.dstack([a,np.clip((lum-0.05)*3.5,0,1)*255]).astype("uint8"),"RGBA")
lg=lg.resize((int(lg.width*132/lg.height),132),Image.LANCZOS)
bg.alpha_composite(lg,(44,34))
d=ImageDraw.Draw(bg)
spaced(d,(W-56,58),"NEW",font("Inter-Black.otf",24),(255,150,230),8,"r")
spaced(d,(W-56,94),"ОНЛАЙН-МАГАЗИН",font("Inter-Medium.otf",18),(190,180,235),5,"r")

# искры
for _ in range(45):
    x=random.randint(20,W-20); y=random.randint(260,760); rr=random.choice([1,1,2,2,3])
    d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=random.choice([(255,160,240),(140,190,255),(255,255,255)])+(random.randint(60,190),))

n=np.random.normal(0,6,(H,W,1)); out=np.clip(np.array(bg.convert("RGB")).astype(float)+n,0,255)
Image.fromarray(out.astype("uint8")).save("output/ps_shop_site_fan.png"); print(by, by+big.height, yl)
