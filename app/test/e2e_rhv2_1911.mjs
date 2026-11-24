// MODULE RH v2 (19/11/2026 nuit, Ethan) — de bout en bout, personnages de démo (rien ne part au serveur), novembre 2026, aujourd'hui mardi 01/12.
//  « important de distinguer les intérimaires des salariés ; il faut pouvoir sur certaines semaines mettre des règles communes à tout le monde : ce mercredi 11 novembre on
//    lisse les heures sur tout sauf le mercredi férié qui a été travaillé (heures majorées → au réel ce jour-là) ; un endroit de contrôle que tous les salariés ont bien des
//    heures ou une absence tout le temps, visuel : calendrier des absences de tout le monde, vue d'ensemble de chaque semaine (qui, quel chantier), alerte si quelqu'un n'a ni
//    heures ni absence ; sur le tableau de bord, Variables de paie ne sert à rien ; veille à ce que les heures sup soient bien calculées dans le tableau et les récaps du bas ;
//    adresses à vérifier : pouvoir saisir « pas concerné par le grand déplacement » ; un module stylé 2026. »
// Julien (salarié) : S45 4 × 9 h (vendredi non travaillé = rythme 4 jours) ; S46 10 · 9 · 6,5 le MERCREDI 11/11 FÉRIÉ TRAVAILLÉ · 9 · 7 ; S47 10 · 6 · 8 · 8 · 8 ; S48 mardi 24/11
//  sans heures ni absence. Karim (salarié) : S45 5 × 7 ; S46 9 · 9 · férié · 9 · 9 ; S47 RIEN (planifié) ; S48 8 h × 4 + congé payé le jeudi 26/11. Nina (intérimaire, agence
//  fictive) : S46 planifiée lun mar jeu ven, pointée lun mar jeu (vendredi 13/11 manquant) ; pas placée les autres semaines.
//  r1  férié travaillé : S46 de Julien = 8,75 × 4 + 6,5 le mercredi au réel (« FÉRIÉ TRAVAILLÉ » sur la navette), 6,5 h sup à 125 % ; Karim : férié non travaillé, comme avant
//  r2  heures sup : chaque semaine de chacun — total, 125 %, 150 % recalculés à part depuis les pointages = l'écran (colonnes, totaux par groupe) = la navette Excel
//      (lignes « HEURES SUP » et récap « HS du mois » évalués par le moteur de formules)
//  r3  Navettes : salariés et intérimaires en deux groupes, total par groupe et général, « férié » sur l'en-tête de S46, pastille « Intérim · agence »
//  r4  règle de la semaine pour tout le monde (en-tête S47) : mardi au réel → Julien 8,5 · 6 · 8,5 · 8,5 · 8,5 ; l'explication et l'étiquette le disent ; motif obligatoire
//  r5  règle « toute la semaine aux heures réelles » → 10 · 6 · 8 · 8 · 8 ; Julien « lissé malgré la règle » (fenêtre de sa semaine) → 8 × 5 ; règle retirée → calcul normal
//  r6  S46 : la règle peut rendre le férié travaillé au lissage pour tous (8,25 × 4 + 8,5) ; remise à zéro → 8,75 × 4 + 6,5 ; dans la fenêtre de Julien, cocher « Mer » =
//      aperçu en direct « lissé quand même », rien d'enregistré
//  r7  Contrôle : 7 jours sans heures ni absence (Julien 1, Karim 5 = semaine entière, Nina 1), 3 personnes, 1 semaine vide ; la semaine de tout le monde (qui, quel chantier,
//      « ? » en rouge) ; le vendredi du rythme 4 jours n'est pas un manque ; l'intérimaire pas placée n'est pas attendue ; le mois : absences par type
//  r8  « 🏖 Absence » depuis l'alerte : pré-remplie (Karim, du 16 au 20/11, 5 jours) → enregistrée → 2 jours restants ; la case d'un jour → son détail
//  r9  population : « Intérimaires » → Nina seule (navettes, contrôle) ; le bouton télécharge « Navettes_2026-11_interimaires.xlsx » ; « Salariés » → 2 ; mutuelle : Nina
//      n'est pas « sans ligne » (elle relève de son agence)
//  r10 tableau de bord : plus de « Variables de paie » dans les raccourcis (le rapport reste ouvert depuis les Navettes) ; la tuile du contrôle ouvre le contrôle
//  r11 adresses à vérifier : « 🚫 Non concerné » (motif) → la personne sort de la liste, cas 1 sans indemnité, « non concerné » ; « ↩ Remettre » → revient
//  r12 Absences : le calendrier du mois (une ligne par personne absente, la légende) ; r13 un compagnon : son dossier, ni Contrôle ni population, règle refusée
//  r14 habillage : en-tête, onglets sur une ligne (défilement), téléphone 390 px sans débordement de page ; r15 console propre
import { chromium } from 'playwright';
import { openXlsx } from '../src/xlsx.js';
import * as X from '../src/xlcalc.js';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const q=strip(new URL(route.request().url()).searchParams.get('q'));const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('rennes')?F(-1.6778,48.1173,'35000'):q==='caen'?F(-0.3707,49.1829,'14000'):{type:'FeatureCollection',features:[]};route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);const r2=v=>Math.round(v*100)/100;
await page.clock.install({time:new Date(2026,11,1,8,30,0)}); /* mardi 01/12/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
// ── 0) un chantier fictif, la personne intérimaire, le planning et les pointages de novembre
const HRS={'l:julien':{'2026-11-02':[9,9,9,9,null],'2026-11-09':[10,9,6.5,9,7],'2026-11-16':[10,6,8,8,8],'2026-11-23':[8,null,8,8,8],'2026-11-30':[8,null,null,null,null]},
  'l:karim':{'2026-11-02':[7,7,7,7,7],'2026-11-09':[9,9,null,9,9],'2026-11-16':[null,null,null,null,null],'2026-11-23':[8,8,8,null,8],'2026-11-30':[8,null,null,null,null]},
  'prov:nina':{'2026-11-09':[8,8,null,8,null]}};
const PLAN={'l:julien':{'2026-11-02':[1,1,1,1,0],'2026-11-09':[1,1,1,1,1],'2026-11-16':[1,1,1,1,1],'2026-11-23':[1,1,1,1,1],'2026-11-30':[1,1,1,1,1]},'l:karim':{'2026-11-02':[1,1,1,1,1],'2026-11-09':[1,1,0,1,1],'2026-11-16':[1,1,1,1,1],'2026-11-23':[1,1,1,1,1],'2026-11-30':[1,1,1,1,1]},'prov:nina':{'2026-11-09':[1,1,0,1,1]}};
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(400);});
await page.evaluate(({HRS,PLAN})=>{const T=window.TRACE;T.rh.provTest('nina',{prenom:'Nina',nom:'FICTIVE',poste:'soudeur',type:'interim',agence:'Agence Fictive'});
  const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_vf';x.name='Villefictive — Centre';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites.demo_vf=x;
  const ST=T.espace.state();ST.people['l:julien']=Object.assign({},ST.people['l:julien']||{},{adresse:{voie:'4 rue des Essais',cp:'35000',ville:'RENNES'}});
  const wkKey=s=>{const x2=new Date(s+'T12:00:00');x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  const add=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const end=h=>{const m=450+60+Math.round(h*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
  Object.keys(PLAN).forEach(p=>Object.keys(PLAN[p]).forEach(mon=>{const pj={};PLAN[p][mon].forEach((on,i)=>{pj[add(mon,i)]=on?['demo_vf']:[];});T.espace.savePlanning(wkKey(mon),{[p]:pj});}));
  Object.keys(HRS).forEach(p=>Object.keys(HRS[p]).forEach(mon=>HRS[p][mon].forEach((h,i)=>{if(h===null)return;const d=add(mon,i);ST.pointages.push({p,d,site:'demo_vf',status:'declare',corr:null,events:[{t:'start',at:d+'T07:30'},{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T13:00'},{t:'end',at:d+'T'+end(h)}],val:[]});})));
  T.state.userId='ethan';T.renderHome();},{HRS,PLAN});await wait(500);
const goRh=async tab=>{await page.evaluate(async t=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(350);const b=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|'+t+'"]');if(b){b.click();await w(500);}},tab);};
const txt=()=>page.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const modalTxt=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show')||document.getElementById('modal');return m?m.textContent.replace(/\s+/g,' '):'';});
const closeM=()=>page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});
const nav=pid=>page.evaluate(p=>{const R=window.TRACE.espace.navette(p,'2026-11');const N=R.N;return {weeks:N.weeks.map(w=>({mon:w.mon,n:w.n,total:w.total,hs125:w.hs125,hs150:w.hs150,etat:w.liss&&w.liss.etat,h:w.liss?w.liss.jours.map(j=>j.h):null,flags:w.liss?w.liss.flags:[],expl:w.liss?w.liss.expl.join(' | '):'',tags:w.liss?w.liss.jours.map(j=>j.tag||''):[]})),hs:N.hs,lines:N.lines.filter(l=>l.kind==='day').map(l=>[l.d,l.hours,l.chantier]),cells:R.sheet.cells};},pid);
const wk=(N,mon)=>N.weeks.find(w=>w.mon===mon);
// congé payé de Karim le jeudi 26/11, saisi dans Tracé RH → Absences (au vrai clic)
await goRh('abs');await page.click('[data-act="x"][data-v="rh|new|rhabs"]');await wait(300);
await page.evaluate(()=>{const g=k=>document.getElementById(k);g('rh-p').value='l:karim';g('rh-type').value='cp';g('rh-du').value='2026-11-26';g('rh-au').value='2026-11-26';g('rh-du').dispatchEvent(new Event('change'));});await page.click('#rh-ok');await wait(500);
// ── r1) férié travaillé
let NJ=await nav('l:julien'),NK=await nav('l:karim'),NN=await nav('prov:nina');
console.log('r1) Julien S46 :',J(wk(NJ,'2026-11-09').h),wk(NJ,'2026-11-09').total,wk(NJ,'2026-11-09').hs125,wk(NJ,'2026-11-09').flags.join(),'| ligne 11/11 :',J(NJ.lines.find(l=>l[0]==='2026-11-11')),'| Karim S46 :',J(wk(NK,'2026-11-09').h),J(NK.lines.find(l=>l[0]==='2026-11-11')));
C.r1=J(wk(NJ,'2026-11-09').h)==='[8.75,8.75,6.5,8.75,8.75,null]'&&wk(NJ,'2026-11-09').total===41.5&&wk(NJ,'2026-11-09').hs125===6.5&&wk(NJ,'2026-11-09').hs150===0&&wk(NJ,'2026-11-09').flags.includes('ferieT')
  &&/férié travaillé — 6,5 h au réel \(heures majorées\), pas lissé/.test(wk(NJ,'2026-11-09').expl)&&NJ.lines.find(l=>l[0]==='2026-11-11')[1]===6.5&&/FÉRIÉ TRAVAILLÉ/.test(NJ.lines.find(l=>l[0]==='2026-11-11')[2])
  &&J(wk(NK,'2026-11-09').h)==='[9,9,null,9,9,null]'&&!wk(NK,'2026-11-09').flags.includes('ferieT')&&/^FÉRIÉ$/.test(String(NK.lines.find(l=>l[0]==='2026-11-11')[2]).trim());
// ── r2) heures sup : recalcul à part (pointages → total de la semaine arrondi au ¼ h, plafonné à 48 h → 125 % de la 36e à la 43e, 150 % au-delà) = navette = Excel = écran
const hsRef=T=>{const t=Math.min(T,48);return {h125:r2(Math.max(0,Math.min(t,43)-35)),h150:r2(Math.max(0,t-43))};};
const ctxOf=cells=>{const memo={};const c={hasSheet:()=>true,bounds:()=>({maxR:400,maxC:12}),name:()=>null,rowHidden:()=>false,val:(s,r,col)=>{const a=X.colName(col)+r;if(a in memo)return memo[a];const cell=cells[a];let v=null;if(cell){if(cell.f){memo[a]=0;v=X.evalFormula(X.parseFormula(cell.f),c,{sh:'N',r,c:col});}else v=cell.v===undefined?null:cell.v;}memo[a]=v;return v;}};return c;};
const ecarts=[];const REF={};
for(const [pid,N] of [['l:julien',NJ],['l:karim',NK],['prov:nina',NN]]){let s125=0,s150=0,sT=0;const cx=ctxOf(N.cells);const V=a=>{const q=X.parseAddr(a);return cx.val('N',q.r,q.c);};
  const rows125=Object.keys(N.cells).filter(k=>/^H\d+$/.test(k)&&N.cells[k].v==='HEURES SUP - 125%').map(k=>+k.slice(1)).sort((a,b)=>a-b),rows150=Object.keys(N.cells).filter(k=>/^H\d+$/.test(k)&&N.cells[k].v==='HEURES SUP - 150%').map(k=>+k.slice(1)).sort((a,b)=>a-b);
  N.weeks.forEach((w,i)=>{const raw=(HRS[pid][w.mon]||[]).reduce((t,h)=>t+(h||0),0);const fer=w.mon==='2026-11-09'&&HRS[pid][w.mon]&&HRS[pid][w.mon][2]?HRS[pid][w.mon][2]:0;const T=r2(Math.round((raw-fer)*4)/4+fer);const ref=hsRef(T);s125=r2(s125+ref.h125);s150=r2(s150+ref.h150);sT=r2(sT+T);
    const x125=r2(+V('I'+rows125[i])||0),x150=r2(+V('I'+rows150[i])||0);
    /* Karim S47 (rien de pointé, compteurs vides) : la semaine reste à 0 h — elle n'est pas complétée */
    if(Math.abs(w.total-T)>0.006||Math.abs(w.hs125-ref.h125)>0.006||Math.abs(w.hs150-ref.h150)>0.006||Math.abs(x125-ref.h125)>0.006||Math.abs(x150-ref.h150)>0.006)ecarts.push(pid+' S'+w.n+' '+J({T,tot:w.total,ref,nav:[w.hs125,w.hs150],xl:[x125,x150]}));});
  const q125=Object.keys(N.cells).filter(k=>N.cells[k].v==='NB HEURES 125%').map(k=>X.parseAddr(k)).sort((a,b)=>a.r-b.r)[0],q150=Object.keys(N.cells).filter(k=>N.cells[k].v==='NB HEURES 150%').map(k=>X.parseAddr(k)).sort((a,b)=>a.r-b.r)[0];
  const b125=r2(+cx.val('N',q125.r,q125.c+1)||0),b150=r2(+cx.val('N',q150.r,q150.c+1)||0);
  if(Math.abs(b125-s125)>0.006||Math.abs(b150-s150)>0.006||Math.abs(N.hs.h125-s125)>0.006||Math.abs(N.hs.h150-s150)>0.006)ecarts.push(pid+' récap '+J({b125,b150,s125,s150,hs:N.hs}));REF[pid]={s125,s150,sT};}
