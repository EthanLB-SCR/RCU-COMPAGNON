// dpgfrecap.js — LOT DK (16/10 nuit) : la part des postes répartis pour une nouvelle ligne, imputer sur des lignes choisies, un récap consultable. Ethan (16/10,
// après le lot C3) : « si je supprime une ligne ou que je baisse une ligne ou que je la monte, ça va re-répartir au prorata […] sauf que si à côté de ça j'ai une
// ligne en plus […] ma nouvelle ligne […] ne va pas pouvoir recevoir le prorata des modifs, elle n'aura pas d'installations par exemple ? […] il faudrait pouvoir
// ajouter sur 3 lignes précises et pas tout […] un espace de récap consultable où je vois la constitution de tous mes paniers, tous mes calculs ».
// · D1 « ⇶ DONNER SA PART » : poste réparti = composante pointée sur au moins 2 lignes. La ligne reçoit sa part de chaque poste coché (d'office : les postes
//   communs, sans DN, de sa zone et les installations ; un poste d'un DN seulement si c'est le DN de la ligne) : au ml = ce que portent les donneuses × ml de la
//   ligne ÷ (ml des donneuses + ml de la ligne) ; ligne pas au ml = au prorata des montants hors ce poste ; part modifiable (quantité ou €). Donneuses d'office :
//   les lignes au ml qui portent le poste (une ligne au forfait qui le porte n'en est pas), décochables. Les donneuses perdent au prorata de ce qu'elles tiennent
//   (scaleLine du lot C3 : leurs morceaux gardent leurs proportions) ; la ligne reçoit {k, q, via:'part', pid, at} — une part reste une part : linkNow, pointage,
//   ventilation, calculateur la comptent comme une saisie ; total pointé inchangé ; UN seul ↶ (run() du lot C3 → dxWrite) ; PU surlignés.
//   Accès : bouton dans le calculateur (bandeau quand la ligne n'a rien), élément « ligne sans part » de la liste des changements (ligne au ml pointée sans AUCUNE
//   part des postes répartis communs de sa zone ni des installations, alors qu'au moins la moitié des autres lignes au ml pointées de la même zone en ont ;
//   « ✓ Rien à faire » mémorisé dans suivi.ok['part:<id du lien>'] = l'état de la ligne et des postes répartis : la case revient s'ils changent), onglet
//   « À vérifier » du récap. Après coup : une répartition (« ↻ Refaire », « ✕ Défaire », « Mettre le reste au ml ») ne touche pas la part donnée et ne remet pas
//   ce poste sur cette ligne (dpgfrep.js planOf) ; la balance du lot C3 la met à l'échelle comme les autres morceaux.
// · D2 « SUR LES LIGNES QUE JE COCHE… » (liste du lot C3, « en plus » et « au ml / forfait ») : cases (les lignes déjà pointées sur ce poste, puis les autres
//   lignes du DPGF, repliables, recherche au-delà de 12), clé au prorata de ce qu'elles ont déjà / au ml / à parts égales, quantité modifiable par ligne (la
//   somme doit faire le total, contrôlée comme « Choisir ligne par ligne »), un seul ↶ ; une ligne sans lien en reçoit un (comme « Sur une ligne ») ; en plus →
//   ajouté à la saisie de la ligne ; balance → les lignes décochées perdent leur part, une ligne neuve reçoit {k, q, via:'bal', at}.
// · D3 « 🔎 RÉCAP » (lecture seule, aussi en consultation d'une version et quand le DPGF est sur l'autre écran) : notre prix, pointé, reste, lignes liées ;
//   par poste du chiffrage (où chaque composante est noyée, ligne par ligne, et comment : saisi au calculateur, répartition « … », part donnée, balance du …),
//   par ligne du DPGF (de quoi est fait le PU : propre à la ligne / noyé), répartitions et parts données, à vérifier ; recherche, tout déplier / replier,
//   impression A4 (tout déplié, sans boutons) ; un clic sur une ligne → la grille et le calculateur dessus ; Échap ferme. Calculs = ceux de la ventilation
//   (pointage, linkNow : quantité × PU de vente), rien de parallèle.
// Tout ce que dpgfxl.js prête passe par init() (aucun import circulaire) ; dpgfsuivi.js et dpgfclair.js appellent ce module par X.RC.
import {addrOf,parseAddr} from './xlcalc.js';
let X=null;export function init(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r2=x=>Math.round((+x||0)*100)/100;const r3=x=>Math.round((+x||0)*1000)/1000;const r6=x=>Math.round((+x||0)*1e6)/1e6;const up=s=>String(s||'').toUpperCase();
const fq=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?(Math.abs(x*100-Math.round(x*100))>1e-6?3:2):0);const fin=x=>String(+(+x).toFixed(3)).replace('.',',');const fin2=x=>String(+(+x).toFixed(2)).replace('.',',');
const numIn=s=>{s=String(s??'').trim().replace(/[\s  ]/g,'').replace(',','.');if(!s)return null;const x=parseFloat(s);return isFinite(x)?x:null;};
const enc=s=>encodeURIComponent(String(s));const dec=s=>{try{return decodeURIComponent(String(s||''));}catch(e){return String(s||'');}};
const docOK=()=>typeof document!=='undefined';const normF=x=>String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const pct=x=>nb(x,Math.abs(x)<10&&Math.abs(x-Math.round(x))>0.05?1:0)+' %';const dFR=x=>{if(!x)return '';const d=new Date(x);return isNaN(d.getTime())?'':d.toLocaleDateString('fr-FR');};
const dnOfTxt=t=>{const m=String(t||'').match(/\bDN\s?(\d{2,3})\b/i);return m?+m[1]:null;};
const cut=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1).trimEnd()+'…':t;};
const hsh=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);};
const words=f=>normF(f).trim().split(/\s+/).filter(Boolean);const hit=(W,t)=>!W.length||W.every(w=>normF(t).includes(w));
const ST={rc:{},part:{},multi:{}}; /* par affaire : le récap (onglet, recherche, plis), la fenêtre « Donner sa part », les cases d'un élément de la liste */
export function reset(num){delete ST.rc[num];delete ST.part[num];delete ST.multi[num];}
/* ═════════ 1 · LECTURES : les lignes du DPGF, ce que chaque lien porte, les postes répartis ═════════ */
/* DN d'une composante : soudures, manchons, autocontrôle (c.dn) ; vannes, SST, raccordements, extrusion (clé « …|d80… ») ; 0 = poste commun (installations, épreuve…) */
const cdn=c=>{if(!c)return 0;if(c.dn)return +c.dn;const m=/\|d(\d+)(?:\.|$)/.exec(c.k||'');return m?+m[1]:0;};
const zNom=(CP,z)=>z<0?'Installations':((CP.zones[z]||{}).nom||'Zone '+(z+1));
function G0(a,M,CP){const D=a.dpgf||{};const S=M?X.dpSheet(M,D):null;const sh=S?S.name:(D.sheetName||'');const pcol=X.CO&&M?X.CO.puCol(a,M):X.puColOf(D);const liens=D.liens||[]; /* 19/10 (lot DY) : la lecture effective des colonnes */
  const byA=new Map();liens.forEach(L=>{if(up(L.sh)===up(sh)&&!byA.has(L.a))byA.set(L.a,L);});
  const lines=(X.CO&&M?X.CO.lines(a,M):(D.lignes||[]).filter(l=>!l.section&&l.row)).map(l=>{const ad=l.a||addrOf(l.row,pcol);return {row:l.row,n:String(l.n||''),des:String(l.des||''),u:String(l.u||''),q:+l.qte||0,pu:+l.pu||0,isMl:X.REP.isMlU(l.u),a:ad,L:byA.get(ad)||l.L||null};}); /* (lot DY) DPGF mal lu à l'import : les lignes déduites, et le lien de leur rangée */
  const lineOf=new Map();lines.forEach(l=>{if(l.L)lineOf.set(l.L.id,l);});const hold=new Map();
  liens.forEach(L=>(L.comps||[]).forEach(x=>{const c=CP.by.get(x.k);const q=+x.q||0;if(!c||!(q>0))return;let m=hold.get(c.k);if(!m)hold.set(c.k,m=new Map());m.set(L.id,(m.get(L.id)||0)+q);}));
  if(X.ZN)X.ZN.holdV(a,M,CP,hold); /* 17/10 (lot DZ) : les installations communes par zone (part de chaque zone, ligne par ligne) */
  const lab=L=>{const l=L&&lineOf.get(L.id);return l?(l.n||l.a):(L?L.a:'');};
  return {D,S,sh,pcol,liens,lines,lineOf,hold,lab,byId:new Map(liens.map(L=>[L.id,L]))};}
const nHold=(G,k)=>{const m=G.hold.get(k);let n=0;if(m)m.forEach(t=>{if(t>1e-9)n++;});return n;};
const tIn=(G,k,id)=>{const m=G.hold.get(k);return m?(m.get(id)||0):0;};
/* zones « du réseau » d'une ligne : celles de ses postes d'un DN (soudures, manchons, vannes…) ; sinon celles de tout ce qu'elle porte ; sinon celles du DN de
   sa désignation ; sinon la zone unique du chiffrage (les postes communs étalés sur toutes les lignes par « Mettre le reste au ml » ne la font pas changer de zone) */
function zonesOf(G,CP,l){const z=new Set(),z2=new Set();if(l&&l.L)(l.L.comps||[]).forEach(x=>{const c=CP.by.get(x.k);if(!c||c.z<0||!((+x.q||0)>0))return;(cdn(c)?z:z2).add(c.z);});if(z.size)return z;if(z2.size)return z2;if(!l)return z;
  const dn=dnOfTxt(l.des);if(dn)CP.list.forEach(c=>{if(c.dn===dn&&c.z>=0)z.add(c.z);});if(!z.size&&CP.zones.length===1)z.add(0);return z;}
/* les autres lignes au ml pointées de la même zone (toutes si la ligne n'a pas de zone) */
const pointedMl=(G,CP)=>G.lines.filter(l=>l.isMl&&l.q>0&&l.L&&(l.L.comps||[]).some(x=>(+x.q||0)>0&&CP.by.has(x.k)));
const peersOf=(ml,ZZ,l,Z)=>ml.filter(o=>o!==l&&(!Z.size||[...ZZ(o)].some(z=>Z.has(z))));
/* DN d'une ligne : ceux des soudures, manchons, autocontrôles qu'elle porte ; sinon celui de sa désignation */
function dnsOf(CP,l){const s=new Set();if(l&&l.L)(l.L.comps||[]).forEach(x=>{const c=CP.by.get(x.k);if(c&&c.dn&&(+x.q||0)>0)s.add(+c.dn);});if(!s.size&&l){const d=dnOfTxt(l.des);if(d)s.add(d);}return s;}
/* les lignes au ml pointées sans AUCUNE part des postes répartis communs (sans DN) qui la concernent — installations, postes de sa zone, postes que portent les
   autres lignes de sa zone — alors qu'au moins la moitié des autres lignes au ml pointées de la même zone en ont */
function sansPart(G,CP){const rep=[...G.hold.keys()].filter(k=>nHold(G,k)>=2).map(k=>CP.by.get(k)).filter(c=>c&&!cdn(c));if(!rep.length)return [];
  const ml=pointedMl(G,CP);const ZM=new Map(ml.map(l=>[l,zonesOf(G,CP,l)]));const ZZ=o=>ZM.get(o)||new Set();const holds=(l,c)=>tIn(G,c.k,l.L.id)>1e-9;const out=[];
  ml.forEach(l=>{const Z=ZZ(l);const peers=peersOf(ml,ZZ,l,Z);const R=rep.filter(c=>c.z<0||Z.has(c.z)||peers.some(o=>holds(o,c)));if(!R.length||R.some(c=>holds(l,c)))return;
    const nHave=peers.filter(o=>R.some(c=>holds(o,c))).length;if(!nHave||nHave*2<peers.length)return;out.push({l,Z,R,peers:peers.length,nHave});});return out;}
