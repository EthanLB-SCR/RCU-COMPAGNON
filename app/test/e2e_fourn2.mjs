// FOURNITURE v2 (13/10 soir, retours d'Ethan) : ① zone entourée simplifiée — ajouter, retirer, glisser un point (souris réelle, pas de clic JS), ◆ au milieu
// d'un côté pour insérer, ↶ annule, « Fermer » sans point fantôme, « ↩ Reprendre le contour », « ✏️ Modifier le contour » d'une zone existante ;
// boutons posés sur le plan (＋, barre TS) cliquables à la souris ; ② trame type d'import (commande / BL) ; ③ écarts → commande complémentaire / inclus ; ④ BL d'une zone.
// Réseau du test (traceur) : Feeder DN200 120 m + Antenne DN100 84 m, aller + retour (comme e2e_fourniture).
import { chromium } from 'playwright';
import fs from 'fs';
import {trameFromXlsx,TRAME_COLS,trameRows} from '../src/trame.js';
import {makeXlsx} from '../src/xlsx.js';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 */
await page.goto(BASE+'/traceur.html');await wait(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:100,bar:12,pts:[[0,100],[84,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Fourniture v2');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
await page.evaluate(async()=>{document.querySelector('#facets [data-facet=tech]').click();await new Promise(r=>setTimeout(r,200));document.querySelector('#tabbar [data-tab="fourniture"]').click();await new Promise(r=>setTimeout(r,300));});
const scr=(x,y)=>page.evaluate(([x2,y2])=>{const v=window.TRACE.state.view;const r2=document.getElementById('canvas').getBoundingClientRect();return [r2.left+x2*v.k+v.tx,r2.top+y2*v.k+v.ty];},[x,y]);
const clickW=async(x,y)=>{const p=await scr(x,y);await page.mouse.click(p[0],p[1]);await wait(180);};
const dragW=async(a,b)=>{const p=await scr(a[0],a[1]),q=await scr(b[0],b[1]);await page.mouse.move(p[0],p[1]);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(p[0]+(q[0]-p[0])*i/6,p[1]+(q[1]-p[1])*i/6);await wait(30);}await page.mouse.up();await wait(200);};
const clickEl=async sel=>{const b=await page.$(sel);if(!b||!await b.isVisible())return false;await b.scrollIntoViewIfNeeded();await wait(80);const bb=await b.boundingBox();await page.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await wait(250);return true;};
const pose=()=>page.evaluate(()=>{const p=window.TRACE.state.fzPose;return p?{pts:p.pts.map(x=>x.map(v=>Math.round(v))),sel:p.sel,hist:(p.hist||[]).length,edit:p.edit,msg:document.getElementById('fzMsg').textContent,ok:document.getElementById('fzOk').style.display!=='none'?document.getElementById('fzOk').textContent:'',del:document.getElementById('fzDel').style.display!=='none',circles:document.querySelectorAll('#fzG circle').length,mids:document.querySelectorAll('#fzG .fz-mid').length,polys:document.querySelectorAll('#fzG polygon').length}:null;});
// ── 1) entourer à la souris : 4 points, puis glisser le 2e, insérer par le ◆, sélectionner + 🗑, ↶ ×2, « Fermer » (bouton cliqué à la souris : pas de point fantôme)
await clickEl('#fourniture [data-fa=lasso]');await wait(200);
await page.evaluate(()=>window.TRACE.centerOn(30,60,4));await wait(200);
for(const p of [[-6,40],[55,40],[55,60],[-6,60]])await clickW(p[0],p[1]);
let out={a:await pose()};
await dragW([55,40],[70,35]);out.b=await pose();
await dragW([62.5,47.5],[80,50]);out.c=await pose(); /* ◆ entre [70,35] et [55,60] → nouveau point glissé en [80,50] */
await clickW(55,60);out.d=await pose();await clickEl('#fzDel');out.e=await pose();
await clickEl('#fzUndo');out.f=await pose();await clickEl('#fzUndo');out.g=await pose();
await clickEl('#fzOk');out.modal=await page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent,back:!!document.getElementById('fzn-back')}));out.after=await pose();
console.log('1) tracé :',JSON.stringify(out));
C.c1=out.a.pts.length===4&&out.a.circles===4&&out.a.mids===4&&/Fermer/.test(out.a.msg)&&/Fermer/.test(out.a.ok)
  &&JSON.stringify(out.b.pts)==='[[-6,40],[70,35],[55,60],[-6,60]]'&&out.b.hist===5
  &&out.c.pts.length===5&&JSON.stringify(out.c.pts[2])==='[80,50]'&&out.c.mids===5
  &&out.d.sel===3&&out.d.del&&/Point 4 sélectionné/.test(out.d.msg)&&out.e.pts.length===4&&!out.e.pts.some(p=>p[0]===55&&p[1]===60)&&!out.e.del
  &&out.f.pts.length===5&&JSON.stringify(out.g.pts)==='[[-6,40],[70,35],[55,60],[-6,60]]'
  &&/Nouvelle zone/.test(out.modal.h||'')&&out.modal.back&&out.after===null;
