// stockart.js — rendu « 3D » des zones de stockage sur le plan (01/11 soir, Ethan : « Stockage c'est bien, il faudrait juste retravailler le visuel des zones
// posées, quitte à modéliser les pièces : en fonction de ce qu'il y a sur la zone, le visuel 3D des pièces stockées — juste le carré, ce n'est pas beau »).
// Vue de dessus en perspective cavalière : les barres pré-isolées couchées en tas sur des bastaings (gaine noire ombrée, bout acier visible, couches
// décalées et ombrées), les petites pièces sur palettes (manchons debout, cartons de mousse, coudes, tés, réductions, vannes, divers) avec leur nombre.
// Les pièces ATTENDUES (camion annoncé, pas encore pointé) sont dessinées en fantôme. Dessin en coordonnées locales de la zone (centre 0,0, avant rotation),
// en unités du plan (la zone fait 13 × 3 par défaut, comme le camion) ; rien n'intercepte les touchers (la zone garde son rectangle tapable dessous).
const DEF_GAINE={20:90,25:90,32:110,40:110,50:125,65:140,80:160,100:200,125:225,150:250,200:315,250:400,300:450,350:500,400:560,450:630,500:710,600:800};
const gaineOf=a=>(+a.gaine)||DEF_GAINE[+a.dn]||Math.round((+a.dn||100)*1.6+40);
const f2=v=>(Math.round(v*1000)/1000).toString();
export const stkDefs=(P='stk')=>`<linearGradient id="${P}Cyl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0f11"/><stop offset=".2" stop-color="#363b41"/><stop offset=".42" stop-color="#8d939a"/><stop offset=".58" stop-color="#3a3f45"/><stop offset="1" stop-color="#0a0b0d"/></linearGradient>`
 +`<linearGradient id="${P}CylG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8c8f94"/><stop offset=".42" stop-color="#e3e5e8"/><stop offset="1" stop-color="#8c8f94"/></linearGradient>`
 +`<radialGradient id="${P}Sl" cx=".36" cy=".34" r=".72"><stop offset="0" stop-color="#a7adb4"/><stop offset=".45" stop-color="#3b4046"/><stop offset="1" stop-color="#0f1113"/></radialGradient>`
 +`<linearGradient id="${P}Wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c79a63"/><stop offset="1" stop-color="#8f643a"/></linearGradient>`
 +`<linearGradient id="${P}Box" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c28d"/><stop offset="1" stop-color="#b98d4f"/></linearGradient>`;
export const STK_DEFS=stkDefs('stk');
const PAL={sleeve:'manchons',sleeveEnd:'manchons',bend:'coudes',steelbend:'coudes',tee:'tés',reducer:'réductions',valve:'vannes',bypass:'by-pass'};
const palType=a=>{const k=String(a.kind||'');if(/^pu/i.test(k)||/mousse/i.test(a.label||''))return 'mousse';return PAL[k]||'divers';};
// texte à taille constante à l'écran (k = zoom courant), halo blanc
const lab=(x,y,t,k,col)=>`<g transform="translate(${f2(x)} ${f2(y)}) scale(${f2(1/k)})"><text x="0" y="0" font-size="10.5" font-weight="800" text-anchor="end" fill="${col||'#1b1d20'}" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="system-ui,sans-serif">${t}</text></g>`;
/* une barre couchée : gaine (cylindre ombré), bout visible (gaine + acier + vide) ; fantôme = translucide, contour pointillé */
function pipe(x,y,L,D,ghost,k,P){const o=(ghost?' opacity=".32"':'')+` data-a="${ghost?'pg':'p'}"`;const st=ghost?` stroke="#1c3d6b" stroke-width="${f2(1.2/k)}" stroke-dasharray="${f2(4/k)} ${f2(3/k)}"`:'';
  return `<g${o}><rect x="${f2(x+D*.12)}" y="${f2(y+D*.2)}" width="${f2(L)}" height="${f2(D)}" rx="${f2(D/2)}" fill="#000" opacity=".28"/>`
   +`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(L)}" height="${f2(D)}" rx="${f2(D/2)}" fill="url(#${P}Cyl)"${st}/>`
   +`<ellipse cx="${f2(x+L-D*.12)}" cy="${f2(y+D/2)}" rx="${f2(D*.2)}" ry="${f2(D*.48)}" fill="#1a1c1f"/><ellipse cx="${f2(x+L-D*.12)}" cy="${f2(y+D/2)}" rx="${f2(D*.11)}" ry="${f2(D*.27)}" fill="url(#${P}CylG)"/><ellipse cx="${f2(x+L-D*.12)}" cy="${f2(y+D/2)}" rx="${f2(D*.06)}" ry="${f2(D*.15)}" fill="#4a4f55"/></g>`;}
