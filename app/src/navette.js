// navette.js — NAVETTE DE PAIE au format SCR : « FEUILLE D'HEURES RÉCAPITULATIVE MENSUELLE » (modèle d'Ethan du 13/10/2026, NAVETTE_09-26, faite sous Excel par les RH).
// Module pur (sans DOM, testé en Node) : un mois → les semaines qui y comptent → les lignes de la feuille → la feuille Excel (formules gardées : les RH corrigent une
// heure, les totaux, heures sup et compteurs se recalculent).
// Règles lues sur le modèle (septembre 2026) :
//  · une semaine compte dans le mois de son JEUDI : septembre = semaines du 31/08 au 27/09 ; les 28-30/09 partent en octobre (« Régul. HS et dépla. sur octobre ») ;
//  · une ligne par jour, du dimanche (veille de la 1re semaine) au dimanche qui suit la dernière ; le samedi porte « TOTAL SEMAINE - n° » + « CONTRAT 35H », le dimanche
//    suivant les HEURES SUP 125 % (36e → 43e heure) et la ligne d'après les 150 % (au-delà de 43 h) ;
//  · TYPE CAS sur le 1er jour travaillé de la semaine ; IND. TPS DE TRAJET : ½ à l'aller (porté sur le 1er jour travaillé) et ½ au retour ; HÔTEL (HÔTEL IDF si le
//    chantier est en Île-de-France) et REPAS jour par jour (règles GD de rh.js : cas 2 = 5 nuitées, 10 repas, dimanche soir → vendredi midi) ;
//  · NB KM : domicile → chantier le 1er jour (« /GD » en grand déplacement), puis seulement les jours sur un autre chantier ;
//  · en bas : totaux hôtel / hôtel IDF / repas, INDEM TRAJET 15 € / 30 € / 50 € (nombre d'allers-retours par cas 2 / 3 / 4), compteur de récup, HS du mois, HS à payer,
//    compteur fin de mois (13/10 soir, Ethan : le CET « on s'en fout » → plus de cases CET).
import {hsSplit,H125_FROM,H150_FROM,K125,K150,KREP} from './compteurs.js'; // 13/10 (f) : heures sup par RANG (36e → 125 %, 44e → 150 %), compteur majoré
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DT=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d,12);};
export const addDay=(s,n)=>{const d=DT(s);d.setDate(d.getDate()+n);return iso(d);};
export const MOIS_NAV=['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
const JL=['D','L','M','M','J','V','S'];
export const CONTRAT_H=35,HS125_MAX=8,HEBDO_MAX=48; /* 35 h ; 125 % de la 36e à la 43e heure ; 150 % de la 44e à la 48e ; au-delà de 48 h (13/10 nuit, Ethan : « plafonner à 48 h par semaine par personne ; s'ils font plus ça va dans un compteur heures à reporter, qu'on peut vider en prime ») : compteur « à reporter » */
export function isoWeekNum(s){const d=DT(s);d.setDate(d.getDate()+3-((d.getDay()+6)%7));const y=d.getFullYear();const j=new Date(y,0,4,12);return 1+Math.round(((d-j)/864e5-3+((j.getDay()+6)%7))/7);}
/* lundis des semaines qui comptent dans le mois (leur jeudi est dans le mois) */
export function navWeeks(ym){const [y,m]=String(ym).split('-').map(Number);const first=new Date(y,m-1,1,12);const mon=new Date(first);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));const out=[];
  for(let d=new Date(mon);;d.setDate(d.getDate()+7)){const th=new Date(d);th.setDate(th.getDate()+3);const k=th.getFullYear()*12+th.getMonth(),km=y*12+m-1;if(k>km)break;if(k===km)out.push(iso(d));}return out;}
