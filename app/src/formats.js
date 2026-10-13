// formats.js — LIRE LES PIÈCES WORD (ET LES MAILS OUTLOOK) DANS LA LECTURE, SANS LOGICIEL (13/10/2026, Ethan : « il ne lit pas les Word non plus ;
// voir si on peut régler ça ou si c'est impossible, l'écrire clairement »). Cause trouvée : le .docx était lu « à la regex » — les taquets de tabulation et la
// mise en page (<w:tab>, <w:tabs>, <w:pgSz>…) sortaient en code XML au milieu du texte ; les .doc (Word 97-2003), .rtf, .odt et .msg n'étaient pas lus du tout.
// · .docx / .docm / .dotx : titres (styles et niveaux de plan), NUMÉROTATION des titres et des listes (« 4.5 », « a) », puces), gras / italique / souligné,
//   tableaux, images (png / jpg / gif / bmp ; les EMF / WMF de Windows sont signalés), zones de texte.
// · .doc (binaire Word 97-2003) : texte du corps (table des pièces du fichier), tableaux en lignes « | », champs (sommaire) résolus — ni images ni mise en forme.
// · .rtf : texte, paragraphes, tableaux en lignes ; .odt (LibreOffice / OpenOffice) : titres, listes, tableaux, images.
// · .msg (mail Outlook) : objet, expéditeur, destinataires, corps du texte.
// Le TYPE RÉEL est reconnu au contenu (un « .doc » qui est en fait un RTF ou un .docx renommé s'ouvre quand même).
// Pur (aucun DOM) : testé dans Node (test/formats_test.mjs) sur des fichiers convertis par LibreOffice.
import {zipEntries,inflate,inflateBytes,xmlUnesc} from './xlsx.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RX={};const attr=(a,k)=>{if(!a)return null;const re=RX[k]||(RX[k]=new RegExp('(?:^|\\s)'+k.replace(/[.:]/g,'\\$&')+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')'));const m=a.match(re);return m?xmlUnesc(m[1]!==undefined?m[1]:m[2]):null;};
const TOK=/<(\/?)([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>|([^<]+)/g;
/* parcours d'un XML : on.open(nom, attributs, autoFermant), on.close(nom), on.text(texte déjà déséchappé) */
function walk(x,on){const re=new RegExp(TOK.source,'g');let m;while((m=re.exec(x))){if(m[2]!==undefined){if(m[1])on.close(m[2]);else on.open(m[2],m[3]||'',!!m[4]);}else if(m[6]!==undefined)on.text(xmlUnesc(m[6]));else if(m[5]!==undefined)on.text(m[5]);}}
/* pile d'éléments : un élément auto-fermant (<w:tab/>) n'est jamais empilé ; fermer un élément dépile jusqu'à lui (XML tolérant) */
function xmlStack(SKIP){const st=[];let skip=0;return {st,get skip(){return skip;},open(n,self){if(skip){if(!self){st.push(n);skip++;}return false;}if(SKIP[n]){if(!self){st.push(n);skip=1;}return false;}if(!self)st.push(n);return true;},
  close(n){const k=st.lastIndexOf(n);if(k<0)return false;const depth=st.length-k;st.length=k;if(skip){skip=Math.max(0,skip-depth);return false;}return true;},par(self,k){return st[st.length-(self?1:2)-(k||0)];},top(){return st[st.length-1];}};}
const normPath=p=>{const out=[];String(p).split('/').forEach(seg=>{if(seg==='..')out.pop();else if(seg&&seg!=='.')out.push(seg);});return out.join('/');};
/* ═════════ 1 · RECONNAÎTRE LE FICHIER AU CONTENU ═════════ */
export function sniff(u8){if(!u8||u8.length<8)return 'vide';if(u8[0]===0x50&&u8[1]===0x4B)return 'zip';if(u8[0]===0xD0&&u8[1]===0xCF&&u8[2]===0x11&&u8[3]===0xE0)return 'cfb';if(u8[0]===0x25&&u8[1]===0x50&&u8[2]===0x44&&u8[3]===0x46)return 'pdf';
  const head=String.fromCharCode(...u8.subarray(0,6));if(head.startsWith('{\\rtf'))return 'rtf';return 'autre';}
/* point d'entrée : {kind, html, paras[], title?, meta?, media(path)→Promise<Blob|null>} ou une erreur au message clair */
export async function readOffice(buf,name){const u8=new Uint8Array(buf);const t=sniff(u8);const ext=String(name||'').toLowerCase().split('.').pop();
  if(t==='zip'){const Z=await zipEntries(buf);if(Z['word/document.xml'])return docxFromZip(Z);if(Z['content.xml'])return odtFromZip(Z);if(Z['xl/workbook.xml'])throw new Error('c\'est un classeur Excel (renommé ?)');if(Z['ppt/presentation.xml'])throw new Error('présentation PowerPoint : elle ne s\'affiche pas ici');throw new Error('archive zip qui n\'est pas un document Word');}
  if(t==='rtf'){return rtfDoc(latin1(u8));}
  if(t==='cfb'){const C=cfbRead(u8);if(C.has('WordDocument'))return docFromCfb(C);if(C.names.some(n=>/^__substg1\.0_/i.test(n)))return msgFromCfb(C);if(C.has('Workbook')||C.has('Book'))throw new Error('classeur Excel 97-2003 (.xls) : ouvre-le dans Excel et enregistre-le en .xlsx pour le lire ici');if(C.has('PowerPoint Document'))throw new Error('présentation PowerPoint 97-2003 : elle ne s\'affiche pas ici');if(C.has('EncryptedPackage'))throw new Error('document Office protégé par un mot de passe');throw new Error('fichier Office ancien non reconnu');}
  if(t==='pdf')throw new Error('c\'est un PDF (mal nommé)');
  if(ext==='txt'||ext==='csv'||ext==='md')throw new Error('fichier texte');
  throw new Error('format non reconnu');}
const latin1=u8=>{let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return s;};
/* ═════════ 2 · WORD .DOCX ═════════ */
function parseRels(x){const R={};(x.match(/<Relationship\b[^>]*>/g)||[]).forEach(t=>{const id=attr(t,'Id'),tg=attr(t,'Target');if(id&&tg&&attr(t,'TargetMode')!=='External')R[id]=tg;});return R;}
function parseStyles(x){const S={};const re=/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;let m;while((m=re.exec(x||''))){const id=attr(m[1],'w:styleId');if(!id)continue;const b=m[2];const g=(tag)=>{const t=b.match(new RegExp('<'+tag+'\\b([^>]*)\\/?>'));return t?attr(t[1],'w:val'):null;};
    S[id]={type:attr(m[1],'w:type'),name:(g('w:name')||'').toLowerCase(),basedOn:g('w:basedOn'),outline:g('w:outlineLvl'),numId:g('w:numId'),ilvl:g('w:ilvl')};}
  const res=(id,k,d)=>{let s=S[id],n=0;while(s&&n++<12){if(s[k]!==null&&s[k]!==undefined)return s[k];s=S[s.basedOn];}return d;};
  const out={};Object.keys(S).forEach(id=>{const s=S[id];const nm=s.name;let lvl=0;const h=nm.match(/^(?:heading|titre)\s*(\d)$/);if(h)lvl=+h[1];else if(nm==='title'||nm==='titre')lvl=1;else if(/^(subtitle|sous-titre)$/.test(nm))lvl=2;else{const o=res(id,'outline',null);if(o!==null&&+o<9)lvl=+o+1;}
    out[id]={lvl,numId:res(id,'numId',null),ilvl:+(res(id,'ilvl',0)||0),list:/list|liste|puce|bullet/.test(nm)};});return out;}
function parseNumbering(x){const abs={},nums={};let m;const ra=/<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g;while((m=ra.exec(x||''))){const id=attr(m[1],'w:abstractNumId');const L={};const rl=/<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g;let l;while((l=rl.exec(m[2]))){const g=(tag)=>{const t=l[2].match(new RegExp('<'+tag+'\\b([^>]*)\\/?>'));return t?attr(t[1],'w:val'):null;};L[+attr(l[1],'w:ilvl')]={start:+(g('w:start')||1),fmt:g('w:numFmt')||'decimal',text:g('w:lvlText'),lgl:/<w:isLgl\b/.test(l[2])};}abs[id]=L;}
  const rn=/<w:num\b([^>]*)>([\s\S]*?)<\/w:num>/g;while((m=rn.exec(x||''))){const id=attr(m[1],'w:numId');const a=(m[2].match(/<w:abstractNumId\b([^>]*)\/?>/)||[])[1];const over={};const ro=/<w:lvlOverride\b([^>]*)>([\s\S]*?)<\/w:lvlOverride>/g;let o;while((o=ro.exec(m[2]))){const so=o[2].match(/<w:startOverride\b([^>]*)\/?>/);if(so)over[+attr(o[1],'w:ilvl')]=+attr(so[1],'w:val');}nums[id]={abs:a?attr(a,'w:val'):null,over};}
  return {abs,nums};}
const ROM=n=>{if(n<=0||n>3999)return String(n);const T=[[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];let s='';for(const [v,r] of T)while(n>=v){s+=r;n-=v;}return s;};
const LET=n=>{let s='';n=Math.max(1,n);while(n>0){const r=(n-1)%26;s=String.fromCharCode(97+r)+s;n=Math.floor((n-1)/26);}return s;};
function fmtNum(n,fmt){switch(fmt){case 'lowerLetter':return LET(n);case 'upperLetter':return LET(n).toUpperCase();case 'lowerRoman':return ROM(n);case 'upperRoman':return ROM(n).toUpperCase();case 'decimalZero':return String(n).padStart(2,'0');case 'none':return '';default:return String(n);}}
/* compteur de numérotation (titres « 4.5 », listes « a) ») : une instance par liste (numId redémarré = nouvelle instance) */
function numberer(N){const cnt={};return (numId,ilvl)=>{const n=N.nums[numId];if(!n||!n.abs||!N.abs[n.abs])return null;const L=N.abs[n.abs];const key=Object.keys(n.over).length?'n'+numId:'a'+n.abs;const c=cnt[key]||(cnt[key]=Array(9).fill(null));
    const st=l=>(n.over[l]!==undefined?n.over[l]:((L[l]||{}).start||1));for(let l=0;l<ilvl;l++)if(c[l]===null)c[l]=st(l);c[ilvl]=c[ilvl]===null?st(ilvl):c[ilvl]+1;for(let l=ilvl+1;l<9;l++)c[l]=null;
    const lv=L[ilvl]||{fmt:'decimal',text:'%'+(ilvl+1)+'.'};if(lv.fmt==='bullet')return {bullet:true,text:'•'};if(lv.text===null||lv.text===undefined)return null;
    const txt=lv.text.replace(/%(\d)/g,(m,k)=>{const l=+k-1;const v=c[l]===null?st(l):c[l];return fmtNum(v,lv.lgl?'decimal':((L[l]||{}).fmt||'decimal'));});return {bullet:false,text:txt};};}
const PUA=s=>s.replace(/[\uF000-\uF0FF]/g,'•');
export async function docxFromZip(Z){const get=async n=>Z[n]?await inflate(Z[n]):'';const x=await get('word/document.xml');if(!x)throw new Error('document Word illisible');
  const S=parseStyles(await get('word/styles.xml')),N=parseNumbering(await get('word/numbering.xml')),R=parseRels(await get('word/_rels/document.xml.rels'));const num=numberer(N);
  const paras=[];const imgs=[];const body=[];const cont=[body];const pst=[];let P=null,Rn=null,D=null;const tbl=[];
  const X=xmlStack({'w:instrText':1,'w:delText':1,'mc:Fallback':1,'w:moveFrom':1,'w:footnoteReference':1,'w:endnoteReference':1,'w:commentReference':1,'w:sectPr':1,'w:tblPr':1,'w:tblGrid':1,'w:trPr':1,'wp:docPr':1,'w:sdtPr':1,'w:rPrChange':1,'w:pPrChange':1});
  const txt=(s)=>{if(!P||!s)return;const t=esc(PUA(s));let h=t;if(Rn){if(Rn.sup)h='<sup>'+h+'</sup>';if(Rn.u)h='<u>'+h+'</u>';if(Rn.i)h='<i>'+h+'</i>';if(Rn.b)h='<b>'+h+'</b>';}P.html+=h;P.text+=PUA(s);};
  const img=(rid,cx)=>{const tg=R[rid];if(!tg||!P)return;const p2=tg.startsWith('/')?normPath(tg.slice(1)):normPath('word/'+tg);const ext=(p2.split('.').pop()||'').toLowerCase();const w=cx?Math.max(16,Math.min(680,Math.round(cx/9525))):0;
    if(['png','jpg','jpeg','gif','bmp','webp','svg'].includes(ext)){imgs.push(p2);P.html+=`<img class="cm-dimg" data-src="${esc(p2)}" alt=""${w?` style="width:${w}px"`:''}>`;}else P.html+=`<span class="cm-dimgx">[image ${esc(ext.toUpperCase())} non affichable ici]</span>`;P.hasImg=true;};
  const closeP=()=>{const p=pst.pop();P=pst[pst.length-1]||null;const sty=S[p.style]||{lvl:0,numId:null,ilvl:0};let lvl=p.outline!==null&&p.outline<9?p.outline+1:sty.lvl;
    const nid=p.numId!==null?p.numId:sty.numId;const il=p.numId!==null?(p.ilvl||0):sty.ilvl;let pre='',isList=false;if(nid&&nid!=='0'&&(p.text.trim()||p.hasImg)){const r=num(nid,il);if(r){pre=r.text;isList=!lvl;}} /* un paragraphe vide ne consomme pas de numéro */
    const text=((pre?pre+' ':'')+p.text).replace(/\s+/g,' ').trim();let html='';
    if(text||p.hasImg){const i=paras.length;paras.push(text);const cls='cm-para'+(lvl?' cm-h'+Math.min(3,lvl):'')+(isList?' cm-li':'')+(p.jc==='center'?' cm-c':(p.jc==='right'?' cm-r':''));html=`<p class="${cls}" data-i="${i}"${isList&&il?` style="margin-left:${il*18}px"`:''}>${pre?`<span class="cm-num">${esc(pre)}</span> `:''}${p.html}</p>`;}
    html+=p.after.join('');cont[cont.length-1].push(html);};
  walk(x,{open(n,a,self){if(!X.open(n,self))return;const par=X.par(self),par2=X.par(self,1);
      switch(n){
        case 'w:p':if(self)return;P={style:'',numId:null,ilvl:0,outline:null,jc:'',html:'',text:'',after:[],hasImg:false};pst.push(P);break;
        case 'w:pStyle':if(P&&par==='w:pPr')P.style=attr(a,'w:val')||'';break;
        case 'w:numId':if(P&&par==='w:numPr'&&par2==='w:pPr')P.numId=attr(a,'w:val');break;
        case 'w:ilvl':if(P&&par==='w:numPr'&&par2==='w:pPr')P.ilvl=+(attr(a,'w:val')||0);break;
        case 'w:outlineLvl':if(P&&par==='w:pPr')P.outline=+(attr(a,'w:val')||9);break;
        case 'w:jc':if(P&&par==='w:pPr')P.jc=attr(a,'w:val')||'';break;
        case 'w:r':if(!self)Rn={b:0,i:0,u:0,sup:0};break;
        case 'w:b':case 'w:i':case 'w:u':case 'w:vertAlign':if(Rn&&par==='w:rPr'&&par2==='w:r'){const v=attr(a,'w:val');if(n==='w:u')Rn.u=v&&v!=='none'?1:0;else if(n==='w:vertAlign')Rn.sup=v==='superscript'?1:0;else Rn[n==='w:b'?'b':'i']=v==='0'||v==='false'?0:1;}break;
        case 'w:tab':if(par==='w:r'&&P){P.html+='<span class="cm-tab">\t</span>';P.text+=' ';}break;
        case 'w:br':case 'w:cr':if(par==='w:r'&&P){P.html+='<br>';P.text+=' ';}break;
        case 'w:noBreakHyphen':if(P)txt('-');break;
        case 'w:sym':if(P){const f=(attr(a,'w:font')||'').toLowerCase();const c=parseInt(attr(a,'w:char')||'0',16);txt(/symbol|wingdings|webdings/.test(f)||(c>=0xF000&&c<=0xF0FF)?'•':String.fromCharCode(c||32));}break;
        case 'w:drawing':if(!self)D={cx:0};break;
        case 'wp:extent':if(D)D.cx=+(attr(a,'cx')||0);break;
        case 'a:blip':{const rid=attr(a,'r:embed');if(rid)img(rid,D?D.cx:0);break;}
        case 'v:imagedata':{const rid=attr(a,'r:id');if(rid)img(rid,0);break;}
        case 'w:txbxContent':if(!self)cont.push([]);break;
        case 'w:tbl':if(!self)tbl.push({rows:[],row:null,cell:null});break;
        case 'w:tr':if(!self&&tbl.length)tbl[tbl.length-1].row=[];break;
        case 'w:tc':if(!self&&tbl.length){cont.push([]);tbl[tbl.length-1].cell={span:1,cont:false};}break;
        case 'w:gridSpan':if(tbl.length&&tbl[tbl.length-1].cell)tbl[tbl.length-1].cell.span=+(attr(a,'w:val')||1);break;
        case 'w:vMerge':if(tbl.length&&tbl[tbl.length-1].cell&&attr(a,'w:val')!=='restart')tbl[tbl.length-1].cell.cont=true;break;
      }},
    close(n){if(!X.close(n))return;
      switch(n){case 'w:p':if(P)closeP();break;case 'w:r':Rn=null;break;case 'w:drawing':D=null;break;
        case 'w:txbxContent':{const h=cont.length>1?cont.pop().join(''):'';if(P)P.after.push(h);else cont[cont.length-1].push(h);break;}
        case 'w:tc':if(tbl.length&&cont.length>1){const T=tbl[tbl.length-1];const html=cont.pop().join('');if(T.row)T.row.push({html,span:(T.cell||{}).span||1,cont:!!(T.cell||{}).cont});T.cell=null;}break;
        case 'w:tr':if(tbl.length){const T=tbl[tbl.length-1];if(T.row)T.rows.push(T.row);T.row=null;}break;
        case 'w:tbl':{const T=tbl.pop();if(!T)break;cont[cont.length-1].push(`<table class="cm-dtab">${T.rows.map(r=>`<tr>${r.map(c=>`<td${c.span>1?` colspan="${c.span}"`:''}>${c.cont?'':c.html}</td>`).join('')}</tr>`).join('')}</table>`);break;}}},
    text(s){if(X.skip)return;if(X.top()==='w:t'&&P)txt(s);}});
  while(pst.length){P=pst[pst.length-1];closeP();}
  const media=async p=>{const e=Z[p];if(!e)return null;const ext=(p.split('.').pop()||'').toLowerCase();const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp',svg:'image/svg+xml'}[ext]||'application/octet-stream';return new Blob([await inflateBytes(e)],{type:mime});};
  return {kind:'docx',html:body.join(''),paras,imgs,media};}
/* ═════════ 3 · LIBREOFFICE .ODT ═════════ */
export async function odtFromZip(Z){const x=Z['content.xml']?await inflate(Z['content.xml']):'';if(!x)throw new Error('document ODT illisible');
  const paras=[];const imgs=[];const body=[];const cont=[body];const pst=[];let P=null;const tbl=[];let listDepth=0;
  const X=xmlStack({'svg:desc':1,'svg:title':1,'office:annotation':1,'text:note':1,'text:tracked-changes':1,'office:font-face-decls':1,'office:automatic-styles':1,'text:sequence-decls':1,'office:forms':1});
  const closeP=()=>{const p=pst.pop();P=pst[pst.length-1]||null;const text=((p.li?'• ':'')+p.text).replace(/\s+/g,' ').trim();let html='';if(text||p.hasImg){const i=paras.length;paras.push(text);html=`<p class="cm-para${p.lvl?' cm-h'+Math.min(3,p.lvl):''}${p.li?' cm-li':''}" data-i="${i}"${p.li&&p.depth>1?` style="margin-left:${(p.depth-1)*18}px"`:''}>${p.li?'<span class="cm-num">•</span> ':''}${p.html}</p>`;}html+=p.after.join('');cont[cont.length-1].push(html);};
  walk(x,{open(n,a,self){if(!X.open(n,self))return;
      switch(n){case 'text:p':case 'text:h':if(self)return;P={lvl:n==='text:h'?+(attr(a,'text:outline-level')||1):0,li:n==='text:p'&&X.st.includes('text:list-item')&&!pst.length,depth:listDepth,html:'',text:'',after:[],hasImg:false};pst.push(P);break;
        case 'text:list':if(!self)listDepth++;break;
        case 'text:s':if(P){const c=Math.min(50,+(attr(a,'text:c')||1));P.html+=' '.repeat(c);P.text+=' '.repeat(c);}break;
        case 'text:tab':if(P){P.html+='<span class="cm-tab">\t</span>';P.text+=' ';}break;
        case 'text:line-break':if(P){P.html+='<br>';P.text+=' ';}break;
        case 'draw:text-box':if(!self)cont.push([]);break;
        case 'draw:image':{const h=attr(a,'xlink:href');if(h&&P&&!/^https?:/i.test(h)){const p2=normPath(h);const ext=(p2.split('.').pop()||'').toLowerCase();if(['png','jpg','jpeg','gif','bmp','webp','svg'].includes(ext)){imgs.push(p2);P.html+=`<img class="cm-dimg" data-src="${esc(p2)}" alt="">`;}else P.html+=`<span class="cm-dimgx">[image ${esc(ext.toUpperCase())} non affichable ici]</span>`;P.hasImg=true;}break;}
        case 'table:table':if(!self)tbl.push({rows:[],row:null});break;case 'table:table-row':if(!self&&tbl.length)tbl[tbl.length-1].row=[];break;
        case 'table:table-cell':case 'table:covered-table-cell':if(tbl.length){if(self){if(n==='table:table-cell'&&tbl[tbl.length-1].row)tbl[tbl.length-1].row.push({html:'',span:1});}else{cont.push([]);tbl[tbl.length-1].span=+(attr(a,'table:number-columns-spanned')||1);}}break;}},
    close(n){if(!X.close(n))return;
      switch(n){case 'text:p':case 'text:h':if(P)closeP();break;case 'text:list':listDepth=Math.max(0,listDepth-1);break;
        case 'draw:text-box':{const h=cont.length>1?cont.pop().join(''):'';if(P)P.after.push(h);else cont[cont.length-1].push(h);break;}
        case 'table:table-cell':case 'table:covered-table-cell':if(tbl.length&&cont.length>1){const T=tbl[tbl.length-1];const h=cont.pop().join('');if(T.row&&n==='table:table-cell')T.row.push({html:h,span:T.span||1});}break;
        case 'table:table-row':if(tbl.length){const T=tbl[tbl.length-1];if(T.row)T.rows.push(T.row);T.row=null;}break;
        case 'table:table':{const T=tbl.pop();if(!T)break;cont[cont.length-1].push(`<table class="cm-dtab">${T.rows.map(r=>`<tr>${r.map(c=>`<td${c.span>1?` colspan="${c.span}"`:''}>${c.html}</td>`).join('')}</tr>`).join('')}</table>`);break;}}},
    text(s){if(X.skip||!P)return;P.html+=esc(s);P.text+=s;}});
  while(pst.length){P=pst[pst.length-1];closeP();}
  const media=async p=>{const e=Z[p];if(!e)return null;const ext=(p.split('.').pop()||'').toLowerCase();return new Blob([await inflateBytes(e)],{type:{png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp',svg:'image/svg+xml'}[ext]||'application/octet-stream'});};
  return {kind:'odt',html:body.join(''),paras,imgs,media};}
/* ═════════ 4 · FICHIERS OFFICE 97-2003 : conteneur « Compound File » (CFB) ═════════ */
export function cfbRead(u8){const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);if(u8.length<512||dv.getUint32(0,true)!==0xE011CFD0)throw new Error('fichier Office 97-2003 abîmé');
  const ss=1<<dv.getUint16(30,true),mss=1<<dv.getUint16(32,true);const nFat=dv.getUint32(44,true),dirStart=dv.getUint32(48,true),miniCut=dv.getUint32(56,true)||4096,miniFatStart=dv.getUint32(60,true),nMiniFat=dv.getUint32(64,true),difStart=dv.getUint32(68,true),nDif=dv.getUint32(72,true);
  const END=0xFFFFFFFA;const off=s=>(s+1)*ss;const u32=o=>o+4<=u8.length?dv.getUint32(o,true):END;
  const fatSecs=[];for(let i=0;i<109&&fatSecs.length<nFat;i++){const s=u32(76+i*4);if(s<END)fatSecs.push(s);}
  let d=difStart,g=0;while(fatSecs.length<nFat&&d<END&&g++<=nDif){const o=off(d);for(let i=0;i<ss/4-1&&fatSecs.length<nFat;i++){const s=u32(o+i*4);if(s<END)fatSecs.push(s);}d=u32(o+ss-4);}
  const per=ss/4;const fat=new Uint32Array(fatSecs.length*per);fatSecs.forEach((s,k)=>{const o=off(s);for(let i=0;i<per;i++)fat[k*per+i]=u32(o+i*4);});
  const chain=st=>{const out=[];let s=st,k=0;while(s<END&&s<fat.length&&k++<=fat.length){out.push(s);s=fat[s];}return out;};
  const readChain=(st,size)=>{const secs=chain(st);const b=new Uint8Array(secs.length*ss);secs.forEach((s,i)=>{const o=off(s);if(o<u8.length)b.set(u8.subarray(o,Math.min(o+ss,u8.length)),i*ss);});return size!==undefined?b.subarray(0,Math.min(size,b.length)):b;};
  const dir=readChain(dirStart);const ddv=new DataView(dir.buffer,dir.byteOffset,dir.byteLength);const ents=[];
  for(let o=0;o+128<=dir.length;o+=128){const nl=ddv.getUint16(o+64,true);const type=dir[o+66];if(!type||nl<2){ents.push(null);continue;}let name='';for(let i=0;i<nl-2;i+=2)name+=String.fromCharCode(ddv.getUint16(o+i,true));ents.push({name,type,start:ddv.getUint32(o+116,true),size:ddv.getUint32(o+120,true)});}
  const root=ents[0];const mini=root?readChain(root.start,root.size):new Uint8Array(0);
  const mfat=[];if(nMiniFat&&miniFatStart<END){const mf=readChain(miniFatStart);const mdv=new DataView(mf.buffer,mf.byteOffset,mf.byteLength);for(let i=0;i+4<=mf.length;i+=4)mfat.push(mdv.getUint32(i,true));}
  const readMini=(st,size)=>{const b=new Uint8Array(size);let s=st,p=0,k=0;while(s<END&&p<size&&k++<=mfat.length){const o=s*mss;b.set(mini.subarray(o,o+Math.min(mss,size-p)),p);p+=mss;s=mfat[s];}return b;};
  const live=ents.filter(e=>e&&e.type===2);
  return {names:live.map(e=>e.name),has:n=>live.some(e=>e.name===n),stream(n){const e=live.find(x=>x.name===n);if(!e)return null;return e.size<miniCut?readMini(e.start,e.size):readChain(e.start,e.size);}};}
/* ── Word 97-2003 : texte du corps par la table des pièces (Clx) ── */
const HEAD_RE=/^\s*(?:(?:\d+(?:\.\d+)*)[\s.)–-]+\S|(?:article|chapitre|titre|annexe|partie)\b)/i;
function headLevel(t){if(t.length>140||/\s\|\s|^\|/.test(t)||!/[A-Za-zÀ-ÿ]{3}/.test(t))return 0;const m=t.match(/^\s*(\d+(?:\.\d+)*)[\s.)–-]+\S/);if(m)return Math.min(3,m[1].split('.').length);if(/^\s*(chapitre|titre|partie)\b/i.test(t))return 1;if(/^\s*(article|annexe)\b/i.test(t))return 2;const L=t.replace(/[^A-Za-zÀ-ÿ]/g,'');if(L.length>=6&&t.length<90&&L===L.toUpperCase())return 2;return 0;}
function textDoc(paraTexts,kind,extra){const paras=[];const html=paraTexts.map(t=>String(t).replace(/\s+$/,'')).filter(t=>t.trim()).map(t=>{const i=paras.length;const clean=t.replace(/\s+/g,' ').trim();paras.push(clean);const h=headLevel(clean);return `<p class="cm-para${h?' cm-h'+h:''}" data-i="${i}">${esc(t.trim()).replace(/\t/g,'<span class="cm-tab">\t</span>')}</p>`;}).join('');return Object.assign({kind,html,paras,imgs:[],media:async()=>null},extra||{});}
export function docFromCfb(C){const wd=C.stream('WordDocument');const dv=new DataView(wd.buffer,wd.byteOffset,wd.byteLength);if(dv.getUint16(0,true)!==0xA5EC)throw new Error('document Word 6 / 95 (trop ancien) : enregistre-le en .docx pour le lire ici');
  const flags=dv.getUint16(0x0A,true);if(flags&0x0100)throw new Error('document Word protégé par un mot de passe');
  const tbl=C.stream(flags&0x0200?'1Table':'0Table');if(!tbl)throw new Error('document Word incomplet (table absente)');
  const csw=dv.getUint16(0x20,true);const lw=0x22+csw*2;const cslw=dv.getUint16(lw,true);const rgLw=lw+2;const ccpText=dv.getInt32(rgLw+12,true);const fc0=rgLw+cslw*4;const blob=fc0+2;const fcClx=dv.getUint32(blob+33*8,true),lcbClx=dv.getUint32(blob+33*8+4,true);
  if(!lcbClx||fcClx+lcbClx>tbl.length)throw new Error('document Word sans table des pièces (format inattendu)');
  const t=new DataView(tbl.buffer,tbl.byteOffset,tbl.byteLength);let p=fcClx;const end=fcClx+lcbClx;while(p<end&&tbl[p]===1){p+=3+t.getInt16(p+1,true);}if(tbl[p]!==2)throw new Error('document Word : table des pièces illisible');
  const lcb=t.getUint32(p+1,true);const plc=p+5;const n=Math.floor((lcb-4)/12);const cps=[];for(let i=0;i<=n;i++)cps.push(t.getUint32(plc+i*4,true));
  const d1252=new TextDecoder('windows-1252'),d16=new TextDecoder('utf-16le');let s='';
  for(let i=0;i<n;i++){const pcd=plc+(n+1)*4+i*8;const raw=t.getUint32(pcd+2,true);const comp=(raw&0x40000000)!==0;let fc=raw&0x3FFFFFFF;const cnt=cps[i+1]-cps[i];if(cnt<=0)continue;if(comp){fc=fc/2;s+=d1252.decode(wd.subarray(fc,fc+cnt));}else s+=d16.decode(wd.subarray(fc,fc+cnt*2));}
  /* histoires du document : corps (ccpText), notes, en-têtes, …, puis les ZONES DE TEXTE (encadrés) — ajoutées à la fin, sinon leur texte serait perdu */
  const L=k=>Math.max(0,dv.getInt32(rgLw+k*4,true)||0);const main=ccpText>0?s.slice(0,ccpText):s;const tx0=L(3)+L(4)+L(5)+L(6)+L(7)+L(8),txN=cslw>9?L(9):0;const txbx=txN?s.slice(tx0,tx0+txN):'';
  const clean=z=>{let out='';const F=[];for(const ch of z){const c=ch.charCodeAt(0);if(c===0x13){F.push(0);continue;}if(c===0x14){if(F.length)F[F.length-1]=1;continue;}if(c===0x15){F.pop();continue;}if(F.length&&F[F.length-1]===0)continue;out+=ch;} /* champs : \x13 code \x14 résultat \x15 → le résultat (sommaire, renvois) */
    return out.replace(/\x07\x07/g,'\r').replace(/\x07/g,'\t|\t').replace(/[\x0B]/g,' ').replace(/\x0C/g,'\r').replace(/\x1E/g,'-').replace(/[\x00-\x06\x08\x0E-\x1D\x1F]/g,'').split('\r').map(l=>l.replace(/\t\|\t$/,'').replace(/\t\|\t/g,' | '));};
  const lines=clean(main);const tb=txbx?clean(txbx).filter(l=>l.trim()):[];if(tb.length){lines.push('— Zones de texte du document (encadrés) —');tb.forEach(l=>lines.push(l));}
  return textDoc(lines,'doc');}
/* ── mail Outlook (.msg) : objet, expéditeur, destinataires, corps ── */
function msgFromCfb(C){const str=k=>{const u=C.stream('__substg1.0_'+k+'001F');if(u)return new TextDecoder('utf-16le').decode(u).replace(/\0+$/,'');const a=C.stream('__substg1.0_'+k+'001E');return a?new TextDecoder('windows-1252').decode(a).replace(/\0+$/,''):'';};
  const subject=str('0037'),from=str('0C1A')||str('5D01'),fromMail=str('0C1F')||str('5D02'),to=str('0E04'),cc=str('0E03');let body=str('1000');
  if(!body){const h=C.stream('__substg1.0_10130102');if(h)body=new TextDecoder('utf-8').decode(h).replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>|<\/p>|<\/div>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
  const lines=String(body||'').replace(/\r\n?/g,'\n').split('\n');const doc=textDoc(lines,'msg',{title:subject||'(sans objet)',meta:[from?('De : '+from+(fromMail&&fromMail!==from?' <'+fromMail+'>':'')):'',to?'À : '+to:'',cc?'Cc : '+cc:''].filter(Boolean).join(' · ')});
  doc.paras.unshift(subject);doc.html=`<div class="cm-txthead"><b>${esc(subject||'(sans objet)')}</b><small>${esc(doc.meta)}</small></div>`+doc.html.replace(/data-i="(\d+)"/g,(m,i)=>`data-i="${+i+1}"`);return doc;}
/* ═════════ 5 · RTF ═════════ */
const RTF_SKIP=new Set(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','headerl','headerr','headerf','footerl','footerr','footerf','listtable','listoverridetable','revtbl','rsidtbl','xmlnstbl','themedata','colorschememapping','latentstyles','datastore','generator','fldinst','bkmkstart','bkmkend','pgdsctbl','filetbl','nonshppict','blipuid','template','mmathPr','pntxta','pntxtb','footnote','annotation','atnid','atnauthor','shpinst','sp','sn','sv','do','userprops','docvar','ftnsep','ftnsepc','aftnsep','aftnsepc','objdata','objclass']);
export function rtfText(s){let out='',i=0,skip=0,uc=1;const stk=[];const d1252=new TextDecoder('windows-1252');let hex=[];
  const flushHex=()=>{if(hex.length){out+=d1252.decode(new Uint8Array(hex));hex=[];}};
  while(i<s.length){const c=s[i];
    if(c==='{'){flushHex();stk.push([skip,uc]);i++;continue;}
    if(c==='}'){flushHex();const p=stk.pop()||[0,1];skip=p[0];uc=p[1];i++;continue;}
    if(c==='\\'){const n=s[i+1];
      if(n==="'"){const h=parseInt(s.substr(i+2,2),16);if(!skip&&!isNaN(h))hex.push(h);i+=4;continue;}
      flushHex();
      if(n==='\\'||n==='{'||n==='}'){if(!skip)out+=n;i+=2;continue;}
      if(n==='*'){skip=1;i+=2;continue;}
      if(n==='~'){if(!skip)out+='\u00a0';i+=2;continue;}
      if(n==='-'||n==='_'||n===':'||n==='|'){if(!skip&&n==='_')out+='-';i+=2;continue;}
      if(n==='\n'||n==='\r'){if(!skip)out+='\n';i+=2;continue;}
      const m=/^\\([a-zA-Z]{1,32})(-?\d{1,10})? ?/.exec(s.substr(i,48));if(!m){i+=2;continue;}const w=m[1],arg=m[2];i+=m[0].length;
      if(RTF_SKIP.has(w)){skip=1;continue;}
      if(w==='shptxt'){skip=0;continue;} /* texte d'une zone de texte : gardé (à sa place) */
      if(w==='uc'){uc=+arg||0;continue;}
      if(w==='u'){let cp=parseInt(arg,10);if(cp<0)cp+=65536;if(!skip)out+=String.fromCharCode(cp);/* caractères de repli */for(let k=0;k<uc&&i<s.length;k++){if(s[i]==='\\'&&s[i+1]==="'")i+=4;else if(s[i]==='\\'||s[i]==='{'||s[i]==='}')break;else i++;}continue;}
      if(skip)continue;
      switch(w){case 'par':case 'line':case 'sect':case 'page':case 'row':out+='\n';break;case 'tab':out+='\t';break;case 'cell':out+='\t|\t';break;case 'emdash':out+='—';break;case 'endash':out+='–';break;case 'bullet':out+='•';break;case 'lquote':out+='‘';break;case 'rquote':out+='’';break;case 'ldblquote':out+='“';break;case 'rdblquote':out+='”';break;}
      continue;}
    flushHex();if(c==='\r'||c==='\n'){i++;continue;}if(!skip)out+=c;i++;}
  flushHex();return out;}
function rtfDoc(s){const t=PUA(rtfText(s));return textDoc(t.split('\n').map(l=>l.replace(/\t\|\t\s*$/,'').replace(/\t\|\t/g,' | ')),'rtf');}
