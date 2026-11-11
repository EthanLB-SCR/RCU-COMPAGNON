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
export function buildNavette(o){const ym=o.ym;const W=navWeeks(ym);const day=o.day||(()=>({}));const C=+o.contrat||CONTRAT_H;const REPL=o.repl||{};const RECUP=o.recup||{};const LISS=typeof o.liss==='function'?o.liss:()=>null;let itM=0; /* 10/11 nuit : o.liss(lundi) → la semaine lissée (lisserSemaine) ; sans : heures réelles, comme avant */ /* 13/10 (f) : REPL[lundi] = heures « à reporter » replacées sur la semaine ; RECUP[jour] = [{type:'repos'|'pose', h}] pris sur le compteur */const lines=[];const weeks=[];const tot={hotel:0,idf:0,repas:0};const ar={2:0,3:0,4:0};
  const gdOfDay=(x,idf0)=>{const N=+x.N||0;const s=x.sites&&x.sites[0];const idf=N&&(s?!!s.idf:!!idf0);return {hotel:idf?0:N,idf:idf?N:0,repas:(+x.L||0)+(+x.D||0)};}; /* dimanche / samedi (pas de chantier ce jour-là) : hôtel du chantier de la semaine */
  const add=(x,g)=>{tot.hotel+=g.hotel;tot.idf+=g.idf;tot.repas+=g.repas;};
  W.forEach((mon,wi)=>{const sun=addDay(mon,-1);const ds=[0,1,2,3,4,5,6].map(i=>addDay(sun,i));const X=ds.map(d=>Object.assign({d},day(d)||{}));const LS=LISS(mon)||null;
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
      if(LS){const lj=LS.jours[i-1]||{};const h=lj.h!==null&&lj.h!==undefined&&isFinite(+lj.h)?r2(+lj.h):null;if(h!==null)total+=h;
        const vu=lj.reel!==null||lj.h!==null||(x.worked&&LS.etat!=='lisse');const nomJ=vu?(lj.site?lj.site.nom:(x.worked&&s?s.nom:'')):''; /* jour pointé ou lissé : son chantier (vendredi non travaillé : celui du jeudi) ; semaine pas lissée : le chantier planifié, heures à saisir */
        const ch=[nomJ,lj.reel===null&&lj.lab?lj.lab:'',rcTxt,lj.it>0?'INTER-CHANTIER '+fx(lj.it)+' H':''].filter(Boolean).join(' · ');
        lines.push({kind:'day',d:x.d,j:JL[i],n:+x.d.slice(8),cas:first&&cas?'CAS '+cas:'',casN:cas,ar:arD[i]||0,...g,chantier:ch,hours:h,km,worked:!!x.worked,recup:rc,reel:lj.reel,it:lj.it||0,emprunt:!!lj.emprunt});continue;}
      const h=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):null;if(h!==null)total+=h;else if(x.worked)miss++;
      lines.push({kind:'day',d:x.d,j:JL[i],n:+x.d.slice(8),cas:first&&cas?'CAS '+cas:'',casN:cas,ar:arD[i]||0,...g,chantier:x.worked&&s?s.nom+(rcTxt?' · '+rcTxt:''):(x.worked?rcTxt:(x.ferie?'FÉRIÉ'+(rcTxt?' · '+rcTxt:''):rcTxt)),hours:h,km,worked:!!x.worked,recup:rc});}
    if(LS){const x=X[6];const g=gdOfDay(x,wIdf);add(x,g);const ls=LS.jours[5]||{};const hs=ls.h!==null&&ls.h!==undefined&&isFinite(+ls.h)?r2(+ls.h):0;total+=hs;
      const rpl=r2(LS.repl+LS.deReport+LS.place),rcp=r2(LS.deRecup),ext=r2(rpl+rcp);itM+=LS.it||0;
      lines.push({kind:'sat',d:x.d,j:'S',n:+x.d.slice(8),...g,ar:arD[6]||0,casN:cas,wi,satHours:hs,repl:ext,label:'TOTAL SEMAINE - '+isoWeekNum(mon)+(rpl?' (DONT '+fx(rpl)+' H REPORTÉES)':'')+(rcp?' (DONT '+fx(rcp)+' H DE RÉCUP)':'')});
      total=r2(total+ext);weeks.push({mon,n:isoWeekNum(mon),cas,total,repl:ext,miss:LS.trous.length,hs125:LS.hs125,hs150:LS.hs150,report:LS.versReport,reportMaj:LS.versReportMaj,main,liss:LS,it:LS.it,reel:LS.reel});return;}
    const rp=r2(+REPL[mon]||0);
    {const x=X[6];const g=gdOfDay(x,wIdf);add(x,g);const hs=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):0;total+=hs;
      lines.push({kind:'sat',d:x.d,j:'S',n:+x.d.slice(8),...g,ar:arD[6]||0,casN:cas,wi,satHours:hs,repl:rp,label:'TOTAL SEMAINE - '+isoWeekNum(mon)+(rp?' (DONT '+String(rp).replace('.',',')+' H REPORTÉES)':'')});}
    total=r2(total+rp);const sp=hsSplit(total,C);weeks.push({mon,n:isoWeekNum(mon),cas,total,repl:rp,miss,hs125:sp.hs125,hs150:sp.hs150,report:sp.report,reportMaj:r2(sp.report*KREP),main});}); /* 13/10 (f) : rang absolu — contrat 39 h : 125 % de la 40e à la 43e, 150 % de la 44e à la 48e */
  // dimanche qui suit la dernière semaine : ses heures sup (l'arrivée suivante appartient au mois suivant)
  let regulTo=null;if(W.length){const lastSun=addDay(W[W.length-1],6);lines.push({kind:'sun',d:lastSun,j:'D',n:+lastSun.slice(8),hotel:0,idf:0,repas:0,hsOf:W.length-1,tail:true});lines.push({kind:'hs150',hsOf:W.length-1});
    // jours du mois après ce dimanche : leur semaine compte le mois suivant (« Régul. HS et dépla. sur … »)
    const [y,m]=ym.split('-').map(Number);const last=iso(new Date(y,m,0,12));let d=addDay(lastSun,1);const nxt=MOIS_NAV[m%12].toLowerCase();let firstR=true;
    while(d<=last){const x=day(d)||{};const h=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):null;lines.push({kind:'regul',d,j:JL[DT(d).getDay()],n:+d.slice(8),chantier:firstR?'Régul. HS et dépla. sur '+nxt:'',hours:h});if(firstR)regulTo=nxt;firstR=false;d=addDay(d,1);}}
  const hs={h125:r2(weeks.reduce((s,w)=>s+w.hs125,0)),h150:r2(weeks.reduce((s,w)=>s+w.hs150,0)),report:r2(weeks.reduce((s,w)=>s+w.report,0)),reportMaj:r2(weeks.reduce((s,w)=>s+(+w.reportMaj||0),0))};
  return {ym,mois:MOIS_NAV[+ym.slice(5)-1],annee:+ym.slice(0,4),nom:o.nom||'',prenom:o.prenom||'',adresse:o.adresse||'',contrat:C,weeks,lines,tot,ar,hs,regulTo,today:o.today||'',cpt:o.cpt||null,it:r2(itM),lisse:weeks.some(w=>w.liss&&w.liss.etat==='lisse')};} /* cpt : soldes connus pour pré-remplir (recup, report, prime) */
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
    if(L.kind==='hs150'){S('H'+R,'HEURES SUP - 150%','tdG');const sr=satRow[L.hsOf];S('I'+R,null,'hG','MAX(MIN(I'+sr+','+HEBDO_MAX+')-'+Math.max(N.contrat,H150_FROM)+',0)');
      const WK=N.weeks[L.hsOf];if(WK&&WK.liss&&WK.report>0){S('J'+R,WK.report,'repG');S('L'+R,WK.reportMaj||null,'hid');} /* 10/11 nuit : semaine lissée au-delà du plafond → heures pointées en plus (J) et leur entrée majorée par rang (L, cachée) */
      else{S('J'+R,null,'repG','MAX(I'+sr+'-'+HEBDO_MAX+',0)');S('L'+R,null,'hid',KREP+'*J'+R);}hs150Rows.push(R);return;} /* J : heures au-delà de 48 h (« à reporter »), vide si 0 */
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
  /* 05/11 (relevé du tournage, Ethan : « cas 1 (petits déplacements) : un panier repas chaque midi ») : nombre de paniers = jours travaillés AVEC pointage en cas 1 */
  {const pan=(N.lines||[]).filter(L=>L.kind==='day'&&+L.casN===1&&L.worked&&+L.hours>0).length;const rr=ind0+3;S('A'+rr,'PANIERS REPAS (CAS 1)','i15');S('B'+rr,null,'i15');merges.push('A'+rr+':B'+rr);S('C'+rr,pan,'iv');}
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
  const rPrev=box('Compteur à reporter fin de mois précédent',nv(K.report),'bin');const rMois=box('Heures du mois au-delà du plafond ('+HEBDO_MAX+' h, 12 h par jour)',null,'bv',hs150Rows.length?'SUM('+hs150Rows.map(x=>'J'+x).join(',')+')':'0');
  const rEnt=box('Entrées majorées (× 1,5, selon le rang si plafond réduit)',null,'bv',hs150Rows.length?'SUM('+hs150Rows.map(x=>'L'+x).join(',')+')':'0'); /* 10/11 nuit : colonne L cachée = entrée majorée de chaque semaine */
  const rPrime=box('Payées en prime ce mois',nv(K.prime)||0,'bin');const rRepl=box('Replacées sur une semaine plus légère',nv(K.repl)||0,'bin');const rFin=box('Compteur à reporter fin de mois',null,'bvB','I'+rPrev+'+I'+rEnt+'-I'+rPrime+'-I'+rRepl);
  let rIt=null;if(N.it>0){r++;S('H'+r,'HEURES INTER-CHANTIER (100 %, JAMAIS MAJORÉES)','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;rIt=box('Payées en plus des heures ci-dessus',N.it,'bin');} /* 10/11 nuit (Ethan) : pointées à part, payées, jamais majorées */
  r++;S('A'+r,'Pré-rempli par Tracé'+(N.today?' le '+N.today:'')+' (planning, pointage, grands déplacements, compteurs) — à vérifier, compléter et signer. Cases vertes : à remplir par les RH.'+(K.reconstitue?' Compteur reconstitué depuis le pointage (pas de solde de départ importé).':'')+(N.lisse?' Heures lissées sur 5 jours (12 h par jour, 48 h par semaine) : le détail de chaque semaine est dans Tracé RH → Navettes.':''),'note');merges.push('A'+r+':J'+r);
  return {name:name||(up(N.nom)+' '+up(N.prenom)).trim()||'Navette',cells,merges,heights,widths:[9,9,3,4,7,8,7,30,11,15,4,4],hidden:[11,12],fit:true,rows:r,
    refs:{first,lastRow,totRow,ind0,cPrev,cRec,cTot,h125,h150,hTot,gTot,p125,p150,pTot,cEnt,cFin,rPrev,rMois,rEnt,rPrime,rRepl,rFin,rIt,satRow,hs125Rows,hs150Rows,dayRows}};}
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
/* ══ 10/11 nuit — LISSAGE DES HEURES DE LA NAVETTE (règles d'Ethan, 10/11 soir) ══
   « Les heures sont lissées sur 5 jours, limite de 12 h par jour et 48 h par semaine ; le chantier du vendredi, s'il n'est pas travaillé, est celui du jeudi ;
   au-dessus de 48 h : compteur à reporter (ou prime), majorées (50 h → 2 h à 150 % → 3 h au compteur) ; une journée d'absence n'est pas lissée ; moins de 35 h :
   on pioche dans le compteur à reporter puis dans le compteur d'heures (vides : alerte, on demande de poser du sans solde) ; férié le mardi + pont le lundi :
   3 × 12 = 36 h au plus, le reste au compteur ; il faut toujours que ce soit expliqué, qu'on puisse avoir la main et comprendre comment on en arrive là. »
   Pas de ½ h, le reste sur le dernier jour : c'est ce que fait la navette modèle de septembre (43,5 h → 8,5 × 4 + 9,5 ; 41 h → 8 × 4 + 9).
   Les débours (Tracé Affaire) prennent les heures RÉELLES pointées, jamais la navette lissée. Les heures inter-chantier sont payées à part, à 100 %, jamais majorées. */
export const HMAX_J=12,PAS_LISSE=0.5;
const JNOM=['lundi','mardi','mercredi','jeudi','vendredi','samedi'],JC=['lun','mar','mer','jeu','ven','sam'];
const fx=v=>String(r2(v)).replace('.',',');
const jdm=d=>String(d).slice(8,10)+'/'+String(d).slice(5,7);
/* majoration des heures de rang a → b dans la semaine (jusqu'au contrat × 1 ; de la 36e à la 43e × 1,25 ; au-delà × 1,5) */
export function majRang(a,b,contrat){const C=Math.max(+contrat||CONTRAT_H,H125_FROM),C2=Math.max(+contrat||CONTRAT_H,H150_FROM);let t=0;
  const seg=(lo,hi,k)=>{const x=Math.max(0,Math.min(b,hi)-Math.max(a,lo));t+=x*k;};seg(0,C,1);seg(C,C2,K125);seg(C2,Infinity,K150);return r2(t);}
/* répartir T heures sur n jours : au pas de ½ h, le reste sur le dernier jour, jamais plus de 12 h (le surplus remonte sur les jours d'avant) */
export function repartir(T,n){if(!(n>0))return [];const base=Math.max(0,Math.floor(T/n/PAS_LISSE+1e-9)*PAS_LISSE);const out=Array(n).fill(base);let rest=r2(T-base*n);
  for(let i=n-1;i>=0&&rest>0.0001;i--){const add=Math.min(rest,r2(HMAX_J-out[i]));out[i]=r2(out[i]+add);rest=r2(rest-add);}return out.map(r2);}
const ETATS={lisse:'lissée',main:'à la main',reel:'heures réelles (à la main)',encours:'en cours',vide:'rien de pointé',incomplet:'à compléter',sansjour:'sans jour à lisser'};
export const ETAT_LISSE=ETATS;
/* lisserSemaine(o) → la semaine telle qu'elle part sur la navette, et POURQUOI (expl : phrases lisibles par la RH et par le gars).
   o = {mon (lundi), contrat (h / semaine),
        jours:[6 × {d, h (heures de TRAVAIL pointées, sans les pauses ni l'inter-chantier | null), it (inter-chantier du jour, h), plan (attendu au travail ce jour-là),
                    ferie, abs (libellé d'absence déclarée | null), sites:[{id,nom}] (chantier pointé, sinon planifié), futur (jour pas encore passé), incomplet (pointage sans fin)}],
        soldes:{report, recup} (h disponibles avant la semaine ; null = compteur pas suivi à cette date), repl (h replacées à la main sur la semaine, déjà sorties du compteur),
        placer (choix « reporter » en cours : le compteur à reporter se replace sur les semaines pas pleines),
        main:{mode:'auto'|'reel'|'main', h:[6 h | null] (mode main), off:[jours retirés du lissage], on:[jours ajoutés], comble:false (ne pas compléter), force:true (valider
              la semaine telle quelle malgré un jour sans pointage), motif, by, at} | null}
   États : lisse · main (heures saisies à la main) · reel (lissage retiré à la main) · encours · vide · incomplet (jour attendu sans pointage ni absence) · sansjour. */
export function lisserSemaine(o){o=o||{};const C=+o.contrat>0?+o.contrat:CONTRAT_H;const M=o.main||null;const mode=M&&M.mode?M.mode:'auto';
  const OFF=new Set((M&&M.off)||[]),ON=new Set((M&&M.on)||[]);const ok=v=>v!==null&&v!==undefined&&v!==''&&isFinite(+v);
  const J=[0,1,2,3,4,5].map(i=>{const x=(o.jours||[])[i]||{};const d=x.d||addDay(o.mon,i);const h=ok(x.h)&&+x.h>0?r2(+x.h):null;
    return {i,d,reel:h,it:r2(Math.max(0,+x.it||0)),plan:!!x.plan,ferie:!!x.ferie,abs:x.abs||null,sites:(x.sites||[]).filter(Boolean),futur:!!x.futur,incomplet:!!x.incomplet,wd:i<5,st:h!==null?'pointe':x.ferie?'ferie':x.abs?'abs':''};});
  /* pont : jour non travaillé entre le week-end et un férié (lundi avant un mardi férié, vendredi après un jeudi férié) */
  if(!J[0].st&&J[1].st==='ferie')J[0].st='pont';if(!J[4].st&&J[3].st==='ferie')J[4].st='pont';
  J.forEach(x=>{x.liss=x.wd&&(x.st==='pointe'||x.st==='');if(x.wd&&ON.has(x.d))x.liss=true;if(OFF.has(x.d))x.liss=false;});
  const reel=r2(J.reduce((s,x)=>s+(x.reel||0),0)),it=r2(J.reduce((s,x)=>s+x.it,0));
  const L=J.filter(x=>x.liss);const n=L.length;const cap=r2(Math.min(HEBDO_MAX,HMAX_J*n));const cible=r2(C/5*n);
  /* jour attendu au travail, passé, sans pointage ni absence : du lundi au jeudi toujours ; le vendredi seulement si la semaine n'a pas déjà ses heures (rythme 4 jours) */
  const trous=J.filter(x=>x.wd&&!x.futur&&(x.incomplet||(x.st===''&&x.plan&&(x.i<4||reel<cible))));
  const force=!!(M&&M.force);
  const etat=mode==='reel'?'reel':mode==='main'&&M&&Array.isArray(M.h)?'main':J.some(x=>x.futur)&&!force?'encours':!(reel>0)?'vide':trous.length&&!force?'incomplet':!n?'sansjour':'lisse';
  const jours=J.map(x=>({d:x.d,i:x.i,reel:x.reel,it:x.it,h:null,st:x.st,liss:x.liss,plan:x.plan,site:x.sites[0]||null,emprunt:false,
    lab:x.st==='ferie'?'FÉRIÉ':x.st==='pont'?'PONT':x.st==='abs'?String(x.abs).toLocaleUpperCase('fr-FR'):''}));
  let declare=0,versReport=0,versReportMaj=0,R=[];
  if(etat==='lisse'){const Tl=r2(Math.min(reel,cap));versReport=r2(reel-Tl);versReportMaj=versReport>0?majRang(Tl,reel,C):0;R=repartir(Tl,n);let k=0;jours.forEach(j=>{if(j.liss)j.h=R[k++];});declare=Tl;
    /* le chantier d'un jour lissé non travaillé : celui du jour travaillé d'avant (le vendredi prend celui du jeudi), sinon celui d'après */
    jours.forEach((j,i)=>{if(!j.liss||j.reel!==null)return;let s=null;for(let q=i-1;q>=0&&!s;q--)if(jours[q].reel!==null&&jours[q].site)s=jours[q].site;for(let q=i+1;q<6&&!s;q++)if(jours[q].reel!==null&&jours[q].site)s=jours[q].site;if(s){j.site=s;j.emprunt=true;}});}
  else if(etat==='main'){jours.forEach((j,i)=>{const v=M.h[i];j.h=ok(v)&&+v>0?r2(+v):null;});declare=r2(jours.reduce((s,j)=>s+(j.h||0),0));if(reel>declare){versReport=r2(reel-declare);versReportMaj=majRang(declare,reel,C);}}
  else{jours.forEach(j=>{j.h=j.reel;});declare=reel;if(reel>HEBDO_MAX){versReport=r2(reel-HEBDO_MAX);versReportMaj=majRang(HEBDO_MAX,reel,C);}} /* comme avant : au-delà de 48 h → à reporter */
  /* compteurs : d'abord le compteur à reporter, puis le compteur d'heures */
  const settled=etat==='lisse'||etat==='main'||etat==='reel';const so=o.soldes||{};const known=ok(so.report)||ok(so.recup);
  let rR=ok(so.report)?Math.max(0,+so.report):0,rC=ok(so.recup)?Math.max(0,+so.recup):0;
  const tire=need=>{const a=r2(Math.min(need,rR));rR=r2(rR-a);const b=r2(Math.min(r2(need-a),rC));rC=r2(rC-b);return [a,b,r2(need-a-b)];};
  const couv=etat==='main'?r2(Math.max(0,declare-reel)):0;const [couvReport,couvRecup,manqueCouv]=couv>0?tire(couv):[0,0,0];
  const repl=r2(+o.repl||0);const total0=r2(declare+repl);
  const besoin=settled&&!(M&&M.comble===false)?r2(Math.max(0,cible-total0)):0;const [deReport,deRecup,manque]=besoin>0?tire(besoin):[0,0,0];
  let place=0;if(settled&&o.placer&&rR>0){const room=r2((etat==='reel'?HEBDO_MAX:cap)-(total0+deReport+deRecup));if(room>0){place=r2(Math.min(rR,room));rR=r2(rR-place);}}
  const total=r2(total0+deReport+deRecup+place);const sp=hsSplit(Math.min(total,HEBDO_MAX),C);
  /* ── l'explication ── */
  const E=[];const hv=v=>v===null||v===undefined?'—':fx(v);
  E.push('Pointé : '+J.map(x=>JC[x.i]+' '+hv(x.reel)).join(' · ')+' = '+fx(reel)+' h'+(it?' · inter-chantier '+fx(it)+' h, payées à part à 100 % (jamais majorées)':''));
  const ex=J.filter(x=>x.wd&&(x.st==='ferie'||x.st==='pont'||x.st==='abs'||(OFF.has(x.d))||(ON.has(x.d)&&x.st!=='pointe'&&x.st!=='')));
  if(ex.length)E.push(ex.map(x=>JNOM[x.i]+' '+jdm(x.d)+' : '+(ON.has(x.d)?'lissé quand même (à la main)':OFF.has(x.d)?'retiré du lissage (à la main)':x.st==='ferie'?'férié':x.st==='pont'?'pont (entre le week-end et le férié), pas lissé':String(x.abs).toLowerCase()+', pas lissé')).join(' · '));
  if(etat==='lisse'){const base=R.length?R[0]:0;const resteJ=jours.filter(j=>j.liss&&j.h!==base);
    E.push('Lissé sur '+n+' jour'+(n>1?'s':'')+' ('+L.map(x=>JC[x.i]).join(' ')+') au pas de ½ h : '+fx(base)+' h par jour'+(resteJ.length?', le reste sur '+resteJ.map(j=>JNOM[j.i]).join(' et ')+' ('+resteJ.map(j=>fx(j.h)+' h').join(', ')+')':'')+' — 12 h par jour au plus.');
    const em=jours.filter(j=>j.emprunt);if(em.length)E.push(em.map(j=>JNOM[j.i].charAt(0).toUpperCase()+JNOM[j.i].slice(1)+' non travaillé : chantier '+(j.i===4?'du jeudi':'du jour travaillé le plus proche')+' ('+(j.site&&j.site.nom||'?')+')').join(' · ')+'.');
    if(versReport>0)E.push('Plafond '+fx(cap)+' h ('+(cap<HEBDO_MAX?'12 h × '+n+' j':HMAX_J*n===HEBDO_MAX?'48 h par semaine = 12 h × '+n+' j':'48 h par semaine')+') : '+fx(versReport)+' h au-delà ('+(Math.floor(declare)+1)+'e → '+Math.ceil(reel)+'e heure), majorées selon leur rang = '+fx(versReportMaj)+' h au compteur à reporter.');}
  else if(etat==='main')E.push('Heures saisies à la main'+(M.by?' par '+M.by:'')+(M.at?' le '+jdm(M.at)+'/'+String(M.at).slice(0,4):'')+(M.motif?' — '+M.motif:'')+' : '+jours.map(j=>JC[j.i]+' '+hv(j.h)).join(' · ')+' = '+fx(declare)+' h'+(versReport>0?' ; '+fx(versReport)+' h pointées en plus → '+fx(versReportMaj)+' h au compteur à reporter (majorées selon leur rang)':'')+'.');
  else if(etat==='reel')E.push('Lissage retiré à la main'+(M.by?' par '+M.by:'')+(M.motif?' — '+M.motif:'')+' : les heures réelles jour par jour.'+(versReport>0?' Au-delà de 48 h : '+fx(versReport)+' h → '+fx(versReportMaj)+' h au compteur à reporter.':''));
  else if(etat==='encours')E.push('Semaine en cours : elle sera lissée quand elle sera finie (heures réelles en attendant).');
  else if(etat==='vide')E.push(J.some(x=>x.wd&&x.plan&&!x.futur)?'Rien de pointé alors que des jours étaient planifiés : à vérifier (absence à déclarer, pointage à saisir).':'Rien de pointé cette semaine.');
  else if(etat==='incomplet')E.push('Lissage en attente : '+trous.map(x=>JNOM[x.i]+' '+jdm(x.d)+(x.incomplet?' (pointage sans fin)':' (attendu, sans pointage ni absence)')).join(', ')+'. Complète le pointage, déclare l\'absence, ou valide la semaine telle quelle.');
  else if(etat==='sansjour')E.push('Aucun jour de semaine à lisser (absences, fériés) : heures réelles.');
  if(couv>0)E.push('Heures saisies au-delà du pointé : '+fx(couv)+' h'+(couvReport?' · '+fx(couvReport)+' h prises au compteur à reporter':'')+(couvRecup?' · '+fx(couvRecup)+' h prises au compteur d\'heures':'')+(manqueCouv>0?' · ⚠ '+fx(manqueCouv)+' h non couvertes':'')+'.');
  if(repl)E.push(fx(repl)+' h replacées à la main depuis le compteur à reporter.');
  if(besoin>0)E.push('Objectif '+fx(cible)+' h ('+fx(C)+' h de contrat'+(n<5?' sur '+n+' jour'+(n>1?'s':''):'')+') : il manque '+fx(besoin)+' h'+(deReport?' → '+fx(deReport)+' h prises au compteur à reporter':'')+(deRecup?(deReport?', ':' → ')+fx(deRecup)+' h prises au compteur d\'heures':'')+(manque>0?(known?' — ⚠ '+fx(manque)+' h non couvertes, compteurs vides : faire poser du sans solde':' — ⚠ '+fx(manque)+' h à couvrir : compteurs pas encore suivis à cette date'):'')+'.');
  else if(settled&&M&&M.comble===false&&cible>total0)E.push('Semaine sous l\'objectif ('+fx(total0)+' h / '+fx(cible)+' h) laissée telle quelle (à la main).');
  if(place)E.push('Choix « reporter » : '+fx(place)+' h du compteur à reporter replacées sur cette semaine (pas pleine à '+fx(etat==='reel'?HEBDO_MAX:cap)+' h).');
  E.push('Total de la semaine : '+fx(total)+' h'+(sp.hs125||sp.hs150?' → heures sup : '+[sp.hs125?fx(sp.hs125)+' h à 125 %':'',sp.hs150?fx(sp.hs150)+' h à 150 %':''].filter(Boolean).join(' · '):' (pas d\'heures sup)')+'.');
  if(M&&M.by&&etat!=='main'&&etat!=='reel'&&(M.off||M.on||M.force||M.comble===false))E.push('Réglé à la main par '+M.by+(M.at?' le '+jdm(M.at)+'/'+String(M.at).slice(0,4):'')+(M.motif?' — '+M.motif:'')+'.');
  const flags=[];if(versReport>0)flags.push('plafond');if(deReport||deRecup)flags.push('comble');if(manque>0||manqueCouv>0)flags.push(known?'sansSolde':'soldeInconnu');if(etat==='incomplet')flags.push('incomplet');
  if(M&&(M.mode&&M.mode!=='auto'||M.off||M.on||M.force||M.comble===false))flags.push('main');if(it)flags.push('inter');if(place)flags.push('place');if(J.some(x=>x.st==='abs'))flags.push('absence');if(J.some(x=>x.st==='ferie'||x.st==='pont'))flags.push('ferie');
  if(etat==='vide'&&J.some(x=>x.wd&&x.plan&&!x.futur))flags.push('rien');
  return {mon:o.mon,etat,etatTxt:ETATS[etat],jours,reel,it,n,cap,cible,declare,versReport,versReportMaj,repl,couvReport,couvRecup,manqueCouv,deReport,deRecup,manque,place,total,
    hs125:sp.hs125,hs150:sp.hs150,trous:trous.map(x=>x.d),main:M,expl:E,flags,known};}
