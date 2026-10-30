// make_icons.mjs — 30/10/2026 (charte « Tracé », fiche claude/charte-trace.md) : icônes de l'appli générées depuis le dessin de référence.
// Lancer depuis app/ : node tools/make_icons.mjs → public/icons/*.png, public/icons/trace.svg, public/favicon.svg (copiés dans dist/ par vite, puis à la racine et dans docs/).
//  · « any » 192 / 512 : carré arrondi Nuit, coupe du pré-isolé en blanc, avec les deux fils
//  · « maskable » 192 / 512 + icône iPhone 180 : même dessin sur fond plein, sans coins arrondis (le système arrondit) ; anneaux à 69 % de la largeur (zone sûre ≤ 72 %)
//  · favicon (≤ 32 px) : sans les deux fils (illisibles à cette taille)
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)); const PUB = path.join(here, '..', 'public'); const OUT = path.join(PUB, 'icons');
const V = '#2B1B5A';
const rings = wires => `<g transform="translate(14 14) scale(0.72)"><circle cx="50" cy="50" r="48" fill="#fff"/><circle cx="50" cy="50" r="40" fill="${V}"/><circle cx="50" cy="50" r="24" fill="#fff"/><circle cx="50" cy="50" r="17" fill="${V}"/>${wires ? '<circle cx="22.3" cy="34" r="4" fill="#fff"/><circle cx="77.7" cy="34" r="4" fill="#fff"/>' : ''}</g>`;
export const svgRound = (wires = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${V}"/>${rings(wires)}</svg>`;
export const svgFull = (wires = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${V}"/>${rings(wires)}</svg>`;
const PNG = [['trace-192.png', 192, svgRound(true)], ['trace-512.png', 512, svgRound(true)], ['trace-maskable-192.png', 192, svgFull(true)], ['trace-maskable-512.png', 512, svgFull(true)], ['apple-touch-icon.png', 180, svgFull(true)], ['favicon-32.png', 32, svgRound(false)], ['favicon-16.png', 16, svgRound(false)]];
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(PUB, 'favicon.svg'), svgRound(false) + '\n'); fs.writeFileSync(path.join(OUT, 'trace.svg'), svgRound(true) + '\n');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [name, size, svg] of PNG) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(OUT, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }); await page.close();
  console.log('✓', name, size + ' px');
}
await browser.close();
