// monde3d/depot.js — LE DÉPÔT (siège d'un secteur) : open space avec le poste de chacun, réunion, café, accueil + salle d'attente (affaires), magasin (rayons par famille,
// préparation des demandes, quai), vestiaire (terrain), parking (chaque véhicule avec son conducteur), parc à tubes, enseigne. Plusieurs dépôts côte à côte : on survole de l'un à l'autre.
import { THREE, PAL, mat, rbox, box, cyl, sph, plane, grp, add, figure, pickable, label, bake } from './core.js';
import { buildPod, podSize } from './bureau.js';
import { avatarSVG } from '../avatar.js'; /* 08/11 : personnages en 2D (dessin du kit), plus de 3D sur les avatars */
import { plant, objet, poster } from './props.js';
import { sofa, coffeeTable, counter, meetingTable, tv, coffeeMachine, waterCooler, lockers, bench, rack, pallet, parcel, forklift, dockDoor, tree, bush, lampPost, sign, flagPole, van, truck, pickup, car, excavator, miniExcavator, pipeStack, skip, worker } from './props2.js';
import { chair } from './props.js';
const C = PAL;
const SEVC = { bad: C.bq, warn: C.att, or: C.att, info: C.retour, ok: C.ok };
export const VEH_KIND = t => { const s = String(t || '').toLowerCase(); if (/benne|camion|poids|porteur|plateau/.test(s)) return 'truck'; if (/pelle|engin|mini/.test(s)) return 'pelle'; if (/pick|4x4/.test(s)) return 'pickup'; if (/fonction|voiture|vl|berline|citadine|chef|conducteur|cdc/.test(s)) return 'car'; return 'van'; };
/** un visiteur (client, fournisseur, sous-traitant) de la salle d'attente : tenue de ville, veste à la couleur de l'attente */
const visiteur = (i, col) => { const f = i % 2 === 1; return { genre: f ? 'femme' : 'homme', peau: ['p2', 'p4', 'p1', 'p5', 'p3', 'p6'][i % 6], cheveux: f ? ['long', 'chignon', 'milong'][i % 3] : ['court', 'degarni', 'brosse'][i % 3], couleur: ['brun', 'blond', 'gris', 'noir', 'chatain', 'roux'][i % 6], barbe: !f && i % 3 === 0 ? 'courte' : 'aucune', lunettes: i % 4 === 2 ? 'rect' : 'aucune', haut: 'blazer', hautCouleur: '#' + new THREE.Color(col).getHexString(), bas: 'pantalon', basCouleur: '#3A404B', chaussures: 'ville', casque: false }; };
const FAM_COL = { direction: 0x6b4bd6, encadrement: 0x1f6fd0, terrain: 0xeb6834, support: 0x2a9d5c };
/** mesure du dépôt selon ses gens / véhicules */
export function depotDims(d) {
  const off = d.people.filter(p => p.fam !== 'terrain'), ter = d.people.filter(p => p.fam === 'terrain');
  const cols = Math.max(2, Math.min(7, Math.ceil(off.length / 2))); const rows = Math.max(1, Math.ceil(off.length / cols));
  const [RW, RD] = podSize(); const CW = 2.0; const bands = rows; /* bureaux fermés : chaque rangée a son couloir devant, toutes les portes (et les gens derrière leur bureau) tournées vers nous */
  const offW = cols * RW + 1, offD = bands * (RD + CW) + 1; const bldW = offW + 14 + 20, bldD = Math.max(offD, 22) + 10; const bays = Math.max(8, d.vehicles.length + 2); const parkW = Math.max(bldW, Math.ceil(bays / 2) * 3.4 + 4);
  return { off, ter, cols, rows, RW, RD, CW, bands, offW, offD, bldW, bldD, bays, parkW, siteW: Math.max(bldW, parkW) + 24, siteD: bldD + 40 };
}
/**
 * d = {k, nom, ville, siege, people:[{id,prenom,posteLabel,fam,svg,prefs,today:{where,chantierNom},vehId}], vehicles:[{id,immat,label,type,alerts,conducteurId,conducteurNom,out,chantierNom}],
 *      stock:{n,bas,rup,familles:[{f,n,bas,rup}],demandes:[{id,statut,par,chantier,n}]}, affaires:[{num,nom,attente}], kpi:{presents,chantiers,alertes}} ; screens = données des écrans (par personne)
 */
