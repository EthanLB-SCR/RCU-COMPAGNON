// unit_pose_1911.mjs — la « physique » de la pose des objets (src/monde3d/pose.js) : valeurs calculées à la main.
// node test/unit_pose_1911.mjs
import { aabb, hull, rectPoly, clampInto, snapInto, sep, overlap, hits, resolve, partsOf, boxOf, TOL } from '../src/monde3d/pose.js';
const R = {}; const fails = []; const ok = (k, c, v) => { R[k] = v === undefined ? c : v; if (!c) fails.push(k); }; const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; const part = (x0, x1, z0, z1, y0, y1, id) => { const poly = rect(x0, x1, z0, z1); return { poly, bb: aabb(poly), y0, y1, id }; };
const ROOM = { x0: -2.196, x1: 2.196, z0: -1.896, z1: 1.896 };

// p1 — enveloppe convexe, boîte, rectangle tourné
{ const h = hull([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5], [1, 0]]); const plat = hull([[0, 0], [1, 0], [2, 0]]); const q = rectPoly(1, 2, { x0: -0.5, x1: 0.5, z0: -0.2, z1: 0.2 }, Math.PI / 2, 1); const b = aabb(q);
  ok('p1', h.length === 4 && plat.length === 4 && near(aabb(plat).z1 - aabb(plat).z0, 0.004) && near(b.x0, 0.8) && near(b.x1, 1.2) && near(b.z0, 1.5) && near(b.z1, 2.5), { hull: h.length, plat: plat.length, quartDeTour: [b.x0, b.x1, b.z0, b.z1].map(v => +v.toFixed(3)) }); }

// p2 — tenir dans la surface : un meuble de 90 × 32 poussé dans le mur s'arrête contre lui (plus de rouge) ; trop grand = fit false
{ const meuble = rectPoly(2.5, 0.3, { x0: -0.45, x1: 0.45, z0: -0.16, z1: 0.16 }, -Math.PI / 2, 1); const c = clampInto(meuble, ROOM); const a = aabb(meuble.map(p => [p[0] + c.dx, p[1] + c.dz]));
  const coin = clampInto(rectPoly(-3, -3, { x0: -0.45, x1: 0.45, z0: -0.16, z1: 0.16 }, 0, 1), ROOM); const grand = clampInto(rect(0, 0.6, 0, 0.3), { x0: 0, x1: 0.5, z0: 0, z1: 0.5 });
  ok('p2', c.fit && near(a.x1, 2.196) && near(a.x1 - a.x0, 0.32) && near(c.dz, 0) && coin.fit && near(-3 - 0.45 + coin.dx, -2.196) && near(-3 - 0.16 + coin.dz, -1.896) && grand.fit === false, { dos: +a.x1.toFixed(3), profondeur: +(a.x1 - a.x0).toFixed(2), coin: [+coin.dx.toFixed(3), +coin.dz.toFixed(3)], tropGrand: grand.fit }); }

// p3 — aimant : à 3 cm du mur on s'y colle, à 8 cm non
{ const pres = snapInto(rect(1.5, 2.166, 0, 0.5), ROOM, 0.05), loin = snapInto(rect(1.5, 2.116, 0, 0.5), ROOM, 0.05), colle = snapInto(rect(1.5, 2.196, 0, 0.5), ROOM, 0.05);
  ok('p3', near(pres.dx, 0.03) && loin.dx === 0 && colle.dx === 0 && pres.dz === 0, { pres: +pres.dx.toFixed(3), loin: loin.dx, colle: colle.dx }); }

// p4 — chevauchement : au contact = libre ; 2 cm dedans = le plus court chemin pour sortir ; un carré tourné de 45° ne gêne pas dans le coin de sa boîte
{ const A = rect(0, 1, 0, 1); const contact = sep(A, rect(1, 2, 0, 1)); const dedans = sep(A, rect(0.98, 2, 0.2, 0.8)); const losange = rectPoly(0, 0, { x0: -0.5, x1: 0.5, z0: -0.5, z1: 0.5 }, Math.PI / 4, 1); const coin = rect(0.45, 0.7, 0.45, 0.7);
  const bbL = aabb(losange); const dansBoite = bbL.x1 > 0.45 && bbL.z1 > 0.45;
  ok('p4', contact === null && dedans && near(dedans[0].x, -0.02) && near(dedans[0].z, 0) && near(dedans[0].depth, 0.02) && dansBoite && overlap(losange, coin) === false && overlap(losange, rect(0.2, 0.5, 0.2, 0.5)) === true, { contact, sortie: [+dedans[0].x.toFixed(3), +dedans[0].z.toFixed(3)], coinDeBoiteLibre: !overlap(losange, coin) }); }

