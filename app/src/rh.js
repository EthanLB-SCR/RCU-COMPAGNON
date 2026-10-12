// rh.js — RÈGLES RH (nuit du 09 au 10/10/2026) : grands déplacements (livret d'accueil SCR § 2.7, 4 cas) et ancienneté / médailles.
// Hypothèses (à valider par Ethan, notées dans la feuille de route) : distance domicile → chantier = distance à vol d'oiseau entre la ville du domicile et le chantier
// (coordonnées du chantier, sinon sa ville) × 1,25 (route) ; « moins de 30 minutes » ≈ 35 km ; cycle des cas 3 et 4 (S1…S4) calé sur le n° de semaine ISO modulo 4.
export const GD_CAS=[
 {n:1,label:'Trajet quotidien (proximité)',crit:'moins de 30 min du chantier',max:35,prise:'trajets quotidiens domicile ↔ chantier + repas du midi sur place',ar:0},
 {n:2,label:'Grand déplacement',crit:'plus de 30 min et moins de 250 km',max:250,prise:'par semaine : 5 nuitées (dim. → jeu.), 10 repas (dim. soir → ven. midi), 15 € brut par aller-retour',ar:15,
  weeks:[{repas:[1,2,2,2,2,1,0],nuit:[1,1,1,1,1,0,0],ar:[0.5,0,0,0,0,0.5,0]}]},
 {n:3,label:'Très grand déplacement',crit:'plus de 250 km et moins de 500 km — détente 2 jours toutes les 2 semaines',max:500,prise:'sur 4 semaines : 24 nuitées, 48 repas, 30 € brut par aller-retour',ar:30,
  weeks:[{repas:[1,2,2,2,2,2,2],nuit:[1,1,1,1,1,1,1],ar:[0.5,0,0,0,0,0,0]},{repas:[2,2,2,2,2,1,0],nuit:[1,1,1,1,1,0,0],ar:[0,0,0,0,0,0.5,0]},{repas:[1,2,2,2,2,2,2],nuit:[1,1,1,1,1,1,1],ar:[0.5,0,0,0,0,0,0]},{repas:[2,2,2,2,2,1,0],nuit:[1,1,1,1,1,0,0],ar:[0,0,0,0,0,0.5,0]}]},
 {n:4,label:'Très grand déplacement',crit:'plus de 500 km — détente 3 jours toutes les 4 semaines',max:Infinity,prise:'sur 4 semaines : 25 nuitées, 50 repas, 50 € brut par aller-retour',ar:50,
  weeks:[{repas:[1,2,2,2,2,2,2],nuit:[1,1,1,1,1,1,1],ar:[0.5,0,0,0,0,0,0]},{repas:[2,2,2,2,2,2,2],nuit:[1,1,1,1,1,1,1],ar:[0,0,0,0,0,0,0]},{repas:[2,2,2,2,2,2,2],nuit:[1,1,1,1,1,1,1],ar:[0,0,0,0,0,0,0]},{repas:[2,2,2,2,1,0,0],nuit:[1,1,1,1,0,0,0],ar:[0,0,0,0,0.5,0,0]}]}];