const sigOf=s=>'part|'+r3(s.l.q)+'|'+hsh([...new Set(s.R.map(c=>c.bk||c.k))].sort().join(',')); /* (lot DZ) une part de zone compte comme son installation */
const lnNom=(CP,l)=>{const d=dnsOf(CP,l);return (d.size?'DN '+[...d].sort((x,y)=>x-y).join(', ')+' · ':'')+'ligne '+(l.n||l.a);};
const lc=t=>/^.[A-ZÀ-Ý]/.test(t)?t:t.charAt(0).toLowerCase()+t.slice(1); /* « Épreuve hydraulique » → « épreuve hydraulique » ; « DOE / … » reste tel quel */
const postNoms=R=>{const o=[];if(R.some(c=>X.SV.isInst(c)))o.push('installations');R.forEach(c=>{if(X.SV.isInst(c))return;const t=lc(c.pl||'');if(t&&!o.includes(t))o.push(t);});return o;};
const enOnt=(h,p,mz)=>{const z=mz?' de sa zone':'';return h===p?(p>1?'les '+p+' autres lignes au ml'+z+' en ont':'l\'autre ligne au ml'+z+' en a'):h+' des '+p+' autres lignes au ml'+z+' en ont';};
/* les éléments « ligne sans part » de la liste des changements (dpgfsuivi.js itemsOf) ; ok = suivi.ok (« ✓ Rien à faire ») */
export function partItems(a,CP,M,ok){if(!M||!CP)return [];let G;try{G=G0(a,M,CP);}catch(e){return [];}
  return sansPart(G,CP).map(s=>{const k='part:'+s.l.L.id;const sig=sigOf(s);if(ok&&ok[k]===sig)return null;
    return {k,c:null,kind:'part',row:s.l.row,L:s.l.L,lines:[s.l.L],nm:lnNom(CP,s.l),zn:[...s.Z].sort((x,y)=>x-y).map(z=>zNom(CP,z)).join(', ')||'Installations',R:s.R,peers:s.peers,nHave:s.nHave,mz:CP.zones.length>1,sig,short:'ligne '+(s.l.n||s.l.a)+' : aucune part des postes répartis'};}).filter(Boolean);}
export function partSig(a,CP,M,k){try{const id=String(k).slice(5);const s=sansPart(G0(a,M,CP),CP).find(x=>x.l.L.id===id);return s?sigOf(s):null;}catch(e){return null;}}
export function phrase(it){const N=postNoms(it.R||[]);return `<b class="c3-bad">aucune part des postes répartis</b> : ${esc(N.slice(0,3).join(', ')+(N.length>3?'…':''))} (${enOnt(it.nHave,it.peers,it.mz)})`;}
export const introPart=()=>`<p class="c3-intro">Une ligne au ml pointée n'a aucune part des postes répartis sur les autres lignes (installations, épreuve…). « ⇶ Lui donner sa part » : elle reçoit sa part, reprise au prorata sur les lignes qui les portent déjà ; le total ne bouge pas.</p>`;
export const partBtn=(a,it)=>`<button class="btn sm primary" data-act="af" data-v="dxdkpart|${it.row}" title="Ouvre la fenêtre : les postes répartis, la part proposée, les lignes qui la donnent, les PU avant → après">⇶ Lui donner sa part</button>`;
/* ═════════ 2 · « ⇶ DONNER SA PART » : le calcul ═════════ */
/* st = la fenêtre {on:{k:bool}, q:{k:texte}, dn:{id du lien:bool}} ; sans st : les choix d'office */
function planPart(a,M,CP,row,st){const G=G0(a,M,CP);const l=G.lines.find(x=>x.row===row)||null;if(!l)return null;st=st||{};const L=l.L;const own=k=>L?tIn(G,k,L.id):0;
  const Z=zonesOf(G,CP,l);const dns=dnsOf(CP,l);const ord=new Map();X.SV.calcGroups(CP).forEach((g,gi)=>g.list.forEach((c,i)=>{if(!ord.has(c.k))ord.set(c.k,gi*1e4+i);}));
  const ZM=new Map();const ZZ=o=>{if(!ZM.has(o))ZM.set(o,zonesOf(G,CP,o));return ZM.get(o);};const peers=peersOf(pointedMl(G,CP),ZZ,l,Z);const near=c=>c.z<0||Z.has(c.z)||peers.some(o=>tIn(G,c.k,o.L.id)>1e-9); /* ce qui concerne la ligne : comme sansPart */
  const AM=new Map();const amtOf=Lk=>{if(!AM.has(Lk.id))AM.set(Lk.id,X.linkNow(Lk,CP,M).amt);return AM.get(Lk.id);};
  const cs=[...G.hold.keys()].filter(k=>nHold(G,k)>=2).map(k=>CP.by.get(k)).filter(c=>c&&(!Z.size||near(c))).sort((x,y)=>(ord.has(x.k)?ord.get(x.k):9e9)-(ord.has(y.k)?ord.get(y.k):9e9));
  const dm=new Map();cs.forEach(c=>{G.hold.get(c.k).forEach((t,id)=>{if(t<=1e-9||(L&&id===L.id))return;let d=dm.get(id);if(!d){const Lk=G.byId.get(id);const ln=G.lineOf.get(id)||null;
    d={id,L:Lk,l:ln,lab:G.lab(Lk),des:ln?ln.des:Lk.sh+'!'+Lk.a,ml:ln&&ln.isMl?ln.q:0,isMl:!!(ln&&ln.isMl),n:0};d.on=st.dn&&st.dn[id]!==undefined?!!st.dn[id]:d.isMl;dm.set(id,d);}d.n++;});});
  const donors=[...dm.values()].sort((x,y)=>((x.l||{}).row||9e9)-((y.l||{}).row||9e9));const key=l.isMl?'ml':'amt';const A_L=L?amtOf(L):0;
  const rows=cs.map(c=>{const k=c.k;const hq=own(k);const held=hq>1e-9;const ds=donors.filter(d=>d.on&&tIn(G,k,d.id)>1e-9).map(d=>({id:d.id,T:tIn(G,k,d.id),d}));const Qd=ds.reduce((s,x)=>s+x.T,0);const mlD=ds.reduce((s,x)=>s+(x.d.isMl?x.d.ml:0),0);
    let ky=key,def=0;if(key==='ml'&&mlD>0)def=Qd*l.q/(mlD+l.q);else{ky='amt';const AD=ds.reduce((s,x)=>s+Math.max(0,amtOf(x.d.L)-x.T*c.puV),0);def=A_L>0?Qd*A_L/(AD+A_L):0;}
    def=r3(Math.min(Qd,Math.max(0,def)));const d0=!held&&(cdn(c)?dns.has(cdn(c))&&(c.z<0||!Z.size||Z.has(c.z)):near(c));const on=!held&&Qd>1e-9&&(st.on&&st.on[k]!==undefined?!!st.on[k]:d0);
    let q=def;const t=st.q&&st.q[k];if(t!==undefined&&t!==null&&String(t).trim()!==''){const v=numIn(t);q=v===null?NaN:v;}const bad=on&&(!isFinite(q)||q<0||q>Qd+1e-6);
    return {c,k,held,hq,n:nHold(G,k),ds,Qd,mlD,key:ky,def,q,on,bad};});
  const use=rows.filter(r=>r.on&&!r.bad&&r.q>1e-9);const tot=use.reduce((s,r)=>s+r.q*r.c.puV,0);const giv=new Set();use.forEach(r=>r.ds.forEach(x=>giv.add(x.id)));
  return {G,l,L,Z,dns,key,rows,donors,use,tot,A_L,nGiv:giv.size};}
const cfgOf=P=>P?{row:P.l.row,rows:P.use.map(r=>({k:r.k,q:r3(r.q),ids:r.ds.map(x=>x.id)}))}:null;
/* la ligne du DPGF (rangée row) : son lien, à modifier ; sans lien → un lien neuf (comme « Sur une ligne » du lot C3) */
function lineLink(a,CP,M,row,R){const D=a.dpgf||{};const S=M&&X.dpSheet(M,D);const l=X.CO&&S?X.CO.lineAt(a,M,S,row):(D.lignes||[]).find(x=>!x.section&&x.row===row); /* (lot DY) */if(!l||!S){R.msg.push('ligne du DPGF introuvable');return null;}
  const pa=addrOf(row,X.CO?X.CO.puCol(a,M):X.puColOf(D));const L0=R.W.find(x=>up(x.sh)===up(S.name)&&x.a===pa)||(X.CO?R.W.find(x=>up(x.sh)===up(S.name)&&(parseAddr(x.a||'')||{}).r===row):null);if(L0)return R.ed(L0.id); /* (lot DY) le lien de la rangée, même hors de la colonne PU */
  const qc=X.CO?X.CO.qtyCol(a,M):X.qtyColOf(D);const qa=qc?addrOf(row,qc):null;const qv=qa?X.qOfCell(M,S.name,qa):null;const q=qv!==null&&qv>0?qv:(+l.qte||0);if(!(q>0)){R.msg.push('la ligne '+(l.n||pa)+' n\'a pas de quantité');return null;}
  const L={id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),sh:S.name,a:pa,qa,q,qfix:false,u:l.u||'',comps:[],pu:0,amt:0,v:CP.v,at:R.now,by:R.by,col:X.nextCol({liens:R.W}),_c:1};R.W.push(L);R.ix.set(L.id,R.W.length-1);return L;}
/* appelé par run() (dpgfsuivi.js) : give = donner sa part ; multi = « en plus » sur les lignes cochées ; rebal = la balance sur les lignes cochées. R = {W, ix, ed, D, now, by, msg} */
export function runAct(a,CP,M,it,act,arg,R){if(act!=='give'&&act!=='multi'&&act!=='rebal')return false;
  if(act==='give'){const cfg=arg&&arg.cfg?arg.cfg:cfgOf(planPart(a,M,CP,it.row,null));if(!cfg||!cfg.rows.length){R.msg.push('aucune part à donner');return true;}const Lr=(cfg.id&&R.ed(cfg.id))||lineLink(a,CP,M,cfg.row,R);if(!Lr)return true; /* (lot DY) cfg.id : le lien de la ligne calculée */
    const pid='P'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);let n=0;
    cfg.rows.forEach(p=>{const k=p.k;const Z=X.ZN?X.ZN.gv(CP,k,a,M):null;const S_=Z||X.SV; /* 17/10 (lot DZ) : la part d'une zone se prend sur ce que les lignes portent DANS cette zone, et se reçoit avec zs */const ds=(p.ids||[]).map(id=>R.ed(id)).filter(L=>L&&L!==Lr).map(L=>({L,T:S_.tOf(CP,L,k)})).filter(d=>d.T>1e-9);const Qd=ds.reduce((s,d)=>s+d.T,0);const q=Math.min(+p.q||0,Qd);if(!(q>1e-9))return;
      const loss=X.SV.splitQ(q,ds.map(d=>d.T/Qd));let g=0;ds.forEach((d,i)=>{S_.scaleLine(CP,d.L,k,d.T,Math.max(0,d.T-loss[i]));g+=d.T-S_.tOf(CP,d.L,k);}); /* reçu = ce que les donneuses ont vraiment perdu : le total ne bouge pas */
      if(g>1e-9){Lr.comps.push(Z?Object.assign(Z.comp(r6(g),pid,R.now),p.zs?{zs:p.zs}:{}):{k,q:r6(g),via:'part',pid,at:R.now});n++;}}); /* (lot DY) p.zs : reprise sur une zone qui en porte trop, reçue dans la zone de la ligne */
    if(!n)R.msg.push('aucune part à donner : plus aucune ligne ne porte ces postes');return true;}
  const T=(arg&&arg.lines)||{};const k=it.k;let n=0;
  if(act==='multi')Object.keys(T).forEach(v=>{const q=r3(+T[v]||0);if(!(q>0))return;const L=/^L:/.test(v)?R.ed(v.slice(2)):lineLink(a,CP,M,+v.slice(2),R);if(!L)return;
    const d=L.comps.find(x=>!x.rep&&!x.sub&&!x.via&&X.SV.kOf(CP,x)===k);if(d)d.q=r3((+d.q||0)+q);else L.comps.push({k,q});n++;});
  else{const vs=new Set(Object.keys(T));(it.lines||[]).forEach(L0=>vs.add('L:'+L0.id));vs.forEach(v=>{const tg=r3(+T[v]||0);const L=/^L:/.test(v)?R.ed(v.slice(2)):(tg>0?lineLink(a,CP,M,+v.slice(2),R):null);if(!L)return;
    const t0=X.SV.tOf(CP,L,k);if(t0>1e-9)X.SV.scaleLine(CP,L,k,t0,tg);else if(tg>0)L.comps.push({k,q:tg,via:'bal',at:R.now});if(tg>0)n++;});}
  (it.lines||[]).forEach(L0=>R.ed(L0.id)); /* le prix de la composante a pu changer : toutes ses lignes */if(!n&&!R.msg.length)R.msg.push('coche au moins une ligne');return true;}
/* « ↦ Mettre » au calculateur (dpgfclair.js put) sur une ligne qui a reçu sa part : une quantité inchangée garde ses morceaux tels quels (« part donnée », balance) ;
   une quantité changée au calculateur redevient une saisie */
export function keepVia(old,comps,CP){if(!old||!(old.comps||[]).some(x=>x.via))return comps;const out=[];
  comps.forEach(x=>{if(x.sub){out.push(x);return;}const E=old.comps.filter(y=>!y.rep&&!y.sub&&X.SV.kOf(CP,y)===x.k&&(y.zs||'')===(x.zs||'')); /* (lot DZ) même zone */const T=E.reduce((s,y)=>s+(+y.q||0),0);if(E.some(y=>y.via)&&Math.abs(T-x.q)<=0.0006)E.forEach(y=>out.push(Object.assign({},y,{k:x.k})));else out.push(x);});return out;}
