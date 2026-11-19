// e2e_pose_1911 — bureau 3D, personnalisation (19/11, Ethan) : « un meuble que je ne peux pas coller au mur alors qu'il y a la place… des fois c'est rouge » ;
// « les objets de bureau et au sol dans les étagères si la taille le permet » ; « un aquarium en déco, avec le choix de ce qu'on met dedans ».
// Hors connexion, personnage de démo. Le glisser est joué par son gestionnaire (V.dragStart → onMove(surface, point) → onEnd), comme le fait la souris.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8765'; const J = x => JSON.stringify(x);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
const logs = []; page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message.slice(0, 300))); page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis/i.test(m.text())) logs.push(m.text().slice(0, 200)); });
page.on('dialog', d => d.accept().catch(() => { })); const C = {}; const W = ms => page.waitForTimeout(ms);
await page.clock.install({ time: new Date(2026, 10, 19, 9, 0, 0) });
await page.goto(BASE + '/index.html'); await W(600); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('trace:wide', '1'); }); await page.evaluate(() => new Promise(r => { try { const q = indexedDB.deleteDatabase('trace-kv'); q.onsuccess = q.onerror = q.onblocked = () => r(); } catch (e) { r(); } }));
await page.reload(); await W(1200); { const s = await page.$('#loginSkip'); if (s && await s.isVisible()) await s.click(); await W(700); }
await page.evaluate(() => { localStorage.setItem('trace:monde', JSON.stringify({ v: 1, on: true, testeurs: ['ethan', 'l:ethan'], depots: { ouest: { nom: 'Dépôt A', ville: 'Ville A' }, idf: { nom: 'Dépôt B', ville: 'Ville B' } }, magasin: 'ouest' })); location.reload(); }); await W(1500);
{ const s = await page.$('#loginSkip'); if (s && await s.isVisible()) await s.click(); await W(600); }
await page.evaluate(() => { const T = window.TRACE; T.state.userId = 'ethan'; T.renderHome(); }); await W(500);
await page.evaluate(() => { const b = document.getElementById('htHome'); if (b) b.click(); }); await page.waitForFunction(() => { const M = window.TRACE.monde3d && window.TRACE.monde3d(); return !!(M && M.state && M.state.pod); }, null, { timeout: 30000 }); await W(1500);
await page.evaluate(() => { [...document.querySelectorAll('#eq-app .m3d-chip')].find(b => /Personnaliser/.test(b.textContent)).click(); }); await page.waitForFunction(() => { const M = window.TRACE.monde3d(); return !!(M.state.perso && M.state.pod && M.state.pod.userData.surfaces); }, null, { timeout: 20000 }); await W(800);

const add = async (fam, k) => { await page.evaluate(() => document.querySelector('#eq-app [data-ptab="objets"]').click()); await W(200); await page.evaluate(f => document.querySelector('#eq-app [data-pfam="' + f + '"]').click(), fam); await W(200); await page.evaluate(x => document.querySelector('#eq-app [data-add="' + x + '"]').click(), k); await W(1100); return page.evaluate(x => { const L = window.TRACE.monde3d().state.prefs.objets.filter(o => o.k === x); return L[L.length - 1].id; }, k); };
/* l'objet tel qu'il est enregistré + sa boîte dans la pièce */
const obj = id => page.evaluate(id => { const M = window.TRACE.monde3d(); const H = M.state, pod = H.pod; const o = (H.prefs.objets || []).find(x => x.id === id); if (!o) return null; const w = pod.userData.objs[id]; pod.updateWorldMatrix(true, true); const B = new (pod.userData.obstacles[0].box.constructor)(); const r = n => +n.toFixed(3);
  const walk = n => { if (n !== w && n.userData.objId) return; if (n.isMesh && n.geometry && !(n.material && n.material.visible === false)) { if (!n.geometry.boundingBox) n.geometry.computeBoundingBox(); B.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld)); } n.children.forEach(walk); }; walk(w);
  return { k: o.k, surf: o.surf, x: r(o.x), y: r(o.y), z: r(o.z), ry: o.ry == null ? null : +o.ry.toFixed(2), s: o.s, on: o.on || '', lx: o.lx == null ? null : r(o.lx), ly: o.ly == null ? null : r(o.ly), lz: o.lz == null ? null : r(o.lz), aq: o.aq, box: [r(B.min.x), r(B.max.x), r(B.min.z), r(B.max.z)], h: [r(B.min.y), r(B.max.y)] }; }, id);