export const GD_RAPPELS=['Interdit de passer la nuit dans son véhicule ou dans une base vie.','Hébergement et repas à moins de 30 km du chantier.','Tout salarié en déplacement est sous la responsabilité de l\'entreprise 24 h / 24 ; contrôles chaque semaine.','Véhicule de service : usage professionnel uniquement (dérogation écrite du responsable d\'exploitation).'];
export const ROUTE_FACTOR=1.25;
export const kmRoute=km=>Math.round(km*ROUTE_FACTOR);
export const minutesRoute=km=>Math.round(kmRoute(km)/70*60); /* 70 km/h de moyenne */
export function gdCase(kmVol){const km=kmRoute(kmVol);return GD_CAS.find(c=>km<=c.max)||GD_CAS[3];}
// semaine type (dim → sam) d'un cas, à la POSITION donnée dans le cycle de la personne (12/10, Ethan : « N déplacements d'affilée puis détente » — le cycle
// se compte par personne : semaines consécutives en déplacement, remis à zéro par une détente ; plus le n° de semaine du calendrier)
export const GD_CYCLE={3:2,4:4}; /* cas 3 : 2 semaines (pleine, puis retour vendredi = détente 2 j) ; cas 4 : 4 semaines (3 pleines, puis retour jeudi = détente 3 j) */
export function gdWeek(cas,idx){if(!cas.weeks)return null;const N=GD_CYCLE[cas.n]||1;const w=cas.weeks[cas.weeks.length===1?0:((+idx||0)%N+N)%N];return w;}
export const gdDetenteIdx=cas=>(GD_CYCLE[cas.n]||1)-1; /* position « détente » du cycle */
/* 13/10 soir (Ethan) : « en majorité les gars travaillent en 4 jours lundi → jeudi ; 4 ou 5 jours, ce sont toujours les mêmes règles : 220 km = 5 nuitées même s'il
   n'a travaillé que 4 jours ; les indemnités de déplacement ne se déclenchent qu'en cas de détente ; quand on dit 5 par semaine c'est dimanche soir, lundi soir…
   jusqu'à vendredi midi, 10 repas 5 nuits ; s'il est en congé la semaine d'après, il n'a pas sa nuit du dimanche ». D'où un calcul JOUR PAR JOUR (dim → sam) :
   · ARRIVÉE (la semaine d'avant s'est finie au domicile) : dimanche soir = repas du soir + nuitée + ½ A/R (aller) ; sinon (resté le week-end, cas 3 et 4) dimanche = 2 repas + nuitée ;
   · RETOUR (détente : chaque semaine en cas 2, la dernière du cycle en cas 3 et 4, ou exception) : vendredi (jeudi en cas 4) = repas du midi + ½ A/R (retour) ;
     sinon on reste le week-end : vendredi et samedi = 2 repas + nuitée, pas d'indemnité de trajet (pas de détente = pas de trajet) ;
   · 4 ou 5 jours travaillés = même forfait (le jeudi soir et le vendredi midi restent dus) ; semaine INCOMPLÈTE : arrivée la veille du 1er jour travaillé (lundi pas
     travaillé = pas de nuit du dimanche), départ après le dernier s'il tombe avant le jeudi ; une semaine sans jour travaillé = rien (pas de nuit du dimanche). */
export const GD_RETDAY={2:5,3:5,4:4}; /* jour du retour (0 = dimanche) : vendredi (cas 2, 3), jeudi (cas 4) */
const Z0=()=>({L:0,D:0,N:0,ar:0});
export function gdJours(cas,o){o=o||{};const n=cas&&cas.n;if(!n||n<2)return null;const RD=GD_RETDAY[n]||5;const arrival=o.arrival!==false,ret=o.ret!==false;
  const days=[0,1,2,3,4,5,6].map(x=>{const s=Z0();if(x===0){if(arrival){s.D=1;s.N=1;s.ar=0.5;}else{s.L=1;s.D=1;s.N=1;}}else if(x<RD){s.L=1;s.D=1;s.N=1;}else if(x===RD){if(ret){s.L=1;s.ar=0.5;}else{s.L=1;s.D=1;s.N=1;}}else if(!ret){s.L=1;s.D=1;s.N=1;}return s;});
  const tot=d=>({nuits:d.reduce((a,s)=>a+s.N,0),repas:d.reduce((a,s)=>a+s.L+s.D,0),ar:d.reduce((a,s)=>a+s.ar,0)});const full=tot(days);
  const W=Array.isArray(o.worked)&&o.worked.length===5?o.worked:[true,true,true,true,true];const wd=[1,2,3,4,5].filter((d,i)=>W[i]);
  if(!wd.length)return Object.assign({days:days.map(Z0),empty:true,full,arrival,ret,first:null,last:null},tot([]));
  const f=wd[0],l=wd[wd.length-1];let tail=false;
  if(arrival&&f>1){for(let x=0;x<=f-2;x++)days[x]=Z0();days[f-1]={L:0,D:1,N:1,ar:0.5};} /* lundi (mardi…) pas travaillé : arrivée la veille du 1er jour travaillé */
  if(l<4){for(let x=l+1;x<7;x++)days[x]=Z0();days[l]={L:1,D:0,N:0,ar:0.5};tail=true;} /* dernier jour travaillé avant le jeudi : départ après le repas du midi */
  return Object.assign({days,full,arrival,ret:ret||tail,tail,first:f,last:l},tot(days));}