/* ═════════ 3 · LA FENÊTRE « ⇶ DONNER SA PART » ═════════ */
const runGive=(a,CP,M,P)=>X.SV.run(a,CP,M,[{it:{k:'part:'+(P.L?P.L.id:'R'+P.l.row),kind:'part',row:P.l.row,lines:[]},act:'give',arg:{cfg:cfgOf(P)}}]);
function pRow(CP,P,r,S){const c=r.c;const u=c.u;const nm=X.compName(c);const dis=r.held||r.Qd<=1e-9;const kind=r.key==='amt'&&P.key==='ml'?' · au prorata des montants (aucune ligne au ml ne le donne)':'';
  const info=r.held?`déjà sur cette ligne : ${fq(r.hq)} ${esc(u)}`:r.Qd<=1e-9?'aucune ligne qui donne n\'en porte : coche-en dans « Lignes qui donnent »':`réparti sur ${r.n} lignes · part proposée ${fq(r.def)} ${esc(u)} (${eur(r.def*c.puV,Math.abs(r.def*c.puV)<10?2:0)})${kind}`;
  const qv=S.q[r.k]!==undefined?S.q[r.k]:fin(r.def);const ev=S.e[r.k]!==undefined?S.e[r.k]:fin2((isFinite(r.q)?r.q:0)*c.puV);
  return `<div class="dk-pr${r.on?' on':''}${dis?' dis':''}${r.on&&r.bad?' bad':''}" data-k="${esc(r.k)}"><label class="dk-prc"><input type="checkbox" data-dk="pon" data-k="${esc(r.k)}"${r.on?' checked':''}${dis?' disabled':''}><span class="dk-prn"><span class="dk-zt">${esc(zNom(CP,c.z))}</span> ${esc(nm)}<small>${info}</small></span></label>${r.on?`<span class="dk-prq">part <input inputmode="decimal" data-dk="pq" data-k="${esc(r.k)}" value="${esc(qv)}" aria-label="${esc('Part de la ligne : '+nm)}"> ${esc(u)} = <input inputmode="decimal" data-dk="pe" data-k="${esc(r.k)}" value="${esc(ev)}" aria-label="${esc('Part en euros : '+nm)}"> € <small class="dk-pbad">${r.bad?'au plus '+esc(fq(r.Qd)+' '+u):''}</small></span>`:''}</div>`;}
function pvOf(a,CP,M,P){if(!P.use.length)return '<div class="c3-pu dim">PU : aucun ne change (rien de coché)</div>';const R=runGive(a,CP,M,P);return R.msg.length?`<div class="c3-pu dim">${esc(R.msg.join(' ; '))}</div>`:X.SV.puHTML(R.chg);}
const ptot=P=>P.use.length?`Part totale <b>${eur(P.tot,2)}</b> · ${P.use.length} poste${P.use.length>1?'s':''}, reprise sur ${P.nGiv} ligne${P.nGiv>1?'s':''}`:'Rien de coché';
function partHTML(a,M){const S=ST.part[a.num];const CP=X.compsOf(a);if(!S||!CP)return '';X.REP.css(document);X.SV.css(document);const P=planPart(a,M,CP,S.row,S);
  const hd=`<div class="rp-hd"><h3>⇶ Donner sa part${P?' à la ligne '+esc(P.l.n||P.l.a):''}</h3><button class="btn sm" data-act="af" data-v="dxdkpartx|" aria-label="Fermer">✕</button></div>`;
  const wrap=h=>`<div class="rp-ov dk-pov" id="dk-pov"><div class="rp-dlg dk-pdlg" id="dk-pdlg" role="dialog" aria-modal="true" aria-label="Donner sa part">${h}</div></div>`;
  if(!P)return wrap(hd+'<div class="rp-body"><div class="eq-s">Cette ligne n\'est plus dans le DPGF.</div></div>');const l=P.l;const XL=P.L?X.linkNow(P.L,CP,M):null;
  const line=`<div class="dk-pl"><b>${esc(l.n||l.a)}</b> ${esc(l.des)} <span class="dim">· ${fq(l.q)} ${esc(l.u)} · ${XL?'PU aujourd\'hui '+nb(XL.pur,2)+' €':'pas encore de prix'}</span></div>`;
  const keyTxt=P.key==='ml'?`Sa part, au ml : ce que portent les lignes qui donnent × ${fq(l.q)} ml ÷ (leurs ml + ${fq(l.q)} ml).`:`Cette ligne n'est pas au ml : sa part se calcule au prorata des montants (le montant de la ligne face à celui des lignes qui donnent, hors ce poste).${P.A_L>0?'':' <b class="c3-bad">Elle n\'a pas encore de montant</b> : la part proposée est 0 ; mets d\'abord son prix au calculateur, ou tape la part à la main.'}`;
  const rows=P.rows.length?P.rows.map(r=>pRow(CP,P,r,S)).join(''):'<div class="eq-s">Aucun poste n\'est réparti sur plusieurs lignes du DPGF : rien à donner.</div>';const nOn=P.donors.filter(d=>d.on).length;
  const dons=P.donors.length?`<details class="dk-pdn" data-dkd="pdn"${S.od?' open':''}><summary>Lignes qui donnent : ${nOn} sur ${P.donors.length} <span class="hint">· d'office les lignes au ml qui portent ces postes ; décoche une ligne pour qu'elle ne donne rien</span></summary><div class="dk-pdl">${P.donors.map(d=>`<label class="dk-pdr"><input type="checkbox" data-dk="pdn" data-id="${esc(d.id)}"${d.on?' checked':''}><span><b>${esc(d.lab)}</b> ${esc(String(d.des).slice(0,70))} <small>· ${d.isMl?fq(d.ml)+' ml':'pas au ml : ne donne pas d\'office'} · porte ${d.n} de ces postes</small></span></label>`).join('')}</div></details>`:'';
  const bad=P.rows.some(r=>r.on&&r.bad);
  const ft=`<div class="rp-ft"><span class="rp-tot" id="dk-ptot">${ptot(P)}</span><span class="rp-btns"><button class="btn sm" data-act="af" data-v="dxdkpartx|">Annuler</button><button class="btn sm primary" data-act="af" data-v="dxdkpartok|"${P.use.length&&!bad?'':' disabled'}>⇶ Donner sa part</button></span></div>`;
  return wrap(hd+`<div class="rp-body dk-pbody" id="dk-pbody">${line}<p class="dk-pi">Les postes répartis sur plusieurs lignes du DPGF (installations, épreuve…) : coche ceux que cette ligne doit porter. Sa part est <b>reprise au prorata sur les lignes qui les portent déjà</b> : le total ne bouge pas, et un seul ↶ remet tout.</p><p class="dk-pi dim">${keyTxt}</p><div class="dk-prs">${rows}</div>${dons}<div class="dk-pvw"><div class="dk-pvh">Aperçu des prix</div><div id="dk-ppv">${pvOf(a,CP,M,P)}</div></div></div>`+ft);}
/* pendant la frappe : la case jumelle (€ ↔ quantité), le contrôle, l'aperçu, le total — sans redessiner le champ tapé */
function softPart(num){const a=X.affOf(num);const M=a&&X.modelOf(a);const S=ST.part[num];const CP=a&&X.compsOf(a);if(!M||!S||!CP||!docOK())return;const P=planPart(a,M,CP,S.row,S);if(!P)return;const ae=document.activeElement;
  P.rows.forEach(r=>{const box=[...document.querySelectorAll('#dk-pdlg .dk-pr')].find(x=>x.dataset.k===r.k);if(!box)return;box.classList.toggle('bad',r.on&&r.bad);const b=box.querySelector('.dk-pbad');if(b)b.textContent=r.bad?'au plus '+fq(r.Qd)+' '+r.c.u:'';
    const qi=box.querySelector('[data-dk="pq"]'),ei=box.querySelector('[data-dk="pe"]');if(qi&&qi!==ae&&S.q[r.k]!==undefined)qi.value=S.q[r.k];if(ei&&ei!==ae)ei.value=fin2((isFinite(r.q)?r.q:0)*r.c.puV);});
  const t=document.getElementById('dk-ptot');if(t)t.innerHTML=ptot(P);const pv=document.getElementById('dk-ppv');if(pv)pv.innerHTML=pvOf(a,CP,M,P);const bt=document.querySelector('#dk-pdlg [data-v="dxdkpartok|"]');if(bt)bt.disabled=!(P.use.length&&!P.rows.some(r=>r.on&&r.bad));}
function refreshPart(num){const el=document.getElementById('dk-pov');const a=X.affOf(num);const M=a&&X.modelOf(a);if(!el||!M)return;const b=document.getElementById('dk-pbody');const st=b?b.scrollTop:0;const t=document.createElement('div');t.innerHTML=partHTML(a,M);const n=t.firstElementChild;if(n)el.replaceWith(n);const b2=document.getElementById('dk-pbody');if(b2)b2.scrollTop=st;}
function closePart(num){delete ST.part[num];const o=docOK()&&document.getElementById('dk-pov');if(o)o.remove();}
function applyPart(a,M){const num=a.num;const S=ST.part[num];const CP=X.compsOf(a);if(!S||!CP)return;const P=planPart(a,M,CP,S.row,S);if(!P)return;
  if(P.rows.some(r=>r.on&&r.bad)){X.say('Une part dépasse ce que portent les lignes qui donnent : corrige-la');return;}if(!P.use.length){X.say('Rien à donner : coche au moins un poste');return;}
  const R=runGive(a,CP,M,P);if(R.msg.length){X.say('Rien d\'écrit : '+R.msg.join(' ; '));return;}keep(num);X.dxWrite(a,R.vals,{liens:()=>R.W});X.XS.calc[num]=null;closePart(num);
  const m=X.SV.moved(R.chg);X.SV.flash(m.filter(x=>x.neu!==null).map(x=>x.id));const a2=X.affOf(num);const M2=a2&&X.modelOf(a2);const CP2=a2&&X.compsOf(a2);if(M2&&CP2&&!X.SV.itemsOf(a2,CP2,M2).length)X.SV.act('dxc3close','','',a2,true,M2);
  X.say('⇶ Ligne '+(P.l.n||P.l.a)+' : sa part reçue ('+P.use.length+' poste'+(P.use.length>1?'s':'')+', '+eur(P.tot)+'), reprise au prorata sur '+P.nGiv+' ligne'+(P.nGiv>1?'s':'')+' — '+m.length+' PU réécrit'+(m.length>1?'s':'')+', surligné'+(m.length>1?'s':'')+' dans la grille · ↶ pour revenir');X.rerender();}
/* ═════════ 4 · « SUR LES LIGNES QUE JE COCHE… » (liste des changements du lot C3) ═════════ */
export function multiBtn(a,it){if(it.sub||(it.kind!=='plus'&&it.kind!=='bal'))return '';const S=ST.multi[a.num];const on=!!S&&S.k===it.k;
  return `<button class="btn sm${on?' on':''}" data-act="af" data-v="dxdkmulti|${enc(it.k)}" aria-expanded="${on?'true':'false'}" title="${it.kind==='plus'?'Choisir les lignes qui reçoivent (2, 3… lignes), au prorata, au ml ou à parts égales':'La quantité à tenir, sur les lignes que tu coches (les lignes décochées perdent leur part)'}">${it.kind==='plus'?'Sur les lignes que je coche…':'Refaire la balance sur les lignes que je coche…'}</button>`;}
function mPlan(a,CP,M,it,S){const G=G0(a,M,CP);const k=it.k;const bal=it.kind==='bal';const total=r3(bal?X.SV.targets(CP,it,'bal').reduce((s,x)=>s+x.tg,0):it.imp);const mine=new Set((it.lines||[]).map(L=>L.id));
  const rows=(it.lines||[]).map(L=>{const l=G.lineOf.get(L.id)||null;return {v:'L:'+L.id,lab:G.lab(L),des:l?l.des:L.sh+'!'+L.a,t:tIn(G,k,L.id),ml:l&&l.isMl?l.q:0,isMl:!!(l&&l.isMl),u:l?l.u:(L.u||''),q:l?l.q:(+L.q||0),mine:true,row:l?l.row:9e9};}).sort((x,y)=>x.row-y.row);
  const oth=G.lines.filter(l=>!(l.L&&mine.has(l.L.id))).map(l=>({v:l.L?'L:'+l.L.id:'R:'+l.row,lab:l.n||l.a,des:l.des,t:0,ml:l.isMl?l.q:0,isMl:l.isMl,u:l.u,q:l.q,mine:false,row:l.row,linked:!!l.L}));
  const all=rows.concat(oth);all.forEach(r=>{r.on=S.on[r.v]!==undefined?!!S.on[r.v]:r.mine;});const ch=all.filter(r=>r.on);const key=S.key||(ch.length&&ch.every(r=>r.t>1e-9)?'pro':'ml');const w=r=>key==='pro'?r.t:key==='ml'?r.ml:1;
  /* pré-rempli selon la clé ; une quantité tapée reste telle quelle (cocher, décocher ou changer de clé repart de la clé) ; la somme est contrôlée */
  const W=ch.reduce((s,r)=>s+w(r),0);const sp=ch.length&&W>0?X.SV.splitQ(total,ch.map(r=>w(r)/W)):ch.map(()=>0);
  ch.forEach((r,i)=>{if(S.tch[r.v]&&S.q[r.v]!==undefined){r.qt=S.q[r.v];r.qv=numIn(S.q[r.v]);}else{r.qv=sp[i];r.qt=fin(sp[i]);}});
  const sum=ch.reduce((s,r)=>s+(r.qv!==null&&isFinite(r.qv)?r.qv:0),0);const bad=ch.some(r=>r.qv===null||!isFinite(r.qv)||r.qv<0);const ok=!bad&&ch.length>0&&Math.abs(sum-total)<0.0015;
  return {G,k,bal,total,rows,oth,all,ch,key,sum,bad,ok,zeroW:ch.length>0&&!(W>0)};}
