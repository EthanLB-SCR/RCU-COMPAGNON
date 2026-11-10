// OUTIL DE MAQUETTE 3D (hors tests de l'appli) — sert à contrôler la maquette du Monde 3D : npm run build:monde, servir app/dist-monde sur le port 8769, puis node test/outils3d/captures.mjs
// Variables : U (adresse de la maquette), OUT (dossier des captures, défaut ./shots), ONLY, TAG, VW, VH, DEP selon l'outil.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs'; mkdirSync(process.env.OUT || './shots', { recursive: true });
const U = process.env.U || 'http://127.0.0.1:8769/index.html';
const OUT = process.env.OUT || './shots';
const VW = +(process.env.VW || 1400), VH = +(process.env.VH || 900), DSF = +(process.env.DSF || 1);
const TAG = process.env.TAG || 'a';
const ONLY = (process.env.ONLY || 'all,bureaux,magasin,parking,attente,entree,survol,dos,flotte,magasinS,commerce').split(',');
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF, hasTouch: !!process.env.TOUCH })).newPage();
const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const W = ms => p.waitForTimeout(ms);
await p.goto(U); await p.waitForSelector('#pt-nav button[data-k="monde"]'); await W(600);
const nav = async k => { await p.click(`#pt-nav button[data-k="${k}"]`); await W(2600); };
const shot = async n => { await p.screenshot({ path: `${OUT}/${TAG}_${n}.png` }); };
const dk = process.env.DEP || '';
await nav('monde');
if (dk) { await p.evaluate(k => window.PROTO.H.go('depot', k), dk); await W(1800); }
for (const c of ['all', 'bureaux', 'magasin', 'parking', 'attente', 'entree']) { if (!ONLY.includes(c)) continue; await p.evaluate(c => window.PROTO.H.go('cam', c), c); await W(1900); await shot(c); }
if (ONLY.includes('dos')) { /* vue tournée : de l'arrière-gauche, pour vérifier que les façades hautes tiennent aussi de dos */
  await p.evaluate(() => { const H = window.PROTO.H, w = H.state.world, c = w.centers[H.state.depotK], C2 = c.cams.all; H.viewer.frame([C2[0] + c.x, 0, C2[2] + c.z], C2[3], 0.78 + Math.PI, 0.62, true); }); await W(1500); await shot('dos');
  await p.evaluate(() => { const H = window.PROTO.H, w = H.state.world, c = w.centers[H.state.depotK], C2 = c.cams.all; H.viewer.frame([C2[0] + c.x, 0, C2[2] + c.z], C2[3], -0.78, 0.62, true); }); await W(1500); await shot('gauche');
  await p.evaluate(() => { const H = window.PROTO.H, w = H.state.world, c = w.centers[H.state.depotK], C2 = c.cams.all; H.viewer.frame([C2[0] + c.x, 0, C2[2] + c.z], C2[3], 0.78, 0.62, true); }); await W(800); }
if (ONLY.includes('survol')) { await p.evaluate(() => { const b = [...document.querySelectorAll('.m3d-chip')].find(x => /Survoler/.test(x.textContent)); if (b) b.click(); }); await W(2400); await shot('survol'); }
for (const [k, n] of [['flotte', 'flotte'], ['magasin', 'magasinS'], ['commerce', 'commerce']]) { if (!ONLY.includes(n)) continue; await nav(k); await shot(n); }
const info = await p.evaluate(() => { const H = window.PROTO.H; const r = H.viewer.renderer; return { scene: H.state.scene, depot: H.state.depotK, calls: r ? r.info.render.calls : -1, tris: r ? r.info.render.triangles : -1, geoms: r ? r.info.memory.geometries : -1 }; });
console.log(JSON.stringify(info)); console.log('errs', JSON.stringify(errs.slice(0, 6)));
await b.close();