/* un tas de barres d'un même DN dans la bande [y0, y0+bh] : couches en quinconce, décalées vers le haut-gauche (perspective), bastaings dessous */
function pipeStack(x0,y0,L,bh,D0,n,p,k,P){const out=[];const tot=n+p;if(!tot)return '';const RY=.42,RX=.34; /* montée d'une couche : vers le haut-gauche (perspective cavalière) */
  // en pyramide (comme sur chantier : base de c barres, une de moins par couche, calée dans le creux) tant que ça tient en 6 couches ; sinon tas en quinconce (≤ 5 couches)
  let c=Math.ceil((Math.sqrt(8*tot+1)-1)/2);const pyr=c<=6;let layers,D=D0;
  if(pyr)layers=c;else{c=Math.max(1,Math.floor(bh/D));layers=Math.ceil(tot/c);if(layers>5){c=Math.ceil(tot/5);layers=Math.ceil(tot/c);}}
  const hOf=d=>c*d+(layers-1)*RY*d;if(hOf(D)>bh)D=bh/(c+(layers-1)*RY); /* tout le tas (base + montée des couches) tient dans la bande */
  const rx=(layers-1)*RX*D,ry=(layers-1)*RY*D;const L2=Math.max(.3,L-rx);const xB=x0+rx;const used=c*D;const yA=y0+ry+(bh-used-ry)/2;
  [.1,.5,.9].forEach(t=>out.push(`<rect x="${f2(xB+L2*t-D*.3)}" y="${f2(yA-D*.3)}" width="${f2(D*.6)}" height="${f2(used+D*.6)}" rx="${f2(D*.08)}" fill="url(#${P}Wood)" stroke="#6e4a26" stroke-width="${f2(.8/k)}"/>`));
  let i=0;for(let ly=0;ly<layers&&i<tot;ly++){const cc=pyr?Math.max(1,c-ly):(ly%2?Math.max(1,c-1):c);const off=pyr?ly*D/2:(ly%2?D/2:0);
    for(let j=0;j<cc&&i<tot;j++,i++)out.push(pipe(xB-RX*D*ly,yA+off+j*D-RY*D*ly,L2,D,i>=n,k,P));}
  return out.join('');}