await goRh('nav');await page.click('[data-act="x"][data-v="rh|navm|2026-11"]').catch(()=>{});await wait(900);
const ecran=()=>page.evaluate(()=>{const num=s=>{const t=String(s||'').replace(/\s+/g,' ').trim().replace(',','.');const m=/-?\d+(\.\d+)?/.exec(t);return m?+m[0]:0;};const T=document.querySelector('#eq-app table.nav-tab');if(!T)return null;
  const rows=[...T.querySelectorAll('tr')];return {heads:[...rows[0].children].map(c=>c.textContent.replace(/\s+/g,' ').trim()),grp:rows.filter(r=>r.classList.contains('rh-grp')).map(r=>r.textContent.replace(/\s+/g,' ').trim()),
    pers:rows.filter(r=>r.dataset.p).map(r=>({p:r.dataset.p,nom:r.children[0].textContent.replace(/\s+/g,' ').trim(),weeks:[...r.querySelectorAll('.nav-cell b')].map(b=>num(b.textContent)),mois:num((r.querySelector('[data-mois]')||{}).textContent),h125:num((r.querySelector('[data-hs="125"]')||{}).textContent),h150:num((r.querySelector('[data-hs="150"]')||{}).textContent)})),
    tot:rows.filter(r=>r.classList.contains('rh-tot')).map(r=>({g:r.dataset.tot,mois:num((r.querySelector('[data-mois]')||{}).textContent),h125:num(r.querySelector('[data-hs="125"]').textContent),h150:num(r.querySelector('[data-hs="150"]').textContent),w:[...r.children].slice(1,1+T.querySelectorAll('.rh-wkb').length).map(c=>num(c.textContent))})), /* 24/11 : la colonne « Mois » se lit par son attribut (des colonnes de grand déplacement suivent) */
    tiles:[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),dl:(document.querySelector('#eq-app [data-act=gdnavall]')||{dataset:{}}).dataset.v,dlTxt:((document.querySelector('#eq-app [data-act=gdnavall]')||{}).textContent||'').trim(),
    wkb:[...T.querySelectorAll('.rh-wkb')].map(b=>b.textContent.replace(/\s+/g,' ').trim()),int:[...T.querySelectorAll('tr[data-p] .rh-pn small')].map(x=>x.textContent)};});
