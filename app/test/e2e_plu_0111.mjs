// e2e_plu_0111.mjs — 01/11/2026 soir : PLANNING UNIQUE (Ethan : « le mélange planning détaillé / planning en 3 clics, j'aime pas : il faut mélanger les deux pour avoir
//   le plus d'options possible, mais pas qu'il y ait deux plannings différents » ; « il faut absolument maintenir la recherche par nom, sinon c'est infaisable » ;
//   « quand j'ai placé cet invité, il n'apparaissait pas sur le planning détaillé mais apparaissait sur le planning en trois clics »).
// Supabase SIMULÉ (repris de e2e_pi_3110 + invitations) ; personnages, chantiers et adresses 100 % FICTIFS. Date figée : lundi 09/11/2026 (S46, mercredi 11/11 férié).
//  u1  hub : une seule ligne « Planning de la semaine » (plus de « Planning des équipes », plus de pli « Plus d'options ») ; l'écran : 🔍 recherche, ＋ Placer, Copier,
//      ＋ Nouvelle personne, secteur, options (encadrement, météo, règle « non placé » pour l'administrateur), filtres par métier ; plus de bouton vers le détaillé
//  u2  recherche par nom (accents ignorés) : « hugo » → seule sa ligne sur sa carte, les autres cartes masquées, « 1 personne trouvée : Hugo TESTSOUDEUR » ;
//      « theo » → Théo dans « À placer » ; « inès »/« ines » → sa ligne ; « zzz » → personne ; vide → tout revient
//  u3  la recherche survit au re-rendu (filtre métier touché pendant une recherche) ; filtre « Soudeurs » : À placer = soudeurs seulement
//  u4  « ＋ Placer » : la recherche filtre aussi la liste « Qui ? » ; Lucas trouvé → Moulin → Placer ; la recherche est vidée après le placement
//  u5  autres secteurs : Paul (secteur Île-de-France) dans le pli « Autres secteurs » ; la recherche « paul » ouvre le pli
//  u6  « Avec l'encadrement » : le conducteur entre dans « À placer », filtre « Encadrement » proposé
//  u7  invitée conductrice (jamais connectée) placée sur le Moulin : sa ligne est sur la carte (le bug du détaillé)
//  u8  « ＋ Nouvelle personne » (administrateur, avec e-mail, poste tuyauteur) : accès créé avec le poste, panneau « Placer » ouvert sur elle → Tilleuls → Placer ;
//      Administrateur : sa carte garde « Tuyauteur »
//  u9  ⚙ fiche du chantier sur la carte (secteur · chef · conducteur) ; horaires modifiés → enregistrés au serveur
//  u10 glisser-déposer (PC) : Théo glissé sur le Moulin → le panneau s'ouvre (Théo, Moulin, jours libres cochés) → Placer
//  u11 ancienne adresse du détaillé (orga) → le planning unique ; téléphone 390 / 360 : rien ne déborde
//  u13 invitée jamais connectée : « 📲 Envoyer son accès » dans son panneau → la fenêtre du code de 1re connexion
//  u14 intérimaire : chantiers = ceux où il est au planning (comme les opérateurs), quel que soit son poste ; pas placé → aucun
//  u12 console propre, aucune écriture refusée
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8824';const SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const mk=(n,prenom,nom,poste,role,admin)=>({id:'0000000'+n+'-aaaa-4aaa-8aaa-0000000000'+String(n).padStart(2,'0'),email:(prenom+'.'+nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@exemple.fr',prenom,nom,poste,role,admin:!!admin});
const SOUD=mk(1,'Hugo','TESTSOUDEUR','soudeur','soudeur'),TUY=mk(2,'Théo','TESTTUYAU','tuyauteur','tuyauteur'),MAN=mk(3,'Marc','TESTMANCHON','manchonneur','manchonneur'),
  NEUF=mk(4,'Lucas','TESTNOUVEAU','soudeur','soudeur'),CHEF=mk(5,'Chloé','TESTCHEF','chef','chef'),COND=mk(6,'Denis','TESTCONDUC','conducteur','chef'),INT=mk(8,'Nina','TESTINTERIM','soudeur','soudeur'),
  PAR=mk(9,'Paul','TESTPARIS','soudeur','soudeur'),ADM=mk(7,'Alex','TESTADMIN','resp_exploitation','chef',true);