function mRow(P,r,u){const id=esc(r.v);return `<div class="dk-mr${r.on?' on':''}" data-v="${id}"><label class="dk-mrl"><input type="checkbox" data-dk="mon" data-v="${id}"${r.on?' checked':''}><span><b>${esc(r.lab)}</b> ${esc(cut(r.des,80))} <small>· ${r.t>1e-9?'a déjà '+esc(X.SV.qn(r.t,u)):'n\'en a pas'} · ligne de ${fq(r.q)} ${esc(r.u)}${r.mine||r.linked?'':' · sans lien : en reçoit un'}</small></span></label>${r.on?`<span class="dk-mq"><input inputmode="decimal" data-dk="mq" data-v="${id}" value="${esc(r.qt)}" aria-label="${esc('Quantité pour la ligne '+r.lab)}"> ${esc(X.SV.uw(u,2))}</span>`:P.bal&&r.t>1e-9?`<small class="c3-bad">décochée : perd sa part (${esc(X.SV.qn(r.t,u))})</small>`:''}</div>`;}
const mSum=(P,u)=>P.ok?`<b style="color:#15803d">✓ ${fq(P.sum)} / ${fq(P.total)} ${esc(X.SV.uw(u,P.total))}</b>`:P.bad?'<b class="c3-bad">une quantité est illisible</b>':!P.ch.length?'<b class="c3-bad">coche au moins une ligne</b>':`réparti ${fq(r3(P.sum))} / ${fq(P.total)} — <b class="c3-bad">${P.total-P.sum>0?'il manque '+fq(r3(P.total-P.sum)):fq(r3(P.sum-P.total))+' de trop'}</b>${P.zeroW?' <span class="dim">(clé sans poids pour ces lignes : tape les quantités, ou change de clé)</span>':''}`;
/* l'aperçu des PU avec les cases et les quantités telles qu'elles sont (rien n'est écrit) */
function mPv(a,CP,M,it,P){if(!P.ok)return '<div class="c3-pu dim">Aperçu des PU : dès que la somme est juste</div>';const lines={};P.ch.forEach(r=>{lines[r.v]=r3(r.qv);});const R=X.SV.run(a,CP,M,[{it,act:P.bal?'rebal':'multi',arg:{lines}}]);return R.msg.length?`<div class="c3-pu dim">${esc(R.msg.join(' ; '))}</div>`:X.SV.puHTML(R.chg);}
const mGo=P=>(P.bal?'Refaire la balance sur ':'Mettre sur ')+(P.ch.length>1?'ces '+P.ch.length+' lignes':'cette ligne');
export function multiHTML(a,CP,M,it,lab){const S=ST.multi[a.num];if(!S||S.k!==it.k||!M||!CP)return '';const P=mPlan(a,CP,M,it,S);const u=it.c?it.c.u:'';const F=words(S.f);
  const keys=[['pro','au prorata de ce qu\'elles ont déjà'],['ml','au ml'],['eq','à parts égales']].map(([v,t])=>`<label class="dk-mk"><input type="radio" name="dk-mk-${esc(hsh(it.k))}" data-dk="mkey" value="${v}"${P.key===v?' checked':''}> ${t}</label>`).join('');
  const othF=P.oth.filter(r=>r.on||hit(F,r.lab+' '+r.des));const nOth=P.oth.filter(r=>r.on).length;
  return `<div class="dk-mp" data-k="${esc(it.k)}"><div class="dk-mph">${P.bal?'Refaire la balance : '+esc(X.SV.qn(P.total,u))+' à tenir, sur les lignes cochées':'Mettre '+esc(X.SV.qn(P.total,u))+' en plus sur les lignes cochées'}</div>
    <div class="dk-mks" role="radiogroup" aria-label="Clé de répartition"><span>Clé :</span>${keys}</div>
    <div class="dk-mls">${P.rows.map(r=>mRow(P,r,u)).join('')||'<div class="dim">Aucune ligne ne porte encore ce poste.</div>'}</div>
    ${P.oth.length?`<details class="dk-moth" data-dkd="moth"${S.oth||nOth?' open':''}><summary>Autres lignes du DPGF · ${P.oth.length}${nOth?' · '+nOth+' cochée'+(nOth>1?'s':''):''}</summary>${P.oth.length>12?`<input class="f dk-mf" data-dk="mf" type="search" value="${esc(S.f)}" placeholder="Chercher une ligne : n° ou désignation" aria-label="Chercher une ligne du DPGF">`:''}<div class="dk-mls">${othF.map(r=>mRow(P,r,u)).join('')||'<div class="dim">Aucune ligne ne correspond.</div>'}</div></details>`:''}
    <div class="dk-msum" data-dk="msum">${mSum(P,u)}</div><div class="dk-mpv" data-dk="mpv">${mPv(a,CP,M,it,P)}</div><button class="btn sm primary" data-act="af" data-v="dxdkmultigo|${enc(it.k)}"${P.ok?'':' disabled'}>${mGo(P)}</button></div>`;}
const curItem=(a,M,CP,k)=>(X.SV.itemsOf(a,CP,M)||[]).find(x=>x.k===k)||null;
function refreshMulti(num,soft){const S=ST.multi[num];const a=X.affOf(num);const M=a&&X.modelOf(a);const CP=a&&X.compsOf(a);if(!S||!M||!CP||!docOK())return;const box=[...document.querySelectorAll('#c3-dlg .dk-mp')].find(x=>x.dataset.k===S.k);if(!box)return;const it=curItem(a,M,CP,S.k);if(!it)return;
  if(soft){const P=mPlan(a,CP,M,it,S);const ae=document.activeElement;P.ch.forEach(r=>{const i=[...box.querySelectorAll('[data-dk="mq"]')].find(x=>x.dataset.v===r.v);if(i&&i!==ae)i.value=r.qt;});const s=box.querySelector('[data-dk="msum"]');if(s)s.innerHTML=mSum(P,it.c?it.c.u:'');const pv=box.querySelector('[data-dk="mpv"]');if(pv)pv.innerHTML=mPv(a,CP,M,it,P);
    const b=box.querySelector('[data-v^="dxdkmultigo|"]');if(b){b.disabled=!P.ok;b.textContent=mGo(P);}return;}
  const ae=document.activeElement;const fk=ae&&box.contains(ae)&&ae.dataset?[ae.dataset.dk,ae.dataset.v||'',ae.selectionStart]:null;const t=document.createElement('div');t.innerHTML=multiHTML(a,CP,M,it,null);const n=t.firstElementChild;if(n)box.replaceWith(n);
  if(fk&&fk[0]&&n){const g=[...n.querySelectorAll(`[data-dk="${fk[0]}"]`)].find(x=>(x.dataset.v||'')===fk[1]);if(g)try{g.focus({preventScroll:true});if(fk[2]!==null&&fk[2]!==undefined&&g.setSelectionRange)g.setSelectionRange(fk[2],fk[2]);}catch(e){}}}
function applyMulti(a,M,key){const num=a.num;const S=ST.multi[num];const CP=X.compsOf(a);if(!S||!CP||S.k!==key)return;const it=curItem(a,M,CP,key);if(!it){X.say('Ce changement est déjà traité');delete ST.multi[num];X.rerender();return;}
  const P=mPlan(a,CP,M,it,S);if(!P.ok){X.say('La somme des quantités doit faire '+fq(P.total));return;}const lines={};P.ch.forEach(r=>{lines[r.v]=r3(r.qv);});
  const R=X.SV.run(a,CP,M,[{it,act:P.bal?'rebal':'multi',arg:{lines}}]);if(R.msg.length){X.say('Rien d\'écrit : '+R.msg.join(' ; '));return;}X.SV.keepScroll();X.dxWrite(a,R.vals,{liens:()=>R.W,sv:R.sv});X.XS.calc[num]=null;delete ST.multi[num];
  const m=X.SV.moved(R.chg);X.SV.flash(m.filter(x=>x.neu!==null).map(x=>x.id));const a2=X.affOf(num);const M2=a2&&X.modelOf(a2);const CP2=a2&&X.compsOf(a2);if(M2&&CP2&&!X.SV.itemsOf(a2,CP2,M2).length)X.SV.act('dxc3close','','',a2,true,M2);
  const labs=P.ch.slice().sort((x,y)=>x.row-y.row).map(r=>r.lab);X.say('✓ '+(P.bal?'Balance refaite':'Mis')+' sur '+P.ch.length+' ligne'+(P.ch.length>1?'s':'')+' ('+labs.slice(0,6).join(', ')+(labs.length>6?'…':'')+')'+(m.length?' — '+m.length+' PU réécrit'+(m.length>1?'s':'')+', surligné'+(m.length>1?'s':'')+' dans la grille':'')+' · ↶ pour revenir');X.rerender();}
/* ═════════ 5 · LE RÉCAP (lecture seule) ═════════ */
const rcSt=num=>ST.rc[num]||(ST.rc[num]={open:false,tab:'poste',f:'',all:false,op:new Set(),cl:new Set(),st:0});
export const barBtn=a=>`<button class="btn sm dk-rbtn" data-act="af" data-v="dxdkrecap|" title="Le récap, en lecture seule : où sont noyés les postes du chiffrage, de quoi est fait chaque PU, les répartitions, ce qui reste à vérifier (imprimable)">🔎 Récap</button>`;
export const menuBtn=a=>`<button class="btn sm" data-act="af" data-v="dxdkrecap|" title="Le récap, en lecture seule">🔎 Récap : postes, lignes, répartitions</button>`;
const orig=(x,reps)=>x.rep?{t:'rep',nom:(reps.get(x.rep)||{}).nom||'répartition'}:x.via==='part'?{t:'part',at:x.at}:x.via==='bal'?{t:'bal',at:x.at}:x.sub?{t:'sub',sub:x.sub}:{t:'saisie'};
const orTxt=o=>o.t==='rep'?'répartition « '+o.nom+' »':o.t==='part'?'part donnée'+(o.at?' le '+dFR(o.at):''):o.t==='bal'?'balance du '+(dFR(o.at)||'…'):o.t==='sub'?'saisi au calculateur ('+X.CL.typeLab(o.sub)+')':'saisi au calculateur';
const orLine=(or,e)=>{const g=new Map();or.forEach(o=>{const t=orTxt(o);g.set(t,(g.get(t)||0)+o.e);});return g.size===1?esc([...g.keys()][0]):[...g].map(([t,v])=>esc(t)+' '+eur(v)).join(' + ');};
/* toutes les lectures du récap : par composante, par lien (mêmes calculs que la ventilation : quantité × PU de vente ; pointé = les cases zone × poste du chiffrage) */
function dataOf(a,M,CP){const G=G0(a,M,CP);const P=X.pointage(a,CP,M);const reps=new Map((G.D.reps||[]).map(r=>[r.id,r]));const byK=new Map(),byL=new Map();
  G.liens.forEach(L=>{const XL=X.linkNow(L,CP,M);const lo={L,XL,l:G.lineOf.get(L.id)||null,it:new Map(),miss:0};byL.set(L.id,lo);
    (L.comps||[]).forEach(x=>{const c=CP.by.get(x.k);const q=+x.q||0;if(!c){lo.miss++;return;}if(!(q>0))return;const e=q*c.puV;const o=Object.assign({q,e},orig(x,reps));
      let t=lo.it.get(c.k);if(!t)lo.it.set(c.k,t={c,q:0,e:0,or:[]});t.q+=q;t.e+=e;t.or.push(o);let K=byK.get(c.k);if(!K)byK.set(c.k,K=new Map());let kl=K.get(L.id);if(!kl)K.set(L.id,kl={L,q:0,e:0,or:[]});kl.q+=q;kl.e+=e;kl.or.push(o);});});
  const cells=new Set(CP.list.map(c=>(c.z<0?'inst':'z'+c.z)+'|'+c.p));let pt=0;P.byCell.forEach((Lc,kk)=>{if(cells.has(kk))Lc.forEach(x=>{pt+=x.amt;});});
  const ord=new Map();X.SV.calcGroups(CP).forEach((g,gi)=>g.list.forEach((c,i)=>{if(!ord.has(c.k))ord.set(c.k,gi*1e4+i);}));return {G,P,byK,byL,reps,pt,V:CP.C.vente||0,ord};}
