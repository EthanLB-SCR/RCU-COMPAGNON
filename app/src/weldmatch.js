// Appariement des soudures entre deux états d'un même tracé (traceur : numéros gardés à l'enregistrement ; appli : reprise de l'avancement d'une version).
/* 03/11 (Nantes, Ethan : « j'ai ajouté une manchette sur une antenne, ça a sauté des soudures et manchons sur ce qui a été décalé… on ne sait plus qui est quoi ») : une soudure
   n'était reconnue que si elle restait à ± 0,35 m → celles DÉCALÉES par une pièce insérée en amont (jusqu'au coude / té / pièce suivant) prenaient un numéro neuf et leurs
   états (soudée, manchonnée…) restaient sur l'ancien numéro, hors du plan. Maintenant, conduite par conduite :
   1) les soudures restées en place (± 0,35 m) gardent leur numéro, exactement comme avant ;
   2) entre deux soudures restées en place, les soudures décalées TOUTES DU MÊME ÉCART (au moins 2, écart ≤ une barre, même sorte de soudure) gardent leur numéro, dans l'ordre —
      à égalité, l'écart qui garde le plus de soudures déjà faites, puis le plus petit ;
   3) ce qui reste entre deux soudures reconnues : une pour une, dans l'ordre, seulement si c'est le même nombre et exactement la même sorte deux à deux (tube-tube, tube-coude…) ;
   sinon numéro neuf (les soudures de la pièce insérée). P : anciennes soudures {m, sig, status} ; N : nouvelles {m, sig} → pour chaque nouvelle, l'index de l'ancienne (ou −1). */
export function sigOf(b){return Array.isArray(b)&&b.length===2?b.map(x=>String(x==null?'':x).replace(/\d+b?$/,'')).sort().join('|'):'';}
const famOf=s=>s.split('|').map(k=>k==='M'?'P':k).sort().join('|'); // barre, chute ou manchette : la même famille (tube)
export function matchWeldIds(P,N,o){const res=N.map(()=>-1),usedP=new Set(),dmax=(o&&o.dmax)||12.5,TOL=0.1;
  const fam=(a,b)=>!a||!b||famOf(a)===famOf(b),same=(a,b)=>!a||!b||a===b,done=p=>!!(p.status&&p.status!=='a_souder');
  N.forEach((n,k)=>{let b=-1,bd=0.35;P.forEach((p,i)=>{if(usedP.has(i))return;const d=Math.abs(p.m-n.m);if(d<bd){bd=d;b=i;}});if(b>=0){usedP.add(b);res[k]=b;}}); // 1) en place
  const solve=(olds,news,depth)=>{if(!olds.length||!news.length||depth>60)return;let best=null;const seen=new Set();
    olds.forEach(i=>news.forEach(k=>{const d=N[k].m-P[i].m;if(Math.abs(d)>dmax||!fam(P[i].sig,N[k].sig))return;const key=Math.round(d*100);if(seen.has(key))return;seen.add(key);
      const pr=[];let a=0;news.forEach((kk,b)=>{while(a<olds.length&&P[olds[a]].m+d<N[kk].m-TOL)a++;if(a<olds.length&&Math.abs(P[olds[a]].m+d-N[kk].m)<TOL&&fam(P[olds[a]].sig,N[kk].sig)){pr.push([a,b]);a++;}});
      const nd=pr.filter(x=>done(P[olds[x[0]]])).length;
      if(!best||pr.length>best.pr.length||(pr.length===best.pr.length&&(nd>best.nd||(nd===best.nd&&Math.abs(d)<Math.abs(best.d)))))best={pr,nd,d};}));
    if(best&&best.pr.length>=2){best.pr.forEach(([a,b])=>{res[news[b]]=olds[a];usedP.add(olds[a]);}); // 2) décalées du même écart
      const B=[[-1,-1],...best.pr,[olds.length,news.length]];for(let s=0;s<B.length-1;s++)solve(olds.slice(B[s][0]+1,B[s+1][0]),news.slice(B[s][1]+1,B[s+1][1]),depth+1);return;}
    if(olds.length===news.length&&olds.every((i,r)=>same(P[i].sig,N[news[r]].sig)&&Math.abs(N[news[r]].m-P[i].m)<=dmax))olds.forEach((i,r)=>{res[news[r]]=i;usedP.add(i);});}; // 3) une pour une
  const oi=P.map((p,i)=>i).sort((a,b)=>P[a].m-P[b].m),nk=N.map((n,k)=>k).sort((a,b)=>N[a].m-N[b].m);const rP=new Map(oi.map((i,r)=>[i,r])),rN=new Map(nk.map((k,r)=>[k,r]));
  const kept=[];nk.forEach(k=>{if(res[k]<0)return;const r=rP.get(res[k]);if(!kept.length||r>rP.get(res[kept[kept.length-1]]))kept.push(k);}); // bornes : soudures en place, dans l'ordre
  const fO=oi.filter(i=>!usedP.has(i)),fN=nk.filter(k=>res[k]<0);const B=[[-1,-1],...kept.map(k=>[rP.get(res[k]),rN.get(k)]),[Infinity,Infinity]];
  for(let s=0;s<B.length-1;s++)solve(fO.filter(i=>rP.get(i)>B[s][0]&&rP.get(i)<B[s+1][0]),fN.filter(k=>rN.get(k)>B[s][1]&&rN.get(k)<B[s+1][1]),0);
  return res;}
