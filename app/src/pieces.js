export function createPieceEngine(opts){const {SUB,statuses,saved,onCommit}=opts;

const $=s=>opts.toolEl?opts.toolEl.querySelector(s):null;const emit=()=>{if(opts.onChange)opts.onChange();};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2});const rad=a=>a*Math.PI/180,deg=r=>r*180/Math.PI;
/* ================= base fournisseurs (extrait ZPU / Renalia série 2) ================= */
const DB={ casing:{20:110,25:110,32:125,40:125,50:140,65:160,80:180,100:225,125:250,150:280,200:355,250:450,300:500}, steelOD:{20:26.9,25:33.7,32:42.4,40:48.3,50:60.3,65:76.1,80:88.9,100:114.3,125:139.7,150:168.3,200:219.1,250:273,300:323.9},
  bend:dn=>({legs:dn<=200?1.0:dn<=250?1.2:1.5, R:(dn<=80?3:dn<=300?2.5:1.5)*DB.steelOD[dn]/1000, ref:'K-'+dn}), tee:dn=>({L:dn<=80?1.0:dn<=200?1.5:2.0,B:dn<=250?1.0:1.5,ref:'TP-'+dn}), reducer:1.0, valve:1.5, endcap:.3, stdLen:[6,12,16], devMax:3 };
const MIN_CHUTE_ENGINE=.5; // en dessous, pas de chute entre deux pièces : on soude direct
/* ================= pièces : géométrie locale (port 0 à l'origine, cap +x) ================= */
function localGeom(p){ // → {axis:[[{x,y}...]], ports:[{x,y,th}], len}
  if(p.kind==='tube'||p.kind==='connector'||p.kind==='reducer'||p.kind==='valve'||p.kind==='endcap'){const L=p.L;return {axis:[[{x:0,y:0},{x:L,y:0}]],ports:[{x:0,y:0,th:0},{x:L,y:0,th:0}],len:L};}
  if(p.kind==='bend'){const a=rad(p.angle)*(p.turn||1);const R=p.R;const legs=p.legs;const t=Math.abs(R*Math.tan(a/2));const s1=Math.max(.05,legs-t),s2=Math.max(.05,legs-t);const pts=[{x:0,y:0},{x:s1,y:0}];const cy=Math.sign(a)*R;const n=Math.max(4,Math.round(Math.abs(deg(a))/6));
    for(let i=1;i<=n;i++){const ph=a*i/n;pts.push({x:s1+R*Math.sin(Math.abs(ph)),y:cy-Math.sign(a)*R*Math.cos(ph)});}
    const e=pts[pts.length-1];const end={x:e.x+s2*Math.cos(a),y:e.y+s2*Math.sin(a)};pts.push(end);return {axis:[pts],ports:[{x:0,y:0,th:0},{x:end.x,y:end.y,th:a}],len:s1+s2+Math.abs(a)*R};}
  if(p.kind==='tee'){const {L,B}=p;const s=p.side||1;return {axis:[[{x:0,y:0},{x:L,y:0}],[{x:L/2,y:0},{x:L/2,y:s*B}]],ports:[{x:0,y:0,th:0},{x:L,y:0,th:0},{x:L/2,y:s*B,th:s*Math.PI/2}],len:L};}
}
const T=(p,pt)=>({x:p.pos.x+pt.x*Math.cos(p.pos.th)-pt.y*Math.sin(p.pos.th),y:p.pos.y+pt.x*Math.sin(p.pos.th)+pt.y*Math.cos(p.pos.th)});
function worldGeom(p){const g=localGeom(p);return {axis:g.axis.map(pl=>pl.map(q=>T(p,q))),ports:g.ports.map(q=>({...T(p,q),th:p.pos.th+q.th})),len:g.len};}
/* ================= reconnaissance : éléments extraits du plan → pièces catalogue ================= */
const uv=a=>({x:Math.cos(a),y:Math.sin(a)});const dirOf=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
const plen=pl=>pl.reduce((s,q,i)=>i?s+Math.hypot(q.x-pl[i-1].x,q.y-pl[i-1].y):0,0);
const kinkOf=pl=>{let mx=0;for(let i=1;i<pl.length-1;i++){mx=Math.max(mx,Math.abs(deg(norm(dirOf(pl[i],pl[i+1])-dirOf(pl[i-1],pl[i])))));}return mx;};
const lastDir=e=>{const a=e.axis[0];return dirOf(a[a.length-2],a[a.length-1]);},firstDir=e=>dirOf(e.axis[0][0],e.axis[0][1]);
const marksNear=(x,y,r)=>{const m=(SUB.texts||[]).filter(t=>Math.hypot(t.x-x,t.y-y)<r);const short=[...new Set(m.filter(t=>t.t.length<=6).map(t=>t.t))];const long=m.filter(t=>t.t.length>6).map(t=>t.t);return {short,long};};
const marksTxt=(x,y,r)=>{const m=marksNear(x,y,r);let s='';if(m.short.length)s+=' ; repères plan à proximité : '+m.short.map(t=>'« '+t+' »').join(', ');if(m.long.length)s+=' ; le plan note ici : '+m.long.map(t=>'« '+t+' »').join(', ');return s;};
function normEls(els){return els.map((e,i)=>{let pls=(e.axis||[]).map(pl=>pl.map(p=>[p[0],p[1]])).filter(pl=>pl.length>=2);
  if(pls.length>1){const out=[pls[0]];for(let k=1;k<pls.length;k++){const last=out[out.length-1];const pl=pls[k];const L=last[last.length-1],F=last[0];const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);const c=[d(pl[0],L),d(pl[pl.length-1],L),d(pl[0],F),d(pl[pl.length-1],F)];const m=Math.min(...c);
    if(m<.05){const w=c.indexOf(m);if(w===0)out[out.length-1]=last.concat(pl.slice(1));else if(w===1)out[out.length-1]=last.concat(pl.slice().reverse().slice(1));else if(w===2)out[out.length-1]=pl.slice().reverse().concat(last.slice(1));else out[out.length-1]=pl.concat(last.slice(1));}else out.push(pl);}pls=out;}
  let main=pls[0]||[[e.from[0],e.from[1]],[e.to[0],e.to[1]]];const dA=Math.hypot(main[0][0]-e.from[0],main[0][1]-e.from[1]),dB=Math.hypot(main[main.length-1][0]-e.from[0],main[main.length-1][1]-e.from[1]);if(dB<dA)main=main.slice().reverse();
  const axis=[main].concat(pls.slice(1));let angle=e.angle;
  if((angle===null||angle===undefined)&&e.kind==='bend'){if(main.length>=3){const a=main[0],v=main[1],b=main[main.length-1];angle=Math.round(Math.abs(deg(norm(dirOf(v,b)-dirOf(a,v)))));}else{const prev=els[i-1],next=els[i+1];angle=prev&&next?Math.round(Math.abs(deg(norm(dirOf(next.from,next.to)-dirOf(prev.from,prev.to))))):90;}}
  return {...e,axis,angle};});}
