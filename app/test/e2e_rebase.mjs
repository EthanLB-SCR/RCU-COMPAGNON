// REPÈRE LOIN DE L'ORIGINE (13/10, Ethan, « Nantes Géraudière » : « au-dessus de 16 px/m tout disparaît »). Le traceur avait gardé l'origine du plan
// précédent (Saint-Lô, CC49) pour un plan de Nantes (CC47) → réseau à ~1 985 km de l'origine du repère. ① Chrome n'affichait plus rien au-delà de ~2^25 px
// (translate(tx) avec tx ≈ −k·2·10^6) : la vue s'écrit maintenant « scale(k) translate(tx/k ty/k) » ; ② bandeau « ⚠ Repère du plan à 1 985 km » + Recentrer :
// tout le chantier décalé d'un bloc (réseau, fond, marché, stock, notes, zones, hydraulique, modifs), géoréférencement et numéros inchangés, détail juste au zoom ;
// ③ le traceur ne reprend plus l'origine d'un plan éloigné. Unités : rebaseSite / buildBackground en Node.
import { chromium } from 'playwright';
import {rebaseSite,farOffset} from '../src/rebase.js';
import {geoOfSite,planToLonLat,fixGeoPts} from '../src/geo.js';
import {parseDXF,buildBackground} from '../src/dxfimport.js';
const BASE=process.env.BASE||'http://localhost:8765';
const C={};
// ── 0) unités
{const X=1000,Y=1985000;const net={id:'t',lines:[{id:'L1',traceur:true,axis:[[X,Y],[X+120,Y]],cond:{A:{els:[{id:'P1',axis:[[[X,Y],[X+12,Y]]],from:[X,Y],to:[X+12,Y]},{id:'T1',kind:'tee',axis:[[[X+12,Y],[X+14,Y]]],from:[X+12,Y],to:[X+14,Y],branch:[[X+13,Y],[X+13,Y+1.5]]}],welds:[{idx:0,weldId:'S-0001',m:12,x:X+12,y:Y}]},R:{els:[],welds:[]}}}],
   traceur:{lines:[{id:'L1',pts:[[X,Y],[X+120,Y]],specials:[{m:13}]}],bgOrigin:{x0:1380000,y1:8210000}},drawing:[{pts:[[X-50,Y-10],[X+200,Y-10]]},{text:'RUE',x:X+10,y:Y+5,h:1}],bbox:[X-50,Y-10,X+200,Y+60],
   geo:{crs:'EPSG:2154',aff:{a:0.98,b:0.2,c:0.2,d:-0.98,e:355000-X,f:6690000+Y}},marche:{lines:[{id:'L1',axis:[[X,Y],[X+120,Y]]}]},stock:{zones:[{id:'Z1',x:X+30,y:Y+70,w:13,h:3}]},conv:{msgs:[{id:'m1',pos:[X+5,Y+5]}]},
   fourniture:{zones:[{id:'FZ1',poly:[[X,Y-5],[X+60,Y-5],[X+60,Y+5]]}]},hydro:{water:[{x:X+1,y:Y+2}],cuts:[{line:'L1',m:40}]},ts:{items:[{id:'t1',geo:[[[X,Y],[X+3,Y+1]]],m:20}]},ann:[{p:[X+7,Y+7]}]};
 const off=farOffset(net);const r=rebaseSite(net,off.dx,off.dy);const p0=[X+60,Y+3],p1=[p0[0]-off.dx,p0[1]-off.dy];const a=planToLonLat(geoOfSite(net),p0),b=planToLonLat(geoOfSite(r),p1);
 C.u_rebase=off.dist>1.9e6&&r.lines[0].axis[1][1]===Y-off.dy&&r.lines[0].cond.A.welds[0].weldId==='S-0001'&&r.lines[0].cond.A.els[1].branch[1][1]===Y+1.5-off.dy&&r.traceur.bgOrigin.y1===8210000-off.dy&&r.drawing[1].y===Y+5-off.dy
   &&r.marche.lines[0].axis[0][1]===Y-off.dy&&r.stock.zones[0].y===Y+70-off.dy&&r.conv.msgs[0].pos[1]===Y+5-off.dy&&r.fourniture.zones[0].poly[2][1]===Y+5-off.dy&&r.hydro.water[0].y===Y+2-off.dy&&r.hydro.cuts[0].m===40&&r.ts.items[0].geo[0][1][1]===Y+1-off.dy&&r.ann[0].p[1]===Y+7-off.dy
   &&Math.abs(a[0]-b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9&&farOffset(r)===null&&net.lines[0].axis[0][1]===Y;
 const dxf=(x0,y0)=>{const L=[];const line=(p,q,s,t)=>L.push('0','LINE','8','RESEAU','10',String(p),'20',String(q),'30','0','11',String(s),'21',String(t),'31','0');for(let i=0;i<30;i++)line(x0+i*10,y0,x0+i*10+10,y0);return ['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES',...L,'0','ENDSEC','0','EOF'].join('\n');};
 const R1=buildBackground(parseDXF(dxf(1380500,8212300)),{netLayers:['RESEAU'],margin:200});const R2=buildBackground(parseDXF(dxf(1353400,6227800)),{netLayers:['RESEAU'],margin:200,keepOrigin:R1.origin});const R3=buildBackground(parseDXF(dxf(1380700,8212500)),{netLayers:['RESEAU'],margin:200,keepOrigin:R1.origin});
 // 13/10 soir (Ethan : « depuis que j'ai recentré, Nantes n'est plus bien placé sur la carte ») : les REPÈRES du calage (pts.plan) suivent ; un chantier recentré avant
 // la correction (repères restés dans l'ancien repère) se répare à l'affichage (fixGeoPts : le repère est replacé par le calage lui-même)
 {const g0=geoOfSite(net);const pt=[X+5,Y+2];const ll0=planToLonLat(g0,pt);const n2=JSON.parse(JSON.stringify(net));n2.geo.pts=[{plan:pt.slice(),ll:ll0}];const r2=rebaseSite(n2,off.dx,off.dy);
  const stale=JSON.parse(JSON.stringify(r2));stale.geo.pts[0].plan=pt.slice();const nfix=fixGeoPts(stale.geo);const healthy=JSON.parse(JSON.stringify(r2));const nfix0=fixGeoPts(healthy.geo);
  C.u_calage=r2.geo.pts[0].plan[0]===X+5-off.dx&&r2.geo.pts[0].plan[1]===Y+2-off.dy&&JSON.stringify(r2.geo.pts[0].ll)===JSON.stringify(ll0)
   &&nfix===1&&Math.abs(stale.geo.pts[0].plan[0]-(X+5-off.dx))<0.01&&Math.abs(stale.geo.pts[0].plan[1]-(Y+2-off.dy))<0.01&&nfix0===0&&JSON.stringify(healthy.geo.pts)===JSON.stringify(r2.geo.pts);
  console.log('0b) calage :',JSON.stringify({pts:r2.geo.pts[0].plan,stale:stale.geo.pts[0].plan,nfix,nfix0}));}
 C.u_traceur=R2.originReset===true&&R2.originFar>1.9e6&&R2.drawing.every(d=>!d.pts||d.pts.every(p=>Math.abs(p[0])<1000&&Math.abs(p[1])<1000))&&R3.originReset===false&&R3.origin===R1.origin;
 console.log('0) unités :',JSON.stringify({u_rebase:C.u_rebase,u_traceur:C.u_traceur,dist:off.dist}));}
// ── navigateur : réseau tracé à 1 985 km de l'origine (comme Nantes avec l'origine de Saint-Lô)
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(600);
const X=1000,Y=1985000;
await page.evaluate(([X,Y])=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[X,Y],[X+120,Y],[X+120,Y+60]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:100,bar:12,pts:[[X,Y+40],[X+84,Y+40]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();},[X,Y]);
await page.click('#bSave');await wait(200);await page.fill('#svName','Nantes loin');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
// parties posées sur le plan (dans l'ancien repère) + calage carte + une soudure faite
await page.evaluate(([X,Y])=>{const T=window.TRACE;const N=T.net;N.geo={crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:355000-X,f:6690000+Y}};T.geoRefresh();
  N.stock={zones:[{id:'Z1',name:'Bord de fouille',x:X+30,y:Y+70,w:13,h:3,status:'ok'}],livs:[],lots:[],takes:[],moves:[]};N.conv={msgs:[{id:'cv1',at:new Date().toISOString(),by:'Ethan L.',text:'regard ici',pos:[X+5,Y+5],kind:'note'}],seq:2};
  N.fourniture={v:1,cmds:[],extra:[],zones:[{id:'FZ1',name:'Zone A',poly:[[X-5,Y-5],[X+60,Y-5],[X+60,Y+5],[X-5,Y+5]],date:'2026-10-19',at:new Date().toISOString(),upd:new Date().toISOString()}],dec:[],cfg:{}};
  N.hydro={prest:{epreuve:true},params:{},cuts:[],water:[{x:X+2,y:Y+8}],fills:[],skids:[],cal:[]};
  const j=T.state.lines.L1.cond.A.joints[0];j.status='soudee';T.state.show.carte='plan';T.renderAll();},[X,Y]);await wait(300);