/* glisser : moves = [[surface, x, y, z, idDuMeuble?, niveau?]] dans le repère de la pièce ; rend l'état après chaque mouvement (rouge ?) puis dépose */
const drag = (id, moves, end) => page.evaluate(({ id, moves, end }) => { const M = window.TRACE.monde3d(); const V = M.viewer, H = M.state, pod = H.pod; const o = (H.prefs.objets || []).find(x => x.id === id); const wrap = pod.userData.objs[id]; const h = V.dragStart({ type: 'obj', id }, wrap, null); if (!h) return { err: 'pas de glisser' };
  const S = pod.userData.surfaces; const out = []; for (const [sf, x, y, z, onId, niv] of moves) { const L = S.filter(m => m.userData.surf === sf && (!onId || m.userData.onId === onId)).sort((a, b) => a.userData.shelfY - b.userData.shelfY); const pl = onId ? L[niv || 0] : L[0]; if (!pl) return { err: 'surface ' + sf };
    const pt = onId ? pl.localToWorld(pod.position.clone().set(x, z, 0)) : pod.localToWorld(pod.position.clone().set(x, y, z)); h.onMove({ object: pl, point: pt }, true); let rouge = false; wrap.traverse(n => { if (n.userData.badM) rouge = true; }); const r = n => n == null ? null : +n.toFixed(3); out.push({ x: r(o.x), y: r(o.y), z: r(o.z), ry: o.ry == null ? null : +o.ry.toFixed(2), surf: o.surf, on: o.on || '', lx: r(o.lx), ly: r(o.ly), lz: r(o.lz), rouge }); }
  const toast0 = (document.querySelector('.m3d-toast,.toast') || {}).textContent || ''; if (end !== false) h.onEnd(true); return { pose: !!h.pose, moves: out, n: out.length, last: out[out.length - 1] }; }, { id, moves, end });
const toast = () => page.evaluate(() => [...document.querySelectorAll('#eq-app .m3d-toast, .m3d-toast, #toast, .toast')].map(e => e.textContent).join(' | '));
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 0.006 : e); const W2 = 2.2, D2 = 1.9;
/* le message affiché à la dépose refusée (on l'attend jusqu'à 4 s : sous charge il arrive après le redessin de la pièce) */
const msgRefus = async () => { for (let i = 0; i < 20; i++) { const m = await page.evaluate(() => (document.body.innerText.match(/(Trop haut pour cette étagère|Trop grand pour tenir ici|Pas la place ici)[^\n]*/) || [])[0] || ''); if (m) return m; await W(200); } return ''; };

// ── m1) un rangement ajouté arrive le dos COLLÉ au mur (avant : à 20 cm) ; le sol va jusqu'aux murs (avant : 15 cm de marge où tout était refusé)
const bib = await add('rangements', 'biblio'); const m1 = await obj(bib);
const sol = await page.evaluate(() => { const S = window.TRACE.monde3d().state.pod.userData.surfaces; const f = S.find(m => m.userData.surf === 'floor').geometry.parameters; return [f.width, f.height, S.filter(m => m.userData.surf === 'shelf').length]; });
console.log('m1) rangement ajouté :', J({ m1, sol })); C.m1 = m1.surf === 'floor' && near(m1.box[1], W2 - 0.004) && near(m1.box[1] - m1.box[0], 0.32, 0.01) && near(sol[0], 4.4) && near(sol[1], 3.8) && sol[2] === 6;

// ── m2) le curseur SUR un mur (le cas d'Ethan : on pousse le meuble vers le mur) → le meuble se pose à son pied, dos collé, tourné dos au mur, PAS rouge (avant : toujours rouge)
const d2 = await drag(bib, [['wall:front', 0.8, 1.2, D2 - 0.01]]); await W(900); const m2 = await obj(bib);
console.log('m2) curseur sur le mur :', J({ d: d2.last, m2 })); C.m2 = d2.pose && !d2.last.rouge && m2.surf === 'floor' && near(m2.box[3], D2 - 0.004) && near(m2.x, 0.8) && near(Math.abs(m2.ry), 3.14, 0.01);