// indemnités de la semaine : idx = position dans le cycle de la personne ; jours travaillés (booléens lun → ven, sans planning : semaine complète) ; opts.arrival / opts.ret
// (sinon déduits du cycle : arrivée en 1re semaine, retour en dernière ; en cas 2 les deux chaque semaine)
export function gdSemaine(cas,idx,joursPlanifies,opts){opts=opts||{};const N=GD_CYCLE[cas.n]||1;const i=((+idx||0)%N+N)%N;if(!cas||cas.n<2)return {cas:cas?cas.n:0,nuits:0,repas:0,ar:0,eur:0,jours:0,days:null,idx:i,cycle:N,detente:false};
  const jp=Array.isArray(joursPlanifies)&&joursPlanifies.length===5?joursPlanifies:[true,true,true,true,true];const n=jp.filter(Boolean).length;
  const arrival=opts.arrival!==undefined?!!opts.arrival:(N===1||i===0);const ret=opts.ret!==undefined?!!opts.ret:(N===1||i===N-1);
  const J=gdJours(cas,{arrival,ret,worked:jp});const out={cas:cas.n,jours:n,nuits:J.nuits,repas:J.repas,ar:J.ar,full:J.full,days:J.days,idx:i,cycle:N,detente:N>1&&ret,arrival,ret:J.ret,tail:J.tail,retWhy:opts.retWhy||(N>1&&ret?'cycle':'')};
  out.eur=Math.round(out.ar*cas.ar*100)/100;return out;}
/* jours fériés français (fixes + mobiles depuis Pâques) — un jour férié n'est travaillé que s'il est planifié EXPRÈS ce jour-là */
const FER={};export function frFeries(y){if(FER[y])return FER[y];const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  const E=new Date(y,mo-1,da);const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');const add=n2=>{const x=new Date(E);x.setDate(x.getDate()+n2);return iso(x);};
  FER[y]=new Set([y+'-01-01',y+'-05-01',y+'-05-08',y+'-07-14',y+'-08-15',y+'-11-01',y+'-11-11',y+'-12-25',add(1),add(39),add(50)]);return FER[y];}
export const isFerie=d=>!!d&&frFeries(+String(d).slice(0,4)).has(String(d).slice(0,10));
/* ── ancienneté & médailles ── */
export const PALIERS=[5,10,15,20,25,30,35,40];
export function anciennete(entree,ref){if(!entree)return null;const d=new Date(entree);if(isNaN(d))return null;const now=ref?new Date(ref):new Date();let y=now.getFullYear()-d.getFullYear();const m=now.getMonth()-d.getMonth();if(m<0||(m===0&&now.getDate()<d.getDate()))y--;
  const next=PALIERS.find(p=>p>y);const nextAt=next?new Date(d.getFullYear()+next,d.getMonth(),d.getDate()):null;const jours=nextAt?Math.round((nextAt-now)/864e5):null;
  return {ans:Math.max(0,y),next,nextAt:nextAt?nextAt.toISOString().slice(0,10):null,jours,medaille:y>=40?'grand or (40 ans)':y>=35?'or (35 ans)':y>=30?'vermeil (30 ans)':y>=20?'argent (20 ans)':null};}