let E=await ecran();
for(const pid of ['l:julien','l:karim','prov:nina']){const r=E.pers.find(x=>x.p===pid);if(!r||Math.abs(r.h125-REF[pid].s125)>0.006||Math.abs(r.h150-REF[pid].s150)>0.006||Math.abs(r.mois-REF[pid].sT)>0.006)ecarts.push('écran '+pid+' '+J({r,ref:REF[pid]}));}
const tSal=E.tot.find(t=>t.g==='sal'),tInt=E.tot.find(t=>t.g==='int'),tAll=E.tot.find(t=>t.g==='tous');
console.log('r2) heures sup :',ecarts.length,'écart(s)',ecarts.slice(0,5).join(' ; '),'| réf',J(REF),'| totaux',J(E.tot));
C.r2=ecarts.length===0&&REF['l:julien'].s125===12.5&&REF['l:karim'].s125===1&&REF['prov:nina'].s125===0&&!!tSal&&!!tInt&&!!tAll&&Math.abs(tSal.h125-13.5)<0.006&&Math.abs(tInt.mois-24)<0.006&&Math.abs(tAll.mois-r2(REF['l:julien'].sT+REF['l:karim'].sT+24))<0.006&&Math.abs(tAll.h125-13.5)<0.006;
// ── r3) deux groupes, en-têtes, pastilles
console.log('r3)',J({heads:E.heads,grp:E.grp,wkb:E.wkb,tiles:E.tiles,int:E.int}));
C.r3=J(E.grp)==='["Salariés · 2","Intérimaires · 1"]'&&E.heads.includes('HS 125 %')&&E.heads.includes('HS 150 %')&&E.wkb.some(t=>/^S46\s*férié/.test(t))&&!E.wkb.some(t=>/règle/.test(t))&&E.tiles.some(t=>/^1\s*férié travaillé au réel/.test(t))
  &&E.int.some(t=>/intérim · Agence Fictive/.test(t))&&E.int.some(t=>/contrat 35 h/.test(t))&&E.dl==='2026-11'&&/Toutes les navettes de novembre 2026/.test(E.dlTxt)&&E.pers.map(x=>x.p).join()==='l:julien,l:karim,prov:nina';