const isOp=(S,id)=>S.all?!S.cl.has(id):S.op.has(id);
/* un élément dépliable : l'en-tête (bouton), un bouton à côté (aller à la ligne), le contenu dessiné seulement s'il est ouvert ; à l'impression tout est ouvert, sans bouton */
function fold(S,id,head,extra,body,pr,force,attrs){const o=pr||force||isOp(S,id);return `<div class="dk-it${o?' open':''}"${attrs||''}><div class="dk-hrow">${pr?`<div class="dk-hdr">${head}</div>`:`<button type="button" class="dk-hdr" data-act="af" data-v="dxdktg|${enc(id)}" aria-expanded="${o?'true':'false'}"><span class="dk-ar" aria-hidden="true">${o?'▾':'▸'}</span>${head}</button>${extra||''}`}</div>${o?`<div class="dk-bd">${body()}</div>`:''}</div>`;}
const goBtn=(l,pr)=>pr||!l?'':`<button type="button" class="btn sm dk-go" data-act="af" data-v="dxdkgo|${l.row}" title="Aller à cette ligne dans la grille : le calculateur s'ouvre dessus" aria-label="${esc('Ouvrir la ligne '+(l.n||l.a)+' dans la grille et le calculateur')}">🧮 Ouvrir</button>`;
const lnTxt=(lo)=>lo&&lo.l?(lo.l.n+' '+lo.l.des):(lo?lo.L.a:'');
/* une ligne du DPGF dans le récap : un bouton (la grille, le calculateur) ; à l'impression, du texte */
const lnTag=(lo,inner,pr,e)=>{const l=lo&&lo.l;const d=e!==undefined?` data-e="${r2(e)}"`:'';if(pr||!l)return `<div class="dk-ln"${d}>${inner}</div>`;return `<button type="button" class="dk-ln" data-act="af" data-v="dxdkgo|${l.row}" data-row="${l.row}"${d} title="Aller à cette ligne dans la grille : le calculateur s'ouvre dessus">${inner}</button>`;};
const zTag=(CP,c)=>`<span class="dk-zt">${esc(zNom(CP,c.z))}</span>`;
/* le contenu d'un panier de prestation (chiffrage de la zone : MO, fournitures, sous-traitance) */
function panier(CP,c){if(c.p!=='paniers'||c.z<0)return '';const e=(CP.C&&CP.C.etudes||[])[c.z];const ps=(e&&e.z&&e.z.paniers)||[];const m=/\|r(\d+)$/.exec(c.ok||'');const p=m?ps[+m[1]]:ps.find(x=>(x.nom||'Panier')===c.lab);if(!p||!(p.items||[]).length)return '';
  const t=p.items.map(it=>it.kind==='mo'?'MO '+fq(+it.h||0)+' '+(it.unit==='j'?'j':'h')+(it.eq?' ('+it.eq+')':''):it.kind==='st'?(it.label||'sous-traitance')+' '+eur(+it.montant||0):(it.label||'fourniture')+(+it.qty>0?' × '+fq(+it.qty):'')).join(' · ');return `<div class="dk-pan">Contenu du panier${+p.qty>1?' (pour 1 sur '+fq(+p.qty)+')':''} : ${esc(t)}</div>`;}
/* ── onglet « Par poste du chiffrage » : où chaque composante est noyée, ligne par ligne, et comment ── */
function tabPoste(a,M,CP,R,S,pr){const F=words(S.f);let out='';
  X.SV.calcGroups(CP).forEach(g=>{const items=[];let gV=0,gP=0;
    g.list.forEach(c=>{const K=R.byK.get(c.k);const ls=K?[...K.values()].map(kl=>({kl,lo:R.byL.get(kl.L.id)})).sort((x,y)=>((x.lo.l||{}).row||9e9)-((y.lo.l||{}).row||9e9)):[];const ptQ=R.P.byComp.get(c.k)||0;const ptE=ptQ*c.puV;gV+=c.amtV;gP+=ptE;
      const nm=X.compName(c);const own=hit(F,g.nom+' '+zNom(CP,c.z)+' '+nm+' '+c.u);const lsF=own?ls:ls.filter(x=>hit(F,lnTxt(x.lo)));if(!own&&!lsF.length)return;
      const pc=c.qty>0?ptQ/c.qty*100:0;const rest=c.amtV-ptE;const over=ptQ>c.qty+Math.max(0.001,c.qty*1e-7);
      const sm=ls.slice(0,4).map(x=>esc(R.G.lab(x.kl.L))+' ('+eur(x.kl.e)+' · '+pct(c.qty>0?x.kl.q/c.qty*100:0)+')').join(', ')+(ls.length>4?' +'+(ls.length-4):'');
      const head=`<span class="dk-nm">${zTag(CP,c)} ${esc(nm)}<small class="dk-sm">${ls.length?'→ '+sm:'pas encore pointé'}</small></span> <span class="dk-q">${esc(X.SV.qn(c.qty,c.u))}</span> <span class="dk-e">${eur(c.amtV)}</span> <span class="dk-p${over?' over':''}"><span class="dk-bar${over?' over':''}"><i style="width:${Math.min(100,Math.max(0,pc)).toFixed(1)}%"></i></span>pointé ${pct(pc)}</span> <span class="dk-r">${Math.abs(rest)<1?'✓ placé':rest>0?'reste '+eur(rest):'<b class="c3-bad">⚠ +'+eur(-rest)+'</b>'}</span>`;
      const body=()=>(lsF.length?lsF.map(x=>lnTag(x.lo,`<b class="dk-n">${esc(R.G.lab(x.kl.L))}</b> <span class="dk-des">${esc(x.lo.l?String(x.lo.l.des).slice(0,80):(x.kl.L.sh+'!'+x.kl.L.a))}</span> <span class="dk-lq">${esc(X.SV.qn(x.kl.q,c.u))}</span> <span class="dk-le">${eur(x.kl.e,2)}</span> <span class="dk-lp">${pct(c.qty>0?x.kl.q/c.qty*100:0)} du poste</span> <span class="dk-or">${orLine(x.kl.or)}</span>`,pr,x.kl.e)).join(''):`<div class="dim dk-none">Pointé nulle part : ${eur(c.amtV)} à placer.</div>`)+panier(CP,c)+(X.ZN?X.ZN.rcPoste(a,M,CP,c):''); /* 17/10 (lot DZ) : une installation commune, zone par zone */
      items.push(fold(S,'c:'+c.k,head,'',body,pr,F.length>0&&!own,` data-k="${esc(c.k)}" data-p="${esc(c.p)}" data-amt="${r2(c.amtV)}" data-pt="${r2(ptE)}"`));});
    if(items.length)out+=`<section class="dk-g"><h4 class="dk-gh">${esc(g.nom)} <span class="hint">· ${eur(gV)} · pointé ${pct(gV>0?gP/gV*100:0)}</span></h4>${items.join('')}</section>`;});
  return out||'<div class="eq-s">Rien ne correspond à la recherche.</div>';}
/* ── onglet « Par ligne du DPGF » : de quoi est fait le PU (propre à la ligne / noyé) ── */
function tabLigne(a,M,CP,R,S,pr){const F=words(S.f);const G=R.G;let out='';const nH=k=>nHold(G,k);
  const noye=c=>!cdn(c)&&(nH(c.k)>=2||X.SV.isInst(c)); /* noyé : les installations, et les postes communs (épreuve, base vie… : sans DN) répartis sur plusieurs lignes */
  const ls=G.lines.filter(l=>l.pu>0||l.L);const others=G.liens.filter(L=>!G.lineOf.has(L.id));
  ls.forEach(l=>{const lo=l.L?R.byL.get(l.L.id):null;const its=lo?[...lo.it.values()].sort((x,y)=>(R.ord.has(x.c.k)?R.ord.get(x.c.k):9e9)-(R.ord.has(y.c.k)?R.ord.get(y.c.k):9e9)):[];
    const own=hit(F,l.n+' '+l.des+' '+l.u);const sub=own?its:its.filter(t=>hit(F,zNom(CP,t.c.z)+' '+X.compName(t.c)));if(!own&&!sub.length)return;
    const XL=lo?lo.XL:null;const amt=l.pu*l.q;const stale=XL&&XL.stale;const nE=its.filter(t=>noye(t.c)).reduce((s,t)=>s+t.e,0);
    const head=`<span class="dk-nm"><b class="dk-n">${esc(l.n||l.a)}</b> ${esc(String(l.des).slice(0,90))}${lo?`<small class="dk-sm">${its.length} composante${its.length>1?'s':''}${XL&&XL.amt>0?' · noyé '+pct(nE/XL.amt*100)+' du PU':''}</small>`:''}</span> <span class="dk-q">${fq(l.q)} ${esc(l.u)}</span> <span class="dk-e">× ${nb(l.pu,2)} €</span> <span class="dk-r">= ${eur(amt)}</span>${stale?`<span class="eq-tag warn" title="Le chiffrage a changé : le prix calculé n'est plus celui du DPGF">↻ le calcul donne ${nb(XL.pur,2)} €</span>`:''}${lo?'':'<span class="dk-tag">PU saisi, sans calcul</span>'}`;
    const body=()=>{if(!lo)return `<div class="dim dk-none">PU saisi à la main, sans calcul : la ligne n'est pas reliée à notre chiffrage. ${pr?'':'« 🧮 Ouvrir » : le calculateur s\'ouvre dessus, pour la relier.'}</div>`;const q=XL.q>0?XL.q:l.q;const T=XL.amt||0;const uL=l.u||'u';
      const row=t=>`<div class="dk-cr"><span class="dk-cn">${X.ZN&&t.c.z<0&&X.ZN.on(CP)?X.ZN.rcZTag(CP,lo.L,t.c,l.des) /* (lot DZ) la zone de la part */:zTag(CP,t.c)} ${esc(X.compName(t.c))}</span> <span class="dk-cq">${esc(X.SV.qn(t.q,t.c.u))}</span> <span class="dk-ce">${eur(t.e,2)}</span> <span class="dk-cu">${q>0?nb(t.e/q,2)+' € / '+esc(uL):''}</span> <span class="dk-cp">${T>0?pct(t.e/T*100)+' du PU':''}</span> <span class="dk-or">${orLine(t.or)}</span>${panier(CP,t.c)}</div>`;
      const P1=sub.filter(t=>!noye(t.c)),P2=sub.filter(t=>noye(t.c));const s1=P1.reduce((s,t)=>s+t.e,0),s2=P2.reduce((s,t)=>s+t.e,0);const sI=P2.filter(t=>X.SV.isInst(t.c)).reduce((s,t)=>s+t.e,0);
      const tot=(lbl,s,x)=>`<div class="dk-st"><b>${lbl}</b> : ${eur(s,2)}${q>0?' · '+nb(s/q,2)+' € / '+esc(uL):''}${T>0?' · '+pct(s/T*100)+' du PU':''}${x||''}</div>`;
      return (P1.length?`<div class="dk-sec">${P1.map(row).join('')}${tot('Propre à la ligne',s1)}</div>`:'')+(P2.length?`<div class="dk-sec dk-noye">${P2.map(row).join('')}${tot('Noyé (postes répartis, installations)',s2,sI>0.005&&q>0?' · <b>dont '+nb(sI/q,2)+' € / '+esc(uL)+' d\'installations</b>':'')}</div>`:'')
        +(lo.miss?`<div class="c3-bad dk-none">${lo.miss} composante${lo.miss>1?'s':''} n'existe${lo.miss>1?'nt':''} plus dans le chiffrage (comptée${lo.miss>1?'s':''} 0 €)</div>`:'')+`<div class="dk-st dk-pu">PU calculé : ${eur(T,2)} ÷ ${fq(q)} ${esc(uL)} = <b>${nb(XL.pur,2)} €</b>${stale?' <span class="c3-bad">(dans le DPGF : '+(XL.cell===null?'vide':nb(XL.cell,2)+' €')+')</span>':''}</div>`;};
    out+=fold(S,'l:'+l.row,head,goBtn(l,pr),body,pr,F.length>0&&!own,` data-row="${l.row}" data-pu="${r2(l.pu)}"${lo?` data-amt="${r2(lo.XL.amt)}"`:''}`);});
  others.forEach(L=>{const lo=R.byL.get(L.id);if(!lo)return;if(!hit(F,L.sh+' '+L.a))return;const its=[...lo.it.values()];out+=fold(S,'x:'+L.id,`<span class="dk-nm"><b class="dk-n">${esc(L.a)}</b> cellule ${esc(L.sh)}<small class="dk-sm">hors des lignes du DPGF</small></span> <span class="dk-e">${nb(lo.XL.pur,2)} €</span>`,'',()=>its.map(t=>`<div class="dk-cr"><span class="dk-cn">${zTag(CP,t.c)} ${esc(X.compName(t.c))}</span> <span class="dk-cq">${esc(X.SV.qn(t.q,t.c.u))}</span> <span class="dk-ce">${eur(t.e,2)}</span> <span class="dk-or">${orLine(t.or)}</span></div>`).join(''),pr,false,'');});
  return out||'<div class="eq-s">'+(F.length?'Rien ne correspond à la recherche.':'Aucune ligne du DPGF n\'a de prix pour l\'instant.')+'</div>';}
