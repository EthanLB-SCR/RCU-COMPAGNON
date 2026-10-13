// compteurs.js — COMPTEUR D'HEURES ET HEURES À REPORTER (13/10/2026, retour d'Ethan) — moteur pur (sans DOM), testé en Node (test/compteurs_test.mjs).
// Ethan : « il a son compteur d'heures, ou pas, qui peut être de différents montants d'heures ; toutes les heures sup se rangent dedans ; les heures se majorent selon
//  leur rang : la 36e heure rentre majorée à 25 % (1 h 15), la 44e à 50 % (1 h 30), jusqu'à ce que le compteur soit plein. Ces heures peuvent ensuite être posées par
//  l'entreprise s'il n'y a pas de travail, ou prises par le gars comme des congés (il pose 35 h de son compteur et reste chez lui une semaine). Les heures à reporter,
//  celles au-dessus de 48 h, se vident en prime ou se stockent et se replacent sur une semaine plus légère ; pareil, on majore à l'entrée. Je vais importer le
//  compteur existant. »
// Hypothèses (annoncées à Ethan, à valider) : compteur plein → le surplus est payé en heures sup (125 / 150 %) sur la navette du mois ; sans compteur, tout est payé ;
// contrat de 39 h → les heures 36 à 39 sont dans le salaire, le compteur prend à partir de la 40e ; une semaine = lundi → samedi (comme la navette), créditée quand
// elle est finie (dimanche passé) ; un solde de départ est arrêté à la fin d'une navette (dimanche de sa dernière semaine) : les semaines suivantes s'y ajoutent.
export const H125_FROM=35,H150_FROM=43,HEBDO_MAX=48,K125=1.25,K150=1.5,KREP=1.5,CONTRAT_DEF=35,BACK_WEEKS=26,MAX_WEEKS=260;
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DT=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d,12);};
export const addDay=(s,n)=>{const d=DT(s);d.setDate(d.getDate()+n);return iso(d);};
export const r2=v=>Math.round((+v||0)*100)/100;
/* lundi de la semaine d'un jour (le dimanche appartient à la semaine qui finit ce jour-là) ; premier lundi à partir d'une date */
export const mondayOf=s=>{const d=DT(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);};
const firstMondayFrom=s=>addDay(s,(8-DT(s).getDay())%7);
/* lundis des semaines qui comptent dans un mois de navette (leur jeudi est dans le mois) — même règle que navette.js */
export function navWeeksOf(ym){const [y,m]=String(ym).split('-').map(Number);const first=new Date(y,m-1,1,12);const mon=new Date(first);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));const out=[];
  for(let d=new Date(mon);;d.setDate(d.getDate()+7)){const th=new Date(d);th.setDate(th.getDate()+3);const k=th.getFullYear()*12+th.getMonth(),km=y*12+m-1;if(k>km)break;if(k===km)out.push(iso(d));}return out;}
/* fin d'une navette = dimanche qui suit sa dernière semaine (un solde « à la fin de la navette de septembre » compte jusque-là) */
export const navEnd=ym=>{const W=navWeeksOf(ym);return W.length?addDay(W[W.length-1],6):String(ym)+'-28';};
/* une date de solde tapée (« 30/09 », « 31/10 ») → la fin de la navette de ce mois-là si elle tombe à moins d'une semaine (la paie se clôt par navette : la semaine
   du 28/09 au 04/10 compte en octobre, celle du 26/10 au 01/11 aussi) ; sinon le dimanche qui précède (les semaines suivantes s'ajoutent) */
