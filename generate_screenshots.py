from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1290, 2796
BG = (15, 23, 42)
PRIMARY = (99, 102, 241)
ACCENT = (16, 185, 129)
WHITE = (255, 255, 255)
GRAY = (148, 163, 184)
CARD = (30, 41, 59)
YELLOW = (234, 179, 8)

out = os.path.join(os.path.dirname(__file__), "store-screenshots")
os.makedirs(out, exist_ok=True)

def rrect(d, xy, r, fill):
    x0,y0,x1,y1 = xy
    d.rectangle([x0+r,y0,x1-r,y1], fill=fill)
    d.rectangle([x0,y0+r,x1,y1-r], fill=fill)
    d.pieslice([x0,y0,x0+2*r,y0+2*r],180,270,fill=fill)
    d.pieslice([x1-2*r,y0,x1,y0+2*r],270,360,fill=fill)
    d.pieslice([x0,y1-2*r,x0+2*r,y1],90,180,fill=fill)
    d.pieslice([x1-2*r,y1-2*r,x1,y1],0,90,fill=fill)

def gradient(d, h):
    for y in range(h):
        ratio = y/h
        r = int(99*(1-ratio)+139*ratio)
        g = int(102*(1-ratio)+92*ratio)
        b = int(241*(1-ratio)+246*ratio)
        d.line([(0,y),(W,y)], fill=(r,g,b))

def get_fonts():
    paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    regular = None
    bold = None
    for p in paths:
        if os.path.exists(p):
            if 'b.' in p.lower() or 'bold' in p.lower() or 'segoeuib' in p.lower() or 'arialbd' in p.lower():
                bold = p
            else:
                regular = p
    if not regular:
        return {s: ImageFont.load_default() for s in [36,42,48,72,96]}
    if not bold:
        bold = regular
    return {
        36: ImageFont.truetype(regular, 36),
        42: ImageFont.truetype(regular, 42),
        48: ImageFont.truetype(regular, 48),
        72: ImageFont.truetype(bold, 72),
        96: ImageFont.truetype(bold, 96),
    }

F = get_fonts()

