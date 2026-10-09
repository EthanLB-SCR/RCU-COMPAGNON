// pdf.js — mini-générateur PDF (A4 portrait) SANS dépendance : textes Helvetica (WinAnsi), tableaux, photos JPEG, pagination, pied de page, charte SCR.
// Pourquoi (09/10 soir, Ethan : « quand tu cliques un PV d'épreuve ça ne fonctionne pas ») : le stockage sert un .html en texte brut (jamais rendu, sécurité) —
// un PV classé au Dossier doit s'ouvrir et se transmettre tel quel au client : c'est donc un vrai PDF, fabriqué ici dans l'appli (hors connexion compris).
// Style (Ethan 09/10 soir : « beaucoup plus stylé, design à la mode ») : en-tête logo + filet orange, puces d'infos, cartes arrondies, tableaux à filets fins, pied de page SCR.
import {BRAND,LOGO_PNG} from './charte.js';
const CP1252={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
const SUBST=[[/→/g,'->'],[/←/g,'<-'],[/[✓✔]/g,'OK'],[/[✕✗✖]/g,'X'],[/≥/g,'>='],[/≤/g,'<='],[/−/g,'-'],[/ /g,' '],[/[\r\n\t]+/g,' '],[/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,'']];
export function pdfClean(s){s=String(s==null?'':s);SUBST.forEach(([re,to])=>{s=s.replace(re,to);});return s;}
// chaîne PDF littérale en WinAnsi (accents, °, ³, œ, —, €… ; le reste devient « ? »)
function winAnsi(s){let out='';for(const ch of pdfClean(s)){const c=ch.codePointAt(0);const b=c<256?c:(CP1252[c]||63);if(b===0x28||b===0x29||b===0x5C)out+='\\';out+=String.fromCharCode(b);}return out;}
let mctx=null;
function measure(s,size,bold,tc){if(!mctx){const c=document.createElement('canvas');mctx=c.getContext('2d');}const w=mctx?(mctx.font=(bold?'bold ':'')+size+'px Helvetica, Arial, sans-serif',mctx.measureText(s).width):s.length*size*.5;return w+(tc||0)*Math.max(0,s.length-1);} // largeur en points (Arial ≈ Helvetica) + espacement des lettres
function wrap(s,size,bold,maxW){const words=pdfClean(s).split(' ').filter(Boolean);const lines=[];let cur='';
  const pushWord=w=>{if(measure(w,size,bold)<=maxW){lines.push(w);return;}let part='';for(const ch of w){if(measure(part+ch,size,bold)>maxW&&part){lines.push(part);part=ch;}else part+=ch;}if(part)lines.push(part);}; // mot plus large que la colonne (nom de fichier…) : coupé
  for(const w of words){const t=cur?cur+' '+w:w;if(measure(t,size,bold)<=maxW)cur=t;else{if(cur)lines.push(cur);cur='';if(measure(w,size,bold)<=maxW)cur=w;else pushWord(w);}}
  if(cur)lines.push(cur);return lines.length?lines:[''];}
// couleur : '#rrggbb' → 'r g b' (0-1) ; mix(c, blanc, p) pour les teintes
const hex=c=>{const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c||'#000000');return m?[1,2,3].map(i=>parseInt(m[i],16)):[0,0,0];};
export const pdfTint=(c,p)=>'#'+hex(c).map(v=>Math.round(255-(255-v)*p).toString(16).padStart(2,'0')).join('');
// photo (data URL ou URL signée) → JPEG redimensionné (max px) prêt pour /DCTDecode ; null si illisible (hors connexion, CORS)
export function pdfImage(src,max=900){return new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v);}};const im=new Image();im.crossOrigin='anonymous';
  im.onload=()=>{try{const r=Math.min(1,max/Math.max(1,im.naturalWidth,im.naturalHeight));const w=Math.max(1,Math.round(im.naturalWidth*r)),h=Math.max(1,Math.round(im.naturalHeight*r));const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);
    const b64=c.toDataURL('image/jpeg',.86).split(',')[1];const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);fin({bytes:u,w,h});}catch(e){fin(null);}};
  im.onerror=()=>fin(null);setTimeout(()=>fin(null),15000);im.src=src;});}