// ── 2) « ↩ Reprendre le contour » (même tracé, rien de perdu) → re-« Fermer » → Zone A le 19/10 ; puis « ✏️ Modifier le contour » : toucher le plan insère sur le côté le plus proche ; « Enregistrer »
await page.evaluate(()=>document.getElementById('fzn-back').click());await wait(250);out={back:await pose()};
await clickEl('#fzOk');await page.evaluate(()=>{document.getElementById('fzn-name').value='Zone A';document.getElementById('fzn-date').value='2026-10-19';document.getElementById('fzn-ok').click();});await wait(400);
out.zone=await page.evaluate(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone A');const M=document.getElementById('modal');return {poly:z&&z.poly.map(x=>x.map(v=>Math.round(v))),rem:+((M.querySelector('.ac-stat b')||{}).textContent||0),edit:!!document.getElementById('fz-edit')};});
await page.evaluate(()=>document.getElementById('fz-edit').click());await wait(300);out.ed=await pose();
await clickW(20,63);out.ins=await pose(); /* près du côté bas [55,60]→[-6,60] : inséré entre les deux, pas à la fin */
await dragW([-6,40],[-10,30]);out.mv=await pose();
await clickEl('#fzOk');await wait(300);
out.saved=await page.evaluate(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone A');const M=document.getElementById('modal');return {poly:z&&z.poly.map(x=>x.map(v=>Math.round(v))),by:z&&z.polyBy,tab:window.TRACE.state.tab,title:(M.querySelector('h3')||{}).textContent,rem:+((M.querySelector('.ac-stat b')||{}).textContent||0),pend:window.TRACE._pending().fourniture||null};});
console.log('2) contour :',JSON.stringify(out));
C.c2=JSON.stringify(out.back.pts)==='[[-6,40],[70,35],[55,60],[-6,60]]'&&out.back.hist>=5&&JSON.stringify(out.zone.poly)==='[[-6,40],[70,35],[55,60],[-6,60]]'&&out.zone.edit
  &&out.ed&&out.ed.edit&&/Enregistrer/.test(out.ed.ok)&&out.ed.circles===4&&out.ed.polys===0&&/Zone A/.test(out.ed.msg)
  &&out.ins.pts.length===5&&JSON.stringify(out.ins.pts[3])==='[20,63]'&&JSON.stringify(out.mv.pts[0])==='[-10,30]'
  &&JSON.stringify(out.saved.poly)==='[[-10,30],[70,35],[55,60],[20,63],[-6,60]]'&&out.saved.by==='Ethan L.'&&out.saved.tab==='fourniture'&&/Zone A/.test(out.saved.title||'')&&out.saved.rem>=out.zone.rem;
// ── 3) boutons posés sur le plan, cliqués à la souris : « ＋ Poser sur le plan » ouvre le choix ; ✕ de la barre TS quitte la pose ; ✕ de la zone en modification revient à la zone
await page.evaluate(()=>{const M=document.querySelector('#modal [data-close]');if(M)M.click();const T=window.TRACE;T.state.tab='plan';T.renderAll();});await wait(250);
out={fab:await clickEl('#planFab')};out.sheet=await page.evaluate(()=>document.getElementById('modal').classList.contains('show')&&/Poser sur le plan/.test(document.getElementById('modal').textContent));
await page.evaluate(()=>{const M=document.querySelector('#modal [data-close]');if(M)M.click();else window.TRACE.closeSheet&&0;document.getElementById('modal').classList.remove('show');});await wait(150);
await page.evaluate(()=>window.TRACE.ts.start());await wait(250);out.tsOn=await page.evaluate(()=>!!window.TRACE.state.tsPose);await clickEl('#tsCancel');out.tsOff=await page.evaluate(()=>!window.TRACE.state.tsPose);
await page.evaluate(()=>{const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone A');window.TRACE.fourniture.edit(z.id);});await wait(250);
await clickEl('#fzCancel');out.cancel=await page.evaluate(()=>({pose:!!window.TRACE.state.fzPose,tab:window.TRACE.state.tab,title:(document.querySelector('#modal h3')||{}).textContent}));
console.log('3) boutons du plan :',JSON.stringify(out));
C.c3=out.fab&&out.sheet&&out.tsOn&&out.tsOff&&!out.cancel.pose&&out.cancel.tab==='fourniture'&&/Zone A/.test(out.cancel.title||'');
await page.evaluate(()=>{const M=document.querySelector('#modal [data-close]');if(M)M.click();});await wait(150);
const clip=()=>page.evaluate(()=>navigator.clipboard.readText().catch(e=>'ERR '+e.message));
const dlOf=async fn=>{const dl=page.waitForEvent('download',{timeout:6000}).catch(()=>null);await fn();const d=await dl;if(!d)return null;const p=await d.path();return {name:d.suggestedFilename(),buf:fs.readFileSync(p)};};
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const R=()=>page.evaluate(()=>{const X=window.TRACE.fourniture.compute();const by={};X.rows.forEach(r=>{by[r.label]={aCmd:r.aCmd,aQual:r.aQual,compl:r.compl,inclus:r.inclus,cde:r.cde,besoin:r.besoin};});return {by,tot:{aQual:X.tot.aQual,compl:X.tot.compl,inclus:X.tot.inclus,aCmd:X.tot.aCmd},zones:X.zones.map(Z=>({name:Z.z.name,ann:Z.announced.length,annZ:Z.tot.annZ,aLivrer:Z.tot.aLivrer,rem:Z.tot.rem}))};});
// ── 4) trame type dans « Importer une commande » : copier l'en-tête, la consigne Claude Excel, la trame Excel ; coller la trame remplie (une ligne fausse montrée, pas importée)
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#fourniture [data-fa=cmd][data-v=""]').click();await w(200);[...document.querySelectorAll('#modal [data-fcm]')].find(x=>x.dataset.fcm==='paste').click();await w(150);});
out={box:await page.evaluate(()=>{const b=document.querySelector('#modal details.trame-box');return b?{open:b.open,txt:b.textContent.replace(/\s+/g,' ').slice(0,200)}:null;})};
await clickEl('#modal [data-trame=copy]');out.head=await clip();
await clickEl('#modal [data-trame=claude]');out.consigne=(await clip()).slice(0,80);
const xl=await dlOf(()=>clickEl('#modal [data-trame=xlsx]'));
if(xl){const T=await trameFromXlsx(ab(xl.buf));out.xlsx={name:xl.name,sheet:T&&T.sheet,lines:T&&T.lines.length,zip:xl.buf.slice(0,2).toString()};}
const TSV=[TRAME_COLS.join('\t'),['Barre','200','','','12','18','u','','R-200/315-12','Tube DN200 12 m'].join('\t'),['Barre','100','','','12','84','ml','','R-100/200-12','Tube DN100 au mètre'].join('\t'),['Manchon','200','','','','22','u','315','NT-315','Manchon Ø315'].join('\t'),['Mousse PU','200','','','','22','u','315','PU-315','Mousse A+B'].join('\t'),['Kit fin de ligne','200','','','','2','u','','KFL-200','Kit FDL DN200'].join('\t'),['Bidule','100','','','','1','u','','',''].join('\t')].join('\n');
out.read=await page.evaluate(async P=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('fc-paste').value=P;document.getElementById('fc-read').click();await w(250);const M=document.getElementById('modal');
  return {info:(M.querySelector('.hint')||{}).textContent,rows:[...M.querySelectorAll('table.rc tr')].slice(1).map(tr=>tr.cells[0].textContent.replace(/\s+/g,' ').trim()+' | '+tr.querySelector('[data-fcq]').value),bad:([...M.querySelectorAll('details')].find(d=>/non reconnue/.test(d.textContent))||{}).textContent};},TSV);
await page.evaluate(async()=>{document.getElementById('fc-ok').click();await new Promise(r=>setTimeout(r,300));});
let r=await R();out.after={b200:r.by['Barre DN200'],b100:r.by['Barre DN100'],m200:r.by['Manchon DN200'],tot:r.tot};
console.log('4) trame (commande) :',JSON.stringify(out));
C.c4=out.box&&out.box.open&&out.head===TRAME_COLS.join('\t')&&/Remplis la feuille « Trame »/.test(out.consigne)&&out.xlsx&&out.xlsx.name==='Trame import SCR - commande et BL.xlsx'&&out.xlsx.sheet==='Trame'&&out.xlsx.lines===0&&out.xlsx.zip==='PK'
  &&out.read.rows.length===5&&/84 ml → 7 barres/.test(out.read.rows[1])&&/\| 7$/.test(out.read.rows[1])&&/\| 18$/.test(out.read.rows[0])&&/trame SCR/.test(out.read.info||'')&&/ligne 7 : type « Bidule » inconnu/.test(out.read.bad||'')
  &&out.after.b200.cde===18&&out.after.b200.aQual===2&&out.after.b100.cde===7&&out.after.b100.aQual===7&&out.after.m200.aCmd===0;
// ── 5) écarts au-delà de la commande, comme les TS : Barre DN200 → 1 inclus + 1 en commande complémentaire ; Barre DN100 → 5 inclus puis ↺ ; la commande complémentaire passée
out={card:await page.evaluate(()=>{const c=document.querySelector('#fourniture details[data-fzui=ecarts]');return c?{open:c.open,rows:[...c.querySelectorAll('.fz-ecart')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,60))}:null;}),banner:await page.evaluate(()=>(document.querySelector('#fourniture .err')||{}).textContent||'')};
const qualify=async(label,etat,qty)=>{await page.evaluate(([l,e,qq])=>{const row=[...document.querySelectorAll('#fourniture .fz-ecart')].find(x=>x.textContent.includes(l));if(!row)return;if(qq){const i=row.querySelector('[data-fzq]');i.value=qq;}row.querySelector(`[data-fa=dec][data-v^="${e}|"]`).click();},[label,etat,qty]);await wait(250);};
await qualify('Barre DN200','inclus',1);await qualify('Barre DN200','compl',null);await qualify('Barre DN100','inclus',5);
r=await R();out.q={b200:r.by['Barre DN200'],b100:r.by['Barre DN100'],tot:r.tot};
out.compl=await page.evaluate(()=>{const c=document.querySelector('#fourniture details[data-fzui=compl]');return c?[...c.querySelectorAll('table.fz-compl tr')].slice(1).map(tr=>tr.textContent.replace(/\s+/g,' ').trim()):null;});
await page.evaluate(()=>document.querySelector('#fourniture [data-fa=compltr][data-v=copy]').click());await wait(250);out.complClip=await clip();
out.cell=await page.evaluate(()=>{const tr=[...document.querySelectorAll('#fourniture table.fz-cmp tr')].find(x=>x.cells[0].textContent==='Barre DN200');return tr?tr.cells[9].textContent.replace(/\s+/g,' ').trim():'';});
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#fourniture [data-fa=complgo]').click();await w(200);document.getElementById('fcc-ref').value='CC-1';document.getElementById('fcc-ok').click();await w(300);});
r=await R();out.placed={b200:r.by['Barre DN200'],tot:r.tot,cmds:await page.evaluate(()=>window.TRACE.net.fourniture.cmds.map(c=>c.name+(c.compl?' [compl '+c.ref+']':'')+' '+c.lines.map(l=>l.label+'×'+l.qty).join('+'))),tag:await page.evaluate(()=>/complémentaire/.test((document.querySelector('#fourniture details[data-fzui=cmd]')||{}).textContent||'')),complCard:await page.evaluate(()=>!!document.querySelector('#fourniture details[data-fzui=compl]'))};
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const F=window.TRACE.net.fourniture;const d=F.dec.find(x=>x.label==='Barre DN100'&&!x.deleted);document.querySelector('#fourniture details[data-fzdec]').open=true;document.querySelector(`#fourniture [data-fa=decx][data-v="${d.id}"]`).click();await w(250);});
r=await R();out.reset=r.by['Barre DN100'];out.dec=await page.evaluate(()=>window.TRACE.net.fourniture.dec.map(d=>d.etat+':'+d.qty+(d.deleted?'(retiré)':'')));
console.log('5) écarts :',JSON.stringify(out));
C.c5=out.card&&out.card.rows.length===5&&out.card.rows.some(x=>/^Barre DN200 · 2 au-delà de la commande/.test(x))&&/à qualifier/.test(out.banner)
  &&out.q.b200.inclus===1&&out.q.b200.compl===1&&out.q.b200.aQual===0&&out.q.b200.aCmd===1&&out.q.b100.inclus===5&&out.q.b100.aQual===2&&JSON.stringify(out.compl)==='["Barre DN2001"]'
  &&/^Type de pièce\tDN/.test(out.complClip)&&/\r\nBarre\t200\t\t\t12\t1\tu\t\t\tBarre DN200$/.test(out.complClip)&&/📦1/.test(out.cell)&&/✓1 incl\./.test(out.cell)
  &&out.placed.b200.cde===19&&out.placed.b200.compl===0&&out.placed.b200.aCmd===0&&out.placed.b200.inclus===1&&out.placed.cmds.length===2&&/\[compl CC-1\] Barre DN200×1$/.test(out.placed.cmds[1])&&out.placed.tag&&!out.placed.complCard
  &&out.reset.inclus===0&&out.reset.aQual===7&&out.dec.includes('inclus:5(retiré)');
