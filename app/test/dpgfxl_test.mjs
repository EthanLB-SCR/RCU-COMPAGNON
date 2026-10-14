// DPGF « COMME DANS EXCEL » — tests Node du moteur (14/10 après-midi, lot C) : formules (src/xlcalc.js), formats de nombres à la française, saisie,
// décalage des références (formules partagées, lignes insérées / supprimées), français ⇄ anglais, lecture fidèle du classeur fictif (src/xlsx.js readBook :
// styles, fusions, volets, colonne masquée, formule partagée, nom défini) et écriture ciblée d'une feuille (patchSheetXml). Lancer : node test/dpgfxl_test.mjs
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import * as X from '../src/xlcalc.js';
import {readBook,patchSheetXml,cellKey} from '../src/xlsx.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));const C={};const NB=s=>String(s).replace(/[  ]/g,' ');
/* 1) formules */
const cells={'S!A1':10,'S!A2':20,'S!A3':'abc','S!B1':2,'S!B2':null,'S!C1':'12','R!A1':5};
const ctx={val:(sh,r,c)=>{const v=cells[sh+'!'+X.colName(c)+r];return v===undefined?null:v;},hasSheet:sh=>['S','R'].includes(sh),bounds:()=>({maxR:10,maxC:5}),name:n=>n==='TVA'?X.parseFormula('R!$A$1'):null,isSub:()=>false,rowHidden:()=>false};
const ev=f=>{try{return X.evalFormula(X.parseFormula(f),ctx,{sh:'S',r:5,c:1});}catch(e){return 'EXC:'+e.constructor.name;}};
const F=[['A1+A2',30],['SUM(A1:A3)',30],['SUM(A1,A3)',10],['-2^2',4],['A1*B1%',0.2],['ROUND(2.675,2)',2.68],['ROUND(-2.5,0)',-3],['ROUND(1234,-2)',1200],['ROUNDUP(1.1,0)',2],['IF(A1>5,"oui","non")','oui'],['MIN(A1:B2)',2],['MAX(A1:B2)',20],['PRODUCT(A1,B1)',20],['AVERAGE(A1:A2)',15],
  ['COUNTA(A1:A3)',3],['COUNTA(B2)',0],['R!A1*2',10],['TVA*2',10],['A1&"x"','10x'],['1/0',{e:'#DIV/0!'}],['IFERROR(1/0,7)',7],['SUMIF(A1:A3,">15")',20],['COUNTIF(A1:A3,"a*")',1],['MATCH(20,A1:A3,0)',2],['INDEX(A1:A3,2)',20],['C1+1',13],['SUM(C1)',0],['SUBTOTAL(9,A1:A2)',30],['CEILING(2.1,0.5)',2.5],['MOD(-3,2)',1],['"a"="A"',true],['STDEV(A1:A2)','EXC:Unsupported']];
