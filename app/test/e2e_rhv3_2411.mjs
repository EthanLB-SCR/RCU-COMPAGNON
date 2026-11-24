// MODULE RH v3 (24/11/2026, retours d'Ethan sur le module RH) — de bout en bout, personnages de démo (rien ne part au serveur), novembre 2026, aujourd'hui mardi 01/12.
//  « il y a des doublons dans le ruban ; pour le contrôle les vendredis ne doivent pas donner de à régulariser ; un petit visuel quand un jour férié est travaillé ;
//    grands déplacements : séparer aussi les salariés des intérimaires ; pourquoi je n'ai rien en GD S47 alors que les gars ont travaillé ? ; les totaux affichés doivent avoir
//    le même arrondi ; deux types d'hôtel, GD IDF et GD province : deux colonnes ; les fériés au réel mais plafonnés à 12 h, le reste lissé sur les autres jours ou en surplus
//    au-delà de 48 h ; le vrai logo sur les navettes ; sur « Toutes les navettes », par semaine le nombre de GD et de repas ; un petit panneau pour poser une règle commune
//    sur une semaine ou un mois (fériés, ponts) ; le contrôle : une vue sur le réel pointé et une vue sur les navettes, le lissé, avec la même vue ; les intérimaires : on n'a
//    souvent pas leur adresse (RGPD), c'est l'agence qui calcule avec nos règles ; le tableau de bord ne remonte rien. »
// Données fictives. Julien (salarié, domicile Rennes) : S45 4 × 9 h à Villefictive — Centre (ville : Caen) ; S46 10 · 9 · 13,5 le MERCREDI 11/11 FÉRIÉ · 9 · 7 ;
//  S47 PAS PLANIFIÉ mais pointé du lundi au jeudi à Villefictive — Nord (ville : Paris), minutes quelconques ; S48 lundi, mercredi, jeudi, vendredi (mardi 24/11 sans rien).
//  Karim (salarié, sans adresse) : S45 5 × 7 ; S46 9 · 9 · férié · 9 · 9 ; S47 planifié, rien de pointé ; S48 4 × 8,37. Nina (intérimaire, Agence Fictive, sans adresse) :
//  S46 planifiée lun mar jeu ven, pointée lun mar jeu.
//  v1  férié travaillé plafonné à 12 h : S46 de Julien = 9 · 9 · 12 · 9 · 9 (48 h), 0,5 h au-delà de 48 h ; l'explication le dit
//  v2  tout au quart d'heure : chaque semaine, chaque mois, chaque colonne d'heures sup à l'écran (et la navette Excel) est un multiple de ¼ h, malgré des minutes quelconques
//  v3  ruban : plus de bouton vers un onglet dans l'en-tête des Navettes ni du Contrôle ; le téléchargement et le rapport de la semaine restent
//  v4  panneau « 📌 Règles communes » en haut des Navettes : une pastille par semaine, « Tout le mois » ; règle du mois (samedis au réel) posée sur les 4 semaines puis retirée
//  v5  règle de la semaine S47 : vendredi 20/11 « non travaillé pour tout le monde » (PONT) → ni attendu, ni lissé ; la navette porte PONT ; le Contrôle montre « Pont »
//  v6  Contrôle : le vendredi n'est jamais « à régulariser » ; le férié travaillé est marqué (grille, calendrier, légende, tuile)
//  v7  Contrôle, vue « Navette (lissé) » : les mêmes tableaux avec les heures de la navette, l'état de la semaine, les heures sup ; une case ouvre la semaine
//  v8  grands déplacements : S47 pointée sans planning → comptée (chantier pointé d'abord) ; nuits en Île-de-France à part ; salariés / intérimaires ; population
//  v9  intérimaire sans adresse : « calculé par l'agence d'intérim », pas dans les adresses à vérifier ; le salarié sans adresse y reste
//  v10 « Toutes les navettes » : nuits et repas sous chaque semaine, colonnes Hôtel / Hôtel IDF / Repas / Trajets = la navette ; montants réglés → € affichés
//  v11 logo de l'entreprise sur la navette Excel (image dans le classeur, plus de texte « SCR ») ; sans logo : le texte, comme avant
//  v12 tableau de bord : « À faire » (contrôle, navettes, grands déplacements, adresses…), chaque ligne ouvre son écran ; chiffres du mois ; plus de raccourcis en double
//  v13 console propre ; téléphone 390 px sans débordement de page
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const q=strip(new URL(route.request().url()).searchParams.get('q'));const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('rennes')?F(-1.6778,48.1173,'35000'):q==='caen'?F(-0.3707,49.1829,'14000'):q==='paris'?F(2.3522,48.8566,'75001'):{type:'FeatureCollection',features:[]};route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);const quart=v=>Math.abs(v*4-Math.round(v*4))<1e-6;
const shot=async n=>{if(!SHOTS)return;try{fs.mkdirSync(SHOTS,{recursive:true});const v=page.viewportSize();await page.setViewportSize({width:v.width,height:2400});await page.waitForTimeout(250);await page.screenshot({path:SHOTS+'/'+n+'.png'});await page.setViewportSize(v);await page.waitForTimeout(150);}catch(e){console.log('capture',n,String(e).slice(0,80));}}; /* captures (SHOTS=dossier) : écran haut, pour voir tout l'écran */
await page.clock.install({time:new Date(2026,11,1,8,30,0)}); /* mardi 01/12/2026 */
const LOGO='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><rect width="300" height="100" rx="14" fill="#1f6fd0"/><text x="150" y="62" font-family="Arial" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">FICTIVE</text></svg>').toString('base64');
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
// ── 0) deux chantiers fictifs (province, Île-de-France), l'intérimaire, le planning et les pointages de novembre
const HRS={'l:julien':{'2026-11-02':[9,9,9,9,null],'2026-11-09':[10,9,13.5,9,7],'2026-11-16':[9.13,9.07,9.2,8.33,null],'2026-11-23':[8,null,8,8,8],'2026-11-30':[8,null,null,null,null]},
  'l:karim':{'2026-11-02':[7,7,7,7,7],'2026-11-09':[9,9,null,9,9],'2026-11-16':[null,null,null,null,null],'2026-11-23':[8.37,8.37,8.37,8.37,null],'2026-11-30':[8,null,null,null,null]},
  'prov:nina':{'2026-11-09':[8,8,null,8,null]}};
