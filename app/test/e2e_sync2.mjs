// AUDIT SYNCHRO (14/10 nuit, agent « sync ») — Ethan : « la page qui se rafraîchit et qui te remet en haut, le truc pas synchro pour tous les utilisateurs » ;
// « teste les interactions opérateur / hiérarchie : que ce soit bien synchro pour tout le monde, que les liens marchent entre chacun ».
// Supabase SIMULÉ PARTAGÉ (état en mémoire dans ce script) entre plusieurs navigateurs : registre (filtres in / gt updated_at / neq id), fiches, pointages, planning.
// Comptes FICTIFS : Claire TESTBUREAU (encadrement, administratrice, ordinateur), Bruno TESTCOMPAGNON (soudeur, téléphone 390 px), Marie TESTMAGASIN (référente magasin).
// Rien n'est rechargé à la main : la mise à jour vient du rafraîchissement léger (trace:syncMs = 4 s pour le test, ~50 s en vrai) ou du retour au premier plan.
// (1) défilement conservé quand une donnée arrive ; pas de re-rendu pendant une saisie ni sous une fenêtre (différé) ; (2) document à signer : bureau publie → compagnon
// le voit dans « À faire », le lien ouvre la lecture, il signe → disparaît chez lui ; le bureau voit la signature ; (3) magasin : compagnon demande → la référente le voit
// (sans ↻) → prête → le compagnon le voit ; (4) accident : compagnon déclare → l'encadrement le voit, le lien mène à la liste, « traité » → disparaît ; (5) 390 px, console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8776';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const BUR={id:'cccccccc-3333-4333-8333-333333333333',email:'claire.testbureau@exemple.fr',prenom:'Claire',nom:'TESTBUREAU',poste:'resp_exploitation',role:'chef',admin:true};
const COMP={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'bruno.testcompagnon@exemple.fr',prenom:'Bruno',nom:'TESTCOMPAGNON',poste:'soudeur',role:'soudeur',admin:false};
const MAG={id:'bbbbbbbb-2222-4222-8222-222222222222',email:'marie.testmagasin@exemple.fr',prenom:'Marie',nom:'TESTMAGASIN',poste:'referent_magasin',role:'bureau',admin:false};
const PROFILES=[BUR,COMP,MAG].map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:u.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T09:00:00Z'}));
const SITES=[{id:'SRV_A',name:'Chantier fictif Alpha',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',nw:40,ville:'Villefictive',chef:null,conducteur:null,secteur:'ouest'}];
const PACK={magasin:{catalogue:[
  {ref:'T-01',designation:'Disque fictif A',famille:'Abrasifs',unite:'u',stockDepot:10,seuil:12,emplacement:'T-01',prixU:1.5,source:'test',metiers:[],fournisseur:'FOURNISSEUR ALPHA',marque:null,refFournisseur:'REF-T-01',aliases:[],note:null},
  {ref:'T-02',designation:'Baguette fictive B',famille:'Soudage',unite:'paquet',stockDepot:5,seuil:4,emplacement:'T-02',prixU:20,source:'test',metiers:[],fournisseur:'FOURNISSEUR BETA',marque:null,refFournisseur:'REF-T-02',aliases:[],note:null}],
  formulaires:[{id:'liste-soudure',titre:'Liste fictive soudure',pour:['soudeur'],source:'test',remplace:'test',champs:[],articles:[{ligne:1,section:'Consommables fictifs',ref:'T-01',designation:'Disque A (fictif)',unite:'u',qteMax:20,lienStock:'exact'},{ligne:2,section:'Consommables fictifs',ref:'T-02',designation:'Paquet de baguettes B (fictif)',unite:'paquet',qteMax:null,lienStock:'exact'}]}],
  dotations:[]}};
// ── serveur simulé partagé ──
const REG={},PEOPLE={},PTS={},PLAN={};const calls=[];
const nowIso=()=>new Date().toISOString();
const flt=(rows,u)=>{let r=rows;for(const [k,v] of u.searchParams.entries()){if(['select','order','limit','offset'].includes(k))continue;const m=/^(in|gt|gte|lt|lte|eq|neq)\.(.*)$/.exec(v);if(!m)continue;const op=m[1],val=m[2];
  r=r.filter(x=>{const xv=x[k]===undefined||x[k]===null?'':String(x[k]);if(op==='in')return val.replace(/^\(|\)$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'')).includes(xv);if(op==='eq')return xv===val;if(op==='neq')return xv!==val;
    const a=Date.parse(xv),b=Date.parse(val);const c=(!isNaN(a)&&!isNaN(b))?(a-b):(xv<val?-1:xv>val?1:0);return op==='gt'?c>0:op==='gte'?c>=0:op==='lt'?c<0:c<=0;});}return r;};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const logs=[];
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-01T09:00:00Z',updated_at:nowIso()});
  const session=()=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}calls.push(U.prenom+' '+req.method()+' '+p+(u.search?decodeURIComponent(u.search).slice(0,900):''));
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);if(p==='/rest/v1/rpc/annuaire_invites')return json([]);
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};return json(REG[k]);}
    if(p==='/rest/v1/registre')return json(flt(Object.values(REG),u));
    if(p==='/rest/v1/rpc/people_set_part'){const r=PEOPLE[b.p_key]||(PEOPLE[b.p_key]={key:b.p_key,data:{}});r.data=Object.assign({},r.data,{[b.p_part]:b.p_value});r.updated_at=nowIso();return json({at:r.updated_at,value:b.p_value});}
    if(p==='/rest/v1/people')return json(flt(Object.values(PEOPLE),u));
    if(p==='/rest/v1/rpc/pointage_set'){const row=Object.assign({},b.p_row,{updated_at:nowIso()});PTS[row.p+'|'+row.d]=row;return json(row);}
    if(p==='/rest/v1/pointages')return json(flt(Object.values(PTS),u));
    if(p==='/rest/v1/rpc/planning_set'){const w=b.p_week;const r=PLAN[w]||(PLAN[w]={week:w,data:{aff:{}}});r.data={aff:Object.assign({},r.data.aff,(b.p_patch&&b.p_patch.aff)||{})};r.updated_at=nowIso();return json(r);}
    if(p==='/rest/v1/planning')return json(flt(Object.values(PLAN),u));
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);if(/name/.test(sel)&&!/data,/.test(sel))return json(SITES);return json(/object/.test(acc)?null:[]);}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);return json([]);});
  await ctx.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  return {ctx,page};}
