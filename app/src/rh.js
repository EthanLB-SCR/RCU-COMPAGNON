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
// semaine type (dim → sam) d'un cas, pour la semaine ISO donnée ; cas 3 / 4 : cycle S1…S4 selon le n° de semaine (hypothèse)
export function gdWeek(cas,weekNo){if(!cas.weeks)return null;const w=cas.weeks[cas.weeks.length===1?0:((weekNo||1)-1)%4];return w;}
// indemnités de la semaine : jours planifiés (tableau de booléens lun→ven) ; sans planning : semaine complète
export function gdSemaine(cas,weekNo,joursPlanifies){const w=gdWeek(cas,weekNo);if(!w)return {cas:cas.n,nuits:0,repas:0,ar:0,eur:0,jours:0};
  const jp=Array.isArray(joursPlanifies)&&joursPlanifies.length===5?joursPlanifies:[true,true,true,true,true];const n=jp.filter(Boolean).length;
  const full={nuits:w.nuit.reduce((a,b)=>a+b,0),repas:w.repas.reduce((a,b)=>a+b,0),ar:w.ar.reduce((a,b)=>a+b,0)};
  const k=n/5;const out={cas:cas.n,jours:n,nuits:Math.round(full.nuits*k),repas:Math.round(full.repas*k),ar:n?full.ar:0,full};out.eur=Math.round(out.ar*cas.ar*100)/100;return out;}
/* ── ancienneté & médailles ── */
export const PALIERS=[5,10,15,20,25,30,35,40];
export function anciennete(entree,ref){if(!entree)return null;const d=new Date(entree);if(isNaN(d))return null;const now=ref?new Date(ref):new Date();let y=now.getFullYear()-d.getFullYear();const m=now.getMonth()-d.getMonth();if(m<0||(m===0&&now.getDate()<d.getDate()))y--;
  const next=PALIERS.find(p=>p>y);const nextAt=next?new Date(d.getFullYear()+next,d.getMonth(),d.getDate()):null;const jours=nextAt?Math.round((nextAt-now)/864e5):null;
  return {ans:Math.max(0,y),next,nextAt:nextAt?nextAt.toISOString().slice(0,10):null,jours,medaille:y>=40?'grand or (40 ans)':y>=35?'or (35 ans)':y>=30?'vermeil (30 ans)':y>=20?'argent (20 ans)':null};}