// p5 — en hauteur : une corbeille (30 cm) passe sous le plateau (69 à 74 cm) mais pas dans le caisson ; un ficus (1,60 m) non ; un mug posé sur le plateau ne le « touche » pas, mais gêne le clavier
{ const plateau = part(-0.75, 1.35, -1.225, -0.375, 0.69, 0.74), caisson = part(0.9, 1.3, -1.2, -0.4, 0, 0.69), clavier = part(0.08, 0.52, -1.075, -0.925, 0.74, 0.758); const obs = [plateau, caisson, clavier];
  const corbeille = rect(-0.2, 0.1, -1.0, -0.7), mug = rect(0.2, 0.3, -1.05, -0.95), mugLibre = rect(-0.5, -0.4, -0.7, -0.6);
  ok('p5', hits(corbeille, 0, 0.3, obs) === null && hits(rect(1.0, 1.25, -1.0, -0.75), 0, 0.3, obs) === caisson && hits(corbeille, 0, 1.6, obs) === plateau && hits(mug, 0.74, 0.84, obs) === clavier && hits(mugLibre, 0.74, 0.84, obs) === null,
    { corbeilleSousPlateau: !hits(corbeille, 0, 0.3, obs), dansLeCaisson: !!hits(rect(1.0, 1.25, -1.0, -0.75), 0, 0.3, obs), ficus: !!hits(corbeille, 0, 1.6, obs), mugSurClavier: !!hits(mug, 0.74, 0.84, obs), mugSurPlateau: !hits(mugLibre, 0.74, 0.84, obs) }); }

// p6 — étagère : 33 cm sous une planche à 35,5 cm → tient ; 40 cm → bute sous la planche du dessus ; deux niveaux ne se gênent pas
{ const planche0 = part(-0.43, 0.43, -0.15, 0.15, 0.04, 0.065), planche1 = part(-0.43, 0.43, -0.15, 0.15, 0.42, 0.445), joue = part(0.428, 0.45, -0.16, 0.16, 0, 1.9), voisinDessus = part(-0.1, 0.1, -0.1, 0.1, 0.445, 0.6); const obs = [planche0, planche1, joue, voisinDessus];
  const P = rect(-0.1, 0.1, -0.1, 0.1);
  ok('p6', hits(P, 0.065, 0.065 + 0.33, obs) === null && hits(P, 0.065, 0.065 + 0.40, obs) === planche1 && hits(rect(0.3, 0.44, -0.1, 0.1), 0.065, 0.2, obs) === joue, { tient: !hits(P, 0.065, 0.395, obs), tropHaut: hits(P, 0.065, 0.465, obs) === planche1, joue: hits(rect(0.3, 0.44, -0.1, 0.1), 0.065, 0.2, obs) === joue }); }

// p7 — pousser à côté : un meuble lâché à cheval sur un autre glisse juste à côté (collé) ; coincé contre le mur, il sort de l'autre côté ; sans place : pas libre
{ const autre = part(1.876, 2.196, -0.45, 0.45, 0, 1.9); /* une bibliothèque contre le mur de droite */
  const moi = rect(1.876, 2.196, 0.30, 1.20); /* la même, 15 cm à cheval dessus */ const r = resolve(moi, 0, 1.9, [autre], { max: 1, bounds: ROOM });
  const mur = part(1.0, 2.196, 1.5, 1.896, 0, 2), coince = rect(1.4, 2.0, 1.3, 1.6); const r2 = resolve(coince, 0, 1, [mur], { max: 1, bounds: ROOM }); /* le plus court serait de monter (dans le mur du fond) : on redescend */
  const plein = [part(-0.5, 0.5, -0.5, 0.5, 0, 1)]; const r3 = resolve(rect(-0.1, 0.1, -0.1, 0.1), 0, 1, plein, { max: 0.2 });
  ok('p7', r.free && near(r.dx, 0) && near(r.dz, 0.15) && r2.free && near(r2.dz, -0.1) && near(r2.dx, 0) && r3.free === false && r3.dx === 0, { glisse: [+r.dx.toFixed(3), +r.dz.toFixed(3)], coince: [+r2.dx.toFixed(3), +r2.dz.toFixed(3)], pasLaPlace: !r3.free }); }

// p8 — entre deux meubles espacés de 60 cm, un meuble de 50 cm lâché de travers trouve sa place ; un de 70 cm non
{ const g = part(-1.0, -0.3, 1.5, 1.896, 0, 1), d = part(0.3, 1.0, 1.5, 1.896, 0, 1); const r = resolve(rect(-0.4, 0.1, 1.5, 1.896), 0, 1, [g, d], { max: 1, bounds: ROOM }); const r2 = resolve(rect(-0.4, 0.3, 1.5, 1.896), 0, 1, [g, d], { max: 0.3, bounds: ROOM });
  ok('p8', r.free && near(r.dx, 0.1) && near(r.dz, 0) && r2.free === false, { entreDeux: [+r.dx.toFixed(3), +r.dz.toFixed(3)], tropLarge: !r2.free }); }