/* ── onglet « Répartitions » : chaque répartition (« ⇶ Mettre le reste au ml », « ⇶ Répartir au ml ») et les parts données ── */
function repsOf(R){const out=[];(R.G.D.reps||[]).forEach(r=>{const L=new Map(),K=new Map();let e=0;
    R.G.liens.forEach(Lk=>(Lk.comps||[]).forEach(x=>{if(x.rep!==r.id)return;const c=R.CP.by.get(x.k);if(!c)return;const v=(+x.q||0)*c.puV;e+=v;L.set(Lk.id,(L.get(Lk.id)||0)+v);const o=K.get(c.k)||{c,q:0,e:0};o.q+=+x.q||0;o.e+=v;K.set(c.k,o);}));
    out.push({id:'r:'+r.id,t:'rep',r,nom:r.nom||'Répartition',mode:r.mode==='grp'?'groupe de lignes':'par DN',at:r.at,by:r.by,L,K,e});});
  const P=new Map();R.G.liens.forEach(Lk=>(Lk.comps||[]).forEach(x=>{if(x.via!=='part')return;const c=R.CP.by.get(x.k);if(!c)return;const id=x.pid||('?'+Lk.id);let p=P.get(id);if(!p)P.set(id,p={id:'p:'+id,t:'part',Lk,at:x.at,K:new Map(),e:0});const v=(+x.q||0)*c.puV;p.e+=v;const o=p.K.get(c.k)||{c,q:0,e:0};o.q+=+x.q||0;o.e+=v;p.K.set(c.k,o);}));
  return out.concat([...P.values()]);}
function tabRep(a,M,CP,R,S,pr){const F=words(S.f);const G=R.G;const L=repsOf(R);let out='';
  L.forEach(x=>{const lines=x.t==='rep'?[...x.L.keys()].map(id=>R.byL.get(id)).filter(Boolean).sort((p,q)=>((p.l||{}).row||9e9)-((q.l||{}).row||9e9)):[R.byL.get(x.Lk.id)].filter(Boolean);const ks=[...x.K.values()].sort((p,q)=>(R.ord.get(p.c.k)||0)-(R.ord.get(q.c.k)||0));
    const txt=(x.t==='rep'?x.nom:'part donnée')+' '+lines.map(lnTxt).join(' ')+' '+ks.map(o=>zNom(CP,o.c.z)+' '+X.compName(o.c)).join(' ');if(!hit(F,txt))return;
    const ln=x.t==='part'?lines[0]:null;
    const head=x.t==='rep'?`<span class="dk-nm">⇶ ${esc(x.nom)}<small class="dk-sm">${esc(x.mode)} · ${lines.length} ligne${lines.length>1?'s':''} (${esc(lines.slice(0,6).map(lo=>G.lab(lo.L)).join(', ')+(lines.length>6?'…':''))}) · ${ks.length} composante${ks.length>1?'s':''}</small></span> <span class="dk-e">${eur(x.e)}</span> <span class="dk-r">${esc(dFR(x.at))}${x.by?' · '+esc(x.by):''}</span>`
      :`<span class="dk-nm">⇶ Part donnée à la ligne ${esc(ln?G.lab(ln.L):'?')}<small class="dk-sm">${ln&&ln.l?esc(String(ln.l.des).slice(0,70))+' · ':''}${ks.length} poste${ks.length>1?'s':''} reçu${ks.length>1?'s':''}, repris au prorata sur les lignes qui les portaient</small></span> <span class="dk-e">${eur(x.e)}</span> <span class="dk-r">${esc(dFR(x.at))}</span>`;
    const body=()=>`${x.t==='rep'?`<div class="dk-sub">Lignes</div>${lines.map(lo=>lnTag(lo,`<b class="dk-n">${esc(G.lab(lo.L))}</b> <span class="dk-des">${esc(lo.l?String(lo.l.des).slice(0,80):lo.L.a)}</span> <span class="dk-le">${eur(x.L.get(lo.L.id)||0,2)}</span>`,pr)).join('')}`:''}<div class="dk-sub">Composantes</div>${ks.map(o=>`<div class="dk-cr"><span class="dk-cn">${zTag(CP,o.c)} ${esc(X.compName(o.c))}</span> <span class="dk-cq">${esc(X.SV.qn(o.q,o.c.u))}</span> <span class="dk-ce">${eur(o.e,2)}</span></div>`).join('')}`;
    out+=fold(S,x.id,head,x.t==='part'&&ln&&ln.l?goBtn(ln.l,pr):'',body,pr,false,` data-rep="${esc(x.id)}" data-e="${r2(x.e)}"`);});
  return out||'<div class="eq-s">'+(F.length?'Rien ne correspond à la recherche.':'Aucune répartition ni part donnée pour l\'instant.')+'</div>';}
/* ── onglet « À vérifier » ── */
function chkOf(a,M,CP,R){const G=R.G;const rests=[],overs=[];CP.list.forEach(c=>{const ptQ=R.P.byComp.get(c.k)||0;const e=c.amtV-ptQ*c.puV;const t=Math.max(0.001,c.qty*1e-7);if(ptQ>c.qty+t)overs.push({c,ptQ});else if(e>=1&&c.qty-ptQ>t)rests.push({c,ptQ,e});});
  const ok=((G.D.suivi||{}).ok)||{};const sp=sansPart(G,CP).map(s=>Object.assign(s,{done:ok['part:'+s.l.L.id]===sigOf(s)}));const man=G.lines.filter(l=>l.pu>0&&!l.L);
  let nC3=0;try{nC3=X.SV.itemsOf(a,CP,M).filter(x=>x.kind!=='part'&&!x.solo).length;}catch(e){nC3=0;}const nSt=G.liens.filter(L=>R.byL.get(L.id).XL.stale).length;
  const sk=(x,y)=>(R.ord.has(x.c.k)?R.ord.get(x.c.k):9e9)-(R.ord.has(y.c.k)?R.ord.get(y.c.k):9e9);rests.sort(sk);overs.sort(sk);return {rests,overs,sp,man,nC3,nSt,n:rests.length+overs.length+sp.length+man.length+(nC3||nSt?1:0)+(X.ZN?X.ZN.nChk(a,M,CP):0)};} /* (lot DZ) + les zones sur- ou sous-pointées en installations */
function tabChk(a,M,CP,R,S,pr,ro){const F=words(S.f);const K=chkOf(a,M,CP,R);const G=R.G;let out='';const sec=(t,h,n)=>n?`<section class="dk-g"><h4 class="dk-gh">${t} <span class="hint">· ${n}</span></h4>${h}</section>`:'';
  const r1=K.rests.filter(x=>hit(F,zNom(CP,x.c.z)+' '+X.compName(x.c))).map(x=>`<div class="dk-cr"><span class="dk-cn">${zTag(CP,x.c)} ${esc(X.compName(x.c))}</span> <span class="dk-cq">pointé ${fq(x.ptQ)} / ${esc(X.SV.qn(x.c.qty,x.c.u))}</span> <span class="dk-ce">reste <b>${eur(x.e)}</b></span> <span class="dk-cp">${pct(x.c.amtV>0?x.e/x.c.amtV*100:0)}</span></div>`);
  out+=sec('Reste à placer, par poste',r1.join('')+(r1.length&&!pr?'<div class="hint dk-hint">Pour le placer : touche une ligne du DPGF et coche ce poste au calculateur, ou « ⇶ Mettre le reste au ml ».</div>':''),r1.length);
  const r2_=K.overs.filter(x=>hit(F,zNom(CP,x.c.z)+' '+X.compName(x.c))).map(x=>`<div class="dk-cr"><span class="dk-cn">${zTag(CP,x.c)} ${esc(X.compName(x.c))}</span> <span class="dk-cq">pointé ${fq(x.ptQ)} pour ${esc(X.SV.qn(x.c.qty,x.c.u))}</span> <span class="dk-ce c3-bad">sur-pointé de ${fq(x.ptQ-x.c.qty)}</span></div>`);
  out+=sec('Pointé au-delà du chiffrage',r2_.join(''),r2_.length);
  const r3_=K.sp.filter(s=>hit(F,s.l.n+' '+s.l.des)).map(s=>`<div class="dk-cr dk-spr">${lnTag({l:s.l,L:s.l.L},`<b class="dk-n">${esc(s.l.n||s.l.a)}</b> <span class="dk-des">${esc(String(s.l.des).slice(0,80))}</span> <span class="dk-or">aucune part : ${esc(postNoms(s.R).slice(0,3).join(', '))} (${enOnt(s.nHave,s.peers,CP.zones.length>1)})${s.done?' · marquée « rien à faire »':''}</span>`,pr)}${!ro&&!pr?`<button class="btn sm primary" data-act="af" data-v="dxdkpart|${s.l.row}">⇶ Lui donner sa part</button>`:''}</div>`);
  out+=sec('Lignes au ml sans part des postes répartis',r3_.join(''),r3_.length);
  const r4=K.man.filter(l=>hit(F,l.n+' '+l.des)).map(l=>lnTag({l,L:null},`<b class="dk-n">${esc(l.n||l.a)}</b> <span class="dk-des">${esc(String(l.des).slice(0,80))}</span> <span class="dk-le">${nb(l.pu,2)} € · PU saisi, sans calcul</span>`,pr));
  out+=sec('PU saisis à la main, sans lien',r4.join('')+(r4.length&&!pr?'<div class="hint dk-hint">Touche une ligne : le calculateur s\'ouvre dessus, pour relier son prix à notre chiffrage.</div>':''),r4.length);
  if((K.nC3||K.nSt)&&!F.length)out+=sec('Liens à mettre à jour',`<div class="dk-cr"><span class="dk-cn">${K.nC3?K.nC3+' changement'+(K.nC3>1?'s':'')+' du chiffrage à traiter':''}${K.nC3&&K.nSt?' · ':''}${K.nSt?K.nSt+' prix lié'+(K.nSt>1?'s':'')+' à mettre à jour':''}</span>${!ro&&!pr&&K.nC3?'<button class="btn sm primary" data-act="af" data-v="dxdkc3|">Voir la liste des changements</button>':''}</div>`,1);
  if(X.ZN&&!F.length)out+=X.ZN.rcChk(a,M,CP,pr,ro,sec); /* 17/10 (lot DZ) */
  return out||`<div class="eq-s">${F.length?'Rien ne correspond à la recherche.':'<b style="color:#15803d">✓ Rien à vérifier</b> : tout est placé, rien de sur-pointé, chaque ligne a sa part.'}</div>`;}
function bodyOf(a,M,CP,R,S,pr,ro){return S.tab==='ligne'?tabLigne(a,M,CP,R,S,pr):S.tab==='rep'?tabRep(a,M,CP,R,S,pr):S.tab==='chk'?tabChk(a,M,CP,R,S,pr,ro):tabPoste(a,M,CP,R,S,pr);}
const sumHTML=R=>{const rest=R.V-R.pt;const nL=R.G.liens.length;return `<div class="dk-sum"><span>Notre prix <b>${eur(R.V)}</b></span> <span>pointé <b>${eur(R.pt)}</b> (${pct(R.V>0?R.pt/R.V*100:0)})</span> <span>${Math.abs(rest)<1?'<b style="color:#15803d">✓ tout est placé</b>':rest>0?'reste à placer <b>'+eur(rest)+'</b>':'<b class="c3-bad">⚠ pointé au-delà de '+eur(-rest)+'</b>'}</span> <span><b>${nL}</b> ligne${nL>1?'s':''} du DPGF liée${nL>1?'s':''}</span></div>`;};
const TABS=[['poste','Par poste du chiffrage'],['ligne','Par ligne du DPGF'],['rep','Répartitions'],['chk','À vérifier']];
function recapHTML(a,M,canEdit){const num=a.num;const S=rcSt(num);const CP=X.compsOf(a);const ro=!canEdit||!!a._vview;X.REP.css(document);X.SV.css(document);
  const hd=`<div class="rp-hd"><h3>🔎 Récap du DPGF <span class="hint">· lecture seule${a._vview?' · version v'+esc(a._vview.v):''}</span></h3><button class="btn sm" data-act="af" data-v="dxdkclose|" aria-label="Fermer le récap">✕</button></div>`;
  const wrap=h=>`<div class="rp-ov dk-ov" id="dk-ov"><div class="rp-dlg dk-dlg" id="dk-dlg" role="dialog" aria-modal="true" aria-label="Récap du DPGF">${h}</div></div>`;
  if(!CP)return wrap(hd+'<div class="rp-body"><div class="eq-s">Pas encore de chiffrage complet (zones, postes) : le récap s\'appuie sur le chiffrage (étape 4).</div></div>');
  const R=dataOf(a,M,CP);R.CP=CP;const nRep=repsOf(R).length;const nChk=chkOf(a,M,CP,R).n;
  const tabs=`<div class="dk-tabs" role="tablist">${TABS.map(([k,t])=>`<button class="btn sm${S.tab===k?' on':''}" role="tab" aria-selected="${S.tab===k?'true':'false'}" data-act="af" data-v="dxdktab|${k}">${esc(t)}${k==='rep'&&nRep?' · '+nRep:''}${k==='chk'?nChk?' · '+nChk:' ✓':''}</button>`).join('')}</div>`;
  const tools=`<div class="dk-tools"><input class="f dk-f" data-dk="rf" type="search" value="${esc(S.f)}" placeholder="Chercher : poste, zone, DN, n° ou nom de ligne" aria-label="Chercher dans le récap"><button class="btn sm" data-act="af" data-v="dxdkall|1">Tout déplier</button><button class="btn sm" data-act="af" data-v="dxdkall|0">Tout replier</button><button class="btn sm" data-act="af" data-v="dxdkprint|" title="Imprimer cet onglet, tout déplié (A4)">🖨 Imprimer</button></div>`;
  if(docOK()&&S.st)setTimeout(()=>{const b=document.getElementById('dk-body');if(b&&S.st){b.scrollTop=S.st;S.st=0;}},0);
  return wrap(hd+`<div class="dk-top">${sumHTML(R)}${tabs}${tools}</div><div class="rp-body dk-body" id="dk-body">${bodyOf(a,M,CP,R,S,false,ro)}</div>`);}
