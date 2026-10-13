// CHIFFRAGE « REMPLACE LE CLASSEUR » (13/10/2026, retours d'Ethan) :
// 1) Commerce → ⚙ Base de prix SCR (sans ouvrir d'affaire) : import, modification par qui a le droit « Base de prix SCR : modifier » (Ethan, administrateur),
//    consultation seule pour les autres (Sophie, bureau : champs grisés, pas d'import, une saisie forcée est refusée) ;
// 2) dans une zone, le panier d'une SST se déplie (MO + fournitures) : PU modifié pour CE chiffrage → alerte « modifié » + PU de base affiché ; ↺ revient
//    à la base ; la base n'a pas bougé ; purges sans purgeur auto : lignes purgeur / tés barrées ;
// 3) onglet Installations (2 zones, même pelle) : activation → locations reprises des zones, les zones ne les comptent plus (bandeau) ; 2 pelles,
//    jours saisis, A/R ; ventilation au ml / à parts égales / en % ; récap : colonne Installations + ligne ventilée, total = zones + installations ;
// 4) zone repérable (bandeau « Zone 1 / 2 », intitulé) ; récap des quantités ; charge et équipes (2 équipes de soudure → 2 pelles ; 3 phases → 3 A/R) ;
// 5) le DPGF voit les installations comme une source.
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(280);};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(220);};
const toast=()=>page.evaluate(()=>{const t=document.querySelector('#toast,.toast');return t?t.textContent:'';});
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-18'));
const as=async who=>{await page.evaluate(async w=>{const T=window.TRACE;T.state.userId=w;T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));},who);await wait(200);};
// ── 1) la base de prix sans affaire : Ethan importe et modifie ; Sophie consulte
await as('ethan');await click('seg|prix');
let out={empty:await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {msg:/Pas encore de base de prix/.test(t),imp:!!document.querySelector('#eq-app input[data-afprix]'),can:/Tu peux la modifier/.test(t)};})};
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await click('seg|prix');await click('chbase|mo');
out.base=await page.evaluate(()=>({stats:[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).slice(0,4),taux:(document.querySelector('#eq-app [data-afx="b§mo§postes§0§taux"]')||{}).value,dis:(document.querySelector('#eq-app [data-afx="b§mo§postes§0§taux"]')||{}).disabled}));
await chg('#eq-app [data-afx="b§mo§postes§0§taux"]','72');out.edited=await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');return {taux:b.mo.postes[0].taux,by:b.editedBy};});
await click('prixview|paniers');out.pan=await page.evaluate(()=>/PURGE|VIDANGE|SST/.test(document.getElementById('eq-app').textContent));
await as('sophie');await click('seg|prix');await click('prixview|base');await click('chbase|mo');
out.sophie=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');const i=document.querySelector('#eq-app [data-afx="b§mo§postes§0§taux"]');return {ro:/Consultation/.test(t),imp:!!document.querySelector('#eq-app input[data-afprix]'),dis:i?i.disabled:null};});
await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="b§mo§postes§0§taux"]');i.disabled=false;i.value='99';i.dispatchEvent(new Event('change',{bubbles:true}));});await wait(300);
out.sophie.after=await page.evaluate(()=>window.TRACE.reg.get('prix','base').mo.postes[0].taux);out.sophie.toast=await toast();
console.log('1) base de prix :',JSON.stringify(out));
C.c1=out.empty.msg&&out.empty.imp&&out.empty.can&&out.base.stats[0].startsWith('V99')&&out.base.taux==='70'&&!out.base.dis&&out.edited.taux===72&&out.edited.by==='Ethan L.'&&out.pan&&out.sophie.ro&&!out.sophie.imp&&out.sophie.dis===true&&out.sophie.after===72&&/Réservé/.test(out.sophie.toast);
// remettre le taux (la suite compte avec la base d'origine)
await as('ethan');await click('seg|prix');await click('chbase|mo');await chg('#eq-app [data-afx="b§mo§postes§0§taux"]','70');
// ── 2) une affaire, une zone : panier SST déplié, PU modifié pour CE chiffrage
await page.evaluate(async()=>{document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]').click();await new Promise(x=>setTimeout(x,200));document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-18';document.getElementById('afn-nom').value='Deux antennes';document.getElementById('afn-client').value='IDEX';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,250));});
await click('chetudeadd|');await chg('#eq-app [data-afx="e§nom"]','Antenne Lilas');await chg('#eq-app [data-afx="e§desc"]','rue des Lilas · DPGF onglet 2');
await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-13');await chg('#eq-app [data-afx="e§chantier.pelle"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','150');await chg('#eq-app [data-afx="e§dn.0.ml"]','600');
await click('chfold|sst');await click('chadd|sst');await chg('#eq-app [data-afx="e§sst.0.type"]','sst_vannes_bs_pn25');await chg('#eq-app [data-afx="e§sst.0.dn"]','80');await chg('#eq-app [data-afx="e§sst.0.paires"]','2');
const sstPU=()=>page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-18');return T.affaires.calc(a).etudes[0].r.detail.sst.rows[0].pu;});
out={pu0:await sstPU()};await click('chpdet|sst_vannes_bs_pn25|80|0');
out.det=await page.evaluate(()=>{const t=document.querySelector('#eq-app .ch-pdet.open');return t?{rows:[...t.querySelectorAll('table.ch-pdt tr')].slice(1).map(r=>r.cells[0].textContent.trim()),ph:(t.querySelector('[data-afx="eov§sst_vannes_bs_pn25§80§fo0§pu"]')||{}).placeholder}:null;});
await chg('#eq-app [data-afx="eov§sst_vannes_bs_pn25§80§fo0§pu"]','150');
out.mod=await page.evaluate(()=>{const t=document.querySelector('#eq-app .ch-pdet.open');return {tag:(t.querySelector('.ch-pdsum .eq-tag')||{}).textContent||'',base:(t.querySelector('.ch-base')||{}).textContent||'',row:!!document.querySelector('#eq-app .ch-bloc[data-bloc="sst"] td .eq-tag.warn')};});
out.pu1=await sstPU();out.over=await A().then(a=>a.chiffrage.etudes[0].over);out.baseUntouched=await page.evaluate(()=>!(window.TRACE.reg.get('prix','base').over||{}).sst_vannes_bs_pn25);
await click('chovz|sst_vannes_bs_pn25|80|fo0');out.pu2=await sstPU();out.overAfter=await A().then(a=>a.chiffrage.etudes[0].over);
await chg('#eq-app [data-afx="e§purges.paires"]','2');await click('chpdet|purge|32');
out.purge=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-pdet.open tr.ch-x td:first-child')].map(x=>x.textContent.trim().slice(0,30)));
console.log('2) panier déplié :',JSON.stringify(out));
const fo0=out.det&&+out.det.ph;
C.c2=out.det&&out.det.rows[0].startsWith('MO')&&out.det.rows.some(r=>/^Vanne BS/.test(r))&&out.det.rows.some(r=>/boîtiers Plexo/.test(r))&&fo0>0&&Math.abs(out.pu1-out.pu0-2*(150-fo0))<0.01&&/modifié · base/.test(out.mod.tag)&&/^base /.test(out.mod.base)&&out.mod.row&&out.over.sst_vannes_bs_pn25['80'].fo0.pu===150&&out.baseUntouched&&Math.abs(out.pu2-out.pu0)<0.01&&!(out.overAfter&&out.overAfter.sst_vannes_bs_pn25)&&out.purge.length===2&&/Purgeur/.test(out.purge.join());
// ── 3) deuxième zone, onglet Installations
await click('chetudeadd|');await chg('#eq-app [data-afx="e§nom"]','Antenne Roses');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-13');await chg('#eq-app [data-afx="e§chantier.pelle"]',true);
await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');await chg('#eq-app [data-afx="e§dn.0.ml"]','400');
const calc=()=>page.evaluate(()=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get('O2610-18'));const z=C.etudes.map(e=>Object.values(e.r.postes).reduce((s,p)=>s+p.achat,0));return {achat:C.achat,zones:z,cont:C.etudes.map(e=>e.r.postes.conteneur.achat),inst:C.inst?{total:C.inst.total,parts:C.inst.ventil.parts,mont:C.inst.ventil.montants,jours:C.inst.detail.conteneur.jours,n:C.inst.detail.conteneur.n,cont:C.inst.postes.conteneur.achat}:null};});
out={before:await calc()};
await click('chview|inst');await chg('#eq-app [data-afx="inst§on"]',true);
out.on=await A().then(a=>a.chiffrage.inst);out.c1=await calc();
await chg('#eq-app [data-afx="inst§items.pelle.n"]','2');await chg('#eq-app [data-afx="inst§items.pelle.jours"]','8');await chg('#eq-app [data-afx="inst§items.pelle.ar"]','3');out.c2=await calc();
await chg('#eq-app [data-afx="inst§ventil"]','egal');out.egal=(await calc()).inst.parts;
await chg('#eq-app [data-afx="inst§ventil"]','pct');const ids=await A().then(a=>a.chiffrage.etudes.map(z=>z.id));await chg(`#eq-app [data-afx="inst§pct.${ids[0]}"]`,'70');await chg(`#eq-app [data-afx="inst§pct.${ids[1]}"]`,'30');out.pct=(await calc()).inst.parts;
await chg('#eq-app [data-afx="inst§ventil"]','ml');
await click('chei|0');out.zone=await page.evaluate(()=>({band:(document.querySelector('#eq-app .ch-zband')||{}).textContent||'',ban:(document.querySelector('#eq-app .ch-instban')||{}).textContent||'',sw:!!document.querySelector('#eq-app [data-afx="e§chantier.pelle"]')}));
await click('chview|recap');
out.recap=await page.evaluate(()=>{const t=document.querySelector('#eq-app table.ch-recap');const th=[...t.querySelectorAll('tr:first-child th')].map(x=>x.textContent.trim());const vent=t.querySelector('tr.ch-ivent');return {th,vent:vent?vent.textContent.replace(/\s+/g,' ').trim():''};});
console.log('3) installations :',JSON.stringify(out));
const c=out.c2;const P=pj=>pj;
C.c3=out.before.cont.every(x=>x>0)&&out.on.on&&out.on.items.pelle.on&&out.on.items.wc.on&&out.c1.cont.every(x=>x===0)&&out.c1.inst.total>0&&Math.abs(out.c1.achat-(out.c1.zones.reduce((s,x)=>s+x,0)+out.c1.inst.total))<0.01&&out.c1.inst.cont<out.before.cont.reduce((s,x)=>s+x,0)
  &&c.inst.n.pelle===2&&c.inst.jours.pelle===8&&c.inst.jours.wc===10&&Math.abs(c.inst.parts[0]-0.6)<1e-9&&Math.abs(c.inst.mont[0]+c.inst.mont[1]-c.inst.total)<0.01&&out.egal.every(x=>Math.abs(x-0.5)<1e-9)&&Math.abs(out.pct[0]-0.7)<1e-9&&Math.abs(out.pct[1]-0.3)<1e-9
  &&/Zone 1 \/ 2 · Antenne Lilas/.test(out.zone.band)&&/rue des Lilas · DPGF onglet 2/.test(out.zone.band)&&/onglet Installations/.test(out.zone.ban)&&!out.zone.sw&&out.recap.th.includes('🏗 Installations')&&/^Avec les installations ventilées/.test(out.recap.vent);