/* Île-de-France (contour simplifié, ±3 km, vérifié sur ~40 communes de part et d'autre de la limite) — pour la colonne HÔTEL IDF */
const IDF=[[1.70,49.235],[1.88,49.215],[2.10,49.205],[2.27,49.19],[2.42,49.155],[2.52,49.12],[2.60,49.09],[2.75,49.08],[2.90,49.08],[3.02,49.09],[3.08,49.11],[3.17,49.03],[3.25,49.00],[3.33,48.93],[3.40,48.87],[3.47,48.81],[3.48,48.72],[3.45,48.62],[3.42,48.53],[3.33,48.43],[3.10,48.37],[2.95,48.30],[2.86,48.20],[2.80,48.13],[2.68,48.12],[2.55,48.25],[2.45,48.31],[2.30,48.31],[2.12,48.29],[1.97,48.28],[1.92,48.42],[1.80,48.47],[1.72,48.56],[1.70,48.63],[1.58,48.70],[1.56,48.78],[1.47,48.90],[1.52,49.02],[1.55,49.08],[1.62,49.14]];
export function inIDF(lon,lat){if(!isFinite(lon)||!isFinite(lat))return false;let ins=false;for(let i=0,j=IDF.length-1;i<IDF.length;j=i++){const [xi,yi]=IDF[i],[xj,yj]=IDF[j];if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))ins=!ins;}return ins;}
const r2=v=>Math.round(v*100)/100;
/* buildNavette(o) — o = {ym, nom, prenom, adresse, contrat?, today?,
     day(d) → {sites:[{id, nom, km, idf}], worked, hours (h décimales | null), N, L, D, ar, cas} pour TOUT jour affiché (dimanche → dimanche, puis les jours de régul.)}
   → {ym, weeks:[{mon, n, cas, total, hs125, hs150}], lines:[…], tot:{hotel, idf, repas}, ar:{2,3,4}, hs:{h125, h150}, regulTo} */
