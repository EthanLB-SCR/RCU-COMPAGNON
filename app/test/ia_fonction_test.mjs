// ia_fonction_test.mjs — 11/11/2026 : la fonction serveur « assistant » (supabase/functions/assistant/index.ts) testée SANS Supabase ni clé :
// Deno, le client Supabase et l'API du modèle sont simulés ; on regarde ce que la fonction ENVOIE au modèle et ce qu'elle RENVOIE à l'appli.
//  f1 question avec le manuel : modèle Haiku par défaut, max_tokens 3000, prompt système en 2 blocs (consignes + <manuel> mis en cache 1 h ; poste + écran à part)
//  f2 secrets ANTHROPIC_MODEL / ANTHROPIC_EFFORT / ANTHROPIC_CACHE=5m : modèle choisi, output_config.effort, cache sans ttl
//  f3 ancienne appli (sans manuel) : un bloc, pas de cache
//  f4 « en faire un bug » (resume) : consigne JSON, pas de manuel, titre + texte relus
//  f5 réponse coupée (stop_reason max_tokens, rien que de la réflexion) : message clair ; f6 refus du modèle : relayé
//  f7 OPTIONS (CORS), sans jeton (401), compte inactif (403), clé absente (500) ; f8 manuel trop long : coupé à 160 000 caractères
// Lancer : node test/ia_fonction_test.mjs (Node 22.13 ou plus : module.stripTypeScriptTypes)
import fs from 'fs';import path from 'path';import os from 'os';import {fileURLToPath,pathToFileURL} from 'url';import * as M from 'node:module';
const HERE=path.dirname(fileURLToPath(import.meta.url));const C={};const J=x=>JSON.stringify(x);
const src=fs.readFileSync(path.join(HERE,'..','supabase','functions','assistant','index.ts'),'utf8');
const imp="import { createClient } from 'npm:@supabase/supabase-js@2';";if(!src.includes(imp))throw new Error('import du client Supabase introuvable');
const js=M.stripTypeScriptTypes(src.replace(imp,'const createClient=(...a)=>globalThis.__createClient(...a);'));
const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'iafn-')),'index.mjs');fs.writeFileSync(tmp,js);
let ENV={},HANDLER=null,ACTIF=true,LAST=null,NEXT=null;
globalThis.Deno={env:{get:k=>ENV[k]},serve:h=>{HANDLER=h;}};
globalThis.__createClient=()=>({auth:{getUser:async jwt=>jwt==='bon'?{data:{user:{id:'u1'}},error:null}:{data:null,error:{message:'jwt'}}},rpc:async()=>({data:ACTIF,error:null})});
globalThis.fetch=async(url,init)=>{LAST={url:String(url),headers:init.headers,body:JSON.parse(init.body)};const r=NEXT||{status:200,body:{content:[{type:'text',text:'1. Ouvre le chantier → ☰ Menu → « ⏳ Préfabrication (en attente) ».'}],stop_reason:'end_turn'}};NEXT=null;return new Response(JSON.stringify(r.body),{status:r.status,headers:{'content-type':'application/json'}});};
await import(pathToFileURL(tmp).href);if(typeof HANDLER!=='function')throw new Error('Deno.serve non appelé');
const BASEENV={SUPABASE_URL:'https://exemple.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',ANTHROPIC_API_KEY:'cle-de-test'};
const appel=async(body,o={})=>{const r=await HANDLER(new Request('https://exemple.supabase.co/functions/v1/assistant',{method:o.method||'POST',headers:Object.assign({'content-type':'application/json'},o.jwt===null?{}:{Authorization:'Bearer '+(o.jwt||'bon')}),body:o.method==='OPTIONS'?undefined:JSON.stringify(body)}));let j=null;try{j=await r.json();}catch(e){}return {status:r.status,j,cors:r.headers.get('access-control-allow-origin')};};
const MAN='# TRACÉ — CE QUE TU DOIS SAVOIR\n'+'## Préfabrication\n- ☰ Menu → « ⏳ Préfabrication (en attente) »\n'.repeat(50);
const Q={mode:'chat',messages:[{role:'user',content:"J'ai fait une soudure mais elle n'est pas sur le plan"}],contexte:'chantier « Démo » · onglet plan',manuel:MAN,profil:'Soudeur'};
// f1
ENV={...BASEENV};LAST=null;let r=await appel(Q);const b1=LAST&&LAST.body;
const f1={status:r.status,ok:r.j&&r.j.ok,texte:r.j&&r.j.texte,url:LAST&&LAST.url,model:b1&&b1.model,max:b1&&b1.max_tokens,oc:b1&&b1.output_config,sys:Array.isArray(b1&&b1.system)?b1.system.map(x=>({len:x.text.length,cache:x.cache_control||null,debut:x.text.slice(0,40),manuel:x.text.includes('<manuel>'),dyn:/Poste de la personne : Soudeur\.\nÉcran où elle se trouve : chantier « Démo » · onglet plan\./.test(x.text)})):null,msgs:b1&&b1.messages,ver:LAST&&LAST.headers['anthropic-version'],key:LAST&&LAST.headers['x-api-key']};
console.log('f1)',J(f1));
C.f1=f1.status===200&&f1.ok===true&&/Préfabrication/.test(f1.texte)&&f1.url==='https://api.anthropic.com/v1/messages'&&f1.model==='claude-haiku-5-5'&&f1.max===3000&&f1.oc===undefined&&f1.sys&&f1.sys.length===2
  &&f1.sys[0].manuel&&/^Tu es l'assistant de Tracé/.test(f1.sys[0].debut)&&J(f1.sys[0].cache)===J({type:'ephemeral',ttl:'1h'})&&f1.sys[1].dyn&&!f1.sys[1].cache&&f1.msgs.length===1&&f1.msgs[0].role==='user'&&f1.ver==='2026-10-21'&&f1.key==='cle-de-test';