// ── r4) règle de la semaine S47 : le mardi 17/11 au réel pour tout le monde
await page.click('[data-act="x"][data-v="rh|navr|2026-11-16"]');await wait(400);
let out={m0:await modalTxt()};await page.evaluate(()=>{const c=document.getElementById('nr-j1');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});
out.hint=await page.evaluate(()=>document.getElementById('nr-hint').textContent);await page.click('#nr-ok');await wait(300);out.sansMotif=await page.evaluate(()=>({open:!!document.getElementById('nr-ok'),toast:document.getElementById('toast').textContent}));
await page.fill('#nr-motif','intempéries le mardi (essai)');await page.click('#nr-ok');await wait(900);
NJ=await nav('l:julien');E=await ecran();out.reg=await page.evaluate(()=>window.TRACE.reg.get('navliss','l:tous|2026-11-16')); /* personnages de démo : règle à part (l:tous|…), jamais envoyée */
await page.click('[data-act="x"][data-v="rh|navw|l:julien|2026-11-16"]');await wait(500);out.mw=await modalTxt();out.fixe=await page.evaluate(()=>[...document.querySelectorAll('#nv-tab [data-fixe]')].map(x=>x.textContent));out.cb=await page.evaluate(()=>[0,1,2,3,4].map(i=>document.getElementById('nv-l'+i).checked));await closeM();await wait(200);
console.log('r4)',J({h:wk(NJ,'2026-11-16').h,flags:wk(NJ,'2026-11-16').flags,hint:out.hint,sansMotif:out.sansMotif,reg:out.reg,wkb:E.wkb,fixe:out.fixe,cb:out.cb}),'|',out.m0.slice(0,200));
C.r4=/Règle de la semaine S47 pour tout le monde/.test(out.m0)&&/férié travaillé reste au réel/.test(out.m0)&&/Au réel pour tous : mar 17\/11\./.test(out.hint)&&out.sansMotif.open&&/motif/i.test(out.sansMotif.toast)
  &&J(wk(NJ,'2026-11-16').h)==='[8.5,6,8.5,8.5,8.5,null]'&&wk(NJ,'2026-11-16').total===40&&wk(NJ,'2026-11-16').flags.includes('regle')&&/Mardi 17\/11 : au réel pour tout le monde \(règle de la semaine\) — 6 h, pas lissé/.test(wk(NJ,'2026-11-16').expl)&&/Règle de la semaine pour tout le monde posée par .* — intempéries le mardi \(essai\)/.test(wk(NJ,'2026-11-16').expl)
  &&out.reg&&J(out.reg.reel)==='["2026-11-17"]'&&!out.reg.mode&&E.wkb.some(t=>/^S47\s*règle/.test(t))&&E.tiles.some(t=>/^1\s*semaine avec règle commune/.test(t))&&J(out.fixe)==='["au réel · règle de la semaine"]'&&J(out.cb)==='[true,false,true,true,true]'&&/au réel pour tout le monde \(règle de la semaine\)/.test(out.mw);
// ── r5) « toute la semaine aux heures réelles » ; Julien lissé malgré la règle ; règle retirée
await page.click('[data-act="x"][data-v="rh|navr|2026-11-16"]');await wait(400);await page.evaluate(()=>{const r=document.querySelector('input[name=nr-mode][value=reel]');r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));});
out={hint:await page.evaluate(()=>document.getElementById('nr-hint').textContent),dis:await page.evaluate(()=>document.getElementById('nr-j0').disabled)};await page.click('#nr-ok');await wait(900);
NJ=await nav('l:julien');NK=await nav('l:karim');out.reel=[wk(NJ,'2026-11-16').etat,wk(NJ,'2026-11-16').h,wk(NJ,'2026-11-16').flags];
await page.click('[data-act="x"][data-v="rh|navw|l:julien|2026-11-16"]');await wait(500);out.radio=await page.evaluate(()=>(document.querySelector('input[name=nv-mode]:checked')||{}).value);out.lab=await modalTxt();
await page.evaluate(()=>{const r=document.querySelector('input[name=nv-mode][value=auto]');r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));});await wait(200);out.apercu=await page.evaluate(()=>[...document.querySelectorAll('#nv-tab tr')].slice(1,6).map(tr=>tr.children[2].textContent.trim()));
await page.fill('#nv-motif','accord avec lui (essai)');await page.click('#nv-ok');await wait(900);NJ=await nav('l:julien');out.malgre=[wk(NJ,'2026-11-16').etat,wk(NJ,'2026-11-16').h,wk(NJ,'2026-11-16').flags,/ne s'applique pas ici/.test(wk(NJ,'2026-11-16').expl)];out.regP=await page.evaluate(()=>window.TRACE.reg.get('navliss','l:julien|2026-11-16'));
await page.click('[data-act="x"][data-v="rh|navr|2026-11-16"]');await wait(400);out.mains=await page.evaluate(()=>(document.getElementById('nr-mains')||{}).textContent||'');await page.click('#nr-x');await wait(900);
await page.click('[data-act="x"][data-v="rh|navw|l:julien|2026-11-16"]');await wait(400);await page.click('#nv-auto');await wait(900);
NJ=await nav('l:julien');E=await ecran();out.fin=[wk(NJ,'2026-11-16').etat,wk(NJ,'2026-11-16').h,wk(NJ,'2026-11-16').flags];out.regs=await page.evaluate(()=>[window.TRACE.rh.regle('2026-11-16'),window.TRACE.reg.all('navliss').filter(r=>r&&!r.deleted).length]);
console.log('r5)',J(Object.assign({},out,{lab:String(out.lab).slice(-420)})));
C.r5=/Chacun a ses heures réelles/.test(out.hint)&&out.dis===true&&out.reel[0]==='reel'&&J(out.reel[1])==='[10,6,8,8,8,null]'&&out.reel[2].includes('regle')&&out.radio==='reel'&&/la règle de la semaine pour tout le monde/.test(out.lab)
  &&J(out.apercu)==='["8","8","8","8","8"]'&&out.malgre[0]==='lisse'&&J(out.malgre[1])==='[8,8,8,8,8,null]'&&out.malgre[2].includes('main')&&out.malgre[3]===true&&out.regP&&out.regP.malgre===true&&out.regP.mode==='auto'
  &&/1 personne a sa semaine réglée à la main.*Julien/.test(out.mains)&&out.fin[0]==='lisse'&&J(out.fin[1])==='[8,8,8,8,8,null]'&&!out.fin[2].includes('regle')&&!out.fin[2].includes('main')&&out.regs[0]===null&&out.regs[1]===0&&!E.wkb.some(t=>/règle/.test(t));
// ── r6) S46 : le férié travaillé rendu au lissage pour tous, puis remis ; « lissé quand même » en aperçu dans la fenêtre de Julien
await page.click('[data-act="x"][data-v="rh|navr|2026-11-09"]');await wait(400);out={m:await modalTxt(),def:await page.evaluate(()=>[0,1,2,3,4,5].map(i=>[document.getElementById('nr-j'+i).checked,document.getElementById('nr-j'+i).dataset.def]))};
await page.evaluate(()=>{const c=document.getElementById('nr-j2');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));});out.hint=await page.evaluate(()=>document.getElementById('nr-hint').textContent);await page.fill('#nr-motif','accord (essai)');await page.click('#nr-ok');await wait(900);
NJ=await nav('l:julien');out.liss=[wk(NJ,'2026-11-09').h,wk(NJ,'2026-11-09').flags];
await page.click('[data-act="x"][data-v="rh|navr|2026-11-09"]');await wait(400);await page.evaluate(()=>{const c=document.getElementById('nr-j2');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});out.hint2=await page.evaluate(()=>document.getElementById('nr-hint').textContent);await page.click('#nr-ok');await wait(900);
NJ=await nav('l:julien');out.retour=[wk(NJ,'2026-11-09').h,wk(NJ,'2026-11-09').flags,await page.evaluate(()=>window.TRACE.rh.regle('2026-11-09'))];
await page.click('[data-act="x"][data-v="rh|navw|l:julien|2026-11-09"]');await wait(500);out.cb=await page.evaluate(()=>[0,1,2,3,4].map(i=>document.getElementById('nv-l'+i).checked));out.tag=await page.evaluate(()=>[...document.querySelectorAll('#nv-tab [data-fixe]')].map(x=>x.textContent));
await page.evaluate(()=>{const c=document.getElementById('nv-l2');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});await wait(200);out.apercu=await page.evaluate(()=>({h:[...document.querySelectorAll('#nv-tab tr')].slice(1,6).map(tr=>tr.children[2].textContent.trim()),bandeau:!document.getElementById('nv-apercu').hidden,expl:document.getElementById('nv-expl').textContent}));await closeM();await wait(200);
NJ=await nav('l:julien');out.apres=wk(NJ,'2026-11-09').h;
console.log('r6)',J(out).slice(0,1000));
C.r6=/férié · 1 l'ont travaillé/.test(out.m)&&J(out.def)==='[[false,"0"],[false,"0"],[true,"1"],[false,"0"],[false,"0"],[false,"0"]]'&&/Férié travaillé lissé comme un autre jour : mer 11\/11\./.test(out.hint)&&J(out.liss[0])==='[8.25,8.25,8.25,8.25,8.5,null]'&&out.liss[1].includes('regle')&&!out.liss[1].includes('ferieT')
  &&/calcul normal/.test(out.hint2)&&J(out.retour[0])==='[8.75,8.75,6.5,8.75,8.75,null]'&&out.retour[1].includes('ferieT')&&out.retour[2]===null&&J(out.cb)==='[true,true,false,true,true]'&&J(out.tag)==='["férié travaillé · au réel"]'
  &&J(out.apercu.h)==='["8,25","8,25","8,25","8,25","8,5"]'&&out.apercu.bandeau===true&&/lissé quand même \(à la main\), malgré le férié travaillé/.test(out.apercu.expl)&&J(out.apres)==='[8.75,8.75,6.5,8.75,8.75,null]';