const USERS=[SOUD,TUY,MAN,NEUF,CHEF,COND,INT,PAR,ADM];
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:u.admin,type:u===INT?'interim':'salarie',rights:{},sites:null,created_at:'2026-10-01T09:00:00Z'}));
const INES={email:'ines.testinvite@exemple.fr',nom:'TESTINVITE',prenom:'Inès',poste:'conducteur',type:'salarie',rights:{},sites:null,created_at:'2026-10-20T08:00:00Z',used_at:null};
const INVITES=[INES];
const REG={},PEOPLE={},PTS={},PLAN={},SITE={},SETTINGS={};const REFUS=[];const logs=[];const C={};const OVF=[];const CALLS=[];
const nowIso=()=>new Date().toISOString();const J=x=>JSON.stringify(x);
const flt=(rows,u)=>{let r=rows;for(const [k,v] of u.searchParams.entries()){if(['select','order','limit','offset'].includes(k))continue;const m=/^(in|gt|gte|lt|lte|eq|neq|is)\.(.*)$/.exec(v);if(!m)continue;const op=m[1],val=m[2];if(op==='is')continue;
  r=r.filter(x=>{const xv=x[k]===undefined||x[k]===null?'':String(x[k]);if(op==='in')return val.replace(/^\(|\)$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'')).includes(xv);if(op==='eq')return xv===val;if(op==='neq')return xv!==val;
    const a=Date.parse(xv),b=Date.parse(val);const c=(!isNaN(a)&&!isNaN(b))?(a-b):(xv<val?-1:xv>val?1:0);return op==='gt'?c>0:op==='gte'?c>=0:op==='lt'?c<0:c<=0;});}return r;};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const metaRow=r=>({id:r.id,name:r.name,supplier:r.supplier||null,updated_at:r.updated_at,geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:0,deleted:null,deletedAt:null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:(r.data.fiche||{}).secteur||null,etude:null});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:1});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-01T09:00:00Z',updated_at:nowIso()});
  const session=()=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json(U.admin?INVITES.filter(i=>!i.used_at):[]);
    if(p==='/rest/v1/rpc/annuaire_invites')return json(INVITES.filter(i=>!i.used_at).map(i=>({email:i.email,nom:i.nom,prenom:i.prenom,poste:i.poste,type:i.type})));
    if(p==='/rest/v1/rpc/invite_access'){if(!U.admin){REFUS.push(U.prenom+' : invite_access');return json({code:'P0001',message:"réservé à l'administrateur"},400);}CALLS.push({fn:'invite_access',email:b.p_email,poste:b.p_poste,type:b.p_type});const em=String(b.p_email||'').toLowerCase();const i=INVITES.findIndex(x=>x.email===em);const row={email:em,nom:b.p_nom||'',prenom:b.p_prenom||'',poste:b.p_poste||'soudeur',type:b.p_type||'salarie',rights:b.p_rights||{},sites:b.p_sites||null,created_at:nowIso(),used_at:null};if(i>=0)INVITES[i]=row;else INVITES.push(row);return json(null);}
    if(p==='/rest/v1/app_settings'){const m=/key=eq\.([a-z_]+)/.exec(u.search);const k=m&&m[1];const row=k&&SETTINGS[k]!==undefined?{value:SETTINGS[k]}:null;return /object/.test(acc)?json(row):json(row?[row]:[]);}
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso(),by:U.email};return json(REG[k]);}
    if(p==='/rest/v1/registre')return json(flt(Object.values(REG),u));
    if(p==='/rest/v1/rpc/people_set_part'){CALLS.push({fn:'people_set_part',key:b.p_key,part:b.p_part,value:b.p_value});const r=PEOPLE[b.p_key]||(PEOPLE[b.p_key]={key:b.p_key,data:{}});r.data=Object.assign({},r.data,{[b.p_part]:b.p_value});r.updated_at=nowIso();return json({at:r.updated_at,value:b.p_value});}
    if(p==='/rest/v1/people')return json(flt(Object.values(PEOPLE),u));
    if(p==='/rest/v1/pointages')return json([]);
    if(p==='/rest/v1/rpc/planning_set'){const w=b.p_week;const r=PLAN[w]||(PLAN[w]={week:w,data:{aff:{}}});const aff=Object.assign({},r.data.aff);Object.entries((b.p_patch&&b.p_patch.aff)||{}).forEach(([k,v])=>{if(v===null)delete aff[k];else aff[k]=v;});r.data={aff};r.updated_at=nowIso();return json(r);}
    if(p==='/rest/v1/planning')return json(flt(Object.values(PLAN),u));
    if(p==='/rest/v1/rpc/site_set_part'){CALLS.push({fn:'site_set_part',site:b.p_site,key:b.p_key});const row=SITE[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();return json({at:row.updated_at,value:b.p_value});}
    if(p==='/rest/v1/sites'){if(req.method()!=='GET')return json([]);const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;const rows=Object.values(SITE).filter(r=>!id||r.id===id);
      if(/missions:data->missions/.test(sel))return json(rows.map(r=>({id:r.id,updated_at:r.updated_at,missions:r.data.missions||null})));
      if(/(^|,)data(,|$)/.test(sel))return json(/object/.test(acc)?(rows[0]?{id:rows[0].id,name:rows[0].name,supplier:rows[0].supplier,serie:null,data:rows[0].data,updated_at:rows[0].updated_at}:null):rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,serie:null,data:r.data,updated_at:r.updated_at})));
      return json(/object/.test(acc)?(rows[0]?metaRow(rows[0]):null):rows.map(metaRow));}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);return json([]);});
  await ctx.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api|status of 4\d\d|supabase/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  return {ctx,page,U};}
