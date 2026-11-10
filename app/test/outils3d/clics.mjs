// OUTIL DE MAQUETTE 3D (hors tests de l'appli) — sert à contrôler la maquette du Monde 3D : npm run build:monde, servir app/dist-monde sur le port 8769, puis node test/outils3d/clics.mjs
// Variables : U (adresse de la maquette), OUT (dossier des captures, défaut ./shots), ONLY, TAG, VW, VH, DEP selon l'outil.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs'; mkdirSync(process.env.OUT || './shots', { recursive: true });
const U = process.env.U || 'http://127.0.0.1:8769/index.html';
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#pt-nav button[data-k="monde"]'); await p.waitForTimeout(600);
await p.click('#pt-nav button[data-k="monde"]'); await p.waitForTimeout(2500);
const inv = await p.evaluate(() => { const H = window.PROTO.H, V = H.viewer, n = {}; V.pickables.forEach(m => { const t = m.userData.pick && m.userData.pick.type; n[t] = (n[t] || 0) + 1; });
  const dep = {}; Object.entries(H.state.world.centers).forEach(([k, c]) => { dep[k] = { cams: Object.keys(c.cams).sort().join(','), pods: Object.keys(c.pods).length, veh: Object.keys(c.vehAt).length }; });
  const o = V.onPick; V.onPick = (a, ob) => { window.__last = a; return o && o(a, ob); }; return { picks: n, total: V.pickables.length, dep }; });
const res = {};
for (const type of Object.keys(inv.picks)) {
  let ok = false, tries = 0;
  for (let i = 0; i < 10 && !ok; i++) {
    const pt = await p.evaluate(([type, i]) => { const H = window.PROTO.H, V = H.viewer, T = window.PROTO.CORE.THREE; const ms = V.pickables.filter(m => m.userData.pick && m.userData.pick.type === type); const seen = new Set(), uniq = []; ms.forEach(m => { const k = JSON.stringify(m.userData.pick); if (!seen.has(k)) { seen.add(k); uniq.push(m); } });
      const m = uniq[i]; if (!m) return null; const bb = new T.Box3().setFromObject(m), c = bb.getCenter(new T.Vector3()); V.frame([c.x, 0, c.z], 5, 0.78, 0.62, true); V.cam.updateMatrixWorld(true); const q = c.clone().project(V.cam), r = V.renderer.domElement.getBoundingClientRect(); window.__last = null; return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height, want: JSON.stringify(m.userData.pick) }; }, [type, i]);
    if (!pt) break; tries++; await p.waitForTimeout(250); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(250);
    const got = await p.evaluate(() => JSON.stringify(window.__last)); if (got === pt.want) ok = true; else if (process.env.DBG) console.log(type, i, 'want', pt.want, 'got', got);
  }
  res[type] = ok ? 'ok' : 'KO(' + tries + ')';
}
console.log(JSON.stringify({ inv, clicks: res, errs }));
await b.close();
