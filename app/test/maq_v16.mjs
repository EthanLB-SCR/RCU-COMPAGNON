// v1.6 : sortie de té = soudure, tés à saut en quinconce, inversion A/R, extrémités (kit / provisoire / by-pass / sous-station), lyre profondeur mini, FC en évidence, traits selon DN
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error')logs.push(m.text().slice(0,200));});
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(400);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(400);
const dump=(B,c)=>B[c].pieces.map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+(p.manchette?'m':'')+')':p.kind==='bend'?'('+p.angle+'°'+(p.plane==='3D'?'↕':'')+','+p.legIn.toFixed(2)+'+'+p.legOut.toFixed(2)+')':p.kind==='tee'?'('+(p.saut?'SAUT':'droit')+'@'+p.mc.toFixed(2)+')':'('+p.kind+')')).join(' ');
// 1) ligne principale + antenne perpendiculaire à droite (côté R), DN100 → tés : R proche = droit, A lointain = à saut décalé de 2 m ; antenne A : sortie de té → C1 90° → C2 90° (coude contre coude) → nominal
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'L1',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null},{id:'L2',name:'A2',dn:100,bar:12,pts:[[40,50],[40,80]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.rebuild();});
let out=await page.evaluate(()=>{const S=window.MAQ.state;const B1=S.built.L1,B2=S.built.L2;const r=[];['A','R'].forEach(c=>{const t=B1[c].pieces.filter(p=>p.kind==='tee');r.push('L1 '+c+' tés: '+t.map(p=>p.id+' '+p.teeType+(p.saut?' SAUT':'')+' @'+p.mc.toFixed(2)+' port('+p.branchPort.x.toFixed(2)+','+p.branchPort.y.toFixed(2)+')').join(' ; '));});
  ['A','R'].forEach(c=>{r.push('A2 '+c+': '+B2[c].pieces.slice(0,6).map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+')':p.kind==='bend'?'('+p.angle+'°,'+p.legIn.toFixed(2)+'+'+p.legOut.toFixed(2)+')':'('+p.kind+')')).join(' ')+' … welds0='+JSON.stringify(B2[c].welds[0]&&{m:B2[c].welds[0].m,teeOut:B2[c].welds[0].teeOut,between:B2[c].welds[0].between})+' pts0='+B2[c].pts.slice(0,3).map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' | ')+' notes: '+B2[c].notes.map(n=>n.kind+':'+n.txt.slice(0,70)).join(' ; '));});
  r.push('L1 A ends: '+B1.A.pieces.filter(p=>p.kind==='endpoint'||p.kind==='endcap').map(p=>p.id+' '+p.kind+' '+p.sub+' @'+p.m0.toFixed(2)+'-'+p.m1.toFixed(2)).join(' ; ')+' welds='+B1.A.welds.length+' first='+B1.A.welds[0].m.toFixed(2)+' last='+B1.A.welds[B1.A.welds.length-1].m.toFixed(2)+' L='+B1.A.length.toFixed(2));
  return r;});
