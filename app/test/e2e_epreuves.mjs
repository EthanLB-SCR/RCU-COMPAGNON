// ÉPREUVES, CONTRÔLES, DÉTAIL DES PRESTATIONS (13/10/2026 soir, retours d'Ethan sur le chiffrage) — base de prix FICTIVE (fixture_prix.xlsx) :
// 1) zone : des « épreuves » (plus des « zones »), une case par prestation et par épreuve ; prix retenu explicite (calcul SCR / devis) ; détail du calcul
//    dépliable et retouchable (⚠ modifié, ↺) ;
// 2) contrôles CND en tableau : % contrôlé et soudures par vacation → soudures contrôlées et vacations sur la ligne ; raccordements = vacations seulement ;
// 3) extrusion, dépose, vanne préisolée : détail du calcul dépliable, une retouche change le prix de CE chiffrage ;
// 4) onglet « 💧 Épreuves » : activation → une épreuve par zone reprise des zones ; « une seule épreuve pour tout » → prix ventilé sur les zones au prorata
//    des m³ ; la carte de la zone montre sa part ; total du chiffrage = somme des zones.
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
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(260);};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(200);};
const NUM='O2610-31';const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);const CALC=()=>page.evaluate(n=>{const T=window.TRACE;return T.affaires.calc(T.affaires.get(n));},NUM);
const as=async who=>{await page.evaluate(async w=>{const T=window.TRACE;T.state.userId=w;T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));},who);await wait(200);};
await as('ethan');await click('seg|prix');await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await page.evaluate(async n=>{document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]').click();await new Promise(x=>setTimeout(x,200));document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Essais';document.getElementById('afn-client').value='IDEX';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,250));},NUM);
// zone A : DN 100 (200 ml de tranchée) ; zone B : DN 150 (100 ml)
await click('chetudeadd|');await chg('#eq-app [data-afx="e§nom"]','Zone A');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','40');await chg('#eq-app [data-afx="e§dn.0.ml"]','200');
// ── 1) hydraulique de la zone
await click('chfold|hydro');
let out={names:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="hydro"] .ch-hz-h input')].map(i=>i.value)),add:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="hydro"] [data-v^="chadd|hydro.zones|"],#eq-app .ch-bloc[data-bloc="hydro"] [data-v="chadd|hydro.zones"]')].map(b=>b.textContent.trim()))};
await click('chadd|hydro.zones.0.rows');await chg('#eq-app [data-afx="e§hydro.zones.0.rows.0.dn"]','100');await chg('#eq-app [data-afx="e§hydro.zones.0.rows.0.ml"]','400');
await chg('#eq-app [data-afx="e§hydro.zones.0.pr.rincage"]',true);
out.sw=await page.evaluate(()=>({pr:document.querySelectorAll('#eq-app .ch-bloc[data-bloc="hydro"] .ch-hzpr input').length,parDefaut:/par défaut/.test(document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"]').textContent)}));
const rinc=async()=>(await CALC()).etudes[0].r.postes.rincage.achat;
out.r0=await rinc();out.mode=await page.evaluate(()=>{const s=document.querySelector('#eq-app [data-afx="e§hydro.prixMode.rincage"]');return s?[s.value,s.options[0].textContent]:null;});
await chg('#eq-app [data-afx="e§hydro.prixMode.rincage"]','devis');out.rDevisVide=await rinc();out.noteVide=await page.evaluate(()=>/reste retenu tant que le montant est vide/.test(document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"]').textContent));
await chg('#eq-app [data-afx="e§hydro.devis.rincage"]','5000');out.rDevis=await rinc();out.noteDevis=await page.evaluate(()=>/Retenu : le devis/.test(document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"]').textContent));
await chg('#eq-app [data-afx="e§hydro.prixMode.rincage"]','calc');out.rCalc=await rinc();
// détail du rinçage : retoucher les heures de circulation
await click('chpv|e|'+encodeURIComponent('rin|z0'));out.det=await page.evaluate(()=>{const t=document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"] .ch-pdet.open');return t?[...t.querySelectorAll('table.ch-pdt tr')].slice(1,-1).map(r=>r.cells[0].textContent.trim()):null;});
await chg('#eq-app [data-afx="pov§rin|z0§h_circ§qty"]','50');out.rMod=await rinc();out.tag=await page.evaluate(()=>/modifié/.test((document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"] .ch-pdet.open .ch-pdsum')||{}).textContent||''));
await click('chpvz|e|'+encodeURIComponent('rin|z0')+'|h_circ');out.rBack=await rinc();
console.log('1) épreuves de la zone :',JSON.stringify(out));
C.c1=out.names.join()==='Épreuve 1'&&out.add.some(t=>/épreuve/.test(t))&&out.sw.pr===5&&!out.sw.parDefaut&&out.r0>0&&out.mode&&out.mode[0]==='calc'&&/calcul SCR/.test(out.mode[1])&&Math.abs(out.rDevisVide-out.r0)<0.01&&out.noteVide&&out.rDevis===5000&&out.noteDevis&&Math.abs(out.rCalc-out.r0)<0.01
  &&out.det&&out.det.some(r=>/circulation/.test(r))&&out.det.some(r=>/SKID/.test(r))&&out.rMod>out.r0&&out.tag&&Math.abs(out.rBack-out.r0)<0.01;
// ── 2) contrôles CND
await click('chfold|cnd');await chg('#eq-app [data-afx="e§cnd.km"]','120');await chg('#eq-app [data-afx="e§cnd.radio.on"]',true);
await chg('#eq-app [data-afx="e§dn.0.nAnt"]','10');
await chg('#eq-app [data-afx="e§cnd.radio.fdPct"]','20');out={warn:await page.evaluate(()=>/à renseigner/.test(document.querySelector('#eq-app .ch-bloc[data-bloc="cnd"]').textContent))};
await chg('#eq-app [data-afx="e§cnd.radio.fdVac"]','4');await chg('#eq-app [data-afx="e§cnd.radio.raccVac"]','2');
out.rows=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-cndt tr')].map(r=>[...r.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim())));
const Cc=await CALC();out.det=Cc.etudes[0].r.detail.Radio;out.racInputs=await page.evaluate(()=>document.querySelectorAll('#eq-app [data-afx="e§cnd.radio.raccFilms"]').length);
console.log('2) CND :',JSON.stringify(out));
C.c2=out.warn&&out.rows[0].some(h=>/Soudures par vacation/.test(h))&&out.rows[2][0]==='Feeders'&&out.rows[2][1]==='30'&&/^6/.test(out.rows[2][3])&&out.rows[2][5]==='2'&&out.rows[3][0]==='Raccordements sur existant'&&out.det.fd.vac===2&&out.det.racc.vac===2&&out.racInputs===0&&Math.abs(out.det.fd.n-6)<0.001;
// ── 3) extrusion, dépose, vanne préisolée : détail retouchable
await click('chfold|extrusion');await click('chadd|extrusion');await click('chfold|depose');await click('chadd|depose.rows');await chg('#eq-app [data-afx="e§depose.rows.0.ml"]','30');await click('chfold|vpi');await click('chadd|vpi');await chg('#eq-app [data-afx="e§vpi.0.prixVanne"]','400');
const ex=async()=>(await CALC()).etudes[0].r.postes;out={};let P=await ex();out.e0=P.extrusion.achat;out.d0=P.depose.achat;out.v0=P.vpi.achat;
const keyExt=await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const x=a.chiffrage.etudes[0].extrusion[0];return 'ext|'+x.dn+'|'+x.type;},NUM);
await click('chpv|e|'+encodeURIComponent(keyExt));out.extLines=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="extrusion"] .ch-pdet.open table.ch-pdt tr')].slice(1,-1).map(r=>r.cells[0].textContent.trim()));
await chg(`#eq-app [data-afx="pov§${keyExt}§mo§qty"]`,'10');P=await ex();out.e1=P.extrusion.achat;
await click('chpv|e|'+encodeURIComponent('dep|0'));out.depLines=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="depose"] .ch-pdet.open table.ch-pdt tr')].slice(1,-1).map(r=>r.cells[0].textContent.trim()));
await chg('#eq-app [data-afx="pov§dep|0§dechets§pu"]','1000');P=await ex();out.d1=P.depose.achat;
await click('chpv|e|'+encodeURIComponent('vpi|0'));await chg('#eq-app [data-afx="pov§vpi|0§vanne§pu"]','500');P=await ex();out.v1=P.vpi.achat;out.warnTags=await page.evaluate(()=>document.querySelectorAll('#eq-app td .eq-tag.warn').length);
console.log('3) détail des prestations :',JSON.stringify(out));
C.c3=out.extLines.length===3&&/MO d'extrusion/.test(out.extLines[0])&&out.e1>out.e0&&out.depLines.some(l=>/Coupes/.test(l))&&out.depLines.some(l=>/Déchets/.test(l))&&out.d1>out.d0&&Math.abs(out.v1-out.v0-100)<0.01&&out.warnTags>=3;
// ── 4) onglet Épreuves : une zone B, activation, une seule épreuve, ventilation
await click('chetudeadd|');await chg('#eq-app [data-afx="e§nom"]','Zone B');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','150');await chg('#eq-app [data-afx="e§dn.0.soud"]','20');await chg('#eq-app [data-afx="e§dn.0.ml"]','100');
const before=await CALC();out={tot0:before.achat};
await click('chview|essais');await chg('#eq-app [data-afx="es§on"]',true);
let a=await A();out.init=(a.chiffrage.essais.epreuves||[]).map(e=>e.nom+':'+e.rows.map(r=>r.dn+'/'+r.ml).join(',')+':'+(e.pr.rincage?'R':''));
out.ids=a.chiffrage.etudes.every(z=>!!z.id);
await click('esone|');a=await A();out.one=(a.chiffrage.essais.epreuves||[]).map(e=>e.nom+':'+e.rows.map(r=>r.dn+'/'+r.ml).join(','));
let X=await CALC();out.ess={total:X.essais.total,par:X.essais.par.map(P=>Object.values(P).reduce((x,l)=>x+l.achat,0)),V:X.essais.epreuves.map(e=>e.V)};
out.sumZones=X.etudes.reduce((x,e)=>x+Object.values(e.r.postes).reduce((y,p)=>y+p.achat,0),0);out.achat=X.achat;
out.zoneHydro=X.etudes.map(e=>e.r.detail.hydro.vols.length);
out.table=await page.evaluate(()=>[...document.querySelectorAll('#eq-app table.ch-tab tr')].filter(r=>/Zone A|Zone B/.test(r.textContent)).map(r=>r.cells.length));
await click('chei|0');out.ban=await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"] .ch-instban');return b?b.textContent.replace(/\s+/g,' '):null;});
console.log('4) onglet Épreuves :',JSON.stringify(out));
const vA=out.ess.V[0];C.c4=out.init.length===2&&/400/.test(out.init[0])&&/R$/.test(out.init[0])&&/150\/200/.test(out.init[1])&&out.ids&&out.one.length===1&&/100\/400/.test(out.one[0])&&/150\/200/.test(out.one[0])
  &&Math.abs(out.ess.par[0]+out.ess.par[1]-out.ess.total)<0.01&&out.ess.par[0]>0&&out.ess.par[1]>0&&Math.abs(out.sumZones-out.achat)<0.01&&out.zoneHydro.every(n=>n===0)&&out.ban&&/Comptées dans l'onglet Épreuves/.test(out.ban)&&vA>0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
