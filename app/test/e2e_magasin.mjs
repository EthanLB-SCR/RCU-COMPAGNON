// MAGASIN (14/10 nuit) — module app/src/magasin.js. Pack FICTIF (10 articles inventés, 3 listes, 1 dotation) ; Supabase SIMULÉ à 2 comptes fictifs :
// un soudeur (Bruno TESTSOUDEUR, téléphone 390 px) et une référente magasin (Marie TESTMAGASIN). Le serveur simulé applique les règles proposées pour les
// registres magcat / magmvt (droit magasin) et magdem (la personne elle-même ou le magasin) : aucune écriture ne doit être refusée.
// (1) la référente voit l'onglet Parc, arrive sur 📦 Magasin, importe le pack → « 10 articles, 3 listes » ; (2) le soudeur, au téléphone : Moi → Magasin →
// Nouvelle demande : sa liste en tête, + / −, taille en gros bouton, recherche, imputation chantier, envoi → registre ; pas de prix ; (3) la référente :
// « À faire » → 1 demande à préparer → préparation PARTIELLE → Prête → Remise → 3 sorties de stock, reliquat sur la même demande ; (4) stock et « à commander »
// par fournisseur ; (5) réception, inventaire, fiche article ; (6) le soudeur voit le reliquat, puis « prête » (badge + À faire) ; remise du reliquat → terminée ;
// (7) annulation par le demandeur, refus avec motif obligatoire ; (8) pas de débordement horizontal à 390 px ; pas d'erreur console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8771';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
const SOUD={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'bruno.testsoudeur@exemple.fr',prenom:'Bruno',nom:'TESTSOUDEUR',poste:'soudeur'};
const MAG={id:'bbbbbbbb-2222-4222-8222-222222222222',email:'marie.testmagasin@exemple.fr',prenom:'Marie',nom:'TESTMAGASIN',poste:'referent_magasin'};
const PROFILES=[SOUD,MAG].map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.poste==='soudeur'?'soudeur':'bureau',active:true,poste:u.poste,admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));
const SITES=[{id:'SRV_A',name:'Chantier fictif Alpha',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:'Villefictive',chef:null,conducteur:null,secteur:'ouest',etude:null},
  {id:'SRV_B',name:'Chantier fictif Bravo',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:20,deleted:null,deletedAt:null,builtin:null,ville:'Autreville',chef:null,conducteur:null,secteur:'ouest',etude:null}];