out.forEach(x=>console.log(x));
// 2) inversion A/R sur L1 : les tés changent de conduite (proche = A maintenant)
out=await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].inv=true;window.MAQ.rebuild();const B1=S.built.L1;const r=[];['A','R'].forEach(c=>{const t=B1[c].pieces.filter(p=>p.kind==='tee');r.push('inv L1 '+c+' tés: '+t.map(p=>p.id+' '+p.teeType+(p.saut?' SAUT':'')+' @'+p.mc.toFixed(2)).join(' ; ')+' | offset y of pts0='+B1[c].pts[0][1].toFixed(3));});S.lines[0].inv=false;window.MAQ.rebuild();return r;});
out.forEach(x=>console.log(x));
// 3) extrémités : provisoire / by-pass / sous-station / libre
for(const et of ['provisoire','bypass','sousstation','libre']){out=await page.evaluate(et=>{const S=window.MAQ.state;S.lines[0].endType=et;window.MAQ.rebuild();const B=S.built.L1;return et+' → A last pieces: '+B.A.pieces.slice(-2).map(p=>p.id+'('+p.kind+(p.sub?'/'+p.sub:'')+')').join(' ')+' | A welds '+B.A.welds.length+' R welds '+B.R.welds.length+' | last A weld between '+JSON.stringify(B.A.welds[B.A.welds.length-1].between)+' bypass='+!!B.A.welds[B.A.welds.length-1].bypass+' | notes doubt: '+B.A.notes.filter(n=>n.kind==='doubt').length;},et);console.log(out);}
await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].endType='kit';S.lines[0].startType='libre';window.MAQ.rebuild();});
out=await page.evaluate(()=>{const B=window.MAQ.state.built.L1;return 'start libre → A first piece '+B.A.pieces[0].id+' welds '+B.A.welds.length;});console.log(out);
// 4) lyre par défaut : profondeur = 2 jambes (coude contre coude sur les bras)
await page.evaluate(()=>{const S=window.MAQ.state;S.mode='trace';S.tracing={pts:[[100,100],[120,100]],parent:null,cursor:null};});
await page.evaluate(()=>{document.querySelector('#mTrace').click();});await page.waitForTimeout(100);
await page.evaluate(()=>{const S=window.MAQ.state;S.tracing={pts:[[100,100],[120,100]],parent:null,cursor:null};});
out=await page.evaluate(()=>{const S=window.MAQ.state;S.tracing={pts:[[100,100],[120,100]],parent:null,cursor:null};document.querySelector('#tfLyre')&&document.querySelector('#tfLyre').removeAttribute('disabled');document.querySelector('#tfLyre').click();const W=document.querySelector('#shW').value,H=document.querySelector('#shH').value;document.querySelector('#shCancel').click();return 'lyre défauts : dos '+W+' profondeur '+H;});console.log(out);
// 5) fausse coupe : ligne avec un angle de 7° → soudure FC affichée avec le degré (étiquette dans le SVG)
await page.evaluate(()=>{const S=window.MAQ.state;S.mode='select';S.tracing=null;const a=[10,120],b=[40,120];const th=7*Math.PI/180;const c=[b[0]+30*Math.cos(th),b[1]+30*Math.sin(th)];S.lines.push({id:'L3',name:'L3',dn:50,bar:12,pts:[a,b,c],specials:[],parent:null});window.MAQ.rebuild();const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=12;S.view={k,tx:W/2-40*k,ty:H/2-95*k};window.dispatchEvent(new Event('resize'));});
await page.waitForTimeout(200);
out=await page.evaluate(()=>{const B=window.MAQ.state.built.L3;const fc=B.A.welds.filter(w=>w.fc);const svg=document.querySelector('#net').innerHTML;const m=svg.match(/FC [0-9,]+°/g)||[];const foot=document.querySelector('#foot').textContent;
  // épaisseur : DN50 vs DN100 dans le SVG (stroke-width des tubes)
  const w50=[...document.querySelectorAll('.piece[data-line="L3"]')].map(e=>+e.getAttribute('stroke-width')).filter(x=>x>0)[0];const w100=[...document.querySelectorAll('.piece[data-line="L1"]')].map(e=>+e.getAttribute('stroke-width')).filter(x=>x>0)[0];
  return 'L3 FC welds: '+fc.map(w=>w.id+' '+w.dev.toFixed(2)+'°').join(', ')+' | labels SVG: '+m.slice(0,4).join(' ')+' | foot: '+foot.slice(0,120)+' | stroke DN50='+w50+' DN100='+w100+' (k=12, ratio '+(w100/w50).toFixed(2)+')';});
console.log(out);
await page.screenshot({path:new URL('./maq_v16.png',import.meta.url).pathname});
// 6) té posé à la main en quinconce
out=await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].specials.push({id:'spx',type:'tee',m:15,dnb:65,side:-1,teeType:'te_droit_TP',stagger:2,staggerDir:1,teeTypeFar:'te_a_saut_45_TW'});window.MAQ.rebuild();const B=S.built.L1;return ['A','R'].map(c=>'manuel '+c+': '+B[c].pieces.filter(p=>p.kind==='tee').map(p=>p.id+' '+p.teeType+(p.saut?' SAUT':'')+' @'+p.mc.toFixed(2)).join(' ; ')).join(' || ');});console.log(out);
// 7) vue serrée sur les tés pour la capture
await page.evaluate(()=>{const S=window.MAQ.state;S.sel={kind:'line',id:'L2'};S.tab='sel';window.MAQ.rebuild();const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=40;S.view={k,tx:W/2-40*k,ty:H/2-52*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_v16_tee.png',import.meta.url).pathname});
console.log(logs);await browser.close();