// ── m3) lâché dans le coin, au-delà des deux murs → collé aux deux ; puis dans l'ancienne marge de 15 cm, à 5 cm du mur → l'aimant le colle
const d3 = await drag(bib, [['floor', 2.19, 0, 1.89]]); await W(900); const m3 = await obj(bib);
const d3b = await drag(bib, [['floor', -1.0, 0, 1.70]]); await W(900); const m3b = await obj(bib);
console.log('m3) coin, aimant :', J({ coin: m3.box, rouge: d3.last.rouge, aimant: m3b.box, rougeB: d3b.last.rouge })); C.m3 = !d3.last.rouge && near(m3.box[1], W2 - 0.004) && near(m3.box[3], D2 - 0.004) && !d3b.last.rouge && near(m3b.box[3], D2 - 0.004) && near(m3b.x, -1.0);

// ── m4) un 2e meuble lâché À CHEVAL sur le premier → il glisse juste à côté, collé (écart ≤ 5 mm), contre le mur, pas rouge
const cub = await add('rangements', 'cubes'); const d4 = await drag(cub, [['floor', -0.55, 0, 1.8]]); await W(900); const m4 = await obj(cub); const b4 = await obj(bib);
const ecart = Math.max(m4.box[0] - b4.box[1], b4.box[0] - m4.box[1]);
console.log('m4) deux meubles côte à côte :', J({ cubes: m4.box, biblio: b4.box, ecart: +ecart.toFixed(3), rouge: d4.last.rouge })); C.m4 = !d4.last.rouge && ecart >= -0.005 && ecart <= 0.006 && near(m4.box[3], D2 - 0.004);

// ── m5) en hauteur : une corbeille (30 cm) se glisse SOUS le plateau du bureau (avant : interdit, la boîte du bureau en L couvrait tout) ; un ficus au même endroit est poussé hors du plateau
const pou = await add('sol', 'poubelle'); const fic = await add('plantes', 'plante_ficus');
const sous = await page.evaluate(() => { const pod = window.TRACE.monde3d().state.pod; const d = pod.userData.surfaces.find(m => m.userData.surf === 'desk'); const g = d.geometry.parameters, p = d.position; return { x0: p.x - g.width / 2, x1: p.x + g.width / 2, z0: p.z - g.height / 2, z1: p.z + g.height / 2 }; });
let m5 = null; for (const fx of [0.25, 0.4, 0.55, 0.7]) { const x = sous.x0 + (sous.x1 - sous.x0) * fx, z = (sous.z0 + sous.z1) / 2 + 0.1; const d = await drag(pou, [['floor', x, 0, z]]); await W(700); const p = await obj(pou); if (!d.last.rouge && near(p.x, x, 0.02) && near(p.z, z, 0.02)) { m5 = { x: +x.toFixed(2), z: +z.toFixed(2), pou: p.box, h: p.h }; break; } }
let m5f = null; if (m5) { const d = await drag(fic, [['floor', m5.x + 0.3, 0, m5.z]]); await W(700); const f = await obj(fic); const dedans = f.x > sous.x0 && f.x < sous.x1 && f.z > sous.z0 && f.z < sous.z1; m5f = { x: f.x, z: f.z, h: f.h, dedans, rouge: d.last.rouge }; }
console.log('m5) sous le plateau :', J({ m5, m5f })); C.m5 = !!m5 && m5.h[1] < 0.69 && !!m5f && m5f.h[1] > 0.74 && (!m5f.dedans || m5f.rouge);

// ── m6) étagères : un objet du bureau (mug) ET un objet du sol (ballon) se posent sur une planche ; deux niveaux du même meuble ne se gênent plus
const mug = await add('bureau', 'mug'); const bal = await add('sol', 'ballon'); const mug2 = await add('bureau', 'mug');
const d6a = await drag(mug, [['shelf', 0.1, 0, 0, bib, 1]]); await W(800); const d6b = await drag(bal, [['shelf', -0.2, 0, 0, bib, 2]]); await W(800); const d6c = await drag(mug2, [['shelf', 0.1, 0, 0, bib, 2]]); await W(800);
const o6 = { mug: await obj(mug), bal: await obj(bal), mug2: await obj(mug2) };
console.log('m6) sur les étagères :', J({ rouges: [d6a.last.rouge, d6b.last.rouge, d6c.last.rouge], mug: [o6.mug.on, o6.mug.ly, o6.mug.lx], bal: [o6.bal.on, o6.bal.ly, o6.bal.surf, o6.bal.h], mug2: [o6.mug2.on, o6.mug2.ly, o6.mug2.lx] }));
C.m6 = !d6a.last.rouge && !d6b.last.rouge && !d6c.last.rouge && o6.mug.on === bib && o6.bal.on === bib && o6.mug2.on === bib && o6.mug.ly < o6.mug2.ly && near(o6.mug.lx, o6.mug2.lx, 0.03) && o6.bal.h[0] > 0.7;