const view=async kpm=>{await page.evaluate(kpm=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();const v=T.state.view;v.k=kpm;const e=T.state.lines.L1.cond.A.els[1];T.centerOn(e.to.x,e.to.y+1.5,0);},kpm);await wait(450);}; /* centré sur la soudure S-0002 (fin de la 1re barre), quel que soit le repère */
const pix=async(name)=>{const c=await page.$('#canvas');const bb=await c.boundingBox();const s=await page.evaluate(()=>{const T=window.TRACE;const e=T.state.lines.L1.cond.A.els[1];const v=T.state.view;return [e.to.x*v.k+v.tx,e.to.y*v.k+v.ty];});
  const cx=Math.max(150,Math.min(bb.width-150,s[0])),cy=Math.max(120,Math.min(bb.height-120,s[1]));const buf=await page.screenshot({clip:{x:bb.x+cx-150,y:bb.y+cy-120,width:300,height:240}});return page.evaluate(async b64=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const g=cv.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,cv.width,cv.height).data;let dark=0,orange=0;for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b=d[i+2];if(r+gg+b<200)dark++;if(r>200&&gg>110&&gg<160&&b<90)orange++;}return {dark,orange};},buf.toString('base64'));};
// ── 1) avant : à 19,6 px/m le réseau reste visible (vue réparée) ; bandeau « Repère à 1 985 km » ; au zoom fort, les fils (cuivré) manquent (arrondi des flottants)
await view(19.6);let out={tf:await page.evaluate(()=>document.getElementById('world').getAttribute('transform')),p196:await pix(),pill:await page.evaluate(()=>{const p=document.querySelector('#planPills [data-pill=recenter]');return p?p.textContent.replace(/[\u202f\u00a0]/g,' '):'';})};
await view(120);out.p120=await pix();
const before=await page.evaluate(([X,Y])=>{const T=window.TRACE;const l=T.state.lines.L1;const j=l.cond.A.joints[0];const p=T.state.lines.L1.cond.A.els[0].to;const v=T.state.view;const g=T.siteGeo();return {weld:j.weldId,status:j.status,scr:[p.x*v.k+v.tx,p.y*v.k+v.ty],ll:T.geo.planToLonLat(g,[p.x,p.y]),nWelds:T.net.lines.reduce((s,L)=>s+L.cond.A.welds.length+L.cond.R.welds.length,0)};},[X,Y]);
console.log('1) avant :',JSON.stringify({...out,before}));
C.c1=/^scale\(19\.6\) translate\(/.test(out.tf)&&out.p196.dark>500&&/Repère du plan à 1 985 km de l'origine · Recentrer/.test(out.pill)&&out.p120.orange<40;
// ── 2) bandeau → fenêtre « Recentrer » ; sans connexion (chantier pas en bac à sable) : refusé, rien ne bouge
await page.evaluate(()=>document.querySelector('#planPills [data-pill=recenter]').click());await wait(250);
out={modal:await page.evaluate(()=>{const M=document.getElementById('modal');return M.classList.contains('show')?M.textContent.replace(/[\u202f\u00a0]/g,' ').replace(/\s+/g,' '):'';})};
await page.evaluate(()=>document.getElementById('rcOk').click());await wait(500);
out.toast=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');out.still=await page.evaluate(()=>window.TRACE.net.lines[0].axis[0][1]);
console.log('2) hors connexion :',JSON.stringify({...out,modal:out.modal.slice(0,300)}));
C.c2=/Recentrer le repère du plan/.test(out.modal)&&/1 985 km/.test(out.modal)&&/pas de 13 cm|pas de 12 cm|pas de 1\d cm/.test(out.modal)&&/numéros de soudure, statuts/.test(out.modal)&&/Connecte-toi d'abord/.test(out.toast)&&out.still===Y;
// ── 3) recentrage par le bouton, sur une copie BAC À SABLE (permis sans connexion : rien ne part au serveur) : tout décalé d'un bloc, même lieu à l'écran et
//      sur la carte, numéros et statuts gardés, plus de bandeau
const sbId=await page.evaluate(async()=>{const T=window.TRACE;const src=T.net;const x=JSON.parse(JSON.stringify(T.sites[src.id]));x.id='demo_far';x.name='Nantes loin (bac à sable)';
  ['geo','stock','conv','fourniture','hydro'].forEach(k=>{x[k]=JSON.parse(JSON.stringify(src[k]));});
  {const L0=x.lines[0].axis;const pA=[L0[0][0]+10,L0[0][1]],pB=[L0[0][0]+110,L0[0][1]];x.geo.pts=[pA,pB].map(p=>({plan:p,ll:T.geo.planToLonLat({crs:x.geo.crs,aff:x.geo.aff},p).map(v=>+v.toFixed(7))}));x.geo.by='test';} /* calage à la main : 2 repères posés sur le réseau */
  const w=x.lines[0].cond.A.welds[0];x.sbWelds={[w.weldId]:{weld_id:w.weldId,line_id:x.lines[0].id,cond:'A',status:'soudee',data:{events:[],photos:[]}}};T.sites.demo_far=x;await T.go('demo_far');await new Promise(r=>setTimeout(r,500));return T.net.id;});
await view(120);
const before2=await page.evaluate(()=>{const T=window.TRACE;const j=T.state.lines.L1.cond.A.joints[0];const p=T.state.lines.L1.cond.A.els[0].to;const v=T.state.view;const g=T.siteGeo();return {home:T.rebase.homeLL('demo_far'),id:T.net.id,weld:j.weldId,status:j.status,scr:[p.x*v.k+v.tx,p.y*v.k+v.ty],ll:T.geo.planToLonLat(g,[p.x,p.y]),nWelds:T.net.lines.reduce((s,L)=>s+L.cond.A.welds.length+L.cond.R.welds.length,0)};});
await page.evaluate(()=>document.querySelector('#planPills [data-pill=recenter]').click());await wait(250);await page.evaluate(()=>document.getElementById('rcOk').click());await wait(900);
const ok=await page.evaluate(()=>!window.TRACE.rebase.far());
const after=await page.evaluate(()=>{const T=window.TRACE;const N=T.net;if(N.id!=='demo_far')return {ok:false,id:N.id};const l=T.state.lines.L1;const j=l.cond.A.joints[0];const p=l.cond.A.els[0].to;const v=T.state.view;const g=T.siteGeo();
  const box=N.lines.reduce((b,L)=>{(L.axis||[]).forEach(q=>{b[0]=Math.min(b[0],q[0]);b[1]=Math.min(b[1],q[1]);b[2]=Math.max(b[2],q[0]);b[3]=Math.max(b[3],q[1]);});return b;},[1e12,1e12,-1e12,-1e12]);
  const cands=(T.mod.elements()||[]).map(c=>c.kind==='tube'?'geo':c.kind); /* 29/10 (lot 2910b) : éléments — un tube dévié vaudrait 'geo' */
  return {ok:true,home:T.rebase.homeLL('demo_far'),pts:N.geo&&N.geo.pts&&N.geo.pts[0]&&N.geo.pts[0].plan,weld:j.weldId,status:j.status,scr:[p.x*v.k+v.tx,p.y*v.k+v.ty],ll:T.geo.planToLonLat(g,[p.x,p.y]),box,stock:[N.stock.zones[0].x,N.stock.zones[0].y],conv:N.conv.msgs[0].pos,fz:N.fourniture.zones[0].poly[0],water:[N.hydro.water[0].x,N.hydro.water[0].y],marche:N.marche&&N.marche.lines[0].axis[0],cands,pill:!!document.querySelector('#planPills [data-pill=recenter]'),rebased:(N.rebased||[]).length,nWelds:N.lines.reduce((s,L)=>s+L.cond.A.welds.length+L.cond.R.welds.length,0)};});
await view(120);after.p120=await pix();await view(19.6);after.p196=await pix();
after.toast=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');console.log('3) après :',JSON.stringify({ok,sbId,before2,after}));
const dy=Y-after.box[1];
C.c3=ok===true&&sbId==='demo_far'&&before2.status==='soudee'&&after.weld===before2.weld&&after.status==='soudee'&&after.nWelds===before2.nWelds&&Math.abs(after.box[1])<500&&Math.abs(after.box[0])<500&&Math.hypot(after.scr[0]-before2.scr[0],after.scr[1]-before2.scr[1])<1
  &&Math.abs(after.ll[0]-before2.ll[0])<1e-7&&Math.abs(after.ll[1]-before2.ll[1])<1e-7&&/Repère recentré/.test(after.toast)&&Math.abs(after.stock[1]-(Y+70-dy))<0.01&&Math.abs(after.conv[1]-(Y+5-dy))<0.01&&Math.abs(after.fz[1]-(Y-5-dy))<0.01&&Math.abs(after.water[1]-(Y+8-dy))<0.01
  &&after.marche&&Math.abs(after.marche[1]-(Y-dy))<0.01&&!after.cands.includes('geo')&&!after.pill&&after.rebased===1&&after.p120.orange>60&&after.p196.dark>500;