// ── r7) Contrôle
await goRh('ctl');await wait(400);
const ctl=()=>page.evaluate(()=>{const A=document.getElementById('eq-app');const q=s=>[...A.querySelectorAll(s)];return {tiles:q('.ac-stat').map(x=>x.textContent.replace(/\s+/g,' ').trim()),als:q('[data-ctlal]').map(x=>x.dataset.ctlal+' : '+x.querySelector('.g').textContent.replace(/\s+/g,' ').trim()),ok:!!A.querySelector('[data-ctlok]'),
  wks:q('.rh-wks .chip').map(x=>x.textContent.replace(/\s+/g,' ').trim()),sem:(A.querySelector('.rh-sem')||{dataset:{}}).dataset.ctlw,grp:q('.rh-sem .rh-grp').map(x=>x.textContent.trim()),
  rows:Object.fromEntries(q('.rh-sem tr[data-p]').map(r=>[r.dataset.p,[...r.querySelectorAll('.rh-c')].map(c=>c.dataset.st+(c.textContent.trim()?':'+c.textContent.replace(/\s+/g,' ').trim():''))])),
  cal:Object.fromEntries(q('.rh-cal[data-cal=ctl] tr[data-p]').map(r=>[r.dataset.p,[...r.querySelectorAll('td.rh-dd')].map(c=>c.textContent.trim()||'.')])),calCls:q('.rh-cal[data-cal=ctl] td.rh-dd[data-d="2026-11-26"]').map(c=>c.className),leg:q('.rh-leg').map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,60))};});
let K=await ctl();console.log('r7)',J({tiles:K.tiles,als:K.als,wks:K.wks,sem:K.sem}));
/* 24/11 (Ethan : « les vendredis ne doivent pas donner de à régulariser, on travaille rarement le vendredi ») : 5 jours (Julien 1, Karim 4 : lundi → jeudi), 2 personnes —
   le vendredi 13/11 de Nina (planifiée, pas pointée) et le vendredi 20/11 de Karim ne sont plus des manques ; + la tuile « férié travaillé » (11/11 de Julien) */
C.r7=K.tiles.some(t=>/^4\s*personnes suivies/.test(t))&&K.tiles.some(t=>/^5\s*jours sans heures ni absence/.test(t))&&K.tiles.some(t=>/^2\s*personnes à régulariser/.test(t))&&K.tiles.some(t=>/^1\s*semaine entière vide/.test(t))&&K.tiles.some(t=>/^1\s*férié travaillé/.test(t))
  &&K.als.length===2&&K.als.some(a=>/^l:julien : S48 : mar 24\/11$/.test(a))&&K.als.some(a=>/^l:karim : S47 : semaine entière sans heures ni absence \(16\/11, 17\/11, 18\/11, 19\/11\)$/.test(a))&&!K.als.some(a=>/nina/.test(a))
  &&K.wks.length===6&&K.wks.some(t=>/^S47 .*4$/.test(t))&&!K.wks.some(t=>/^S46 .*\d$/.test(t.replace(/\d\d\/\d\d → \d\d\/\d\d/,'')))&&K.sem==='2026-11-16'; /* la première semaine qui a un manque : S47 (S46 n'en a plus) */