export function buildDepot(d, o) {
  o = o || {}; const g = grp(); g.name = 'depot:' + d.k; const M = depotDims(d); const cams = {};
  const X0 = -M.siteW / 2, Z0 = -M.siteD / 2;
  // ── terrain, route, enseigne
  g.add(rbox(M.siteW, 0.3, M.siteD, C.herbe, { r: 0.4, y: -0.3, rough: 1 }));
  const bld = { x: -M.siteW / 2 + 10, z: Z0 + 8, w: M.bldW, d: M.bldD }; const bx = bld.x + bld.w / 2, bz = bld.z + bld.d / 2;
  g.add(box(M.siteW, 0.05, 7, C.bitume, { x: 0, y: -0.02, z: M.siteD / 2 - 5 }));
  for (let i = 0; i < M.siteW / 6; i++) g.add(box(2.4, 0.01, 0.16, C.blanc, { x: X0 + 3 + i * 6, y: 0.03, z: M.siteD / 2 - 5, shadow: false }));
  const sg = sign(d.nom, d.ville ? d.ville + (d.siege ? ' · siège' : '') : (d.siege ? 'siège' : ''), { w: Math.max(3.4, d.nom.length * 0.32 + 1) }); sg.position.set(X0 + 6, 0, M.siteD / 2 - 10); sg.rotation.y = 0.25; g.add(sg);
  const fp = flagPole(C.violet); fp.position.set(X0 + 3, 0, M.siteD / 2 - 12); g.add(fp);
  for (let i = 0; i < M.siteW / 9; i++) { const t = tree(i % 3 === 0 ? 'sapin' : i % 3 === 1 ? 'boule' : 'rond', 0.9 + (i % 4) * 0.12); t.position.set(X0 + 4 + i * 9, 0, Z0 + 2.5); g.add(t); }
  [[X0 + 2.5, Z0 + 12], [X0 + 2.5, Z0 + 24], [X0 + M.siteW - 2.5, Z0 + 14], [X0 + M.siteW - 2.5, Z0 + 28]].forEach(([x, z], i) => { const t = tree(i % 2 ? 'boule' : 'rond', 1.1); t.position.set(x, 0, z); g.add(t); });
  // ── bâtiment : dalle + murs bas (maquette ouverte)
  g.add(rbox(bld.w, 0.25, bld.d, 0xF4F2F8, { r: 0.05, x: bx, y: 0, z: bz, rough: 0.9 }));
  const wallH = 1.25, wc = 0xFFFFFF;
  const wall = (x, z, w, dd) => g.add(rbox(w, wallH, dd, wc, { r: 0.03, x, y: 0.25, z }), box(w + 0.04, 0.08, dd + 0.04, C.violet, { x, y: 0.25 + wallH, z, shadow: false }));
  wall(bx, bld.z, bld.w, 0.3); wall(bld.x, bz, 0.3, bld.d); wall(bld.x + bld.w, bz - 3, 0.3, bld.d - 6); // mur est percé du quai
  const doorX = bld.x + M.offW + 7; wall(bld.x + (doorX - 2 - bld.x) / 2, bld.z + bld.d, doorX - 2 - bld.x, 0.3); wall(doorX + 2 + (bld.x + bld.w - doorX - 2) / 2, bld.z + bld.d, bld.x + bld.w - doorX - 2, 0.3);
  g.add(box(4.2, 2.6, 0.2, C.verre, { x: doorX, y: 0.25, z: bld.z + bld.d, rough: 0.2, op: 0.6 }), box(4.6, 0.18, 1.6, C.violet, { x: doorX, y: 2.75, z: bld.z + bld.d + 0.6 }), cyl(0.06, 0.06, 2.75, C.metal, { x: doorX - 2.1, y: 0, z: bld.z + bld.d + 1.3, seg: 8 }), cyl(0.06, 0.06, 2.75, C.metal, { x: doorX + 2.1, y: 0, z: bld.z + bld.d + 1.3, seg: 8 })); // entrée vitrée + auvent
  for (let i = 1; i < 4; i++) g.add(cyl(0.12, 0.12, 2.9, C.blanc, { x: bld.x + 0.4 + i * (bld.w - 0.8) / 4, y: 0.25, z: bld.z + 0.5, seg: 10 }));
  // ── BUREAUX FERMÉS : une pièce par personne, portes sur le couloir (deux rangées face à face par couloir)
  const offX = bld.x + 1.5, offZ = bld.z + 1.5;
  g.add(rbox(M.offW, 0.02, M.offD, 0xEDE9F8, { r: 0.05, x: offX + M.offW / 2, y: 0.25, z: offZ + M.offD / 2, shadow: false }));
  for (let b = 0; b < M.bands; b++) { const cz = offZ + 0.5 + b * (M.RD + M.CW) + M.RD; g.add(rbox(M.offW - 0.4, 0.012, M.CW - 0.3, 0xD9D3E8, { r: 0.04, x: offX + M.offW / 2, y: 0.27, z: cz + M.CW / 2, shadow: false })); for (let k = 0; k < M.cols; k++) g.add(box(0.5, 0.004, 0.08, 0xC9C2DC, { x: offX + 0.5 + M.RW / 2 + k * M.RW, y: 0.282, z: cz + M.CW / 2, shadow: false })); }
  const pods = {}; M.off.forEach((p, i) => { const c = i % M.cols, r = Math.floor(i / M.cols); const side = 0; const px = offX + 0.5 + M.RW / 2 + c * M.RW, pz = offZ + 0.5 + r * (M.RD + M.CW) + M.RD / 2;
    const here = p.today && p.today.where === 'depot'; const pod = buildPod({ prefs: p.prefs, person: p, mode: 'depot', todo: p.todo || [], present: here, screen: null }); pod.position.set(px, 0.272, pz); if (side === 1) pod.rotation.y = Math.PI;
    pickable(pod, { type: 'person', id: p.id }, p.prenom + ' · ' + (p.posteLabel || '') + (p.today && p.today.where === 'chantier' ? ' · sur ' + (p.today.chantierNom || 'chantier') : here ? ' · au dépôt' : ' · absent')); g.add(pod); pods[p.id] = [px, pz];
    if (!here) { const t = label(p.today && p.today.where === 'chantier' ? '🦺 ' + (p.today.chantierNom || 'sur chantier') : p.today && p.today.where === 'conge' ? 'en congé' : 'absent', { cls: p.today && p.today.where === 'chantier' ? 'nuit' : 'soft', x: px, y: 1.6, z: pz, min: 22 }); g.add(t); } });
  cams.bureaux = [offX + M.offW / 2, 0, offZ + M.offD / 2, Math.max(M.offW * 0.62, M.offD) * 0.5];
  const plantsAt = []; for (let b = 0; b < M.bands; b++) { const cz = offZ + 0.5 + b * (M.RD + M.CW) + M.RD + M.CW / 2; plantsAt.push([offX + 0.3, cz, 'ficus'], [offX + M.offW - 0.3, cz, 'palmier']); } plantsAt.forEach(([x, z, k]) => { const pl = plant(k); pl.scale.setScalar(0.8); pl.position.set(x, 0.27, z); g.add(pl); });
  // ── RÉUNION + CAFÉ (à droite de l'open space)
  const mx = offX + M.offW + 1, mz = bld.z + 1.5, mw = 12, md = 10;
  g.add(rbox(mw, 0.02, md, 0xEAF1F9, { r: 0.05, x: mx + mw / 2, y: 0.25, z: mz + md / 2, shadow: false }), box(0.12, 1.1, md, C.verre, { x: mx, y: 0.27, z: mz + md / 2, rough: 0.2, op: 0.5 }), box(mw, 1.1, 0.12, C.verre, { x: mx + mw / 2, y: 0.27, z: mz + md, rough: 0.2, op: 0.5 }));
  const mt = meetingTable(5, 1.8); mt.position.set(mx + mw / 2, 0.27, mz + md / 2); g.add(mt); for (let i = 0; i < 8; i++) { const ch = chair('bureau', C.gris); const side = i < 4 ? -1 : 1; ch.position.set(mx + mw / 2 - 1.8 + (i % 4) * 1.2, 0.27, mz + md / 2 + side * 1.5); ch.rotation.y = side > 0 ? Math.PI : 0; g.add(ch); }
  const tvm = tv(1.8); tvm.position.set(mx + mw / 2, 1.9, bld.z + 0.32); g.add(tvm); const meetLab = label('Salle de réunion', { cls: 'soft', x: mx + mw / 2, y: 1.6, z: mz + md / 2, min: 9, max: 40 }); g.add(meetLab);
  const cafX = mx, cafZ = mz + md + 1.5; g.add(rbox(mw, 0.02, 6, 0xF6EEDF, { r: 0.05, x: cafX + mw / 2, y: 0.25, z: cafZ + 3, shadow: false })); const cm = coffeeMachine(); cm.position.set(cafX + 1.2, 0.27, cafZ + 0.6); g.add(cm); const wcl = waterCooler(); wcl.position.set(cafX + 2.6, 0.27, cafZ + 0.5); g.add(wcl); const ht = cyl(0.5, 0.5, 0.05, C.bois, { x: cafX + 6, y: 1.05, z: cafZ + 3, seg: 20 }); g.add(ht, cyl(0.06, 0.08, 1.05, C.metal2, { x: cafX + 6, y: 0.27, z: cafZ + 3 })); for (let i = 0; i < 3; i++) { const st = chair('tabouret', C.violet); st.position.set(cafX + 6 + Math.cos(i * 2.1) * 0.9, 0.27, cafZ + 3 + Math.sin(i * 2.1) * 0.9); g.add(st); }
  const cafeLab = label('Coin café', { cls: 'soft', x: cafX + 3, y: 1.4, z: cafZ + 3, min: 9, max: 40 }); g.add(cafeLab);
  // ── ACCUEIL + SALLE D'ATTENTE (près de l'entrée)
  const ax = mx, az = cafZ + 7.5, aw = mw, ad = bld.z + bld.d - az - 1; g.add(rbox(aw, 0.02, ad, 0xFBEFE7, { r: 0.05, x: ax + aw / 2, y: 0.25, z: az + ad / 2, shadow: false }));
  const ct = counter(3.2); ct.position.set(ax + aw - 2.4, 0.27, az + 1.2); ct.rotation.y = Math.PI; g.add(ct); const rec = M.off.find(p => /rh|admin|assist|accueil|commercial/i.test(p.posteLabel || '')); if (rec && rec.today && rec.today.where === 'depot') { /* la personne est déjà à son poste */ }
  const sf1 = sofa(2.4, C.violet); sf1.position.set(ax + 2.2, 0.27, az + 2.2); g.add(sf1); const sf2 = sofa(2.4, C.violet); sf2.position.set(ax + 2.2, 0.27, az + ad - 1.6); sf2.rotation.y = Math.PI; g.add(sf2); const cft = coffeeTable(); cft.position.set(ax + 2.2, 0.27, az + ad / 2 + 0.3); g.add(cft);
  const pl2 = plant('palmier'); pl2.position.set(ax + 0.7, 0.27, az + ad - 0.7); g.add(pl2); const pl3 = plant('monstera'); pl3.position.set(ax + 4.4, 0.27, az + 0.8); g.add(pl3); g.add(rbox(4.2, 0.02, ad - 2.4, 0xE6E1F6, { r: 0.05, x: ax + 2.2, y: 0.27, z: az + ad / 2 + 0.3, shadow: false })); const ps = poster('tube', { w: 0.8, h: 1.1 }); ps.position.set(ax + aw - 0.2, 1.4, az + ad / 2); ps.rotation.y = -Math.PI / 2; g.add(ps);
  const wait = (d.affaires || []).filter(a => a.attente && a.attente.de); const ATT = { client: [C.violet, 'Attente client'], fournisseur: [C.att, 'Attente fournisseur'], soustraitant: [C.ok, 'Attente sous-traitant'] };
  wait.slice(0, 6).forEach((a, i) => { const col = (ATT[a.attente.de] || ATT.client)[0]; let sv = null; try { sv = avatarSVG(visiteur(i, col), 240); } catch (e) { sv = null; } const w = figure(sv, 1.65); const sx = ax + 1.2 + (i % 3) * 0.75, sz = i < 3 ? az + 2.0 + 0.75 : az + ad - 1.4 - 0.75; w.position.set(sx, 0.27, sz); pickable(w, { type: 'affaire', num: a.num }, a.nom + ' — ' + (ATT[a.attente.de] || ATT.client)[1] + (a.attente.rel ? ' · relance le ' + a.attente.rel.split('-').reverse().join('/') : '')); g.add(w); const late = a.attente.rel && o.today && a.attente.rel < o.today; g.add(label((late ? '⚠ ' : '') + a.nom, { cls: late ? 'bad' : 'soft', x: sx, y: 2.0, z: sz, min: 24 })); });
  g.add(label(wait.length ? wait.length + ' affaire' + (wait.length > 1 ? 's' : '') + ' en attente' : 'Salle d\'attente', { cls: wait.length ? 'warn' : 'soft', x: ax + aw / 2, y: 1.9, z: az + ad / 2, min: 6, max: 23.9, cx: 0.5 }));
  pickable(sf1, { type: 'tabgo', k: 'commerce' }, 'Salle d\'attente des affaires — ouvrir le Commerce'); pickable(sf2, { type: 'tabgo', k: 'commerce' }, 'Salle d\'attente des affaires — ouvrir le Commerce'); cams.attente = [ax + aw / 2, 0, az + ad / 2, 7];
  // ── MAGASIN
  const sx0 = mx + mw + 1, sz0 = bld.z + 1.5, sw = bld.x + bld.w - sx0 - 1, sd = bld.d - 3 - 9; g.add(rbox(sw, 0.02, sd, 0xE3F2EC, { r: 0.05, x: sx0 + sw / 2, y: 0.25, z: sz0 + sd / 2, shadow: false }));
  const st = d.stock || { familles: [], demandes: [] }; const fams = (st.familles || []).slice(0, 16); const nR = Math.max(2, Math.min(4, Math.ceil(fams.length / 4)));
  for (let r = 0; r < nR; r++) { const bins = [0, 1, 2].map(l => [0, 1, 2, 3].map(bI => { const f = fams[r * 4 + bI]; if (!f) return { fill: l === 0 ? 0.5 : 0, c: C.gris3 }; const state = f.rup ? 'rup' : f.bas ? 'bas' : 'ok'; const fill = state === 'rup' ? (l === 0 ? 0 : 0.35) : state === 'bas' ? 0.45 - l * 0.1 : 0.95 - l * 0.12; return { fill: Math.max(0, fill), rup: state === 'rup' && l === 0, c: state === 'rup' ? C.bq2 : state === 'bas' ? C.att2 : C.kraft, pick: { type: 'stock', f: f.f }, aria: f.f + ' · ' + f.n + ' articles' + (f.rup ? ' · ' + f.rup + ' en rupture' : f.bas ? ' · ' + f.bas + ' à commander' : ' · stock OK'), lab: l === 0 }; }));
    const rw = Math.min(sw - 5, 11); const rk = rack(rw, 3, bins); rk.position.set(sx0 + 1 + rw / 2, 0.27, sz0 + 1.6 + r * 2.8); g.add(rk);
    fams.slice(r * 4, r * 4 + 4).forEach((f, i) => { g.add(label(f.f + (f.rup ? ' · ' + f.rup + ' rupture' : f.bas ? ' · ' + f.bas + ' à cmd' : ''), { cls: f.rup ? 'bad' : f.bas ? 'warn' : 'soft', x: sx0 + 1 + (Math.min(sw - 5, 11) - 0.2) * ((i + 0.5) / 4) + 0.1, y: 2.9, z: sz0 + 1.6 + r * 2.8, min: 20 })); }); }
  // table de préparation + colis des demandes
  const dem = (st.demandes || []); const ptx = sx0 + sw - 3.2, ptz = sz0 + 2.2; g.add(rbox(2.6, 0.85, 1.1, C.bois, { r: 0.03, x: ptx, y: 0.27, z: ptz }), box(0.12, 0.85, 1.0, C.metal2, { x: ptx - 1.1, y: 0.27, z: ptz }), box(0.12, 0.85, 1.0, C.metal2, { x: ptx + 1.1, y: 0.27, z: ptz }));
  dem.filter(x => x.statut === 'preparation' || x.statut === 'prete').slice(0, 6).forEach((x, i) => { const pc = parcel(0.5, 0.36, 0.42, { color: x.statut === 'prete' ? C.kraft : 0xF2E3C4, label: true }); pc.position.set(ptx - 0.9 + (i % 4) * 0.6, 1.12 + Math.floor(i / 4) * 0.37, ptz + (Math.floor(i / 4) ? 0 : 0.1)); pickable(pc, { type: 'demande', id: x.id }, 'Demande ' + (x.par || '') + (x.chantier ? ' · ' + x.chantier : '') + ' · ' + (x.statut === 'prete' ? 'prête' : 'en préparation')); g.add(pc); });
  const nPrep = dem.filter(x => x.statut === 'preparation').length, nPrete = dem.filter(x => x.statut === 'prete').length, nEnv = dem.filter(x => x.statut === 'envoyee').length; g.add(label((nEnv ? nEnv + ' à préparer · ' : '') + (nPrep ? nPrep + ' en préparation · ' : '') + (nPrete ? nPrete + ' prête' + (nPrete > 1 ? 's' : '') : '') || 'Préparation des demandes', { cls: nEnv ? 'warn' : 'soft', x: ptx, y: 2.3, z: ptz, min: 16 }));
  const pal1 = pallet({ color: C.kraft }); pal1.position.set(sx0 + sw - 2.2, 0.27, sz0 + sd - 2.2); g.add(pal1); const pal2 = pallet({ color: C.lav2 }); pal2.position.set(sx0 + sw - 4.2, 0.27, sz0 + sd - 2.0); pal2.rotation.y = 0.3; g.add(pal2);
  const fk = forklift(); fk.position.set(sx0 + sw - 6.5, 0.27, sz0 + sd - 1.6); fk.rotation.y = 0.5; g.add(fk);
  const dd = dockDoor(3.6, 3.2, true); dd.position.set(bld.x + bld.w, 0.27, bz - 3); dd.rotation.y = -Math.PI / 2; g.add(dd);
  const tk = truck(C.violet, { load: false }); tk.position.set(bld.x + bld.w + 6.5, 0, bz - 3); tk.rotation.y = Math.PI; g.add(tk); g.add(label('Livraison fournisseur au quai', { cls: 'soft', x: bld.x + bld.w + 6.5, y: 3.4, z: bz - 3, min: 14 }));
  // listes par métier : étagère murale avec les kits (dotations)
  const listes = (st.listes || []).slice(0, 6); if (listes.length) { listes.forEach((l, i) => { const kit = rbox(0.9, 0.5, 0.5, [C.lav2, C.ok2, C.att2, C.bq2, C.gris2, C.bleu][i % 6], { r: 0.04, x: sx0 + 1 + i * 1.1 + 0.45, y: 0.27, z: sz0 + sd - 0.9 }); pickable(kit, { type: 'liste', id: l.id }, 'Liste ' + l.nom + ' · ' + (l.n || 0) + ' articles'); g.add(kit, label(l.nom, { cls: 'soft', x: sx0 + 1.45 + i * 1.1, y: 1.1, z: sz0 + sd - 0.9, min: 26 })); }); g.add(label('Listes par métier (dotations)', { cls: 'nuit', x: sx0 + 1 + listes.length * 0.55, y: 1.7, z: sz0 + sd - 0.9, min: 16, max: 25.9 })); }
  g.add(label('Magasin' + (st.n ? ' · ' + st.n + ' articles' : '') + (st.bas ? ' · ' + st.bas + ' à commander' : '') + (st.rup ? ' · ' + st.rup + ' en rupture' : ''), { cls: st.rup ? 'bad' : st.bas ? 'warn' : 'ok', x: sx0 + sw / 2, y: 3.6, z: sz0 + sd / 2, max: 19.9 }));
  cams.magasin = [sx0 + sw / 2, 0, sz0 + sd / 2 + 1, Math.max(sw, sd) * 0.34];
  // ── VESTIAIRE (terrain)
  const vx = sx0, vz = sz0 + sd + 1, vw = sw, vd = bld.z + bld.d - vz - 1; g.add(rbox(vw, 0.02, vd, 0xF1E6D2, { r: 0.05, x: vx + vw / 2, y: 0.25, z: vz + vd / 2, shadow: false }));
  const nL = Math.min(M.ter.length || 1, Math.floor((vw - 1) / 0.42)); const lk = lockers(Math.max(nL, 4), M.ter.map(p => FAM_COL[p.fam] || C.lav2)); lk.position.set(vx + vw / 2, 0.27, vz + 0.6); g.add(lk);
  const bn = bench(); bn.position.set(vx + vw / 2 - 2, 0.27, vz + 2.6); g.add(bn); const bn2 = bench(); bn2.position.set(vx + vw / 2 + 2, 0.27, vz + 2.6); g.add(bn2);
  const terHere = M.ter.filter(p => p.today && p.today.where === 'depot' && !p.vehId); terHere.slice(0, 10).forEach((p, i) => { const f = figure(p.svg, 1.75); f.position.set(vx + 1.5 + i * 1.1, 0.27, vz + vd - 1.6); pickable(f, { type: 'person', id: p.id }, p.prenom + ' · ' + (p.posteLabel || '') + ' · au dépôt'); g.add(f); });
  g.add(label('Vestiaire · ' + M.ter.length + ' compagnon' + (M.ter.length > 1 ? 's' : '') + ' · ' + M.ter.filter(p => p.today && p.today.where === 'chantier').length + ' sur chantier', { cls: 'soft', x: vx + vw / 2, y: 2.4, z: vz + vd / 2, min: 5, max: 22 }));
  // ── PARKING : une place par véhicule, le conducteur du jour à côté ; place vide = véhicule sorti (sur chantier)
  const pkz = bld.z + bld.d + 3, pkw = M.parkW - 4; const bays = Math.max(M.bays, 8); const perRow = Math.ceil(bays / 2);
  g.add(box(pkw + 2, 0.06, 17, C.bitume, { x: bx, y: -0.02, z: pkz + 8.5 }));
  const bayAt = i => { const r = i < perRow ? 0 : 1, c = i % perRow; return [bx - pkw / 2 + 1.7 + c * (pkw / perRow), pkz + 3 + r * 10]; };
  for (let i = 0; i < bays; i++) { const [x, z] = bayAt(i); g.add(box(0.12, 0.01, 5.2, C.blanc, { x: x - (pkw / perRow) / 2 + 0.1, y: 0.03, z, shadow: false })); if (i % perRow === perRow - 1) g.add(box(0.12, 0.01, 5.2, C.blanc, { x: x + (pkw / perRow) / 2 - 0.1, y: 0.03, z, shadow: false })); }
  const vehs = d.vehicles || []; const vehAt = {};
  vehs.slice(0, bays).forEach((v, i) => { const [x, z] = bayAt(i); vehAt[v.id] = [x, z]; const sev = (v.alerts || []).some(a => a.sev === 'bad') ? 'bad' : (v.alerts || []).length ? 'warn' : ''; const col = sev === 'bad' ? C.bq2 : sev === 'warn' ? C.att2 : (v.color == null ? C.blanc : v.color);
    if (v.out) { g.add(label('🦺 ' + (v.immat || '') + (v.chantierNom ? ' · ' + v.chantierNom : ' · sorti'), { cls: 'nuit', x, y: 0.6, z, min: 16 })); const ghost = rbox(4.2, 0.05, 1.9, C.lav2, { r: 0.1, x, y: 0.02, z, op: 0.6 }); pickable(ghost, { type: 'vehicle', id: v.id }, (v.label || v.immat) + ' — sorti' + (v.chantierNom ? ' sur ' + v.chantierNom : '')); g.add(ghost); return; }
    const kind = VEH_KIND(v.type); let m; if (kind === 'truck') m = truck(col, { load: true }); else if (kind === 'pelle') m = miniExcavator(C.orange); else if (kind === 'pickup') m = pickup(col); else if (kind === 'car') m = car(col); else m = van(col, { ladder: i % 2 === 0, stripe: C.violet });
    m.position.set(x, 0, z); m.rotation.y = Math.PI / 2 + (i < perRow ? Math.PI : 0); pickable(m, { type: 'vehicle', id: v.id }, (v.label || v.immat) + (v.typeLabel ? ' · ' + v.typeLabel : '') + (v.conducteurNom ? ' · ' + v.conducteurNom : '') + (sev === 'bad' ? ' · alerte' : sev === 'warn' ? ' · à surveiller' : '')); g.add(m);
    g.add(label(v.immat || v.label, { cls: sev || 'soft', x, y: 2.9, z: z + 0.2, min: 16, html: `<span class="ic" style="background:${sev === 'bad' ? '#A3221F' : sev === 'warn' ? '#C08A2E' : '#0E6B5C'}"></span>${escapeTxt(v.immat || v.label || '')}${v.typeLabel ? `<small>${escapeTxt(v.typeLabel)}</small>` : ''}` }));
    if (sev) { const bc = sph(0.16, sev === 'bad' ? C.bq : C.att, { x, y: 2.35, z, emis: sev === 'bad' ? C.bq : C.att, ei: 1.2, seg: 10, shadow: false }); bc.userData.noBake = true; g.add(bc); g.userData.beacons = (g.userData.beacons || []).concat([bc]); }
    const drv = d.people.find(p => p.id === v.conducteurId); if (drv && drv.today && drv.today.where === 'depot') { const f = figure(drv.svg, 1.75); f.position.set(x + 1.6, 0, z + 1.3); pickable(f, { type: 'person', id: drv.id }, drv.prenom + ' · ' + (drv.posteLabel || '') + ' · conduit ' + (v.immat || '')); g.add(f); } else if (v.conducteurNom) g.add(label(v.conducteurNom, { cls: 'soft', x: x + 1.4, y: 0.5, z: z + 1.6, min: 22 })); });
  for (let i = vehs.length; i < bays; i++) { const [x, z] = bayAt(i); if (i === vehs.length) g.add(label('place libre', { cls: 'soft', x, y: 0.3, z, min: 20 })); }
  [[bx - pkw / 2 - 2, pkz + 1], [bx + pkw / 2 + 2, pkz + 1], [bx, pkz + 17]].forEach(([x, z]) => { const lp = lampPost(4); lp.position.set(x, 0, z); g.add(lp); });
  cams.parking = [bx, 0, pkz + 8.5, Math.max(pkw * 0.3, 9)];
  // ── parc à tubes + benne (côté est)
  const yardX = bld.x + bld.w + 7; const ps1 = pipeStack(6, 8, C.encre); ps1.position.set(yardX, 0, bld.z + 6); g.add(ps1); const ps2 = pipeStack(3, 8, C.encre); ps2.position.set(yardX, 0, bld.z + 10); g.add(ps2); g.add(label('Parc à tubes', { cls: 'soft', x: yardX, y: 1.8, z: bld.z + 8, min: 14 }));
  const sk = skip(C.feuille2); sk.position.set(yardX + 1, 0, bld.z + bld.d - 4); g.add(sk);
  const bsh = [[bld.x - 2, bld.z + 4], [bld.x - 2, bld.z + 12], [bld.x - 2, bld.z + 20]]; bsh.forEach(([x, z]) => { const b = bush(1.2); b.position.set(x, 0, z); g.add(b); });
  // ── panneau d'accueil du dépôt (KPI) devant l'entrée
  const K = d.kpi || {}; const kp = label('', { cls: 'nuit big', x: bld.x - 4, y: 3.5, z: bld.z + bld.d + 2, max: 12, html: `${escapeTxt(d.nom)}<small>${K.presents != null ? K.presents + ' présents' : ''}${K.chantiers != null ? ' · ' + K.chantiers + ' chantiers actifs' : ''}${K.alertes ? ' · <b style="color:#F6C6C1">' + K.alertes + ' alerte' + (K.alertes > 1 ? 's' : '') + '</b>' : ''}</small>` }); g.add(kp);
  bake(g); /* tout ce qui ne se clique pas (sol, murs, arbres, marquages…) fusionné par matière */
  g.userData.cams = Object.assign(cams, { all: [bx, 0, bz + 8, Math.max(M.bldW + 16, M.bldD + 30) * 0.42], entree: [doorX, 0, bld.z + bld.d, 9] }); g.userData.pods = pods; g.userData.vehAt = vehAt; g.userData.dims = M; g.userData.bld = bld;
  return g;
}
const escapeTxt = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** plusieurs dépôts côte à côte (ouest → est), espacés ; renvoie {group, centers:{k:[x,z,half]}} */
export function buildWorld(depots, o) {
  const g = grp(); const centers = {}; let x = 0; const gap = 60;
  depots.forEach((d, i) => { const dg = buildDepot(d, o); const M = dg.userData.dims; const half = M.siteW / 2; x += half; dg.position.set(x, 0, 0); g.add(dg); centers[d.k] = { x, z: 0, half: Math.max(M.bldW + 16, M.bldD + 30) * 0.42, cams: dg.userData.cams, pods: dg.userData.pods, vehAt: dg.userData.vehAt, group: dg }; x += half + gap; });
  const total = x - gap; g.position.x = -total / 2; Object.values(centers).forEach(c => { c.x -= total / 2; });
  // sol lointain
  g.add(plane(total + 400, 400, 0xDDE6D2, { x: total / 2, y: -0.4, z: 0 }));
  return { group: g, centers, width: total };
}