function recognize(els){els=normEls(els);
  const isStd=L=>DB.stdLen.some(s=>Math.abs(L-s)<.06);const notes=[];
  // 1) motif « coude, tube court, coude dont la 1re branche revient sur ses pas » = piquage (té non dessiné comme té)
  const src=els.map(e=>({...e}));const out1=[];
  for(let i=0;i<src.length;i++){const a=src[i],p=src[i+1],b=src[i+2];
    if(a&&p&&b&&a.kind==='bend'&&p.kind==='pipe'&&b.kind==='bend'&&b.axis[0].length>=3&&p.len<4){const pl=b.axis[0];const l1={x:pl[1][0]-pl[0][0],y:pl[1][1]-pl[0][1]};const pd={x:p.to[0]-p.from[0],y:p.to[1]-p.from[1]};const cs=(l1.x*pd.x+l1.y*pd.y)/((Math.hypot(l1.x,l1.y)*Math.hypot(pd.x,pd.y))||1);
      if(cs<-.95){const prev=out1[out1.length-1];const vtx=[pl[1][0],pl[1][1]];const dm=prev?lastDir(prev):dirOf(pl[pl.length-2],pl[pl.length-1]);const t=DB.tee(b.dn);const u=uv(dm);
        const stubEnd=p.to;const stubLen=Math.hypot(stubEnd[0]-vtx[0],stubEnd[1]-vtx[1]);const cr=u.x*(stubEnd[1]-vtx[1])-u.y*(stubEnd[0]-vtx[0]);const f=[vtx[0]-u.x*t.L/2,vtx[1]-u.y*t.L/2],to=[vtx[0]+u.x*t.L/2,vtx[1]+u.y*t.L/2];
        out1.push({id:a.id+'+'+p.id+'+'+b.id,kind:'tee',dn:b.dn,casing:b.casing,len:t.L,from:f,to,axis:[[f,to]],side:cr>=0?1:-1,stubLen,interp:'piquage'});
        notes.push({kind:'interp',txt:`${a.id} + ${p.id} + ${b.id} : l'axe du plan fait un aller-retour de ${fmt(p.len)} m (piquage / purge) → interprété comme un té ${t.ref} avec une antenne de ${fmt(stubLen)} m — à vérifier`+marksTxt(vtx[0],vtx[1],9)});i+=2;continue;}}
    out1.push(a);}
  // 2) liens « demi-tour » (angle > 150°) : jambes mises à l'équerre (écart signalé) ; si un départ de ligne du plan touche le lien → coude + té + coude ; sinon lyre = 2 coudes 90° + barre
  const out2=[];out1.forEach((e,i)=>{if(e.kind==='bend'&&e.angle>150){const prev=out1[i-1],next=out1[i+1];const b=DB.bend(e.dn);const g=b.legs;const A=e.from,B=e.to;
      const dP=prev?lastDir(prev):dirOf(A,B)-Math.PI/2;const dN=next?firstDir(next):dirOf(A,B)+Math.PI/2;
      const dL=Math.atan2(Math.sin(dP)-Math.sin(dN),Math.cos(dP)-Math.cos(dN));const uL=uv(dL);const t=(B[0]-A[0])*uL.x+(B[1]-A[1])*uL.y;let A2=[...A],B2=[...B],ext='';
      if(t>=0){A2=[A[0]+uL.x*t,A[1]+uL.y*t];ext=prev?prev.id+' rallongée de '+fmt(t)+' m':'';}else{B2=[B[0]-uL.x*t,B[1]-uL.y*t];ext=next?next.id+' rallongée de '+fmt(-t)+' m':'';}
      const dB=dirOf(A2,B2);const uB=uv(dB);const uN=uv(dL+Math.PI);const AB=Math.hypot(B2[0]-A2[0],B2[1]-A2[1]);const sq=Math.abs(t)>.1?` ; les deux jambes du plan sont décalées de ${fmt(Math.abs(t))} m → ${ext} pour fermer à l'équerre — à vérifier`:'';
      const turnA=norm(dB-dL)>=0?1:-1,turnB=norm(dL+Math.PI-dB)>=0?1:-1;
      // un autre départ de ligne (autre chaîne du plan) arrive-t-il sur ce lien ?
      let hit=null;(SUB.others||[]).forEach(o=>{[o.pt,o.pt2].filter(Boolean).forEach(pt=>{const proj=(pt[0]-A2[0])*uB.x+(pt[1]-A2[1])*uB.y;const lat=(pt[0]-A2[0])*(-uB.y)+(pt[1]-A2[1])*uB.x;if(proj>-.5&&proj<AB+.5&&Math.abs(lat)<4&&(!hit||Math.abs(lat)<Math.abs(hit.lat)))hit={o,proj,lat};});});
      const a1=[A2[0]-uL.x*g,A2[1]-uL.y*g],a2=[A2[0]+uB.x*g,A2[1]+uB.y*g],b1=[B2[0]-uB.x*g,B2[1]-uB.y*g],b2=[B2[0]+uN.x*g,B2[1]+uN.y*g];
      out2.push({id:e.id+'a',kind:'bend',dn:e.dn,casing:e.casing,len:2*g,angle:90,axis:[[a1,A2,a2]],from:a1,to:a2,head:dL,turn:turnA,interp:hit?'té':'demi-tour'});
      if(hit){const tt_=DB.tee(e.dn);const V=[A2[0]+uB.x*hit.proj,A2[1]+uB.y*hit.proj];const side=hit.lat>=0?1:-1;const tf=[V[0]-uB.x*tt_.L/2,V[1]-uB.y*tt_.L/2],tt=[V[0]+uB.x*tt_.L/2,V[1]+uB.y*tt_.L/2];
        const gap1=hit.proj-tt_.L/2-g,gap2=AB-hit.proj-tt_.L/2-g;const bars=[];
        if(gap1>.05){out2.push({id:e.id+'b',kind:'pipe',dn:e.dn,casing:e.casing,len:+gap1.toFixed(3),axis:[[a2,tf]],from:a2,to:tf,interp:'té'});bars.push(fmt(gap1)+' m');}
        out2.push({id:e.id+'t',kind:'tee',dn:e.dn,casing:e.casing,len:tt_.L,from:tf,to:tt,axis:[[tf,tt]],side,branchTo:hit.o.pt2||hit.o.pt,other:hit.o,interp:'té'});
        if(gap2>.05){out2.push({id:e.id+'c',kind:'pipe',dn:e.dn,casing:e.casing,len:+gap2.toFixed(3),axis:[[tt,b1]],from:tt,to:b1,interp:'té'});bars.push(fmt(gap2)+' m');}
        notes.push({kind:'interp',txt:`${e.id} : lien de ${fmt(e.len)} m entre ${prev?prev.id:'?'} et ${next?next.id:'?'} sur lequel arrive un départ de ligne du plan (${hit.o.id}, ${fmt(hit.o.len)} m, DN${hit.o.dn}, à ${fmt(Math.abs(hit.lat))} m) → ce n'est pas une lyre : coude ${b.ref}/90 + té ${tt_.ref} (branche vers ${hit.o.id}) + coude ${b.ref}/90`+(bars.length?', barre(s) coupée(s) '+bars.join(' et '):'')+(gap1<-.05?` ; le coude chevauche le té de ${fmt(-gap1)} m → soudé direct, à vérifier`:'')+(gap2<-.05?` ; le té chevauche le coude de ${fmt(-gap2)} m → à vérifier`:'')+sq+marksTxt(V[0],V[1],9)});}
      else{const Lb=+(AB-2*g).toFixed(3);out2.push({id:e.id+'b',kind:'pipe',dn:e.dn,casing:e.casing,len:Lb,axis:[[a2,b1]],from:a2,to:b1,interp:'demi-tour'});
        notes.push({kind:'interp',txt:`${e.id} : demi-tour de ${fmt(e.len)} m entre deux tubes (lyre ?) → 2 coudes ${b.ref}/90 + barre coupée ${fmt(Lb)} m`+sq+marksTxt((A[0]+B[0])/2,(A[1]+B[1])/2,6)});}
      out2.push({id:e.id+(hit?'d':'c'),kind:'bend',dn:e.dn,casing:e.casing,len:2*g,angle:90,axis:[[b1,B2,b2]],from:b1,to:b2,head:dB,turn:turnB,interp:hit?'té':'demi-tour'});}
    else out2.push(e);});
  // 3) fusion des fragments < 0,6 m avec la barre voisine (artefact des repères de coupe du plan)
  const merged=[];out2.forEach((e,i)=>{const last=merged[merged.length-1];if(e.kind==='pipe'&&e.len<.6&&!e.gap){if(last&&last.kind==='pipe'&&!last.gap){last.len=+(last.len+e.len).toFixed(3);last.to=e.to;last.axis=[[...last.axis[0],...e.axis[0].slice(1)]];last.merged=(last.merged||0)+1;return;}const nx=out2[i+1];if(nx&&nx.kind==='pipe'&&!nx.gap){nx.len=+(nx.len+e.len).toFixed(3);nx.from=e.from;nx.axis=[[...e.axis[0],...nx.axis[0].slice(1)]];nx.merged=(nx.merged||0)+1;return;}}merged.push({...e});});
  // 3b) coude contre coude : deux coudes séparés d'un bout d'axe plus court que « jambe + jambe + chute mini » → les coudes se soudent l'un sur l'autre (le plan du BE dessine le sommet à sommet, pas les jambes)
  const cornerOf=e=>{if(e.corner)return e.corner;const A=e.axis[0];if(A.length<3)return null;const a=A[0],b=A[1],c=A[A.length-2],d=A[A.length-1];const r=[b[0]-a[0],b[1]-a[1]],s=[c[0]-d[0],c[1]-d[1]];const den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)return A[Math.floor(A.length/2)];const t=((d[0]-a[0])*s[1]-(d[1]-a[1])*s[0])/den;return [a[0]+r[0]*t,a[1]+r[1]*t];}; // sommet du coude = intersection des deux jambes (vrai même quand l'axe dessine l'arc)
  const m2=[];for(let i=0;i<merged.length;i++){const a=merged[i];let p=merged[i+1],b=merged[i+2];let adjacent=false;
    if(a&&p&&a.kind==='bend'&&p.kind==='bend'){b=p;p=null;adjacent=true;} // coudes déjà collés (emprises qui se chevauchaient sur l'axe)
    if(a&&b&&a.kind==='bend'&&b.kind==='bend'&&(adjacent||(p&&p.kind==='pipe'&&!p.gap))&&(a.angle||0)>=15&&(b.angle||0)>=15){
      const la=DB.bend(a.dn||100).legs,lb=DB.bend(b.dn||100).legs;const ca=cornerOf(a),cb=cornerOf(b);
      const D=ca&&cb?Math.hypot(cb[0]-ca[0],cb[1]-ca[1]):(p?p.len:0)+(a.len||.5)/2+(b.len||.5)/2; // distance sommet à sommet sur le plan
      const need=la+lb;
      if(D<need+MIN_CHUTE_ENGINE){ // pas la place d'une chute (≥ 0,5 m) entre les deux jambes
        b.follow=true;b.followOf=a.id;const ref=DB.bend(a.dn||100).ref;const at=ca||(p?p.from:a.to);
        if(D>=need-.35)notes.push({kind:'interp',txt:`${a.id} + ${b.id} : coude contre coude — les deux coudes ${ref}/${a.angle}° et ${ref}/${b.angle}° se soudent l'un sur l'autre (jambes ${fmt(la)} + ${fmt(lb)} m ; le plan montre ${fmt(D)} m entre les deux sommets)`+marksTxt(at[0],at[1],4)});
        else if(D>=need-.9)notes.push({kind:'doubt',txt:`${a.id} + ${b.id} : chicane courte — deux coudes ${ref} soudés l'un sur l'autre font ${fmt(need)} m entre sommets, le plan n'en montre que ${fmt(D)} m → jambes recoupées de ${fmt((need-D)/2)} m chacune ? à confirmer`+marksTxt(at[0],at[1],4)});
        else notes.push({kind:'doubt',txt:`${a.id} + ${b.id} : chicane trop courte pour les pièces catalogue — deux coudes ${ref} font ${fmt(need)} m entre sommets, le plan n'en montre que ${fmt(D)} m → coudes spéciaux à jambes courtes ? 2 × 45° ? déviations aux manchons ? à confirmer (dessin gardé, coudes soudés l'un sur l'autre en attendant)`+marksTxt(at[0],at[1],4)});
        m2.push(a);if(!adjacent)i+=1;continue;} // p sauté ; b sera le « a » du tour suivant (chaînes de 3-4 coudes : lyres, chicanes doubles)
    }
    m2.push(a);}
  merged.length=0;merged.push(...m2);
  // 4) rapprochement catalogue
  const out=[];const n={tube:0,bend:0,tee:0,x:0};
  let lastDn=null;merged.forEach((e,mi)=>{const dn=e.dn||lastDn||100;lastDn=dn;const ax=e.axis[0];const prevE=merged[mi-1],nextE=merged[mi+1];const prevOut=prevE?lastDir(prevE):null,nextIn=nextE?firstDir(nextE):null;
    const planFrom={x:e.from[0],y:e.from[1]},planTo={x:e.to[0],y:e.to[1]};const dir=dirOf(e.from,e.to);
    const base={dn,casing:DB.casing[dn]||e.casing,planFrom,planTo,planDir:dir,dirIn:firstDir(e),dirOut:lastDir(e),src:e.id,interp:e.interp,follow:!!e.follow,followOf:e.followOf};
    const jump=(label)=>{ // saut du tracé : direction conservée de part et d'autre → baïonnette (2 coudes 90°) ; sinon pièce inconnue
      const par=prevOut!==null&&nextIn!==null&&Math.abs(deg(norm(nextIn-prevOut)))<12;const uF=uv(prevOut===null?dir:prevOut);const vx=e.to[0]-e.from[0],vy=e.to[1]-e.from[1];const fwd=vx*uF.x+vy*uF.y,lat=-vx*uF.y+vy*uF.x;const b=DB.bend(dn);const g=b.legs;
      if(par&&Math.abs(lat)>1.2){const turn=lat>=0?1:-1;const h1=prevOut,h2=prevOut+turn*Math.PI/2;const uL=uv(h2);const Lbar=Math.abs(lat)-2*g;
        const p1=[e.from[0]+uF.x*g+uL.x*g,e.from[1]+uF.y*g+uL.y*g];const p2=Lbar>=.5?[p1[0]+uL.x*Lbar,p1[1]+uL.y*Lbar]:p1;const p3=[p2[0]+uL.x*g+uF.x*g,p2[1]+uL.y*g+uF.y*g];
        out.push({...base,id:'C'+(++n.bend),kind:'bend',angle:90,turn,legs:g,R:b.R,rigid:true,head:h1,planFrom,planTo:{x:p1[0],y:p1[1]},planDir:h1,ref:b.ref+'/90 · baïonnette'});
        if(Lbar>=.5)out.push({...base,id:'P'+(++n.tube),kind:'tube',L:+Lbar.toFixed(2),cut:true,rigid:false,planFrom:{x:p1[0],y:p1[1]},planTo:{x:p2[0],y:p2[1]},planDir:h2,dirIn:h2,dirOut:h2,ref:'R-'+dn+'/'+DB.casing[dn]+' · barre coupée (baïonnette)'});
        out.push({...base,id:'C'+(++n.bend),kind:'bend',angle:90,turn:-turn,legs:g,R:b.R,rigid:true,head:h2,planFrom:{x:p2[0],y:p2[1]},planTo:{x:p3[0],y:p3[1]},planDir:h2,dirIn:h2,dirOut:h1,ref:b.ref+'/90 · baïonnette'});
        notes.push({kind:'interp',txt:`${e.id} : le tracé du plan saute de ${fmt(e.len)} m en gardant sa direction (décalage latéral ${fmt(Math.abs(lat))} m, avance ${fmt(fwd)} m) → baïonnette : 2 coudes ${b.ref}/90 (branches ${fmt(g)} + ${fmt(g)} m)`+(Lbar>=.5?` + barre coupée ${fmt(Lbar)} m`:` soudés l'un sur l'autre (décalage plan ${fmt(Math.abs(lat))} m contre ${fmt(2*g)} m avec les pièces catalogue)`)+(Math.abs(fwd-2*g)>.1?` ; avance plan ${fmt(fwd)} m contre ${fmt(2*g)} m avec les pièces catalogue → écart de ${fmt(Math.abs(fwd-2*g))} m absorbé par la barre suivante`:'')+marksTxt((e.from[0]+e.to[0])/2,(e.from[1]+e.to[1])/2,3)});}
      else{out.push({...base,id:'X'+(++n.x),kind:'connector',L:+e.len.toFixed(2),cut:true,rigid:false,unknown:true,ref:'pièce non lue sur le plan ('+fmt(e.len)+' m)'});notes.push({kind:'unknown',txt:`${e.id} : le tracé du plan est interrompu ici et reprend ${fmt(e.len)} m plus loin (${label}) — pièce non lue, gardée telle quelle en gris — à vérifier`+marksTxt((e.from[0]+e.to[0])/2,(e.from[1]+e.to[1])/2,3)});}};
    if(e.kind==='pipe'&&e.gap){jump('désaxement');}
    else if(e.kind==='pipe'){const std=isStd(e.len);const kk=kinkOf(ax.map(q=>[q[0],q[1]]));out.push({...base,id:'P'+(++n.tube),kind:'tube',L:+e.len.toFixed(2),cut:!std,rigid:std,ref:'R-'+dn+'/'+DB.casing[dn]+(std?' · barre 12 m':' · barre coupée')});
      if(std&&kk>2)notes.push({kind:'warn',txt:`${out[out.length-1].id} : le plan dessine un angle de ${fmt(kk)}° au milieu d'une barre entière de ${fmt(e.len)} m → impossible pour une barre : 2 barres ou déviation au manchon ? (gardée entière, rectiligne)`});}
    else if(e.kind==='tee'){const t=DB.tee(dn);let side=e.side;if(side===undefined&&e.axis[1]){const b=e.axis[1];const bd=dirOf(b[0],b[b.length-1]);side=norm(bd-dir)>=0?1:-1;}out.push({...base,id:'T'+(++n.tee),kind:'tee',L:t.L,B:t.B,side:side||1,stubLen:e.stubLen,branchTo:e.branchTo,other:e.other,rigid:true,head:dir,ref:t.ref+(e.branchTo?' · té vers '+e.other.id:e.interp?' · té interprété (piquage)':' · té du plan'+(e.code?' ('+e.code+')':''))});}
    else if(e.kind==='reducer'){const d2=e.dn2||(nextE&&nextE.dn)||dn;out.push({...base,id:'R'+(++n.x),kind:'reducer',L:DB.reducer,dn2:d2,rigid:true,head:dir,ref:'réduction DN'+dn+'/'+d2+(e.code?' ('+e.code+')':'')});}
    else if(e.kind==='valve'){out.push({...base,id:'V'+(++n.x),kind:'valve',L:DB.valve,rigid:true,head:dir,ref:'vanne'+(e.code?' ('+e.code+')':'')});}
    else if(e.kind==='endcap'){out.push({...base,id:'B'+(++n.x),kind:'endcap',L:DB.endcap,rigid:true,head:dir,ref:'bouchon de fin'+(e.code?' ('+e.code+')':'')});}
    else if(e.kind==='steelbend'){const ang=Math.abs(e.angle||15);out.push({...base,id:'K'+(++n.bend),kind:'bend',angle:ang,custom:false,turn:turnSign(e),legs:.5,R:.3,rigid:true,head:e.head,steel:true,ref:'courbe acier 5252 · '+ang+'° (manchon coudé SXB)'});}
    else if(e.kind==='bend'){const ang=e.angle||0;
      if(ang<15){const jog=prevOut===null?0:Math.abs(deg(norm(dir-prevOut)));
        if(jog>15)jump('désaxé de '+fmt(jog)+'°');
        else{out.push({...base,id:'L'+(++n.tube),kind:'connector',L:+e.len.toFixed(2),cut:true,rigid:false,ref:'déviation '+ang+'° au manchon · barre coupée'});if(ang>DB.devMax)notes.push({kind:'warn',txt:`${e.id} : déviation de ${ang}° au manchon > ${DB.devMax}° admis (coupe de biaise) → à répartir sur 2–3 manchons ou coude spécial`});}}
      else{const b=DB.bend(dn);const std=[90,45,60,30,15,75].find(a=>Math.abs(a-ang)<=4);const turn=e.turn||turnSign(e);
        out.push({...base,id:'C'+(++n.bend),kind:'bend',angle:std||ang,custom:!std,turn,legs:b.legs,R:b.R,rigid:true,head:e.head,ref:b.ref+'/'+(std||ang)+(std?'':' · angle spécial')});
        if(!std)notes.push({kind:'warn',txt:`${e.id} : coude de ${ang}° hors catalogue (K-${dn}/90 fait 90°) → coude à angle spécial à commander, ou 90° + déviations aux manchons`+marksTxt(e.axis[0][1][0],e.axis[0][1][1],2.5)});}}
    else{out.push({...base,id:'U'+(++n.x),kind:'connector',L:+e.len.toFixed(2),cut:true,rigid:false,unknown:true,ref:'élément '+e.kind+' non reconnu'});notes.push({kind:'unknown',txt:`${e.id} : élément ${e.kind} non reconnu`});}
  });
  // 5) changements de DN sans réduction dessinée
  for(let i=0;i<out.length-1;i++){const dOut=out[i].kind==='reducer'?(out[i].dn2||out[i].dn):out[i].dn;const dIn=out[i+1].dn;if(dOut!==dIn){out[i].dnNext=dIn;const lo=Math.min(dOut,dIn),hi=Math.max(dOut,dIn);notes.push({kind:'missing',txt:`entre ${out[i].id} et ${out[i+1].id} : passage DN${dOut} → DN${dIn} sans réduction sur le plan → réduction R-${lo}/${hi} à prévoir (non ajoutée au dessin, signalée)`});}}
  return {chain:out,notes};}