// f2
ENV={...BASEENV,ANTHROPIC_MODEL:'claude-sonnet-5-5',ANTHROPIC_EFFORT:'low',ANTHROPIC_CACHE:'5m'};r=await appel(Q);const b2=LAST.body;
const f2={model:b2.model,oc:b2.output_config,cache:b2.system[0].cache_control};console.log('f2)',J(f2));
C.f2=f2.model==='claude-sonnet-5-5'&&J(f2.oc)===J({effort:'low'})&&J(f2.cache)===J({type:'ephemeral'});
ENV={...BASEENV,ANTHROPIC_EFFORT:'n importe quoi'};r=await appel(Q);C.f2=C.f2&&LAST.body.output_config===undefined;
// f3
ENV={...BASEENV};const {manuel,profil,...ancien}=Q;r=await appel(ancien);const b3=LAST.body;
const f3={n:b3.system.length,cache:b3.system[0].cache_control||null,manuel:b3.system[0].text.includes('<manuel>'),dyn:b3.system[1]&&b3.system[1].text,ok:r.j.ok};console.log('f3)',J(f3));
C.f3=f3.n===2&&f3.cache===null&&!f3.manuel&&/^Écran où elle se trouve/.test(f3.dyn||'')&&f3.ok===true;
// f4
NEXT={status:200,body:{content:[{type:'text',text:'Voici : {"titre":"Soudure absente du plan","texte":"La personne a fait une soudure que le plan ne montre pas."}'}],stop_reason:'end_turn'}};
r=await appel({mode:'resume',type:'bug',messages:Q.messages,manuel:MAN});const b4=LAST.body;
const f4={sys:typeof b4.system,json:/UNIQUEMENT par un objet JSON/.test(String(b4.system)),manuel:String(J(b4)).includes('<manuel>'),max:b4.max_tokens,j:r.j};console.log('f4)',J(f4));
C.f4=f4.sys==='string'&&f4.json&&!f4.manuel&&f4.max===2000&&f4.j.ok&&f4.j.titre==='Soudure absente du plan'&&/plan ne montre pas/.test(f4.j.texte);
// f5 / f6
NEXT={status:200,body:{content:[{type:'thinking',thinking:'…'}],stop_reason:'max_tokens'}};r=await appel(Q);const f5={status:r.status,err:r.j.error};
NEXT={status:400,body:{type:'error',error:{type:'invalid_request_error',message:'model: not found'}}};r=await appel(Q);const f6={status:r.status,err:r.j.error};
console.log('f5)',J(f5),'f6)',J(f6));C.f5=f5.status===502&&/réponse trop longue/.test(f5.err);C.f6=f6.status===502&&/^le modèle a refusé : /.test(f6.err)&&!/not\s*found|404/i.test(f6.err);
// f7
const o=await appel(null,{method:'OPTIONS'});const nj=await appel(Q,{jwt:null});ACTIF=false;const ina=await appel(Q);ACTIF=true;ENV={...BASEENV,ANTHROPIC_API_KEY:''};const nok=await appel(Q);ENV={...BASEENV};
const f7={opt:o.status,cors:o.cors,nojwt:nj.status,inactif:ina.status,sansCle:[nok.status,nok.j&&nok.j.error]};console.log('f7)',J(f7));
C.f7=f7.opt===200&&f7.cors==='*'&&f7.nojwt===401&&f7.inactif===403&&f7.sansCle[0]===500&&/ANTHROPIC_API_KEY absente/.test(f7.sansCle[1]);
// f8
r=await appel({...Q,manuel:'x'.repeat(200000)});const t8=LAST.body.system[0].text;const m8=(t8.split('<manuel>\n')[1]||'').split('\n</manuel>')[0];const f8={len:t8.length,manuel:m8.length,que:/^x+$/.test(m8)};console.log('f8)',J(f8));C.f8=f8.manuel===160000&&f8.que;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