export function snapSolde(d){const s=String(d||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const E=navEnd(s.slice(0,7));const diff=Math.round((DT(s)-DT(E))/864e5);if(Math.abs(diff)<=6)return E;const wd=DT(s).getDay();return wd===0?s:addDay(s,-wd);}
export const ymOfNavEnd=d=>{const s=String(d||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const ym=s.slice(0,7);if(navEnd(ym)===s)return ym;const [y,m]=ym.split('-').map(Number);const n=(m===12?(y+1)+'-01':y+'-'+pad(m+1));return navEnd(n)===s?n:null;};

/* ── une semaine : heures sup par RANG (la 36e heure = +25 %, la 44e = +50 %), au-delà du contrat ; au-delà de 48 h = heures à reporter ── */
export function hsSplit(total,contrat){const T=Math.max(0,+total||0);const C=+contrat>0?+contrat:CONTRAT_DEF;const tc=Math.min(T,HEBDO_MAX);const b125=Math.max(C,H125_FROM),b150=Math.max(C,H150_FROM);
  return {hs125:r2(Math.max(0,Math.min(tc,H150_FROM)-b125)),hs150:r2(Math.max(0,tc-b150)),report:r2(Math.max(0,T-HEBDO_MAX))};}
/* ── ranger les heures sup dans le compteur, dans l'ordre (125 % d'abord), majorées, jusqu'au plafond ; le reste est payé ── */
export function fillCompteur(hs125,hs150,room){let r=room===null||room===undefined?Infinity:Math.max(0,+room||0);const a=Math.max(0,+hs125||0),b=Math.max(0,+hs150||0);
  const in125=Math.min(a,r/K125);r-=in125*K125;const in150=Math.min(b,r/K150);
  return {in125:r2(in125),in150:r2(in150),pay125:r2(a-in125),pay150:r2(b-in150),entree:r2(in125*K125+in150*K150)};}

/* ── la frise d'une personne ──
   o = {contrat, on (compteur suivi), plafond (h | null = sans plafond),
        depart:{h,at} | null (solde du compteur arrêté au dimanche at), departRep:{h,at} | null (solde « à reporter »),
        mvts:[{id,k:'recup'|'report',type:'repos'|'pose'|'replace',at,h,note,by,deleted}], primes:[{id,at,h,note,by,deleted}] (heures à reporter payées en prime),
        weekTotal(lundi) → heures pointées du lundi au samedi, upto (date incluse), back (semaines reconstituées sans solde de départ) }
   → {cpt:{on,plafond,depart,solde,from,cut,ev,weeks,...}, rep:{depart,solde,from,cut,ev,weeks,...}}
   ev = événements datés {d, t:'depart'|'entree'|'repos'|'pose'|'prime'|'replace', delta, bal} dans l'ordre ; une semaine est créditée à son dimanche, APRÈS les mouvements datés dans la semaine. */
export function compteurTimeline(o){o=o||{};const upto=String(o.upto||iso(new Date())).slice(0,10);const C=+o.contrat>0?+o.contrat:CONTRAT_DEF;const back=+o.back||BACK_WEEKS;
  const clean=m=>m&&!m.deleted&&m.at&&isFinite(+m.h)&&+m.h>0;
  const mv=(o.mvts||[]).filter(clean).map(m=>Object.assign({},m,{at:String(m.at).slice(0,10),h:+m.h}));
  const repl={};mv.filter(m=>m.k==='report'&&m.type==='replace').forEach(m=>{const mon=mondayOf(m.at);repl[mon]=r2((repl[mon]||0)+m.h);});
  const WT={};const wt=mon=>{if(!(mon in WT)){const t=o.weekTotal?+o.weekTotal(mon):0;WT[mon]=isFinite(t)&&t>0?r2(t):0;}return WT[mon];};
  const dep=x=>x&&x.at&&x.h!==null&&x.h!==undefined&&x.h!==''&&isFinite(+x.h)?{h:r2(+x.h),at:String(x.at).slice(0,10),mois:x.mois||ymOfNavEnd(x.at)}:null;
  const startOf=d=>d?firstMondayFrom(addDay(d.at,1)):firstMondayFrom(addDay(upto,-7*back));
  const sortM=L=>L.sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:0);
  const plafond=o.plafond===null||o.plafond===undefined||o.plafond===''||!isFinite(+o.plafond)||+o.plafond<=0?null:r2(+o.plafond);
  // compteur
  const cd=dep(o.depart);const cFrom=startOf(cd);const cCut=cd?cd.at:addDay(cFrom,-1);let bal=cd?cd.h:0;const cev=[{d:cCut,t:'depart',delta:0,bal}];
  const CM=sortM(mv.filter(m=>m.k==='recup'&&(m.type==='repos'||m.type==='pose')&&m.at>cCut&&m.at<=upto));let i=0;
  const applyC=lim=>{while(i<CM.length&&CM[i].at<=lim){const m=CM[i++];bal=r2(bal-m.h);cev.push({d:m.at,t:m.type,delta:-m.h,bal,m});}};
  const cweeks=[];const on=!!o.on;
  for(let mon=cFrom,n=0;n<MAX_WEEKS&&addDay(mon,6)<=upto;n++,mon=addDay(mon,7)){const sun=addDay(mon,6);applyC(sun);
    const pointe=wt(mon),rp=repl[mon]||0,T=r2(pointe+rp);const s=hsSplit(T,C);const f=fillCompteur(s.hs125,s.hs150,on?(plafond===null?Infinity:plafond-bal):0);
    if(f.entree)bal=r2(bal+f.entree);const w=Object.assign({mon,sun,pointe,repl:rp,T},s,f,{bal:on?bal:null,plein:on&&plafond!==null&&(f.pay125>0||f.pay150>0)});cweeks.push(w);if(f.entree)cev.push({d:sun,t:'entree',delta:f.entree,bal,w});}
  applyC(upto);
  const sum=(L,k)=>r2(L.reduce((t,x)=>t+(+x[k]||0),0));
  const cpt={on,plafond,depart:cd,solde:on?bal:null,from:cFrom,cut:cCut,ev:cev,weeks:cweeks,contrat:C,
    entrees:sum(cweeks,'entree'),pris:r2(CM.filter(m=>m.at<=upto&&m.type==='repos').reduce((t,m)=>t+m.h,0)),poses:r2(CM.filter(m=>m.at<=upto&&m.type==='pose').reduce((t,m)=>t+m.h,0)),
    pay125:sum(cweeks,'pay125'),pay150:sum(cweeks,'pay150'),mvts:CM,avant:mv.filter(m=>m.k==='recup'&&m.at<=cCut)};
  // heures à reporter
  const rd=dep(o.departRep);const rFrom=startOf(rd);const rCut=rd?rd.at:addDay(rFrom,-1);let rb=rd?rd.h:0;const rev=[{d:rCut,t:'depart',delta:0,bal:rb}];
  const RM=sortM((o.primes||[]).filter(clean).map(m=>({id:m.id,k:'report',type:'prime',at:String(m.at).slice(0,10),h:+m.h,note:m.note,by:m.by})).concat(mv.filter(m=>m.k==='report'&&(m.type==='replace'||m.type==='prime')).map(m=>m.type==='replace'?Object.assign({},m,{at:mondayOf(m.at)}):m)).filter(m=>m.at>rCut&&m.at<=upto));
  let j=0;const applyR=lim=>{while(j<RM.length&&RM[j].at<=lim){const m=RM[j++];rb=r2(rb-m.h);rev.push({d:m.at,t:m.type,delta:-m.h,bal:rb,m});}};
  const rweeks=[];for(let mon=rFrom,n=0;n<MAX_WEEKS&&addDay(mon,6)<=upto;n++,mon=addDay(mon,7)){const sun=addDay(mon,6);applyR(sun);const T=wt(mon);const ex=r2(Math.max(0,T-HEBDO_MAX));const e=r2(ex*KREP);if(e){rb=r2(rb+e);rev.push({d:sun,t:'entree',delta:e,bal:rb});}rweeks.push({mon,sun,T,ex,entree:e,bal:rb});}
  applyR(upto);
  const futurs=mv.filter(m=>m.k==='report'&&m.type==='replace'&&mondayOf(m.at)>upto);
  const rep={depart:rd,solde:rb,from:rFrom,cut:rCut,ev:rev,weeks:rweeks,ex:sum(rweeks,'ex'),entrees:sum(rweeks,'entree'),primes:r2(RM.filter(m=>m.type==='prime').reduce((t,m)=>t+m.h,0)),replaces:r2(RM.filter(m=>m.type==='replace').reduce((t,m)=>t+m.h,0)),mvts:RM,futurs,
    avant:(o.primes||[]).filter(clean).filter(m=>String(m.at).slice(0,10)<=rCut).concat(mv.filter(m=>m.k==='report'&&m.at<=rCut))};
  return {cpt,rep,repl,contrat:C,upto};}
/* solde juste après tous les événements datés ≤ d (null si d est avant le départ) */
export function balAt(ev,d){if(!ev||!ev.length||d<ev[0].d)return null;let b=ev[0].bal;for(const e of ev){if(e.d<=d)b=e.bal;else break;}return b;}

/* ── le mois d'une navette : soldes avant / après, ce qui est entré, pris, payé, replacé (pour pré-remplir la feuille) ── */
export function moisCompteurs(TL,ym){const W=navWeeksOf(ym);if(!W.length||!TL)return null;const d0=W[0],d1=addDay(W[W.length-1],6),veille=addDay(d0,-1);const inM=d=>d>=d0&&d<=d1;
  const c=TL.cpt,r=TL.rep;const cw=c.weeks.filter(w=>inM(w.mon)),rw=r.weeks.filter(w=>inM(w.mon));const sum=(L,k)=>r2(L.reduce((t,x)=>t+(+x[k]||0),0));
  const cOk=veille>=c.cut,rOk=veille>=r.cut; /* le mois commence après le solde de départ : tout est connu */
  return {d0,d1,
    cpt:{on:c.on,plafond:c.plafond,prev:c.on&&cOk?balAt(c.ev,veille):null,pris:r2(c.ev.filter(e=>(e.t==='repos'||e.t==='pose')&&inM(e.d)).reduce((t,e)=>t-e.delta,0)),
      repos:r2(c.ev.filter(e=>e.t==='repos'&&inM(e.d)).reduce((t,e)=>t-e.delta,0)),poses:r2(c.ev.filter(e=>e.t==='pose'&&inM(e.d)).reduce((t,e)=>t-e.delta,0)),
      hs125:sum(cw,'hs125'),hs150:sum(cw,'hs150'),pay125:sum(cw,'pay125'),pay150:sum(cw,'pay150'),entrees:sum(cw,'entree'),fin:c.on&&cOk?balAt(c.ev,d1):null,known:cOk,reconstitue:!c.depart,plein:cw.some(w=>w.plein)},
    rep:{prev:rOk?balAt(r.ev,veille):null,ex:sum(rw,'ex'),entrees:sum(rw,'entree'),primes:r2(r.ev.filter(e=>e.t==='prime'&&inM(e.d)).reduce((t,e)=>t-e.delta,0)),replaces:r2(r.ev.filter(e=>e.t==='replace'&&inM(e.d)).reduce((t,e)=>t-e.delta,0)),fin:rOk?balAt(r.ev,d1):null,known:rOk,reconstitue:!r.depart},
    repl:Object.fromEntries(W.filter(m=>TL.repl[m]).map(m=>[m,TL.repl[m]]))};}

/* ── import du compteur existant : tableau collé depuis Excel (ou classeur) → lignes reconnues / refusées ── */
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9@.]+/g,' ').trim();
export function parseHeures(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return isFinite(v)?r2(v):null;
  const s=String(v).replace(/ /g,' ').replace(/\s+/g,'').replace(/heures?$/i,'h');if(!s||s==='-'||s==='—')return null;
  let m=s.match(/^([-−]?)(\d+)[h:](\d{1,2})(?:min|mn|m)?$/i);if(m)return r2((m[1]?-1:1)*(+m[2]+(+m[3])/60));
  m=s.match(/^([-−]?\d+(?:[.,]\d+)?)h?$/i);if(m)return r2(+m[1].replace('−','-').replace(',','.'));return null;}