function turnSign(e){const pl=e.axis[0];if(pl.length<3)return 1;const a=pl[0],v=pl[1],b=pl[pl.length-1];const cr=(v[0]-a[0])*(b[1]-v[1])-(v[1]-a[1])*(b[0]-v[0]);return cr>=0?1:-1;}
/* ================= solveur : pièces rigides ancrées au plan (ou déplacées), barres coupées = longueurs libres qui gardent la forme du plan ================= */
function solve(chain,opts={}){
  const absorb=opts.absorb||new Set();const rep={devs:[],drifts:[],bad:[]};let cur=null,prevUnk=false;const isRig=q=>q.rigid||!!q.lock;
  for(let i=0;i<chain.length;i++){const p=chain[i];
    if(isRig(p)){p.pos=p.lock?{...p.lock}:(p.follow&&cur&&!p.role)?{x:cur.x,y:cur.y,th:cur.th}:{x:p.anchor.x,y:p.anchor.y,th:p.th0};if(cur){const d=Math.hypot(cur.x-p.pos.x,cur.y-p.pos.y);p.drift=d;if(d>.05)rep.drifts.push({id:p.id,d});const dv=deg(norm(p.pos.th-cur.th));p.dev=dv;if(Math.abs(dv)>DB.devMax&&!prevUnk)rep.devs.push({id:p.id,dev:dv});}else{p.drift=0;p.dev=0;}const g=worldGeom(p);cur=g.ports[1];prevUnk=false;}
    else{let j=i+1;while(j<chain.length&&!isRig(chain[j]))j++;const tgt=j<chain.length?(chain[j].lock||chain[j].anchor):null;const start=cur||{x:p.anchor.x,y:p.anchor.y,th:p.th0};const grp=chain.slice(i,j);
      const th0=q=>q.thCur??q.planDir,L0=q=>q.Lcur??q.L0;const m=grp.findIndex(q=>absorb.has(q.uid));let poses;
      if(m>=0&&tgt){ // une manchette désignée absorbe tout : les autres pièces du groupe gardent longueur et cap
        const before=grp.slice(0,m),after=grp.slice(m+1);let c={x:start.x,y:start.y};const P=[];
        before.forEach(q=>{P.push({th:th0(q),L:L0(q),x:c.x,y:c.y});c={x:c.x+Math.cos(th0(q))*L0(q),y:c.y+Math.sin(th0(q))*L0(q)};});
        let e={x:tgt.x,y:tgt.y};const A=[];for(let k=after.length-1;k>=0;k--){const q=after[k];e={x:e.x-Math.cos(th0(q))*L0(q),y:e.y-Math.sin(th0(q))*L0(q)};A.unshift({th:th0(q),L:L0(q),x:e.x,y:e.y});}
        poses=[...P,{th:Math.atan2(e.y-c.y,e.x-c.x),L:Math.hypot(e.x-c.x,e.y-c.y),x:c.x,y:c.y},...A];}
      else{ // répartition : le groupe garde sa forme, tourne et s'étire pour fermer sur la pièce rigide suivante
        let c={x:start.x,y:start.y};grp.forEach(q=>{c={x:c.x+Math.cos(th0(q))*L0(q),y:c.y+Math.sin(th0(q))*L0(q)};});
        let rot=0,sc=1;if(tgt){const v0={x:c.x-start.x,y:c.y-start.y},v1={x:tgt.x-start.x,y:tgt.y-start.y};const n0=Math.hypot(v0.x,v0.y),n1=Math.hypot(v1.x,v1.y);if(n0>1e-6){rot=norm(Math.atan2(v1.y,v1.x)-Math.atan2(v0.y,v0.x));sc=n1/n0;}}
        let cc={x:start.x,y:start.y};poses=grp.map(q=>{const d=th0(q)+rot;const o={th:d,L:L0(q)*sc,x:cc.x,y:cc.y};cc={x:cc.x+Math.cos(d)*o.L,y:cc.y+Math.sin(d)*o.L};return o;});}
      let prevTh=start.th;grp.forEach((q,k)=>{const o=poses[k];q.L=+o.L.toFixed(3);q.pos={x:o.x,y:o.y,th:o.th};const dv=deg(norm(o.th-prevTh));q.dev=dv;if(Math.abs(dv)>DB.devMax&&!prevUnk&&!q.unknown)rep.devs.push({id:q.id,dev:dv});if(!q.unknown&&(q.L<.5||q.L>16.05))rep.bad.push({id:q.id,L:q.L});prevTh=o.th;prevUnk=!!q.unknown;});
      const last=poses[poses.length-1];cur={x:last.x+Math.cos(last.th)*last.L,y:last.y+Math.sin(last.th)*last.L,th:last.th};i=j-1;}
  }
  return rep;}
