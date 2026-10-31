// e2e_tile_0111 — 01/11 (Ethan : « le plan d'ensemble, des fois ça ne charge pas toute l'image, ça arrive régulièrement »)
//  Serveur IGN simulé (aucune requête réelle) : la 1re demande de chaque tuile échoue sur 1 tuile sur 3, puis réussit.
//  c1  une tuile en échec est cachée (pas d'icône « image cassée ») puis redemandée et affichée : à la fin, toutes les tuiles du plan sont visibles et chargées
//  c2  seules les tuiles en échec sont redemandées (pas de rafale sur les autres)
//  c3  une tuile qui échoue toujours : 3 nouvelles tentatives au plus, puis elle reste cachée (pas d'icône) ; une de plus au retour du réseau
//  c4  zéro erreur de page
import {chromium} from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const errs=[];const J=x=>JSON.stringify(x);
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqGeoBwAEhQGAzKfkiQAAAABJRU5ErkJggg==','base64');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(String(e)));
const seen=new Map();let mode='flaky';const key=u=>{const m=/TILEMATRIX=(\d+)&TILEROW=(\d+)&TILECOL=(\d+)/.exec(u);return m?m.slice(1).join('/'):u;};
await p.route(/data\.geopf\.fr\/wmts/,async r=>{const k=key(r.request().url());const n=(seen.get(k)||0)+1;seen.set(k,n);
  const h=[...k].reduce((a,c)=>a+c.charCodeAt(0),0);const bad=mode==='dead'?true:(n===1&&h%3===0);if(bad)return r.abort('failed');return r.fulfill({status:200,contentType:'image/png',body:PNG});});
await p.route(/data\.geopf\.fr\/(?!wmts)/,r=>r.abort('failed'));
await p.goto(BASE+'/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(800);
if(await p.locator('#loginSkip').isVisible().catch(()=>false))await p.click('#loginSkip');await p.waitForTimeout(400);
const site=await p.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');T.renderHome();const id='saintlo';T.sites[id].geo={crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:403000,f:6893000}}; /* chantier de démo recalé (fictif), pas encore ouvert sur la page */await T.openSiteFromHome(id);T.state.show.carte='ortho';T.renderAll();return {id,geo:!!(T.sites[id]&&T.sites[id].geo)};});
await p.waitForTimeout(800);await p.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
const snap=()=>p.evaluate(()=>{const im=[...document.querySelectorAll('#map image')];return {n:im.length,hidden:im.filter(x=>x.style.visibility==='hidden').length,retried:im.filter(x=>/#r\d/.test(x.getAttribute('href')||'')).length,ok:im.filter(x=>!x.style.visibility).length};});
const o={site,t1:await snap()};await p.waitForTimeout(2600);o.t2=await snap();o.req=[...seen.values()];
console.log('c1/c2)',J(o));
C.c1=site.geo&&o.t1.n>0&&o.t2.hidden===0&&o.t2.retried>0&&o.t2.ok===o.t2.n;
C.c2=o.req.every(n=>n===1||n===3)&&o.req.filter(n=>n===3).length===o.t2.retried; /* tuile en échec : la 1re demande, la nouvelle tentative, puis la tuile du plan qui la reprend (cache du navigateur en vrai) ; les autres : une seule */
// c3 : serveur hors service sur une nouvelle vue (zoom) — au plus 3 nouvelles tentatives par tuile, puis rien
mode='dead';seen.clear();await p.evaluate(()=>{const T=window.TRACE;T.state.view.k*=2.2;T.renderAll();});await p.waitForTimeout(16500);
o.dead={snap:await snap(),req:[...seen.values()],lost:await p.evaluate(()=>window.__trTiles.lost())};
const before=[...seen.values()].reduce((a,c)=>a+c,0);await p.evaluate(()=>dispatchEvent(new Event('online')));await p.waitForTimeout(10800);const after=[...seen.values()].reduce((a,c)=>a+c,0);
o.dead.online=after-before;console.log('c3)',J(o.dead));
C.c3=o.dead.snap.n>0&&o.dead.snap.hidden===o.dead.snap.n&&o.dead.req.every(n=>n<=4)&&o.dead.lost===o.dead.snap.n&&o.dead.online===o.dead.snap.n;
await b.close();C.c4=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