export function parseDateFr(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10);}
  const s=String(v).trim();let m=s.match(/(^|\D)(\d{4})-(\d{2})-(\d{2})/);if(m)return m[2]+'-'+m[3]+'-'+m[4];
  m=s.match(/(^|\D)(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(\D|$)/);if(m){const y=m[4].length===2?'20'+m[4]:m[4];return y+'-'+pad(+m[3])+'-'+pad(+m[2]);}return null;}
export const IMPORT_COLS=['Nom','Prénom','Contrat (h / semaine)','Compteur (h)','Plafond du compteur (h)','Heures à reporter (h)','Cas de déplacement forcé (1 à 4, vide = selon la distance)'];
const HEAD=[['email',/(^|\s)(e ?mail|courriel|adresse mail)(\s|$)/],['prenom',/^prenoms?$/],['nom',/^(nom|noms|nom de famille|salarie|salaries|collaborateur|collaborateurs|personne|identite|nom prenom|nom et prenom|prenom nom|prenom et nom|nom complet)$/],
  ['plafond',/plafond|maxi|capacite|limite/],['report',/report|48|au dela/],['contrat',/contrat|horaire|hebdo|h sem|duree/],['cas',/(^|\s)cas(\s|$)|deplacement|\bgd\b/],['date',/^(date|au|le|arrete au|date du solde|solde au)$/],['solde',/compteur|solde|recup|rcr|repos|stock/]];
