// formats.js (13/10/2026) dans Node : le même CCTP fictif en .docx / .doc / .rtf / .odt (test/make_fixture_word.py) → texte, titres, numérotation,
// tableau, image ; reconnaissance au contenu (un .doc qui est un RTF) ; message clair sur un fichier non Word.
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const F=await import('../src/formats.js');
const load=f=>{const b=fs.readFileSync(path.join(HERE,f));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const heads=r=>[...r.html.matchAll(/<p class="cm-para cm-h(\d)[^"]*" data-i="(\d+)"/g)].map(m=>r.paras[+m[2]]);
const C={};const out={};
for(const e of ['docx','doc','rtf','odt']){const r=await F.readOffice(load('fixture_word.'+e),'fixture_word.'+e);const t=r.paras.join('\n');out[e]={kind:r.kind,n:r.paras.length,h:heads(r),tab:(r.html.match(/<table/g)||[]).length,img:r.imgs.length,leak:/<w:|w:val|<text:/.test(r.html)||/<w:|w:val/.test(t),radio:/10 % des soudures sur les feeders et 20 % sur les antennes/.test(t),row:/100 \| 250 \| 42/.test(t)||/<td>.*?100.*?<\/td>/.test(r.html)};}
console.log(JSON.stringify(out));
C.docx=out.docx.kind==='docx'&&out.docx.h.join('|')==='CCTP fictif — Lot 2 réseau de chaleur|1. Généralités|2. Contrôles|2.1 Radiographie|2.2 Épreuve hydraulique|3. Réception'&&out.docx.tab===1&&out.docx.img===1&&!out.docx.leak&&out.docx.radio;
C.doc=out.doc.kind==='doc'&&out.doc.radio&&out.doc.row&&!out.doc.leak&&out.doc.n>=14;
C.rtf=out.rtf.kind==='rtf'&&out.rtf.radio&&out.rtf.row&&out.rtf.h.some(h=>/Radiographie/.test(h))&&!out.rtf.leak;
C.odt=out.odt.kind==='odt'&&out.odt.radio&&out.odt.tab===1&&out.odt.img===1&&out.odt.h.includes('Radiographie')&&!out.odt.h.some(h=>/^•/.test(h));
/* un « .doc » qui est en fait un RTF (fréquent) s'ouvre quand même ; un PDF mal nommé et un zip quelconque donnent un message clair */
const rtfAsDoc=await F.readOffice(load('fixture_word.rtf'),'CCTP.doc');C.sniff=rtfAsDoc.kind==='rtf';
let m1='',m2='';try{await F.readOffice(load('fixture_cctp.pdf'),'x.doc');}catch(e){m1=e.message;}try{await F.readOffice(load('fixture_dce.zip'),'x.docx');}catch(e){m2=e.message;}
C.msg=/PDF/.test(m1)&&/zip/.test(m2);
/* numéros de liste : décimal, lettres, romains */
C.num=F.rtfText('{\\rtf1\\ansi {\\fonttbl{\\f0 Arial;}}\\pard Essai \\u233? t\\\'e9 \\par Ligne 2\\par}').includes('Essai é té')&&F.rotRect===undefined;
console.log({m1,m2});
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