const login=async(page,em)=>{await page.goto(BASE+'/index.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:syncMs','4000');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await page.waitForTimeout(800);
  await page.fill('#loginEmail',em);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3000);};
const W=(pg,ms)=>pg.waitForTimeout(ms);
const C={};const R={};
const notifs=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const clickNotif=(pg,re)=>pg.evaluate(src=>{const re=new RegExp(src);const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>re.test(x.textContent));if(!n)return false;n.click();return true;},re.source);
const xclick=async(pg,v)=>{await pg.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act="x"][data-v="${v}"]`);if(!el)throw new Error('bouton absent : '+v+' · '+(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,300));el.click();},v);await W(pg,250);};
const draw=async(pg,id)=>{await pg.evaluate(id2=>{const cv=document.getElementById(id2);const r=cv.getBoundingClientRect();const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+x,clientY:r.top+y,pointerId:1,pointerType:'touch'}));ev('pointerdown',20,40);ev('pointermove',80,60);ev('pointermove',140,30);ev('pointerup',140,30);},id);};
const noOverflow=pg=>pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
/* l'élément qui défile réellement sur l'accueil (réponse à « trouve quel élément défile ») */
const scroller=pg=>pg.evaluate(()=>{const c=[['#homeBody',document.getElementById('homeBody')],['#homeView',document.getElementById('homeView')],['page',document.scrollingElement]];const f=c.find(([n,e])=>e&&e.scrollHeight>e.clientHeight+20&&getComputedStyle(e===document.scrollingElement?document.documentElement:e).overflowY!=='hidden');return f?f[0]:null;});
const getY=(pg,sel)=>pg.evaluate(s=>s==='page'?document.scrollingElement.scrollTop:document.querySelector(s).scrollTop,sel);
const setY=(pg,sel,y)=>pg.evaluate(([s,y])=>{const e=s==='page'?document.scrollingElement:document.querySelector(s);e.scrollTop=y;return e.scrollTop;},[sel,y]);
const softAt=pg=>pg.evaluate(()=>(window.TRACE.state.syncSoft||{}).at||0);
// données de départ (serveur) : 14 notes de service à signer → l'accueil du compagnon est long (on peut le faire défiler)
for(let i=1;i<=14;i++){const id='note_seed'+String(i).padStart(2,'0');REG['doc|'+id]={kind:'doc',id,data:{kind:'note',title:'Note fictive '+i,html:'<p>Texte fictif court.</p>',req:{all:true},active:true,at:'2026-10-0'+(1+i%9)+'T08:00:00Z',by:'Test'},updated_at:'2026-10-10T08:00:00Z'};}

// ── 1) le compagnon (téléphone) : défilement conservé quand une donnée arrive ; saisie et fenêtre protégées
const Cp=await mkCtx(COMP,{width:390,height:844},true);await login(Cp.page,COMP.email);
await Cp.page.evaluate(()=>document.getElementById('htHome').click());await W(Cp.page,500);
let out={tab:await Cp.page.evaluate(()=>window.TRACE.state.homeTab),n0:(await notifs(Cp.page)).length,scroller:await scroller(Cp.page)};
const SC=out.scroller||'#homeBody';
out.y0=await setY(Cp.page,SC,420);await W(Cp.page,200);
const t0=await softAt(Cp.page);
REG['doc|note_srv1']={kind:'doc',id:'note_srv1',data:{kind:'note',title:'Note arrivée du serveur',html:'<p>Texte fictif.</p>',req:{all:true},active:true,at:nowIso(),by:'Claire TESTBUREAU'},updated_at:nowIso()};
await W(Cp.page,5200);
out.arrived=(await notifs(Cp.page)).some(t=>/Note arrivée du serveur/.test(t));out.soft=(await softAt(Cp.page))>t0;out.y1=await getY(Cp.page,SC);
// saisie : un champ actif → pas de re-rendu (le champ garde sa valeur et le focus) ; à la sortie du champ → re-rendu, position gardée
await Cp.page.evaluate(()=>{const sc=document.querySelector('#eq-app .eq-scroll');const i=document.createElement('input');i.id='tst-in';i.className='f';sc.prepend(i);i.focus({preventScroll:true});i.value='saisie en cours';});
await W(Cp.page,300);out.yIn=await getY(Cp.page,SC); /* la case insérée en haut décale la page (ancrage du défilement du navigateur) : repère pris après */const t1=await softAt(Cp.page);
REG['doc|note_srv2']={kind:'doc',id:'note_srv2',data:{kind:'note',title:'Note pendant la saisie',html:'<p>Texte fictif.</p>',req:{all:true},active:true,at:nowIso(),by:'Claire TESTBUREAU'},updated_at:nowIso()};
await W(Cp.page,5200);
out.typing=await Cp.page.evaluate(()=>{const i=document.getElementById('tst-in');return {kept:!!i,focus:document.activeElement===i,val:i?i.value:null};});out.softDuring=(await softAt(Cp.page))>t1;
await Cp.page.evaluate(()=>document.getElementById('tst-in').blur());await W(Cp.page,600);
out.afterBlur={gone:await Cp.page.evaluate(()=>!document.getElementById('tst-in')),shown:(await notifs(Cp.page)).some(t=>/Note pendant la saisie/.test(t)),y:await getY(Cp.page,SC)};
// fenêtre ouverte (lecture d'un document) → pas de re-rendu derrière ; à la fermeture → re-rendu
await clickNotif(Cp.page,/Note fictive 3Note/);await W(Cp.page,500);out.modal=await Cp.page.evaluate(()=>document.getElementById('modal').classList.contains('show'));
await Cp.page.evaluate(()=>{const m=document.createElement('i');m.id='tst-mark';document.querySelector('#eq-app .eq-scroll').append(m);});
REG['doc|note_srv3']={kind:'doc',id:'note_srv3',data:{kind:'note',title:'Note sous la fenêtre',html:'<p>Texte fictif.</p>',req:{all:true},active:true,at:nowIso(),by:'Claire TESTBUREAU'},updated_at:nowIso()};
await W(Cp.page,5200);out.underModal=await Cp.page.evaluate(()=>!!document.getElementById('tst-mark'));
await Cp.page.evaluate(()=>document.querySelector("#modal [data-close]").click());await W(Cp.page,500);
out.afterClose={mark:await Cp.page.evaluate(()=>!!document.getElementById('tst-mark')),shown:(await notifs(Cp.page)).some(t=>/Note sous la fenêtre/.test(t))};
// changement d'écran → en haut
await Cp.page.evaluate(()=>document.getElementById('htEspace').click());await W(Cp.page,400);out.yMoi=await getY(Cp.page,SC);
out.ov=await noOverflow(Cp.page);
console.log('1) défilement / saisie / fenêtre :',JSON.stringify(out));
C.c1_defilement=out.tab==='accueil'&&out.n0>=14&&out.y0>=400&&out.arrived&&out.soft&&Math.abs(out.y1-out.y0)<=4;
C.c1_saisie=out.typing.kept&&out.typing.focus&&out.typing.val==='saisie en cours'&&!out.softDuring&&out.afterBlur.gone&&out.afterBlur.shown&&Math.abs(out.afterBlur.y-out.yIn)<=4;
C.c1_fenetre=out.modal&&out.underModal&&!out.afterClose.mark&&out.afterClose.shown;
C.c1_ecran=out.yMoi===0&&out.ov;R.scroller=out.scroller;

// ── 2) document à signer : le bureau publie (ordinateur) → le compagnon le voit sans recharger, le lien ouvre la lecture, il signe → le bureau voit la signature
const Bu=await mkCtx(BUR,{width:1100,height:900});await login(Bu.page,BUR.email);
await Bu.page.evaluate(()=>document.getElementById('htEnt').click());await W(Bu.page,500);
out={docsBtn:await Bu.page.evaluate(()=>{const b=document.querySelector("#eq-app [data-act=xgo][data-v=docs]");if(b){b.click();return true;}return false;})};await W(Bu.page,400);
out.newBtn=await Bu.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=docnew]');if(b){b.click();return true;}return false;});await W(Bu.page,400);
await Bu.page.fill('#dn-title','Note de service fictive SYNC');await Bu.page.fill('#dn-text','Consigne fictive : porter le casque.');await Bu.page.evaluate(()=>document.getElementById('dn-ok').click());await W(Bu.page,1500);
const DOC=Object.values(REG).find(r=>r.kind==='doc'&&r.data.title==='Note de service fictive SYNC');out.reg=!!DOC;
await Cp.page.evaluate(()=>document.getElementById('htHome').click());await W(Cp.page,300);
await W(Cp.page,5000);out.seen=(await notifs(Cp.page)).some(t=>/À lire et signer : Note de service fictive SYNC/.test(t));
out.link=await clickNotif(Cp.page,/Note de service fictive SYNC/);await W(Cp.page,600);
out.open=await Cp.page.evaluate(()=>({modal:document.getElementById('modal').classList.contains('show'),title:(document.querySelector('#modal h3')||{}).textContent||'',read:!!document.getElementById('dr-read')}));
await Cp.page.evaluate(()=>{const b=document.getElementById('dr-body');if(b){b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));}});await W(Cp.page,200);
await Cp.page.evaluate(()=>document.getElementById('dr-read').click());await W(Cp.page,200);await draw(Cp.page,'dr-pad');await Cp.page.evaluate(()=>document.getElementById('dr-ok').click());await W(Cp.page,1200);
out.sig=!!(DOC&&REG['docsig|'+DOC.id+'|'+COMP.email]);await Cp.page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c&&document.getElementById('modal').classList.contains('show'))c.click();});await W(Cp.page,500);
out.goneComp=!(await notifs(Cp.page)).some(t=>/Note de service fictive SYNC/.test(t));
// le bureau est resté sur Entreprise → Documents : la ligne passe à « 1 / … signé » sans recharger
await W(Bu.page,5000);out.bureau=await Bu.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app [data-act=docadm]')].find(x=>/Note de service fictive SYNC/.test(x.textContent));return r?r.textContent.replace(/\s+/g,' '):'';});
console.log('2) document à signer :',JSON.stringify(out));
C.c2_document=out.docsBtn&&out.newBtn&&out.reg&&out.seen&&out.link&&out.open.modal&&/Note de service fictive SYNC/.test(out.open.title)&&out.sig&&out.goneComp&&/\b1 \/ \d+ signé/.test(out.bureau);

// ── 3) accident : le compagnon déclare → l'encadrement le voit dans « À faire » sans recharger, le lien mène à la liste, « traité » → disparaît
await Bu.page.evaluate(()=>document.getElementById('htHome').click());await W(Bu.page,400);
out={compEntry:await Cp.page.evaluate(()=>{document.getElementById('htEspace').click();return true;})};await W(Cp.page,300);
out.compEntry=await Cp.page.evaluate(()=>!!document.querySelector('#eq-app [data-act=accnew],#eq-app [data-v=accident]'));
await Cp.page.evaluate(()=>{const b=document.createElement('button');b.dataset.act='accnew';b.id='tst-acc';document.querySelector('#eq-app .eq-scroll').append(b);b.click();});await W(Cp.page,500);
out.form=await Cp.page.evaluate(()=>!!document.getElementById('ac-ok'));
await Cp.page.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};s('ac-names','Bruno TESTCOMPAGNON');s('ac-lieu','Chantier fictif Alpha');s('ac-circ','Chute de plain-pied fictive (test).');document.getElementById('ac-ok').click();});await W(Cp.page,1500);
out.reg=Object.values(REG).filter(r=>r.kind==='accident').map(r=>r.data.status);
await W(Bu.page,5000);out.seen=(await notifs(Bu.page)).find(t=>/déclaration.* d'accident à traiter/.test(t))||'';
out.link=await clickNotif(Bu.page,/accident à traiter/);await W(Bu.page,600);
out.landed=await Bu.page.evaluate(()=>({tab:window.TRACE.state.homeTab,btn:!!document.querySelector('#eq-app [data-act=acctraite]')}));
await Bu.page.evaluate(()=>document.querySelector('#eq-app [data-act=acctraite]').click());await W(Bu.page,1000);
out.status=Object.values(REG).filter(r=>r.kind==='accident').map(r=>r.data.status);
await Bu.page.evaluate(()=>document.getElementById('htHome').click());await W(Bu.page,500);out.gone=!(await notifs(Bu.page)).some(t=>/accident à traiter/.test(t));
console.log('3) accident :',JSON.stringify(out));
C.c3_accident=out.form&&out.reg.length===1&&out.reg[0]==='declare'&&!!out.seen&&out.link&&out.landed.btn&&out.status[0]==='traite'&&out.gone;R.accEntry=out.compEntry;
await Bu.ctx.close();

// ── 4) magasin : la référente importe le pack fictif ; le compagnon demande → la référente le voit SANS ↻ → prête → le compagnon le voit (sans recharger)
const Mg=await mkCtx(MAG,{width:1100,height:900});await login(Mg.page,MAG.email);
await Mg.page.evaluate(()=>document.getElementById('htParc').click());await W(Mg.page,400);await xclick(Mg.page,'mag|mseg|cat');
await Mg.page.setInputFiles('#eq-app input[data-xin="mag|pack"]',{name:'pack-fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await W(Mg.page,1800);
await Mg.page.evaluate(()=>document.getElementById('htHome').click());await W(Mg.page,400);
out={cat:!!REG['magcat|catalogue']};
await Cp.page.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,300));const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Magasin/.test(x.textContent));if(c)c.click();});await W(Cp.page,800);
await xclick(Cp.page,'mag|new');await xclick(Cp.page,'mag|inc|T-01');await xclick(Cp.page,'mag|inc|T-01');await xclick(Cp.page,'mag|step|2');await xclick(Cp.page,'mag|imp|depot');await xclick(Cp.page,'mag|send');await W(Cp.page,1500);
const D1=Object.values(REG).find(r=>r.kind==="magdem");out.dem=D1&&D1.data.statut;if(!D1){console.log("4-partiel",JSON.stringify(out),(await Cp.page.evaluate(()=>(document.getElementById("eq-app")||{textContent:""}).textContent.replace(/\s+/g," ").slice(0,600))),await Cp.page.evaluate(()=>document.getElementById("toast").textContent),logs);}
await W(Mg.page,5000);out.seenMag=(await notifs(Mg.page)).find(t=>/demande.*à préparer/.test(t))||'';
out.link=await clickNotif(Mg.page,/à préparer/);await W(Mg.page,600);out.landed=await Mg.page.evaluate(()=>({tab:window.TRACE.state.homeTab,seg:(document.querySelector('#eq-app [data-act=parcseg].active')||{dataset:{}}).dataset.v}));
await xclick(Mg.page,'mag|mopen|'+D1.id);await xclick(Mg.page,'mag|start|'+D1.id);await W(Mg.page,1200);await xclick(Mg.page,'mag|pret|'+D1.id);await W(Mg.page,1200);
out.st=REG['magdem|'+D1.id].data.statut;
await Cp.page.evaluate(()=>document.getElementById('htHome').click());await W(Cp.page,5200);
out.seenComp=(await notifs(Cp.page)).find(t=>/prête/.test(t))||'';
out.link2=await clickNotif(Cp.page,/prête/);await W(Cp.page,600);out.landed2=await Cp.page.evaluate(()=>({tab:window.TRACE.state.homeTab,txt:(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,200)}));
out.ov=await noOverflow(Cp.page);
console.log('4) magasin :',JSON.stringify(out));
C.c4_magasin=out.cat&&out.dem==='envoyee'&&/1 demande à préparer/.test(out.seenMag)&&out.link&&out.landed.tab==='parc'&&out.st==='prete'&&/prête/.test(out.seenComp)&&out.link2&&out.landed2.tab==='espace'&&/Prête|prête/.test(out.landed2.txt)&&out.ov;
// rafraîchissement léger : requêtes « depuis » (updated_at=gt.) et jamais le catalogue magasin / la bibliothèque du mémoire / la base de prix dans le rafraîchissement
const light=calls.filter(c=>/\/rest\/v1\/registre/.test(c)&&/updated_at=gt\./.test(c));R.light=light.length;R.lightSample=light[0]||'';
C.c5_leger=light.length>=3&&light.every(c=>!/"prix"/.test(c)&&/id=neq\.memlib/.test(c)); /* 14/10 nuit : le catalogue magasin est dans le rafraîchissement léger (incrémental) ; base de prix et bibliothèque du mémoire restent exclues */
await Mg.ctx.close();await Cp.ctx.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);
console.log('infos :',JSON.stringify(R));
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
