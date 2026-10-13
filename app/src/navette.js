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
//    HS à mettre en CET (cases à remplir par les RH), compteur fin de mois.
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
export function buildNavette(o){const ym=o.ym;const W=navWeeks(ym);const day=o.day||(()=>({}));const C=+o.contrat||CONTRAT_H;const lines=[];const weeks=[];const tot={hotel:0,idf:0,repas:0};const ar={2:0,3:0,4:0};
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
    for(let i=1;i<=5;i++){const x=X[i];const g=gdOfDay(x);add(x,g);const s=x.sites&&x.sites[0];const first=i===f;
      const km=s&&isFinite(+s.km)&&+s.km>0?(first?(+s.km)+' KM'+(cas>=2?'/GD':''):(s.nom!==main?(+s.km)+' KM':'')):'';
      const h=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):null;if(h!==null)total+=h;else if(x.worked)miss++;
      lines.push({kind:'day',d:x.d,j:JL[i],n:+x.d.slice(8),cas:first&&cas?'CAS '+cas:'',casN:cas,ar:arD[i]||0,...g,chantier:x.worked&&s?s.nom:(x.worked?'':(x.ferie?'FÉRIÉ':'')),hours:h,km,worked:!!x.worked});}
    {const x=X[6];const g=gdOfDay(x,wIdf);add(x,g);const hs=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):0;total+=hs;
      lines.push({kind:'sat',d:x.d,j:'S',n:+x.d.slice(8),...g,ar:arD[6]||0,casN:cas,wi,satHours:hs,label:'TOTAL SEMAINE - '+isoWeekNum(mon)});}
    total=r2(total);const tc=Math.min(total,HEBDO_MAX);weeks.push({mon,n:isoWeekNum(mon),cas,total,miss,hs125:r2(Math.min(Math.max(tc-C,0),HS125_MAX)),hs150:r2(Math.max(tc-C-HS125_MAX,0)),report:r2(Math.max(total-HEBDO_MAX,0)),main});});
  // dimanche qui suit la dernière semaine : ses heures sup (l'arrivée suivante appartient au mois suivant)
  let regulTo=null;if(W.length){const lastSun=addDay(W[W.length-1],6);lines.push({kind:'sun',d:lastSun,j:'D',n:+lastSun.slice(8),hotel:0,idf:0,repas:0,hsOf:W.length-1,tail:true});lines.push({kind:'hs150',hsOf:W.length-1});
    // jours du mois après ce dimanche : leur semaine compte le mois suivant (« Régul. HS et dépla. sur … »)
    const [y,m]=ym.split('-').map(Number);const last=iso(new Date(y,m,0,12));let d=addDay(lastSun,1);const nxt=MOIS_NAV[m%12].toLowerCase();let firstR=true;
    while(d<=last){const x=day(d)||{};const h=x.hours!==null&&x.hours!==undefined&&isFinite(+x.hours)?r2(+x.hours):null;lines.push({kind:'regul',d,j:JL[DT(d).getDay()],n:+d.slice(8),chantier:firstR?'Régul. HS et dépla. sur '+nxt:'',hours:h});if(firstR)regulTo=nxt;firstR=false;d=addDay(d,1);}}
  const hs={h125:r2(weeks.reduce((s,w)=>s+w.hs125,0)),h150:r2(weeks.reduce((s,w)=>s+w.hs150,0)),report:r2(weeks.reduce((s,w)=>s+w.report,0))};
  return {ym,mois:MOIS_NAV[+ym.slice(5)-1],annee:+ym.slice(0,4),nom:o.nom||'',prenom:o.prenom||'',adresse:o.adresse||'',contrat:C,weeks,lines,tot,ar,hs,regulTo,today:o.today||'',cpt:o.cpt||null};} /* cpt : soldes connus pour pré-remplir (recup, cet, report, prime) */
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
    if(L.kind==='hs150'){S('H'+R,'HEURES SUP - 150%','tdG');const sr=satRow[L.hsOf];S('I'+R,null,'hG','MAX(MIN(I'+sr+','+HEBDO_MAX+')-'+(N.contrat+HS125_MAX)+',0)');S('J'+R,null,'repG','MAX(I'+sr+'-'+HEBDO_MAX+',0)');hs150Rows.push(R);return;} /* J : heures au-delà de 48 h (« à reporter »), vide si 0 */
    S('C'+R,L.j,'tdj'+g);S('D'+R,L.n,'tdn'+g);
    if(L.kind==='sun'){num('E',L.hotel,'tdB'+g);num('F',L.idf,'tdB'+g);num('G',L.repas,'tdB'+g);
      if(L.hsOf!==null&&L.hsOf!==undefined){S('H'+R,'HEURES SUP - 125%','tdG');const sr=satRow[L.hsOf];S('I'+R,null,'hG','MIN(MAX(MIN(I'+sr+','+HEBDO_MAX+')-'+N.contrat+',0),'+HS125_MAX+')');hs125Rows.push(R);}return;}
    if(L.kind==='sat'){const mon=R-5;num('E',L.hotel,'td'+g);num('F',L.idf,'td'+g);num('G',L.repas,'td'+g);if(L.ar){S('B'+R,L.ar,'blueG');S('K'+R,L.casN,'hid');}
      S('H'+R,L.label,'tdG');S('I'+R,null,'hG','SUM(I'+mon+':I'+(R-1)+')'+(L.satHours?'+'+L.satHours:''));S('J'+R,'CONTRAT '+N.contrat+'H','tdG');return;}
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
  const cPrev=box('Compteur fin de mois précédent',N.cpt&&isFinite(+N.cpt.recup)?+N.cpt.recup:null,'bin');const cRec=box('Heures de récup. prises dans le mois',null,'bin');const cTot=box('Total',null,'bvB','I'+cPrev+'-I'+cRec,'bxR');r++;
  S('H'+r,'HS du mois','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const h125=box('NB HEURES 125%',null,'bv',hs125Rows.length?'SUM('+hs125Rows.map(x=>'I'+x).join(',')+')':'0');const h150=box('NB HEURES 150%',null,'bv',hs150Rows.length?'SUM('+hs150Rows.map(x=>'I'+x).join(',')+')':'0');
  const hTot=box('Total',null,'bvB','I'+h125+'+I'+h150,'bxR');const gTot=box('Total',null,'bvB','I'+cTot+'+I'+hTot,'bxR');S('J'+gTot,'>'+N.contrat+'h','b');r++;
  S('H'+r,'soit HS à payer dans le mois','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const p125=r,p150=r+1,pTot=r+2,ce0=pTot+3;
  box('NB HEURES 125%',null,'bin','I'+h125+'-I'+ce0);box('NB HEURES 150%',null,'bin','I'+h150+'-I'+(ce0+1));box('Total',null,'bvB','I'+p125+'+I'+p150,'bxR');r++;
  S('H'+r,'soit HS à mettre en CET','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);S('J'+r,'nb h','b');r++;
  const e125=box('NB HEURES 125%',0,'bin');const e150=box('NB HEURES 150%',0,'bin');const eTot=box('Total',null,'bvB','I'+e125+'+I'+e150,'bxR');r++;
  S('H'+r,'COMPTEUR FIN DE MOIS','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const cFin=box('Compteur fin de mois',null,'bvB','I'+cTot+'+I'+hTot+'-I'+pTot+'-I'+eTot);r++;
  // heures au-delà de 48 h par semaine : compteur « à reporter », vidable en prime (case verte = à remplir par les RH)
  S('H'+r,'HEURES À REPORTER (> '+HEBDO_MAX+' h / semaine)','bh');S('I'+r,null,'bh');merges.push('H'+r+':I'+r);r++;
  const rPrev=box('Compteur à reporter fin de mois précédent',N.cpt&&isFinite(+N.cpt.report)?+N.cpt.report:null,'bin');const rMois=box('Heures du mois au-delà de '+HEBDO_MAX+' h',null,'bv',hs150Rows.length?'SUM('+hs150Rows.map(x=>'J'+x).join(',')+')':'0');
  const rPrime=box('Payées en prime ce mois',N.cpt&&isFinite(+N.cpt.prime)?+N.cpt.prime:0,'bin');const rFin=box('Compteur à reporter fin de mois',null,'bvB','I'+rPrev+'+I'+rMois+'-I'+rPrime);
  r++;S('A'+r,'Pré-rempli par TRACÉ'+(N.today?' le '+N.today:'')+' (planning, pointage, grands déplacements) — à vérifier, compléter et signer. Cases vertes : à remplir par les RH.','note');merges.push('A'+r+':J'+r);
  return {name:name||(up(N.nom)+' '+up(N.prenom)).trim()||'Navette',cells,merges,heights,widths:[9,9,3,4,7,8,7,30,11,15,4],hidden:[11],fit:true,rows:r,
    refs:{first,lastRow,totRow,ind0,cPrev,cRec,cTot,h125,h150,hTot,gTot,p125,p150,pTot,e125,e150,eTot,cFin,rPrev,rMois,rPrime,rFin,satRow,hs125Rows,hs150Rows,dayRows}};}
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