await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-09"]');await wait(500);K=await ctl();out={s46:K.rows,grp:K.grp};
await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-16"]');await wait(500);K=await ctl();out.s47=K.rows;await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-02"]');await wait(500);K=await ctl();out.s45=K.rows;out.cal=K.cal;out.calCls=K.calCls;out.leg=K.leg;
console.log('r7b)',J(out).slice(0,1500));
C.r7b=J(out.grp)==='["Salariés · 3","Intérimaires · 1"]'&&J(out.s46['l:ethan'])==='["np","np","fer:Férié","np","np","we","we"]'&&!out.s46['l:sophie']&&/^pt:10 hVillefictive — Centre$/.test(out.s46['l:julien'][0])&&/^pt:6,5 h FÉRIÉ/.test(out.s46['l:julien'][2])&&out.s46['l:karim'][2]==='fer:Férié'&&out.s46['prov:nina'][4]==='repos:—non travaillé'&&out.s46['prov:nina'][2]==='fer:Férié'&&out.s46['l:julien'][5]==='we' /* 24/11 : le férié travaillé porte « FÉRIÉ » ; le vendredi sans heures = « non travaillé », plus « ? » */
  &&out.s47['l:karim'].slice(0,4).every(c=>c==='trou:?prévu : Villefictive — Centre')&&out.s47['l:karim'][4]==='repos:—non travaillé'&&out.s47['prov:nina'].slice(0,5).every(c=>c==='hors')&&/^pt:10 h/.test(out.s47['l:julien'][0])
  &&out.s45['l:julien'][4]==='repos:—non travaillé'&&/^pt:7 h/.test(out.s45['l:karim'][4])
  &&out.cal['l:karim'].length===30&&out.cal['l:karim'].slice(15,20).join('')==='????–'&&out.cal['l:karim'].slice(22,27).join(' ')==='● ● ● CP ●'&&out.cal['l:julien'].slice(8,13).join(' ')==='● ● F● ● ●'&&out.cal['l:julien'][23]==='?'&&out.cal['l:julien'][5]==='–'&&out.cal['prov:nina'][12]==='–'&&out.cal['l:karim'][10]==='F'&&out.cal['l:julien'][0]==='.'&&out.calCls.some(c=>/\ba-cp\b/.test(c));
// ── r8) « 🏖 Absence » depuis l'alerte (pré-remplie), puis la case d'un jour
await page.click('[data-ctlal="l:karim"] [data-v^="rh|absnew|l:karim|"]');await wait(400);
out={pre:await page.evaluate(()=>{const g=k=>(document.getElementById(k)||{}).value;return [g('rh-p'),g('rh-du'),g('rh-au'),g('rh-jours')];})};
await page.evaluate(()=>{document.getElementById('rh-type').value='mal';});await page.click('#rh-ok');await wait(700);K=await ctl();out.tiles=K.tiles;out.als=K.als;
await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-23"]');await wait(500);await page.click('.rh-sem tr[data-p="l:julien"] .rh-c.trou');await wait(400);
out.jour=await page.evaluate(()=>({t:(document.querySelector('#modal.show')||document.getElementById('modal')).textContent.replace(/\s+/g,' '),st:(document.getElementById('cd-etat')||{dataset:{}}).dataset.st,abs:!!document.getElementById('cd-abs'),nav:!!document.getElementById('cd-nav')}));
await page.click('#cd-nav');await wait(500);out.sem=await modalTxt();await closeM();await wait(200);
await page.click('.rh-sem tr[data-p="l:karim"] .rh-c.abs');await wait(400);out.jabs=await page.evaluate(()=>({t:(document.querySelector('#modal.show')||document.getElementById('modal')).textContent.replace(/\s+/g,' '),e:!!document.getElementById('cd-abse'),a:!!document.getElementById('cd-abs')}));await closeM();await wait(200);
console.log('r8)',J(out).slice(0,1100));
C.r8=J(out.pre)==='["l:karim","2026-11-16","2026-11-19","4"]'&&out.tiles.some(t=>/^1\s*jour sans heures ni absence/.test(t))&&out.tiles.some(t=>/^1\s*personne à régulariser/.test(t))&&out.tiles.some(t=>/^0\s*semaine entière vide/.test(t))&&out.als.length===1&&!out.als.some(a=>/karim/.test(a)) /* 24/11 : du lundi au jeudi (le vendredi n'est plus un manque) ; il reste le mardi 24/11 de Julien */
  &&/Julien .*mar 24\/11\/2026/.test(out.jour.t)&&out.jour.st==='trou'&&/Ni heures ni absence — prévu au planning : Villefictive — Centre/.test(out.jour.t)&&/Pilotage → Pointages à valider/.test(out.jour.t)&&out.jour.abs&&out.jour.nav
  &&/S48/.test(out.sem)&&/Lissage en attente : mardi 24\/11 \(attendu, sans pointage ni absence\)/.test(out.sem)&&/Congés payés \(déclarée dans Absences\)/.test(out.jabs.t)&&out.jabs.e&&!out.jabs.a;