/* une palette (vue de dessus) et son contenu */
function pallet(x,y,s,type,n,p,k,P,TXT){const g=[];const ghost=!n&&p;g.push(`<g data-a="pal" data-t="${type}"${ghost?' opacity=".35"':''}>`);
  g.push(`<rect x="${f2(x+s*.05)}" y="${f2(y+s*.08)}" width="${f2(s)}" height="${f2(s*.72)}" fill="#000" opacity=".22" rx="${f2(s*.04)}"/>`);
  g.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(s)}" height="${f2(s*.72)}" fill="url(#${P}Wood)" stroke="#6e4a26" stroke-width="${f2(.8/k)}" rx="${f2(s*.03)}"/>`);
  [.18,.5,.82].forEach(t=>g.push(`<line x1="${f2(x+s*.04)}" x2="${f2(x+s*.96)}" y1="${f2(y+s*.72*t)}" y2="${f2(y+s*.72*t)}" stroke="#7a5430" stroke-width="${f2(.7/k)}" opacity=".7"/>`));
  const m=Math.min(9,Math.max(1,n||p));const cols=m>4?3:m>1?2:1;const rows=Math.ceil(m/cols);const cw=s*.84/cols,ch=s*.62/rows;const cx0=x+s*.08,cy0=y+s*.05;
  for(let q=0;q<m;q++){const cx=cx0+(q%cols)*cw+cw/2,cy=cy0+Math.floor(q/cols)*ch+ch/2;const r=Math.min(cw,ch)*.42;
    if(type==='manchons')g.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="url(#${P}Sl)"/><circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r*.55)}" fill="none" stroke="#14161a" stroke-width="${f2(r*.18)}" opacity=".7"/>`);
    else if(type==='mousse')g.push(`<rect x="${f2(cx-r)}" y="${f2(cy-r*.8)}" width="${f2(r*2)}" height="${f2(r*1.6)}" fill="url(#${P}Box)" stroke="#8a6631" stroke-width="${f2(.6/k)}" rx="${f2(r*.12)}"/><path d="M${f2(cx-r)} ${f2(cy-r*.8)}l${f2(r*.35)} ${f2(-r*.3)}h${f2(r*2)}l${f2(-r*.35)} ${f2(r*.3)}z" fill="#edd5a8" stroke="#8a6631" stroke-width="${f2(.5/k)}"/><line x1="${f2(cx-r*.15)}" x2="${f2(cx-r*.15)}" y1="${f2(cy-r*.8)}" y2="${f2(cy+r*.8)}" stroke="#a87d43" stroke-width="${f2(r*.12)}"/>`);
    else if(type==='coudes')g.push(`<path d="M${f2(cx-r)} ${f2(cy+r*.7)}V${f2(cy)}A${f2(r*.7)} ${f2(r*.7)} 0 0 1 ${f2(cx-r*.3)} ${f2(cy-r*.7)}H${f2(cx+r)}" fill="none" stroke="#202327" stroke-width="${f2(r*.62)}" stroke-linecap="round"/><path d="M${f2(cx-r)} ${f2(cy+r*.7)}V${f2(cy)}A${f2(r*.7)} ${f2(r*.7)} 0 0 1 ${f2(cx-r*.3)} ${f2(cy-r*.7)}H${f2(cx+r)}" fill="none" stroke="#7d838a" stroke-width="${f2(r*.18)}" stroke-linecap="round" opacity=".8"/>`);
    else if(type==='tés')g.push(`<path d="M${f2(cx-r)} ${f2(cy-r*.35)}H${f2(cx+r)}M${f2(cx)} ${f2(cy-r*.35)}V${f2(cy+r*.8)}" fill="none" stroke="#202327" stroke-width="${f2(r*.6)}" stroke-linecap="round"/><path d="M${f2(cx-r)} ${f2(cy-r*.35)}H${f2(cx+r)}M${f2(cx)} ${f2(cy-r*.35)}V${f2(cy+r*.8)}" fill="none" stroke="#7d838a" stroke-width="${f2(r*.16)}" stroke-linecap="round" opacity=".8"/>`);
    else if(type==='réductions')g.push(`<path d="M${f2(cx-r)} ${f2(cy-r*.55)}L${f2(cx+r)} ${f2(cy-r*.3)}V${f2(cy+r*.3)}L${f2(cx-r)} ${f2(cy+r*.55)}Z" fill="url(#${P}Cyl)" stroke="#111" stroke-width="${f2(.5/k)}"/>`);
    else if(type==='vannes'||type==='by-pass')g.push(`<rect x="${f2(cx-r)}" y="${f2(cy-r*.35)}" width="${f2(r*2)}" height="${f2(r*.7)}" rx="${f2(r*.3)}" fill="url(#${P}Cyl)"/><circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r*.42)}" fill="#c0392b" stroke="#7d1f16" stroke-width="${f2(.6/k)}"/>`);
    else g.push(`<rect x="${f2(cx-r)}" y="${f2(cy-r*.7)}" width="${f2(r*2)}" height="${f2(r*1.4)}" fill="url(#${P}Box)" stroke="#8a6631" stroke-width="${f2(.6/k)}" rx="${f2(r*.12)}"/>`);}
  g.push('</g>');
  const t=`${n?'×'+n:''}${p?(n?' +':'+')+p+' att.':''}`;if(TXT)g.push(lab(x+s,y-s*.02,t,k,ghost?'#1c3d6b':'#1b1d20'));
  return g.join('');}