const W=(pg,ms)=>pg.waitForTimeout(ms);
const TODAY='2026-11-09';
const login=async(P,opts)=>{const page=P.page;await page.goto(BASE+'/index.html');await W(page,400);await page.evaluate(([t,wide])=>{localStorage.clear();localStorage.setItem('trace:syncMs','4000');localStorage.setItem('trace:testToday',t);if(wide)localStorage.setItem('trace:wide','1');},[TODAY,!!(opts&&opts.wide)]);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await W(page,800);
  await page.fill('#loginEmail',P.U.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await W(page,3000);
  await page.waitForFunction(()=>window.TRACE&&window.TRACE.espace&&window.TRACE.espace.state().loaded,null,{timeout:20000}).catch(()=>{});await W(page,300);};
const tap=async(pg,sel,ms)=>{await pg.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s+' · '+((document.getElementById('eq-app')||document.body).textContent||'').replace(/\s+/g,' ').slice(0,300));el.click();},sel);await W(pg,ms||300);};
const tapAct=(pg,act,v,ms)=>tap(pg,`#eq-app [data-act="${act}"][data-v="${v}"]`,ms);
const fake=async(pg,act,v,ms)=>{await pg.evaluate(([a,v])=>{const b=document.createElement('button');b.dataset.act=a;b.dataset.v=v;b.style.display='none';document.querySelector('#eq-app').append(b);b.click();},[act,v]);await W(pg,ms||400);};
const hubRow=async(pg,re)=>{await pg.evaluate(src=>{const re=new RegExp(src);const bk=document.querySelector('#eq-app .ac-back');if(bk)bk.click();const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>re.test(x.textContent));if(!r)throw new Error('ligne absente : '+src);r.click();},re.source);await W(pg,450);};
const home=async(pg,tab)=>{await pg.evaluate(t=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();}document.getElementById(t).click();},tab);await W(pg,450);};
const hub=async pg=>{await home(pg,'htSites');await home(pg,'htEq');};
const noOverflow=pg=>pg.evaluate(()=>{const hb=document.getElementById('homeBody');return document.documentElement.scrollWidth<=window.innerWidth+1&&(!hb||hb.scrollWidth<=hb.clientWidth+1);});
const shot=async(P,name,sel)=>{if(!SHOTS)return;try{if(sel){const el=await P.page.$(sel);if(el){await el.scrollIntoViewIfNeeded().catch(()=>{});await el.screenshot({path:SHOTS+'/'+name+'.png'});return;}}await P.page.screenshot({path:SHOTS+'/'+name+'.png',fullPage:false});}catch(e){console.log('capture '+name+' : '+e.message);}};
const typeQ=async(pg,q)=>{await pg.fill('#eq-app #pi-q',q);await W(pg,250);};
/* ce qui est visible à l'écran du planning */
const view=pg=>pg.evaluate(()=>{const vis=el=>!!el&&el.offsetParent!==null&&getComputedStyle(el).display!=='none';const R=document.getElementById('eq-app');
  return {q:(R.querySelector('#pi-q')||{}).value,qn:vis(R.querySelector('#pi-qn'))?R.querySelector('#pi-qn').textContent:'',
    tray:[...R.querySelectorAll('.pi-trayc > .pi-tray .pi-chip')].filter(vis).map(c=>c.querySelector('b').textContent),
    autres:[...R.querySelectorAll('details.pi-autres .pi-chip')].filter(vis).map(c=>c.querySelector('b').textContent),autresOpen:!!(R.querySelector('details.pi-autres')||{}).open,
    sites:[...R.querySelectorAll('.pi-sites > .pi-site')].filter(vis).map(c=>c.dataset.site+':'+[...c.querySelectorAll('.pi-row[data-q]')].filter(vis).map(r=>r.querySelector('.pi-full').textContent).join('+')),
    pick:[...R.querySelectorAll('#pi-panel .pi-pick [data-q]')].filter(vis).map(b=>b.querySelector('b').textContent)};});