def center_text(d, text, y, font, fill=WHITE):
    bb = d.textbbox((0,0), text, font=font)
    tw = bb[2]-bb[0]
    d.text(((W-tw)//2, y), text, fill=fill, font=font)

def make_screenshot(title, subtitle, phone_content_fn, features, fname):
    img = Image.new('RGB', (W,H), BG)
    d = ImageDraw.Draw(img)
    gradient(d, 200)
    center_text(d, title, 280, F[96])
    center_text(d, subtitle, 420, F[48], GRAY)
    
    px,py,pw,ph = W//2-300, 550, 600, 1100
    rrect(d,(px-8,py-8,px+pw+8,py+ph+8),40,(60,60,80))
    rrect(d,(px,py,px+pw,py+ph),36,(20,30,50))
    
    phone_content_fn(d, px, py, pw, ph)
    
    yp = py+ph+80
    for feat in features:
        d.ellipse((100,yp+12,130,yp+42), fill=ACCENT)
        d.text((160,yp), feat, fill=WHITE, font=F[42])
        yp += 80
    
    center_text(d, "Cals2Gains", H-200, F[72], PRIMARY)
    center_text(d, "Tu nutricionista con IA", H-110, F[36], GRAY)
    img.save(os.path.join(out, fname), quality=95)
    print(f"  Creado: {fname}")

# Screenshot 1: Dashboard
def dash_content(d, px, py, pw, ph):
    sx, sw = px+20, pw-40
    cx, cy = px+pw//2, py+300
    r = 120
    d.arc((cx-r,cy-r,cx+r,cy+r),0,360,fill=(40,50,70),width=20)
    d.arc((cx-r,cy-r,cx+r,cy+r),-90,180,fill=ACCENT,width=20)
    center_text(d, "1,450", cy-30, F[48])
    center_text(d, "kcal", cy+25, F[36], GRAY)
    
    by = cy+r+50
    for name, prog, color in [("Proteina",0.7,ACCENT),("Carbos",0.55,PRIMARY),("Grasa",0.4,YELLOW)]:
        d.text((sx+10,by), name, fill=GRAY, font=F[36])
        bsx = sx+200; bex = sx+sw-10; bw = bex-bsx
        rrect(d,(bsx,by+8,bex,by+36),14,(40,50,70))
        rrect(d,(bsx,by+8,bsx+int(bw*prog),by+36),14,color)
        by += 60
    
    my = by+30
    for nm, desc, kcal in [("Desayuno","Tostada con aguacate","320 kcal"),("Almuerzo","Ensalada Cesar","480 kcal"),("Merienda","Yogur con frutos secos","185 kcal")]:
        if my+100 < py+ph-80:
            rrect(d,(sx+5,my,sx+sw-5,my+90),16,CARD)
            d.text((sx+25,my+10), nm, fill=WHITE, font=F[36])
            d.text((sx+25,my+50), desc, fill=GRAY, font=F[36])
            bb = d.textbbox((0,0),kcal,font=F[36])
            d.text((sx+sw-bb[2]+bb[0]-25,my+30), kcal, fill=ACCENT, font=F[36])
            my += 110

make_screenshot("Tu nutricion diaria", "de un vistazo", dash_content,
    ["Seguimiento de calorias en tiempo real","Macros detallados: proteina, carbos, grasa","Historial completo de comidas"],
    "screenshot_01_dashboard.png")

# Screenshot 2: AI Camera
def cam_content(d, px, py, pw, ph):
    sx, sw = px+20, pw-40
    cy, ch = py+60, 500
    rrect(d,(sx,cy,sx+sw,cy+ch),20,(10,15,30))
    ccx, ccy = sx+sw//2, cy+ch//2
    d.line((ccx-60,ccy,ccx+60,ccy),fill=WHITE,width=2)
    d.line((ccx,ccy-60,ccx,ccy+60),fill=WHITE,width=2)
    d.rectangle((ccx-80,ccy-80,ccx+80,ccy+80),outline=PRIMARY,width=3)
    
    ry = cy+ch+40
    rrect(d,(sx,ry,sx+sw,ry+350),20,CARD)
    d.text((sx+30,ry+20), "Pizza Margherita", fill=WHITE, font=F[48])
    d.text((sx+30,ry+80), "Confianza: 95%", fill=ACCENT, font=F[36])
    
    ny = ry+140
    iw = sw//4
    for i,(v,l) in enumerate([("266","kcal"),("11g","prot"),("33g","carbs"),("10g","grasa")]):
        ix = sx+i*iw+iw//2
        bb = d.textbbox((0,0),v,font=F[48]); d.text((ix-(bb[2]-bb[0])//2,ny),v,fill=WHITE,font=F[48])
        bb = d.textbbox((0,0),l,font=F[36]); d.text((ix-(bb[2]-bb[0])//2,ny+55),l,fill=GRAY,font=F[36])
    
    bcy = py+ph-100
    d.ellipse((px+pw//2-45,bcy-45,px+pw//2+45,bcy+45),outline=WHITE,width=4)
    d.ellipse((px+pw//2-35,bcy-35,px+pw//2+35,bcy+35),fill=PRIMARY)

make_screenshot("Foto y listo", "La IA analiza tu comida al instante", cam_content,
    ["GPT-4o Vision analiza tu plato","Resultados en segundos","Nutricion precisa por porcion"],
    "screenshot_02_camera.png")

# Screenshot 3: Goals
def goals_content(d, px, py, pw, ph):
    sx, sw = px+30, pw-60
    d.text((sx,py+80), "Mi Perfil", fill=WHITE, font=F[48])
    
    goals = [("Calorias","2,100 kcal",PRIMARY),("Proteina","158g",ACCENT),
             ("Carbohidratos","236g",(99,102,241)),("Grasa","70g",YELLOW),
             ("Actividad","Moderada",(168,85,247)),("Objetivo","Perder peso",(244,63,94))]
    cw = sw//2
    for i,(label,val,color) in enumerate(goals):
        col,row = i%2, i//2
        gx = sx+col*(cw+10)
        gy = py+160+row*150
        rrect(d,(gx,gy,gx+cw-10,gy+130),16,CARD)
        d.text((gx+20,gy+15),label,fill=GRAY,font=F[36])
        d.text((gx+20,gy+60),val,fill=color,font=F[48])
    
    iy = py+160+3*150+30
    rrect(d,(sx,iy,sx+sw,iy+120),16,CARD)
    d.text((sx+20,iy+15),"BMR: 1,680 kcal",fill=WHITE,font=F[36])
    d.text((sx+20,iy+60),"TDEE: 2,100 kcal",fill=ACCENT,font=F[36])

make_screenshot("Objetivos personalizados", "Adaptados a tu cuerpo y meta", goals_content,
    ["Calculo BMR y TDEE automatico","Ajuste por nivel de actividad","Metas: perder, mantener o ganar"],
    "screenshot_03_goals.png")

print(f"\nCapturas guardadas en: {out}")