const SITE={'l:julien|2026-11-16':'demo_idf'}; /* la semaine de Julien pointée en Île-de-France */
const PLAN={'l:julien':{'2026-11-02':[1,1,1,1,0],'2026-11-09':[1,1,1,1,1],'2026-11-16':[0,0,0,0,0],'2026-11-23':[1,1,1,1,1],'2026-11-30':[1,1,1,1,1]},'l:karim':{'2026-11-02':[1,1,1,1,1],'2026-11-09':[1,1,0,1,1],'2026-11-16':[1,1,1,1,1],'2026-11-23':[1,1,1,1,1],'2026-11-30':[1,1,1,1,1]},'prov:nina':{'2026-11-09':[1,1,0,1,1]}};
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(400);});
await page.evaluate(({HRS,PLAN,SITE})=>{const T=window.TRACE;T.rh.provTest('nina',{prenom:'Nina',nom:'FICTIVE',poste:'soudeur',type:'interim',agence:'Agence Fictive'});
  const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];
  const mk=(id,name,ville)=>{const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites[id]=x;};
  mk('demo_vf','Villefictive — Centre','Caen');mk('demo_idf','Villefictive — Nord','Paris');
  const ST=T.espace.state();ST.people['l:julien']=Object.assign({},ST.people['l:julien']||{},{adresse:{voie:'4 rue des Essais',cp:'35000',ville:'RENNES'}});
  const wkKey=s=>{const x2=new Date(s+'T12:00:00');x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  const add=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const end=h=>{const m=420+60+Math.round(h*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
  Object.keys(PLAN).forEach(p=>Object.keys(PLAN[p]).forEach(mon=>{const pj={};PLAN[p][mon].forEach((on,i)=>{pj[add(mon,i)]=on?['demo_vf']:[];});T.espace.savePlanning(wkKey(mon),{[p]:pj});}));
  Object.keys(HRS).forEach(p=>Object.keys(HRS[p]).forEach(mon=>HRS[p][mon].forEach((h,i)=>{if(h===null)return;const d=add(mon,i);ST.pointages.push({p,d,site:SITE[p+'|'+mon]||'demo_vf',status:'declare',corr:null,events:[{t:'start',at:d+'T07:00'},{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T13:00'},{t:'end',at:d+'T'+end(h)}],val:[]});})));
  T.state.userId='ethan';T.renderHome();},{HRS,PLAN,SITE});await wait(500);
const goRh=async tab=>{await page.evaluate(async t=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(350);const b=document.querySelector('#eq-app .rh-tabs [data-act="x"][data-v="rh|tab|'+t+'"]');if(b){b.click();await w(500);}},tab);};
const txt=()=>page.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const modalTxt=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show')||document.getElementById('modal');return m?m.textContent.replace(/\s+/g,' '):'';});
const closeM=()=>page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});
const nav=pid=>page.evaluate(p=>{const R=window.TRACE.espace.navette(p,'2026-11');const N=R.N;return {weeks:N.weeks.map(w=>({mon:w.mon,n:w.n,total:w.total,hs125:w.hs125,hs150:w.hs150,report:w.report,gd:w.gd,etat:w.liss&&w.liss.etat,h:w.liss?w.liss.jours.map(j=>j.h):null,flags:w.liss?w.liss.flags:[],expl:w.liss?w.liss.expl.join(' | '):'',labs:w.liss?w.liss.jours.map(j=>j.lab||''):[]})),hs:N.hs,tot:N.tot,ar:N.ar,lines:N.lines.filter(l=>l.kind==='day').map(l=>[l.d,l.hours,l.chantier])};},pid);
const wk=(N,mon)=>N.weeks.find(w=>w.mon===mon);
// ── v1) férié travaillé plafonné à 12 h
await goRh('nav');await page.click('[data-act="x"][data-v="rh|navm|2026-11"]').catch(()=>{});await wait(900);
let NJ=await nav('l:julien'),NK=await nav('l:karim'),NN=await nav('prov:nina');const s46=wk(NJ,'2026-11-09');
console.log('v1) Julien S46 :',J(s46.h),s46.total,'HS',s46.hs125,s46.hs150,'au-delà',s46.report,'|',s46.expl.slice(0,420));
C.v1=J(s46.h)==='[9,9,12,9,9,null]'&&s46.total===48&&s46.hs125===8&&s46.hs150===5&&Math.abs(s46.report-0.5)<0.006&&/férié travaillé — 12 h au réel/.test(s46.expl)&&/13,5 h pointées, plafonné à 12 h/.test(s46.expl)
  &&NJ.lines.find(l=>l[0]==='2026-11-11')[1]===12&&/FÉRIÉ TRAVAILLÉ/.test(NJ.lines.find(l=>l[0]==='2026-11-11')[2]);
// ── v2) tout au quart d'heure (minutes quelconques en S47 pour Julien, en S48 pour Karim)
const ecran=()=>page.evaluate(()=>{const num=s=>{const t=String(s||'').replace(/\s+/g,' ').trim().replace(',','.');const m=/-?\d+(\.\d+)?/.exec(t);return m?+m[0]:0;};const T=document.querySelector('#eq-app table.nav-tab');if(!T)return null;const rows=[...T.querySelectorAll('tr')];const nW=T.querySelectorAll('.rh-wkb').length;
  return {heads:[...rows[0].children].map(c=>c.textContent.replace(/\s+/g,' ').trim()),grp:rows.filter(r=>r.classList.contains('rh-grp')).map(r=>r.textContent.replace(/\s+/g,' ').trim()),
    pers:rows.filter(r=>r.dataset.p).map(r=>({p:r.dataset.p,weeks:[...r.querySelectorAll('.nav-cell b')].map(b=>num(b.textContent)),gdw:[...r.children].slice(1,1+nW).map(c=>(c.querySelector('.nav-gd')||{dataset:{}}).dataset.gdw||''),gdTxt:[...r.children].slice(1,1+nW).map(c=>((c.querySelector('.nav-gd')||{}).textContent||'').trim()),mois:num((r.querySelector('[data-mois]')||{}).textContent),h125:num((r.querySelector('[data-hs="125"]')||{}).textContent),h150:num((r.querySelector('[data-hs="150"]')||{}).textContent),rep:num((r.querySelector('[data-hs="rep"]')||{}).textContent),
      gd:Object.fromEntries([...r.querySelectorAll('[data-gd]')].map(c=>[c.dataset.gd,c.textContent.replace(/\s+/g,' ').trim()]))})),
    tot:rows.filter(r=>r.classList.contains('rh-tot')).map(r=>({g:r.dataset.tot,mois:num((r.querySelector('[data-mois]')||{}).textContent),h125:num(r.querySelector('[data-hs="125"]').textContent),h150:num(r.querySelector('[data-hs="150"]').textContent),w:[...r.children].slice(1,1+nW).map(c=>num(c.textContent)),gd:Object.fromEntries([...r.querySelectorAll('[data-gd]')].map(c=>[c.dataset.gd,num(c.textContent)]))}))};});
let E=await ecran();const brut={j47:9.13+9.07+9.2+8.33,k48:4*8.37};
const tous=E.pers.flatMap(r=>r.weeks.concat([r.mois,r.h125,r.h150,r.rep])).concat(E.tot.flatMap(t=>t.w.concat([t.mois,t.h125,t.h150])));
const eJ=E.pers.find(x=>x.p==='l:julien'),eK=E.pers.find(x=>x.p==='l:karim');
console.log('v2) écran :',J(E.pers.map(r=>[r.p,r.weeks,r.mois,r.h125,r.h150])),'| totaux',J(E.tot.map(t=>[t.g,t.w,t.mois,t.h125,t.h150])),'| brut S47 Julien',brut.j47.toFixed(2),'→',wk(NJ,'2026-11-16').total,'| brut S48 Karim',brut.k48.toFixed(2),'→',wk(NK,'2026-11-23').total);
C.v2=tous.length>20&&tous.every(quart)&&!quart(brut.j47)&&!quart(brut.k48)&&wk(NJ,'2026-11-16').total===35.75&&wk(NK,'2026-11-23').total===33.5&&NJ.weeks.concat(NK.weeks,NN.weeks).every(w=>quart(w.total)&&quart(w.hs125)&&quart(w.hs150)&&(w.h||[]).every(h=>h===null||quart(h)))
  &&NJ.lines.concat(NK.lines).every(l=>l[1]===null||l[1]===undefined||quart(l[1]))&&eJ&&Math.abs(eJ.mois-NJ.weeks.reduce((t,w)=>t+w.total,0))<0.006&&eK&&Math.abs(eK.weeks[3]-33.5)<0.006;
await shot('01_navettes');
// ── v3) ruban sans doublons
const hors=sel=>page.evaluate(s=>[...document.querySelectorAll('#eq-app '+s)].filter(b=>!b.closest('.rh-tabs')).length,sel);
let out={navDbl:await hors('[data-v="rh|tab|ctl"],[data-v="rh|tab|gd"],[data-v="rh|tab|cpt"],[data-v="rh|tab|abs"]'),dl:await page.evaluate(()=>!!document.querySelector('#eq-app [data-act=gdnavall]')),rap:await page.evaluate(()=>[...document.querySelectorAll('#eq-app button')].some(b=>/Rapport de la semaine \(CSV\)/.test(b.textContent))),tabs:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .rh-tabs .btn')].map(b=>b.dataset.v))};
await goRh('ctl');await wait(400);out.ctlDbl=await hors('[data-v="rh|tab|nav"],[data-v="rh|tab|abs"],[data-v="rh|tab|gd"],[data-v="rh|tab|cpt"]');
console.log('v3)',J(out));
C.v3=out.navDbl===0&&out.ctlDbl===0&&out.dl&&out.rap&&['rh|tab|home','rh|tab|ctl','rh|tab|nav','rh|tab|gd','rh|tab|cpt','rh|tab|abs'].every(t=>out.tabs.includes(t));
// ── v4) panneau « Règles communes » ; règle du mois
await goRh('nav');await wait(500);
const panneau=()=>page.evaluate(()=>{const c=document.querySelector('#eq-app [data-regles]');if(!c)return null;return {t:c.querySelector('h3').textContent.replace(/\s+/g,' ').trim(),chips:[...c.querySelectorAll('[data-regw]')].map(b=>b.dataset.regw+(b.classList.contains('active')?'*':'')+' '+b.textContent.replace(/\s+/g,' ').trim()),mois:!!c.querySelector('[data-regm]'),on:[...c.querySelectorAll('[data-regon]')].map(r=>r.dataset.regon+' : '+r.textContent.replace(/\s+/g,' ').trim()),none:!!c.querySelector('[data-regnone]'),pos:c.getBoundingClientRect().top<(document.querySelector('#eq-app table.nav-tab')||c).getBoundingClientRect().top};});
out={p0:await panneau()};
await page.click('#eq-app [data-regm]');await wait(400);out.mTitre=(await modalTxt()).slice(0,140);
out.mJours=await page.evaluate(()=>[0,1,2,3,4,5].map(i=>document.getElementById('nr-j'+i).parentElement.textContent.replace(/\s+/g,' ').trim()));
await page.evaluate(()=>{const c=document.getElementById('nr-j5');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});await wait(150);out.mHint=await page.evaluate(()=>document.getElementById('nr-hint').textContent);
await page.click('#nr-ok');await wait(300);out.mSansMotif=!!(await page.$('#modal.show #nr-ok'))||/Indique le motif/.test(await txt());
await page.fill('#nr-motif','samedis payés à part (essai)');await page.click('#nr-ok');await wait(700);
out.regM=await page.evaluate(()=>['2026-11-02','2026-11-09','2026-11-16','2026-11-23'].map(m=>{const r=window.TRACE.rh.regle(m);return r?[r.mois,(r.reel||[]).join(),r.motif]:null;}));out.p1=await panneau();
await page.click('#eq-app [data-regm]');await wait(400);out.mRetour=await page.evaluate(()=>({sam:document.getElementById('nr-j5').checked,x:!!document.getElementById('nr-x')}));await page.click('#nr-x');await wait(700);
out.regX=await page.evaluate(()=>['2026-11-02','2026-11-09','2026-11-16','2026-11-23'].map(m=>window.TRACE.rh.regle(m)));out.p2=await panneau();
console.log('v4)',J(out).slice(0,1700));
C.v4=!!out.p0&&/Règles communes/.test(out.p0.t)&&out.p0.chips.length===4&&out.p0.chips.some(c=>/^2026-11-09 S46 .*férié mer 11\/11/.test(c))&&out.p0.mois&&out.p0.none&&out.p0.pos
  &&/Règle commune du mois · Novembre 2026/.test(out.mTitre)&&/S45 → S48 \(4 semaines\)/.test(out.mTitre)&&out.mJours[5]==='Samedis'&&/Au réel pour tous : samedis\./.test(out.mHint)&&/Posé sur 4 semaines du mois/.test(out.mHint)&&out.mSansMotif
  &&J(out.regM)===J([['2026-11','2026-11-07','samedis payés à part (essai)'],['2026-11','2026-11-14','samedis payés à part (essai)'],['2026-11','2026-11-21','samedis payés à part (essai)'],['2026-11','2026-11-28','samedis payés à part (essai)']])
  &&out.p1.on.length===4&&out.p1.chips.every(c=>/\*/.test(c))&&/règle du mois/.test(out.p1.on[0])&&out.mRetour.sam&&out.mRetour.x&&out.regX.every(r=>!r)&&out.p2.none&&out.p2.on.length===0;
// ── v5) règle de la semaine S47 : vendredi 20/11 non travaillé pour tout le monde (PONT)
const avant=wk(NJ,'2026-11-16');
await page.click('#eq-app [data-regw="2026-11-16"]');await wait(400);out={titre:(await modalTxt()).slice(0,90)};
await page.evaluate(()=>{const c=document.getElementById('nr-f4');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});await wait(150);
out.hint=await page.evaluate(()=>document.getElementById('nr-hint').textContent);out.jDis=await page.evaluate(()=>document.getElementById('nr-j4').disabled);out.lab=await page.evaluate(()=>document.getElementById('nr-flab').value);
await page.fill('#nr-motif','pont du 20 novembre (essai)');await page.click('#nr-ok');await wait(800);
out.reg=await page.evaluate(()=>{const r=window.TRACE.rh.regle('2026-11-16');return r&&{ferme:r.ferme,lab:r.fermeLab,motif:r.motif,mois:r.mois||null};});
NJ=await nav('l:julien');NK=await nav('l:karim');const apres=wk(NJ,'2026-11-16');out.avant=avant.h;out.apres=apres.h;out.labs=apres.labs;out.flags=apres.flags;out.expl=apres.expl.slice(0,260);out.ligne=NJ.lines.find(l=>l[0]==='2026-11-20');out.p=await panneau();
out.ctl=await page.evaluate(()=>{const D=window.TRACE.rh.controle('2026-11');const k=D.people.find(x=>x.p.id==='l:karim');const j=k.by['2026-11-20'];return {st:j.st,ferme:!!j.ferme,lab:j.lab,trous:k.trous};});
console.log('v5)',J(out).slice(0,1500));
C.v5=/Règle de la semaine S47 pour tout le monde/.test(out.titre)&&/Non travaillé pour tous \(« PONT »\) : ven 20\/11 — ni attendu, ni lissé\./.test(out.hint)&&out.jDis===true&&out.lab==='PONT'
  &&out.reg&&J(out.reg.ferme)==='["2026-11-20"]'&&out.reg.lab==='PONT'&&out.reg.mois===null&&J(out.avant)!==J(out.apres)&&out.apres[4]===null&&out.apres.slice(0,4).every(h=>h>0&&quart(h))&&Math.abs(out.apres.slice(0,4).reduce((a,b)=>a+b,0)-35.75)<0.006
  &&out.labs[4]==='PONT'&&out.flags.includes('regle')&&/vendredi 20\/11 : pont pour tout le monde \(règle de la semaine\), pas lissé/.test(out.expl)&&/PONT/.test(String(out.ligne&&out.ligne[2]))&&out.p.on.length===1&&/S47 · non travaillé pour tous \(« PONT »\) : ven 20\/11/.test(out.p.on[0])
  &&out.ctl.st==='pont'&&out.ctl.ferme&&out.ctl.lab==='PONT'&&J(out.ctl.trous)===J(['2026-11-16','2026-11-17','2026-11-18','2026-11-19']);
// ── v6) Contrôle : vendredis, férié travaillé visible
await goRh('ctl');await wait(500);
const ctl=()=>page.evaluate(()=>{const A=document.getElementById('eq-app');const q=s=>[...A.querySelectorAll(s)];return {v:(A.querySelector('.rh-sem')||{dataset:{}}).dataset.ctlv,seg:q('.rh-segb').map(b=>b.textContent.trim()+(b.classList.contains('on')?'*':'')),tiles:q('.ac-stat').map(x=>x.textContent.replace(/\s+/g,' ').trim()),als:q('[data-ctlal]').map(x=>x.dataset.ctlal+' : '+x.querySelector('.g').textContent.replace(/\s+/g,' ').trim()),nvs:q('[data-ctlnv]').map(x=>x.dataset.ctlnv+' : '+x.querySelector('.g').textContent.replace(/\s+/g,' ').trim()),
  wks:q('.rh-wks .chip').map(x=>x.textContent.replace(/\s+/g,' ').trim()),sem:(A.querySelector('.rh-sem')||{dataset:{}}).dataset.ctlw,
  rows:Object.fromEntries(q('.rh-sem tr[data-p]').map(r=>[r.dataset.p,[...r.querySelectorAll('.rh-c')].map(c=>c.dataset.st+(c.textContent.trim()?':'+c.textContent.replace(/\s+/g,' ').trim():''))])),fert:q('.rh-sem .rh-c.fert').map(c=>c.closest('tr').dataset.p+' '+c.textContent.replace(/\s+/g,' ').trim()),
  tot:Object.fromEntries(q('.rh-sem tr[data-p]').map(r=>[r.dataset.p,r.lastElementChild.textContent.replace(/\s+/g,' ').trim()])),nvt:Object.fromEntries(q('.rh-sem tr[data-p]').map(r=>[r.dataset.p,r.lastElementChild.dataset.nvt||''])),
  cal:Object.fromEntries(q('.rh-cal tr[data-p]').map(r=>[r.dataset.p,[...r.querySelectorAll('td.rh-dd')].map(c=>c.textContent.trim()||'.')])),calKind:(A.querySelector('.rh-cal')||{dataset:{}}).dataset.cal,calFert:q('.rh-cal td.rh-dd.fert').map(c=>c.closest('tr').dataset.p+' '+c.dataset.d),leg:q('.rh-leg').map(x=>x.textContent.replace(/\s+/g,' ').trim())};});
let K=await ctl();out={tiles:K.tiles,als:K.als,wks:K.wks,seg:K.seg};
await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-09"]');await wait(500);K=await ctl();out.s46=K.rows;out.fert=K.fert;out.calFert=K.calFert;out.calJ=K.cal['l:julien'].slice(8,13).join(' ');out.calN=K.cal['prov:nina'][12];out.leg=K.leg[0];
await page.click('.rh-sem tr[data-p="l:julien"] .rh-c.fert');await wait(400);out.jour=await modalTxt();await closeM();await wait(200);
await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-16"]');await wait(500);K=await ctl();out.s47=K.rows;await shot('02_controle_reel');
console.log('v6)',J(out).slice(0,2000));
C.v6=J(out.seg)==='["⏱ Réel pointé*","🧾 Navette (lissé)"]'&&out.tiles.some(t=>/^5\s*jours sans heures ni absence/.test(t))&&out.tiles.some(t=>/^2\s*personnes à régulariser/.test(t))&&out.tiles.some(t=>/^1\s*férié travaillé/.test(t))
  &&out.als.length===2&&out.als.some(a=>/^l:karim : S47 : semaine entière sans heures ni absence \(16\/11, 17\/11, 18\/11, 19\/11\)$/.test(a))&&!out.als.some(a=>/nina/.test(a))&&!out.als.some(a=>/ven /.test(a))
  &&out.s46['prov:nina'][4]==='repos:—non travaillé'&&/^pt:13,5 h FÉRIÉ/.test(out.s46['l:julien'][2])&&out.fert.length===1&&/^l:julien 13,5 h FÉRIÉ/.test(out.fert[0])&&J(out.calFert)==='["l:julien 2026-11-11"]'&&out.calJ==='● ● F● ● ●'&&out.calN==='–'
  &&/férié travaillé/.test(out.leg)&&/vendredi non travaillé/.test(out.leg)&&/FÉRIÉ TRAVAILLÉ : heures majorées, gardées au réel sur la navette \(12 h au plus\)/.test(out.jour)
  &&out.s47['l:karim'].slice(0,4).every(c=>/^trou:\?/.test(c))&&out.s47['l:karim'][4]==='pont:PONTrègle commune'&&/^pt:9,13 hVillefictive — Nord$/.test(out.s47['l:julien'][0]);
// ── v7) Contrôle, vue « Navette (lissé) »
await page.click('[data-act="x"][data-v="rh|ctlv|nav"]');await wait(900);K=await ctl();out={v:K.v,seg:K.seg,tiles:K.tiles,nvs:K.nvs,calKind:K.calKind,s47:K.rows,tot47:K.tot,nvt47:K.nvt,leg:K.leg[0]};
await page.click('[data-act="x"][data-v="rh|ctlw|2026-11-09"]');await wait(600);K=await ctl();out.s46=K.rows;out.tot46=K.tot;out.fert=K.fert;out.cal=K.cal['l:julien'].slice(8,14).join(' ');out.calK=K.cal['l:karim'].slice(15,20).join(' ');await shot('03_controle_navette');
await page.click('.rh-sem tr[data-p="l:julien"] .rh-c.nv');await wait(500);out.modal=(await modalTxt()).slice(0,160);await closeM();await wait(200);
const DL=await page.evaluate(()=>{const D=window.TRACE.rh.controle('2026-11',true);const x=D.people.find(z=>z.p.id==='l:julien');return x.weeks.map(w=>w.liss?[w.mon,w.liss.etat,w.liss.total,w.liss.jours.map(j=>j.h)]:[w.mon,null]);});
console.log('v7)',J(out).slice(0,2200),'| modèle',J(DL));
C.v7=out.v==='nav'&&J(out.seg)==='["⏱ Réel pointé","🧾 Navette (lissé)*"]'&&out.calKind==='nav'&&out.tiles.some(t=>/semaines lissées$/.test(t))&&out.tiles.some(t=>/heures sup à 125 %$/.test(t))&&out.tiles.some(t=>/semaines? à traiter$/.test(t))
  &&J(out.s47['l:julien'].slice(0,5).map(c=>c.split(':')[0]))==='["nv","nv","nv","nv","pont"]'&&/^pont:Pont/.test(out.s47['l:julien'][4])&&out.s47['l:julien'][6]==='we'&&out.nvt47['l:julien']==='35.75'&&/35,75 h.*lissée/.test(out.tot47['l:julien'])
  &&/^nv:9 hVillefictive — Centre$/.test(out.s46['l:julien'][0])&&/^nv:12 h FÉRIÉ/.test(out.s46['l:julien'][2])&&out.fert.length===1&&/48 h.*lissée.*HS 8 \+ 5/.test(out.tot46['l:julien'])&&out.cal==='9 9 12 9 9 .' /* le samedi sans heures : case vide, comme le week-end en vue réel */
  &&out.nvs.some(t=>/^l:karim\|2026-11-16 : S47 : /.test(t))&&/Julien R\. · S46/.test(out.modal)&&/heures de la navette/.test(out.leg)
  &&DL.some(w=>w[0]==='2026-11-09'&&w[1]==='lisse'&&w[2]===48);
await page.click('[data-act="x"][data-v="rh|ctlv|reel"]');await wait(500);
// ── v8) grands déplacements : le pointé d'abord, Île-de-France, salariés / intérimaires
const gdJ=wk(NJ,'2026-11-16').gd,gd45=wk(NJ,'2026-11-02').gd;
await goRh('gd');await wait(1500);await page.click('#eq-app [data-act=gdweek][data-v="-1"]');await wait(700);await page.click('#eq-app [data-act=gdweek][data-v="-2"]');await wait(1200);
const gd=()=>page.evaluate(()=>{const A=document.getElementById('eq-app');const q=s=>[...A.querySelectorAll(s)];return {titre:(A.querySelector('.eq-wknav .eq-wktitle b')||{}).textContent,grp:q('[data-gdgrp]').map(g=>g.dataset.gdgrp+' '+g.textContent.replace(/\s+/g,' ').trim().slice(0,22)),rows:q('.eq-list .eq-row').filter(r=>r.querySelector('[data-act=gdpers]')).map(r=>r.textContent.replace(/\s+/g,' ').trim()),tiles:q('.ac-stat').map(x=>(x.dataset.gdt||'')+'|'+x.textContent.replace(/\s+/g,' ').trim()),
  addr:(A.querySelector('[data-gdaddr]')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,700),ag:q('[data-gdag]').length,bar:(A.querySelector('[data-gdbar]')||{textContent:''}).textContent.replace(/\s+/g,' ').trim(),cas:q('[data-act=cptcas]').map(b=>b.dataset.v)};});
let G=await gd();out={s47:G,modele:gdJ,m45:gd45};await shot('04_gd_semaine');
await page.click('#eq-app [data-act=gdweek][data-v="-3"]');await wait(1000);out.s46=await gd(); /* S46 : Nina (intérimaire) y est planifiée */
await page.click('[data-act="x"][data-v="rh|pop|int"]');await wait(900);out.int=await gd();await page.click('[data-act="x"][data-v="rh|pop|sal"]');await wait(900);out.sal=await gd();await page.click('[data-act="x"][data-v="rh|pop|tous"]');await wait(900);
console.log('v8)',J({titre:out.s47.titre,rows47:out.s47.rows,tiles47:out.s47.tiles,modele:out.modele,m45:out.m45,grp46:out.s46.grp,rows46:out.s46.rows,int:[out.int.grp,out.int.rows.length],sal:[out.sal.grp,out.sal.rows.length]}).slice(0,2400));
const rJ47=out.s47.rows.find(r=>/^Julien/.test(r))||'';
C.v8=/Semaine 47/.test(out.s47.titre||'')&&/Villefictive — Nord/.test(rJ47)&&/cas 3/.test(rJ47)&&out.modele.hotel===0&&out.modele.idf>0&&out.modele.repas>0&&new RegExp(out.modele.idf+' nuitées? Île-de-France').test(rJ47)
  &&out.s47.tiles.some(t=>t.startsWith('idf|'+out.modele.idf))&&out.s47.tiles.some(t=>/^prov\|0/.test(t))&&out.m45.hotel===5&&out.m45.idf===0&&out.m45.repas===10
  &&J(out.s46.grp.map(g=>g.split(' ')[0]))==='["sal","int"]'&&out.s46.rows.some(r=>/^Nina FICTIVE/.test(r))&&out.s46.rows.some(r=>/^Julien/.test(r)&&/5 nuitées province/.test(r))
  &&out.int.rows.length===1&&/^Nina/.test(out.int.rows[0])&&out.sal.rows.length>=2&&!out.sal.rows.some(r=>/^Nina/.test(r));
// ── v9) intérimaire sans adresse : calculé par l'agence ; le salarié sans adresse reste à vérifier
const rN=out.s46.rows.find(r=>/^Nina/.test(r))||'';
console.log('v9)',J({nina:rN,ag:out.s46.ag,tuile:out.s46.tiles.filter(t=>/^ag\|/.test(t)),addr:out.s46.addr.slice(0,330),cas:out.s46.cas}));
C.v9=/calculé par l'agence d'intérim/.test(rN)&&!/adresse du domicile inconnue/.test(rN)&&out.s46.ag===1&&out.s46.tiles.some(t=>/^ag\|1\s*intérimaire · calcul par l'agence/.test(t))&&/Adresses à vérifier/.test(out.s46.addr)&&/Karim/.test(out.s46.addr)&&!/Nina/.test(out.s46.addr)&&out.s46.cas.includes('prov:nina');
// ── v10) « Toutes les navettes » : nuits et repas par semaine, colonnes du mois, montants
out={bar0:G.bar};await page.click('#eq-app [data-act=gdbareme]');await wait(300);out.mod=(await modalTxt()).slice(0,120);await page.fill('#gb-np','70');await page.fill('#gb-ni','90,5');await page.fill('#gb-rp','20');await page.click('#gb-ok');await wait(700);
out.bar=await page.evaluate(()=>window.TRACE.rh.bareme());G=await gd();out.bar1=G.bar;out.eur=G.tiles.filter(t=>/^eur\|/.test(t));
await goRh('nav');await wait(900);E=await ecran();const eJ2=E.pers.find(x=>x.p==='l:julien'),eN=E.pers.find(x=>x.p==='prov:nina'),tAll=E.tot.find(t=>t.g==='tous')||E.tot[0];NJ=await nav('l:julien');
const arE=15*(NJ.ar[2]||0)+30*(NJ.ar[3]||0)+50*(NJ.ar[4]||0);const attendu=Math.round((NJ.tot.hotel*70+NJ.tot.idf*90.5+NJ.tot.repas*20+arE)*100)/100;
console.log('v10)',J({heads:E.heads,julien:{gdw:eJ2.gdw,gdTxt:eJ2.gdTxt,gd:eJ2.gd},modele:{w:NJ.weeks.map(w=>w.gd),tot:NJ.tot,ar:NJ.ar,arE,attendu},nina:eN&&eN.gd,tot:tAll&&tAll.gd,bar:out.bar,bar0:out.bar0.slice(0,90),bar1:out.bar1.slice(0,120),eur:out.eur}).slice(0,2300));await shot('05_navettes_gd');
const numFr=s=>+String(s||'').replace(/[^\d,.-]/g,'').replace(',','.')||0;
C.v10=/Pas encore réglés/.test(out.bar0)&&/Montants du grand déplacement/.test(out.mod)&&out.bar&&out.bar.np===70&&out.bar.ni===90.5&&out.bar.rp===20&&/nuit province 70 € · nuit Île-de-France 90,5 € · repas 20 €/.test(out.bar1)&&out.eur.length===1
  &&['Hôtel','Hôtel IDF','Repas','Trajets','GD €'].every(h=>E.heads.includes(h))&&J(eJ2.gdw)===J(NJ.weeks.map(w=>w.gd.hotel||w.gd.idf||w.gd.repas?w.gd.hotel+'|'+w.gd.idf+'|'+w.gd.repas:''))&&/^🌙 5 · 🍽 10$/.test(eJ2.gdTxt[0])&&/IDF/.test(eJ2.gdTxt[2])
  &&numFr(eJ2.gd.hotel)===NJ.tot.hotel&&numFr(eJ2.gd.idf)===NJ.tot.idf&&numFr(eJ2.gd.repas)===NJ.tot.repas&&NJ.tot.idf===NJ.weeks.reduce((t,w)=>t+w.gd.idf,0)&&NJ.tot.idf>0&&numFr(eJ2.gd.ar)===arE&&Math.abs(numFr(eJ2.gd.eur)-attendu)<0.006
  &&eN&&/calculé par l'agence/.test(eN.gd.ag||'')&&tAll&&tAll.gd.hotel>=NJ.tot.hotel&&tAll.gd.idf===NJ.tot.idf;
// ── v11) logo de l'entreprise sur la navette Excel
const zipList=f=>execFileSync('unzip',['-Z1',f]).toString().split(/\r?\n/).filter(Boolean);const zipTxt=(f,n)=>execFileSync('unzip',['-p',f,n],{maxBuffer:64e6});
const telecharge=async sel=>{const [dl]=await Promise.all([page.waitForEvent('download',{timeout:15000}),page.click(sel)]);return {f:await dl.path(),name:dl.suggestedFilename()};};
let d0=await telecharge('#eq-app [data-act=gdnavx][data-v="l:julien|2026-11"]');const L0=zipList(d0.f);const sh0=zipTxt(d0.f,'xl/worksheets/sheet1.xml').toString();
const ent=await page.evaluate(async src=>{const r=await window.TRACE.band.entSave({name:'Entreprise Fictive',logo:src});const e=window.TRACE.band.ent();return {ok:!!(r&&r.ok),logo:!!(e&&e.logo)};},LOGO);await wait(400); /* Administration → 🏢 Entreprise : le logo (ici un SVG, redessiné en PNG pour Excel) */
const sel1=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=gdnavx]');return b?b.dataset.v:null;});
let d1=sel1?await telecharge('#eq-app [data-act=gdnavx][data-v="'+sel1+'"]'):null;const L1=d1?zipList(d1.f):[];const png=d1&&L1.includes('xl/media/image1.png')?zipTxt(d1.f,'xl/media/image1.png'):Buffer.alloc(0);
const sh1=d1?zipTxt(d1.f,'xl/worksheets/sheet1.xml').toString():'';const dr1=d1&&L1.includes('xl/drawings/drawing1.xml')?zipTxt(d1.f,'xl/drawings/drawing1.xml').toString():'';const ct1=d1?zipTxt(d1.f,'\\[Content_Types\\].xml').toString():'';
let dAll=await telecharge('#eq-app [data-act=gdnavall]');const LA=zipList(dAll.f);if(SHOTS&&d1){try{fs.copyFileSync(d1.f,SHOTS+'/navette_logo.xlsx');fs.copyFileSync(dAll.f,SHOTS+'/navettes_toutes.xlsx');}catch(e){}}
out={ent,sans:{media:L0.filter(n=>/media|drawing/.test(n)),scr:/>SCR</.test(sh0)||/SCR/.test(sh0)},avec:{sel:sel1,media:L1.filter(n=>/media|drawing/.test(n)),png:png.length,sig:png.slice(1,4).toString(),scr:/SCR/.test(sh1),drawing:/<drawing r:id="rId1"\/>/.test(sh1),anchor:/<xdr:oneCellAnchor>/.test(dr1)&&/r:embed="rId1"/.test(dr1),ct:/image\/png/.test(ct1)&&/drawing\+xml/.test(ct1)},tous:{name:dAll.name,media:LA.filter(n=>/^xl\/media\//.test(n)).length,drawings:LA.filter(n=>/^xl\/drawings\/drawing\d+\.xml$/.test(n)).length,sheets:LA.filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).length}};
console.log('v11)',J(out));
C.v11=out.ent.ok&&out.ent.logo&&out.sans.media.length===0&&out.sans.scr&&out.avec.media.includes('xl/media/image1.png')&&out.avec.media.includes('xl/drawings/drawing1.xml')&&out.avec.png>300&&out.avec.sig==='PNG'&&!out.avec.scr&&out.avec.drawing&&out.avec.anchor&&out.avec.ct
  &&out.tous.media===1&&out.tous.drawings===out.tous.sheets&&out.tous.sheets>=1;
// ── v12) tableau de bord
await goRh('home');await wait(700);
out=await page.evaluate(()=>{const A=document.getElementById('eq-app');const af=A.querySelector('[data-afaire]');const cards=[...A.querySelectorAll('.card h3')].map(h=>h.textContent.replace(/\s+/g,' ').trim());
  return {n:af?af.dataset.afaire:null,todo:af?[...af.querySelectorAll('.rh-todo')].map(x=>x.dataset.todo+' = '+x.querySelector('.n').textContent+' '+x.querySelector('.g b').textContent):[],vide:af&&af.dataset.afaire==='0'?af.textContent.trim():'',cards,mois:[...A.querySelectorAll('[data-rhmois] .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
    dbl:[...A.querySelectorAll('.card [data-v="rh|tab|nav"],.card [data-v="rh|tab|ctl"],.card [data-v="rh|tab|gd"],.card [data-v="rh|tab|cpt"]')].filter(b=>!b.closest('[data-afaire]')).length,ailleurs:[...A.querySelectorAll('.card')].filter(c=>/Ailleurs dans Tracé/.test((c.querySelector('h3')||{}).textContent||'')).map(c=>[...c.querySelectorAll('button')].map(b=>b.textContent.replace(/\s+/g,' ').trim()))[0]||null};});
await shot('06_tableau_de_bord');
const premier=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-afaire] .rh-todo button');return b?b.dataset.v:null;});
if(premier){await page.click('#eq-app [data-afaire] .rh-todo button');await wait(700);}out.ouvre=await page.evaluate(()=>((document.querySelector('.rh-tabs .btn.primary')||{}).textContent||'').trim());out.premier=premier;
console.log('v12)',J(out).slice(0,1500));
C.v12=out.n!==null&&out.cards.some(c=>/^À faire/.test(c))&&out.dbl===0&&Array.isArray(out.ailleurs)&&out.ailleurs.some(t=>/Déclarations d'accident/.test(t))&&out.ailleurs.some(t=>/Habilitations de l'équipe/.test(t))&&!out.cards.some(c=>/^Raccourcis/.test(c))
  &&out.mois.length>=1&&out.mois.some(t=>/personnes?/.test(t))&&(+out.n>0?(out.todo.length===+out.n&&!!out.premier&&out.ouvre.length>0&&!/Tableau de bord/.test(out.ouvre)):/Rien à faire/.test(out.vide));
// ── v13) console propre ; téléphone
await page.setViewportSize({width:390,height:800});await goRh('nav');await wait(700);const tel={nav:await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)};await goRh('ctl');await wait(600);tel.ctl=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);await shot('07_telephone_controle');
await goRh('gd');await wait(900);tel.gd=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);await goRh('home');await wait(500);tel.home=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
console.log('v13) console :',J(logs.slice(0,6)),'| téléphone',J(tel));
C.v13=logs.length===0&&tel.nav&&tel.ctl&&tel.gd&&tel.home;
console.log(J(C));const ko=Object.keys(C).filter(k=>!C[k]);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();process.exit(ko.length?1:0);