// ── 4) quantités et charge : 2 équipes de soudure (10 jours ouvrés), 2 pelles OK ; 3 phases → 3 A/R (prévus 3)
await chg('#eq-app [data-afx="ch§phases"]','4');
out={q:await page.evaluate(()=>{const t=[...document.querySelectorAll('#eq-app table.ch-qrecap tr')].map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|'));return t;}),al:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-al')].map(x=>x.className.replace('ch-al ','')+':'+x.textContent.trim()))};
console.log('4) quantités / charge :',JSON.stringify(out));
C.c4=out.q.some(r=>/^Soudures\|150\|100\|\|250$/.test(r))&&out.q.some(r=>/^Location Pelle : jours\|—\|—\|16 \(2 ×\)\|16$/.test(r))&&out.al.some(a=>/^bad:Soudure : 25,0 jours d'équipe .* pour 10 jours ouvrés → 3 équipes de soudure/.test(a))&&out.al.some(a=>/^bad:3 équipes de soudure mais 2 pelles prévues/.test(a))&&out.al.some(a=>/^warn:Chantier en 4 phases .* prévoir 4 A\/R de pelle \(prévus : 3\)/.test(a));
// ── 5) le DPGF voit les installations
out=await page.evaluate(()=>{const T=window.TRACE;return (T.affaires.dpgfSources?T.affaires.dpgfSources(T.affaires.get('O2610-18')):{opts:[]}).opts.filter(o=>/^i\|/.test(o.key)).map(o=>o.label);});
console.log('5) DPGF :',JSON.stringify(out));
C.c5=out.some(l=>/Installations › Contener/.test(l));
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