// ── m7) « si la taille le permet » : une lampe boule (48 cm, trop haute pour 35 cm) sur une planche → rouge, elle reprend sa place, « Trop haut pour cette étagère » ; un vélo → « Trop grand pour tenir ici » ; un ficus → refusé aussi
const lam = await add('bureau', 'lampe_boule'); const avant7 = await obj(lam); const d7 = await drag(lam, [['shelf', 0, 0, 0, bib, 1]]); const t7 = [await msgRefus()]; await W(600); const m7 = await obj(lam);
const d7h = await drag(lam, [['shelf', 0.2, 0, 0, bib, 5]]); await W(800); const m7h = await obj(lam); /* tout en haut de la bibliothèque : rien au-dessus, elle y tient */
const vel = await add('sol', 'velo'); const avant7b = await obj(vel); await W(3600); /* le message précédent s'efface */ const d7b = await drag(vel, [['shelf', 0, 0, 0, bib, 5]]); const t7b = [await msgRefus()]; await W(600); const m7b = await obj(vel);
const avant7c = await obj(fic); const d7c = await drag(fic, [['shelf', 0, 0, 0, bib, 1]]); await W(900); const m7c = await obj(fic);
console.log('m7) trop haut / trop grand :', J({ lampe: { h: avant7.h, rouge: d7.last.rouge, on: m7.on, revenu: near(m7.x, avant7.x) && near(m7.z, avant7.z), msg: t7[0] || '', enHaut: [d7h.last.rouge, m7h.on === bib, m7h.ly] }, velo: { rouge: d7b.last.rouge, on: m7b.on, revenu: near(m7b.x, avant7b.x) && near(m7b.z, avant7b.z), msg: t7b[0] || '' }, ficus: { rouge: d7c.last.rouge, on: m7c.on, revenu: near(m7c.x, avant7c.x) } }));
C.m7 = d7.last.rouge && !m7.on && near(m7.x, avant7.x) && near(m7.z, avant7.z) && m7.surf === 'desk' && /^Trop haut pour cette étagère/.test(t7[0] || '') && !d7h.last.rouge && m7h.on === bib && m7h.ly > 1.8 && d7b.last.rouge && !m7b.on && near(m7b.x, avant7b.x) && /^Trop grand pour tenir ici/.test(t7b[0] || '') && d7c.last.rouge && !m7c.on && near(m7c.x, avant7c.x);

// ── m8) le meuble emporte ce qu'il porte ; son empreinte n'est pas gonflée par ses objets (il se recolle au mur d'en face, pas rouge)
const d8 = await drag(bib, [['wall:left', -W2 + 0.01, 1.0, 0.9]]); await W(900); const m8 = await obj(bib); const o8 = { mug: await obj(mug), bal: await obj(bal) };
console.log('m8) le meuble emporte ses objets :', J({ biblio: m8.box, rouge: d8.last.rouge, mug: [o8.mug.on, o8.mug.box], bal: [o8.bal.on] }));
C.m8 = !d8.last.rouge && near(m8.box[0], -W2 + 0.004) && o8.mug.on === bib && o8.bal.on === bib && o8.mug.box[0] >= m8.box[0] - 0.01 && o8.mug.box[1] <= m8.box[1] + 0.01 && o8.mug.box[2] >= m8.box[2] - 0.01 && o8.mug.box[3] <= m8.box[3] + 0.01;