/* ================= état ================= */
const REC=recognize(SUB.main.els);let chain=REC.chain;const notes=REC.notes;chain.forEach(p=>{p.L0=p.L||0;});
const history=[];let chainCur=null;
const ths=chain.map((p,i)=>{if(p.head!==undefined)return p.head;if(p.kind==='bend'){const prev=chain[i-1],nxt=chain[i+1];if(prev&&nxt){p.turn=norm(nxt.dirIn-prev.dirOut)>=0?1:-1;return prev.dirOut;}return p.planDir-p.turn*rad(p.angle)/2;}return p.planDir;});
// statuts fictifs des soudures (avancement) : la soudure « après » la pièce i porte le statut p.jst
const nJ0=chain.length-1;
chain.forEach((p,i)=>{p.uid=i+1;p.anchor={...p.planFrom};p.th0=ths[i];p.jid='S-'+String(i+1).padStart(3,'0');p.jst=i<nJ0?((statuses&&statuses[p.jid])||'a_souder'):null;});
let uidSeq=chain.length+1,newSeq=1,newSeqCur=1;
const clonePiece=p=>({...p,anchor:{...p.anchor},pos:p.pos?{...p.pos}:undefined,lock:undefined});
function commitState(){chain.forEach(p=>{p.Lcur=p.L;p.thCur=p.pos.th;p.posCur={...p.pos};p.devCur=p.dev||0;p.anchorCur={...p.anchor};});chainCur=chain;}
let rep=solve(chain);
{ // une barre libre ne dépasse jamais 12 m : au-delà (le tracé du plan est plus long que les pièces posées autour), on la coupe en 12 m + chute (≥ 1 m)
  const out=[];let changed=false;chain.forEach(p=>{if(p.kind==='tube'&&!p.rigid&&!p.unknown&&p.pos&&p.L>12.06){const n=Math.ceil(p.L/12-1e-6);let rem=p.L-12*(n-1);const parts=(n>1&&rem<1.0)?[...Array(n-2).fill(12),12-(1.0-rem),1.0]:[...Array(n-1).fill(12),rem];let x=p.pos.x,y=p.pos.y;const th=p.pos.th;
      parts.forEach((L,k)=>{const q=k===0?p:{...p};q.L=+L.toFixed(3);q.L0=q.L;q.pos={x,y,th};q.anchor={x,y};q.planFrom={x,y};q.rigid=Math.abs(L-12)<.01;q.cut=!q.rigid;q.ref='R-'+q.dn+'/'+q.casing+(q.rigid?' · barre 12 m':' · barre coupée');if(k>0)q.id=p.id+String.fromCharCode(97+k);out.push(q);x+=Math.cos(th)*L;y+=Math.sin(th)*L;});changed=true;}else out.push(p);});
  if(changed){chain=out;const nJ=chain.length-1;chain.forEach((p,i)=>{p.uid=i+1;p.jid='S-'+String(i+1).padStart(3,'0');p.jst=i<nJ?((statuses&&statuses[p.jid])||'a_souder'):null;});rep=solve(chain);} // (uidSeq est initialisé juste après, à partir de la chaîne finale)
}
commitState();const chain0=chain.map(clonePiece);
if(saved&&saved.chain&&saved.chain.length){try{chain=saved.chain.map(p=>({...p,anchor:{...p.anchor},anchorCur:p.anchorCur?{...p.anchorCur}:{...p.anchor},lock:undefined,role:null,ojoint:false}));chain.forEach(p=>{if(!p.posCur&&p.pos)p.posCur={...p.pos};});uidSeq=Math.max(uidSeq,...chain.map(p=>p.uid+1));newSeqCur=newSeq=saved.newSeq||1;rep=solve(chain);commitState();(saved.history||[]).forEach(h=>history.push(h));}catch(e){console.warn('état sauvegardé illisible, on repart du plan',e);}}
function serialize(){return {v:1,chain:chainCur.map(p=>{const o={...p};delete o.lock;delete o.role;delete o.ojoint;delete o.wasRigid;return o;}),history,newSeq:newSeqCur};}
function persist(){try{onCommit&&onCommit(serialize());}catch(e){console.warn(e);}}
const ST={a_souder:'#898781',soudee:'#eb6834',controlee:'#2a78d6',manchonnee:'#0ca30c'};const jid=i=>chain[i]?chain[i].jid:'?';const jstOf=i=>chain[i]?(chain[i].jst||'a_souder'):'a_souder';
const devAt=i=>{const q=chain[i+1],p=chain[i];if(!q||!p||q.unknown||p.unknown)return 0;return Math.abs(q.dev||0)>DB.devMax?q.dev:0;}; // déviation angulaire portée par la soudure i (entre pièce i et i+1)
/* ================= vue : déléguée à l'application (onChange) ================= */
let sel=null,selJ=null;function render(){emit();renderTool();}
/* ================= outil Modifier · déplacer ================= */
// Modèle pragmatique : chaque pièce et chaque soudure se touche. Bleu = bouge d'un bloc avec la sélection. Orange = c'est là que la modif travaille
// (barre orange : recoupée / rallongée / découpée / supprimée ; soudure orange : un tube se crée entre les deux pièces, ou chevauchement signalé). Le reste ne bouge pas.
let mode=null;const tool={blue:new Set(),orange:new Set(),oj:new Set(),jm:null,pending:null,cutMode:'keep',inheritSide:'am',dx:0,dy:0,step:.25,slide:false,confirmed:false,ask:null,changes:[]};
const byUid=(arr,u)=>arr.findIndex(p=>p.uid===u);const P=u=>chain.find(p=>p.uid===u);
const weldedOf=(arr,j)=>j>=0&&j<arr.length-1&&!!arr[j].jst&&arr[j].jst!=='a_souder';const welded=j=>weldedOf(chain,j);
const STL={a_souder:'à souder',soudee:'soudée',controlee:'contrôlée',manchonnee:'manchonnée'};const jlabelOf=(arr,j)=>arr[j].jid+' ('+STL[arr[j].jst||'a_souder']+')';const jlabel=j=>jlabelOf(chain,j);
const MIN_CHUTE=1.0,MIN_BAR=.5;
function mkTube(model,L,rigid,x,y,th){const p={...model,uid:uidSeq++,id:'P+'+(newSeq),jid:'S+'+(newSeq++),kind:'tube',L:+L.toFixed(3),L0:+L.toFixed(3),Lcur:+L.toFixed(3),cut:!rigid,rigid,unknown:false,new:true,role:'new',borne:null,interp:'ajoutée',
  ref:'R-'+model.dn+'/'+model.casing+(rigid?' · barre 12 m ajoutée':' · chute ajoutée'),jst:'a_souder',anchor:{x,y},anchorCur:{x,y},th0:th,thCur:th,planDir:th,dirIn:th,dirOut:th,pos:{x,y,th},posCur:{x,y,th},lock:undefined,dev:0,devCur:0,drift:0,dnNext:undefined,stubLen:undefined,branchTo:undefined,other:undefined,head:undefined,angle:undefined,legs:undefined,R:undefined,side:undefined,B:undefined,recut:false,ojoint:false};return p;}