/* rows : tableau de lignes (tableaux de cellules) ; persons : [{id, nom, prenom, email}] ; opts : {at : date du solde par défaut (dimanche de fin de navette)}
   → {cols:{clé:index}, head:n° de ligne d'en-tête, ok:[{line, pid, who, solde, plafond, report, contrat, cas, at}], bad:[{line, raw, why}]} */
export function parseSoldes(rows,persons,opts){opts=opts||{};const R=(rows||[]).map(r=>(Array.isArray(r)?r:[r]).map(v=>v===null||v===undefined?'':v));
  let hi=-1,cols=null;for(let i=0;i<Math.min(R.length,15)&&hi<0;i++){const c={};R[i].forEach((v,j)=>{const t=norm(v);if(!t)return;const h=HEAD.find(([k,re])=>!(k in c)&&re.test(t));if(h)c[h[0]]=j;});if((c.nom!==undefined||c.email!==undefined)&&(c.solde!==undefined||c.report!==undefined||c.plafond!==undefined||c.contrat!==undefined||c.cas!==undefined)){hi=i;cols=c;}}
  if(hi<0)return {cols:null,head:-1,ok:[],bad:[{line:0,raw:'',why:'en-tête introuvable : il faut au moins une colonne « Nom » (ou e-mail) et une colonne « Compteur », « Heures à reporter », « Plafond », « Contrat » ou « Cas »'}]};
  const headDate={};['solde','report'].forEach(k=>{if(cols[k]!==undefined){const d=snapSolde(parseDateFr(R[hi][cols[k]]));if(d)headDate[k]=d;}});
  const idx=new Map();const add=(k,id)=>{k=norm(k);if(!k)return;if(!idx.has(k))idx.set(k,new Set());idx.get(k).add(id);};
  (persons||[]).forEach(p=>{add((p.nom||'')+' '+(p.prenom||''),p.id);add((p.prenom||'')+' '+(p.nom||''),p.id);if(p.nom)add(p.nom,p.id);if(p.email)add(p.email,p.id);}); /* le nom seul : retenu s'il est unique, sinon « plusieurs personnes » */
  const find=(nom,prenom,mail)=>{const keys=[];if(mail)keys.push(mail);if(prenom){keys.push(nom+' '+prenom,prenom+' '+nom);}else keys.push(nom);for(const k of keys){const s=idx.get(norm(k));if(s&&s.size===1)return {id:[...s][0]};if(s&&s.size>1)return {amb:true};}return null;};
  const ok=[],bad=[],seen=new Set();
  for(let i=hi+1;i<R.length;i++){const row=R[i];const cell=k=>cols[k]!==undefined?row[cols[k]]:'';const raw=row.map(v=>String(v).trim()).filter(Boolean).join(' · ');if(!raw)continue;
    const nom=String(cell('nom')||'').trim(),prenom=String(cell('prenom')||'').trim(),mail=String(cell('email')||'').trim();if(!nom&&!mail){bad.push({line:i+1,raw,why:'nom manquant'});continue;}
    const f=find(nom,prenom,mail);const who=[nom,prenom].filter(Boolean).join(' ')||mail;if(!f){bad.push({line:i+1,raw,why:'personne introuvable dans l\'annuaire : '+who});continue;}if(f.amb){bad.push({line:i+1,raw,why:'plusieurs personnes portent ce nom : '+who+' — ajoute le prénom ou l\'e-mail'});continue;}
    if(seen.has(f.id)){bad.push({line:i+1,raw,why:'en double : '+who});continue;}
    const why=[];const o={line:i+1,pid:f.id,who};
    const num=(k,lab,test)=>{const v=cell(k);if(v===''||v===null||v===undefined)return;const h=parseHeures(v);if(h===null||(test&&!test(h))){why.push(lab+' illisible (« '+v+' »)');return;}o[k]=h;};
    num('solde','compteur');num('report','heures à reporter',h=>h>=0);num('plafond','plafond',h=>h>=0);num('contrat','contrat',h=>h>0&&h<=48);
    if(cols.cas!==undefined){const v=String(cell('cas')||'').trim();if(v){const m=v.match(/^(?:cas\s*)?([0-4])$/i);if(m)o.cas=+m[1];else if(/distance|auto|aucun|non/i.test(norm(v)))o.cas=0;else why.push('cas illisible (« '+v+' »)');}else o.cas=0;} /* colonne présente, case vide = selon la distance */
    const d=cols.date!==undefined?snapSolde(parseDateFr(cell('date'))):null;if(cols.date!==undefined&&String(cell('date')||'').trim()&&!d)why.push('date illisible (« '+cell('date')+' »)');
    o.at=d||headDate.solde||headDate.report||opts.at||null;if(d&&headDate.report)o.atRep=d;else o.atRep=d||headDate.report||headDate.solde||opts.at||null;
    if(why.length){bad.push({line:i+1,raw,why:why.join(', ')});continue;}
    if(['solde','report','plafond','contrat','cas'].every(k=>o[k]===undefined)){bad.push({line:i+1,raw,why:'rien à importer sur cette ligne'});continue;}
    if((o.solde!==undefined||o.report!==undefined)&&!o.at){bad.push({line:i+1,raw,why:'date du solde manquante (choisis la navette de fin)'});continue;}
    seen.add(f.id);ok.push(o);}
  return {cols,head:hi+1,ok,bad};}
/* texte collé (Excel : tabulations ; CSV : point-virgule) → lignes */
export function splitPaste(t){const L=String(t||'').replace(/\r\n?/g,'\n').split('\n');const first=L.find(x=>x.trim())||'';const sep=first.includes('\t')?'\t':first.includes(';')?';':first.includes(',')&&!/\d,\d/.test(first)?',':'\t';
  return L.map(x=>x.split(sep).map(v=>v.trim().replace(/^"(.*)"$/,'$1')));}