// 3b) carte des chantiers : l'épingle (calculée sur les repères du calage) ne bouge pas au recentrage (bug du 13/10 : elle partait à ~2 000 km → chantier « non localisé »)
C.c3b=Array.isArray(before2.home)&&Array.isArray(after.home)&&Math.abs(before2.home[0]-after.home[0])<1e-6&&Math.abs(before2.home[1]-after.home[1])<1e-6&&before2.home[1]>47&&before2.home[1]<47.5&&Array.isArray(after.pts)&&Math.abs(after.pts[1]-(Y-dy))<0.01;
console.log('3b) épingle accueil :',JSON.stringify({avant:before2.home,apres:after.home,repere:after.pts}));
// ── 4) le recentrage est gardé (copie de l'appareil) : rechargement de la page → toujours recentré, pas de bandeau
await page.evaluate(()=>{localStorage.setItem('trace:sandbox','1');});await page.reload();await wait(1500);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible()){await sk.click();await wait(600);}
out=await page.evaluate(async()=>{const T=window.TRACE;const id=T.sites.demo_far?'demo_far':null;if(!id)return {id:null,ids:Object.keys(T.sites)};await T.go(id);await new Promise(r=>setTimeout(r,700));T.state.tab='plan';T.renderAll();return {id,y:T.net.lines[0].axis[0][1],status:T.state.lines.L1.cond.A.joints[0].status,pill:!!document.querySelector('#planPills [data-pill=recenter]')};});
console.log('4) rechargé :',JSON.stringify(out));
C.c4=out.id==='demo_far'&&Math.abs(out.y)<500&&out.status==='soudee'&&!out.pill;
// ── 5) chantier recentré AVANT la correction (comme Nantes avec le build 92c3f2) : repères du calage restés dans l'ancien repère → l'épingle se remet en place
out=await page.evaluate(([Y,dy])=>{const T=window.TRACE;const s=T.sites.demo_far;if(!s||!s.geo||!s.geo.pts)return {ok:false};const ok0=T.rebase.homeLL('demo_far');
  s.geo.pts.forEach(q=>{q.plan=[q.plan[0],q.plan[1]+dy];}); /* état laissé par l'ancien recentrage */
  const m={id:'demo_far_meta',geo:JSON.parse(JSON.stringify(s.geo)),bgo:s.traceur&&s.traceur.bgOrigin,w:s.w,h:s.h,nbox:s.nbox}; /* méta serveur (chantier pas ouvert sur cet appareil) */
  const meta=T.rebase.homeLL(m);return {ok:true,ok0,meta,home:T.rebase.homeLL('demo_far'),pts:s.geo.pts[0].plan};},[Y,dy]);
console.log('5) réparation :',JSON.stringify(out));
C.c5=out.ok&&[out.ok0,out.meta,out.home].every(h=>Array.isArray(h)&&Math.abs(h[0]-before2.home[0])<1e-6&&Math.abs(h[1]-before2.home[1])<1e-6)&&Math.abs(out.pts[1]-(Y-dy))<0.01;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