/* le récap redessiné seul (onglet, plis, recherche) : la version consultée reste celle qu'on lit */
function refreshRecap(num,keepSc){const el=docOK()&&document.getElementById('dk-ov');const a=X.affOf(num);const M=a&&X.modelOf(a);if(!el||!M)return;const b=document.getElementById('dk-body');const st=keepSc&&b?b.scrollTop:0;
  const ae=document.activeElement;const fo=ae&&ae.dataset&&ae.dataset.dk==='rf'?ae.selectionStart:null;const fv=ae&&el.contains(ae)&&ae.dataset&&ae.dataset.v?ae.dataset.v:null;const t=document.createElement('div');t.innerHTML=recapHTML(a,M,X.XS.canEdit);const n=t.firstElementChild;if(n)el.replaceWith(n);
  const b2=document.getElementById('dk-body');if(b2)b2.scrollTop=st;if(fo!==null){const f=document.querySelector('#dk-dlg [data-dk="rf"]');if(f)try{f.focus({preventScroll:true});f.setSelectionRange(fo,fo);}catch(e){}}
  else if(fv){const g=[...document.querySelectorAll('#dk-dlg [data-v]')].find(x=>x.dataset.v===fv);if(g)try{g.focus({preventScroll:true});}catch(e){}} /* le clavier reste sur l'en-tête déplié, l'onglet choisi */}
function closeRecap(num){const S=rcSt(num);S.open=false;const o=docOK()&&document.getElementById('dk-ov');if(o)o.remove();const p=docOK()&&document.getElementById('dk-print');if(p)p.remove();}
const keep=num=>{const b=docOK()&&document.getElementById('dk-body');if(b)rcSt(num).st=b.scrollTop;try{X.SV.keepScroll();}catch(e){}};
/* impression : l'onglet affiché, tout déplié, sans boutons, A4 portrait (un bloc à part dans la page, seul imprimé) */
function printBuild(num){const a=X.affOf(num);const M=a&&X.modelOf(a);const CP=a&&X.compsOf(a);if(!M||!CP||!docOK())return false;const S=rcSt(num);const R=dataOf(a,M,CP);R.CP=CP;let el=document.getElementById('dk-print');if(!el){el=document.createElement('div');el.id='dk-print';document.body.appendChild(el);}
  const tn=(TABS.find(x=>x[0]===S.tab)||TABS[0])[1].toLowerCase();el.innerHTML=`<h1>Récap du DPGF — ${esc(tn)}</h1><div class="dk-pmeta">${esc(a.num||'')} · ${esc(a.nom||'')}${a.client?' · '+esc(a.client):''} · ${esc((a.dpgf||{}).fichier||'')}${a._vview?' · version v'+esc(a._vview.v):''} · imprimé le ${new Date().toLocaleDateString('fr-FR')}${S.f?' · recherche « '+esc(S.f)+' »':''}</div>${sumHTML(R)}<div class="dk-pbody">${bodyOf(a,M,CP,R,S,true,true)}</div>`;return true;}
/* ═════════ 6 · LE CALCULATEUR : « ⇶ Donner sa part » (un bandeau quand la ligne n'a rien des postes répartis) ═════════ */
export function calcBtn(a,M,CP,t,ro){if(ro||a._vview||!t||!t.line||!CP||!M)return '';let G;try{G=G0(a,M,CP);}catch(e){return '';}const l=G.lines.find(x=>x.row===t.r);if(!l||!(l.q>0))return '';
  const sp=sansPart(G,CP).find(s=>s.l===l);if(sp)return `<div class="dk-cb dk-cbw" role="status"><span>⚠ Cette ligne n'a <b>aucune part des postes répartis</b> (${esc(postNoms(sp.R).slice(0,3).join(', '))}) alors que ${enOnt(sp.nHave,sp.peers,CP.zones.length>1)}.</span><button class="btn sm primary" data-act="af" data-v="dxdkpart|${l.row}" title="Sa part de chaque poste réparti, reprise au prorata sur les lignes qui les portent ; le total ne bouge pas">⇶ Lui donner sa part</button></div>`;
  const P=planPart(a,M,CP,l.row,null);const any=!!P&&P.rows.some(r=>!r.held&&r.Qd>1e-9);
  return any?`<div class="dk-cb"><button class="btn sm" data-act="af" data-v="dxdkpart|${l.row}" title="Les postes répartis sur plusieurs lignes (installations, épreuve…) : cette ligne en reçoit sa part, reprise au prorata sur les lignes qui les portent">⇶ Donner sa part des postes répartis…</button></div>`:'';}
/* ═════════ 7 · ACTIONS (data-v="dxdk…|…", depuis dpgfXlAct) ═════════ */
function goRow(a,M,row){const num=a.num;closeRecap(num);if(!M||!(row>0))return;const D=a.dpgf||{};const S=X.dpSheet(M,D);const c=X.puColOf(D);const XS=X.XS;
  XS.sh[num]=S.name;XS.sel[num]={sh:S.name,r:row,c,r2:row,c2:c};XS.calc[num]=null;if(XS.free&&XS.free.num===num)XS.free=null;X.rerender();
  setTimeout(()=>{const a2=X.affOf(num);const M2=a2&&X.modelOf(a2);const S2=M2&&M2.S(S.name);if(!S2)return;[XS.view,X.popLive()?XS.pview:null].forEach(V=>{if(V&&V.vp&&V.cnt&&V.num===num&&V.doc.contains(V.vp)&&up(V.sh)===up(S2.name))try{X.scrollToCell(V,M2,S2,row,c);}catch(e){console.warn(e);}});
    if(!X.popLive()){const g=document.getElementById('dx-grid');const hb=document.getElementById('homeBody');if(g&&hb){const r=g.getBoundingClientRect(),h=hb.getBoundingClientRect();if(r.top<h.top-2||r.top>h.top+hb.clientHeight*0.45)hb.scrollTop+=r.top-h.top-8;}}
    try{X.REP.open(num);}catch(e){console.warn(e);}},60);}
export function act(k,arg,arg2,a,canEdit,M){const num=a.num;
  switch(k){
    case 'dxdkrecap':{const S=rcSt(num);S.open=true;S.st=0;X.rerender();setTimeout(()=>{const b=document.querySelector('#dk-dlg .rp-hd .btn');if(b)try{b.focus({preventScroll:true});}catch(e){}},40);return true;}
    case 'dxdkclose':closeRecap(num);return true;
    case 'dxdktab':{const S=rcSt(num);S.tab=TABS.some(x=>x[0]===arg)?arg:'poste';refreshRecap(num,false);return true;}
    case 'dxdkall':{const S=rcSt(num);S.all=arg==='1';S.op=new Set();S.cl=new Set();refreshRecap(num,true);return true;}
    case 'dxdktg':{const S=rcSt(num);const id=dec(arg);const T=S.all?S.cl:S.op;if(T.has(id))T.delete(id);else T.add(id);refreshRecap(num,true);return true;}
    case 'dxdkprint':{if(printBuild(num))try{window.print();}catch(e){}return true;}
    case 'dxdkgo':goRow(a,M,+arg);return true;
    case 'dxdkc3':{closeRecap(num);return X.SV.act('dxc3list','','',a,canEdit,M);}
    case 'dxdkpart':{if(!canEdit||a._vview||!M)return true;keep(num);ST.part[num]={row:+arg,on:{},q:{},e:{},dn:{},od:false};X.rerender();setTimeout(()=>{const b=document.querySelector('#dk-pdlg .rp-btns .primary:not([disabled])')||document.querySelector('#dk-pdlg .rp-hd .btn');if(b)try{b.focus({preventScroll:true});}catch(e){}},40);return true;}
    case 'dxdkpartx':closePart(num);return true;
    case 'dxdkpartok':{if(!canEdit||a._vview||!M)return true;applyPart(a,M);return true;}
    case 'dxdkmulti':{if(!canEdit||a._vview||!M)return true;const key=dec(arg);const S=ST.multi[num];if(S&&S.k===key)delete ST.multi[num];else{const CP=X.compsOf(a);const it=CP?curItem(a,M,CP,key):null;if(!it)return true;ST.multi[num]={k:key,on:{},q:{},tch:{},key:null,f:'',oth:false};}
      X.SV.keepScroll();X.rerender();if(ST.multi[num])setTimeout(()=>{const p=[...document.querySelectorAll('#c3-dlg .dk-mp')].find(x=>x.dataset.k===key);if(p)try{p.scrollIntoView({block:'nearest'});}catch(e){}},40);return true;}
    case 'dxdkmultigo':{if(!canEdit||a._vview||!M)return true;applyMulti(a,M,dec(arg));return true;}}
  return false;}
/* la carte : le récap et la fenêtre « Donner sa part » (redessinés avec l'écran : rien ne se perd si l'appli se redessine) */
export function endHTML(a,M,canEdit){if(!docOK()||!M)return '';css(document);wire();let h='';const S=ST.rc[a.num];if(S&&S.open)h+=recapHTML(a,M,canEdit);if(ST.part[a.num]&&canEdit&&!a._vview)h+=partHTML(a,M);return h;}
/* ═════════ 8 · SAISIES, Échap, impression ═════════ */
let WIRED=false;
function wire(){if(WIRED||!docOK())return;WIRED=true;
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.dk||!X)return;const num=X.XS.num;if(!num)return;const d=t.dataset.dk;
    if(d==='rf'){rcSt(num).f=t.value;clearTimeout(wire.t);wire.t=setTimeout(()=>refreshRecap(num,false),180);return;}
    if(d==='pq'||d==='pe'){const S=ST.part[num];if(!S)return;const k=t.dataset.k;if(d==='pq'){S.q[k]=t.value;delete S.e[k];}else{S.e[k]=t.value;const a=X.affOf(num);const CP=a&&X.compsOf(a);const c=CP&&CP.by.get(k);const v=numIn(t.value);S.q[k]=v===null||!c||!(c.puV>0)?'':fin(v/c.puV);}softPart(num);return;}
    if(d==='mq'){const S=ST.multi[num];if(!S)return;S.q[t.dataset.v]=t.value;S.tch[t.dataset.v]=1;refreshMulti(num,true);return;}
    if(d==='mf'){const S=ST.multi[num];if(!S)return;S.f=t.value;clearTimeout(wire.m);wire.m=setTimeout(()=>refreshMulti(num,false),180);return;}});
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.dk||!X)return;const num=X.XS.num;if(!num)return;const d=t.dataset.dk;
    if(d==='pon'){const S=ST.part[num];if(!S)return;S.on[t.dataset.k]=!!t.checked;refreshPart(num);return;}
    if(d==='pdn'){const S=ST.part[num];if(!S)return;S.dn[t.dataset.id]=!!t.checked;S.od=true;S.q={};S.e={};refreshPart(num);return;} /* les donneuses changent : parts recalculées */
    if(d==='mon'){const S=ST.multi[num];if(!S)return;S.on[t.dataset.v]=!!t.checked;S.tch={};S.q={};refreshMulti(num,false);return;} /* les lignes changent : les quantités repartent de la clé */
    if(d==='mkey'){const S=ST.multi[num];if(!S)return;S.key=t.value;S.tch={};S.q={};refreshMulti(num,false);return;}});
  document.addEventListener('toggle',e=>{const el=e.target;if(!el||!el.dataset||!el.dataset.dkd||!X)return;const num=X.XS.num;if(!num)return;if(el.dataset.dkd==='pdn'&&ST.part[num])ST.part[num].od=el.open;if(el.dataset.dkd==='moth'&&ST.multi[num])ST.multi[num].oth=el.open;},true);
  /* Échap : la fenêtre du dessus d'abord (avant la liste du lot C3 et le calculateur) */
  window.addEventListener('keydown',e=>{if(e.key!=='Escape'||!X)return;const num=X.XS.num;if(!num)return;if(ST.part[num]&&document.getElementById('dk-pov')){e.preventDefault();e.stopPropagation();closePart(num);return;}
    const S=ST.rc[num];if(S&&S.open&&document.getElementById('dk-ov')){e.preventDefault();e.stopPropagation();closeRecap(num);}},true);
  window.addEventListener('beforeprint',()=>{const num=X&&X.XS.num;const S=num&&ST.rc[num];if(S&&S.open)printBuild(num);});}
