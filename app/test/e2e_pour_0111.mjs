// e2e_pour_0111 — 01/11 soir (Ethan : « déclarer la soudure au nom de quelqu'un d'autre : le tuyauteur, le manchonneur ou le pelleur de l'équipe peuvent
//   prendre la photo de la soudure et dire c'est XX qui a soudé, et valider »)
//  p1  manchonneur, soudure à faire : bouton « Le soudeur a fini ? », « Soudé par » (les soudeurs, pas lui), appareil photo de l'étape ①
//  p2  valider sans choisir le soudeur → refusé (rien ne bouge)
//  p3  choisi Karim, photo prise (la fiche se redessine : le choix reste) → étape ① signée Karim, déclarée par Julien ; statut soudée ; événement « pour Karim »
//  p4  fiche : « décl. Julien R. » dans l'étape, « pour le compte du soudeur », historique « soudeur Karim B. » ; Julien peut annuler sa saisie (ses crédits)
//  p5  soudure suivante : Karim pré-choisi (on enchaîne les photos pour le même soudeur)
//  p6  soudeur : « Soudé par quelqu'un d'autre ? » replié, « Moi » par défaut → signée de lui, sans « déclarée par »
//  p7  chargée d'affaires (pas le droit) : ni « Soudé par », ni bouton « Le soudeur a fini ? »
//  p8  « Autre soudeur » écrit à la main → signée de ce nom
//  p9  droits : weld.step1.for chez tuyauteur, manchonneur, chauffeur d'engin, aide, intérimaire, chef ; pas chez la chargée d'affaires ni le visiteur
//  p10 zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:900,height:940}})).newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await W(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await W(800);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[210,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Pour le compte test');await page.click('#svOk');await W(800);
await page.click('#svGo');await W(1500);await page.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
const L=await page.evaluate(()=>Object.values(window.TRACE.lines).find(l=>!l.parent).id);
const as=async u=>{await page.selectOption('#roleSel',u);await W(300);};
const open=async i=>{await page.evaluate(({L,i})=>window.TRACE.openJoint(L,'A',i),{L,i});await W(400);};
const J1=i=>page.evaluate(({L,i})=>{const j=window.TRACE.lines[L].cond.A.joints[i];const ev=(j.events||[]).filter(e=>e.type==='soudee').pop();return {sst:!!j.sst,status:j.status,done:!!(j.steps&&j.steps[1]&&j.steps[1].done),by:j.steps&&j.steps[1]&&j.steps[1].by,decl:j.steps&&j.steps[1]&&j.steps[1].decl&&j.steps[1].decl.by,evPour:ev&&ev.data&&ev.data.pour,evBy:ev&&ev.byName};},{L,i});
const photo=i=>page.evaluate(({L,i,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[i];j.steps=j.steps||{};j.steps[1]=Object.assign({},j.steps[1]||{},{photos:[PNG]});},{L,i,PNG});
const ui=()=>page.evaluate(()=>{const s=document.getElementById('sheet');const sel=s.querySelector('#st1-by');const d=s.querySelector('details.st1For');
  return {go:!!s.querySelector('.st1ForGo'),sel:!!sel,val:sel?sel.value:null,opts:sel?[...sel.options].map(o=>o.value):[],cam:!!s.querySelector('input[data-stepph="1"]'),ok:(s.querySelector('#st1-ok')||{}).textContent||'',okBtn:!!s.querySelector('[data-stepok="1"]'),det:d?{open:d.open}:null,head1:((s.querySelectorAll('.dstep')[0]||{}).querySelector?.('summary .who')||{}).textContent||'',txt:s.textContent};});
const o={};
o.js=await page.evaluate(L=>window.TRACE.lines[L].cond.A.joints.map((j,i)=>j.sst?null:i).filter(x=>x!==null),L);
const [ja,jb,jc,jd,je]=o.js.slice(1,6);
// p1 — Julien (manchonneur)
await as('julien');await open(ja);o.p1=await ui();
C.p1=o.p1.go&&o.p1.sel&&o.p1.val===''&&o.p1.opts.includes('Karim B.')&&!o.p1.opts.includes('Julien R.')&&o.p1.opts.includes('__x')&&o.p1.cam&&/choisis d'abord le soudeur/.test(o.p1.ok);
// p2 — valider sans soudeur
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await W(400);o.p2=await J1(ja);
C.p2=o.p2.status==='a_souder'&&!o.p2.done;
// p3 — Karim choisi, photo, re-dessin, valider
await page.selectOption('#sheet #st1-by','Karim B.');await W(200);o.p3={lab:await page.evaluate(()=>(document.querySelector('#st1-ok')||{}).textContent||'')};
await photo(ja);await open(ja);o.p3.keep=await page.evaluate(()=>(document.querySelector('#sheet #st1-by')||{}).value);
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await W(600);o.p3.j=await J1(ja);
C.p3=/soudée par Karim B\./.test(o.p3.lab)&&o.p3.keep==='Karim B.'&&o.p3.j.done&&o.p3.j.status==='soudee'&&o.p3.j.by==='Karim B.'&&o.p3.j.decl==='Julien R.'&&o.p3.j.evPour==='Karim B.'&&o.p3.j.evBy==='Julien R.';
// p4 — ce que montre la fiche
await open(ja);o.p4=await ui();o.p4.undo=await page.evaluate(()=>!!document.querySelector('#sheet [data-stepundo="1"]'));
C.p4=/décl\. Julien R\./.test(o.p4.head1)&&/pour le compte du soudeur/.test(o.p4.txt)&&/soudeur Karim B\./.test(o.p4.txt)&&o.p4.undo;
// p5 — soudure suivante : Karim pré-choisi
await open(jb);o.p5=await ui();
C.p5=o.p5.val==='Karim B.'&&/soudée par Karim B\./.test(o.p5.ok);
// p6 — Karim (soudeur) : replié, « Moi »
await as('karim');await open(jc);o.p6=await ui();await photo(jc);await open(jc);await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await W(600);o.p6.j=await J1(jc);
C.p6=!!o.p6.det&&o.p6.det.open===false&&o.p6.val===''&&/Karim B\./.test(o.p6.ok)&&o.p6.j.done&&o.p6.j.by==='Karim B.'&&!o.p6.j.decl&&!o.p6.j.evPour;
// p7 — Sophie (chargée d'affaires)
await as('sophie');await open(jd);o.p7=await ui();
C.p7=!o.p7.sel&&!o.p7.go; /* elle garde « corriger une fiche » (weld.admin) : valider à SON nom reste possible, pas pour le compte d'un soudeur */
// p8 — Julien, autre soudeur écrit à la main
await as('julien');await open(je);await page.selectOption('#sheet #st1-by','__x');await W(150);await page.fill('#sheet #st1-byx','Paul Martin');await W(150);
o.p8={lab:await page.evaluate(()=>(document.querySelector('#st1-ok')||{}).textContent||'')};await photo(je);await open(je);o.p8.keep=await page.evaluate(()=>({v:(document.querySelector('#sheet #st1-by')||{}).value,x:(document.querySelector('#sheet #st1-byx')||{}).value}));
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await W(600);o.p8.j=await J1(je);
C.p8=/Paul Martin/.test(o.p8.lab)&&o.p8.keep.v==='__x'&&o.p8.keep.x==='Paul Martin'&&o.p8.j.by==='Paul Martin'&&o.p8.j.decl==='Julien R.';
// p9 — droits par poste
o.p9=await page.evaluate(()=>{const Ac=window.TRACE.acces;const R=(poste,extra={})=>Ac.rights({poste,type:'salarie',rights:{},active:true,...extra})['weld.step1.for'];
  return {tuy:R('tuyauteur'),man:R('manchonneur'),pel:R('chauffeur_engin'),aide:R('autre'),sou:R('soudeur'),chef:R('chef'),inter:R('manchonneur',{type:'interim'}),ca:R('charge_affaires'),vis:R('visiteur'),mag:R('referent_magasin')};});
C.p9=o.p9.tuy&&o.p9.man&&o.p9.pel&&o.p9.aide&&o.p9.sou&&o.p9.chef&&o.p9.inter&&!o.p9.ca&&!o.p9.vis&&!o.p9.mag;
console.log("mesures :",J(o).slice(0,4000));console.log("p7",J({sel:o.p7.sel,okBtn:o.p7.okBtn,go:o.p7.go,opts:o.p7.opts}));
await b.close();C.p10=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
