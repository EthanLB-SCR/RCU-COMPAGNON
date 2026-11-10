// OUTIL DE MAQUETTE 3D (hors tests de l'appli) — sert à contrôler la maquette du Monde 3D : npm run build:monde, servir app/dist-monde sur le port 8769, puis node test/outils3d/etiquettes.mjs
// Variables : U (adresse de la maquette), OUT (dossier des captures, défaut ./shots), ONLY, TAG, VW, VH, DEP selon l'outil.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs'; mkdirSync(process.env.OUT || './shots', { recursive: true });
const U = process.env.U || 'http://127.0.0.1:8769/index.html', OUT = process.env.OUT || './shots', TAG = process.env.TAG || 'z';
const VW = +(process.env.VW || 1400), VH = +(process.env.VH || 900), ONLY = (process.env.ONLY || 'all,mid,mag,park,att,pf,survol').split(',');
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: VW, height: VH } }); const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#pt-nav button[data-k="monde"]'); await p.waitForTimeout(600);
await p.click('#pt-nav button[data-k="monde"]'); await p.waitForTimeout(2500);
const labs = () => p.evaluate(() => [...document.querySelectorAll('.m3d-lab')].filter(e => e.style.display !== 'none' && e.offsetParent !== null).map(e => e.textContent.trim().slice(0, 34)));
const step = async (n, f, wait) => { if (!ONLY.includes(n)) return; await f(); await p.waitForTimeout(wait || 1900); await p.screenshot({ path: `${OUT}/${TAG}_${n}.png` }); const L = await labs(); const M = L.filter(t => /cmd|rupture|AB-\d|place libre|prépar|prête|DN |Listes|Livraison|Accessoires|Coudes|Réseau|Chaufferie|Antenne|Bouclage/.test(t)); console.log(n, 'visibles', L.length, 'métier', M.length, JSON.stringify(M.slice(0, 9))); };
const frame = (dx, dz, half) => p.evaluate(([dx, dz, half]) => { const H = window.PROTO.H, c = H.state.world.centers[H.state.depotK], m = c.cams.magasin; H.viewer.frame([m[0] + c.x + dx, 0, m[2] + c.z + dz], half, 0.78, 0.62, true); }, [dx, dz, half]);
await step('all', () => p.evaluate(() => window.PROTO.H.go('cam', 'all')));
await step('mid', () => frame(-6, 2, 17), 700); /* zoom intermédiaire autour du magasin, comme sur la capture d'Ethan : aucune étiquette de stock */
await step('mag', () => p.evaluate(() => window.PROTO.H.go('cam', 'magasin')));
await step('park', () => p.evaluate(() => window.PROTO.H.go('cam', 'parking')));
await step('att', () => p.evaluate(() => window.PROTO.H.go('cam', 'attente')));
await step('pf', () => p.evaluate(() => { const c = [...document.querySelectorAll('.m3d-chip, .m3d-btn')].find(x => /Plateforme Nord/.test(x.textContent)); if (c) c.click(); else window.PROTO.H.go('plateforme', 'pfn'); }), 2200);
if (ONLY.includes('pf')) console.log('side', JSON.stringify(await p.evaluate(() => { const s = document.querySelector('.m3d-box'); return s ? s.textContent.slice(0, 160) : null; })));
await step('survol', () => p.evaluate(() => { const c = [...document.querySelectorAll('.m3d-chip')].find(x => /Survoler/.test(x.textContent)); if (c) c.click(); }), 2600);
console.log('errs', JSON.stringify(errs)); await b.close();