// ── r9) population : intérimaires, salariés ; mutuelle
await page.click('[data-act="x"][data-v="rh|pop|int"]');await wait(500);K=await ctl();out={ctlInt:[Object.keys(K.rows),K.tiles[0],K.als.length,await page.evaluate(()=>document.querySelector('.rh2').dataset.rhpop)]};
await goRh('nav');await wait(500);E=await ecran();out.navInt=[E.pers.map(x=>x.p),E.grp,E.dl,E.dlTxt,E.tot.map(t=>t.g)];
const [dl]=await Promise.all([page.waitForEvent('download',{timeout:15000}),page.click('#eq-app [data-act=gdnavall]')]);const f=await dl.path();out.file=dl.suggestedFilename();{const wb=await openXlsx(new Uint8Array(fs.readFileSync(f)).buffer);out.sheets=wb.sheets.map(x=>x.name);}
await page.click('[data-act="x"][data-v="rh|pop|sal"]');await wait(500);E=await ecran();out.navSal=[E.pers.map(x=>x.p),E.grp,E.dl,E.dlTxt];
await goRh('mut');await wait(400);out.mutSal=await txt();await page.click('[data-act="x"][data-v="rh|pop|tous"]');await wait(500);out.mutTous=await txt();
console.log('r9)',J({ctlInt:out.ctlInt,navInt:out.navInt,file:out.file,sheets:out.sheets,navSal:out.navSal,mut:out.mutTous.slice(out.mutTous.indexOf('Sans ligne mutuelle'),out.mutTous.indexOf('Sans ligne mutuelle')+260)}));
C.r9=J(out.ctlInt[0])==='["prov:nina"]'&&/^1\s*personne suivie/.test(out.ctlInt[1])&&out.ctlInt[2]===0&&out.ctlInt[3]==='int'&&J(out.navInt[0])==='["prov:nina"]'&&J(out.navInt[1])==='["Intérimaires · 1"]'&&out.navInt[2]==='2026-11|int'&&/Navettes des intérimaires · novembre 2026/.test(out.navInt[3])&&J(out.navInt[4])==='["int"]'
  &&out.file==='Navettes_2026-11_interimaires.xlsx'&&Array.isArray(out.sheets)&&out.sheets.length===1&&J(out.navSal[0])==='["l:julien","l:karim"]'&&out.navSal[2]==='2026-11|sal'&&/Navettes des salariés/.test(out.navSal[3])
  &&/Sans ligne mutuelle · \d+/.test(out.mutTous)&&!/Nina/.test(out.mutTous.slice(out.mutTous.indexOf('Sans ligne mutuelle'),out.mutTous.indexOf('Tout le monde')))&&/Intérimaires · 1[\s\S]*Nina[\s\S]*agence d'intérim/.test(out.mutTous.slice(out.mutTous.indexOf('Tout le monde'),out.mutTous.indexOf('Affiliations et dispenses'))) /* 24/11 (L32) : la carte « Tout le monde » liste les intérimaires à part */&&/Julien/.test(out.mutTous)&&/Les intérimaires relèvent de leur agence/.test(out.mutTous);
// ── r10) tableau de bord : plus de « Variables de paie » ; le rapport reste ouvert depuis les Navettes ; la tuile du contrôle
await goRh('home');await wait(400);
out=await page.evaluate(()=>{const A=document.getElementById('eq-app');const card=[...A.querySelectorAll('.card')].find(c=>/Ailleurs dans Tracé/.test((c.querySelector('h3')||{}).textContent||''));const af=A.querySelector('[data-afaire]'); /* 24/11 : « À faire » remplace les raccourcis qui doublaient les onglets */
  return {rac:card?[...card.querySelectorAll('button')].map(b=>b.textContent.replace(/\s+/g,' ').trim()):null,tabs:[...A.querySelectorAll('.rh-tabs .btn')].map(b=>b.textContent.replace(/\s+/g,' ').trim()),dbl:[...A.querySelectorAll('.card [data-v="rh|tab|nav"],.card [data-v="rh|tab|ctl"],.card [data-v="rh|tab|gd"],.card [data-v="rh|tab|cpt"]')].filter(b=>!b.closest('[data-afaire]')).length, /* hors « À faire » (ses boutons ouvrent l'écran où ça se traite) */
    todo:af?[...af.querySelectorAll('.rh-todo')].map(x=>x.dataset.todo+' = '+x.querySelector('.n').textContent+' '+x.querySelector('.g b').textContent):null,tile:[...A.querySelectorAll('button.ac-stat')].map(b=>b.textContent.replace(/\s+/g,' ').trim()+'→'+b.dataset.v),alerte:!!(af&&af.querySelector('[data-todo="ctlm|2026-11"] button'))};});
