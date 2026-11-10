/* affaire_css.js — 10/11 (module Tracé Affaire, lot A) : feuilles de la maquette validée (kit Tracé « tr- » + affaire.css), injectées une fois ; sélecteurs globaux de la maquette (html, body, *) portés par .af-root pour ne rien changer au reste de l'appli. Polices Barlow : déjà servies par l'appli. */
let done=false;
export function cssAffaire(){if(done||typeof document==='undefined')return;done=true;const s=document.createElement('style');s.id='af-css';s.textContent=CSS;document.head.appendChild(s);}
const CSS=String.raw`
/* Tracé · kit d'interface terrain. Classes préfixées tr-. Valeurs de repli = thème Terrain. */
.tr-root{font-family:var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre, #1B1530);font-size:17px;line-height:1.4;-webkit-font-smoothing:antialiased;background:var(--fond, #F5F4FA);padding:16px;box-sizing:border-box}
.tr-root *{box-sizing:border-box}
.tr-col{display:flex;flex-direction:column;gap:12px}
.tr-rang{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.tr-ico{width:24px;height:24px;flex-shrink:0;display:block}
/* Bouton */
.tr-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:var(--cible-terrain,56px);padding:0 22px;border-radius:var(--rayon-champ,12px);border:2px solid transparent;font:700 18px/22px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);cursor:pointer;-webkit-tap-highlight-color:transparent;text-decoration:none;white-space:nowrap}
.tr-btn--principal{background:var(--nuit, #2B1B5A);color:var(--sur-nuit,#FFFFFF)}
.tr-btn--secondaire{background:var(--carte, #FFFFFF);color:var(--nuit, #2B1B5A);border-color:var(--nuit, #2B1B5A)}
.tr-btn--danger{background:var(--bloque, #A3221F);color:var(--sur-nuit,#FFFFFF)}
.tr-btn--discret{background:transparent;color:var(--violet, #5E46B8);padding:0 12px;text-decoration:underline;text-underline-offset:3px}
.tr-btn--critique{min-height:var(--cible-critique,64px);width:100%;font-size:20px;border-radius:var(--rayon-carte,14px)}
.tr-btn--icone{width:var(--cible-min,48px);min-height:var(--cible-min,48px);padding:0;background:var(--lavande-pale, #E6E1F6);color:var(--nuit, #2B1B5A)}
.tr-btn:disabled,.tr-btn[aria-disabled="true"]{background:var(--fond, #F5F4FA);color:var(--encre-2, #57526B);border-color:var(--trait, #DDD8EA);cursor:not-allowed}
.tr-btn:focus-visible,.tr-champ__saisie:focus-visible,.tr-compteur button:focus-visible,.tr-ligne:focus-visible,.tr-onglet:focus-visible{outline:3px solid var(--focus, #5E46B8);outline-offset:2px}
.tr-btn__rond{width:22px;height:22px;border-radius:50%;border:3px solid currentColor;border-right-color:transparent;animation:tr-tourne .8s linear infinite}
@keyframes tr-tourne{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.tr-btn__rond{animation:none}}
/* Champ */
.tr-champ{display:flex;flex-direction:column;gap:6px}
.tr-champ__libelle{font:600 15px/20px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre, #1B1530)}
.tr-champ__saisie{min-height:var(--cible-terrain,56px);border:2px solid var(--trait-fort, #8E87A6);border-radius:var(--rayon-champ,12px);padding:0 16px;font:500 18px/24px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);background:var(--carte, #FFFFFF);color:var(--encre, #1B1530);width:100%}
.tr-champ__saisie::placeholder{color:var(--encre-2, #57526B)}
.tr-champ__aide{font:500 14px/19px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre-2, #57526B)}
.tr-champ--erreur .tr-champ__saisie{border-color:var(--bloque, #A3221F)}
.tr-champ__erreur{display:flex;gap:6px;align-items:center;font:700 15px/20px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--bloque, #A3221F)}
.tr-champ__erreur .tr-ico{width:18px;height:18px}
/* Compteur */
.tr-compteur{display:inline-flex;align-items:stretch;border:2px solid var(--trait-fort, #8E87A6);border-radius:var(--rayon-champ,12px);overflow:hidden;background:var(--carte, #FFFFFF)}
.tr-compteur button{width:64px;min-height:var(--cible-terrain,56px);border:0;background:var(--lavande-pale, #E6E1F6);color:var(--nuit, #2B1B5A);display:flex;align-items:center;justify-content:center;cursor:pointer}
.tr-compteur output{min-width:96px;display:flex;align-items:center;justify-content:center;gap:4px;font:700 28px/1 var(--font-titre, 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif);color:var(--encre, #1B1530)}
.tr-compteur output small{font:600 15px/1 var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre-2, #57526B)}
/* Pastille */
.tr-pastille{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 12px 0 9px;border-radius:var(--rayon-pastille,999px);font:700 14px/1 var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);white-space:nowrap}
.tr-pastille .tr-ico{width:17px;height:17px}
.tr-pastille--ok{background:var(--ok-fond, #DDF1EC);color:var(--ok, #0E6B5C)}
.tr-pastille--en-cours,.tr-pastille--a-valider{background:var(--attention-fond, #FFF0D2);color:var(--attention, #7A4A00)}
.tr-pastille--bloque{background:var(--bloque-fond, #FBE6E4);color:var(--bloque, #A3221F)}
.tr-pastille--horsligne{background:var(--horsligne-fond, #ECEAF2);color:var(--horsligne, #4A4560)}
.tr-pastille--info{background:var(--lavande-pale, #E6E1F6);color:var(--nuit, #2B1B5A)}
/* Alerte */
.tr-alerte{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:var(--rayon-carte,14px);border:2px solid currentColor}
.tr-alerte__corps{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;color:var(--encre, #1B1530)}
.tr-alerte__titre{font:700 17px/22px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif)}
.tr-alerte__texte{font:500 15px/21px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif)}
.tr-alerte__actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.tr-alerte__actions .tr-btn{min-height:48px;padding:0 16px;font-size:16px}
.tr-alerte--ok{background:var(--ok-fond, #DDF1EC);color:var(--ok, #0E6B5C)}
.tr-alerte--attention{background:var(--attention-fond, #FFF0D2);color:var(--attention, #7A4A00)}
.tr-alerte--bloque{background:var(--bloque-fond, #FBE6E4);color:var(--bloque, #A3221F)}
.tr-alerte--horsligne{background:var(--horsligne-fond, #ECEAF2);color:var(--horsligne, #4A4560)}
.tr-alerte--info{background:var(--lavande-pale, #E6E1F6);color:var(--nuit, #2B1B5A)}
.tr-alerte--ok .tr-alerte__titre{color:var(--ok, #0E6B5C)}.tr-alerte--attention .tr-alerte__titre{color:var(--attention, #7A4A00)}.tr-alerte--bloque .tr-alerte__titre{color:var(--bloque, #A3221F)}.tr-alerte--horsligne .tr-alerte__titre{color:var(--horsligne, #4A4560)}.tr-alerte--info .tr-alerte__titre{color:var(--nuit, #2B1B5A)}
/* Carte chantier */
.tr-carte{background:var(--carte, #FFFFFF);border:1px solid var(--trait, #DDD8EA);border-radius:var(--rayon-carte,14px);padding:16px;display:flex;flex-direction:column;gap:12px}
.tr-carte__tete{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.tr-carte__titre{font:700 20px/24px var(--font-titre, 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif);color:var(--encre, #1B1530)}
.tr-carte__lieu{font:500 15px/20px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre-2, #57526B)}
.tr-carte__chiffres{display:flex;align-items:baseline;gap:8px;color:var(--encre, #1B1530)}
.tr-carte__chiffres b{font:700 34px/36px var(--font-titre, 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif)}
.tr-carte__chiffres span{font:600 15px/20px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre-2, #57526B)}
.tr-jauge{height:10px;border-radius:var(--rayon-pastille,999px);background:var(--lavande-pale, #E6E1F6);overflow:hidden}
.tr-jauge>span{display:block;height:100%;border-radius:inherit;background:var(--nuit, #2B1B5A)}
/* Ligne */
.tr-liste{background:var(--carte, #FFFFFF);border:1px solid var(--trait, #DDD8EA);border-radius:var(--rayon-carte,14px);overflow:hidden}
.tr-ligne{display:flex;align-items:center;gap:14px;min-height:64px;padding:8px 14px;border-bottom:1px solid var(--trait, #DDD8EA);color:var(--encre, #1B1530);text-decoration:none;background:var(--carte, #FFFFFF)}
.tr-ligne:last-child{border-bottom:0}
.tr-ligne__tuile{width:44px;height:44px;flex-shrink:0;border-radius:11px;background:var(--lavande-pale, #E6E1F6);color:var(--nuit, #2B1B5A);display:flex;align-items:center;justify-content:center}
.tr-ligne__texte{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.tr-ligne__titre{font:700 17px/22px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tr-ligne__sous{font:500 14px/19px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre-2, #57526B);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tr-ligne__fin{display:flex;align-items:center;gap:8px;color:var(--encre-2, #57526B)}
.tr-ligne--choisie{background:var(--lavande-pale, #E6E1F6)}
/* Bandeau du haut */
.tr-haut{height:56px;display:flex;align-items:center;gap:10px;padding:0 14px;background:var(--carte, #FFFFFF);border-bottom:3px solid var(--nuit, #2B1B5A)}
.tr-haut__nom{font:700 22px/26px var(--font-titre, 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif);color:var(--nuit, #2B1B5A);white-space:nowrap}
.tr-haut__nom span{font-weight:500;color:var(--violet, #5E46B8)}
.tr-haut__entreprise{margin-left:auto;max-width:112px;height:36px;display:flex;align-items:center;justify-content:flex-end;font:700 14px/1 var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre-2, #57526B)}
.tr-haut__entreprise img{max-width:112px;max-height:36px;object-fit:contain}
/* Onglets */
.tr-onglets{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);height:var(--cible-onglet,72px);background:var(--carte, #FFFFFF);border-top:1px solid var(--trait, #DDD8EA)}
.tr-onglet{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--encre-2, #57526B);font:600 12px/14px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);text-decoration:none;background:transparent;border:0}
.tr-onglet__pilule{width:56px;height:32px;border-radius:var(--rayon-pastille,999px);display:flex;align-items:center;justify-content:center}
.tr-onglet--actif{color:var(--nuit, #2B1B5A);font-weight:700}
.tr-onglet--actif .tr-onglet__pilule{background:var(--lavande-pale, #E6E1F6)}
/* Feuille */
.tr-feuille{background:var(--carte, #FFFFFF);border-radius:var(--rayon-feuille,20px) var(--rayon-feuille,20px) 0 0;box-shadow:var(--ombre-feuille,0 -8px 24px rgba(43,27,90,0.18));padding:8px 16px 16px;display:flex;flex-direction:column;gap:8px}
.tr-feuille__poignee{width:44px;height:5px;border-radius:999px;background:var(--trait-fort, #8E87A6);align-self:center;margin:4px 0 6px}
.tr-feuille__titre{font:700 20px/24px var(--font-titre, 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif);color:var(--encre, #1B1530);padding:0 2px 4px}
.tr-choix{display:flex;align-items:center;gap:14px;min-height:var(--cible-critique,64px);padding:0 14px;border:2px solid var(--trait, #DDD8EA);border-radius:var(--rayon-champ,12px);font:600 17px/22px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--encre, #1B1530);background:var(--carte, #FFFFFF)}
.tr-choix__rond{width:26px;height:26px;border-radius:50%;border:2px solid var(--trait-fort, #8E87A6);flex-shrink:0;display:flex;align-items:center;justify-content:center}
.tr-choix--choisi{border-color:var(--nuit, #2B1B5A);background:var(--lavande-pale, #E6E1F6)}
.tr-choix--choisi .tr-choix__rond{border-color:var(--nuit, #2B1B5A);background:var(--nuit, #2B1B5A);color:var(--sur-nuit,#FFFFFF)}
.tr-choix--choisi .tr-choix__rond .tr-ico{width:16px;height:16px}
/* Confirmation et message Annuler */
.tr-confirm{background:var(--carte, #FFFFFF);border:1px solid var(--trait, #DDD8EA);border-radius:var(--rayon-carte,14px);padding:18px 16px 16px;display:flex;flex-direction:column;gap:12px}
.tr-confirm__titre{font:700 20px/24px var(--font-titre, 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif);color:var(--encre, #1B1530)}
.tr-confirm__detail{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:var(--rayon-champ,12px);background:var(--fond, #F5F4FA);font:500 16px/22px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif)}
.tr-confirm__detail b{font-weight:700}
.tr-message{display:flex;align-items:center;gap:12px;min-height:56px;padding:0 6px 0 16px;border-radius:var(--rayon-carte,14px);background:var(--encre, #1B1530);color:#FFFFFF;box-shadow:var(--ombre-flottant,0 6px 18px rgba(43,27,90,0.22));font:600 16px/21px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif)}
.tr-message .tr-ico{color:#BFB2EE}
.tr-message span{flex:1}
.tr-message button{min-height:48px;padding:0 16px;border:0;border-radius:10px;background:transparent;color:#BFB2EE;font:700 16px/1 var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);text-decoration:underline;text-underline-offset:3px}
/* Photo */
.tr-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.tr-photo{min-height:112px;border:2px dashed var(--trait-fort, #8E87A6);border-radius:var(--rayon-carte,14px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--nuit, #2B1B5A);font:700 15px/19px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);background:var(--carte, #FFFFFF);text-align:center;padding:8px}
.tr-photo .tr-ico{width:30px;height:30px}
.tr-photo--prise{border-style:solid;border-color:var(--trait, #DDD8EA);background:linear-gradient(135deg,#6F6390 0%,#3A2F5E 100%);color:#FFFFFF;justify-content:flex-end;align-items:flex-start;font:600 13px/16px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif)}
/* Icônes de module */
.tr-modules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.tr-module{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;border:1px solid var(--trait, #DDD8EA);border-radius:var(--rayon-carte,14px);background:var(--carte, #FFFFFF);font:700 14px/18px var(--font-texte, Barlow, 'Segoe UI', system-ui, sans-serif);color:var(--nuit, #2B1B5A)}
.tr-module__tuile{width:52px;height:52px;border-radius:13px;background:var(--nuit, #2B1B5A);color:var(--sur-nuit,#FFFFFF);display:flex;align-items:center;justify-content:center}
.tr-module__tuile .tr-ico{width:30px;height:30px}

/* Tracé Affaire — maquette. Mise en page bureau (PC) par-dessus le kit Tracé (classes tr-). */
:root{--af-nav:236px}
.af-root{font-family:var(--font-texte,Barlow,'Segoe UI',system-ui,sans-serif);color:var(--encre,#1B1530);font-size:16px;line-height:1.4;-webkit-font-smoothing:antialiased;background:var(--fond,#F5F4FA)}
.af-root *{box-sizing:border-box}
:where(.af-root) button,:where(.af-root) input,:where(.af-root) select,:where(.af-root) textarea{font:inherit} /* même poids que la règle « button{font:inherit} » de la maquette : .tr-btn garde son gras */
/* thème Terrain du kit, posé explicitement : l'appli définit déjà --ok, --nuit, --violet… avec d'autres valeurs */
.af-root{--encre:#1B1530;--encre-2:#57526B;--nuit:#2B1B5A;--violet:#5E46B8;--fond:#F5F4FA;--carte:#FFFFFF;--trait:#DDD8EA;--trait-fort:#8E87A6;--ok:#0E6B5C;--ok-fond:#DDF1EC;--attention:#7A4A00;--attention-fond:#FFF0D2;--bloque:#A3221F;--bloque-fond:#FBE6E4;--horsligne:#4A4560;--horsligne-fond:#ECEAF2;--lavande-pale:#E6E1F6;--focus:#5E46B8;--sur-nuit:#FFFFFF;--rayon-carte:14px;--rayon-champ:12px;--rayon-feuille:20px;--rayon-pastille:999px;--cible-terrain:56px;--cible-min:48px;--cible-critique:64px;--cible-onglet:72px;--ombre-feuille:0 -8px 24px rgba(43,27,90,0.18);--ombre-flottant:0 6px 18px rgba(43,27,90,0.22);--font-texte:Barlow,'Segoe UI',system-ui,sans-serif;--font-titre:'Barlow Semi Condensed','Arial Narrow',system-ui,sans-serif}
.af-chiffre,.af-table td.n,.af-kpi b{font-variant-numeric:tabular-nums}
/* Cadre */
.af-haut{position:sticky;top:0;z-index:20}
.af-haut .tr-haut{gap:14px}
.af-logo{width:32px;height:32px;flex-shrink:0}
.af-qui{margin-left:auto;display:flex;align-items:center;gap:8px;font:600 14px/1 var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B)}
.af-qui select{min-height:40px;border:2px solid var(--trait-fort,#8E87A6);border-radius:10px;padding:0 10px;background:#fff;color:var(--encre,#1B1530);font-weight:600}
.af-cadre{display:grid;grid-template-columns:var(--af-nav) minmax(0,1fr);min-height:60vh;margin:0 -14px}
.af-nav{background:var(--carte,#fff);border-right:1px solid var(--trait,#DDD8EA);padding:14px 10px;display:flex;flex-direction:column;gap:4px;position:sticky;top:64px;align-self:start;max-height:calc(100vh - 72px);overflow:auto}
.af-nav__titre{font:700 12px/16px var(--font-texte,Barlow,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:var(--encre-2,#57526B);margin:12px 10px 4px}
.af-nav button{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--encre,#1B1530);font-weight:600;text-align:left;cursor:pointer}
.af-nav button:hover{background:var(--fond,#F5F4FA)}
.af-nav button[aria-current="page"]{background:var(--lavande-pale,#E6E1F6);color:var(--nuit,#2B1B5A);font-weight:700}
.af-nav button .af-badge{margin-left:auto}
.af-nav__pied{margin-top:auto;font-size:13px;color:var(--encre-2,#57526B);padding:10px;border-top:1px solid var(--trait,#DDD8EA)}
.af-main{padding:20px 24px 80px;min-width:0}
.af-page{max-width:1400px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.af-titre{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.af-titre h1{margin:0;font:700 28px/32px var(--font-titre,'Barlow Semi Condensed',sans-serif);color:var(--encre,#1B1530)}
.af-titre .af-sous{color:var(--encre-2,#57526B);font-weight:500}
.af-titre .af-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.af-fil{font-size:14px;color:var(--encre-2,#57526B)}
.af-fil button{border:0;background:none;color:var(--violet,#5E46B8);text-decoration:underline;cursor:pointer;padding:0;font-weight:600}
/* Boutons compacts (bureau) */
.af-btn{min-height:44px;padding:0 16px;font-size:16px}
.af-btn-s{min-height:36px;padding:0 12px;font-size:14px;border-radius:9px}
.af-lien{border:0;background:none;color:var(--violet,#5E46B8);text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-weight:600;padding:0}
/* Cartes, tuiles, onglets */
.af-carte{background:var(--carte,#fff);border:1px solid var(--trait,#DDD8EA);border-radius:var(--rayon-carte,14px);padding:16px}
.af-carte h2{margin:0 0 10px;font:700 20px/24px var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.af-carte h3{margin:14px 0 8px;font:700 17px/22px var(--font-texte,Barlow,sans-serif)}
.af-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.af-kpi{background:var(--carte,#fff);border:1px solid var(--trait,#DDD8EA);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.af-kpi span{font:600 13px/17px var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B)}
.af-kpi b{font:700 26px/30px var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.af-kpi small{font-size:13px;color:var(--encre-2,#57526B)}
.af-kpi--ok b{color:var(--ok,#0E6B5C)}.af-kpi--bloque b{color:var(--bloque,#A3221F)}
.af-onglets{display:flex;gap:4px;flex-wrap:wrap;border-bottom:2px solid var(--trait,#DDD8EA)}
.af-onglets button{min-height:44px;padding:0 16px;border:0;background:transparent;font-weight:600;color:var(--encre-2,#57526B);border-bottom:3px solid transparent;margin-bottom:-2px;cursor:pointer}
.af-onglets button[aria-selected="true"]{color:var(--nuit,#2B1B5A);border-bottom-color:var(--nuit,#2B1B5A);font-weight:700}
.af-filtres{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.af-filtres label{display:flex;align-items:center;gap:6px;font:600 14px/1 var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B)}
.af-filtres select,.af-filtres input{min-height:40px;border:2px solid var(--trait-fort,#8E87A6);border-radius:10px;padding:0 10px;background:#fff;font-weight:600;color:var(--encre,#1B1530)}
/* Tableaux */
.af-tabwrap{overflow:auto;background:var(--carte,#fff);border:1px solid var(--trait,#DDD8EA);border-radius:var(--rayon-carte,14px)}
.af-table{width:100%;border-collapse:collapse;font-size:15px}
.af-table th{position:sticky;top:0;background:var(--fond,#F5F4FA);text-align:left;font:700 13px/16px var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B);padding:10px;border-bottom:1px solid var(--trait,#DDD8EA);white-space:nowrap}
.af-table td{padding:9px 10px;border-bottom:1px solid var(--trait,#DDD8EA);vertical-align:middle}
.af-table tr:last-child td{border-bottom:0}
.af-table th.n,.af-table td.n{text-align:right;white-space:nowrap}
.af-table tbody tr.af-clic{cursor:pointer}
.af-table tbody tr.af-clic:hover td{background:#FAF9FD}
.af-table tfoot td{font-weight:700;background:var(--fond,#F5F4FA);border-top:2px solid var(--trait,#DDD8EA)}
.af-table .af-groupe td{background:var(--lavande-pale,#E6E1F6);color:var(--nuit,#2B1B5A);font-weight:700}
.af-table .af-sec{color:var(--encre-2,#57526B);font-size:13px}
.af-code{font:700 14px/1 var(--font-titre,'Barlow Semi Condensed',sans-serif);color:var(--violet,#5E46B8);white-space:nowrap}
.af-neg{color:var(--bloque,#A3221F)}.af-pos{color:var(--ok,#0E6B5C)}
.af-jauge{display:flex;align-items:center;gap:8px;min-width:120px}
.af-jauge .tr-jauge{flex:1;height:8px}
.af-badge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--nuit,#2B1B5A);color:#fff;font:700 12px/1 var(--font-texte,Barlow,sans-serif)}
.af-badge--att{background:var(--attention-fond,#FFF0D2);color:var(--attention,#7A4A00)}
.tr-pastille.af-pt{min-height:26px;font-size:13px}
/* Débours repliables */
.af-nat{border:1px solid var(--trait,#DDD8EA);border-radius:12px;background:#fff;margin-bottom:8px;overflow:hidden}
.af-nat>summary{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 14px;cursor:pointer;list-style:none;font-weight:700}
.af-nat>summary::-webkit-details-marker{display:none}
.af-nat>summary .af-chev{transition:transform .15s;color:var(--encre-2,#57526B)}
.af-nat[open]>summary .af-chev{transform:rotate(90deg)}
.af-nat>summary .af-montant{margin-left:auto;font:700 18px/1 var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.af-nat>summary .af-part{width:90px;height:6px;border-radius:99px;background:var(--lavande-pale,#E6E1F6);overflow:hidden}
.af-nat>summary .af-part>span{display:block;height:100%;background:var(--violet,#5E46B8)}
.af-nat .af-table{border-top:1px solid var(--trait,#DDD8EA)}
/* Étapes de facturation */
.af-etapes{display:flex;gap:4px}
.af-etape{width:36px;height:32px;border-radius:8px;border:2px solid var(--trait-fort,#8E87A6);background:#fff;display:flex;align-items:center;justify-content:center;font:700 10px/1 var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B);cursor:pointer;padding:0;letter-spacing:-.02em}
.af-etape--fait{background:var(--ok-fond,#DDF1EC);border-color:var(--ok,#0E6B5C);color:var(--ok,#0E6B5C)}
.af-etape:disabled{cursor:not-allowed;opacity:.75}
.af-etapes-tete{display:flex;gap:4px}
.af-etapes-tete span{width:36px;font:700 10px/11px var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B);text-align:center;white-space:normal}
/* Planning des équipements */
.af-plan td,.af-plan th{padding:0;border-right:1px solid var(--trait,#DDD8EA);text-align:center}
.af-plan th{padding:6px 2px;font-size:12px}
.af-plan th.we,.af-plan td.we{background:#EFEDF5}
.af-plan td.af-plan__eq{text-align:left;padding:8px 10px;white-space:nowrap;background:#fff;position:sticky;left:0;z-index:1}
.af-plan__case{width:100%;min-width:46px;height:44px;border:0;background:transparent;cursor:pointer;font:700 12px/1 var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.af-plan__case:hover{outline:2px solid var(--violet,#5E46B8);outline-offset:-2px}
.af-plan__case--sel{outline:3px solid var(--nuit,#2B1B5A)!important;outline-offset:-3px}
.af-c0{background:#E6E1F6;color:#2B1B5A}.af-c1{background:#DDF1EC;color:#0E5246}.af-c2{background:#FFE7C7;color:#6A3F00}.af-c3{background:#DCEBFA;color:#11416E}.af-c4{background:#F7DDE8;color:#6E1F44}.af-c5{background:#E8EDD5;color:#3B4A0E}.af-c6{background:#EADFD3;color:#4E3420}.af-c7{background:#D9F0F4;color:#0F4C57}
/* Fenêtre, message */
.af-voile{position:fixed;inset:0;background:rgba(27,21,48,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:50;overflow:auto}
.af-fenetre{background:#fff;border-radius:18px;max-width:620px;width:100%;padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px rgba(43,27,90,.3)}
.af-fenetre h2{margin:0;font:700 22px/26px var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.af-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.af-grille .plein{grid-column:1/-1}
.af-champ{display:flex;flex-direction:column;gap:5px}
.af-champ label{font:600 14px/18px var(--font-texte,Barlow,sans-serif)}
.af-champ input,.af-champ select,.af-champ textarea{min-height:44px;border:2px solid var(--trait-fort,#8E87A6);border-radius:10px;padding:0 12px;background:#fff;font-weight:500;color:var(--encre,#1B1530);width:100%}
.af-champ textarea{padding:8px 12px;min-height:70px}
.af-champ small{color:var(--encre-2,#57526B);font-size:13px}
.af-pied{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.af-aide{background:var(--lavande-pale,#E6E1F6);border-radius:10px;padding:10px 12px;font-size:14px;color:var(--nuit,#2B1B5A)}
.af-message{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:60;min-width:320px;max-width:90vw}
.af-note{font-size:13px;color:var(--encre-2,#57526B)}
.af-2col{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}
.af-vide{padding:24px;text-align:center;color:var(--encre-2,#57526B)}
.af-demo{background:var(--attention-fond,#FFF0D2);color:var(--attention,#7A4A00);font:700 12px/1 var(--font-texte,Barlow,sans-serif);padding:5px 8px;border-radius:6px}
@media (max-width:1000px){.af-cadre{grid-template-columns:1fr}.af-nav{position:static;height:auto;flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--trait,#DDD8EA)}.af-nav__titre,.af-nav__pied{display:none}.af-2col{grid-template-columns:1fr}.af-main{padding:14px}}

/* appli : l'espace impose 44 px aux boutons et champs (cibles tactiles) ; le module garde les tailles de la maquette (.tr-btn posent les leurs) */
.eq-app .af-root .af-fil button,.eq-app .af-root .af-lien,.eq-app .af-root input[type=checkbox],.eq-app .af-root .af-btn-s{min-height:0}.eq-app .af-root .af-btn-s{min-height:36px}.eq-app .af-root .tr-alerte__actions .tr-btn{min-height:48px}.eq-app .af-root .tr-message button{min-height:48px}
/* appli : les titres h3 de l'appli sont en petites capitales ; dans le module, un h3 est un titre ordinaire (comme la maquette) */
:where(.af-root) h3{font-size:1.17em;font-weight:700;text-transform:none;letter-spacing:0;color:inherit;margin:1em 0}
/* appli : le « ? » du tutoriel posé dans le titre d'un écran (app.js tuHelpInject) ne doit pas changer la hauteur du titre de la maquette */
.af-root .af-titre h1 .tuHelp{width:26px;height:26px;min-height:0;margin:3px 0 0 10px;vertical-align:top;font-size:14px;line-height:1}
/* appli : l'appli a déjà une classe .af-note (Commerce : filet à gauche) — ici celle de la maquette */
.af-root .af-note{border-left:0;padding-left:0}
/* appli : la fenêtre de la maquette vit dans la modale de l'appli ; téléphone : nav en ligne, tableaux défilants */
.af-root.af-in-modal{background:transparent}.af-root.af-in-modal .af-fenetre{box-shadow:none;max-width:none;width:100%;padding:0}
@media (max-width:900px){.af-cadre{grid-template-columns:1fr;margin:0}.af-nav{position:static;max-height:none;flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--trait,#DDD8EA)}.af-nav__titre{width:100%}.af-nav__pied{display:none}.af-main{padding:12px 0}}

`;