function splitLen(L){const n=Math.max(1,Math.ceil(L/12-1e-6));let rem=L-12*(n-1);if(n>1&&rem<MIN_CHUTE){return [...Array(n-2).fill(12),12-(MIN_CHUTE-rem),MIN_CHUTE];}return [...Array(n-1).fill(12),rem];}
function hasSel(){return tool.blue.size>0||tool.orange.size>0||tool.oj.size>0||!!tool.jm;}
function applyTool(){const C=chainCur;chain=C.map(clonePiece);tool.changes=[];newSeq=newSeqCur;
  chain.forEach(p=>{p.new=false;const isBar=p.kind==='tube'&&!p.unknown;p.orangeNo=tool.orange.has(p.uid)&&!isBar;p.role=tool.blue.has(p.uid)?'block':(tool.orange.has(p.uid)&&isBar)?'man':'fixed';p.ojoint=tool.oj.has(p.uid);p.anchor={...p.anchorCur};p.lock=undefined;p.wasRigid=undefined;
    if(p.orangeNo)tool.changes.push({t:'warn',txt:`${p.id} en orange : ${p.kind==='bend'?'un coude':p.kind==='tee'?'un té':'cette pièce'} ne se recoupe pas, il reste en place — mets plutôt une soudure ou une barre voisine en orange, ou touche-le encore une fois pour qu'il bouge (bleu)`});
    if(p.role==='block'){p.anchor={x:p.anchorCur.x+tool.dx,y:p.anchorCur.y+tool.dy};if(!p.rigid)p.lock={x:p.posCur.x+tool.dx,y:p.posCur.y+tool.dy,th:p.posCur.th};}
    else if(p.role==='fixed'){if(!p.rigid)p.lock={...p.posCur};}
    else if(p.role==='man'){p.wasRigid=p.rigid;p.rigid=false;}});
  if(tool.jm){const i=byUid(chain,tool.jm.uid);const p=chain[i],q=chain[i+1];const isBar=x=>x&&x.kind==='tube'&&!x.unknown;
    if(isBar(p)&&isBar(q)&&p.role!=='block'&&q.role!=='block'){p.role='jm';p.wasRigid=p.rigid;p.rigid=false;p.lock={...p.posCur};p.L=+(p.Lcur+tool.jm.t).toFixed(3);q.role='man';q.wasRigid=q.rigid;q.rigid=false;q.lock=undefined;
      if(p.L<MIN_BAR)tool.changes.push({t:'warn',txt:`${p.id} n'aurait plus que ${fmt(p.L)} m (mini ${fmt(MIN_BAR)} m)`});}
    else tool.changes.push({t:'warn',txt:`coulisser la soudure ${p?p.jid:'?'} : il faut une barre de chaque côté (ici ${p?p.id:'?'} et ${q?q.id:'?'})`});}
  const absorb=new Set(chain.filter(p=>p.role==='man').map(p=>p.uid));rep=solve(chain,{absorb});
  normalize(absorb);
  chain.forEach(p=>{if(p.role==='man'&&p.wasRigid&&Math.abs(p.L-p.Lcur)<.006){p.rigid=true;p.cut=false;}});
  tool.ask=null;render();}
function gapAt(i){ // écart entre la sortie de la pièce i et l'entrée de la pièce i+1
  const p=chain[i],q=chain[i+1];if(!p||!q)return null;const e=worldGeom(p).ports[1];const s0=q.pos;const dx=s0.x-e.x,dy=s0.y-e.y;const along=dx*Math.cos(e.th)+dy*Math.sin(e.th),lat=-dx*Math.sin(e.th)+dy*Math.cos(e.th);
  return {d:Math.hypot(dx,dy),along,lat,dth:Math.abs(deg(norm(s0.th-e.th))),e,s0,dir:Math.atan2(dy,dx),th1:e.th,th2:s0.th};}