const bad=F.filter(([f,e])=>{const v=ev(f);return !(JSON.stringify(v)===JSON.stringify(e)||(typeof e==='number'&&typeof v==='number'&&Math.abs(v-e)<1e-9));});
console.log('1) formules :',F.length-bad.length,'/',F.length,bad.length?JSON.stringify(bad.map(([f])=>f+' → '+JSON.stringify(ev(f)))):'');C.c1=!bad.length;
/* 2) formats à la française */
const ACC='_-* #,##0.00\\ "€"_-;\\-* #,##0.00\\ "€"_-;_-* "-"??\\ "€"_-;_-@_-';
const FM=[[1240,'#,##0.00\\ "€"','1 240,00 €'],[1240.5,ACC,' 1 240,50 € '],[0,ACC,' -   € '],[-5,ACC,'-5,00 € '],[0.125,'0.0%','12,5%'],[1/3,'General','0,333333333'],[1e12,'General','1E+12'],[1.005,'0.00','1,01'],[46309,'dd/mm/yyyy','14/10/2026'],[46309,'d mmmm yyyy','14 octobre 2026'],[1234567,'#,##0,"k"','1 235k'],[42,'[$€-40C] #,##0','€ 42'],[3,'00','03'],[600,'#,##0.00','600,00']];
const badF=FM.filter(([v,c,e])=>NB(X.fmtValue(v,c).t)!==e);console.log('2) formats :',FM.length-badF.length,'/',FM.length,badF.length?JSON.stringify(badF.map(([v,c])=>v+' '+c+' → '+NB(X.fmtValue(v,c).t))):'');C.c2=!badF.length;
/* 3) saisie : nombres à la française, pourcentage, formule française → anglaise (stockée comme dans le fichier) */
const P=[['1 240,50',{v:1240.5}],['12,5 %',{v:0.125}],['15 €',{v:15}],['8.07',{v:8.07}],["'0012",{v:'0012'}],['=somme(a1:a2)',{f:'SUM(A1:A2)'}],['=ARRONDI(D10*1,2;2)',{f:'ROUND(D10*1.2,2)'}],['=SI(A1>0;VRAI;"non")',{f:'IF(A1>0,TRUE,"non")'}],['=MAX(A1,2)',{f:'MAX(A1,2)'}],['=CONCAT(A1;"x")',{f:'_xlfn.CONCAT(A1,"x")'}]];
const badP=P.filter(([t,e])=>JSON.stringify(X.parseInput(t))!==JSON.stringify(e));const pct=X.parseInput('20','0%');
console.log('3) saisie :',P.length-badP.length,'/',P.length,badP.length?JSON.stringify(badP.map(([t])=>t+' → '+JSON.stringify(X.parseInput(t)))):'',' · « 20 » dans une cellule en % →',pct.v,' · barre de formule :',X.fxToFr('ROUND(SUBTOTAL(9,F10:F13)*1.2,2)'));
C.c3=!badP.length&&pct.v===0.2&&X.fxToFr('ROUND(SUBTOTAL(9,F10:F13)*1.2,2)')==='ARRONDI(SOUS.TOTAL(9;F10:F13)*1,2;2)';
/* 4) décalages : formule partagée, insertion sous la dernière ligne d'un chapitre (le sous-total s'agrandit), suppression, autre feuille */
const S4=[X.shiftFormula('D10*E10',3,0),X.shiftFormula('SUM($F$7:F7)+Récap!B2',1,1),X.shiftRowsFormula('SUBTOTAL(9,F10:F13)+F14+$F$20','DPGF','DPGF',14,1,{grow:true}),X.shiftRowsFormula('SUM(F7:F9)+F10','DPGF','DPGF',8,-1),X.shiftRowsFormula('F8*2','DPGF','DPGF',8,-1),X.shiftRowsFormula("'DPGF'!F9*2",'Récap','DPGF',5,2),X.shiftRowsFormula('B9*2','Récap','DPGF',5,2)];
console.log('4) décalages :',JSON.stringify(S4));C.c4=JSON.stringify(S4)===JSON.stringify(['D13*E13','SUM($F$7:G8)+Récap!C3','SUBTOTAL(9,F10:F14)+F15+$F$21','SUM(F7:F8)+F9','#REF!*2',"'DPGF'!F11*2",'B9*2']);
/* 5) lecture fidèle du DPGF fictif */
const buf=fs.readFileSync(path.join(HERE,'fixture_dpgf_xl.xlsx'));const book=await readBook(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));const S=book.sheets[0],R=book.sheets[1];
const st=book.styles;const xfA1=st.xfs[S.cells.get(cellKey(1,1)).s];const xfF10=st.xfs[S.cells.get(cellKey(10,6)).s];const nf=id=>st.numFmts[id]||X.BUILTIN_FMT[id];
const o5={sheets:book.sheets.map(s=>s.name),merges:S.merges.length,frozen:S.view.ys,hiddenG:S.cols.find(c=>c.min===7).hidden,wB:S.cols.find(c=>c.min===2).w,h1:S.rows.get(1).ht,a1:{b:st.fonts[xfA1.font].b,color:st.fonts[xfA1.font].color,fill:st.fills[xfA1.fill].bg,h:xfA1.h},fmtF10:nf(xfF10.nf),shared:S.cells.get(cellKey(11,6)).ft+':'+S.cells.get(cellKey(11,6)).si,names:book.names.map(n=>n.name+'='+n.ref),b10:R.cells.get(cellKey(10,2)).v};
console.log('5) lecture :',JSON.stringify(o5));
C.c5=o5.sheets.join()==='DPGF,Récap'&&o5.merges===5&&o5.frozen===4&&o5.hiddenG===true&&o5.wB===52&&o5.h1===28&&o5.a1.b&&o5.a1.color==='#FFFFFF'&&o5.a1.fill==='#1F3864'&&o5.a1.h==='center'&&/€/.test(o5.fmtF10)&&o5.shared==='shared:0'&&o5.names[0]==="TotalHT='Récap'!$B$7"&&o5.b10==='OK';
/* 6) écriture ciblée : une valeur, une formule partagée gardée (seule la valeur en cache change), une nouvelle formule, les autres lignes recopiées octet pour octet */
const ch=new Map([['E10',{k:'val',v:45.5}],['F10',{k:'cache',v:27300}],['F11',{k:'cache',v:0}],['E17',{k:'f',f:'ROUND(150/1.2,2)',v:125}],['H30',{k:'val',v:'nouveau'}]]);const x2=patchSheetXml(S.xml,ch);
const cellsOf=x=>Object.fromEntries([...x.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>.*?<\/c>)/g)].map(m=>[m[1],m[0]]));const A0=cellsOf(S.xml),A1=cellsOf(x2);const diff=Object.keys(Object.assign({},A0,A1)).filter(k=>A0[k]!==A1[k]).sort();
const rowsSame=[...S.xml.matchAll(/<row r="(\d+)"[\s\S]*?<\/row>/g)].filter(m=>![10,11,17].includes(+m[1])).every(m=>x2.includes(m[0]));
console.log('6) écriture ciblée :',JSON.stringify({diff,F10:A1.F10,F11:A1.F11,E17:A1.E17,H30:A1.H30,rowsSame}));
C.c6=diff.join()==='E10,E17,F10,H30'&&/<f t="shared" ref="F10:F13" si="0">D10\*E10<\/f><v>27300<\/v>/.test(A1.F10)&&A1.F11===A0.F11&&/<f>ROUND\(150\/1\.2,2\)<\/f><v>125<\/v>/.test(A1.E17)&&/inlineStr/.test(A1.H30)&&rowsSame&&/<row r="30">/.test(x2);
const badK=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(badK.length?'RESULTAT: ECHEC '+badK.join(','):'RESULTAT: TOUT VERT');