// ── m9) rechargé depuis la fiche (normPrefs) : le ballon (objet « au sol ») reste sur son étagère ; le meuble retiré → ses objets retombent au sol
const m9 = await page.evaluate(({ bal, mug }) => { const L = window.TRACE.monde3d().state.prefs.objets; return { bal: (L.find(o => o.id === bal) || {}).on || '', mug: (L.find(o => o.id === mug) || {}).on || '', n: L.length }; }, { bal, mug });
await page.evaluate(id => { const M = window.TRACE.monde3d(); const w = M.state.pod.userData.objs[id]; M.viewer.dragStart({ type: 'obj', id }, w, null).onEnd(false); }, bib); await W(700); /* un clic sans bouger = sélectionner le meuble */
const sel9 = await page.evaluate(() => (document.querySelector('#eq-app .m3d-osel b') || {}).textContent || '');
await page.evaluate(() => document.querySelector('#eq-app [data-oact="del"]').click()); await W(1100); const o9 = { mug: await obj(mug), bal: await obj(bal), bib: await obj(bib) };
console.log('m9) fiche rechargée, meuble retiré :', J({ m9, sel9, apres: { bib: o9.bib, mug: [o9.mug.on, o9.mug.surf, o9.mug.y], bal: [o9.bal.on, o9.bal.surf, o9.bal.y] } }));
C.m9 = m9.bal === bib && m9.mug === bib && /Bibliothèque/.test(sel9) && o9.bib === null && !o9.mug.on && !o9.bal.on && o9.bal.surf === 'floor' && o9.bal.y === 0 && o9.mug.y === 0;

// ── a1) l'aquarium : dans « Objets de bureau », posé droit sur le plateau, contenu par défaut ; la fiche propose les 12 contenus
const aq = await add('bureau', 'aquarium'); const a1 = await obj(aq);
const p1 = await page.evaluate(() => [...document.querySelectorAll('#eq-app [data-oaq]')].map(b => b.dataset.oaq + (b.classList.contains('on') ? '*' : '')));
const vie = id => page.evaluate(id => { const M = window.TRACE.monde3d(); const w = M.state.pod.userData.objs[id]; let A = null; w.traverse(n => { if (n.userData.aqua) A = n.userData.aqua; }); return A ? { nage: A.fish.length, bulles: A.bulles.length, pos: A.fish.slice(0, 3).map(f => [+f.ob.position.x.toFixed(4), +f.ob.position.z.toFixed(4)]) } : null; }, id);
const v1 = await vie(aq);
console.log('a1) aquarium ajouté :', J({ a1, p1, v1 })); C.a1 = a1.surf === 'desk' && a1.ry === 0 && J(a1.aq) === J(['rouge', 'plantes', 'roche']) && p1.length === 12 && p1.filter(x => x.endsWith('*')).join() === 'rouge*,plantes*,roche*' && v1.nage === 3 && near(a1.box[1] - a1.box[0], 0.508, 0.01) && a1.h[1] - a1.h[0] < 0.36;

// ── a2) on choisit ce qu'on met dedans : néons, crevettes, bulleur en plus ; plus de poissons rouges ; enregistré sur l'objet ; tout retirer = de l'eau seulement
for (const k of ['neon', 'crevette', 'bulles', 'rouge']) { await page.evaluate(x => document.querySelector('#eq-app [data-oaq="' + x + '"]').click(), k); await W(800); }
const a2 = await obj(aq); const v2 = await vie(aq); const p2 = await page.evaluate(() => [...document.querySelectorAll('#eq-app [data-oaq].on')].map(b => b.dataset.oaq));
for (const k of a2.aq) { await page.evaluate(x => document.querySelector('#eq-app [data-oaq="' + x + '"]').click(), k); await W(700); } const a2v = await obj(aq); const v2v = await vie(aq);
await page.evaluate(() => document.querySelector('#eq-app [data-oaq="guppy"]').click()); await W(800); await page.evaluate(() => document.querySelector('#eq-app [data-oaq="combattant"]').click()); await W(800); const a2g = await obj(aq); const v2g = await vie(aq);
console.log('a2) contenu choisi :', J({ aq: a2.aq, v2: { nage: v2.nage, bulles: v2.bulles }, p2, vide: [a2v.aq, v2v.nage, v2v.bulles], guppys: [a2g.aq, v2g.nage] }));
C.a2 = J(a2.aq) === J(['neon', 'crevette', 'plantes', 'roche', 'bulles']) && v2.nage === 11 && v2.bulles === 6 && J(p2) === J(a2.aq) && Array.isArray(a2v.aq) && a2v.aq.length === 0 && v2v.nage === 0 && J(a2g.aq) === J(['guppy', 'combattant']) && v2g.nage === 5;