// pack FICTIF (mêmes structures que le pack SCR : catalogue / formulaires / dotations)
const art=(ref,designation,famille,unite,stockDepot,seuil,prixU,fournisseur,o={})=>Object.assign({ref,designation,famille,unite,stockDepot,seuil,emplacement:ref.startsWith('X-')?null:ref,prixU,source:'test',metiers:[],fournisseur,marque:null,refFournisseur:fournisseur?'REF-'+ref:null,aliases:[],note:null},o);
const PACK={magasin:{
  catalogue:[art('T-01','Disque fictif A','Abrasifs','u',10,12,1.5,'FOURNISSEUR ALPHA',{aliases:['DISQUE ALPHA']}),art('T-02','Baguette fictive B','Soudage','paquet',5,4,20,'FOURNISSEUR BETA'),
    art('T-03','Moufle fictive taille S','EPI','paire',6,4,3,'FOURNISSEUR ALPHA'),art('T-04','Moufle fictive taille M','EPI','paire',2,4,3,'FOURNISSEUR ALPHA'),art('T-05','Moufle fictive taille L','EPI','paire',0,2,3,'FOURNISSEUR ALPHA'),
    art('T-06','Crayon fictif','Consommable','u',30,10,0.8,'FOURNISSEUR BETA'),art('T-07','Truelle fictive','Outillage','u',3,null,25,null),art('T-08','Courroie fictive','Levage-arrimage','u',8,6,9,'FOURNISSEUR BETA'),
    art('T-09','Bouchon fictif','Tuyauterie','u',12,20,4,'FOURNISSEUR GAMMA'),art('X-RUBAN-FICTIF','Ruban fictif','Hygiène-sécurité','rouleau',null,null,null,null)],
  formulaires:[
    {id:'liste-soudure',titre:'Liste fictive soudure',pour:['soudeur','tuyauteur'],source:'test',remplace:'test',champs:[],articles:[
      {ligne:1,section:'Consommables fictifs',ref:'T-01',designation:'Disque A (fictif)',unite:'u',qteMax:20,lienStock:'exact'},{ligne:2,section:'Consommables fictifs',ref:'T-02',designation:'Paquet de baguettes B (fictif)',unite:'paquet',qteMax:null,lienStock:'exact'},
      {ligne:3,section:'Outils fictifs',ref:'T-07',designation:'Truelle (fictive)',unite:'u',qteMax:1,lienStock:'exact'}]},
    {id:'liste-tous',titre:'Liste fictive pour tous',pour:['tous'],source:'test',remplace:'test',champs:[],articles:[
      {ligne:10,section:'Protection fictive',ref:null,designation:'Moufles (fictives)',unite:'paire',qteMax:null,choixVariante:'taille',variantes:[{libelle:'S',ref:'T-03'},{libelle:'M',ref:'T-04'},{libelle:'L',ref:'T-05'}],lienStock:'exact'},
      {ligne:11,section:'Sécurité fictive',ref:'X-RUBAN-FICTIF',designation:'Ruban (fictif)',unite:'rouleau',qteMax:null,lienStock:'aucun'}]},
    {id:'liste-manchon',titre:'Liste fictive manchon',pour:['manchonneur'],source:'test',remplace:'test',champs:[],articles:[{ligne:20,section:'Divers fictif',ref:'T-06',designation:'Crayon (fictif)',unite:'u',qteMax:null,lienStock:'exact'}]}],
  dotations:[{metier:'soudeur',metiers:['soudeur','tuyauteur'],titre:'Dotation fictive soudure',source:'test',miseAJour:'01/01/2026',entete:[],visas:[],articles:[{designation:'Courroie (fictive)',qte:2,qteTexte:null,uniteDotation:null,aLaDemande:false,ref:'T-08',lienStock:'exact',controle:'contrôle fictif',observation:null}]}]}};
const REG={};const calls=[];const refus=[];
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const logs=[];
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()});
  const session=()=>{const t=now();return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind,id=String(b.p_id||'');calls.push({who:U.email,kind:k,id,patch:b.p_patch,mode:b.p_mode});
      /* règles serveur PROPOSÉES (rapport) : magcat / magmvt = droit magasin ; magdem = la personne (1er segment de l'id) ou le magasin */
      const mgr=U.email===MAG.email;let deny=null;if(k==='magcat'||k==='magmvt'){if(!mgr)deny='magasin : droit « Magasin » nécessaire';}else if(k==='magdem'){if(!mgr&&id.split('|')[0].toLowerCase()!==U.email)deny='réservé à la personne elle-même';}
      if(deny){refus.push(U.email+' '+k+' '+id);return json({code:'P0001',message:deny},400);}
      const key=k+'|'+id;const old=(REG[key]||{}).data||{};const data=b.p_mode==='replace'?(b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});
      REG[key]={kind:k,id,data,updated_at:new Date().toISOString()};return json(REG[key]);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)));}
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);if(/chef:data/.test(sel)||/name/.test(sel)&&!/data,/.test(sel))return json(SITES);return json(/object/.test(acc)?null:[]);}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  await page.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  return {ctx,page};}
const login=async(page,em)=>{await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await page.waitForTimeout(900);
  await page.fill('#loginEmail',em);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3000);};
