// pdf.js — mini-générateur PDF (A4 portrait) SANS dépendance : textes Helvetica (WinAnsi), tableaux, photos JPEG, pagination, pied de page.
// Pourquoi (09/10 soir, Ethan : « quand tu cliques un PV d'épreuve ça ne fonctionne pas ») : le stockage sert un .html en texte brut (jamais rendu, sécurité) —
// un PV classé au Dossier doit s'ouvrir et se transmettre tel quel au client : c'est donc un vrai PDF, fabriqué ici dans l'appli (hors connexion compris).
const CP1252={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
const SUBST=[[/→/g,'->'],[/←/g,'<-'],[/[✓✔]/g,'OK'],[/[✕✗✖]/g,'X'],[/≥/g,'>='],[/≤/g,'<='],[/−/g,'-'],[/ /g,' '],[/[\r\n\t]+/g,' '],[/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,'']];
export function pdfClean(s){s=String(s==null?'':s);SUBST.forEach(([re,to])=>{s=s.replace(re,to);});return s;}
// chaîne PDF littérale en WinAnsi (accents, °, ³, œ, —, €… ; le reste devient « ? »)
function winAnsi(s){let out='';for(const ch of pdfClean(s)){const c=ch.codePointAt(0);const b=c<256?c:(CP1252[c]||63);if(b===0x28||b===0x29||b===0x5C)out+='\\';out+=String.fromCharCode(b);}return out;}
let mctx=null;
function measure(s,size,bold){if(!mctx){const c=document.createElement('canvas');mctx=c.getContext('2d');}if(!mctx)return s.length*size*.5;mctx.font=(bold?'bold ':'')+size+'px Helvetica, Arial, sans-serif';return mctx.measureText(s).width;} // largeur en points (Arial ≈ Helvetica)
function wrap(s,size,bold,maxW){const words=pdfClean(s).split(' ').filter(Boolean);const lines=[];let cur='';
  const pushWord=w=>{if(measure(w,size,bold)<=maxW){lines.push(w);return;}let part='';for(const ch of w){if(measure(part+ch,size,bold)>maxW&&part){lines.push(part);part=ch;}else part+=ch;}if(part)lines.push(part);}; // mot plus large que la colonne (nom de fichier…) : coupé
  for(const w of words){const t=cur?cur+' '+w:w;if(measure(t,size,bold)<=maxW)cur=t;else{if(cur)lines.push(cur);cur='';if(measure(w,size,bold)<=maxW)cur=w;else pushWord(w);}}
  if(cur)lines.push(cur);return lines.length?lines:[''];}
// photo (data URL ou URL signée) → JPEG redimensionné (max px) prêt pour /DCTDecode ; null si illisible (hors connexion, CORS)
export function pdfImage(src,max=900){return new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v);}};const im=new Image();im.crossOrigin='anonymous';
  im.onload=()=>{try{const r=Math.min(1,max/Math.max(1,im.naturalWidth,im.naturalHeight));const w=Math.max(1,Math.round(im.naturalWidth*r)),h=Math.max(1,Math.round(im.naturalHeight*r));const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);
    const b64=c.toDataURL('image/jpeg',.82).split(',')[1];const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);fin({bytes:u,w,h});}catch(e){fin(null);}};
  im.onerror=()=>fin(null);setTimeout(()=>fin(null),15000);im.src=src;});}