// ── données fictives : 4 chantiers (3 à l'Ouest, 1 en Île-de-France), le planning de la S46 commencé, une invitée conductrice déjà placée
[['SRV_A','Chantier fictif des Tilleuls','Villefictive','ouest',CHEF.email],['SRV_B','Chantier fictif du Moulin','Autreville','ouest',null],['SRV_C','Chantier fictif du Port','Troisville','ouest',null],['SRV_D','Chantier fictif de la Gare','Parisfictif','idf',null]].forEach(([id,name,ville,secteur,chef])=>{SITE[id]={id,name,supplier:'AXIOM',data:{id,name,lines:[],fiche:{ville,secteur,chef,conducteur:COND.email,horaires:'7 h 30 – 16 h 30'},sent:true},updated_at:'2026-10-20T08:00:00Z'};});
const S46=['2026-11-09','2026-11-10','2026-11-12','2026-11-13'];const wk=(d,s)=>Object.fromEntries(d.map(x=>[x,[s]]));
PLAN['2026-W46']={week:'2026-W46',data:{aff:{[SOUD.email]:Object.assign(wk(S46,'SRV_A'),{'eq:SRV_A':'A'}),[CHEF.email]:wk(S46,'SRV_A'),[MAN.email]:Object.assign(wk(S46,'SRV_A'),{'eq:SRV_A':'B'}),[INES.email]:wk(['2026-11-09','2026-11-10'],'SRV_B')}},updated_at:'2026-11-06T08:00:00Z'};
PEOPLE[PAR.email]={key:PAR.email,data:{secteur:'idf'},updated_at:'2026-10-20T08:00:00Z'};PEOPLE[ADM.email]={key:ADM.email,data:{secteur:'ouest'},updated_at:'2026-10-20T08:00:00Z'};
[SOUD,TUY,MAN,NEUF,CHEF,COND,INT].forEach(u=>{PEOPLE[u.email]={key:u.email,data:{secteur:'ouest'},updated_at:'2026-10-20T08:00:00Z'};});

