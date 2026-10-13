// mkpdf.mjs — petit générateur de PDF « avec texte » pour les tests (Helvetica, une cellule = un texte posé à x, y). Sert à fabriquer des devis / BL FICTIFS
// au format des fournisseurs, lus dans le navigateur par pdf.js comme un vrai PDF. pages = [[[x, y, taille, texte], …], …] (A4, origine en bas à gauche).
export function makePdf(pages){const W=595,H=842;const objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  const kids=[];let n=4;const esc=t=>String(t).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  (pages||[]).forEach(items=>{const body=items.map(([x,y,sz,t])=>`BT /F1 ${sz||8} Tf ${x} ${y} Td (${esc(t)}) Tj ET`).join('\n');
    objs[n]=`<< /Length ${Buffer.byteLength(body,'latin1')} >>\nstream\n${body}\nendstream`;const c=n++;
    objs[n]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${c} 0 R >>`;kids.push(n++);});
  objs[2]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
  let pdf='%PDF-1.4\n';const offs=[];for(let i=1;i<objs.length;i++){offs[i]=Buffer.byteLength(pdf,'latin1');pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}
  const x=Buffer.byteLength(pdf,'latin1');pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`+offs.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(pdf,'latin1');}
/* lignes d'un tableau : [[x, texte], …] par ligne, 13 pt d'interligne à partir de y0 */
export const pdfLines=(lines,y0,sz)=>lines.flatMap((L,i)=>L.map(([x,t])=>[x,(y0||780)-i*13,sz||8,t]));