// ── a3) les poissons nagent (les positions changent d'une image à l'autre) et restent dans le bac
const v3a = await vie(aq); await W(1500); const v3b = await vie(aq); const dans = v3b.pos.every(([x, z]) => Math.abs(x) < 0.24 && Math.abs(z) < 0.12);
console.log('a3) ça nage :', J({ avant: v3a.pos, apres: v3b.pos, dans })); C.a3 = J(v3a.pos) !== J(v3b.pos) && dans;

// ── a4) l'aquarium va sur une étagère où il tient (buffet) ; trop haut pour une case de l'étagère à cases → refusé ; rapetissé → il y entre
const buf = await add('rangements', 'buffet'); const d4a = await drag(aq, [['shelf', 0, 0, 0, buf, 0]]); await W(900); const a4 = await obj(aq);
const d4b = await drag(aq, [['shelf', 0, 0, 0, cub, 1]]); await W(900); const a4b = await obj(aq);
await page.evaluate(id => { const M = window.TRACE.monde3d(); const w = M.state.pod.userData.objs[id]; M.viewer.dragStart({ type: 'obj', id }, w, null).onEnd(false); }, aq); await W(600); for (let i = 0; i < 3; i++) { await page.evaluate(() => [...document.querySelectorAll('#eq-app [data-oact="size"]')].find(b => b.dataset.v === '-0.15').click()); await W(700); }
const d4c = await drag(aq, [['shelf', 0, 0, 0, cub, 1]]); await W(900); const a4c = await obj(aq);
console.log('a4) aquarium sur étagère :', J({ buffet: [a4.on === buf, d4a.last.rouge], cases: [d4b.last.rouge, a4b.on === buf], petit: [a4c.s, d4c.last.rouge, a4c.on === cub, a4c.box] }));
C.a4 = a4.on === buf && !d4a.last.rouge && d4b.last.rouge && a4b.on === buf && a4c.s < 0.6 && !d4c.last.rouge && a4c.on === cub;

// ── w1) rien de changé pour les objets muraux : une affiche se glisse sur le mur d'en face avec le glisser d'avant
const aff = await add('affiches', await page.evaluate(() => { document.querySelector('#eq-app [data-pfam="affiches"]').click(); return (document.querySelector('#eq-app [data-add^="poster_"]') || {}).dataset.add; })); const w0 = await obj(aff);
let dw = null, w1 = null, wx = null; for (const x of [-1.2, -1.7, -0.6, 1.5, 0.9]) { dw = await drag(aff, [['wall:back', x, 1.5, -D2 + 0.01]]); await W(800); w1 = await obj(aff); wx = x; if (!dw.last.rouge) break; }
console.log('w1) affiche au mur :', J({ avant: [w0.surf, w0.x], apres: [w1.surf, w1.x, w1.y], pose: dw.pose, rouge: dw.last.rouge })); C.w1 = dw.pose === false && !dw.last.rouge && w1.surf === 'wall:back' && near(w1.x, wx, 0.02) && near(w1.y, 1.5, 0.02);

// ── t1) téléphone 390 px : la fiche de l'aquarium tient dans l'écran
await page.setViewportSize({ width: 390, height: 844 }); await W(900); await page.evaluate(id => { const M = window.TRACE.monde3d(); const w = M.state.pod.userData.objs[id]; M.viewer.dragStart({ type: 'obj', id }, w, null).onEnd(false); }, aq); await W(700);
const t1 = await page.evaluate(() => { const b = [...document.querySelectorAll('#eq-app [data-oaq]')]; const box = document.querySelector('#eq-app .m3d-osel'); return { n: b.length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, hors: b.filter(x => { const r = x.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).length, petit: b.filter(x => x.getBoundingClientRect().height < 34).length, box: !!box }; });
console.log('t1) téléphone :', J(t1)); C.t1 = t1.n === 12 && t1.sw <= t1.cw + 1 && t1.hors === 0 && t1.petit === 0;

console.log('console :', J(logs.slice(0, 5))); C.c = logs.length === 0;
const KO = Object.entries(C).filter(([, v]) => !v).map(([k]) => k); console.log('RESULTAT: ' + (KO.length ? 'ECHEC ' + KO.join(',') : 'TOUT VERT')); await browser.close(); process.exit(KO.length ? 1 : 0);