function normalize(absorb){const ch=tool.changes;let guard=0,again=true;
  // 1) barres orange : trop courtes → supprimées ; trop longues → barres 12 m + chute
  while(again&&guard++<8){again=false;
    for(const p of chain.filter(q=>q.role==='man'||q.role==='jm')){const flip=p.thCur!==undefined&&Math.abs(norm(p.pos.th-p.thCur))>Math.PI/2;const Leff=flip?-p.L:p.L;const i=chain.indexOf(p);
      if(p.role==='jm'&&Leff<MIN_BAR)continue;
      if(Leff<MIN_BAR){const prev=chain[i-1],nxt=chain[i+1];ch.push({t:'del',txt:`${p.id} supprimée (il ne resterait que ${fmt(Math.max(0,Leff))} m) — la soudure entre ${prev?prev.id:'?'} et ${nxt?nxt.id:'?'} devient un point orange`+(p.jst&&p.jst!=='a_souder'?` ; sa soudure ${p.jid} (${STL[p.jst]}) disparaît : ses infos seront rattachées à une soudure voisine (demandé à la validation)`:''),lostJid:p.jid,lostJst:p.jst,lostUid:p.uid,prevUid:prev?prev.uid:null,nextUid:nxt?nxt.uid:null});absorb.delete(p.uid);chain.splice(i,1);if(prev)prev.ojoint=true;rep=solve(chain,{absorb});again=true;break;}
      else if(p.L>12.06){const parts=splitLen(p.L);const th=p.pos.th;let x=p.pos.x,y=p.pos.y;const news=[];const nb=chain[i-1];const blueBefore=nb&&nb.role==='block';const seq=blueBefore?parts.slice().reverse():parts; // chute côté bloc, barres entières côté fixe
        seq.forEach((L,k)=>{const isCut=blueBefore?k===0:k===seq.length-1;if(isCut){p.L=+L.toFixed(3);p.pos={x,y,th};if(p.lock)p.lock={x,y,th};news.push(p);}else{const t=mkTube(p,L,Math.abs(L-12)<.01,x,y,th);t.role='new';news.push(t);}x+=Math.cos(th)*L;y+=Math.sin(th)*L;});
        chain.splice(i,1,...news);ch.push({t:'add',txt:`${p.id} ${fmt(p.Lcur)} m → ${fmt(seq.reduce((s,v)=>s+v,0))} m : ${parts.length-1} barre(s) 12 m ajoutée(s) + chute ${fmt(parts[parts.length-1])} m`});rep=solve(chain,{absorb});again=true;break;}}
  }
  // 2) soudures orange : un tube se crée entre les deux pièces (droit, d'un port à l'autre) ; chevauchement signalé
  guard=0;let changed=true;while(changed&&guard++<6){changed=false;
    for(let i=0;i<chain.length-1;i++){const p=chain[i];if(!p.ojoint||p.new)continue;const q=chain[i+1];const g=gapAt(i);if(!g)continue;
      if(g.d>=MIN_BAR&&g.along>0){const parts=splitLen(g.d);let x=g.e.x,y=g.e.y;const news=[];const seq=p.role==='block'?parts.slice().reverse():parts;
        seq.forEach((L,k)=>{const isCut=p.role==='block'?k===0:k===seq.length-1;const t=mkTube(q.kind==='tube'?q:p,L,!isCut&&Math.abs(L-12)<.01,x,y,g.dir);if(isCut){t.role='man';t.rigid=false;t.cut=true;absorb.add(t.uid);}news.push(t);x+=Math.cos(g.dir)*L;y+=Math.sin(g.dir)*L;});
        p.ojoint=false;news[news.length-1].ojoint=true; // le point orange reste au bout, côté aval
        chain.splice(i+1,0,...news);ch.push({t:'add',txt:`soudure ${p.jid} : tube créé entre ${p.id} et ${q.id} → ${parts.length>1?(parts.length-1)+' barre(s) 12 m + ':''}chute ${fmt(parts[parts.length-1])} m`+(g.dth>DB.devMax||Math.abs(deg(norm(g.dir-g.th1)))>DB.devMax?' (en biais : voir les angles aux soudures)':'')});rep=solve(chain,{absorb});changed=true;break;}
      else if(g.along<-.02){ch.push({t:'warn',txt:`soudure ${p.jid} : ${p.id} et ${q.id} se chevauchent de ${fmt(-g.along)} m — recule, ou mets une barre voisine en orange pour qu'elle se recoupe`});}
      else if(g.d>.02){ch.push({t:'warn',txt:`soudure ${p.jid} : écart de ${fmt(g.d)} m entre ${p.id} et ${q.id}, trop court pour une chute (mini ${fmt(MIN_BAR)} m)`});}}}
  // 3) frontières bleu | fixe sans rien pour encaisser
  for(let i=0;i<chain.length-1;i++){const p=chain[i],q=chain[i+1];const b1=p.role==='block',b2=q.role==='block';if(b1===b2)continue;if(p.ojoint||p.role==='man'||q.role==='man'||p.role==='new'||q.role==='new')continue;
    const g=gapAt(i);if(!g||g.d<.02)continue;const bar=b1?(q.kind==='tube'?q:null):(p.kind==='tube'?p:null);
    ch.push({t:'warn',txt:`entre ${p.id} et ${q.id} (${p.jid}) : rien n'encaisse, écart de ${fmt(g.d)} m → touche la soudure ${p.jid} (un tube se crée)${bar?' ou la barre '+bar.id+' (recoupée)':''}`});}
}
function cutsOf(){const out=[];chain.forEach((p,i)=>{const js=[];if(p.role==='man'||p.role==='jm'||p.role==='new'){[i-1,i].forEach(j=>{if(welded(j))js.push(j);});}if(p.ojoint&&welded(i)&&!js.includes(i))js.push(i);
    const dL=Math.abs(p.L-(p.Lcur??p.L))>.005;js.forEach(j=>{const q=chain[j+1];const d=Math.abs((q.dev||0)-(q.devCur||0));if((d>.5||(dL&&js.length===2)||p.new||(p.ojoint&&j===i&&chain[j+1]&&chain[j+1].new))&&!out.some(c=>c.j===j))out.push({j,d,why:p.new||(chain[j+1]&&chain[j+1].new)?'une barre est insérée dans cette soudure':d>.5?'angle modifié de '+fmt(d)+'°':'longueur modifiée alors que les deux bouts sont soudés'});});});return out;}
function toolClear(){if(chainCur)chain=chainCur;chain.forEach(p=>{delete p.lock;p.role=null;p.ojoint=false;p.borne=null;});rep=solve(chain);tool.blue.clear();tool.orange.clear();tool.oj.clear();tool.jm=null;tool.pending=null;tool.dx=tool.dy=0;tool.confirmed=false;tool.ask=null;tool.changes=[];}
function lostWelds(){return tool.changes.filter(c=>c.t==='del'&&c.lostJst&&c.lostJst!=='a_souder');}
function toolCommit(){if(!hasSel()||(!tool.dx&&!tool.dy&&!(tool.jm&&tool.jm.t))){toolClear();render();return;}
  const cuts=cutsOf();const lost=lostWelds();if((cuts.length||lost.length)&&!tool.confirmed){tool.ask=cuts.length?cuts:[{j:-1,d:0,why:'soudure(s) faite(s) qui disparaissent'}];renderTool();return;}
  const C=chainCur;const ent={ids:C.filter(p=>tool.blue.has(p.uid)).map(p=>p.id),d:Math.hypot(tool.dx,tool.dy),jm:tool.jm?{jid:(C[byUid(C,tool.jm.uid)]||{}).jid,t:tool.jm.t}:null,man:[],orangeJ:C.filter(p=>tool.oj.has(p.uid)).map(p=>p.jid),changes:tool.changes.filter(c=>c.t!=='warn').map(c=>c.txt),warn:tool.changes.filter(c=>c.t==='warn').map(c=>c.txt),cuts:cuts.map(c=>jlabel(c.j)+' — '+c.why)};
  chain.forEach((p,i)=>{if((p.role==='man'||p.role==='jm')&&!p.new){const e={id:p.id,from:p.Lcur??p.L,to:p.L,devs:[]};[i-1,i].forEach(j=>{const dv=devAt(j);if(dv)e.devs.push(jid(j)+' '+fmt(dv)+'°');});e.longer=p.L>(p.Lcur??p.L)+.005;e.short=p.L<MIN_BAR;e.wasRigid=p.wasRigid&&!p.rigid;ent.man.push(e);}});
  const report={cuts:[],lost:[],merged:[]};cuts.forEach(c=>{const q=chain[c.j];if(!q)return;if(tool.cutMode==='redo'){q.jst='a_souder';q.recut=true;}else{q.adjusted=true;q.adjNote=c.why;}report.cuts.push({uid:q.uid,jid:q.jid,mode:tool.cutMode,why:c.why});});ent.cutMode=cuts.length?tool.cutMode:null;
  lost.forEach(l=>{const tgt=chain.find(p=>p.uid===(tool.inheritSide==='av'?l.nextUid:l.prevUid))||chain.find(p=>p.uid===l.prevUid)||chain.find(p=>p.uid===l.nextUid);if(tgt){tgt.inherit=(tgt.inherit||[]).concat(l.lostJid+' ('+STL[l.lostJst]+')');ent.changes.push(`infos de la soudure ${l.lostJid} (${STL[l.lostJst]}) rattachées à ${tgt.jid}`);report.lost.push({lostUid:l.lostUid,targetUid:tgt.uid,lostJid:l.lostJid,lostJst:l.lostJst});}else report.lost.push({lostUid:l.lostUid,targetUid:null,lostJid:l.lostJid,lostJst:l.lostJst});});
  history.push(ent);newSeqCur=newSeq;chain.forEach(p=>{delete p.lock;p.new=false;p.role=null;p.ojoint=false;p.wasRigid=undefined;});commitState();toolClear();render();persist();if(opts.onCommitReport)opts.onCommitReport(report);}