// document : D.text / line / rect / para / table / image, D.y curseur (depuis le HAUT de la page), D.need(h) pagine, D.blob() assemble
export function pdfDoc(opts={}){const W=595.28,H=841.89,M=opts.margin||40;const pages=[];const images=[];let P=null;let y=M;const footH=opts.footer?22:0;
  const col=c=>{const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c||'#000000');return m?[1,2,3].map(i=>(parseInt(m[i],16)/255).toFixed(3)).join(' '):'0 0 0';};
  const n=v=>(+v).toFixed(2);
  function newPage(){P={ops:[],imgs:new Set()};pages.push(P);y=M;}
  const api={W,H,M,pages,newPage,get y(){return y;},set y(v){y=v;},
    need(h){if(y+h>H-M-footH){newPage();return true;}return false;},
    text(x,yy,s,o={}){const size=o.size||10;const f=o.bold?'/F2':'/F1';const t=pdfClean(s);let xx=x;if(o.align==='center')xx=x-measure(t,size,o.bold)/2;else if(o.align==='right')xx=x-measure(t,size,o.bold);P.ops.push(`BT ${f} ${n(size)} Tf ${col(o.color)} rg 1 0 0 1 ${n(xx)} ${n(H-yy)} Tm (${winAnsi(t)}) Tj ET`);},
    line(x1,y1,x2,y2,o={}){P.ops.push(`${col(o.color||'#000000')} RG ${n(o.w||.6)} w ${n(x1)} ${n(H-y1)} m ${n(x2)} ${n(H-y2)} l S`);},
    rect(x,yy,w,h,o={}){const parts=[];if(o.fill)parts.push(`${col(o.fill)} rg`);if(o.stroke)parts.push(`${col(o.stroke)} RG ${n(o.w||.8)} w`);if(!o.fill&&!o.stroke)return;P.ops.push(`${parts.join(' ')} ${n(x)} ${n(H-yy-h)} ${n(w)} ${n(h)} re ${o.fill&&o.stroke?'B':o.fill?'f':'S'}`);},
    // paragraphe à retour à la ligne automatique ; avance y, pagine
    para(s,o={}){const size=o.size||10,lh=o.lh||size*1.25;const x=o.x||M,w=o.w||(W-2*M);const lines=wrap(s,size,o.bold,w);for(const L of lines){api.need(lh);api.text(x,y+size,L,o);y+=lh;}return lines.length*lh;},
    // tableau : rows = [[cellule…]], cellule = texte ou {t, bold, color, fill, span, align, h} ; widths en points ; o.head = 1re ligne en en-tête, o.th = 1re colonne en en-tête
    table(rows,widths,o={}){const size=o.size||9.5,lh=size*1.28,pad=o.pad||3;const x0=o.x||M;
      rows.forEach((row,ri)=>{let ci=0;const cells=row.map(c=>{const cell=(typeof c==='object'&&c!==null)?c:{t:c};const span=cell.span||1;const w=widths.slice(ci,ci+span).reduce((a,b)=>a+b,0);const th=(o.head&&ri===0)||(o.th&&ci===0&&!cell.noTh);ci+=span;return {...cell,w,th,bold:cell.bold||th,lines:wrap(cell.t==null?'':String(cell.t),size,cell.bold||th,w-2*pad)};});
        const rh=Math.max(...cells.map(c=>Math.max(c.lines.length*lh+2*pad,c.h||0)));api.need(rh);
        let x=x0;cells.forEach(c=>{api.rect(x,y,c.w,rh,{fill:c.fill||(c.th?'#f0efe9':null),stroke:'#bbbbbb',w:.5});c.lines.forEach((L,li)=>{const tx=c.align==='center'?x+c.w/2:c.align==='right'?x+c.w-pad:x+pad;api.text(tx,y+pad+size*.95+li*lh,L,{size,bold:c.bold,color:c.color,align:c.align});});x+=c.w;});
        y+=rh;});
      y+=4;},
    // image JPEG (de pdfImage) ajustée et centrée dans la boîte w × h
    image(jpg,x,yy,w,h){const i=images.length;images.push(jpg);P.imgs.add(i);const r=Math.min(w/jpg.w,h/jpg.h);const dw=jpg.w*r,dh=jpg.h*r;const dx=x+(w-dw)/2,dy=yy+(h-dh)/2;P.ops.push(`q ${n(dw)} 0 0 ${n(dh)} ${n(dx)} ${n(H-dy-dh)} cm /Im${i} Do Q`);},
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