export function buildNavette(o){const ym=o.ym;const W=navWeeks(ym);const day=o.day||(()=>({}));const C=+o.contrat||CONTRAT_H;const REPL=o.repl||{};const RECUP=o.recup||{}; /* 13/10 (f) : REPL[lundi] = heures « à reporter » replacées sur la semaine ; RECUP[jour] = [{type:'repos'|'pose', h}] pris sur le compteur */const lines=[];const weeks=[];const tot={hotel:0,idf:0,repas:0};const ar={2:0,3:0,4:0};
  const gdOfDay=(x,idf0)=>{const N=+x.N||0;const s=x.sites&&x.sites[0];const idf=N&&(s?!!s.idf:!!idf0);return {hotel:idf?0:N,idf:idf?N:0,repas:(+x.L||0)+(+x.D||0)};}; /* dimanche / samedi (pas de chantier ce jour-là) : hôtel du chantier de la semaine */
  const add=(x,g)=>{tot.hotel+=g.hotel;tot.idf+=g.idf;tot.repas+=g.repas;};
  W.forEach((mon,wi)=>{const sun=addDay(mon,-1);const ds=[0,1,2,3,4,5,6].map(i=>addDay(sun,i));const X=ds.map(d=>Object.assign({d},day(d)||{}));
    const cas=Math.max(0,...X.map(x=>+x.cas||0));const f=[1,2,3,4,5].find(i=>X[i].worked);
    // ½ trajet de l'aller (porté par la veille au soir) → affiché sur le 1er jour travaillé, comme sur le modèle
    const arD=X.map(()=>0);X.forEach((x,i)=>{const a=+x.ar||0;if(!a)return;arD[f!==undefined&&i<f?f:i]+=a;});
    if(cas>=2&&cas<=4)ar[cas]+=arD.reduce((s,a)=>s+a,0);
    const cnt={};X.slice(1,6).forEach(x=>{if(x.worked&&x.sites&&x.sites[0])cnt[x.sites[0].nom]=(cnt[x.sites[0].nom]||0)+1;});const main=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||null;
    const wIdf=f!==undefined&&X[f].sites&&X[f].sites[0]?!!X[f].sites[0].idf:false;
    // dimanche : arrivée de la semaine (hôtel, repas) ; heures sup de la semaine d'avant (sauf 1re semaine du mois)
    {const g=gdOfDay(X[0],wIdf);add(X[0],g);lines.push({kind:'sun',d:sun,j:'D',n:+sun.slice(8),...g,hsOf:wi>0?wi-1:null,cas});if(wi>0)lines.push({kind:'hs150',hsOf:wi-1});}
    let total=0,miss=0;
    for(let i=1;i<=5;i++){const x=X[i];const g=gdOfDay(x);add(x,g);const s=x.sites&&x.sites[0];const first=i===f;const rc=(RECUP[x.d]||[]).filter(m=>+m.h>0);const rcTxt=rc.length?rc.map(m=>(m.type==='pose'?'RÉCUP (ENTREPRISE) ':'RÉCUP ')+String(+m.h).replace('.',',')+' H').join(' + '):'';
      const km=s&&isFinite(+s.km)&&+s.km>0?(first?(+s.km)+' KM'+(cas>=2?'/GD':''):(s.nom!==main?(+s.km)+' KM':'')):'';
      const h=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):null;if(h!==null)total+=h;else if(x.worked)miss++;
      lines.push({kind:'day',d:x.d,j:JL[i],n:+x.d.slice(8),cas:first&&cas?'CAS '+cas:'',casN:cas,ar:arD[i]||0,...g,chantier:x.worked&&s?s.nom+(rcTxt?' · '+rcTxt:''):(x.worked?rcTxt:(x.ferie?'FÉRIÉ'+(rcTxt?' · '+rcTxt:''):rcTxt)),hours:h,km,worked:!!x.worked,recup:rc});}
    const rp=r2(+REPL[mon]||0);
    {const x=X[6];const g=gdOfDay(x,wIdf);add(x,g);const hs=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):0;total+=hs;
      lines.push({kind:'sat',d:x.d,j:'S',n:+x.d.slice(8),...g,ar:arD[6]||0,casN:cas,wi,satHours:hs,repl:rp,label:'TOTAL SEMAINE - '+isoWeekNum(mon)+(rp?' (DONT '+String(rp).replace('.',',')+' H REPORTÉES)':'')});}
    total=r2(total+rp);const sp=hsSplit(total,C);weeks.push({mon,n:isoWeekNum(mon),cas,total,repl:rp,miss,hs125:sp.hs125,hs150:sp.hs150,report:sp.report,main});}); /* 13/10 (f) : rang absolu — contrat 39 h : 125 % de la 40e à la 43e, 150 % de la 44e à la 48e */
  // dimanche qui suit la dernière semaine : ses heures sup (l'arrivée suivante appartient au mois suivant)
  let regulTo=null;if(W.length){const lastSun=addDay(W[W.length-1],6);lines.push({kind:'sun',d:lastSun,j:'D',n:+lastSun.slice(8),hotel:0,idf:0,repas:0,hsOf:W.length-1,tail:true});lines.push({kind:'hs150',hsOf:W.length-1});
    // jours du mois après ce dimanche : leur semaine compte le mois suivant (« Régul. HS et dépla. sur … »)
    const [y,m]=ym.split('-').map(Number);const last=iso(new Date(y,m,0,12));let d=addDay(lastSun,1);const nxt=MOIS_NAV[m%12].toLowerCase();let firstR=true;
    while(d<=last){const x=day(d)||{};const h=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):null;lines.push({kind:'regul',d,j:JL[DT(d).getDay()],n:+d.slice(8),chantier:firstR?'Régul. HS et dépla. sur '+nxt:'',hours:h});if(firstR)regulTo=nxt;firstR=false;d=addDay(d,1);}}
  const hs={h125:r2(weeks.reduce((s,w)=>s+w.hs125,0)),h150:r2(weeks.reduce((s,w)=>s+w.hs150,0)),report:r2(weeks.reduce((s,w)=>s+w.report,0))};
  return {ym,mois:MOIS_NAV[+ym.slice(5)-1],annee:+ym.slice(0,4),nom:o.nom||'',prenom:o.prenom||'',adresse:o.adresse||'',contrat:C,weeks,lines,tot,ar,hs,regulTo,today:o.today||'',cpt:o.cpt||null};} /* cpt : soldes connus pour pré-remplir (recup, report, prime) */
