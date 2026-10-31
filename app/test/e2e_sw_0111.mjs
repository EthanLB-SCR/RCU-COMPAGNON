// e2e_sw_0111 — 01/11 (Ethan : « quand je suis dans un chantier, la liste ne fonctionne pas pour passer sur un autre chantier »)
//  c1  390 / 360 / 1366 : toucher le nom du chantier ouvre « Changer de chantier » (chantiers ouverts à la personne, le chantier ouvert en tête, boutons ≥ 52 px) ;
//      choisir un autre chantier l'ouvre (écran chantier, nom à jour) ; le chantier ouvert ne relance rien
//  c2  refus (chantier inconnu) : le nom revient au chantier ouvert
//  c3  zéro erreur de page
import {chromium} from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const errs=[];const J=x=>JSON.stringify(x);
const b=await chromium.launch();const res={};
for(const [w,h] of [[390,844],[360,740],[1366,860]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(BASE+'/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(800);
  if(await p.locator('#loginSkip').isVisible().catch(()=>false))await p.click('#loginSkip');await p.waitForTimeout(400);
  await p.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');T.renderHome();await T.openSiteFromHome('bain');});await p.waitForTimeout(900);
  await p.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}const t=document.getElementById('tuto');if(t)t.remove();});
  const r={};r.top=await p.evaluate(()=>{const s=document.getElementById('siteSel').getBoundingClientRect();const e=document.elementFromPoint(s.x+s.width/2,s.y+s.height/2);return e&&e.id;});
  await p.click('#sitePick');await p.waitForTimeout(400);
  r.list=await p.evaluate(()=>[...document.querySelectorAll('.spList [data-spick]')].map(x=>x.dataset.spick+(x.classList.contains('on')?'*':'')));
  r.minH=await p.evaluate(()=>Math.min(...[...document.querySelectorAll('.spList .spRow')].map(x=>x.getBoundingClientRect().height)));
  r.over=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  await p.click('.spList [data-spick="saintlo"]');await p.waitForTimeout(2200);
  r.after=await p.evaluate(()=>({site:window.TRACE.state.siteId,screen:window.TRACE.state.screen,sel:document.getElementById('siteSel').value,modal:!!document.querySelector('.spList')}));
  await p.click('#sitePick');await p.waitForTimeout(300);await p.click('.spList [data-spick="saintlo"]');await p.waitForTimeout(500);
  r.same=await p.evaluate(()=>({site:window.TRACE.state.siteId,modal:!!document.querySelector('.spList')}));
  if(w===390){r.refus=await p.evaluate(async()=>{const s=document.getElementById('siteSel');const o=document.createElement('option');o.value='__inconnu';o.textContent='Inconnu';s.appendChild(o);s.value='__inconnu';s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,1500));const v=s.value;o.remove();return {sel:v,site:window.TRACE.state.siteId};});}
  res['w'+w]=r;await p.close();}
await b.close();
console.log('c1/c2)',J(res));
C.c1=Object.values(res).every(r=>r.top==='sitePick'&&r.list.join()==='bain*,saintlo'&&r.minH>=52&&!r.over&&r.after.site==='saintlo'&&r.after.screen==='site'&&r.after.sel==='saintlo'&&!r.after.modal&&r.same.site==='saintlo'&&!r.same.modal);
C.c2=res.w390.refus&&res.w390.refus.sel===res.w390.refus.site&&res.w390.refus.site==='saintlo';
C.c3=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