function toolTap(uid){const q=chainCur.find(p=>p.uid===uid);if(!q)return; // pièce : gris → orange → bleu → gris (même rythme pour tout le monde)
  if(tool.blue.has(uid)){tool.blue.delete(uid);}
  else if(tool.orange.has(uid)){tool.orange.delete(uid);tool.blue.add(uid);}
  else{tool.orange.add(uid);}
  tool.confirmed=false;applyTool();}
function toolTapJoint(uid){if(tool.oj.has(uid))tool.oj.delete(uid);else tool.oj.add(uid);tool.confirmed=false;applyTool();} // soudure : gris → orange → gris
function suggest(){ // propose : pour chaque frontière bleu | fixe sans rien, la barre voisine devient orange (sinon la soudure)
  const C=chainCur;for(let i=0;i<C.length-1;i++){const p=C[i],q=C[i+1];const b1=tool.blue.has(p.uid),b2=tool.blue.has(q.uid);if(b1===b2)continue;if(tool.oj.has(p.uid)||tool.orange.has(p.uid)||tool.orange.has(q.uid))continue;const out=b1?q:p;if(out.kind==='tube'&&!out.unknown&&!tool.blue.has(out.uid))tool.orange.add(out.uid);else tool.oj.add(p.uid);}
  applyTool();}
function firstBlue(){const C=chainCur;return C.find(p=>tool.blue.has(p.uid))||null;}
function nudge(kind){const q=firstBlue()||chainCur.find(p=>tool.orange.has(p.uid));if(!q)return;const th=q.posCur?q.posCur.th:q.pos.th;const st=tool.step;const v={along:[Math.cos(th),Math.sin(th)],across:[-Math.sin(th),Math.cos(th)]};const [ux,uy]=kind==='+a'||kind==='-a'?v.along:v.across;const sg=kind[0]==='+'?1:-1;tool.dx+=ux*st*sg;tool.dy+=uy*st*sg;tool.confirmed=false;applyTool();}
function jnudge(uid,sign){if(!tool.jm||tool.jm.uid!==uid)tool.jm={uid,t:0};tool.jm.t+=sign*tool.step;tool.confirmed=false;applyTool();}
function mergeInfo(uid){const C=chainCur;const i=byUid(C,uid);const p=C[i],q=C[i+1];if(!p||!q)return {ok:false,why:'pas de pièce après'};const isBar=x=>(x.kind==='tube'||x.kind==='connector')&&!x.unknown;if(!isBar(p)||!isBar(q))return {ok:false,why:'il faut une barre de chaque côté'};
  const pp=p.posCur||p.pos,qp=q.posCur||q.pos;const end={x:qp.x+Math.cos(qp.th)*q.L,y:qp.y+Math.sin(qp.th)*q.L};const L=+Math.hypot(end.x-pp.x,end.y-pp.y).toFixed(3);const th=Math.atan2(end.y-pp.y,end.x-pp.x);
  if(L>12.06)return {ok:false,why:'ferait '+fmt(L)+' m (> 12 m)'};const dth=Math.abs(deg(norm(qp.th-pp.th)));if(dth>DB.devMax+.01)return {ok:false,why:'l\'angle entre les deux barres ('+fmt(dth)+'°) dépasse ce qu\'une soudure peut reprendre ('+DB.devMax+'°)'};
  return {ok:true,L,th,dth,p,q,welded:weldedOf(C,i)};}
function mergeJoint(uid,confirmed,side){const inf=mergeInfo(uid);if(!inf.ok)return;const C=chainCur;const i=byUid(C,uid);const p=C[i],q=C[i+1];
  if(inf.welded&&!confirmed){tool.pending={type:'merge',uid,prevJid:C[i-1]?C[i-1].jid:null,nextJid:q.jid};tool.ask=[{j:i,d:0,why:'cette soudure disparaît (les deux barres n\'en font plus qu\'une) — ses infos (statut, photos) doivent être rattachées à une soudure voisine'}];renderTool();return;}
  const inheritTo=inf.welded?(side==='av'?q:C[i-1]):null;
  const st={x:p.posCur.x,y:p.posCur.y,th:inf.th};const ent=Math.abs(inf.L-12)<.06;
  const m={...p,uid:q.uid,kind:'tube',L:inf.L,L0:inf.L,Lcur:inf.L,rigid:ent,cut:!ent,unknown:false,jid:q.jid,jst:q.jst,recut:q.recut,inherit:(q.inherit||[]).concat(inheritTo===q?[p.jid+' ('+STL[p.jst]+')']:[]),dnNext:q.dnNext,ref:'R-'+p.dn+'/'+p.casing+(ent?' · barre 12 m':' · barre coupée')+' (fusion)',anchor:{...p.anchor},anchorCur:{...p.anchorCur},pos:st,posCur:{...st},thCur:inf.th,planDir:inf.th,dirIn:inf.th,dirOut:inf.th,lock:undefined,role:null,ojoint:false};
  if(inheritTo&&inheritTo!==q&&C[i-1]){C[i-1].inherit=(C[i-1].inherit||[]).concat(p.jid+' ('+STL[p.jst]+')');}
  const next=C.slice(0,i).concat([m],C.slice(i+2));history.push({ids:[],d:0,merge:{jid:p.jid,a:p.id,b:q.id,L:inf.L,id:m.id,dth:inf.dth},man:[],changes:(inf.dth>.5?['angle de '+fmt(inf.dth)+'° qui était à '+p.jid+' : reporté sur les soudures voisines (voir ⚠)']:[]).concat(inheritTo?['infos de '+p.jid+' ('+STL[p.jst]+') rattachées à '+inheritTo.jid]:[]),warn:[],cuts:inf.welded?[jlabelOf(C,i)+' — supprimée (fusion des deux barres), infos conservées sur '+(inheritTo?inheritTo.jid:'?')]:[]});
  chain=next;chain.forEach(x=>{delete x.lock;x.role=null;x.ojoint=false;});rep=solve(chain);commitState();toolClear();render();persist();if(opts.onCommitReport)opts.onCommitReport({merged:[{lostUid:p.uid,keptUid:q.uid,targetUid:inheritTo?inheritTo.uid:null,lostJid:p.jid,lostJst:p.jst}],cuts:[],lost:[]});}
