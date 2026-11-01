// e2e_stk_0111 — 01/11 soir (Ethan, Stockage : « retravailler le visuel des zones posées, quitte à modéliser les pièces : en fonction de ce qu'il y a sur la zone,
//   le visuel 3D des pièces stockées — juste le carré, ce n'est pas beau »)
//  s1  plan : chaque zone garde UN rectangle tapable (data-stkz) ; dessus, les barres en tas (une par barre en stock, les attendues en fantôme), les palettes par type
//  s2  textes (DN · n barres, ×n) quand la zone est grande à l'écran ; zone minuscule à l'écran : la dalle seule (lisible, rapide)
//  s3  toucher la zone au milieu des barres = toucher la zone (le dessin ne capte rien) ; zone tournée : le dessin tourne avec
//  s4  une prise de 2 barres → 2 barres de moins dessinées ; tout pris → plus de barre, la dalle reste
//  s5  onglet Stockage : une vignette par zone (avec ses propres dégradés), carte d'ensemble avec ses dégradés
//  s6  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);const T=(fn,arg)=>page.evaluate(fn,arg);
await page.goto(BASE+'/traceur.html');await W(500);await T(()=>localStorage.clear());await page.reload();await W(600);
await T(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Stock 3D');await page.click('#svOk');await W(700);
await page.click('#svGo');await W(1500);await page.selectOption('#roleSel','ethan');await W(300);await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await T(()=>{const X=window.TRACE;const key=l=>[l.kind,l.dn||'',l.dn2||'',l.gaine||'',l.kind==='pipe'?(l.len||12):'',l.kind==='bend'?(l.angle||90):''].join(':');let n=0;
  const L=(zone,o)=>Object.assign({id:'LT'+(++n),zone,label:o.label||o.kind,qty:o.qty},o,{key:key(o)});
  X.net.stock={zones:[{id:'Z1',name:'Bord de fouille',x:30,y:70,w:13,h:3,rot:0,status:'ok'},{id:'Z2',name:'Base vie',x:95,y:72,w:6,h:4,rot:20,status:'ok'},{id:'Z3',name:'Camion jeudi',x:30,y:85,w:13,h:3,rot:0,status:'prevu'}],
   lots:[L('Z1',{kind:'pipe',dn:200,gaine:315,len:12,qty:14,label:'Barre 12 m DN200'}),L('Z1',{kind:'pipe',dn:100,gaine:200,len:12,qty:6,label:'Barre 12 m DN100'}),L('Z1',{kind:'pipe',dn:100,gaine:200,len:12,qty:4,pend:true,label:'Barre 12 m DN100'}),
     L('Z1',{kind:'sleeve',dn:200,gaine:315,qty:12,label:'Manchon Ø315'}),L('Z1',{kind:'pu',dn:200,qty:12,label:'Mousse PU DN200'}),L('Z1',{kind:'bend',dn:200,angle:90,qty:3,label:'Coude 90° DN200'}),
     L('Z2',{kind:'sleeve',dn:100,gaine:200,qty:20,label:'Manchon Ø200'}),L('Z2',{kind:'tee',dn:200,dn2:100,qty:2,label:'Té DN200/100'}),L('Z2',{kind:'valve',dn:100,qty:1,label:'Vanne DN100'}),
     L('Z3',{kind:'pipe',dn:200,gaine:315,len:12,qty:8,pend:true,label:'Barre 12 m DN200'})],takes:[],livs:[],moves:[]};
  X.state.tab='plan';X.renderAll();X.centerOn(30,72,30);});await W(500);
const art=()=>T(()=>{const g=document.getElementById('stockG');const zs=[...g.querySelectorAll('[data-stkz]')].map(r=>{const G=r.parentNode;return {id:r.dataset.stkz,p:G.querySelectorAll('[data-a="p"]').length,pg:G.querySelectorAll('[data-a="pg"]').length,pal:[...G.querySelectorAll('[data-a="pal"]')].map(x=>x.dataset.t).sort(),txt:G.textContent.replace(/\s+/g,' ').trim(),rot:G.getAttribute('transform')};});return {nz:g.querySelectorAll('[data-stkz]').length,zs,defs:!!document.querySelector('#svg defs #stkCyl')};});
const o={};
// ── s1 / s2 (zoom 30 : zone de 13 m ≈ 390 px)
o.s1=await art();{const z=id=>o.s1.zs.find(x=>x.id===id)||{};const Z1=z('Z1'),Z2=z('Z2'),Z3=z('Z3');
 C.s1=o.s1.defs&&o.s1.nz===3&&Z1.p===20&&Z1.pg===4&&J(Z1.pal)==='["coudes","manchons","mousse"]'&&Z2.p===0&&J(Z2.pal)==='["manchons","tés","vannes"]'&&Z3.p===0&&Z3.pg===8
   &&/DN200 · 14 barres/.test(Z1.txt)&&/DN100 · 6 barres \+ 4 att\./.test(Z1.txt)&&/×12/.test(Z1.txt)&&/×3/.test(Z1.txt);}
await T(()=>{const X=window.TRACE;X.state.view.k=2;X.centerOn(60,70);});await W(400);o.s2=await art();{const Z1=o.s2.zs.find(x=>x.id==='Z1')||{};C.s2=C.s1&&o.s2.nz===3&&Z1.p===0&&Z1.pg===0&&!/DN200/.test(Z1.txt);}
await T(()=>{const X=window.TRACE;X.state.view.k=8;X.centerOn(60,70);});await W(400);o.s2b=await art();{const Z1=o.s2b.zs.find(x=>x.id==='Z1')||{};C.s2=C.s2&&Z1.p===20&&!/DN200/.test(Z1.txt);} /* 13 m × 8 = 104 px : dessin sans textes */
// ── s3 : toucher au milieu des barres = la zone ; zone tournée
await T(()=>{const X=window.TRACE;X.state.view.k=30;X.centerOn(30,70);});await W(400);
o.s3=await T(()=>{const X=window.TRACE;const v=X.state.view;const r=document.getElementById('canvas').getBoundingClientRect();const x=r.left+30*v.k+v.tx,y=r.top+69.6*v.k+v.ty;const e=document.elementFromPoint(x,y);const t=e&&e.closest('[data-stkz]');
  const Z2=document.querySelector('#stockG [data-stkz="Z2"]').parentNode;return {hit:t?t.dataset.stkz:(e?e.tagName+'.'+(e.getAttribute('data-a')||''):null),rot:/rotate\(20\)/.test(Z2.getAttribute('transform')),inRot:Z2.querySelectorAll('[data-a="pal"]').length};});
C.s3=o.s3.hit==='Z1'&&o.s3.rot&&o.s3.inRot===3;
// ── s4 : prises
await T(()=>{const X=window.TRACE;X.net.stock.takes.push({id:'TK1',zone:'Z1',key:'pipe:200',label:'Barre DN200',qty:2,at:new Date().toISOString()});X.renderAll();});await W(300);o.s4={a:(await art()).zs.find(x=>x.id==='Z1')};
await T(()=>{const X=window.TRACE;X.net.stock.takes.push({id:'TK2',zone:'Z1',key:'pipe:200',label:'Barre DN200',qty:12,at:new Date().toISOString()},{id:'TK3',zone:'Z1',key:'pipe:100',label:'Barre DN100',qty:6,at:new Date().toISOString()});X.renderAll();});await W(300);o.s4.b=(await art()).zs.find(x=>x.id==='Z1');
C.s4=o.s4.a.p===18&&/DN200 · 12 barres/.test(o.s4.a.txt)&&o.s4.b.p===0&&o.s4.b.pg===4&&o.s4.b.pal.length===3;
// ── s5 : onglet Stockage
await T(()=>{const X=window.TRACE;X.state.tab='stock';X.renderAll();});await W(900);
o.s5=await T(()=>({thumbs:document.querySelectorAll('#stock .stkThumb').length,ownDefs:[...document.querySelectorAll('#stock .stkThumb')].every(s=>!!s.querySelector('defs linearGradient[id$="Cyl"]')),ids:[...document.querySelectorAll('#stock .stkThumb defs linearGradient[id$="Cyl"]')].map(g=>g.id),
  palIn:[...document.querySelectorAll('#stock .stkThumb')].map(s=>s.querySelectorAll('[data-a="pal"]').length),map:!!document.querySelector('#stkMap svg defs #stmCyl')}));
C.s5=o.s5.thumbs===3&&o.s5.ownDefs&&new Set(o.s5.ids).size===3&&o.s5.palIn.reduce((a,b)=>a+b,0)>=6&&o.s5.map;
console.log('mesures :',J(o).slice(0,3000));
await b.close();C.s6=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
