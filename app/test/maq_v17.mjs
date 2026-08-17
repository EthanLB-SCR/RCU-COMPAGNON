// v1.7 : tés côte à côte (té à saut sans coude en sortie), inversion sur l'antenne, DN qui baisse après une réduction, tés de purge / vidange (+ en bout, + photo), type de bout depuis la pièce
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error')logs.push(m.text().slice(0,200));});
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(400);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(400);
const P=(B,c)=>B[c].pieces.map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+',DN'+p.dn+')':p.kind==='bend'?'('+p.angle+'°,'+p.legIn.toFixed(2)+'+'+p.legOut.toFixed(2)+',DN'+p.dn+')':p.kind==='tee'?'('+(p.vert?(p.vert==='up'?'PURGE':'VIDANGE')+' DN'+p.dnb:(p.saut?'SAUT':'droit'))+'@'+p.mc.toFixed(2)+')':'('+p.kind+(p.dn2?' DN'+p.dn+'→'+p.dn2:'')+')')).join(' ');
// 1) feeder + antenne perpendiculaire côté R : tés côte à côte (décalés de e2), R = droit, A = saut, antenne A repart droit du port (pas de coude)
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null},{id:'L2',name:'A2',dn:80,bar:12,pts:[[40,50],[40,80]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.rebuild();});
let out=await page.evaluate(()=>{const S=window.MAQ.state;const B1=S.built.L1,B2=S.built.L2;const r=[];['A','R'].forEach(c=>{const t=B1[c].pieces.filter(p=>p.kind==='tee');r.push('Feeder '+c+' tés: '+t.map(p=>p.id+' '+p.teeType+(p.saut?' SAUT':'')+' @'+p.mc.toFixed(2)+' L'+p.L+' port('+p.branchPort.x.toFixed(2)+','+p.branchPort.y.toFixed(2)+')').join(' ; '));});
  ['A','R'].forEach(c=>{r.push('A2 '+c+': '+B2[c].pieces.slice(0,4).map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+')':p.kind==='bend'?'('+p.angle+'°)':'('+p.kind+')')).join(' ')+' | weld0='+JSON.stringify(B2[c].welds[0]&&{m:B2[c].welds[0].m,teeOut:B2[c].welds[0].teeOut,between:B2[c].welds[0].between})+' pts='+B2[c].pts.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' | '));});return r;});
out.forEach(x=>console.log(x));
// 2) inversion sur l'ANTENNE : ses conduites changent de côté, les deux tés s'échangent sur le feeder (déplacés de e2), le feeder ne bouge pas
out=await page.evaluate(()=>{const S=window.MAQ.state;const before={A:S.built.L1.A.pts[0][1],R:S.built.L1.R.pts[0][1]};S.lines[1].inv=true;window.MAQ.rebuild();const B1=S.built.L1,B2=S.built.L2;const r=[];r.push('feeder offsets avant '+JSON.stringify(before)+' après '+JSON.stringify({A:B1.A.pts[0][1],R:B1.R.pts[0][1]}));['A','R'].forEach(c=>{const t=B1[c].pieces.filter(p=>p.kind==='tee');r.push('inv-antenne feeder '+c+' tés: '+t.map(p=>p.id+' '+p.teeType+(p.saut?' SAUT':'')+' @'+p.mc.toFixed(2)).join(' ; ')+' | antenne '+c+' x='+B2[c].pts[1][0].toFixed(2));});S.lines[1].inv=false;window.MAQ.rebuild();return r;});
out.forEach(x=>console.log(x));
// 3) réduction DN100 → DN65 à PK 15 sur le feeder : après, tubes/coudes/manchons en DN65 (gaine plus fine), soudures DN65
out=await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].specials.push({id:'r1',type:'reducer',m:15,dn2:65});S.lines[0].pts=[[10,50],[70,50],[70,80]];window.MAQ.rebuild();const B=S.built.L1;const A=B.A;const w=A.welds.map(w=>w.dn);return 'A: '+A.pieces.map(p=>p.id+'/DN'+p.dn+(p.dn2?'→'+p.dn2:'')+'/g'+Math.round(p.casing*1000)).join(' ')+'\n welds dn: '+w.join(',')+'\n bend legs après réduction: '+A.pieces.filter(p=>p.kind==='bend').map(p=>p.id+' DN'+p.dn+' '+p.legIn+'+'+p.legOut+' '+p.ref).join(' ; ');});
console.log(out);
// 4) té de purge à PK 20 (les deux conduites), vidange en bout de ligne collée au kit, photo sur la purge
out=await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines[0];l.specials.push({id:'pv1',type:'tee',vert:'up',m:20});l.specials.push({id:'pv2',type:'tee',vert:'down',atEnd:true,m:0});window.MAQ.rebuild();const B=S.built.L1;const r=[];['A','R'].forEach(c=>{const t=B[c].pieces.filter(p=>p.kind==='tee'&&p.vert);r.push(c+' purge/vidange: '+t.map(p=>p.id+' '+(p.vert==='up'?'PURGE':'VIDANGE')+' DN'+p.dnb+' @'+p.mc.toFixed(2)+' L'+p.L+' ref='+p.ref+' | pièces autour: '+B[c].pieces.filter(q=>Math.abs(q.m0-p.m1)<0.01||Math.abs(q.m1-p.m0)<0.01).map(q=>q.id).join('/')).join(' ; '));});
  r.push('L='+B.A.length.toFixed(2)+' fin: '+B.A.pieces.slice(-3).map(p=>p.id+'['+p.m0.toFixed(2)+'-'+p.m1.toFixed(2)+']').join(' ')+' welds A='+B.A.welds.length);
  const svg=document.querySelector('#net').innerHTML;r.push('symboles SVG: purge ▲ '+(svg.match(/purge ▲/g)||[]).length+' vidange ▼ '+(svg.match(/vidange ▼/g)||[]).length+' (k='+S.view.k.toFixed(1)+')');
  // photo : dataURL factice
  l.specials.find(x=>x.id==='pv1').photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';window.MAQ.rebuild();r.push('📷 dans le SVG : '+(document.querySelector('#net').innerHTML.includes('📷')));
  return r;});
out.forEach(x=>console.log(x));
// 5) fiche pièce du kit : select de type de fin présent ; fiche purge : bouton photo
out=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built.L1;const F=B.A.pieces.find(p=>p.kind==='endcap');S.sel={kind:'piece',line:'L1',cond:'A',id:F.id};S.tab='sel';window.MAQ.rebuild();const has=!!document.querySelector('#pcEnd');const pv=B.A.pieces.find(p=>p.kind==='tee'&&p.vert==='up');S.sel={kind:'piece',line:'L1',cond:'A',id:pv.id};window.MAQ.rebuild();const hasPhoto=!!document.querySelector('#pvPhoto');const img=!!document.querySelector('#panel img');return 'fiche kit select='+has+' | fiche purge photo input='+hasPhoto+' vignette='+img;});
console.log(out);
// capture
await page.evaluate(()=>{const S=window.MAQ.state;S.sel={kind:'line',id:'L2'};window.MAQ.rebuild();const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=30;S.view={k,tx:W/2-40*k,ty:H/2-53*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_v17.png',import.meta.url).pathname});
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=30;S.view={k,tx:W/2-22*k,ty:H/2-50*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_v17_red.png',import.meta.url).pathname});
console.log(logs);await browser.close();