/* ── COMPTEURS D'HEURES PAR PERSONNE (13/10, Ethan : « rajouter les compteurs d'heures que l'on ne traite pas jusque-là ; tout le monde n'a pas le même
   compteur → dans les paramètres du profil ; je te donnerai un classeur pour importer les soldes déjà stockés »). Registre « cpth » (id = clé de la personne) :
   {contrat (h / semaine), on:{clé:true}, labels:{clé « x_… »: libellé} (compteurs ajoutés), soldes:{clé:{h, at, by}}, primes:[{id, at, h, by, note}]}.
   « report » (heures au-delà de 48 h / semaine) se calcule tout seul depuis le pointage ; les autres = soldes tenus par les RH (saisis ou importés). ── */
export const CPT_H=[
 {k:'recup',label:'Compteur d\'heures',desc:'heures sup rangées majorées (36e → 1 h 15, 44e → 1 h 30) jusqu\'au plafond ; repos pris ou posé par l\'entreprise',auto:true}, // 13/10 (f) : l'ancien « Récupération » (même clé, même solde)
 {k:'report',label:'Heures à reporter',desc:'au-delà de '+HEBDO_MAX+' h par semaine, majorées ×1,5 ; payées en prime ou replacées sur une semaine plus légère',auto:true}];
/* solde « à reporter » au jour « upto » (inclus) : solde saisi (h, au) + excédents au-delà de 48 h des semaines terminées (dimanche ≤ upto) depuis cette date
   (au plus 52 semaines ; sans solde saisi : 26 semaines en arrière) − primes versées depuis. weekTotal(lundi) → heures de la semaine (lundi → samedi) ou null */
export function reportBalance(sol,primes,upto,weekTotal){upto=String(upto).slice(0,10);const at=sol&&sol.at?String(sol.at).slice(0,10):null;let h=sol&&isFinite(+sol.h)?+sol.h:0;let ex=0,pr=0;
  let d=at?addDay(at,1):addDay(upto,-7*26);d=addDay(d,(8-DT(d).getDay())%7);
  for(let n=0;n<52&&addDay(d,6)<=upto;n++,d=addDay(d,7)){const t=weekTotal?+weekTotal(d):0;if(isFinite(t)&&t>HEBDO_MAX)ex+=t-HEBDO_MAX;}
  (primes||[]).forEach(m=>{const ma=m&&String(m.at||'').slice(0,10);if(ma&&(!at||ma>at)&&ma<=upto)pr+=+m.h||0;});
  return {h:r2(h+ex-pr),sol:sol&&isFinite(+sol.h)?+sol.h:null,at,ex:r2(ex),pr:r2(pr)};}