// ── PC de l'administrateur (1366, affichage large)
const P=await mkCtx(ADM,{width:1366,height:900},false);await login(P,{wide:true});const pg=P.page;
let o={};
// u1 : hub et écran
await hub(pg);o.hub=await pg.evaluate(()=>{const bk=document.querySelector('#eq-app .ac-back');if(bk)bk.click();return 0;});await W(pg,300);
o.hub=await pg.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent),fold:!!document.querySelector('#eq-app details.eq-hubmore'),orgaRow:!!document.querySelector('#eq-app .ac-row[data-v=orga], #eq-app [data-act=xgo][data-v=orga]')}));
await hubRow(pg,/Planning de la semaine/);await W(pg,400);
o.more=await pg.evaluate(()=>{const d=document.querySelector('#eq-app details.pi-more');const r={fold:!!d,open:!!(d&&d.open),sum:d?d.querySelector('summary').textContent:''};if(d)d.open=true;return r;});await W(pg,200);
o.u1=await pg.evaluate(()=>{const R=document.getElementById('eq-app');const h=s=>!!R.querySelector(s);return {h2:(R.querySelector('h2.vt')||{}).textContent,q:h('#pi-q'),placer:h('[data-act=pi][data-v="open|"]'),copy:h('[data-act=pi][data-v="copy|"]'),nouv:h('[data-act=plnew]'),sect:h('select[data-chg=plSect]'),enc:h('[data-act=plenc]'),meteo:h('[data-act=meteo]'),strict:h('[data-act=plstrict]'),chips:[...R.querySelectorAll('.pi-poste .chip')].map(c=>c.textContent),toOrga:h('[data-act=xgo][data-v=orga]'),fiche:h('.pi-site .eq-plfd > summary')};});
await shot(P,'plu_u1_ecran_1366');
console.log('u1) écran :',J(o));
C.u1=o.more.fold&&!o.more.open&&/Options : encadrement, météo, accès des non placés/.test(o.more.sum)&&o.hub.rows.includes('Planning de la semaine')&&!o.hub.rows.includes('Planning des équipes')&&!o.hub.fold&&/Planning de la semaine · semaine 46/.test(o.u1.h2)&&o.u1.q&&o.u1.placer&&o.u1.copy&&o.u1.nouv&&o.u1.sect&&o.u1.enc&&o.u1.meteo&&o.u1.strict&&o.u1.chips.join()==='Tous,Soudeurs,Tuyauteurs,Manchonneurs,Act. spéc.,Chauffeurs,Aides,Chefs,Intérim'&&!o.u1.toOrga&&o.u1.fiche;
// u2 : recherche par nom
o={};await typeQ(pg,'hugo');o.hugo=await view(pg);await shot(P,'plu_u2_recherche_hugo_1366');
await typeQ(pg,'theo');o.theo=await view(pg);
await typeQ(pg,'ines');o.ines=await view(pg);await typeQ(pg,'Inès');o.ines2=await view(pg);
await typeQ(pg,'zzz');o.zzz=await view(pg);
await typeQ(pg,'');o.all=await view(pg);
console.log('u2) recherche :',J(o));
C.u2=J(o.hugo.sites)===J(['SRV_A:Hugo TESTSOUDEUR'])&&o.hugo.tray.length===0&&/^1 personne trouvée : Hugo TESTSOUDEUR/.test(o.hugo.qn)
  &&J(o.theo.tray)===J(['Théo TESTTUYAU'])&&o.theo.sites.length===0&&/1 personne trouvée/.test(o.theo.qn)
  &&J(o.ines.sites)===J(['SRV_B:Inès TESTINVITE'])&&J(o.ines2.sites)===J(o.ines.sites)&&/Personne ne correspond/.test(o.zzz.qn)&&o.zzz.sites.length===0&&o.zzz.tray.length===0
  &&o.all.qn===''&&o.all.sites.length>=2&&J(o.all.tray)===J(['Lucas TESTNOUVEAU','Nina TESTINTERIM','Théo TESTTUYAU']);