// ── 6) BL de la zone A au format trame : Excel relu par la trame, puis « → Stock » : livraison prévue pré-remplie, rattachée à la zone (comptée « annoncé »)
await page.evaluate(()=>{const T=window.TRACE;const st=T.net.stock||(T.net.stock={});st.zones=[{id:'Z1',name:'Bord de fouille',x:30,y:70,w:13,h:3,status:'ok'}];st.livs=st.livs||[];st.lots=st.lots||[];st.takes=st.takes||[];st.moves=st.moves||[];T.fourniture.render();});
r=await R();const zA0=r.zones.find(z=>z.name==='Zone A');
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const z=window.TRACE.net.fourniture.zones.find(x=>x.name==='Zone A');document.querySelector(`#fourniture [data-fa=zone][data-v="${z.id}"]`).click();await w(250);document.getElementById('fz-bl').click();await w(250);});
out={bl:await page.evaluate(()=>{const M=document.getElementById('modal');return {h:(M.querySelector('h3')||{}).textContent,n:(document.getElementById('fzbl-n')||{}).value,rows:[...M.querySelectorAll('table.fz-bl tr')].slice(1).map(tr=>tr.textContent.replace(/\s+/g,' ').trim())};})};
const blx=await dlOf(()=>page.evaluate(()=>document.getElementById('fzbl-xlsx').click()));
if(blx){const T=await trameFromXlsx(ab(blx.buf));out.blx={name:blx.name,lines:T&&T.lines.map(l=>(l.kind)+(l.dn||'')+'×'+l.qty),bad:T&&T.bad.length};}
await page.evaluate(async()=>{document.getElementById('fzbl-stock').click();await new Promise(r=>setTimeout(r,400));});
out.stk=await page.evaluate(()=>{const M=document.getElementById('modal');return {tab:window.TRACE.state.tab,name:(document.getElementById('stk-name')||{}).value,bl:(document.getElementById('stk-bl')||{}).value,src:!!M.querySelector('[data-stksrc=trame][style*="background"]'),prev:(document.getElementById('stk-prev')||{}).checked,n:M.querySelectorAll('[data-stkq]').length,info:(M.querySelector('.hint')||{}).textContent};});
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('stk-zone').value='Z1';document.getElementById('stk-ok').click();await w(400);});
out.liv=await page.evaluate(()=>{const st=window.TRACE.net.stock;const v=st.livs[st.livs.length-1];return v&&{label:v.label,bl:v.bl,status:v.status,fz:!!v.fz,src:v.src,lots:st.lots.filter(l=>l.liv===v.id).length,pend:st.lots.filter(l=>l.liv===v.id&&l.pend).length};});
r=await R();out.zA={before:zA0,after:r.zones.find(z=>z.name==='Zone A')};
console.log('6) BL de zone :',JSON.stringify(out));
C.c6=/BL de la zone — Zone A/.test(out.bl.h||'')&&/^BL-Zone-A-\d{8}$/.test(out.bl.n||'')&&out.bl.rows.length>0&&out.blx&&/^BL-Zone-A-\d{8} - Fourniture-v2\.xlsx$/.test(out.blx.name)&&out.blx.lines.length===out.bl.rows.length&&out.blx.bad===0
  &&out.stk.tab==='stock'&&out.stk.name==='Camion Zone A'&&out.stk.bl===out.bl.n&&out.stk.src&&out.stk.prev&&out.stk.n===out.bl.rows.length&&/Zone A/.test(out.stk.info||'')
  &&out.liv&&out.liv.status==='prevu'&&out.liv.fz&&out.liv.src==='fourniture-bl'&&out.liv.lots===out.bl.rows.length&&out.liv.pend===out.liv.lots&&out.zA.after.ann===out.zA.before.ann+1&&out.zA.after.annZ>0&&out.zA.after.aLivrer<out.zA.before.aLivrer;
