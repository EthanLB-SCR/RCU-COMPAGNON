// modules.js — 14/10 nuit : MODULES BRANCHÉS sur l'espace (voir espaceExt dans espace.js). Une ligne par module, rien d'autre ici.
// Chaque module exporte par défaut {id, kinds, moiSubs, view, xview, hub, parcSeg, hubRows, tasks, gate, act, input} (tout est facultatif sauf id).
import {espaceExt} from './espace.js';
const MODS=[];
/* ─ modules ─ (une ligne « import x from './x.js'; MODS.push(x); » par module) */
import accueilRh from './accueil_rh.js'; MODS.push(accueilRh); /* 14/10 nuit : accueil RH — documents d'accueil à signer, livrets, passeport de prévention (écran bloquant : en premier) */
import veh from './reception.js'; MODS.push(veh); /* 14/10 nuit : réception / restitution de véhicule (fiche véhicule de la flotte, Moi → Mon véhicule) */
import magasin from './magasin.js'; MODS.push(magasin); // 14/10 nuit : magasin du dépôt (demandes, préparation, stock)
import packScr from './packscr.js'; MODS.push(packScr); // 14/10 nuit : import du pack SCR (données privées) — Entreprise, administrateur
import docsOblig from './docsoblig.js'; MODS.push(docsOblig); // 14/10 après-midi (lot D) : documents de l'entreprise (assurances, Kbis, URSSAF…) — SCR, alerte avant échéance
export function initModules(){MODS.forEach(m=>{try{espaceExt(m);}catch(e){console.warn('module',m&&m.id,e);}});}