/* navetteSheet(N, name) → feuille pour makeStyledXlsx : mise en page du modèle, formules Excel (totaux, heures sup, compteurs) */
export function navetteSheet(N,name){const cells={};const merges=[];const heights={};const S=(a,v,s,f)=>{cells[a]={v,s,f};};
  const up=t=>String(t||'').toLocaleUpperCase('fr-FR');
  // en-tête
  S('A1','SCR','logo');merges.push('A1:C3');S('H1',"FEUILLE D'HEURES RECAPITULATIVE MENSUELLE",'title');S('I1',null,'title');S('J1',null,'title');merges.push('H1:J1');
  S('H2','NOM : '+up(N.nom),'hl');S('J2','MOIS DE : '+N.mois,'hl');S('H3','PRENOM : '+up(N.prenom),'hl');S('J3','ANNEE : '+N.annee,'hl');S('H4','ADRESSE : '+up(N.adresse),'hl');merges.push('H4:J4');
  const H=6;heights[H]=30;[['A','TYPE CAS','thO'],['B','IND. TPS DE TRAJET','thO'],['C','','th'],['D','','th'],['E','HOTEL','th'],['F','HOTEL IDF','thO'],['G','REPAS','th'],['H','CHANTIER','th'],['I','NB HEURES','th'],['J','NB KM','th']].forEach(([c,t,s])=>S(c+H,t,s));
  let r=H+1;const first=r;const satRow={};const hs125Rows=[],hs150Rows=[];const dayRows={};
  // 1re passe : numéros de ligne (les formules du dimanche visent le samedi d'avant)
  const rowsOf=[];N.lines.forEach(L=>{rowsOf.push(r);if(L.kind==='sat')satRow[L.wi]=r;r++;});const lastRow=r-1;
  N.lines.forEach((L,k)=>{const R=rowsOf[k];const grey=L.kind==='sat'||L.kind==='sun'||L.kind==='hs150';const g=grey?'G':'';
    const num=(c,v,st)=>S(c+R,v===0||v===null||v===undefined||v===''?null:v,st);
    ['A','B','C','D','E','F','G','H','I','J'].forEach(c=>S(c+R,null,'td'+g));
    if(L.kind==='hs150'){S('H'+R,'HEURES SUP - 150%','tdG');const sr=satRow[L.hsOf];S('I'+R,null,'hG','MAX(MIN(I'+sr+','+HEBDO_MAX+')-'+Math.max(N.contrat,H150_FROM)+',0)');S('J'+R,null,'repG','MAX(I'+sr+'-'+HEBDO_MAX+',0)');hs150Rows.push(R);return;} /* J : heures au-delà de 48 h (« à reporter »), vide si 0 */
    S('C'+R,L.j,'tdj'+g);S('D'+R,L.n,'tdn'+g);
    if(L.kind==='sun'){num('E',L.hotel,'tdB'+g);num('F',L.idf,'tdB'+g);num('G',L.repas,'tdB'+g);
      if(L.hsOf!==null&&L.hsOf!==undefined){S('H'+R,'HEURES SUP - 125%','tdG');const sr=satRow[L.hsOf];S('I'+R,null,'hG','MAX(MIN(I'+sr+','+H150_FROM+')-'+Math.max(N.contrat,H125_FROM)+',0)');hs125Rows.push(R);}return;} /* 13/10 (f) : la 36e heure (ou la 1re après le contrat) → 125 %, la 44e → 150 % */
    if(L.kind==='sat'){const mon=R-5;num('E',L.hotel,'td'+g);num('F',L.idf,'td'+g);num('G',L.repas,'td'+g);if(L.ar){S('B'+R,L.ar,'blueG');S('K'+R,L.casN,'hid');}
      S('H'+R,L.label,'tdG');S('I'+R,null,'hG','SUM(I'+mon+':I'+(R-1)+')'+(L.satHours?'+'+L.satHours:'')+(L.repl?'+'+L.repl:''));S('J'+R,'CONTRAT '+N.contrat+'H','tdG');return;}
    if(L.kind==='regul'){if(L.chantier)S('H'+R,L.chantier,'red');num('I',L.hours,'h');return;}
    // jour ouvré
    if(L.cas)S('A'+R,L.cas,'blue');if(L.ar){S('B'+R,L.ar,'blue');S('K'+R,L.casN,'hid');}
    num('E',L.hotel,'td');num('F',L.idf,'td');num('G',L.repas,'td');if(L.chantier)S('H'+R,up(L.chantier),'td');num('I',L.hours,'h');if(L.km)S('J'+R,L.km,'td');dayRows[L.d]=R;});
  // totaux des colonnes, signatures
  r=lastRow+1;S('E'+r,null,'tot','SUM(E'+first+':E'+lastRow+')');S('F'+r,null,'tot','SUM(F'+first+':F'+lastRow+')');S('G'+r,null,'tot','SUM(G'+first+':G'+lastRow+')');
  ['A','B','C','D','H','I','J'].forEach(c=>S(c+r,null,'td'));const totRow=r;
  r++;S('A'+r,'SIGNATURE SALARIÉ','sig');['B','C','D','E','F','G','H'].forEach(c=>S(c+r,null,'sig'));merges.push('A'+r+':H'+r);S('I'+r,'SIGNATURE EMPLOYEUR','sig');S('J'+r,null,'sig');merges.push('I'+r+':J'+r);
  r++;heights[r]=42;['A','B','C','D','E','F','G','H','I','J'].forEach(c=>S(c+r,null,'sigbox'));merges.push('A'+r+':H'+r);merges.push('I'+r+':J'+r);
  // indemnités de trajet (nombre d'allers-retours par cas) — SOMME.SI sur la colonne cachée K (cas de la ligne)
  r+=2;const ind0=r;[['INDEM TRAJET 15€',2,'i15'],['INDEM TRAJET 30€',3,'i30'],['INDEM TRAJET 50€',4,'i50']].forEach(([t,c,s],i)=>{S('A'+(ind0+i),t,s);S('B'+(ind0+i),null,s);merges.push('A'+(ind0+i)+':B'+(ind0+i));S('C'+(ind0+i),null,'iv','SUMIF(K'+first+':K'+lastRow+','+c+',B'+first+':B'+lastRow+')');});
  // compteurs (à droite, comme le modèle) : cases vertes = à remplir par les RH
  r=ind0;const box=(lab,v,st,f,stl)=>{S('H'+r,lab,stl||'bx');S('I'+r,v,st||'bv',f);const R=r;r++;return R;};
  /* 13/10 (f) : compteur d'heures (règles d'Ethan) — les heures sup entrent MAJORÉES (125 % × 1,25 ; 150 % × 1,5) jusqu'au plafond, le surplus est payé ;
     pré-rempli depuis la fiche (solde de départ, repos pris / posés, surplus) ; cases vertes = corrigeables par les RH, les formules suivent */
  const K=N.cpt||{};const nv=v=>v!==null&&v!==undefined&&v!==''&&isFinite(+v)?+v:null;const fh=v=>String(r2(v)).replace('.',',');
  S('H'+r,'COMPTEUR D\'HEURES'+(K.on?(nv(K.plafond)?' (PLAFOND '+fh(K.plafond)+' H)':' (SANS PLAFOND)'):(K.on===false?' (PAS DE COMPTEUR : HS PAYÉES)':'')),'bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const cPrev=box('Compteur fin de mois précédent',nv(K.recup),'bin');const cRec=box('Heures de récup. prises dans le mois (repos, posées)',nv(K.pris)||null,'bin');const cTot=box('Total',null,'bvB','I'+cPrev+'-I'+cRec,'bxR');r++;
  S('H'+r,'HS du mois','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const h125=box('NB HEURES 125%',null,'bv',hs125Rows.length?'SUM('+hs125Rows.map(x=>'I'+x).join(',')+')':'0');const h150=box('NB HEURES 150%',null,'bv',hs150Rows.length?'SUM('+hs150Rows.map(x=>'I'+x).join(',')+')':'0');
  const hTot=box('Total',null,'bvB','I'+h125+'+I'+h150,'bxR');const gTot=box('Total',null,'bvB','I'+cTot+'+I'+hTot,'bxR');S('J'+gTot,'>'+N.contrat+'h','b');r++;
  S('H'+r,'soit HS à payer dans le mois'+(K.on?' (compteur plein)':''),'bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const p125=r,p150=r+1,pTot=r+2;
  if(K.on){box('NB HEURES 125%',nv(K.pay125)||0,'bin');box('NB HEURES 150%',nv(K.pay150)||0,'bin');}else{box('NB HEURES 125%',null,'bin','I'+h125);box('NB HEURES 150%',null,'bin','I'+h150);}
  box('Total',null,'bvB','I'+p125+'+I'+p150,'bxR');r++;
  S('H'+r,'COMPTEUR FIN DE MOIS','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const cEnt=box('Entrées au compteur (125 % × 1,25 · 150 % × 1,5)',null,'bv',K125+'*(I'+h125+'-I'+p125+')+'+K150+'*(I'+h150+'-I'+p150+')');
  const cFin=box('Compteur fin de mois',null,'bvB','I'+cTot+'+I'+cEnt);r++;
  // heures au-delà de 48 h par semaine : compteur « à reporter », majorées × 1,5 à l'entrée ; vidé en prime ou replacé sur une semaine plus légère (cases vertes = RH)
  S('H'+r,'HEURES À REPORTER (> '+HEBDO_MAX+' h / semaine)','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const rPrev=box('Compteur à reporter fin de mois précédent',nv(K.report),'bin');const rMois=box('Heures du mois au-delà de '+HEBDO_MAX+' h',null,'bv',hs150Rows.length?'SUM('+hs150Rows.map(x=>'J'+x).join(',')+')':'0');
  const rEnt=box('Entrées majorées (× 1,5)',null,'bv',KREP+'*I'+rMois);
  const rPrime=box('Payées en prime ce mois',nv(K.prime)||0,'bin');const rRepl=box('Replacées sur une semaine plus légère',nv(K.repl)||0,'bin');const rFin=box('Compteur à reporter fin de mois',null,'bvB','I'+rPrev+'+I'+rEnt+'-I'+rPrime+'-I'+rRepl);
  r++;S('A'+r,'Pré-rempli par TRACÉ'+(N.today?' le '+N.today:'')+' (planning, pointage, grands déplacements, compteurs) — à vérifier, compléter et signer. Cases vertes : à remplir par les RH.'+(K.reconstitue?' Compteur reconstitué depuis le pointage (pas de solde de départ importé).':''),'note');merges.push('A'+r+':J'+r);
  return {name:name||(up(N.nom)+' '+up(N.prenom)).trim()||'Navette',cells,merges,heights,widths:[9,9,3,4,7,8,7,30,11,15,4],hidden:[11],fit:true,rows:r,
    refs:{first,lastRow,totRow,ind0,cPrev,cRec,cTot,h125,h150,hTot,gTot,p125,p150,pTot,cEnt,cFin,rPrev,rMois,rEnt,rPrime,rRepl,rFin,satRow,hs125Rows,hs150Rows,dayRows}};}
/* styles du modèle (orange = colonnes RH, gris = fins de semaine, bleu = cas / trajet, vert = à remplir) */
export const NAV_STYLES={
  logo:{b:1,sz:26,color:'E8541E',h:'center'},title:{b:1,sz:11,border:1,h:'center'},hl:{b:1,sz:10},
  th:{b:1,sz:9,border:1,h:'center',wrap:1},thO:{b:1,sz:9,border:1,h:'center',wrap:1,fill:'FFC000'},
  td:{sz:9,border:1,h:'center'},tdG:{sz:9,border:1,h:'center',b:1,fill:'D9D9D9'},tdB:{sz:9,border:1,h:'center',b:1},tdBG:{sz:9,border:1,h:'center',b:1,fill:'D9D9D9'},
  tdj:{sz:9,border:1,b:1},tdjG:{sz:9,border:1,b:1,fill:'D9D9D9'},tdn:{sz:9,border:1,b:1,h:'right'},tdnG:{sz:9,border:1,b:1,h:'right',fill:'D9D9D9'},
  blue:{sz:9,border:1,h:'center',b:1,color:'2E75B6'},blueG:{sz:9,border:1,h:'center',b:1,color:'2E75B6',fill:'D9D9D9'},
  repG:{sz:8,border:1,h:'center',b:1,color:'C00000',fill:'D9D9D9',fmt:'General" h à reporter";;;@'},h:{sz:9,border:1,h:'right',b:1,fmt:'General;-General;;@'},hG:{sz:9,border:1,h:'right',b:1,fill:'D9D9D9',fmt:'General;-General;;@'}, /* 0 h sup = case vide, comme le modèle */red:{sz:9,border:1,h:'center',b:1,color:'FF0000'},
  tot:{sz:9,border:1,h:'center',b:1,fill:'C6E0B4'},sig:{sz:9,b:1,h:'center',border:1},sigbox:{sz:9,border:1},
  i15:{sz:9,b:1,border:1,fill:'9BC2E6'},i30:{sz:9,b:1,border:1,fill:'A9D08E'},i50:{sz:9,b:1,border:1,fill:'F4B6E1'},iv:{sz:9,b:1,border:1,h:'center'},
  bx:{sz:9,border:1,h:'center'},bxR:{sz:9,border:1,h:'right'},bh:{sz:9,b:1,border:1,h:'center'},bv:{sz:9,border:1,h:'center',fmt:'0.00'},bvB:{sz:9,b:1,border:1,h:'center',fmt:'0.00'},
  bin:{sz:9,border:1,h:'center',fmt:'0.00',fill:'E2EFDA'},b:{sz:9,b:1},hid:{sz:8,color:'999999'},note:{sz:8,i:1,color:'666666',wrap:1}};