/* ═════════ 9 · CSS (injectée : <style id="css-lot-dk">) ═════════ */
const CSS_DK=`
.rp-ov.dk-ov{z-index:79}.rp-ov.dk-pov{z-index:82}
.rp-dlg.dk-dlg{width:min(1180px,100%)}
.dk-top{display:flex;flex-direction:column;gap:6px;padding:8px 14px;border-bottom:1px solid #e5e7eb;background:#fafaf8}
.dk-sum{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13.5px;color:#1f2937}
.dk-tabs{display:flex;flex-wrap:wrap;gap:4px}.dk-tabs .btn.on{background:#1f3864;color:#fff;border-color:#1f3864;font-weight:700}
.dk-tools{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}.dk-f{flex:1 1 260px;min-width:0;margin:0}
.eq-app .dk-dlg .btn.sm,.eq-app .dk-pdlg .btn.sm{min-height:36px}.eq-app .dk-f{min-height:38px}
.dk-body{background:#fbfbfa}
.dk-g{margin:10px 0 6px}.dk-gh{margin:0 0 4px;font-size:14px;padding:4px 2px}.dk-gh .hint{font-weight:400;margin:0}
.dk-it{border:1px solid #e5e7eb;border-radius:8px;margin:0 0 4px;background:#fff}.dk-it.open{border-color:#cbd5e1}
.dk-hrow{display:flex;align-items:stretch;gap:2px}
.dk-hdr{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;text-align:left;border:0;background:transparent;font:inherit;color:inherit;padding:6px 8px;cursor:pointer;min-height:40px;border-radius:8px}
button.dk-hdr:hover{background:#f6f8f7}.dk-ar{color:#64748b;width:12px;flex:none}
.dk-nm{flex:1 1 260px;min-width:0;font-weight:700;font-size:13.5px}.dk-nm small,.dk-sm{display:block;font-weight:400;font-size:12px;color:#4b5563;margin-top:1px}
.dk-q,.dk-e,.dk-r{white-space:nowrap;font-size:12.5px}.dk-e{font-weight:700}
.dk-p{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;white-space:nowrap}.dk-p.over{color:#b91c1c;font-weight:700}
.dk-bar{display:inline-block;width:80px;height:8px;border-radius:4px;background:#e5e7eb;overflow:hidden}.dk-bar>i{display:block;height:100%;background:#15803d}.dk-bar.over>i{background:#b91c1c}
.dk-tag{font-size:11.5px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:1px 8px;white-space:nowrap}
.dk-zt{display:inline-block;font-size:10.5px;font-weight:700;color:#475569;background:#eef2f7;border-radius:4px;padding:0 5px;margin-right:2px;vertical-align:1px}
.dk-go{flex:none;align-self:center;margin-right:4px;min-width:40px;white-space:nowrap}
.dk-bd{padding:2px 10px 8px 28px;border-top:1px dashed #e5e7eb}
.dk-ln{display:grid;grid-template-columns:minmax(40px,auto) minmax(0,1fr) auto auto auto;grid-template-areas:"n d q e p" ". o o o o";gap:0 12px;align-items:baseline;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:transparent;font:inherit;font-size:12.5px;color:inherit;padding:5px 4px;min-height:36px}
button.dk-ln{cursor:pointer}button.dk-ln:hover{background:#f0f7f3}
.dk-ln .dk-n{grid-area:n}.dk-ln .dk-des{grid-area:d;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151}.dk-ln .dk-lq{grid-area:q;white-space:nowrap}.dk-ln .dk-le{grid-area:e;white-space:nowrap;font-weight:700}.dk-ln .dk-lp{grid-area:p;white-space:nowrap;color:#4b5563}.dk-ln .dk-or{grid-area:o}
.dk-or{font-size:11.5px;color:#14532d}.dk-none{padding:6px 2px;font-size:12.5px}
.dk-cr{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto auto;grid-template-areas:"n q e u p" "o o o o o";gap:0 12px;align-items:baseline;padding:4px 2px;border-bottom:1px solid #f1f5f9;font-size:12.5px}
.dk-cr .dk-cn{grid-area:n;min-width:0}.dk-cr .dk-cq{grid-area:q;white-space:nowrap}.dk-cr .dk-ce{grid-area:e;white-space:nowrap;font-weight:700}.dk-cr .dk-cu{grid-area:u;white-space:nowrap}.dk-cr .dk-cp{grid-area:p;white-space:nowrap;color:#4b5563}.dk-cr .dk-or{grid-area:o}.dk-cr .dk-pan{grid-column:1/-1}
.dk-cr.dk-spr{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:none;align-items:center;gap:4px 10px}.dk-cr.dk-spr>.dk-ln{grid-column:1;border:0}.dk-cr.dk-spr>.btn{grid-column:2}
.dk-sec{margin:4px 0 6px}.dk-noye{background:#f8fafc;border-radius:6px;padding:0 6px}
.dk-st{font-size:12.5px;padding:5px 2px;color:#1f2937}.dk-pu{border-top:1px solid #e5e7eb}.dk-sub{font-size:11.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.02em;margin:6px 0 2px}
.dk-pan{font-size:11.5px;color:#6b7280;padding:1px 0 3px}.dk-hint{margin:4px 2px 0}
.dk-cb{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:0 0 6px}.dk-cbw{background:#fff7e6;border:1px solid #f3c27a;border-left:5px solid #0f766e;border-radius:8px;padding:6px 8px;font-size:12.5px;color:#5c3d00}.dk-cbw>span{flex:1 1 220px;min-width:0}
.eq-app #dx-calc .dk-cb .btn.sm{min-height:36px}.eq-app #dx-calc .dk-cbw .btn.primary{min-height:40px;font-weight:700}
.rp-dlg.dk-pdlg{width:min(780px,100%)}@media (min-width:701px){.rp-dlg.dk-pdlg{height:auto;max-height:94vh}}
.dk-pl{font-size:13.5px;margin:10px 0 4px}.dk-pi{font-size:13px;line-height:1.45;margin:4px 0;color:#374151}
.dk-prs{display:flex;flex-direction:column;gap:4px;margin:8px 0}
.dk-pr{border:1px solid #e5e7eb;border-radius:8px;padding:4px 8px;background:#fff;display:flex;flex-wrap:wrap;gap:2px 10px;align-items:center}.dk-pr.on{background:#f1f8f4;border-color:#b9d3c3}.dk-pr.dis{opacity:.62}.dk-pr.bad{border-color:#dc2626;background:#fef2f2}
.dk-prc{display:flex;align-items:center;gap:8px;flex:1 1 300px;min-width:0;min-height:40px;cursor:pointer}.dk-prn{min-width:0}.dk-prn small{display:block;color:#4b5563;font-size:11.5px}
.eq-app .dk-prc input[type=checkbox],.eq-app .dk-pdr input[type=checkbox],.eq-app .dk-mrl input[type=checkbox]{width:22px;height:40px;min-height:40px;margin:0;flex:none}
.dk-prq{display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:12.5px;padding-left:30px}.eq-app .dk-prq input{width:90px;min-height:36px;padding:2px 6px}.dk-pbad{color:#b91c1c;font-weight:700}
.dk-pdn{margin:6px 0}.dk-pdn>summary{cursor:pointer;font-weight:700;font-size:13px;min-height:40px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.dk-pdn>summary .hint{font-weight:400;margin:0}
.dk-pdl{display:flex;flex-direction:column;border:1px solid #e5e7eb;border-radius:8px;max-height:34vh;overflow:auto}.dk-pdr{display:flex;align-items:center;gap:8px;padding:0 8px;border-top:1px solid #f1f1f1;font-size:12.5px;min-height:40px;cursor:pointer}.dk-pdr:first-child{border-top:0}.dk-pdr small{color:#4b5563}
.dk-pvw{margin:8px 0 2px}.dk-pvh{font-size:11.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.02em;margin:0 0 2px}
.dk-mp{margin-top:8px;border:1px solid #c7d2fe;border-radius:8px;padding:6px 8px;background:#f8faff;display:flex;flex-direction:column;gap:4px}.dk-mph{font-weight:700;font-size:12.5px}
.dk-mks{display:flex;flex-wrap:wrap;gap:2px 12px;align-items:center;font-size:12.5px}.dk-mk{display:inline-flex;align-items:center;gap:5px;min-height:40px;cursor:pointer}.eq-app .dk-mk input{width:18px;height:18px;min-height:0;margin:0}
.dk-mls{display:flex;flex-direction:column;border:1px solid #e5e7eb;border-radius:8px;background:#fff;max-height:42vh;overflow:auto}
.dk-mr{display:flex;flex-wrap:wrap;align-items:center;gap:0 10px;padding:0 8px;border-top:1px solid #f1f1f1;font-size:12.5px}.dk-mr:first-child{border-top:0}.dk-mr.on{background:#eef6f1}
.dk-mrl{display:flex;align-items:center;gap:8px;flex:1 1 260px;min-width:0;min-height:40px;cursor:pointer}.dk-mrl small{color:#4b5563}
.dk-mq{display:inline-flex;align-items:center;gap:4px;margin-left:auto}.eq-app .dk-mq input{width:90px;min-height:36px;padding:2px 6px}
.dk-moth>summary{cursor:pointer;font-size:12.5px;font-weight:700;min-height:40px;display:flex;align-items:center}.dk-mf{margin:0 0 4px;width:100%;box-sizing:border-box}.eq-app .dk-mf{min-height:38px}
.dk-msum{font-size:12.5px;min-height:20px}.dk-mpv .c3-pu{margin:0}.eq-app .c3-dlg .dk-mp .btn.primary{min-height:40px;align-self:flex-start;font-weight:700}.dk-mp .btn[disabled]{opacity:.45}
@media (max-width:700px){.dk-hdr{gap:2px 10px}.dk-nm{flex-basis:calc(100% - 24px)}.dk-bd{padding:2px 6px 8px 8px}
  .dk-ln{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"n d d" "q e p" "o o o"}.dk-ln .dk-des{white-space:normal}
  .dk-cr{grid-template-columns:auto auto auto;grid-template-areas:"n n n" "q e p" "u u u" "o o o"}.dk-cr .dk-cp{text-align:right}
  .dk-cr.dk-spr{grid-template-columns:minmax(0,1fr);grid-template-areas:none}.dk-cr.dk-spr>.btn{grid-column:1}
  .dk-prq{padding-left:0}.dk-mq{margin-left:30px}.dk-tools .btn{flex:1 1 auto}.dk-tabs .btn{flex:1 1 40%}}
@media screen{#dk-print{display:none}}
@media print{@page{size:A4 portrait;margin:12mm}
  body:has(>#dk-print)>*:not(#dk-print){display:none!important}html:has(#dk-print),body:has(>#dk-print){height:auto!important;overflow:visible!important;background:#fff!important;padding:0!important;margin:0!important}
  #dk-print{display:block!important;font:10pt/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#000}#dk-print h1{font-size:15pt;margin:0 0 2pt}#dk-print .dk-pmeta{font-size:9pt;color:#444;margin:0 0 6pt}
  #dk-print .dk-sum{margin:0 0 8pt;font-size:10pt}#dk-print button{display:none!important}#dk-print .dk-it{break-inside:avoid;border-color:#bbb}#dk-print .dk-bd{display:block!important;border-top-color:#ccc}
  #dk-print .dk-hdr{min-height:0;padding:3pt 5pt}#dk-print .dk-ln,#dk-print .dk-cr{min-height:0;padding:2pt 3pt}#dk-print .dk-gh{break-after:avoid}#dk-print .dk-bar{border:1px solid #999}}
`;
export function css(doc){doc=doc||(docOK()?document:null);if(!doc||doc.getElementById('css-lot-dk'))return;const s=doc.createElement('style');s.id='css-lot-dk';s.textContent=CSS_DK;doc.head.appendChild(s);}
