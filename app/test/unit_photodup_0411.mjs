// unit_photodup_0411.mjs — 04/11 : empreintes de photos et photos en double (src/photodup.js). node test/unit_photodup_0411.mjs
import {dhashOf,photoEntries,photoDupes,dupesOf} from '../src/photodup.js';
const C={};const J=x=>JSON.stringify(x);
const img=seed=>Array.from({length:72},(_,i)=>Math.round(128+100*Math.sin(i*0.7+seed)));
const hA=dhashOf(img(1)),hA2=dhashOf(img(1).map(v=>Math.min(255,v+3))),hB=dhashOf(img(2.3));
C.d1=/^[0-9a-f]{16}$/.test(hA)&&hA===hA2&&hA!==hB&&dhashOf(Array(72).fill(40))===null; // même image un peu éclaircie = même empreinte ; autre image ≠ ; image uniforme = pas d'empreinte
const J1={weldId:'S-0010',steps:{1:{done:true,by:'Gary',at:'2026-11-04T08:00:00Z',photos:['u1'],ph:['aaaa']},3:{done:true,photos:['u3'],ph:['cccc']}},events:[{type:'manchonnee',at:'2026-11-04T09:00:00Z',photos:['u3'],ph:['cccc']}]};
const J2={weldId:'S-0011',steps:{1:{done:true,by:'Gary',at:'2026-11-04T10:00:00Z',photos:['u9'],ph:['aaaa']}}};
const J3={weldId:'S-0012',steps:{1:{photos:['x'],ph:['dddd']},2:{photos:['y'],ph:['dddd']}}};
const J4={weldId:'S-0013',events:[{type:'soudee',photos:['z1','z2'],ph:['eeee',null]}]};
const E=photoEntries([J1,J2,J3,J4]);const G=photoDupes(E);console.log('groupes',J(G.map(g=>g.h+':'+g.items.map(x=>x.weldId+'/'+x.where).join('+'))));
C.d2=G.length===2&&G.some(g=>g.h==='aaaa'&&g.items.length===2)&&G.some(g=>g.h==='dddd'&&g.items.map(x=>x.where).join()==='étape 1,étape 2')&&!G.some(g=>g.h==='cccc'); // 2 soudures ; 2 étapes d'une soudure ; recopie étape 3 → déclaration : pas un double
C.d3=J(dupesOf('aaaa',E,'S-0011','étape 1').map(x=>x.weldId))===J(['S-0010'])&&dupesOf('eeee',E,'S-0013','soudee').length===0&&dupesOf(null,E,'S-0013','soudee').length===0;
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));process.exit(Object.values(C).every(Boolean)?0:1);