let logoJpg=null;export async function pdfLogo(){if(logoJpg===null){logoJpg=(await pdfImage(LOGO_PNG,320))||false;}return logoJpg||null;}
// document : D.text / line / rect / roundRect / para / table / image / chips / status / section / brandHead, D.y curseur (depuis le HAUT), D.need(h) pagine, D.blob() assemble
export function pdfDoc(opts={}){const W=595.28,H=841.89,M=opts.margin||40;const pages=[];const images=[];let P=null;let y=M;const footH=opts.footer?22:0;
  const col=c=>hex(c).map(v=>(v/255).toFixed(3)).join(' ');const n=v=>(+v).toFixed(2);
  function newPage(){P={ops:[],imgs:new Set()};pages.push(P);y=M;}
  const rrPath=(x,yy,w,h,r)=>{r=Math.min(r,w/2,h/2);const k=.5523*r;const Y=v=>H-v; /* chemin d'un rectangle arrondi (repère PDF, y vers le haut) */
    const x0=x,x1=x+w,y0=Y(yy),y1=Y(yy+h);
    return `${n(x0+r)} ${n(y0)} m ${n(x1-r)} ${n(y0)} l ${n(x1-r+k)} ${n(y0)} ${n(x1)} ${n(y0-r+k)} ${n(x1)} ${n(y0-r)} c ${n(x1)} ${n(y1+r)} l ${n(x1)} ${n(y1+r-k)} ${n(x1-r+k)} ${n(y1)} ${n(x1-r)} ${n(y1)} c ${n(x0+r)} ${n(y1)} l ${n(x0+r-k)} ${n(y1)} ${n(x0)} ${n(y1+r-k)} ${n(x0)} ${n(y1+r)} c ${n(x0)} ${n(y0-r)} l ${n(x0)} ${n(y0-r+k)} ${n(x0+r-k)} ${n(y0)} ${n(x0+r)} ${n(y0)} c h`;};
  const api={W,H,M,pages,newPage,get y(){return y;},set y(v){y=v;},measure:(s,size,bold)=>measure(pdfClean(s),size,bold),
    need(h){if(y+h>H-M-footH){newPage();return true;}return false;},
    text(x,yy,s,o={}){const size=o.size||10;const f=o.bold?'/F2':'/F1';const t=pdfClean(s);const tc=o.tc||0;let xx=x;if(o.align==='center')xx=x-measure(t,size,o.bold,tc)/2;else if(o.align==='right')xx=x-measure(t,size,o.bold,tc);P.ops.push(`BT ${f} ${n(size)} Tf ${n(tc)} Tc ${col(o.color)} rg 1 0 0 1 ${n(xx)} ${n(H-yy)} Tm (${winAnsi(t)}) Tj ET`);},
    line(x1,y1,x2,y2,o={}){P.ops.push(`${col(o.color||'#000000')} RG ${n(o.w||.6)} w ${n(x1)} ${n(H-y1)} m ${n(x2)} ${n(H-y2)} l S`);},
    rect(x,yy,w,h,o={}){const parts=[];if(o.fill)parts.push(`${col(o.fill)} rg`);if(o.stroke)parts.push(`${col(o.stroke)} RG ${n(o.w||.8)} w`);if(!o.fill&&!o.stroke)return;P.ops.push(`${parts.join(' ')} ${n(x)} ${n(H-yy-h)} ${n(w)} ${n(h)} re ${o.fill&&o.stroke?'B':o.fill?'f':'S'}`);},
    roundRect(x,yy,w,h,r,o={}){const parts=[];if(o.fill)parts.push(`${col(o.fill)} rg`);if(o.stroke)parts.push(`${col(o.stroke)} RG ${n(o.w||.8)} w`);if(!o.fill&&!o.stroke)return;P.ops.push(`${parts.join(' ')} ${rrPath(x,yy,w,h,r)} ${o.fill&&o.stroke?'B':o.fill?'f':'S'}`);},
    // paragraphe à retour à la ligne automatique ; avance y, pagine
    para(s,o={}){const size=o.size||10,lh=o.lh||size*1.25;const x=o.x||M,w=o.w||(W-2*M);const lines=wrap(s,size,o.bold,w);for(const L of lines){api.need(lh);api.text(x,y+size,L,o);y+=lh;}return lines.length*lh;},
    // tableau « à filets fins » : rows = [[cellule…]], cellule = texte ou {t, bold, color, fill, span, align, h} ; widths en points ; o.head = 1re ligne en en-tête (petites capitales, filet sombre), o.th = 1re colonne en libellés (fond doux)
    table(rows,widths,o={}){const size=o.size||9.5,lh=size*1.28,pad=o.pad||3.4;const x0=o.x||M;const total=widths.reduce((a,b)=>a+b,0);
      rows.forEach((row,ri)=>{let ci=0;const isHead=o.head&&ri===0;const cells=row.map(c=>{const cell=(typeof c==='object'&&c!==null)?c:{t:c};const span=cell.span||1;const w=widths.slice(ci,ci+span).reduce((a,b)=>a+b,0);const th=!isHead&&o.th&&ci===0&&!cell.noTh;ci+=span;const sz=isHead?size*.82:size;return {...cell,w,th,isHead,sz,bold:cell.bold||th||isHead,lines:wrap(cell.t==null?'':String(isHead?String(cell.t).toUpperCase():cell.t),sz,cell.bold||th||isHead,w-2*pad)};});
        const rh=Math.max(...cells.map(c=>Math.max(c.lines.length*lh+2*pad,c.h||0)));api.need(rh);
        if(!isHead&&o.zebra!==false&&ri%2===(o.head?0:1))api.rect(x0,y,total,rh,{fill:'#fbfaf8'});
        let x=x0;cells.forEach(c=>{if(c.fill||c.th)api.rect(x,y,c.w,rh,{fill:c.fill||BRAND.soft});c.lines.forEach((L,li)=>{const tx=c.align==='center'?x+c.w/2:c.align==='right'?x+c.w-pad:x+pad;api.text(tx,y+pad+c.sz*.95+li*lh,L,{size:c.sz,bold:c.bold,color:c.color||(c.isHead?BRAND.muted:c.th?BRAND.dark:BRAND.ink),align:c.align,tc:c.isHead?.6:0});});x+=c.w;});
        api.line(x0,y+rh,x0+total,y+rh,{color:isHead?BRAND.dark:BRAND.line,w:isHead?1.2:.5});
        y+=rh;});
      y+=5;},
    // image JPEG (de pdfImage) ajustée et centrée dans la boîte w × h (coins arrondis r)
    image(jpg,x,yy,w,h,r){const i=images.length;images.push(jpg);P.imgs.add(i);const k=Math.min(w/jpg.w,h/jpg.h);const dw=jpg.w*k,dh=jpg.h*k;const dx=x+(w-dw)/2,dy=yy+(h-dh)/2;P.ops.push(`q ${r?rrPath(dx,dy,dw,dh,r)+' W n ':''}${n(dw)} 0 0 ${n(dh)} ${n(dx)} ${n(H-dy-dh)} cm /Im${i} Do Q`);},
    // puces d'infos : [[libellé, valeur], …] sur une ou plusieurs lignes
    chips(items,o={}){const size=o.size||8.5;const hgt=17,gap=5;let x=M;items=items.filter(it=>it&&it[1]!==undefined&&it[1]!==null&&it[1]!=='');
      items.forEach(([lab,val])=>{const L=String(lab).toUpperCase(),V=String(val);const wl=measure(pdfClean(L),size*.82,true,.5),wv=measure(pdfClean(V),size,false);const w=wl+wv+22;if(x+w>W-M){x=M;y+=hgt+gap;}api.need(hgt);
        api.roundRect(x,y,w,hgt,8.5,{fill:BRAND.soft,stroke:BRAND.line,w:.6});api.text(x+8,y+11.6,L,{size:size*.82,bold:true,color:BRAND.muted,tc:.5});api.text(x+8+wl+6,y+11.8,V,{size,color:BRAND.ink});x+=w+gap;});
      if(items.length)y+=hgt+10;},
    // carte de résultat : bandeau arrondi teinté à la couleur du verdict
    status(txt,color,o={}){const h=o.h||28;api.need(h+8);api.roundRect(M,y,W-2*M,h,9,{fill:pdfTint(color,.1),stroke:color,w:1.2});api.text(W/2,y+h/2+4.6,txt,{size:o.size||12.5,bold:true,color,align:'center',tc:.3});y+=h+12;},
    // titre de section : petite barre orange + texte
    section(txt){api.need(26);api.roundRect(M,y+3,4,13,2,{fill:BRAND.orange});api.text(M+10,y+14,txt,{size:11.5,bold:true,color:BRAND.dark});y+=22;},
    // en-tête de charte : logo à gauche, surtitre + titre + sous-titre à droite, filet orange (+ segment anthracite)
    async brandHead({kicker,title,sub}){const lg=await pdfLogo();const lh=44;if(lg)api.image(lg,M,y,lh*lg.w/lg.h,lh);
      const rx=W-M;if(kicker)api.text(rx,y+10,kicker.toUpperCase(),{size:7.5,bold:true,color:BRAND.orange,align:'right',tc:1.3});
      api.text(rx,y+30,title,{size:17,bold:true,color:BRAND.dark,align:'right'});if(sub)api.text(rx,y+43,sub,{size:9,color:BRAND.muted,align:'right'});
      y+=lh+10;api.rect(M,y,W-2*M,2.2,{fill:BRAND.orange});api.rect(M,y,110,2.2,{fill:BRAND.dark});y+=14;},
    blob(){if(opts.footer){const keep=P;pages.forEach((pg,i)=>{P=pg;opts.footer(api,i+1,pages.length);});P=keep;}
      const enc=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u;};const chunks=[];let off=0;const offsets=[];const push=u=>{chunks.push(u);off+=u.length;};
      const objCount=4+pages.length*2+images.length;const pageObj=i=>5+2*i,contObj=i=>6+2*i,imgObj=i=>5+2*pages.length+i;
      push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
      const obj=(num,body)=>{offsets[num]=off;push(enc(`${num} 0 obj\n`));(Array.isArray(body)?body:[body]).forEach(b=>push(typeof b==='string'?enc(b):b));push(enc('\nendobj\n'));};
      obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
      obj(2,`<< /Type /Pages /Kids [${pages.map((_,i)=>pageObj(i)+' 0 R').join(' ')}] /Count ${pages.length} >>`);
      obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      pages.forEach((pg,i)=>{const xo=[...pg.imgs].map(k=>`/Im${k} ${imgObj(k)} 0 R`).join(' ');
        obj(pageObj(i),`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(W)} ${n(H)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xo?'/XObject << '+xo+' >> ':''}>> /Contents ${contObj(i)} 0 R >>`);
        const cb=enc(pg.ops.join('\n'));obj(contObj(i),[`<< /Length ${cb.length} >>\nstream\n`,cb,'\nendstream']);});
      images.forEach((im,i)=>obj(imgObj(i),[`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`,im.bytes,'\nendstream']));
      const xref=off;let x=`xref\n0 ${objCount+1}\n0000000000 65535 f \n`;for(let i=1;i<=objCount;i++)x+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';push(enc(x));
      push(enc(`trailer\n<< /Size ${objCount+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
      return new Blob(chunks,{type:'application/pdf'});}};
  newPage();return api;}
// pied de page de charte (à passer en opts.footer) : « SCR · Soudure Construction Réseaux · <gauche> » et « page i / n · <droite> »
export const pdfFooter=(left,right)=>(d,i,nb)=>{d.line(d.M,d.H-30,d.W-d.M,d.H-30,{color:BRAND.line,w:.6});d.text(d.M,d.H-19,'SCR · Soudure Construction Réseaux'+(left?' · '+left:''),{size:7.5,color:BRAND.muted});d.text(d.W-d.M,d.H-19,'page '+i+' / '+nb+(right?' · '+right:''),{size:7.5,color:BRAND.muted,align:'right'});};