const C={};
const W=(pg,ms)=>pg.waitForTimeout(ms);
const xclick=async(pg,v)=>{await pg.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act="x"][data-v="${v}"]`);if(!el)throw new Error('bouton absent : '+v+' · '+(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,300));el.click();},v);await W(pg,250);};
const setv=async(pg,sel,val,evs)=>{await pg.evaluate(([s,v,e])=>{const el=document.querySelector(s);if(!el)throw new Error('champ absent : '+s);if(el.type==='checkbox')el.checked=!!v;else el.value=v;(e||['input','change']).forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));},[sel,val,evs]);await W(pg,200);};
const txt=pg=>pg.evaluate(()=>(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' '));
const toast=pg=>pg.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const noOverflow=pg=>pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1&&(!document.getElementById('eq-app')||document.getElementById('eq-app').scrollWidth<=document.getElementById('eq-app').clientWidth+1));
const reg=(k,id)=>(REG[k+'|'+id]||{}).data;
const dems=()=>Object.values(REG).filter(r=>r.kind==='magdem').map(r=>Object.assign({id:r.id},r.data));
const mvts=()=>Object.values(REG).filter(r=>r.kind==='magmvt').map(r=>Object.assign({id:r.id},r.data));
const goMoiMag=async pg=>{await pg.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,250));const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Magasin/.test(x.textContent));if(!c)throw new Error('sous-onglet Magasin absent');c.click();});await W(pg,300);};
const goParc=async pg=>{await pg.evaluate(()=>{const m=document.getElementById('htMag');(m&&m.style.display!=='none'?m:document.getElementById('htParc')).click();});await W(pg,350);}; /* 31/10 (un onglet = un module) : le Magasin a son onglet quand on y a accès (sinon Parc → puce Magasin, comme avant) */
const ddemain=(()=>{const d=new Date();d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();

// ── 1) la référente : onglet Parc visible, arrive sur Magasin ; import du pack fictif
const R=await mkCtx(MAG,{width:1100,height:900});await login(R.page,MAG.email);
let out={parc:await R.page.evaluate(()=>{const b=document.getElementById('htMag')||document.getElementById('htParc');return !!b&&b.style.display!=='none';})}; /* 31/10 (un onglet = un module) : la référente a l'onglet Magasin */
await goParc(R.page);
out.seg=await R.page.evaluate(()=>({h2:(document.querySelector('#eq-app h2.vt')||{}).textContent||'',active:(document.querySelector('#eq-app [data-act=parcseg].active')||{dataset:{}}).dataset.v,cadrer:/à cadrer/.test(document.getElementById('eq-app').textContent)}));
await xclick(R.page,'mag|mseg|cat');
await R.page.setInputFiles('#eq-app input[data-xin="mag|pack"]',{name:'pack-fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await W(R.page,1800);
out.toast=await toast(R.page);out.cat=Object.keys(reg('magcat','catalogue')||{}).length;out.listes=((reg('magcat','config')||{}).listes||[]).length;out.dot=((reg('magcat','config')||{}).dotations||[]).length;
out.t01=(reg('magcat','catalogue')||{})['T-01'];out.card=(await txt(R.page)).slice(0,400);
console.log('1) référente + import du pack :',JSON.stringify({...out,t01:out.t01&&[out.t01.label,out.t01.stockInit,out.t01.tampon,out.t01.prix,out.t01.fournisseur]}));
C.c1=out.parc&&/Magasin/.test(out.seg.h2)&&(out.seg.active==='magasin'||out.seg.active===undefined) /* onglet Magasin : plus de puces Flotte / Magasin */&&!out.seg.cadrer&&/10 articles, 3 listes/.test(out.toast)&&out.cat===10&&out.listes===3&&out.dot===1&&out.t01&&out.t01.label==='Disque fictif A'&&out.t01.stockInit===10&&out.t01.tampon===12&&out.t01.prix===1.5&&!!out.t01.stockAt&&/10 articles · 3 listes/.test(out.card);

// ── 2) le soudeur, au téléphone (390 px) : nouvelle demande
const Sd=await mkCtx(SOUD,{width:390,height:844},true);await login(Sd.page,SOUD.email);
out={parc:await Sd.page.evaluate(()=>{const b=document.getElementById('htParc');return !!b&&b.style.display!=='none';})};
await goMoiMag(Sd.page);out.list=await txt(Sd.page);out.ov0=await noOverflow(Sd.page);
await xclick(Sd.page,'mag|new');
out.first=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-lh')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
out.open=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-sec .mag-lt b')].map(x=>x.textContent));
for(let i=0;i<3;i++)await xclick(Sd.page,'mag|inc|T-01');
await xclick(Sd.page,'mag|tog|liste-tous§0');
const y0=await Sd.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="mag|sz|liste-tous:0|T-04"]');b.scrollIntoView({block:'center'});return window.scrollY;});
await xclick(Sd.page,'mag|sz|liste-tous:0|T-04');out.scrollKept=Math.abs((await Sd.page.evaluate(()=>window.scrollY))-y0)<5;
await xclick(Sd.page,'mag|inc|T-04');
out.sz=await Sd.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="mag|sz|liste-tous:0|T-04"]');return {on:b.classList.contains('on'),txt:b.textContent,h:b.getBoundingClientRect().height,w:b.getBoundingClientRect().width};});
out.stepH=await Sd.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="mag|inc|T-01"]').getBoundingClientRect();return [b.width,b.height];});
await setv(Sd.page,'#eq-app input[data-xin="mag|q"]','baguette',['input']);
out.res=await Sd.page.evaluate(()=>[...document.querySelectorAll('#mag-res .mag-lt b')].map(x=>x.textContent));
await Sd.page.evaluate(()=>document.querySelector('#mag-res [data-v="mag|inc|T-02"]').click());await W(Sd.page,250);
out.bar=await Sd.page.evaluate(()=>(document.querySelector('#eq-app .mag-bar .mag-bn')||{}).textContent);out.ov1=await noOverflow(Sd.page);out.prix1=/€/.test(await txt(Sd.page));
await xclick(Sd.page,'mag|step|2');
out.recap=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .card .mag-lt b')].map(x=>x.textContent));
await xclick(Sd.page,'mag|imp|chantier');await setv(Sd.page,'#eq-app select[data-xin="mag|impSite"]','SRV_B',['change']);
await setv(Sd.page,'#eq-app textarea[data-xin="mag|note"]','Test fictif : merci',['input']);
out.ov2=await noOverflow(Sd.page);out.prix2=/€/.test(await txt(Sd.page));
await xclick(Sd.page,'mag|send');await W(Sd.page,1500);
out.toast=await toast(Sd.page);out.after=await txt(Sd.page);
const D1=dems().find(d=>d.byKey===SOUD.email);out.reg=D1&&{st:D1.statut,l:D1.lignes.map(l=>l.ref+':'+l.qte+':'+l.label),imp:D1.imputation,b:D1.besoinLe,note:D1.note,by:D1.byName,id0:D1.id.split('|')[0]};
console.log('2) soudeur — nouvelle demande :',JSON.stringify({...out,list:out.list.slice(0,120),after:out.after.slice(0,200)}));
C.c2=!out.parc&&out.ov0&&/Nouvelle demande/.test(out.list)&&/ta liste/.test(out.first[0]||'')&&/Liste fictive soudure/.test(out.first[0]||'')&&/pour tous/.test(out.first[1]||'')&&out.open.includes('Disque A (fictif)')&&!out.open.includes('Truelle (fictive)')
  &&out.sz.on&&/^M×2$/.test(out.sz.txt)&&out.sz.h>=48&&out.stepH[0]>=48&&out.stepH[1]>=48&&out.scrollKept&&out.res.includes('Baguette fictive B')&&/3\s*articles/.test(out.bar||'')&&out.ov1&&!out.prix1
  &&out.recap.join('|')==='Disque A (fictif)|Moufles (fictives) — M|Baguette fictive B'&&out.ov2&&!out.prix2&&/Demande envoyée/.test(out.toast)&&/Envoyée/.test(out.after)
  &&out.reg&&out.reg.st==='envoyee'&&out.reg.l.join()==='T-01:3:Disque A (fictif),T-04:2:Moufles (fictives) — M,T-02:1:Baguette fictive B'&&out.reg.imp.type==='chantier'&&out.reg.imp.id==='SRV_B'&&out.reg.imp.label==='Chantier fictif Bravo'&&out.reg.b===undefined&&out.reg.note==='Test fictif : merci'&&out.reg.by==='Bruno TESTSOUDEUR'&&out.reg.id0===SOUD.email; /* 19/10 (lot MG) : plus de date de besoin (besoinLe absent) — avant : === demain */
const ID1=D1&&D1.id;

// ── 3) la référente : « À faire » → la demande ; préparation partielle → Prête → Remise (sorties de stock, reliquat)
await goParc(R.page);await xclick(R.page,'mag|rf');await W(R.page,1200);
await R.page.evaluate(()=>document.getElementById('htHome').click());await W(R.page,600);
out={notif:await R.page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>/demande.*à préparer/.test(x.textContent));return n?n.textContent.replace(/\s+/g,' ').trim():'';})};
await R.page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>/demande.*à préparer/.test(x.textContent));if(n)n.click();});await W(R.page,500);
out.landed=await R.page.evaluate(()=>({tab:window.TRACE.state.homeTab,seg:(document.querySelector('#eq-app [data-act=parcseg].active')||{dataset:{}}).dataset.v,row:[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim())[0]||''}));
await xclick(R.page,'mag|mopen|'+ID1);await xclick(R.page,'mag|start|'+ID1);await W(R.page,1500);
out.st1=(reg('magdem',ID1)||{}).statut;out.inputs=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app input[data-xin^="mag|prep|"]')].map(i=>i.value));
await setv(R.page,'#eq-app input[data-xin="mag|prep|0"]','2',['input']);
await xclick(R.page,'mag|pret|'+ID1);await W(R.page,1500);
let d=reg('magdem',ID1);out.st2=d.statut;out.prep=d.lignes.map(l=>l.prep).join();out.h2=(d.histo[d.histo.length-1]||{}).note;out.qui=await R.page.evaluate(()=>(document.querySelector('#eq-app select[data-xin="mag|qui"]')||{}).value);
await xclick(R.page,'mag|remettre|'+ID1);await W(R.page,1600);
d=reg('magdem',ID1);out.st3=d.statut;out.remis=d.lignes.map(l=>l.remis).join();out.retire=d.retirePar;
const M1=mvts().filter(m=>m.demande===ID1);out.mv=M1.map(m=>m.type+':'+m.ref+':'+m.qte+':'+m.imputation.id+':'+m.qui+':'+m.pourName).sort();
out.ui=await txt(R.page);out.toast=await toast(R.page);
console.log('3) préparation partielle + remise :',JSON.stringify({...out,ui:out.ui.slice(0,300)}));
C.c3=/1 demande à préparer/.test(out.notif)&&((out.landed.tab==='parc'&&out.landed.seg==='magasin')||(out.landed.tab==='magasin'&&!out.landed.seg)) /* 31/10 (un onglet = un module) : le Magasin a son onglet (plus de puce « Magasin » dans Flotte) */&&/Bruno TESTSOUDEUR/.test(out.landed.row)&&out.st1==='preparation'&&out.inputs.join()==='3,2,1'&&out.st2==='prete'&&out.prep==='2,2,1'&&/partielle — reliquat 1/.test(out.h2||'')
  &&out.qui===SOUD.email&&out.st3==='remise'&&out.remis==='2,2,1'&&out.retire==='Bruno TESTSOUDEUR'&&out.mv.join()==='sortie:T-01:2:SRV_B:Bruno TESTSOUDEUR:Bruno TESTSOUDEUR,sortie:T-02:1:SRV_B:Bruno TESTSOUDEUR:Bruno TESTSOUDEUR,sortie:T-04:2:SRV_B:Bruno TESTSOUDEUR:Bruno TESTSOUDEUR'
  &&/Retirée · reliquat à venir/.test(out.ui)&&/reliquat 1/.test(out.ui)&&/3 sorties de stock/.test(out.toast);

// ── 4) stock et « à commander » (tampon − stock, par fournisseur)
await xclick(R.page,'mag|mseg|stock');
const stockRows=()=>R.page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#mag-stock .mag-ar')].map(b=>[b.dataset.v.split('|')[2],b.querySelector('.mag-sv b').textContent.trim()])));
out={stock:await stockRows(),kpis:await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-kpi')].map(k=>k.textContent.replace(/\s+/g,' ').trim()))};
await setv(R.page,'#eq-app input[data-xin="mag|sq"]','moufle',['input']);out.filtre=Object.keys(await stockRows()).sort().join();await setv(R.page,'#eq-app input[data-xin="mag|sq"]','',['input']);
await xclick(R.page,'mag|mseg|cmd');
out.cmd=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-four')].map(h=>({f:h.querySelector('b').textContent,rows:[...h.nextElementSibling.querySelectorAll('.mag-ar')].map(b=>b.dataset.v.split('|')[2]+':'+b.querySelector('.mag-sv b').textContent.trim())})));out.prix=/€/.test(await txt(R.page));
console.log('4) stock + à commander :',JSON.stringify(out));
C.c4=out.stock['T-01']==='8'&&out.stock['T-04']==='0'&&out.stock['T-02']==='4'&&out.stock['T-03']==='6'&&out.stock['T-09']==='12'&&out.stock['X-RUBAN-FICTIF']==='0'&&out.kpis.some(k=>/^4\s*à commander/.test(k))&&out.filtre==='T-03,T-04,T-05'
  &&JSON.stringify(out.cmd)===JSON.stringify([{f:'FOURNISSEUR ALPHA',rows:['T-01:4','T-05:2','T-04:4']},{f:'FOURNISSEUR GAMMA',rows:['T-09:8']}])&&out.prix;

// ── 5) réception fournisseur, inventaire (motif obligatoire), fiche article (tampon, prix)
await xclick(R.page,'mag|art|T-01');await setv(R.page,'#eq-app input[data-xin="mag|rec|qte"]','5',['input']);await setv(R.page,'#eq-app input[data-xin="mag|rec|bl"]','BL-FICTIF-1',['input']);
await xclick(R.page,'mag|recok|');await W(R.page,1200);
out={kpi:await R.page.evaluate(()=>(document.querySelector('#eq-app .eq-kpi b')||{}).textContent),toast:await toast(R.page)};
const E1=mvts().find(m=>m.type==='entree');out.ent=E1&&[E1.ref,E1.qte,E1.fournisseur,E1.bl,E1.motif,E1.byName].join('|');
await xclick(R.page,'mag|artback|');await xclick(R.page,'mag|mseg|cmd');out.cmd=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-four + .card .mag-ar')].map(b=>b.dataset.v.split('|')[2]));
await xclick(R.page,'mag|mseg|stock');await xclick(R.page,'mag|art|T-06');await setv(R.page,'#eq-app input[data-xin="mag|inv|compte"]','28',['input']);await xclick(R.page,'mag|invok|');out.sansMotif=await toast(R.page);
await setv(R.page,'#eq-app input[data-xin="mag|inv|motif"]','Inventaire',['input']);await xclick(R.page,'mag|invok|');await W(R.page,1200);
const A1=mvts().find(m=>m.type==='ajust');out.aj=A1&&[A1.ref,A1.qte,A1.motif].join('|');out.kpi6=await R.page.evaluate(()=>(document.querySelector('#eq-app .eq-kpi b')||{}).textContent);
await xclick(R.page,'mag|artback|');await xclick(R.page,'mag|art|T-07');await setv(R.page,'#eq-app input[data-xin="mag|af|tampon"]','5',['change']);await setv(R.page,'#eq-app input[data-xin="mag|af|prix"]','12.5',['change']);await W(R.page,1200);
const T7=(reg('magcat','catalogue')||{})['T-07'];out.t7=T7&&[T7.tampon,T7.prix,T7.editedBy,T7.label].join('|');out.kpi7=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-kpi b')].map(b=>b.textContent).join('|'));
await xclick(R.page,'mag|artback|');await xclick(R.page,'mag|mseg|mvt');out.journal=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-mv')].map(x=>x.querySelector('.mag-mt').textContent+' '+x.querySelector('.mag-mq').textContent));
console.log('5) réception, inventaire, article :',JSON.stringify(out));
C.c5=out.kpi==='13'&&/Entrée enregistrée/.test(out.toast)&&out.ent==='T-01|5|FOURNISSEUR ALPHA|BL-FICTIF-1|Réception fournisseur|Marie TESTMAGASIN'&&!out.cmd.includes('T-01')&&out.cmd.includes('T-04')&&/motif.*obligatoire/.test(out.sansMotif)
  &&out.aj==='T-06|-2|Inventaire'&&out.kpi6==='28'&&out.t7==='5|12.5|Marie TESTMAGASIN|Truelle fictive'&&/^3\|5\|2\|/.test(out.kpi7)&&out.journal.length===5&&out.journal.filter(x=>/^Sortie/.test(x)).length===3&&out.journal.some(x=>/^Écart −2/.test(x))&&out.journal.some(x=>/^Entrée \+5/.test(x));

// ── 6) le soudeur voit le reliquat ; reliquat préparé → « prête » (badge + À faire) ; remis → terminée
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|rf');await W(Sd.page,1500);
out={row:await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim())[0]||'')};
await xclick(Sd.page,'mag|open|'+ID1);out.fiche=await txt(Sd.page);out.ovF=await noOverflow(Sd.page);await xclick(Sd.page,'mag|list');
await xclick(R.page,'mag|mseg|dem');await xclick(R.page,'mag|mopen|'+ID1);await xclick(R.page,'mag|reliquat|'+ID1);await W(R.page,1300);
out.relInputs=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app input[data-xin^="mag|prep|"]')].map(i=>i.dataset.xin+'='+i.value));
await xclick(R.page,'mag|pret|'+ID1);await W(R.page,1500);out.st=(reg('magdem',ID1)||{}).statut;
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|rf');await W(Sd.page,1500);
out.badge=await Sd.page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Magasin/.test(x.textContent));return c?(c.querySelector('.eq-badge')||{}).textContent:null;});
out.pretes=await Sd.page.evaluate(()=>/Prêtes à retirer/.test(document.getElementById('eq-app').textContent));
await Sd.page.evaluate(()=>document.getElementById('htHome').click());await W(Sd.page,500);
out.task=await Sd.page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>/prête au dépôt/.test(x.textContent));return n?n.textContent.replace(/\s+/g,' ').trim():'';});
await Sd.page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>/prête au dépôt/.test(x.textContent));if(n)n.click();});await W(Sd.page,400);out.taskGo=await Sd.page.evaluate(()=>/Prête au dépôt : tu peux passer la retirer/.test(document.getElementById('eq-app').textContent));await xclick(Sd.page,'mag|list');
await xclick(R.page,'mag|remettre|'+ID1);await W(R.page,1500);d=reg('magdem',ID1);out.fin=d.statut;out.h=d.histo.map(h=>h.statut).join(',');out.mv2=mvts().filter(m=>m.demande===ID1).length;
await xclick(R.page,'mag|mseg|stock');out.t01=(await stockRows())['T-01'];
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|rf');await W(Sd.page,1500);out.term=await Sd.page.evaluate(()=>{const s=document.querySelector('#eq-app details.mag-det summary');return s?s.textContent:'';});
console.log('6) côté soudeur : reliquat, prête, terminée :',JSON.stringify({...out,fiche:out.fiche.slice(0,260)}));
C.c6=/Retirée · reliquat à venir/.test(out.row)&&/reliquat 1/.test(out.row)&&/retiré : 2 · reliquat : 1/.test(out.fiche)&&/Retirée en partie/.test(out.fiche)&&out.ovF&&out.relInputs.join()==='mag|prep|0=1'&&out.st==='prete'&&out.badge==='1'&&out.pretes
  &&/Ta demande est prête au dépôt/.test(out.task)&&out.taskGo&&out.fin==='cloturee'&&out.h==='envoyee,preparation,prete,remise,preparation,prete,remise,cloturee'&&out.mv2===4&&out.t01==='12'&&/Terminées/.test(out.term)&&/\(1\)/.test(out.term);

// ── 7) annulation par le demandeur (avant préparation) ; refus avec motif obligatoire ; véhicule saisi à la main
await xclick(Sd.page,'mag|new');await setv(Sd.page,'#eq-app input[data-xin="mag|q"]','crayon',['input']);await Sd.page.evaluate(()=>document.querySelector('#mag-res [data-v="mag|inc|T-06"]').click());await W(Sd.page,250);
await xclick(Sd.page,'mag|step|2');await xclick(Sd.page,'mag|imp|depot');await xclick(Sd.page,'mag|send');await W(Sd.page,1300);
const D2=dems().find(x=>x.id!==ID1&&x.lignes.some(l=>l.ref==='T-06'));out={d2:D2&&[D2.statut,D2.imputation.type].join()};
await xclick(Sd.page,'mag|open|'+D2.id);await xclick(Sd.page,'mag|cancel|'+D2.id);await W(Sd.page,1500);out.d2b=(reg('magdem',D2.id)||{}).statut;out.d2v=/Annulée/.test(await txt(Sd.page));await xclick(Sd.page,'mag|list');
await xclick(Sd.page,'mag|new');await xclick(Sd.page,'mag|tog|liste-soudure§1');await xclick(Sd.page,'mag|inc|T-07');await xclick(Sd.page,'mag|inc|T-07');out.over=await Sd.page.evaluate(()=>/au-delà de la dotation \(1\)/.test(document.getElementById('eq-app').textContent));
await xclick(Sd.page,'mag|step|2');await xclick(Sd.page,'mag|imp|vehicule');await W(Sd.page,500);
out.immat=await Sd.page.evaluate(()=>!!document.querySelector('#eq-app input[data-xin="mag|impImmat"]'));await xclick(Sd.page,'mag|send');out.sansVeh=await toast(Sd.page);
await setv(Sd.page,'#eq-app input[data-xin="mag|impImmat"]','aa-000-zz',['input']);await xclick(Sd.page,'mag|send');await W(Sd.page,1300);
const D3=dems().find(x=>x.lignes.some(l=>l.ref==='T-07'));out.d3=D3&&[D3.statut,D3.imputation.type,D3.imputation.id,D3.lignes[0].qte].join();
await goParc(R.page);await xclick(R.page,'mag|mseg|dem');await xclick(R.page,'mag|rf');await W(R.page,1200);out.file=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
await xclick(R.page,'mag|mopen|'+D3.id);await xclick(R.page,'mag|refus|'+D3.id);await xclick(R.page,'mag|refusok|'+D3.id);out.sansMotif=await toast(R.page);out.d3b=(reg('magdem',D3.id)||{}).statut;
await setv(R.page,'#eq-app textarea[data-xin="mag|motif"]','Rends d\'abord la truelle fictive',['input']);await xclick(R.page,'mag|refusok|'+D3.id);await W(R.page,1500);d=reg('magdem',D3.id);out.d3c=[d.statut,d.motifRefus].join('|');
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|rf');await W(Sd.page,1500);await xclick(Sd.page,'mag|open|'+D3.id);out.vu=await txt(Sd.page);
console.log('7) annulation, refus, véhicule :',JSON.stringify({...out,vu:out.vu.slice(0,200)}));
C.c7=out.d2==='envoyee,depot'&&out.d2b==='annulee'&&out.d2v&&out.over&&out.immat&&/véhicule/.test(out.sansVeh)&&out.d3==='envoyee,vehicule,AA-000-ZZ,2'&&out.file.some(t=>/Bruno TESTSOUDEUR/.test(t)&&/AA-000-ZZ/.test(t))
  &&/motif du refus est obligatoire/.test(out.sansMotif)&&out.d3b==='envoyee'&&out.d3c==="refusee|Rends d'abord la truelle fictive"&&/Refusée : Rends d'abord la truelle fictive/.test(out.vu);

// ── 8) écrans de la référente à 390 px : pas de débordement ; aucune écriture refusée par le serveur simulé
await R.page.setViewportSize({width:390,height:844});await W(R.page,300);out={};
for(const s of ['dem','stock','cmd','mvt','cat']){await xclick(R.page,'mag|mseg|'+s);out[s]=await noOverflow(R.page);}
await xclick(R.page,'mag|mseg|stock');await xclick(R.page,'mag|art|T-04');out.art=await noOverflow(R.page);await xclick(R.page,'mag|mseg|dem');await xclick(R.page,'mag|mopen|'+ID1);out.fiche=await noOverflow(R.page);
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|list');await xclick(Sd.page,'mag|new');await xclick(Sd.page,'mag|autres');out.autres=await noOverflow(Sd.page);out.autresTxt=/Liste fictive manchon/.test(await txt(Sd.page));
out.refus=refus;
console.log('8) 390 px + droits :',JSON.stringify(out));
C.c8=['dem','stock','cmd','mvt','cat','art','fiche','autres'].every(k=>out[k])&&out.autresTxt&&refus.length===0;
await R.ctx.close();await Sd.ctx.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