// p9 — parties d'un objet 3D (faux objets : matrices 4 × 4 en colonnes comme three.js) : une par maillage visible, pas ce qui est posé dessus, pas les surfaces invisibles
{ const T = (x, y, z, s) => ({ elements: [s || 1, 0, 0, 0, 0, s || 1, 0, 0, 0, 0, s || 1, 0, x, y, z, 1] }); const geo = (x, y, z) => ({ boundingBox: { min: { x: -x / 2, y: 0, z: -z / 2 }, max: { x: x / 2, y, z: z / 2 } } });
  const mesh = (m, g, o) => Object.assign({ isMesh: true, geometry: g, matrixWorld: m, userData: {}, children: [] }, o || {});
  const pose = { userData: { objId: 'mug' }, matrixWorld: T(0, 0, 0), children: [mesh(T(1, 0.5, 2), geo(0.1, 0.1, 0.1))] };
  const meuble = { userData: { objId: 'bib' }, matrixWorld: T(1, 0, 2), children: [mesh(T(1, 0, 2), geo(0.9, 1.9, 0.32)), mesh(T(1, 0.42, 2), geo(0.86, 0.025, 0.3)), mesh(T(1, 0.45, 2), geo(0.84, 0.001, 0.28), { material: { visible: false } }), mesh(T(1, 0, 2), geo(5, 5, 5), { visible: false }), pose] };
  const P = partsOf(meuble, null, n => !!(n.userData && n.userData.objId) && n !== meuble); const b = boxOf(P); const inv = T(-1, 0, -2).elements; const L = boxOf(partsOf(meuble, inv, n => !!(n.userData && n.userData.objId) && n !== meuble));
  ok('p9', P.length === 2 && near(b.x0, 0.55) && near(b.x1, 1.45) && near(b.z0, 1.84) && near(b.z1, 2.16) && near(b.y1, 1.9) && near(L.x0, -0.45) && near(L.z1, 0.16) && boxOf([]) === null, { parties: P.length, boite: [b.x0, b.x1, b.z0, b.z1, b.y1].map(v => +v.toFixed(2)), locale: [+L.x0.toFixed(2), +L.z1.toFixed(2)] }); }

// p11 — un ballon de 22 cm TOURNÉ : par ses sommets il reste un rond de 22 cm de haut (par les coins de sa boîte il en ferait ~37 → refusé à tort sur une étagère)
{ const N = 24, V = []; for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) { const a = Math.PI * i / N, b = 2 * Math.PI * j / N; V.push([0.11 * Math.sin(a) * Math.cos(b), 0.11 * Math.cos(a), 0.11 * Math.sin(a) * Math.sin(b)]); }
  const pos = { count: V.length, getX: i => V[i][0], getY: i => V[i][1], getZ: i => V[i][2] }; const c = Math.SQRT1_2; /* tourné de 45° autour de x puis de z, centre à 11 cm du sol */
  const rot = [c, c * c, c * c, 0, -c, c * c, c * c, 0, 0, -c, c, 0, 0, 0.11, 0, 1];
  const ballon = { isMesh: true, userData: {}, children: [], matrixWorld: { elements: rot }, geometry: { attributes: { position: pos }, boundingBox: { min: { x: -0.11, y: -0.11, z: -0.11 }, max: { x: 0.11, y: 0.11, z: 0.11 } } } };
  const exact = boxOf(partsOf(ballon, null)); const coins = boxOf(partsOf(Object.assign({}, ballon, { geometry: { boundingBox: ballon.geometry.boundingBox } }), null));
  ok('p11', near(exact.y0, 0, 0.002) && near(exact.y1, 0.22, 0.002) && near(exact.x1 - exact.x0, 0.22, 0.004) && coins.y1 - coins.y0 > 0.3 && partsOf(ballon, null)[0].poly.length >= 12, { hauteur: +(exact.y1 - exact.y0).toFixed(3), largeur: +(exact.x1 - exact.x0).toFixed(3), parLesCoins: +(coins.y1 - coins.y0).toFixed(3), cotes: partsOf(ballon, null)[0].poly.length }); }

// p10 — tolérance : deux meubles collés (au millimètre) ne se gênent pas ; au-delà de 4 mm si
ok('p10', TOL === 0.004 && !overlap(rect(0, 1, 0, 1), rect(0.997, 2, 0, 1)) && overlap(rect(0, 1, 0, 1), rect(0.99, 2, 0, 1)), { tol: TOL });

Object.entries(R).forEach(([k, v]) => console.log(k + ') ' + JSON.stringify(v)));
console.log('RESULTAT: ' + (fails.length ? 'ECHEC ' + fails.join(',') : 'TOUT VERT')); process.exit(fails.length ? 1 : 0);
