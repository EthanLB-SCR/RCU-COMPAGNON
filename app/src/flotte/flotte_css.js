/* flotte_css.js — 10/11 nuit (module Tracé Flotte, lot F1) : flotte.css de la maquette validée, porté par .fl-root (le cadre commun = affaire.css, déjà
   injecté par affaire/affaire_css.js et porté par .af-root : la rubrique Flotte est dans <div class="af-root fl-root">). Rien n'est changé au reste de l'appli. */
import {cssAffaire} from '../affaire/affaire_css.js';
let done=false;
export function cssFlotte(){cssAffaire();if(done||typeof document==='undefined')return;done=true;const s=document.createElement('style');s.id='fl-css';s.textContent=CSS;document.head.appendChild(s);}
const CSS=String.raw`
.fl-root .fl-badge--bad{background:var(--bloque,#A3221F)!important;color:#fff!important}
.fl-root .fl-sev--bad{color:var(--bloque,#A3221F)}
.fl-root .fl-sev--warn{color:var(--attention,#7A4A00)}
.fl-root .fl-sev--n{color:var(--encre,#1B1530)}
.fl-root .fl-est{display:inline-block;border:1.5px dashed currentColor;border-radius:6px;padding:0 5px;font:600 11px/16px var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B);vertical-align:1px}
.fl-root .fl-tag{display:inline-block;padding:2px 8px;border-radius:999px;font:600 12.5px/18px var(--font-texte,Barlow,sans-serif);margin:2px 2px 2px 0}
.fl-root .fl-tag--bad{background:#FBE6E4;color:#A3221F}
.fl-root .fl-tag--warn{background:#FFF0D2;color:#7A4A00}
.fl-root .fl-tag--ok{background:#DDF1EC;color:#0E6B5C}
.fl-root .fl-vign{display:block;object-fit:contain}
.fl-root .fl-vign--xs{width:54px;height:30px}
.fl-root .fl-vign--s{width:72px;height:40px}
.fl-root .fl-vign--m{width:180px;height:100px;margin:0 auto}
.fl-root .fl-vign--vide{display:flex;align-items:center;justify-content:center;background:var(--fond,#F5F4FA);border-radius:8px;color:var(--encre-2,#57526B)}
.fl-root .fl-mvalerte{align-items:center;padding-top:10px;padding-bottom:10px}
.fl-root .fl-mvalerte .tr-alerte__corps{flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 16px}
.fl-root .fl-mvalerte .tr-alerte__titre{white-space:nowrap}
.fl-root .fl-mvcs{display:flex;flex-wrap:wrap;gap:6px 14px}
.fl-root .fl-mvc{font-weight:600;white-space:nowrap}
.fl-root .fl-mvc--bad{color:#A3221F}
.fl-root .fl-mvc--warn{color:#7A4A00}
.fl-root .fl-mvc--info,.fl-root .fl-mvc--ok{color:var(--encre-2,#57526B)}
.fl-root .fl-mvalerte--c{padding-top:8px;padding-bottom:8px}
.fl-root .fl-acc{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start}
.fl-root .fl-col{display:flex;flex-direction:column;gap:16px;min-width:0}
.fl-root .fl-sp__tete{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.fl-root .fl-sp__tete h2{margin:0!important}
.fl-root .fl-sp__tete .af-lien,.fl-root .fl-sp__tete .tr-btn,.fl-root .fl-sp__tete .af-badge{margin-left:auto}
.fl-root .fl-h3{margin:10px 0 4px!important;font:700 13px/16px var(--font-texte,Barlow,sans-serif)!important;letter-spacing:.05em;text-transform:uppercase;color:var(--encre-2,#57526B)}
.fl-root .fl-h3--bad{color:var(--bloque,#A3221F)}
.fl-root .fl-li{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:6px 8px;border:0;border-radius:10px;background:transparent;text-align:left;cursor:pointer;color:inherit}
.fl-root .fl-li:hover{background:var(--fond,#F5F4FA)}
.fl-root .fl-li>svg{margin-left:auto;color:var(--encre-2,#57526B);flex:none}
.fl-root .fl-li__date{display:flex;flex-direction:column;min-width:66px;flex:none}
.fl-root .fl-li__date b{font:700 16px/18px var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.fl-root .fl-li__date small{font-size:12px;color:var(--encre-2,#57526B)}
.fl-root .fl-li__txt{display:flex;flex-direction:column;min-width:0;flex:1}
.fl-root .fl-li__txt b{font-weight:600}
.fl-root .fl-li__txt small{font-size:13px;color:var(--encre-2,#57526B)}
.fl-root .fl-plus{margin-top:6px}
.fl-root .fl-plus>summary{cursor:pointer;font-weight:700;color:var(--violet,#5E46B8);min-height:36px;display:flex;align-items:center}
.fl-root .fl-tabsans{border:0;border-radius:0}
.fl-root .fl-sig{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--trait,#DDD8EA)}
.fl-root .fl-sig:last-child{border-bottom:0}
.fl-root .fl-sig__txt{flex:1;display:flex;flex-direction:column}
.fl-root .fl-sig__txt small{color:var(--encre-2,#57526B);font-size:13px}
.fl-root .fl-mini__tete,.fl-root .fl-mini__sem{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.fl-root .fl-mini__tete span{text-align:center;font:700 12px/20px var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B)}
.fl-root .fl-mini__sem{margin-bottom:3px}
.fl-root .fl-mini__j{height:44px;border:0;border-radius:8px;background:var(--fond,#F5F4FA);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;padding:0}
.fl-root .fl-mini__j b{font:600 14px/1 var(--font-texte,Barlow,sans-serif)}
.fl-root .fl-mini__j.hors{opacity:.4}
.fl-root .fl-mini__j.we{background:#ECEAF2}
.fl-root .fl-mini__j.a{background:#fff;box-shadow:inset 0 0 0 1px var(--trait,#DDD8EA)}
.fl-root .fl-mini__j.auj{box-shadow:inset 0 0 0 2px var(--nuit,#2B1B5A)}
.fl-root .fl-mini__j:hover{box-shadow:inset 0 0 0 2px var(--violet,#5E46B8)}
.fl-root .fl-dots{display:flex;gap:3px;height:7px}
.fl-root .fl-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#999}
.fl-root .fl-dot--ct{background:#5E46B8}
.fl-root .fl-dot--vid{background:#C07A12}
.fl-root .fl-dot--rdv{background:#0E6B5C}
.fl-root .fl-dot--loc{background:#2F6DB0}
.fl-root .fl-dot--con{background:#8E87A6}
.fl-root .fl-dot--pv{background:#B0346E}
.fl-root .fl-dot.late{box-shadow:0 0 0 2px #fff,0 0 0 3.5px #A3221F}
.fl-root .fl-leg{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:13px;color:var(--encre-2,#57526B)}
.fl-root .fl-leg span{display:flex;align-items:center;gap:5px}
.fl-root .fl-sit{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.fl-root .fl-sit__c{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border:1px solid var(--trait,#DDD8EA);border-radius:12px;background:#fff;cursor:pointer;color:var(--nuit,#2B1B5A)}
.fl-root .fl-sit__c b{font:700 24px/26px var(--font-titre,'Barlow Semi Condensed',sans-serif);color:var(--encre,#1B1530)}
.fl-root .fl-sit__c span{font-size:12.5px;color:var(--encre-2,#57526B);text-align:center}
.fl-root .fl-sit__c:hover{border-color:var(--violet,#5E46B8)}
.fl-root .fl-types{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:14px;color:var(--encre-2,#57526B)}
.fl-root .fl-type b{color:var(--encre,#1B1530)}
.fl-root .fl-calbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.fl-root .fl-calbar__mois{font:700 22px/26px var(--font-titre,'Barlow Semi Condensed',sans-serif);min-width:170px;text-align:center;text-transform:capitalize}
.fl-root .fl-seg{display:inline-flex;border:2px solid var(--trait-fort,#8E87A6);border-radius:10px;overflow:hidden;margin-left:auto}
.fl-root .af-actions .fl-seg{margin-left:0}
.fl-root .fl-seg button{min-height:38px;padding:0 14px;border:0;background:#fff;font-weight:600;color:var(--encre-2,#57526B);cursor:pointer}
.fl-root .fl-seg button+button{border-left:1px solid var(--trait,#DDD8EA)}
.fl-root .fl-seg button[aria-pressed="true"]{background:var(--nuit,#2B1B5A);color:#fff}
.fl-root .fl-calwrap{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}
.fl-root .fl-cal{background:#fff;border:1px solid var(--trait,#DDD8EA);border-radius:var(--rayon-carte,14px);overflow:hidden}
.fl-root .fl-cal__tete,.fl-root .fl-cal__sem{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.fl-root .fl-cal__tete span{padding:8px 10px;font:700 13px/16px var(--font-texte,Barlow,sans-serif);color:var(--encre-2,#57526B);background:var(--fond,#F5F4FA);border-bottom:1px solid var(--trait,#DDD8EA);text-transform:capitalize}
.fl-root .fl-cal__j{min-height:112px;padding:6px;border-right:1px solid var(--trait,#DDD8EA);border-bottom:1px solid var(--trait,#DDD8EA);display:flex;flex-direction:column;gap:3px;cursor:pointer;min-width:0}
.fl-root .fl-cal__sem .fl-cal__j:nth-child(7){border-right:0}
.fl-root .fl-cal__sem:last-child .fl-cal__j{border-bottom:0}
.fl-root .fl-cal__j.we{background:#FAF9FD}
.fl-root .fl-cal__j.hors .fl-cal__n{opacity:.4}
.fl-root .fl-cal__j.passe{background:#FBFAFD}
.fl-root .fl-cal__j.auj{box-shadow:inset 0 0 0 2px var(--nuit,#2B1B5A)}
.fl-root .fl-cal__j.sel{background:var(--lavande-pale,#E6E1F6)}
.fl-root .fl-cal__j:hover{background:#F4F1FC}
.fl-root .fl-cal__n{font:600 14px/18px var(--font-texte,Barlow,sans-serif);display:flex;gap:6px;align-items:baseline}
.fl-root .fl-cal__n em{font-style:normal;font-size:11px;font-weight:700;color:var(--nuit,#2B1B5A);text-transform:uppercase;letter-spacing:.04em}
.fl-root .fl-ev{display:flex;align-items:center;gap:4px;width:100%;min-height:24px;padding:0 6px;border:1.5px solid transparent;border-radius:6px;font:700 12px/1 var(--font-titre,'Barlow Semi Condensed',sans-serif);cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden}
.fl-root .fl-ev span{font-size:11px}
.fl-root .fl-ev--ct{background:#E6E1F6;color:#2B1B5A}
.fl-root .fl-ev--vid{background:#FFE7C7;color:#6A3F00}
.fl-root .fl-ev--rdv{background:#DDF1EC;color:#0E5246}
.fl-root .fl-ev--loc{background:#DCEBFA;color:#11416E}
.fl-root .fl-ev--con{background:#ECEAF2;color:#3B3650}
.fl-root .fl-ev--pv{background:#F7DDE8;color:#6E1F44}
.fl-root .fl-ev.est{border-style:dashed;border-color:currentColor;background:#fff}
.fl-root .fl-ev.late{border-color:#A3221F;border-style:solid}
.fl-root .fl-ev--plus{background:transparent;color:var(--violet,#5E46B8);border:0}
.fl-root .fl-ev:hover{filter:brightness(.96);outline:2px solid var(--violet,#5E46B8)}
.fl-root .fl-cote{display:flex;flex-direction:column;gap:16px}
.fl-root .fl-filtres{display:flex;flex-direction:column;gap:2px}
.fl-root .fl-chk{display:flex;align-items:center;gap:8px;min-height:36px;font-weight:600;cursor:pointer}
.fl-root .fl-chk input{width:20px;height:20px;accent-color:var(--nuit,#2B1B5A)}
.fl-root .fl-g--bad td{background:#FBE6E4!important;color:#A3221F!important}
.fl-root .fl-evtete{display:flex;align-items:center;gap:12px}
.fl-root .fl-evtete .fl-vign--m{margin:0;width:150px;height:84px}
.fl-root .fl-tete{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:16px;align-items:stretch}
.fl-root .fl-tt{background:var(--carte,#fff);border:1px solid var(--trait,#DDD8EA);border-radius:var(--rayon-carte,14px);padding:8px;display:flex;flex-direction:column}
.fl-root .fl-tt__hote{height:300px;border-radius:12px}
.fl-root .fl-tt__leg{font-size:13px;color:var(--encre-2,#57526B);padding:6px 6px 0}
.fl-root .fl-id{background:var(--carte,#fff);border:1px solid var(--trait,#DDD8EA);border-radius:var(--rayon-carte,14px);padding:16px;display:flex;flex-direction:column;gap:8px}
.fl-root .fl-id h1{margin:0;font:700 28px/32px var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.fl-root .fl-id__immat{align-self:flex-start;font:800 18px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;padding:6px 12px 6px 26px;border:2px solid #333;border-radius:6px;background:linear-gradient(90deg,#1C3D8F 0 16px,#fff 16px);color:#16151A}
.fl-root .fl-id__qui{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.fl-root .fl-id__al{display:flex;flex-wrap:wrap}
.fl-root .fl-id__act{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}
.fl-root .fl-ech{display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--trait,#DDD8EA)}
.fl-root .fl-ech:last-child{border-bottom:0}
.fl-root .fl-cpt{margin-bottom:10px}
.fl-root .fl-cpt>b{display:block;margin-bottom:4px}
.fl-root .fl-jg{display:flex;align-items:center;gap:10px}
.fl-root .fl-jg span:last-child{font-size:14px;color:var(--encre-2,#57526B);white-space:nowrap}
.fl-root .fl-jg__barre{flex:1;height:10px;border-radius:99px;background:var(--lavande-pale,#E6E1F6);overflow:hidden}
.fl-root .fl-jg__barre>span{display:block;height:100%;border-radius:99px}
.fl-root .fl-jg--ok{background:#0E6B5C}
.fl-root .fl-jg--warn{background:#C08A2E}
.fl-root .fl-jg--bad{background:#A3221F}
.fl-root .fl-dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:15px}
.fl-root .fl-dl span{color:var(--encre-2,#57526B)}
.fl-root .fl-dl b{font-weight:600}
.fl-root .fl-jr{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--trait,#DDD8EA)}
.fl-root .fl-jr:last-child{border-bottom:0}
.fl-root .fl-jr>span:last-child{display:flex;flex-direction:column}
.fl-root .fl-jr small{font-size:13px;color:var(--encre-2,#57526B)}
.fl-root .fl-jr__pt{width:10px;height:10px;border-radius:50%;margin-top:6px;flex:none;background:#8E87A6}
.fl-root .fl-jr--ok{background:#0E6B5C}
.fl-root .fl-jr--warn{background:#C08A2E}
.fl-root .fl-jr--bad{background:#A3221F}
.fl-root .fl-jr--info{background:#5E46B8}
.fl-root .fl-fiche{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.fl-root .fl-mv>summary{gap:10px}
.fl-root .fl-mv>summary .af-badge{margin-left:auto}
.fl-root .fl-mv--bad{border-left:4px solid #A3221F}
.fl-root .fl-mv--warn{border-left:4px solid #C08A2E}
.fl-root .fl-mv--info{border-left:4px solid #5E46B8}
.fl-root .fl-mv--ok{border-left:4px solid #0E6B5C}
.fl-root .fl-pkpage{max-width:none}
.fl-root .fl-pk{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}
.fl-root .fl-pk__scene{position:relative}
.fl-root .fl-pk__hote{height:calc(100vh - 190px);min-height:480px;border-radius:var(--rayon-carte,14px);border:1px solid var(--trait,#DDD8EA)}
.fl-root .fl-pk__zoom{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:6px}
.fl-root .fl-pk__zoom button{width:44px;height:44px;border-radius:10px;border:1px solid var(--trait,#DDD8EA);background:#fff;font:700 20px/1 var(--font-texte,Barlow,sans-serif);color:var(--nuit,#2B1B5A);cursor:pointer;box-shadow:0 2px 6px rgba(43,27,90,.12)}
.fl-root .fl-pk__bulle{position:absolute;left:12px;bottom:12px;max-width:70%;background:var(--nuit,#2B1B5A);color:#fff;font-weight:600;font-size:14px;padding:8px 12px;border-radius:10px;pointer-events:none}
.fl-root .fl-pk__mode{position:absolute;left:12px;top:12px;background:#fff;border:1px solid var(--trait,#DDD8EA);border-radius:10px;padding:6px 10px;font-size:13px;font-weight:600;color:var(--nuit,#2B1B5A)}
.fl-root .fl-pk__cote{position:sticky;top:79px}
.fl-root .fl-pk__vide{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;color:var(--encre-2,#57526B);padding:10px 0 16px}
.fl-root .fl-pk__vide b{color:var(--encre,#1B1530)}
.fl-root .fl-pk__v{display:flex;flex-direction:column;gap:8px}
.fl-root .fl-pk__mod{font:700 20px/24px var(--font-titre,'Barlow Semi Condensed',sans-serif)}
.fl-root .fl-pk__qui{padding:8px 10px;background:var(--fond,#F5F4FA);border-radius:10px}
.fl-root .fl-pk__ech{display:flex;flex-direction:column;gap:4px;font-size:14px}
.fl-root .fl-pk__act{display:flex;flex-wrap:wrap;gap:8px}
.fl-root .fl-pk__leg{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--encre-2,#57526B);border-top:1px solid var(--trait,#DDD8EA);padding-top:10px}
.fl-root .fl-pk__leg b{color:var(--encre,#1B1530)}
.fl-root .fl-pk__leg span{display:flex;align-items:center;gap:8px}
.fl-root .fl-gy{width:12px;height:12px;border-radius:50%;flex:none}
.fl-root .fl-gy--bad{background:#E0352B;box-shadow:0 0 6px #E0352B}
.fl-root .fl-gy--warn{background:#F5A623;box-shadow:0 0 6px #F5A623}
.fl-root .fl-zn{width:18px;height:12px;border-radius:3px;flex:none}
.fl-root .fl-zn--l{background:repeating-linear-gradient(45deg,#E8AA28 0 3px,transparent 3px 7px);border:1.5px solid #E8AA28}
.fl-root .fl-zn--r{background:repeating-linear-gradient(45deg,#8E7AD6 0 3px,transparent 3px 7px);border:1.5px solid #8E7AD6}
.fl-root .fl-in{min-height:40px;border:2px solid var(--trait-fort,#8E87A6);border-radius:10px;padding:0 10px;background:#fff;font-weight:500;width:100%;color:var(--encre,#1B1530)}
.fl-root .fl-galerie{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.fl-root .fl-gal{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px;border:1px solid var(--trait,#DDD8EA);border-radius:12px;background:#fff;cursor:pointer;text-align:center;color:inherit}
.fl-root .fl-gal .fl-vign--m{width:130px;height:72px}
.fl-root .fl-gal span{font-size:13px}
.fl-root .fl-gal small{font-size:12px;color:var(--violet,#5E46B8);font-weight:600}
.fl-root .fl-gal:hover{border-color:var(--violet,#5E46B8)}
.fl-root .fl-regapercu .fl-tt__hote{height:260px}
.fl-root .fl-gabs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.fl-root .fl-gabs button{min-height:36px;padding:0 10px;border:1px solid var(--trait,#DDD8EA);border-radius:9px;background:#fff;font-weight:600;font-size:13.5px;cursor:pointer;color:var(--encre,#1B1530)}
.fl-root .fl-gabs button[aria-pressed="true"]{background:var(--nuit,#2B1B5A);border-color:var(--nuit,#2B1B5A);color:#fff}
@media (max-width:1100px){.fl-root .fl-acc,.fl-root .fl-calwrap,.fl-root .fl-pk,.fl-root .fl-tete{grid-template-columns:1fr}
.fl-root .fl-fiche{grid-template-columns:1fr}
.fl-root .fl-pk__cote{position:static}
.fl-root .fl-pk__hote{height:62vh}
}
@media (max-width:640px){.fl-root .fl-cal__j{min-height:72px;padding:3px}
.fl-root .fl-ev{padding:0 3px;font-size:0;justify-content:center}
.fl-root .fl-ev span{font-size:12px}
.fl-root .fl-cal__n em{display:none}
.fl-root .fl-sit{grid-template-columns:repeat(2,1fr)}
.fl-root .af-table{font-size:14px}
.fl-root .fl-seg{margin-left:0}
.fl-root .fl-id__act .tr-btn{flex:1 1 auto}
}
@media (max-width:1000px){.fl-root .af-nav{flex-wrap:nowrap;overflow-x:auto;gap:2px;padding:6px 8px;scrollbar-width:none}
.fl-root .af-nav::-webkit-scrollbar{display:none}
.fl-root .af-nav button{flex:none;white-space:nowrap;min-height:44px}
}
@media (max-width:640px){.fl-root .af-haut .tr-haut{gap:8px}
.fl-root .af-demo{display:none}
.fl-root .af-qui{font-size:0;gap:0}
.fl-root .af-qui select{font-size:15px;max-width:150px}
.fl-root .fl-li{gap:8px}
.fl-root .fl-li .fl-vign--s{width:54px;height:30px}
.fl-root .fl-tt__hote{height:240px}
.fl-root .fl-pk__hote{height:58vh;min-height:360px}
}
@media (max-width:640px){.fl-root .fl-mv tr{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 10px;padding:10px 12px;border-bottom:1px solid var(--trait,#DDD8EA)}
.fl-root .fl-mv td{display:block;padding:0!important;border:0!important;width:auto!important}
.fl-root .fl-mv td:nth-child(1){grid-row:span 1}
.fl-root .fl-mv td:nth-child(3),.fl-root .fl-mv td:nth-child(4),.fl-root .fl-mv td:nth-child(5){grid-column:1/-1}
.fl-root .fl-mv td.n{text-align:left}
.fl-root .fl-mv td:nth-child(5) .tr-btn{width:100%}
.fl-root .fl-mv td:nth-child(4):empty{display:none}
}
.fl-root .fl-vign--photo{object-fit:cover;border-radius:8px;background:#E9E7EF}
.fl-root .fl-tt__barre{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.fl-root .fl-tt__barre .fl-seg{margin-left:0}
.fl-root .fl-tt__acts{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
.fl-root .fl-file{cursor:pointer}
.fl-root .fl-file input{display:none}
.fl-root .fl-tt__photo img{display:block;width:100%;height:300px;object-fit:cover;border-radius:12px}
.fl-root .fl-tt__sans{height:300px;border-radius:12px;background:var(--fond,#F5F4FA);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;color:var(--encre-2,#57526B);padding:16px}
.fl-root .fl-tt__sans b{color:var(--encre,#1B1530)}
.fl-root .af-fenetre.large{max-width:1000px}
.fl-root .fl-sil{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:16px;align-items:start}
.fl-root .fl-sil__vues{display:flex;flex-direction:column;gap:8px}
.fl-root .fl-sil__photo{width:100%;height:190px;object-fit:cover;border-radius:12px;display:block}
.fl-root div.fl-sil__photo{height:120px}
.fl-root .fl-sil__tt{height:240px;border-radius:12px}
.fl-root .fl-eqs{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.fl-root .fl-pk__photo{display:block;width:100%;height:170px;object-fit:cover;border-radius:10px}
.fl-root .m3d-lab.photo{padding:4px;border-radius:12px;border:2px solid #5E46B8;background:#fff;box-shadow:0 8px 20px rgba(43,27,90,.25)}
.fl-root .m3d-lab.photo img{display:block;width:170px;height:113px;object-fit:cover;border-radius:8px}
.fl-root .m3d-lab.photo span{display:block;font-size:12px;line-height:16px;padding:3px 4px 0;color:#2B1B5A}
@media (max-width:800px){.fl-root .fl-sil{grid-template-columns:1fr}
}

/* appli (10/11 nuit) : le dessin du type (vehSVG) quand il n'y a ni photo ni vignette 3D ; boutons de l'appli dans le cadre Flotte */
.fl-root .fl-vign--dessin{display:flex;align-items:center;justify-content:center;overflow:hidden}.fl-root .fl-vign--dessin svg{width:100%;height:100%}
.fl-root .fl-ancienne{margin-top:8px}
`;