/* la zone : dalle (gravier), tas de barres par DN, palettes ; st4 = 'ok' | 'prevu' */
export function stockZoneArt(z,agg,o){const k=(o&&o.k)||1;const P=(o&&o.pfx)||'stk';const w=+z.w||13,h=+z.h||3;
  if(w*k<34)return ''; /* zone minuscule à l'écran : la dalle suffit */const TXT=w*k>=170; /* textes (DN, ×n) seulement quand la zone est assez grande à l'écran */const x0=-w/2,y0=-h/2;const m=Math.max(.05,Math.min(.3,h*.07,w*.03));
  const pipes=new Map(),pals=new Map();
  (agg||[]).forEach(a=>{const n=Math.max(0,Math.round(+a.reste||0)),p=Math.max(0,Math.round(+a.pend||0));if(!n&&!p)return;
    if(a.kind==='pipe'){const key=+a.dn||0;const cur=pipes.get(key)||{dn:key,gaine:gaineOf(a),len:+a.len||12,n:0,p:0};cur.n+=n;cur.p+=p;pipes.set(key,cur);}
    else{const t=palType(a);const cur=pals.get(t)||{t,n:0,p:0};cur.n+=n;cur.p+=p;pals.set(t,cur);}});
  const PI=[...pipes.values()].sort((a,b)=>b.dn-a.dn),Q=[...pals.values()];
  let out='';
  // zone de palettes : bande du bas si la zone est assez large, sinon colonne de droite
  let px=x0+m,py=y0+m,pw=w-2*m,ph=h-2*m;let qx=0,qy=0,qw=0,qh=0;
  if(Q.length&&PI.length){if(h>=2.2){qh=Math.min(1.1,ph*.36);qw=pw;qx=px;qy=y0+h-m-qh;ph-=qh+m*.6;}else{qw=Math.min(1.6,pw*.28);qh=ph;qx=x0+w-m-qw;qy=py;pw-=qw+m*.6;}}
  else if(Q.length){qx=px;qy=py;qw=pw;qh=ph;}
  // barres : 12 m (ou la longueur de la zone), une bande par DN (proportionnelle au volume)
  if(PI.length&&pw>.3&&ph>.1){const L=Math.max(.5,Math.min(pw-.15,Math.max(...PI.map(g=>g.len))));const lx=px+(pw-L)/2;const tot=PI.reduce((t,g)=>t+(g.n+g.p)*g.gaine,0)||1;let yy=py;
    let drawn=0;PI.forEach(g=>{const bh=ph*((g.n+g.p)*g.gaine/tot);const cap=Math.max(0,60-drawn);const n=Math.min(g.n,cap),p=Math.min(g.p,Math.max(0,cap-n,0),20);drawn+=n+p;
      out+=pipeStack(lx,yy,L,Math.max(.12,bh-m*.4),g.gaine/1000,n,p,k,P);
      if(TXT)out+=lab(lx+L,yy+Math.max(.12,bh-m*.4)/2,`DN${g.dn} · ${g.n?g.n+' barre'+(g.n>1?'s':''):''}${g.p?(g.n?' + ':'')+g.p+' att.':''}${g.n+g.p>n+p?' (dessin partiel)':''}`,k,g.n?'#1b1d20':'#1c3d6b');yy+=bh;});}
  // palettes
  if(Q.length&&qw>.2&&qh>.2){const s=Math.max(.3,Math.min(1.2,qh/.8,qw/Math.max(1,Q.length)*.9));const per=Math.max(1,Math.floor(qw/(s*1.12)));const rows=Math.max(1,Math.floor(qh/(s*.82)));const QQ=Q.slice(0,per*rows);
    const gw=Math.min(per,QQ.length)*s*1.12-s*.12,gh=Math.ceil(QQ.length/per)*s*.82-s*.1;const ox=PI.length?0:Math.max(0,(qw-gw)/2),oy=PI.length?0:Math.max(0,(qh-gh)/2); /* seules sur la zone : palettes centrées */
    QQ.forEach((q,i)=>{const cx=qx+ox+(i%per)*s*1.12,cy=qy+oy+Math.floor(i/per)*s*.82;out+=pallet(cx,cy,s,q.t,q.n,q.p,k,P,TXT);});}
  return `<g style="pointer-events:none">${out}</g>`;}
// la dalle de la zone (sous le dessin) : gravier clair, bord à l'état de la zone (vert = en service, ambre pointillé = prévue)
export function stockPadSVG(z,st4,k,attrs){const w=+z.w||13,h=+z.h||3;const col=st4==='ok'?'#0ca30c':'#c9a227';
  return `<rect x="${f2(-w/2)}" y="${f2(-h/2)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(Math.min(1,h/6))}" fill="${st4==='ok'?'#e9e4d5':'#f3eedf'}" fill-opacity="${st4==='ok'?'.92':'.75'}" stroke="${col}" stroke-width="${f2(2.2/k)}" ${st4==='ok'?'':`stroke-dasharray="${f2(6/k)} ${f2(4/k)}"`} ${attrs||''}/>`;}
