// e2e_fz_0111 — 01/11 soir (Ethan, Fourniture : « la liste écarts au-delà de la commande, si on met tout à classer ça fait des grandes listes ; plutôt un menu simple
//   qui te dit les variations et tu choisis commande complémentaire, bien informé le fournisseur, que ça te mette en alerte » ; « zone à livrer : il faut pouvoir faire
//   plusieurs cercles, plusieurs zones qui doivent arriver ensemble — plusieurs petites antennes pourraient être dans le même camion »)
//  v1  commande importée (2 barres DN200 de moins que le besoin, 7 barres DN100 de moins, 3 coudes DN200 commandés inutiles) : UNE carte « Variations », cochées d'office,
//      en plus ET en moins ; bandeau d'alerte « à traiter » ; pastille sur l'onglet Fourniture = nombre de variations
//  v2  1 barre DN200 seulement (quantité réglée), décochées les autres → « 📨 Fournisseur informé » : 1 décision info, il en reste 1 à traiter, rien à commander pour celle-là
//  v3  la barre DN200 restante → « 📦 Commande complémentaire » : brouillon de commande complémentaire (1 barre), plus rien à traiter sur la ligne
//  v4  les coudes en moins → « Commande complémentaire » refusé (ce n'est pas une pièce en plus) ; « Fournisseur informé » : à ne pas livrer, plus d'alerte en moins
//  v5  « 📋 Copier le message » : en plus (quantité réglée à 5) / en moins, prêt à coller
//  v6  décisions repliées dessous ; ↺ sur les coudes → la variation revient ; la pastille suit
//  z1  zone en DEUX parties (deux cercles, une seule livraison) : « Entourer une autre partie » depuis la fenêtre « Nouvelle zone » → 1 zone, 2 contours
//  z2  la liste de la zone compte les deux parties (DN200 + DN100) ; un camion porte les deux antennes
//  z3  une 3e partie depuis la fiche de la zone ; ✕ pendant la pose → retour à la fiche
//  z4  ✏️ partie 2 : le contour modifié est enregistré à sa place, le contour principal intact ; ✕ partie 3
//  z5  plan : un pointillé par partie, une étiquette « 2 parties » ; mini-plan de l'onglet : 2 contours
//  z6  rechargement : la zone garde ses parties, les décisions restent
//  e1  zéro erreur de page
import { chromium } from 'playwright';
import {TRAME_COLS} from '../src/trame.js';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await b.newContext({viewport:{width:900,height:940},permissions:['clipboard-read','clipboard-write']});const page=await ctx.newPage();
page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);const T=(fn,arg)=>page.evaluate(fn,arg);
await page.clock.install({time:new Date(2026,9,13,8,30,0)});
await page.goto(BASE+'/traceur.html');await W(600);await T(()=>localStorage.clear());await page.reload();await W(700);
await T(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:100,bar:12,pts:[[0,100],[84,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Fourniture variations');await page.click('#svOk');await W(800);
await page.click('#svGo');await W(1500);await page.selectOption('#roleSel','ethan');await W(300);await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await T(async()=>{document.querySelector('#facets [data-facet=tech]').click();await new Promise(r=>setTimeout(r,200));document.querySelector('#tabbar [data-tab="fourniture"]').click();await new Promise(r=>setTimeout(r,300));});
const o={};
// commande : Barre DN200 ×18, Barre DN100 84 ml (7 barres), manchons / mousse / kits, + 3 coudes DN200 dont le tracé n'a pas besoin
const TSV=[TRAME_COLS.join('\t'),['Barre','200','','','12','18','u','','',''].join('\t'),['Barre','100','','','12','84','ml','','',''].join('\t'),['Manchon','200','','','','22','u','315','',''].join('\t'),['Mousse PU','200','','','','22','u','315','',''].join('\t'),['Kit fin de ligne','200','','','','2','u','','',''].join('\t'),['Coude','200','','90','','3','u','','',''].join('\t')].join('\n');
await T(async P=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#fourniture [data-fa=cmd][data-v=""]').click();await w(250);document.querySelector('#modal [data-iqm="paste"]').click();await w(150);document.getElementById('iq-paste').value=P;document.getElementById('iq-read').click();await w(300);document.getElementById('fc-ok').click();await w(400);},TSV);
const R=()=>T(()=>{const X=window.TRACE.fourniture.compute();const by={};X.rows.forEach(r=>{by[r.label]={k:r.k,aQual:r.aQual,aQualM:r.aQualM,mInfo:r.mInfo,moins:r.moins,inclus:r.inclus,compl:r.compl,aCmd:r.aCmd,cde:r.cde,besoin:r.besoin};});return {by,tot:{aQual:X.tot.aQual,aQualM:X.tot.aQualM,n:X.tot.nAQual+X.tot.nAQualM,compl:X.tot.compl}};});
const card=()=>T(()=>{const c=document.querySelector('#fourniture details[data-fzui=ecarts]');if(!c)return null;return {open:c.open,todo:c.classList.contains('todo'),rows:[...c.querySelectorAll('.fz-var')].map(l=>{const cb=l.querySelector('input[data-fzv]');const qi=l.querySelector('input[data-fzvq]');return {t:(l.querySelector('.lb')||{}).textContent,key:cb&&cb.dataset.fzv,on:!!(cb&&cb.checked),neg:l.classList.contains('m'),qv:qi?+qi.value:null,n:(l.querySelector('.n')||{}).textContent.replace(/\s+/g,'')};}),
  info:!!c.querySelector('[data-fa=decm][data-v=info]'),compl:!!c.querySelector('[data-fa=decm][data-v=compl]'),msg:!!c.querySelector('[data-fa=vmsg]'),dec:c.querySelectorAll('[data-fzdec] .eq-row').length,decOpen:!!(c.querySelector('details[data-fzdec]')||{}).open,sum:(c.querySelector('summary')||{}).textContent.replace(/\s+/g,' ').trim()};});
const badge=async()=>{await W(1500);return T(()=>{const i=document.querySelector('#tabbar [data-tab="fourniture"] .fzBadge');return i?+i.textContent:0;});};
// coche exactement ces lignes (libellé → quantité, null = toute la variation ; préfixe « − » = la variation en moins)
const pick=m=>T(m=>{document.querySelectorAll('#fourniture .fz-var').forEach(l=>{const cb=l.querySelector('input[data-fzv]');const lab=(l.querySelector('.lb')||{}).textContent;const key=(l.classList.contains('m')?'−':'')+lab;const want=Object.prototype.hasOwnProperty.call(m,key);if(cb.checked!==want)cb.click();
  const qi=l.querySelector('input[data-fzvq]');if(want&&qi&&m[key]){qi.value=m[key];qi.dispatchEvent(new Event('change',{bubbles:true}));}});},m);
const act=async v=>{await T(v=>document.querySelector(`#fourniture [data-fa=decm][data-v="${v}"]`).click(),v);await W(350);};
const toastTxt=()=>T(()=>(document.getElementById('toast')||{}).textContent||'');
// ── v1
o.r1=await R();o.v1={card:await card(),banner:await T(()=>(document.querySelector('#fourniture .err')||{}).textContent||''),badge:await badge()};
{const by=o.r1.by;const c=o.v1.card;const want=Object.values(by).filter(r=>r.aQual>0).length+Object.values(by).filter(r=>r.aQualM>0).length;
 C.v1=!!c&&c.open&&c.todo&&c.rows.length===want&&want>=3&&c.rows.every(r=>r.on)&&by['Barre DN200'].aQual===2&&by['Barre DN100'].aQual===7&&!!by['Coude 90° DN200']&&by['Coude 90° DN200'].aQualM===3
  &&c.rows.some(r=>r.t==='Coude 90° DN200'&&r.neg&&/−/.test(r.n))&&c.rows.some(r=>r.t==='Barre DN200'&&!r.neg&&r.qv===2)&&c.info&&c.compl&&c.msg&&/Variations par rapport à la commande — à traiter/.test(o.v1.banner)&&o.v1.badge===want;}
// ── v2 : 1 barre DN200 → fournisseur informé
await pick({'Barre DN200':1});o.v2={sel:(await card()).rows.filter(r=>r.on).map(r=>r.t+':'+r.qv)};await act('info');o.v2.toast=await toastTxt();
o.v2.r=await R();o.v2.dec=await T(()=>window.TRACE.net.fourniture.dec.filter(d=>!d.deleted).map(d=>d.etat+':'+d.qty+':'+d.label+(d.neg?':neg':'')));o.v2.card=await card();
{const b2=o.v2.r.by['Barre DN200'];C.v2=J(o.v2.sel)==='["Barre DN200:1"]'&&J(o.v2.dec)==='["info:1:Barre DN200"]'&&b2.aQual===1&&b2.inclus===1&&b2.aCmd===1&&/fournisseur informé/.test(o.v2.toast)
  &&o.v2.card.rows.some(r=>r.t==='Barre DN200'&&r.qv===null&&/\+1/.test(r.n))&&o.v2.card.dec===1&&!o.v2.card.decOpen;} /* il reste 1 : plus de champ quantité ; décisions repliées */
// ── v3 : la barre DN200 restante → commande complémentaire
await pick({'Barre DN200':null});await act('compl');o.v3={r:await R(),compl:await T(()=>{const c=document.querySelector('#fourniture details[data-fzui=compl]');return c?[...c.querySelectorAll('table.fz-compl tr')].slice(1).map(tr=>tr.textContent.replace(/\s+/g,' ').trim()):null;}),card:await card()};
{const b3=o.v3.r.by['Barre DN200'];C.v3=b3.aQual===0&&b3.compl===1&&b3.inclus===1&&J(o.v3.compl)==='["Barre DN2001"]'&&!o.v3.card.rows.some(r=>r.t==='Barre DN200');}
// ── v4 : les coudes en moins
await pick({'−Coude 90° DN200':null});await act('compl');o.v4={toast:await toastTxt(),n0:await T(()=>window.TRACE.net.fourniture.dec.filter(d=>!d.deleted).length)};
await act('info');o.v4.r=await R();o.v4.dec=await T(()=>window.TRACE.net.fourniture.dec.filter(d=>!d.deleted&&d.neg).map(d=>d.etat+':'+d.qty+':'+d.label));o.v4.card=await card();
{const c4=o.v4.r.by['Coude 90° DN200'];C.v4=/EN PLUS/.test(o.v4.toast)&&o.v4.n0===2&&J(o.v4.dec)==='["info:3:Coude 90° DN200"]'&&c4.aQualM===0&&c4.mInfo===3&&!o.v4.card.rows.some(r=>r.neg&&r.t==='Coude 90° DN200')&&o.v4.card.rows.some(r=>r.neg);} /* les manchons / mousses DN200 en trop restent à traiter */
// ── v5 : message pour le fournisseur (Barre DN100 réglée à 5)
await pick({'Barre DN100':5});await T(()=>document.querySelector('#fourniture [data-fa=vmsg]').click());await W(400);
o.v5={clip:await T(()=>navigator.clipboard.readText().catch(e=>'ERR '+e.message)),modal:await T(()=>{const t=document.querySelector('#modal.show textarea');return t?t.value:null;})};
{const m=o.v5.clip&&!/^ERR/.test(o.v5.clip)?o.v5.clip:(o.v5.modal||'');o.v5.msg=m.slice(0,400);C.v5=/^Bonjour,/.test(m)&&/En plus :\n- 5 × Barre DN100/.test(m)&&!/Coude/.test(m)&&/Fourniture variations/.test(m)&&/Ethan L\./.test(m);}
await T(()=>{const x=document.querySelector('#modal.show [data-close]');if(x)x.click();});await W(150);
// ── v6 : décisions repliées, ↺ sur les coudes
o.v6={b0:await badge()};await T(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const F=window.TRACE.net.fourniture;const d=F.dec.find(x=>x.neg&&!x.deleted);const det=document.querySelector('#fourniture details[data-fzdec]');det.open=true;await w(80);document.querySelector(`#fourniture [data-fa=decx][data-v="${d.id}"]`).click();await w(350);});
o.v6.r=await R();o.v6.card=await card();o.v6.b1=await badge();
C.v6=o.v6.r.by['Coude 90° DN200'].aQualM===3&&o.v6.card.rows.some(r=>r.neg&&r.t==='Coude 90° DN200')&&o.v6.b1===o.v6.b0+1&&o.v6.card.dec===2;
// ── z1 : zone en deux parties depuis « Nouvelle zone »
const tapAll=pts=>T(P=>{P.forEach(p=>window.TRACE.fourniture.tap(p[0],p[1]));},pts);
const P1=[[-6,40],[60,40],[60,60],[-6,60]],P2=[[-6,92],[40,92],[40,108],[-6,108]],P3=[[80,42],[115,42],[115,58],[80,58]];
await T(()=>document.querySelector('#fourniture [data-fa=lasso]').click());await W(250);await T(()=>window.TRACE.centerOn(40,75,3));await W(150);
await tapAll(P1);await page.click('#fzOk');await W(300);o.z1={m1:await T(()=>({h:(document.querySelector('#modal h3')||{}).textContent,more:!!document.getElementById('fzn-more')}))};
await T(()=>document.getElementById('fzn-more').click());await W(300);o.z1.pose=await T(()=>{const p=window.TRACE.state.fzPose;return {on:!!p,pend:(window.TRACE.state.fzNewParts||[]).length,msg:(document.getElementById('fzMsg')||{}).textContent,ov:document.querySelectorAll('#fzG polygon').length};});
await tapAll(P2);await page.click('#fzOk');await W(300);o.z1.m2=await T(()=>({h:(document.querySelector('#modal h3')||{}).textContent,ok:(document.querySelector('#modal .okbox')||{}).textContent||''}));
await T(()=>{document.getElementById('fzn-name').value='Zone AB';document.getElementById('fzn-date').value='2026-10-19';document.getElementById('fzn-ok').click();});await W(500);
o.z1.z=await T(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone AB');return z?{poly:z.poly.length,polys:(z.polys||[]).map(P=>P.length),p1:JSON.stringify(z.poly),p2:JSON.stringify(z.polys&&z.polys[0])}:null;});
o.z1.fiche=await T(()=>{const M=document.getElementById('modal');return {h:(M.querySelector('h3')||{}).textContent,parts:M.querySelectorAll('.fz-parts .eq-row').length,edit:!!document.getElementById('fz-edit'),add:!!document.getElementById('fz-addpart'),del:M.querySelectorAll('[data-fzpart^="del:"]').length};});
C.z1=/Nouvelle zone/.test(o.z1.m1.h||'')&&o.z1.m1.more&&o.z1.pose.on&&o.z1.pose.pend===1&&/Entoure/.test(o.z1.pose.msg||'')&&o.z1.pose.ov>=1&&/2 parties entourées/.test(o.z1.m2.ok)&&!!o.z1.z&&o.z1.z.poly===4&&J(o.z1.z.polys)==='[4]'
  &&o.z1.z.p1===J(P1)&&o.z1.z.p2===J(P2)&&/Zone AB/.test(o.z1.fiche.h||'')&&o.z1.fiche.parts===2&&o.z1.fiche.edit&&o.z1.fiche.add&&o.z1.fiche.del===1;
// ── z2 : la liste de la zone = les deux parties ; un camion pour les deux antennes
o.z2=await T(()=>{const X=window.TRACE.fourniture.compute();const Z=X.zones.find(z=>z.z.name==='Zone AB');const lab=Z.lines.map(x=>x.label);const t1=Z.trucks[0];return {lab,dn200:lab.some(l=>/Barre DN200/.test(l)),dn100:lab.some(l=>/Barre DN100/.test(l)),rem:Z.tot.rem,trucks:Z.trucks.length,t1:t1?t1.lines.map(y=>y.label):[],row:(document.querySelector('#fourniture .fz-zrow')||{}).textContent||''};});
C.z2=o.z2.dn200&&o.z2.dn100&&o.z2.rem>0&&o.z2.trucks>=1&&o.z2.t1.some(l=>/DN200/.test(l))&&o.z2.t1.some(l=>/DN100/.test(l));
// ── z3 : 3e partie depuis la fiche ; ✕ pendant la pose → retour à la fiche
await T(()=>document.getElementById('fz-addpart').click());await W(300);o.z3={pose:await T(()=>{const p=window.TRACE.state.fzPose;return p?{addTo:!!p.addTo,msg:(document.getElementById('fzMsg')||{}).textContent}:null;})};
await page.click('#fzCancel');await W(350);o.z3.back=await T(()=>({pose:!!window.TRACE.state.fzPose,h:(document.querySelector('#modal.show h3')||{}).textContent||''}));
await T(()=>document.getElementById('fz-addpart').click());await W(300);await tapAll(P3);await page.click('#fzOk');await W(400);
o.z3.z=await T(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone AB');return {polys:(z.polys||[]).length,p3:JSON.stringify(z.polys&&z.polys[1]),parts:document.querySelectorAll('#modal .fz-parts .eq-row').length};});
C.z3=!!o.z3.pose&&o.z3.pose.addTo&&/Autre partie de Zone AB/.test(o.z3.pose.msg||'')&&!o.z3.back.pose&&/Zone AB/.test(o.z3.back.h)&&o.z3.z.polys===2&&o.z3.z.p3===J(P3)&&o.z3.z.parts===3;
// ── z4 : ✏️ partie 2 (un point de plus), ✕ partie 3
await T(()=>document.querySelector('#modal [data-fzpart="edit:1"]').click());await W(300);o.z4={pose:await T(()=>{const p=window.TRACE.state.fzPose;return p?{part:p.part,n:p.pts.length,edit:!!p.edit,msg:(document.getElementById('fzMsg')||{}).textContent,ok:(document.getElementById('fzOk')||{}).textContent}:null;})};
await T(()=>window.TRACE.fourniture.tap(20,125));await W(150);await page.click('#fzOk');await W(400);
o.z4.z=await T(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone AB');return {p1:JSON.stringify(z.poly),p2:(z.polys[0]||[]).length,has:JSON.stringify(z.polys[0]).includes('[20,125]'),polys:z.polys.length};});
await T(()=>document.querySelector('#modal [data-fzpart="del:2"]').click());await W(400);
o.z4.del=await T(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone AB');return {polys:z.polys.length,parts:document.querySelectorAll('#modal .fz-parts .eq-row').length,p2:JSON.stringify(z.polys[0]).includes('[20,125]')};});
C.z4=!!o.z4.pose&&o.z4.pose.part===1&&o.z4.pose.n===4&&o.z4.pose.edit&&/partie 2/.test(o.z4.pose.msg||'')&&/Enregistrer/.test(o.z4.pose.ok||'')&&o.z4.z.p1===J(P1)&&o.z4.z.p2===5&&o.z4.z.has&&o.z4.z.polys===2
  &&o.z4.del.polys===1&&o.z4.del.parts===2&&o.z4.del.p2;
// ── z5 : plan + mini-plan
await T(()=>{const x=document.querySelector('#modal.show [data-close]');if(x)x.click();const X=window.TRACE;X.state.tab='plan';X.renderAll();});await W(400);
o.z5={plan:await T(()=>({poly:document.querySelectorAll('#fzG polygon').length,lab:[...document.querySelectorAll('#fzG text')].map(t=>t.textContent)}))};
await T(()=>{const X=window.TRACE;X.state.tab='fourniture';X.renderAll();});await W(300);o.z5.mini=await T(()=>document.querySelectorAll('#fourniture svg.fz-mini polygon[data-fzz]').length);
C.z5=o.z5.plan.poly===2&&o.z5.plan.lab.some(t=>/Zone AB/.test(t)&&/2 parties/.test(t))&&o.z5.mini===2;
// ── z6 : rechargement
const siteId=await T(()=>window.TRACE.state.siteId);await page.reload();await W(1500);
for(let i=0;i<6;i++){await T(id=>window.TRACE.go(id),siteId);try{await page.waitForFunction(()=>window.TRACE.state.siteId&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,null,{timeout:4000});break;}catch(e){}}
await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
o.z6dbg=await T(()=>({site:window.TRACE.state.siteId,name:window.TRACE.net&&window.TRACE.net.name,id:window.TRACE.net&&window.TRACE.net.id,keys:Object.keys(window.TRACE.net||{}).slice(0,40)}));console.log('z6dbg',J(o.z6dbg));
o.z6=await T(()=>{const F=window.TRACE.net.fourniture||{};const z=F&&F.zones.find(x=>x.name==='Zone AB');return {polys:z?(z.polys||[]).length:-1,poly:z?z.poly.length:-1,dec:(F.dec||[]).filter(d=>!d.deleted).map(d=>d.etat+':'+d.qty)};});
C.z6=o.z6.poly===4&&o.z6.polys===1&&J(o.z6.dec)==='["info:1","compl:1"]';
console.log('mesures :',J(o).slice(0,3000));console.log('v4',J({toast:o.v4.toast,n0:o.v4.n0,dec:o.v4.dec}),'v6',J({b0:o.v6.b0,b1:o.v6.b1,dec:o.v6.card.dec,rows:o.v6.card.rows.map(r=>r.t+(r.neg?'-':'+'))}));
await b.close();C.e1=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