// ── 7) Stock → Nouvelle livraison → 📋 Trame : coller une trame remplie (une ligne fausse signalée), camion arrivé (pas prévu) → livré dans Fourniture
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('stk-new').click();await w(250);document.querySelector('#modal [data-stksrc=trame]').click();await w(150);});
const TSV2=[TRAME_COLS.join('\t'),['Barre','200','','','12','4','u','','',''].join('\t'),['Coude','200','','90','','2','u','','',''].join('\t'),['Accessoire','','','','','50','ml','','GR','Grillage avertisseur'].join('\t'),['Barre','999','','','12','1','u','','',''].join('\t')].join('\n');
out={read:await page.evaluate(async P=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('stk-tr').value=P;document.getElementById('stk-trread').click();await w(250);const M=document.getElementById('modal');return {info:[...M.querySelectorAll('.hint')].map(x=>x.textContent).join(' | ').slice(0,300),n:M.querySelectorAll('[data-stkq]').length,bad:(M.querySelector('#stk-srcbox details[open]')||{}).textContent||''};},TSV2)};
const b200=(await R()).by['Barre DN200'];
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('stk-prev').checked=false;document.getElementById('stk-zone').value='Z1';document.getElementById('stk-ok').click();await w(400);});
out.lots=await page.evaluate(()=>{const st=window.TRACE.net.stock;const v=st.livs[st.livs.length-1];return st.lots.filter(l=>l.liv===v.id).map(l=>l.label+'×'+l.qty+(l.pend?' att.':''));});
r=await R();out.liv200=[b200&&b200.cde,r.by['Barre DN200'].cde];out.livCount=await page.evaluate(()=>window.TRACE.fourniture.compute().rows.find(x=>x.label==='Barre DN200').liv);
console.log('7) trame (Stock) :',JSON.stringify(out));
C.c7=/Trame SCR/.test(out.read.info)&&out.read.n===3&&/ligne 5 : DN « 999 » inconnu/.test(out.read.bad)&&JSON.stringify(out.lots)==='["Barre 12 m DN200×4","Coude 90° DN200×2","Grillage avertisseur (ml)×50"]'&&out.livCount===4;
// ── 8) fichier Excel du fournisseur avec la trame remplie sur la 2e feuille (« Trame ») : lue directement, la 1re feuille (tableau du fournisseur) ignorée
{const wbU8=await makeXlsx([{name:'AR fournisseur',rows:[['Article','Désignation','Qté','PU'],['R-200/315-12','Tube acier pré-isolé DN200','6','312,50'],['K-200/315-90','Coude 90 DN200','2','410']]},{name:'Trame',rows:trameRows([{kind:'pipe',dn:200,len:12,qty:6,ref:'R-200/315-12',des:'Tube acier pré-isolé DN200'},{kind:'bend',dn:200,angle:90,qty:2,ref:'K-200/315-90',des:'Coude 90 DN200'}]),head:1}]);
 const fp='/tmp/e2e_fourn2_trame.xlsx';fs.writeFileSync(fp,wbU8);
 await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));window.TRACE.state.tab='fourniture';window.TRACE.renderAll();await w(200);document.querySelector('#fourniture [data-fa=cmd][data-v=""]').click();await w(200);});
 await page.setInputFiles('#fc-file',fp);await wait(900);
 out=await page.evaluate(()=>{const M=document.getElementById('modal');return {info:[...M.querySelectorAll('.hint')].map(x=>x.textContent).join(' | ').slice(0,260),rows:[...M.querySelectorAll('table.rc tr')].slice(1).map(tr=>tr.cells[0].textContent.replace(/\s+/g,' ').trim()+' | '+tr.querySelector('[data-fcq]').value)};});
 await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(150);
 console.log('8) fichier avec trame :',JSON.stringify(out));
 C.c8=/trame SCR · feuille « Trame »/.test(out.info)&&JSON.stringify(out.rows)==='["R-200/315-12 — Tube acier pré-isolé DN200 | 6","K-200/315-90 — Coude 90 DN200 | 2"]';}
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