await page.click('#eq-app button.ac-stat[data-v="rh|ctlm|2026-11"]');await wait(500);out.ctl=await page.evaluate(()=>!!document.querySelector('#eq-app .rh-sem')&&/Contrôle/.test((document.querySelector('.rh-tabs .btn.primary')||{}).textContent||'')&&/Novembre 2026/.test((document.querySelector('#eq-app .eq-wktitle')||{}).textContent||''));
await goRh('nav');await wait(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app button')].find(x=>/Rapport de la semaine \(CSV\)/.test(x.textContent));if(b)b.click();});await wait(700);
out.paie=await page.evaluate(()=>({sect:(document.querySelector('#eq-app .rh-sect')||{}).textContent||'',csv:!!document.querySelector('#eq-app [data-act=rapcsv],#eq-app [data-act^=rap]')}));
console.log('r10)',J(out));
C.r10=Array.isArray(out.rac)&&!out.rac.some(t=>/Variables de paie/.test(t))&&out.rac.some(t=>/Déclarations d'accident/.test(t))&&out.rac.some(t=>/Habilitations de l'équipe/.test(t))&&out.dbl===0
  &&['Navettes','Contrôle','Grands déplacements','Compteurs d\'heures'].every(n=>out.tabs.some(t=>t.includes(n))) /* les écrans restent : par les onglets */
  &&Array.isArray(out.todo)&&out.todo.some(t=>/^ctlm\|2026-11 = 1 jour sans heures ni absence$/.test(t))
  &&out.tile.some(t=>/^1\s*jour sans heures ni absence · depuis le 1er novembre→rh\|ctlm\|2026-11$/.test(t))&&out.alerte&&out.ctl&&/Variables de paie · rapport de la semaine/.test(out.paie.sect);
// ── r11) grands déplacements : « non concerné »
await goRh('gd');await wait(1500);
const gd=()=>page.evaluate(()=>{const A=document.getElementById('eq-app');const c=A.querySelector('[data-gdaddr]');const n=A.querySelector('[data-gdncl]');return {addr:c?c.textContent.replace(/\s+/g,' ').slice(0,400):'',rows:c?[...c.querySelectorAll('.eq-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim().slice(0,90)):[],btn:c?[...c.querySelectorAll('[data-act=gdnc]')].map(b=>b.dataset.v):[],nc:n?n.textContent.replace(/\s+/g,' ').trim():'',tag:[...A.querySelectorAll('[data-gdnc]')].length};});
out={avant:await gd()};await page.click('#eq-app [data-act=gdnc][data-v="l:karim"]');await wait(300);out.modal=await modalTxt();await page.fill('#nc-n','logé sur place (essai)');await page.click('#nc-ok');await wait(900);out.apres=await gd();
out.reg=await page.evaluate(()=>window.TRACE.reg.get('gdx','force|l:karim'));out.navK=await page.evaluate(()=>{const N=window.TRACE.espace.navette('l:karim','2026-11').N;return [N.tot.hotel+N.tot.idf,N.tot.repas];});
await page.evaluate(()=>{const d=document.querySelector('#eq-app [data-gdncl]');if(d)d.open=true;});await page.click('#eq-app [data-act=gdncx][data-v="l:karim"]');await wait(900);out.remis=await gd();out.reg2=await page.evaluate(()=>window.TRACE.reg.get('gdx','force|l:karim'));
console.log('r11)',J(out).slice(0,1300));
C.r11=/Adresses à vérifier · \d+/.test(out.avant.addr)&&out.avant.btn.includes('l:karim')&&out.avant.rows.some(r=>/Karim/.test(r))&&!out.avant.nc&&/Non concerné par le grand déplacement — Karim/.test(out.modal)&&/Aucune indemnité de déplacement/.test(out.modal)
  &&!out.apres.rows.some(r=>/Karim/.test(r))&&/Non concernés par le grand déplacement · 1/.test(out.apres.nc)&&/Karim.*logé sur place \(essai\)/.test(out.apres.nc)&&out.reg&&out.reg.nc===true&&out.reg.cas===1&&J(out.navK)==='[0,0]'
  &&out.remis.rows.some(r=>/Karim/.test(r))&&!out.remis.nc&&out.reg2&&out.reg2.deleted===true;
// ── r12) Absences : le calendrier du mois
await goRh('abs');await wait(500);
out=await page.evaluate(()=>{const A=document.getElementById('eq-app');const c=A.querySelector('[data-abscal]');if(!c)return null;return {t:c.querySelector('.eq-wktitle').textContent.replace(/\s+/g,' ').trim(),rows:Object.fromEntries([...c.querySelectorAll('.rh-cal tr[data-p]')].map(r=>[r.dataset.p,[...r.querySelectorAll('td.rh-dd')].map(x=>x.textContent.trim()||'.')])),leg:(c.querySelector('.rh-leg')||{}).textContent||'',q:c.querySelectorAll('td.rh-dd.trou,td.rh-dd.pt').length,clic:c.querySelectorAll('td.rh-dd[data-act]').length};});
console.log('r12)',J(out).slice(0,700));
C.r12=!!out&&/Calendrier des absences · Novembre 2026/.test(out.t)&&/1 personne absente dans le mois/.test(out.t)&&Object.keys(out.rows).join()==='l:karim'&&out.rows['l:karim'].slice(15,20).join(' ')==='MAL MAL MAL MAL .'&&out.rows['l:karim'][25]==='CP'&&out.rows['l:karim'][10]==='F'&&out.rows['l:karim'][0]==='.'&&out.q===0&&out.clic===5&&/Congés payés/.test(out.leg)&&/Maladie/.test(out.leg);
// ── r13) un compagnon (Karim) : son dossier ; ni Contrôle, ni population ; la règle de la semaine lui est refusée
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await wait(500);await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=document.getElementById('htRh');if(b&&b.offsetParent!==null){b.click();await w(500);}});
out=await page.evaluate(()=>{const A=document.getElementById('eq-app');const rh=A&&A.querySelector('.rh2');return {rh:!!rh,head:rh?(rh.querySelector('h2.vt')||{}).textContent:'',tabs:rh?[...rh.querySelectorAll('.rh-tabs button')].map(b=>b.dataset.v):[],pop:rh?rh.querySelectorAll('.rh-popb').length:0,vis:!!(document.getElementById('htRh')&&document.getElementById('htRh').offsetParent!==null)};});
out.regle=await page.evaluate(()=>{const b=document.createElement('button');b.dataset.act='x';b.dataset.v='rh|navr|2026-11-16';const A=document.getElementById('eq-app');A.appendChild(b);b.click();b.remove();return {modal:!!document.getElementById('nr-ok'),toast:document.getElementById('toast').textContent};});
console.log('r13)',J(out));
C.r13=(!out.rh||(/mon dossier/.test(out.head)&&!out.tabs.includes('rh|tab|ctl')&&!out.tabs.includes('rh|tab|nav')&&out.pop===0))&&!out.regle.modal&&/Réservé/.test(out.regle.toast);
// ── r14) habillage : onglets sur une ligne, téléphone 390 px sans débordement de page
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await wait(400);await goRh('ctl');await wait(400);
out={grand:await page.evaluate(()=>{const r=document.querySelector('.rh2');const tb=r.querySelector('.rh-tabs');const cs=getComputedStyle(tb);const hd=r.querySelector('.rh-head');const tops=[...tb.children].map(b=>b.getBoundingClientRect().top);return {css:!!document.getElementById('css-rh2'),wrap:cs.flexWrap,ligne:Math.max(...tops)-Math.min(...tops)<2,bg:getComputedStyle(hd).backgroundImage.slice(0,15),h2:getComputedStyle(hd.querySelector('h2')).color,actif:getComputedStyle(tb.querySelector('.btn.primary')).backgroundColor,n:tb.children.length};})};
await page.setViewportSize({width:390,height:800});await wait(500);
out.tel=await page.evaluate(()=>{const r=document.querySelector('.rh2');const tb=r.querySelector('.rh-tabs');const tops=[...tb.children].map(b=>b.getBoundingClientRect().top);const de=document.documentElement;return {page:de.scrollWidth<=de.clientWidth+1,ligne:Math.max(...tops)-Math.min(...tops)<2,defile:tb.scrollWidth>tb.clientWidth,hTab:Math.round(tb.children[0].getBoundingClientRect().height),grille:(()=>{const g=r.querySelector('.rh-grid');return g?g.scrollWidth>g.clientWidth&&g.getBoundingClientRect().right<=de.clientWidth+1:null;})(),case:Math.round((r.querySelector('.rh-sem .rh-c.pt,.rh-sem .rh-c.futur,.rh-sem .rh-c.trou')||r.querySelector('.rh-sem .rh-c')).getBoundingClientRect().height)};});
await page.setViewportSize({width:1280,height:1000});await wait(300);
console.log('r14)',J(out));
C.r14=out.grand.css&&out.grand.wrap==='nowrap'&&out.grand.ligne&&/gradient/.test(out.grand.bg)&&out.grand.h2==='rgb(255, 255, 255)'&&out.grand.actif==='rgb(43, 27, 90)'&&out.grand.n>=10&&out.tel.page&&out.tel.ligne&&out.tel.defile&&out.tel.hTab>=40&&out.tel.grille===true&&out.tel.case>=44;
// ── r15) console
console.log('r15) console :',J(logs.slice(0,5)));C.r15=logs.length===0;
const KO=Object.keys(C).filter(k=>!C[k]);console.log(J(C));console.log(KO.length?'RESULTAT: ECHEC '+KO.join(','):'RESULTAT: TOUT VERT');await browser.close();process.exit(KO.length?1:0);
