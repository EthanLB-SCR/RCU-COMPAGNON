// unit_reprise_0311.mjs — 03/11 (Nantes) : ⏱ Versions → « ↺ Avancement » (src/reprise.js). node test/unit_reprise_0311.mjs
import {repriseMap,mergeInto,rowHasData} from '../src/reprise.js';
const C={};const J=x=>JSON.stringify(x);
const site=ws=>({lines:[{id:'L2',bar:12,cond:{A:{welds:ws.map(([weldId,m,a,b])=>({weldId,m,between:[a,b]}))}}}]});
// avant : coude collé au té ; après : manchette de 0,5 m entre le té et le coude → tout l'aval décalé de 0,5 m, numéros neufs (ancien traceur)
const ver=site([['S-0301',0,'T1','C1'],['S-0302',2,'C1','P1'],['S-0303',9,'P1','C2'],['S-0304',11,'C2','P2'],['S-0305',23,'P2','P3'],['S-0306',34,'P3','P4']]);
const cur=site([['S-0301',0,'T1','M1'],['S-0527',0.5,'M1','C1'],['S-0528',2.5,'C1','P1'],['S-0529',9.5,'P1','C2'],['S-0530',11.5,'C2','P2'],['S-0531',23.5,'P2','P3'],['S-0306',34,'P3','P4']]);
const ev=(t,at,by)=>({type:t,at,by,photos:[]});
const rows=[{weld_id:'S-0301',status:'soudee',data:{events:[ev('soudee','2026-10-30T08:00:00Z','Karim')]}},
 {weld_id:'S-0302',status:'soudee',data:{events:[ev('soudee','2026-10-30T09:00:00Z','Karim')],photos:['https://x/p1.jpg','https://x/p2.jpg'],wire:'ok'}},
 {weld_id:'S-0303',status:'manchonnee',data:{events:[ev('manchonnee','2026-10-31T10:00:00Z','Gary')],photos:['https://x/p3.jpg'],steps:{0:{done:true},1:{done:true},2:{done:true},3:{done:true}},note:'gaine reprise'}},
 {weld_id:'S-0304',status:'soudee',data:{events:[ev('soudee','2026-10-31T11:00:00Z','Karim')]}},
 {weld_id:'S-0305',status:'a_souder',data:{}},
 {weld_id:'S-0528',status:'manchonnee',data:{events:[ev('manchonnee','2026-11-03T09:00:00Z','Gary')],photos:['https://x/n1.jpg']}},
 {weld_id:'S-0527',status:'soudee',data:{events:[ev('soudee','2026-11-03T08:30:00Z','Karim')]}}];
const pairs=repriseMap(cur,ver,rows);console.log('paires',J(pairs.map(p=>p.from+'→'+p.to+'('+p.d+')')));
C.r1=J(pairs.map(p=>p.from+'→'+p.to))===J(['S-0302→S-0528','S-0303→S-0529','S-0304→S-0530']);
// fusion : la déclaration d'aujourd'hui gardée, l'avancement ne recule pas, photos additionnées
const J528={weldId:'S-0528',line:'L2',cond:'A',status:'manchonnee',events:[{...ev('manchonnee','2026-11-03T09:00:00Z','Gary'),at:new Date('2026-11-03T09:00:00Z')}],photos:['https://x/n1.jpg']};
const J529={weldId:'S-0529',line:'L2',cond:'A',status:'a_souder',events:[],photos:[]};
const J530={weldId:'S-0530',line:'L2',cond:'A',status:'controlee',events:[],photos:[],note:'vu'};
const at=new Date('2026-11-03T15:00:00Z');
mergeInto(J528,pairs[0].row,'Ethan',at);mergeInto(J529,pairs[1].row,'Ethan',at);mergeInto(J530,pairs[2].row,'Ethan',at);
console.log('S-0528',J528.status,J528.photos.length,J528.events.map(e=>e.type).join(','),'| S-0529',J529.status,J529.photos.length,!!(J529.steps&&J529.steps[3]&&J529.steps[3].done),J529.note,'| S-0530',J530.status,J530.note);
C.r2=J528.status==='manchonnee'&&J528.photos.length===3&&J528.wire==='ok'&&J(J528.events.map(e=>e.type))===J(['soudee','manchonnee','reprise']);
C.r3=J529.status==='manchonnee'&&J529.photos.length===1&&J529.steps[3].done&&J529.note==='gaine reprise'&&J530.status==='controlee'&&J530.note==='vu';
// rejouée : rien en double
mergeInto(J528,pairs[0].row,'Ethan',new Date());C.r4=J528.photos.length===3&&J528.events.length===3;
// rien à reprendre : version = plan actuel ; ancien numéro encore sur le plan → jamais repris
C.r5=repriseMap(cur,cur,rows).length===0&&!rowHasData(rows[4])&&rowHasData(rows[1]);
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));process.exit(Object.values(C).every(Boolean)?0:1);