// u3 : la recherche survit au re-rendu ; filtre par métier
o={};await typeQ(pg,'TESTT');await tapAct(pg,'plposte','tuyauteur',400);o.a=await view(pg);
await typeQ(pg,'');await tapAct(pg,'plposte','soudeur',400);o.b=await view(pg);await tapAct(pg,'plposte','',400);o.c=await view(pg);
console.log('u3) re-rendu, métier :',J(o));
C.u3=o.a.q==='TESTT'&&J(o.a.tray)===J(['Théo TESTTUYAU'])&&J(o.b.tray.slice().sort())===J(['Lucas TESTNOUVEAU','Nina TESTINTERIM'])&&o.c.tray.length>o.b.tray.length;
// u4 : « ＋ Placer » — la recherche filtre « Qui ? » ; Lucas → Moulin → Placer
o={};await tapAct(pg,'pi','open|',400);await typeQ(pg,'luc');o.pick=(await view(pg)).pick;
await tap(pg,'#pi-panel [data-act=pi][data-v="who|'+NEUF.email+'"]',400);await tapAct(pg,'pi','site|SRV_B',400);
o.ok=await pg.evaluate(()=>(document.querySelector('#pi-panel [data-act=pi][data-v="ok|"]')||{}).textContent||'');await tapAct(pg,'pi','ok|',1200);
o.plan=(PLAN['2026-W46'].data.aff[NEUF.email]||{});o.after=await view(pg);
console.log('u4) placer avec la recherche :',J(o));
C.u4=J(o.pick)===J(['Lucas TESTNOUVEAU'])&&/Placer Lucas · toute la semaine \(sauf férié\)/.test(o.ok)&&J(o.plan)===J(wk(S46,'SRV_B'))&&o.after.q===''&&o.after.sites.some(s=>/^SRV_B:.*Lucas TESTNOUVEAU/.test(s));
// u5 : autres secteurs
o={a:await view(pg)};await typeQ(pg,'paul');o.b=await view(pg);await typeQ(pg,'');
console.log('u5) autres secteurs :',J(o));
C.u5=!o.a.tray.includes('Paul TESTPARIS')&&o.b.autres.includes('Paul TESTPARIS')&&o.b.autresOpen;
// u6 : avec l'encadrement
o={};await tap(pg,'#eq-app [data-act=plenc]',400);
o.a=await view(pg);o.chips=await pg.evaluate(()=>[...document.querySelectorAll('#eq-app .pi-poste .chip')].map(c=>c.textContent));
await tap(pg,'#eq-app [data-act=plenc]',400);o.b=await view(pg);
console.log('u6) encadrement :',J(o));
C.u6=o.a.tray.includes('Denis TESTCONDUC')&&o.chips.includes('Encadrement')&&!o.b.tray.includes('Denis TESTCONDUC');
// u7 : l'invitée conductrice placée est sur la carte du Moulin (sans « Avec l'encadrement »)
o=await pg.evaluate(()=>{const c=document.querySelector('#eq-app .pi-site[data-site=SRV_B]');const r=c&&[...c.querySelectorAll('.pi-row[data-q]')].find(x=>/Inès TESTINVITE/.test(x.textContent));return {row:!!r,txt:r?r.textContent.replace(/\s+/g,' '):''};});
console.log('u7) invitée placée :',J(o));
C.u7=o.row&&/Conducteur de travaux/.test(o.txt)&&/invité/.test(o.txt);
// u13 (01/11 soir) : sa ligne → panneau « Jamais connecté » → « 📲 Envoyer son accès » → la fenêtre du code de 1re connexion (le serveur vérifie qui a le droit)
await pg.evaluate(()=>{const c=document.querySelector('#eq-app .pi-site[data-site=SRV_B]');[...c.querySelectorAll('.pi-row[data-q]')].find(x=>/Inès/.test(x.textContent)).click();});await W(pg,300);
o={btn:await pg.evaluate(()=>!!document.querySelector('#pi-panel [data-act=pi][data-v^="access|"]'))};
if(o.btn){await tap(pg,'#pi-panel [data-act=pi][data-v^="access|"]',400);o.h=await pg.evaluate(()=>((document.querySelector('#modal.show h3')||{}).textContent||''));await pg.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await W(pg,200);}
await tapAct(pg,'pi','close|',200);
console.log('u13) 1er accès depuis le planning :',J(o));
C.u13=o.btn&&/Code de 1re connexion — Inès TESTINVITE/.test(o.h||'');
// u14 (01/11 soir, Ethan : « l'intérimaire, comme les opérateurs, a accès à son chantier où il est au planning — pas la logique d'un compte invité ») : accès par le planning, quel que soit son poste ; pas placé → aucun chantier
o=await pg.evaluate(([nina,lucas,theo])=>{const P=window.TRACE.espace.planned;const ls=s=>s===null?null:[...s].sort();
  return {nina:ls(P({id:'n',email:nina,poste:'soudeur',type:'interim',active:true})),ninaBureau:ls(P({id:'n2',email:nina,poste:'charge_affaires',type:'interim',active:true})),lucasInt:ls(P({id:'l',email:lucas,poste:'soudeur',type:'interim',active:true})),lucasSal:ls(P({id:'l2',email:lucas,poste:'soudeur',type:'salarie',active:true})),theo:ls(P({id:'t',email:theo,poste:'tuyauteur',type:'salarie',active:true})),strict:!!(window.TRACE.espace.rules&&window.TRACE.espace.rules().strict)};},[INT.email,NEUF.email,TUY.email]);