function renderTool(){const sh=opts.toolEl;if(!sh)return;if(mode!=='move'){sh.style.display='none';return;}sh.style.display='';
  const C=chainCur;const blues=C.filter(p=>tool.blue.has(p.uid)).map(p=>p.id),oranges=C.filter(p=>tool.orange.has(p.uid)).map(p=>p.id),ojs=C.filter(p=>tool.oj.has(p.uid)).map(p=>p.jid);
  const legend=`<div class="muted" style="margin-top:4px">Touche une <b>pièce</b> : gris → <b style="color:#b8560f">orange</b> (une barre : elle se recoupe / s'allonge / se découpe en 12 m + chute) → <b style="color:#1c3d6b">bleu</b> (elle bouge avec la sélection) → gris. Touche une <b>soudure</b> : gris → <b style="color:#b8560f">orange</b> (un tube se crée entre les deux pièces quand elles s'écartent) → gris. <b>Glisse une soudure</b> entre deux barres (ou ses boutons ◀ ▶ quand elle est orange) : elle coulisse, la barre avant s'allonge, celle d'après raccourcit ; « supprimer la soudure » fusionne les deux barres en une. Tout le reste ne bouge pas. Une soudure déjà faite n'est jamais effacée en silence : ajustement en gardant statut et photos, ou « à refaire », ou infos rattachées à la voisine — toujours demandé.</div>`;
  if(!hasSel()){sh.innerHTML=`<b>Modifier · déplacer</b>${legend}<div class="muted" style="margin-top:6px">Exemple : le dos d'une lyre — touche deux fois C8, P18, C9 (bleu), une fois S-026 et S-029 (orange), puis glisse le bloc où tu veux : des tubes se créent entre C7 et C8 et entre C9 et C10.</div><div class="row"><button class="btn" id="tCancel">Quitter</button></div>`;$('#tCancel').onclick=()=>{setMode(null);};return;}
  const mans=chain.filter(p=>(p.role==='man'||p.role==='jm')&&!p.new);const rows=[];if(tool.jm){const pj=chain.find(p=>p.uid===tool.jm.uid);rows.push(`<span style="color:#b8560f">soudure <b>${pj?pj.jid:'?'}</b> coulissée de ${fmt(tool.jm.t)} m le long de la barre</span>`);}
  mans.forEach(m=>{const i=chain.indexOf(m);const dvs=[i-1,i].map(j=>devAt(j)).filter(Boolean);rows.push(`<span style="color:#b8560f">barre <b>${m.id}</b>${m.wasRigid?' (entière)':''} ${fmt(m.Lcur)} → <b>${fmt(m.L)} m</b>${m.L>m.Lcur+.005?' (plus longue : chute neuve)':m.L<m.Lcur-.005?(m.wasRigid?' (recoupée : ne sera plus entière)':' (recoupée)'):' (inchangée)'}${dvs.length?' · soudures '+dvs.map(d=>'⚠ '+fmt(d)+'°').join(', '):''}</span>`);});
  chain.forEach((p,i)=>{if(!p.ojoint||p.new)return;const g=gapAt(i);const inf=mergeInfo(p.uid);const jt=tool.jm&&tool.jm.uid===p.uid?tool.jm.t:0;
    rows.push(`<span style="color:#b8560f">soudure <b>${p.jid}</b>${g&&g.d<.02&&!jt?' : les pièces sont jointives — un tube se créera si le bleu s\'écarte':''}${jt?' : coulissée de '+fmt(jt)+' m':''}</span> <button class="btn" data-jn="${p.uid}" data-s="-1" title="coulisser la soudure vers l'amont">◀ ${fmt(tool.step)} m</button><button class="btn" data-jn="${p.uid}" data-s="1" title="coulisser vers l'aval">${fmt(tool.step)} m ▶</button> <button class="btn" data-mg="${p.uid}" ${inf.ok?'':'disabled'} title="${inf.ok?'les deux barres n\'en font plus qu\'une':esc(inf.why)}">supprimer la soudure${inf.ok?' (→ '+esc(inf.p.id)+' '+fmt(inf.L)+' m)':' — '+esc(inf.why)}</button>`);});
  const cuts=cutsOf();const chg=tool.changes;const q0=firstBlue();
  sh.innerHTML=`<b>Modifier · déplacer</b>${legend}
    <div class="res" style="margin-top:6px"><b style="color:#1c3d6b">Bouge d'un bloc</b> : ${blues.join(', ')||'<i>rien encore — touche deux fois les pièces qui bougent</i>'}<br><b style="color:#b8560f">Encaisse la modif</b> : ${[...oranges.map(x=>'barre '+x),...ojs.map(x=>'soudure '+x)].join(', ')||(tool.jm?'les deux barres autour de la soudure coulissée':'<i>rien — touche une soudure ou une barre voisine</i>')} <button class="btn" id="tSug">proposer</button></div>
    ${rows.length||chg.length?`<div class="res" style="margin-top:4px">${[...rows,...chg.map(c=>(c.t==='warn'?'⚠ ':c.t==='add'?'＋ ':c.t==='del'?'－ ':'✂ ')+esc(c.txt))].join('<br>')}</div>`:''}
    <div class="row" style="margin-top:6px"><b>Déplacer</b> : <label><input type="checkbox" id="tSlide" ${tool.slide?'checked':''}> dans l'axe seulement</label> · pas <input type="number" id="tStep" value="${tool.step}" step=".05" min=".05" style="width:56px"> m <button class="btn" data-n="-a">◀</button><button class="btn" data-n="+a">▶</button>${tool.slide?'':'<button class="btn" data-n="-x">⤒</button><button class="btn" data-n="+x">⤓</button>'} <span class="muted">${q0?'(repère : l\'axe de '+q0.id+') · ':''}ou glisse une pièce bleue · total ${fmt(Math.hypot(tool.dx,tool.dy))} m</span></div>
    ${cuts.length||tool.ask||lostWelds().length?`<div class="${tool.confirmed?'warn':'bad'}" style="margin-top:6px">⚠ Cette modification <b>touche une soudure faite</b> : ${(cuts.length?cuts:(tool.ask||[]).filter(c=>c.j>=0)).map(c=>jlabel(c.j)+' — '+c.why).join(' ; ')}${lostWelds().map(l=>` ; ${l.lostJid} (${STL[l.lostJst]}) disparaît`).join('')}.
      ${tool.pending?`<br>Rattacher ses infos (statut, photos) à : <button class="btn" id="tInhAm">amont ${esc(tool.pending.prevJid||'—')}</button> <button class="btn" id="tInhAv">aval ${esc(tool.pending.nextJid||'—')}</button> <button class="btn" id="tNo">Annuler</button>`
      :`<br><label><input type="radio" name="cm" value="keep" ${tool.cutMode==='keep'?'checked':''}> conserver statuts et photos (ajustement pour coller à la réalité)</label> <label><input type="radio" name="cm" value="redo" ${tool.cutMode==='redo'?'checked':''}> repasser « à souder » (à refaire)</label>${lostWelds().length?`<br>infos des soudures qui disparaissent → <label><input type="radio" name="ih" value="am" ${tool.inheritSide==='am'?'checked':''}> soudure amont</label> <label><input type="radio" name="ih" value="av" ${tool.inheritSide==='av'?'checked':''}> soudure aval</label>`:''}<br>${tool.confirmed?'Confirmé — sera noté comme décision explicite.':tool.ask?'<b>Es-tu sûr ?</b> <button class="btn" id="tYes">Oui, je sais ce que je fais</button> <button class="btn" id="tNo">Non, annuler</button>':'Valider te demandera confirmation.'}`}</div>`:''}
    <div class="row"><button class="btn primary" id="tOk">Valider</button><button class="btn" id="tUndo">Tout désélectionner</button><button class="btn" id="tCancel">Quitter</button></div>`;
  sh.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>nudge(b.dataset.n));sh.querySelectorAll('[data-jn]').forEach(b=>b.onclick=()=>jnudge(+b.dataset.jn,+b.dataset.s));sh.querySelectorAll('[data-mg]').forEach(b=>b.onclick=()=>mergeJoint(+b.dataset.mg,false));$('#tStep').onchange=e=>{tool.step=+e.target.value||.25;renderTool();};$('#tSlide').onchange=e=>{tool.slide=e.target.checked;renderTool();};$('#tOk').onclick=toolCommit;$('#tUndo').onclick=()=>{toolClear();render();};$('#tSug').onclick=suggest;
  const y=$('#tYes'),n=$('#tNo');if(y)y.onclick=()=>{tool.confirmed=true;toolCommit();};if(n)n.onclick=()=>{tool.pending=null;toolClear();render();};
  const ia=$('#tInhAm'),iv=$('#tInhAv');if(ia)ia.onclick=()=>{const u=tool.pending.uid;tool.pending=null;tool.ask=null;mergeJoint(u,true,'am');};if(iv)iv.onclick=()=>{const u=tool.pending.uid;tool.pending=null;tool.ask=null;mergeJoint(u,true,'av');};
  sh.querySelectorAll('input[name=cm]').forEach(r=>r.onchange=e=>{tool.cutMode=e.target.value;});sh.querySelectorAll('input[name=ih]').forEach(r=>r.onchange=e=>{tool.inheritSide=e.target.value;});$('#tCancel').onclick=()=>{setMode(null);};}
function setMode(m){mode=m;if(m!=='move')toolClear();render();}
/* ================= API pour l'application ================= */
function dragBlock(dx,dy){let ddx=dx,ddy=dy;if(tool.slide){const q=firstBlue();if(q){const th=q.posCur.th;const a=dx*Math.cos(th)+dy*Math.sin(th);ddx=a*Math.cos(th);ddy=a*Math.sin(th);}}tool.dx+=ddx;tool.dy+=ddy;tool.confirmed=false;applyTool();}
function dragJoint(uid,dx,dy){const pj=chainCur.find(p=>p.uid===uid);if(!pj)return;const th=pj.posCur.th;const t=dx*Math.cos(th)+dy*Math.sin(th);if(!tool.jm||tool.jm.uid!==uid)tool.jm={uid,t:0};tool.jm.t+=t;tool.confirmed=false;applyTool();}
function setStatuses(map){chainCur.forEach(p=>{if(p.jid&&map[p.uid]!==undefined)p.jst=map[p.uid];});if(chain!==chainCur)chain.forEach(p=>{if(map[p.uid]!==undefined)p.jst=map[p.uid];});}
function resetToPlan(){const keep={};chainCur.forEach(p=>{if(p.jid)keep[p.jid]=p.jst;});toolClear();chain=chain0.map(clonePiece);chain.forEach(p=>{p.role=null;p.ojoint=false;if(keep[p.jid]!==undefined)p.jst=keep[p.jid];});rep=solve(chain);commitState();history.length=0;render();persist();}
function roleOf(uid){const p=chain.find(x=>x.uid===uid);return p?{role:p.role,ojoint:!!p.ojoint,orangeNo:!!p.orangeNo}:null;}


return {get chain(){return chain;},get chainCur(){return chainCur;},get mode(){return mode;},get tool(){return tool;},notes,history,setMode,applyTool,toolTap,toolTapJoint,dragBlock,dragJoint,nudge,jnudge,suggest,mergeJoint,mergeInfo,toolCommit,toolClear,hasSel,renderTool,setStatuses,resetToPlan,roleOf,serialize,worldGeom,DB,MIN_BAR,MIN_CHUTE,cutsOf,lostWelds,gapAt};
}
