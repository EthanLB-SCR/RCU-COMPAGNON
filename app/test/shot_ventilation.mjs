// captures de la maquette « nouvelle ventilation » (11/10) : accueil (Karim, Paul, Ethan), chantiers, plan (+ pose d'objectif), vie du chantier, équipes → objectifs, entreprise ; PC : rail + plan avec panneau
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const errs=[];
async function shots(w,h,tag){const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});const page=await ctx.newPage();page.on('pageerror',e=>errs.push(tag+': '+e.message));page.on('console',m=>{if(m.type()==='error')errs.push(tag+' console: '+m.text());});
  await page.goto(BASE+'/maquette_ventilation.html');await page.waitForTimeout(700);
  const shot=n=>page.screenshot({path:`shot_vent_${tag}_${n}.png`});const tap=async sel=>{await page.evaluate(s=>{const el=[...document.querySelectorAll(s)].find(b=>b.offsetParent!==null)||document.querySelector(s);if(el)el.click();},sel);await page.waitForTimeout(400);};
  await shot('home_paul');
  await page.selectOption('#as','karim');await page.waitForTimeout(400);await shot('home_karim');
  await page.selectOption('#as','ethan');await page.waitForTimeout(400);await shot('home_ethan');
  await tap('[data-go=sites]');await shot('sites');
  await tap('.site[data-site=stlo]');await shot('plan');
  await tap('[data-act=fab]');await shot('plan_sheet');
  await tap('[data-mode=obj]');await shot('plan_objform');
  await tap('[data-act=posego]');
  for(const i of [24,25,26,27]){await page.evaluate(i=>{const el=document.querySelector(`[data-w="${i}"][data-c="0"]`);if(el)el.dispatchEvent(new MouseEvent('click',{bubbles:true}));},i);await page.waitForTimeout(150);}
  await shot('plan_pose');
  await tap('[data-act=poseok]');await shot('plan_posed');
  await tap('[data-facet=vie]');await shot('vie');
  await tap('[data-facet=tech]');await shot('tech');
  await tap('[data-go=teams]');await shot('teams');
  await tap('[data-sub=objectifs]');await shot('objectifs');
  await tap('[data-go=company]');await shot('company');
  await tap('#info');await shot('info');
  await ctx.close();}
await shots(430,930,'tel');
await shots(1366,900,'pc');
console.log(errs.length?errs:'aucune erreur');
await browser.close();