console.log('u14) intérimaire : accès par le planning :',J(o));
C.u14=J(o.nina)==='[]'&&J(o.ninaBureau)==='[]'&&J(o.lucasInt)===J(['SRV_B'])&&J(o.lucasSal)===J(['SRV_B'])&&(o.strict?J(o.theo)==='[]':o.theo===null);
// u8 : ＋ Nouvelle personne (administrateur, avec e-mail) → poste gardé, panneau ouvert sur elle → Tilleuls → Placer ; Administrateur : poste Tuyauteur
o={};await tap(pg,'#eq-app [data-act=plnew]',400);o.form=await pg.evaluate(()=>!!document.querySelector('#eq-app #pl-new'));
await pg.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));};s('pn-prenom','Zoé');s('pn-nom','TESTNOUVELLE');s('pn-poste','tuyauteur');s('pn-email','zoe.testnouvelle@exemple.fr');s('pn-sect','ouest');});
await tap(pg,'#eq-app [data-act=plnewok]',2200);
o.inv=CALLS.filter(c=>c.fn==='invite_access').map(c=>[c.email,c.poste]);o.panel=await pg.evaluate(()=>({who:[...document.querySelectorAll('#pi-panel .pi-who .btn')].map(b=>b.textContent.trim()),step:((document.querySelector('#pi-panel .pi-step')||{}).textContent||''),toast:(document.getElementById('toast')||{}).textContent||''}));
await shot(P,'plu_u8_nouvelle_1366','#pi-panel');
await tapAct(pg,'pi','site|SRV_A',400);await tapAct(pg,'pi','ok|',1200);o.plan=PLAN['2026-W46'].data.aff['zoe.testnouvelle@exemple.fr']||null;
await pg.evaluate(()=>document.getElementById('htAdmin').click());await W(pg,1500);
o.adm=await pg.evaluate(()=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(x=>/Zoé TESTNOUVELLE/.test(x.textContent));const s=k&&k.querySelector('select[data-adm=poste]');return k?{poste:s?s.value:null,label:s?(s.selectedOptions[0]||{}).textContent:null}:null;});
console.log('u8) nouvelle personne :',J(o));
C.u8=o.form&&J(o.inv)===J([['zoe.testnouvelle@exemple.fr','tuyauteur']])&&o.panel.who.some(t=>/Zoé TESTNOUVELLE/.test(t))&&/Sur quel chantier/.test(o.panel.step)&&/Accès créé/.test(o.panel.toast)
  &&J(o.plan)===J(wk(S46,'SRV_A'))&&o.adm&&o.adm.poste==='tuyauteur'&&o.adm.label==='Tuyauteur';
// u9 : fiche du chantier
await hub(pg);await hubRow(pg,/Planning de la semaine/);await W(pg,300);
o={sum:await pg.evaluate(()=>((document.querySelector('#eq-app .pi-site[data-site=SRV_A] .eq-plfd > summary')||{}).textContent||''))};
await pg.evaluate(()=>{const d=document.querySelector('#eq-app .pi-site[data-site=SRV_A] .eq-plfd');d.open=true;});await W(pg,200);
await pg.evaluate(()=>{const i=document.querySelector('#eq-app .pi-site[data-site=SRV_A] input[data-chg=plfiche][data-k=horaires]');i.value='7 h – 15 h 30';i.dispatchEvent(new Event('change',{bubbles:true}));});await W(pg,1500);
o.srv=(SITE.SRV_A.data.fiche||{}).horaires;
console.log('u9) fiche :',J(o));
C.u9=/Ouest · Chloé TESTCHEF · Denis TESTCONDUC/.test(o.sum)&&o.srv==='7 h – 15 h 30';
// u10 : glisser-déposer (PC) : Théo → Moulin
o={};await pg.dragAndDrop(`#eq-app .pi-trayc .pi-chip[data-p="${TUY.email}"]`,'#eq-app .pi-site[data-site=SRV_B] .pi-sh');await W(pg,600);
o.panel=await pg.evaluate(()=>({who:[...document.querySelectorAll('#pi-panel .pi-who .btn')].map(b=>b.textContent.trim()),days:[...document.querySelectorAll('#pi-panel .pi-days [data-act=pi]')].map(b=>(b.classList.contains('active')?'✓':'·')+b.dataset.v.slice(-2)).join(' '),ok:(document.querySelector('#pi-panel [data-act=pi][data-v="ok|"]')||{}).textContent||''}));
if(o.panel.ok)await tapAct(pg,'pi','ok|',1200);o.plan=PLAN['2026-W46'].data.aff[TUY.email]||null;
console.log('u10) glisser-déposer :',J(o));
C.u10=o.panel.who.some(t=>/Théo TESTTUYAU/.test(t))&&o.panel.days==='✓09 ✓10 ·11 ✓12 ✓13'&&/Placer Théo/.test(o.panel.ok)&&J(o.plan)===J(wk(S46,'SRV_B'));
// u11 : ancienne adresse du détaillé → planning unique ; téléphone
o={};await fake(pg,'xgo','orga',600);o.orga=await pg.evaluate(()=>({q:!!document.querySelector('#eq-app #pi-q'),old:!!document.querySelector('#eq-app .eq-pltray, #eq-app .eq-plsite')}));
for(const w of [390,360]){await pg.setViewportSize({width:w,height:800});await W(pg,400);if(!(await noOverflow(pg)))OVF.push('planning '+w);}
await pg.setViewportSize({width:390,height:844});await W(pg,300);await shot(P,'plu_u11_planning_390');
await typeQ(pg,'hugo');await shot(P,'plu_u11_recherche_390');await typeQ(pg,'');
console.log('u11) orga, téléphone :',J({o,OVF}));
C.u11=o.orga.q&&!o.orga.old&&!OVF.length;
await browser.close();
C.u12=!logs.length&&!REFUS.length;if(logs.length||REFUS.length)console.log('journal',J({logs:logs.slice(0,8),REFUS}));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
