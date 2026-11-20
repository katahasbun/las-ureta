// Utilidades
const $=id=>document.getElementById(id);
const clp=n=>"$"+Math.round(n).toLocaleString("es-CL");
// Medidas de un trabajo: obra, margen, medida vidrio (MV) y medida final (MV + marco por cada lado)
const fmtN=x=>String(Math.round((parseFloat(x)||0)*10)/10).replace(".",",");
function medidasTxt(it){const m=(it.m||[]).map(x=>parseFloat(x)||0),mg=m.every(x=>x===m[0])?`${fmtN(m[0])} cm`:`sup ${fmtN(m[0])}, inf ${fmtN(m[1])}, izq ${fmtN(m[2])}, der ${fmtN(m[3])} cm`;
  const marco=(it.mw||[]).reduce((a,x)=>a+(parseFloat(x)||0),0),c=it.c||{};
  return `obra ${fmtN(it.alto)} × ${fmtN(it.ancho)} cm · margen ${mg} · MV ${fmtN(c.mvA)} × ${fmtN(c.mvW)} cm · final ${fmtN(c.mvA+2*marco)} × ${fmtN(c.mvW+2*marco)} cm`}
const colorM=(it,k)=>it.mc&&it.mc[k]?", color "+it.mc[k]:"";
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// Cotizador, órdenes, restauraciones y proveedores
// Opciones de cada material; si tienen proveedor (paspartú) se agrupan por proveedor
function opcionesMat(k){const ids=ORDEN_OPT[k]||OPT[k].map((_,i)=>i),op=i=>`<option value="${i}">${OPT[k][i][0]}</option>`,prov=i=>typeof OPT[k][i][2]==="string"?OPT[k][i][2]:"";
 if(!ids.some(prov))return ids.map(op).join("");const g={};ids.forEach(i=>(g[prov(i)]=g[prov(i)]||[]).push(i));
 return (g[""]||[]).map(op).join("")+Object.keys(g).filter(Boolean).map(s=>`<optgroup label="${s} · ${clp(OPT[k][g[s][0]][1])}/m²">${g[s].map(op).join("")}</optgroup>`).join("")}
for(const k in OPT){$(k).innerHTML='<option value="">Seleccionar…</option>'+opcionesMat(k)}
$("region").innerHTML='<option value="">Seleccionar zona…</option>'+REG.map((o,i)=>`<option value="${i}">${o[0]}</option>`).join("");
let molds=[-1],mw=[""],mc=[""],mq=[""],cart=[],editing=null,photos={1:null,2:null};
const mlabel=m=>`${m[0]} · ${m[1]}${m[2]?" · "+m[2]:""} · ${clp(m[3])}/ML`;
function fillRes(i){const q=(mq[i]||"").toLowerCase().trim(),all=MOLD.map((m,j)=>({m,j})).filter(x=>!q||x.m.join(" ").toLowerCase().includes(q)),shown=all.slice(0,60);
  $("mr"+i).innerHTML=shown.map(x=>`<button type="button" class="mres" data-pick="${i}|${x.j}">${mlabel(x.m)}</button>`).join("")+(all.length?"":'<p class="empty" style="padding:10px">Sin resultados</p>')+(all.length>60?`<p class="empty" style="padding:8px 10px;font-size:12px">Mostrando 60 de ${all.length}. Escribe más para afinar.</p>`:"")}
function renderMolds(){
  $("molduras").innerHTML=molds.map((sel,i)=>`<div style="margin-bottom:14px"><label${sel<0?` for="mq${i}"`:""}>Moldura ${i+1}</label>`+(sel>=0?`<div class="mpick"><span>${mlabel(MOLD[sel])}</span><button class="btn s" type="button" data-chg="${i}">Cambiar</button>${i?`<button class="btn s" type="button" data-rm="${i}">Quitar</button>`:""}</div><div class="mdet"><div><label for="mw${i}">Ancho (cm)</label><input type="number" id="mw${i}" data-mw="${i}" inputmode="decimal" min="0" step="0.1" placeholder="Ej: 2" value="${mw[i]||""}"></div><div><label for="mc${i}">Color</label><input type="text" id="mc${i}" data-mc="${i}" placeholder="Ej.: dorado, negro mate" value="${esc(mc[i]||"")}"></div></div>`:`<input type="text" id="mq${i}" data-mq="${i}" autocomplete="off" placeholder="Buscar por código, nombre o proveedor" value="${(mq[i]||"").replace(/"/g,"&quot;")}"><div class="mres-box" id="mr${i}"></div>${i?`<button class="btn s" type="button" data-rm="${i}" style="margin-top:6px">Quitar</button>`:""}`)+`</div>`).join("");
  molds.forEach((sel,i)=>{if(sel<0)fillRes(i)});
}
function calc(){
  const g=id=>Math.max(0,parseFloat($(id).value)||0);
  const alto=g("alto"),ancho=g("ancho"),u=Math.max(1,g("cant"));
  const mvA=alto+g("mSup")+g("mInf"),mvW=ancho+g("mIzq")+g("mDer");
  const area=(mvA/100)*(mvW/100);          // m² de MV
  const ml=2*(mvA+mvW)/100;                 // perímetro de MV (se usa en montaje por ML)
  const mls=[];
  const L=[];
  let sub=0;
  molds.forEach((s,i)=>{if(s<0)return;const mi=(2*(mvA+mvW)+8*(parseFloat(mw[i])||0))/100;mls.push(mi);const v=mi*MOLD[s][3];sub+=v;L.push([`Moldura ${i+1} (${mi.toFixed(2).replace(".",",")} ML)`,v])});
  for(const [k,n] of [["vidrio","Vidrio"],["paspa","Paspartú"],["fondo","Fondo"]]){const p=(OPT[k][$(k).value]||[0,0])[1];if(p){const v=area*p;sub+=v;L.push([`${n} (${area.toFixed(3).replace(".",",")} m²)`,v])}}
const bis=(OPT.vidrio[$("vidrio").value]||[])[2];if(bis){const v=ml*bis;sub+=v;L.push([`Biselado (${ml.toFixed(2).replace(".",",")} ML)`,v])}
  const mt=OPT.montaje[$("montaje").value]||["",0,"fijo"],mp=mt[2]==="manual"?g("montajeManual"):mt[1];if(mp){const v=mt[2]==="ml"?ml*mp:mt[2]==="area"?area*mp:mp;sub+=v;L.push(["Montaje: "+mt[0].replace(/ \(.*\)/,"")+(mt[2]==="ml"?` (${ml.toFixed(2).replace(".",",")} ML)`:mt[2]==="area"?` (${area.toFixed(3).replace(".",",")} m²)`:""),v])}
  const ja=(OPT.java[$("java").value]||[0,0])[1];if(ja){sub+=ja;L.push(["Java",ja])}
  if($("desm").checked)desmSel().forEach(i=>{const[n,v]=DESMONTAJE[i];sub+=v;L.push(["Desmontaje ("+n.toLowerCase()+")",v])});
  if($("museo").checked){const v=sub*MUSEO;sub+=v;L.push(["Conservación museo 20 %",v])}
  if($("urg").checked){const v=sub*URG;sub+=v;L.push(["Urgencia 30 %",v])}
  let unit=sub,tot=unit*u;
  if($("desp").checked){const v=(REG[$("region").value]||[0,0])[1];tot+=v;L.push(["Despacho",v])}
  return{mvA,mvW,area,ml,mls,L,unit,u,tot};
}
function refresh(){
  const c=calc();
  $("mv").innerHTML=`Medida vidrio (MV): <b>${c.mvA} × ${c.mvW} cm</b> · superficie <b>${c.area.toFixed(3).replace(".",",")} m²</b> · moldura <b>${c.mls.length?c.mls.map(x=>x.toFixed(2).replace(".",",")).join(" · "):"—"} ML</b> (perímetro + 8 × ancho)`;
  $("desglose").innerHTML=c.L.map(l=>`${l[0]}: <b>${clp(l[1])}</b>`).join("<br>")+(c.u>1?`<br>× ${c.u} unidades`:"");
  $("subItem").textContent=clp(c.tot);
}
function renderCart(){
  $("cart").innerHTML=cart.length?cart.map((it,i)=>`<div class="item"><div class="t"><span>${it.nombre||"Sin nombre"}</span><span>${clp(it.c.tot)}</span></div><div class="d">${it.alto}×${it.ancho} cm · ${it.c.u} u. · MV ${it.c.mvA}×${it.c.mvW}<br>${it.mn.join(" + ")} · ${it.mats.join(", ")}${it.ph1?" · 📷":""}${extrasTxt(it)?"<br>"+esc(extrasTxt(it)):""}</div><button class="btn s" data-e="${i}" type="button">Editar</button> <button class="btn s" data-d="${i}" type="button">Eliminar</button></div>`).join(""):'<p class="empty">Aún no hay trabajos. Completa el formulario y agrégalo.</p>';
  $("total").textContent=clp(cart.reduce((a,x)=>a+x.c.tot,0));
}
function snap(){
  const c=calc(),t=k=>(OPT[k][$(k).value]||["Sin"])[0];
  return{nombre:$("nombre").value,alto:$("alto").value,ancho:$("ancho").value,cant:$("cant").value,m:["mSup","mInf","mIzq","mDer"].map(i=>$(i).value),blanco:$("bOn").checked?["bSup","bInf","bIzq","bDer"].map(i=>$(i).value):null,desmOp:$("desm").checked?desmSel():[],molds:molds.filter(s=>s>=0),mw:molds.map((s,i)=>s>=0?mw[i]:null).filter(x=>x!==null),mc:molds.map((s,i)=>s>=0?(mc[i]||""):null).filter(x=>x!==null),sel:["vidrio","paspa","fondo","montaje","java"].map(k=>$(k).value),chk:["desm","urg","museo","desp"].map(i=>$(i).checked),region:$("region").value,urgF:$("urgFecha").value,dir:$("dir").value.trim(),obs:$("obs").value,mn:molds.map((s,i)=>s>=0?MOLD[s][0]+(mc[i]?` (${mc[i]})`:""):null).filter(x=>x!==null),mats:[t("vidrio"),t("paspa"),t("fondo")].filter(x=>!x.startsWith("Sin")),ph1:photos[1],ph2:photos[2],mm:$("montajeManual").value,c};
}
function load(s){
  $("nombre").value=s.nombre;$("alto").value=s.alto;$("ancho").value=s.ancho;$("cant").value=s.cant;
  ["mSup","mInf","mIzq","mDer"].forEach((i,n)=>$(i).value=s.m[n]);$("mUni").value=s.m[0];$("mPers").checked=!s.m.every(x=>x==s.m[0]);syncM();$("bOn").checked=!!s.blanco;["bSup","bInf","bIzq","bDer"].forEach((i,n)=>$(i).value=s.blanco?s.blanco[n]:"");$("bUni").value=s.blanco?s.blanco[0]:"";$("bPers").checked=!!s.blanco&&!s.blanco.every(x=>x==s.blanco[0]);syncB();document.querySelectorAll("[data-dop]").forEach(c=>c.checked=(s.desmOp||[]).includes(+c.dataset.dop));
  ["vidrio","paspa","fondo","montaje","java"].forEach((k,n)=>$(k).value=s.sel[n]);
  ["desm","urg","museo","desp"].forEach((k,n)=>$(k).checked=s.chk[n]);
  $("region").value=s.region;$("urgFecha").value=s.urgF||"";$("dir").value=s.dir||"";$("obs").value=s.obs;$("montajeManual").value=s.mm||"";molds=s.molds.length?[...s.molds]:[-1];mw=molds.map((_,i)=>s.mw&&s.mw[i]!=null?String(s.mw[i]):"");mc=molds.map((_,i)=>s.mc&&s.mc[i]!=null?String(s.mc[i]):"");mq=molds.map(()=>"");photos={1:s.ph1,2:s.ph2};
  [1,2].forEach(p=>setPh(p,photos[p]));syncDesp();syncDesm();syncMM();renderMolds();refresh();
}
function setPh(p,url){const el=$("ph"+p);const old=el.querySelector("img");if(old)old.remove();if(url){const im=document.createElement("img");im.src=fotoSrc(url);im.alt="";el.appendChild(im)}}
function syncMM(){$("mmBox").style.display=(OPT.montaje[$("montaje").value]||[])[2]==="manual"?"block":"none"}
document.addEventListener("change",e=>{if(e.target.id==="montaje"){syncMM();refresh()}});
function syncDesp(){$("regionBox").style.display=$("desp").checked?"block":"none";$("urgBox").style.display=$("urg").checked?"block":"none";$("urgFecha").min=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)}
// Urgencia y despacho de un trabajo, en texto (para carrito, orden y PDF)
const extrasTxt=it=>[blancoTxt(it),it.chk&&it.chk[0]&&(it.desmOp||[]).length?desmTxt(it):"",it.chk&&it.chk[1]&&it.urgF?"Urgente para el "+fd(new Date(it.urgF+"T12:00:00")):"",it.chk&&it.chk[3]?"Despacho"+(it.dir?": "+it.dir:"")+((REG[it.region]||[""])[0]?" ("+REG[it.region][0]+")":""):""].filter(Boolean).join(" · ");
function toast(t){const e=$("toast");e.textContent=t;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",2600)}
function reset(){load({nombre:"",alto:"",ancho:"",cant:1,m:["","","",""],molds:[-1],sel:["","","","",""],chk:[false,false,false,false],region:"",obs:"",ph1:null,ph2:null});editing=null;$("add").textContent="Agregar al carrito";$("cancel").style.display="none"}
document.addEventListener("change",e=>{if(e.target.classList)e.target.classList.remove("req")});
document.addEventListener("input",e=>{if(e.target.classList)e.target.classList.remove("req");const q=e.target.dataset.mq;if(q!==undefined){mq[+q]=e.target.value;fillRes(+q)}refresh()});
document.addEventListener("input",e=>{if(e.target.dataset.mw!==undefined){mw[+e.target.dataset.mw]=e.target.value;refresh()}if(e.target.dataset.mc!==undefined)mc[+e.target.dataset.mc]=e.target.value;});
document.addEventListener("change",e=>{if(e.target.dataset.m!==undefined){molds[+e.target.dataset.m]=+e.target.value}if(e.target.id==="desp"||e.target.id==="urg")syncDesp();if(e.target.type==="file"&&e.target.dataset.p){const f=e.target.files[0],p=e.target.dataset.p;if(f)shrink(f,u=>{photos[p]=u;setPh(p,u)})}refresh()});
document.addEventListener("click",e=>{const d=e.target.dataset;
  if(d.pick!==undefined){const[a,b]=d.pick.split("|").map(Number);molds[a]=b;renderMolds();refresh()}
  if(d.chg!==undefined){molds[+d.chg]=-1;mw[+d.chg]="";mc[+d.chg]="";mq[+d.chg]="";renderMolds();refresh()}
  if(d.rm!==undefined){molds.splice(+d.rm,1);mw.splice(+d.rm,1);mc.splice(+d.rm,1);mq.splice(+d.rm,1);renderMolds();refresh()}
  if(d.e!==undefined){editing=+d.e;load(cart[editing]);$("add").textContent="Guardar cambios";$("cancel").style.display="inline-block";scrollTo({top:0,behavior:"smooth"})}
  if(d.d!==undefined){cart.splice(+d.d,1);renderCart();toast("Trabajo eliminado")}});
$("addMold").onclick=()=>{if(molds.length<3){molds.push(-1);mw.push("");mc.push("");mq.push("");renderMolds();refresh()}else toast("Máximo tres molduras por trabajo")};
$("add").onclick=()=>{if(!(parseFloat($("alto").value)>0&&parseFloat($("ancho").value)>0))return toast("Completa las medidas de la obra");if(!$("mPers").checked&&$("mUni").value==="")return toast("Indica el margen (puede ser 0)");if($("bOn").checked&&!$("bPers").checked&&$("bUni").value==="")return toast("Indica los cm de blanco original");if($("desm").checked&&!desmSel().length)return toast("Elige el tipo de desmontaje");if(!molds.some(s=>s>=0))return toast("Elige al menos una moldura");if(molds.some((s,i)=>s>=0&&MOLD[s][3]>0&&!(parseFloat(mw[i])>0)))return toast("Indica el ancho de cada moldura");
const falta=[["vidrio","Vidrio"],["paspa","Paspartú"],["fondo","Fondo"],["montaje","Montaje"],["java","Java o embalaje"]].filter(([k])=>$(k).value==="");if($("desp").checked&&$("region").value==="")falta.push(["region","Zona de despacho"]);if($("desp").checked&&!$("dir").value.trim())falta.push(["dir","Dirección de despacho"]);if($("urg").checked&&!$("urgFecha").value)falta.push(["urgFecha","Fecha de la urgencia"]);
if($("montaje").value!==""&&(OPT.montaje[$("montaje").value]||[])[2]==="manual"&&!(parseFloat($("montajeManual").value)>0))falta.push(["montajeManual","Precio del montaje de objetos"]);
if(falta.length){["vidrio","paspa","fondo","montaje","java","region","montajeManual","dir","urgFecha"].forEach(k=>$(k).classList.remove("req"));falta.forEach(([k])=>$(k).classList.add("req"));$(falta[0][0]).focus();return toast("Falta elegir: "+falta.map(x=>x[1]).join(", "))}const s=snap();if(editing!==null){cart[editing]=s;toast("Trabajo actualizado")}else{cart.push(s);toast("Trabajo agregado")}renderCart();reset()};
$("cancel").onclick=reset;
$("draft").onclick=()=>toast(cart.length?"Borrador guardado":"Agrega al menos un trabajo");
$("ot").onclick=()=>{if(!cart.length)return toast("Agrega al menos un trabajo");$("dlgTxt").textContent=`Se creará una orden con ${cart.length} trabajo(s) por ${$("total").textContent}. En la versión final se genera el PDF del cliente y se pregunta si enviarlo por WhatsApp.`;$("dlg").showModal()};
$("dlg").addEventListener("close",async()=>{const ok=$("dlg").returnValue==="si";$("dlg").returnValue="";if(ok){if(guardando)return;guardando=true;const rec=otRec();toast("Guardando la orden…");try{await crearOrden(rec)}catch(e){console.error(e);return toast("No se pudo guardar la orden. Revisa la conexión y vuelve a intentarlo")}finally{guardando=false}ots.push(rec);presAceptado(rec);toast(`Orden N° ${rec.n} confirmada`);cart=[];renderCart();reset();["cNom","cTel","cMail","entFecha","abono"].forEach(i=>$(i).value="");$("entTipo").value="s";$("como").value="";$("conv").value="No";$("dcto").value="";$("pago").value="";$("abonoTipo").value="";location.hash="menu";otDespCargar(null);facCargar("o",null);ofrecerEnvio(rec)}});
renderMolds();refresh();renderCart();
// Blanco original: igual que el margen (parejo o personalizado). Solo instrucción para el taller.
function syncB(){const on=$("bOn").checked,p=$("bPers").checked;$("bBox").style.display=on?"block":"none";$("bGrid").style.display=p?"grid":"none";$("bUni").disabled=p;if(!p)["bSup","bInf","bIzq","bDer"].forEach(i=>$(i).value=$("bUni").value)}
document.addEventListener("input",e=>{if(e.target.id==="bUni")syncB()});
document.addEventListener("change",e=>{if(e.target.id==="bOn"||e.target.id==="bPers")syncB()});
const blancoTxt=it=>{const b=(it.blanco||[]).map(x=>String(x).replace(".",","));if(!it.blanco)return"";return b.every(x=>x==b[0])?`Blanco original: ${b[0]} cm`:`Blanco original (cm): superior ${b[0]}, inferior ${b[1]}, izquierdo ${b[2]}, derecho ${b[3]}`};
// Desmontaje: opciones marcadas
$("desmBox").innerHTML=DESMONTAJE.map(([n,v],i)=>`<label class="chk" style="margin:4px 0"><input type="checkbox" data-dop="${i}"><span>${n} <small style="color:var(--mute)">${clp(v)}</small></span></label>`).join("");
const desmSel=()=>[...document.querySelectorAll("[data-dop]:checked")].map(c=>+c.dataset.dop);
const desmTxt=it=>{const o=(it.desmOp||[]).map(i=>DESMONTAJE[i][0].toLowerCase());return "Desmontaje"+(o.length?": "+o.join(", "):"")};
function syncDesm(){$("desmBox").style.display=$("desm").checked?"block":"none"}
document.addEventListener("change",e=>{if(e.target.id==="desm")syncDesm()});
function syncM(){const p=$("mPers").checked;$("mGrid").style.display=p?"grid":"none";$("mUni").disabled=p;if(!p)["mSup","mInf","mIzq","mDer"].forEach(i=>$(i).value=$("mUni").value)}
document.addEventListener("input",e=>{if(e.target.id==="mUni"){syncM();refresh()}});
document.addEventListener("change",e=>{if(e.target.id==="mPers"){syncM();refresh()}});
const TIT={"orden-papel":"Orden en papel",restauraciones:"Restauraciones",ordenes:"Órdenes de trabajo",envios:"Envíos a domicilio",retiros:"Por retirar",presupuestos:"Presupuestos",pendientes:"Pendientes",proveedores:"Proveedores"};
let guardando=false;
const fill=(id,a,ph)=>{$(id).innerHTML=(ph?`<option value="">${ph}</option>`:"")+a.map(x=>`<option>${x}</option>`).join("")};
fill("como",["Boca a boca","Cliente","Google","ChatGPT","Instagram","TikTok","Pasando por el local"],"Seleccionar");
fill("conv",["No","Clases de arte","Art Stgo","Otro"]);
fill("pago",["POS","Mercado Pago","Transferencia","Efectivo"],"Seleccionar");
$("dcto").innerHTML='<option value="">Seleccionar</option>'+[5,7,10,15].map(p=>`<option value="${p}">${p} %</option>`).join("");
function otRender(){$("otN").textContent=otCur?"N° "+otCur.n:"(el número se asigna al confirmar)";$("otItems").innerHTML=otIt().map((it,i)=>`<div class="item"><div class="t"><span>${esc(it.nombre||"Sin nombre")}</span><span>${clp(it.c.tot)}</span></div><div class="d">${it.alto}×${it.ancho} cm · ${it.c.u} u. · MV ${it.c.mvA}×${it.c.mvW}<br>${esc(it.mn.join(" + "))} · ${esc(it.mats.join(", "))}${extrasTxt(it)?"<br>"+esc(extrasTxt(it)):""}</div>${it.ph1||it.ph2?`<div class="oph">${[[it.ph1,"Obra original",1],[it.ph2,"Muestra de moldura",2]].map(([u,l,k])=>u?`<figure><img src="${fotoSrc(u)}" alt="${l}" data-pi="${i}-${k}"><figcaption>${l}</figcaption></figure>`:"").join("")}</div>`:""}${otCur?it.molds.map((s,k)=>`<label>Moldura ${k+1}</label><select data-om="${i}-${k}">${MOLD.map((m,j)=>`<option value="${j}"${j===s?" selected":""}>${esc(m[0]+" · "+m[1])}</option>`).join("")}</select>`).join(""):""}<label for="o${i}">Observaciones ${esc(it.nombre||"")}</label><input type="text" id="o${i}" data-o="${i}" value="${esc(it.obs||"")}" placeholder="Detalles extra para este trabajo"></div>`).join("");otTot()}
// Despacho a domicilio de la orden completa (se puede agregar o cambiar al editar la orden)
$("otRegion").innerHTML='<option value="">Seleccionar zona…</option>'+REG.map((o,i)=>`<option value="${i}">${o[0]}</option>`).join("");
const despItem=()=>otIt().find(x=>x.chk&&x.chk[3]);
function otDespVal(){return !despItem()&&$("otDesp").checked?Math.max(0,parseFloat($("otDespCosto").value)||0):0}
function otDespSync(){const it=despItem();$("otDespInfo").style.display=it?"block":"none";$("otDespCtl").style.display=it?"none":"block";if(it)$("otDespInfo").textContent=`Este pedido ya incluye despacho, cotizado en «${it.nombre||"el trabajo"}»: ${extrasTxt(it)}`;$("otDespBox").style.display=$("otDesp").checked?"block":"none"}
function otDespDatos(){const on=!despItem()&&$("otDesp").checked;return{desp:on,region:on?$("otRegion").value:"",dir:on?$("otDir").value.trim():"",despCosto:on?$("otDespCosto").value:""}}
function otDespCargar(o){const on=!!(o&&o.desp);$("otDesp").checked=on;$("otRegion").value=on?o.region:"";$("otDir").value=on?o.dir:"";$("otDespCosto").value=on?o.despCosto:""}
document.addEventListener("change",e=>{if(e.target.id==="otRegion"){$("otDespCosto").value=(REG[e.target.value]||[0,0])[1]||"";otTot()}});
function otTot(){const t=otIt().reduce((a,x)=>a+x.c.tot,0),cv=$("conv").value!=="No",pct=cv?+$("dcto").value||0:0,dsp=otDespVal(),f=t*(1-pct/100)+dsp,tp=$("abonoTipo").value,ab=(tp==="100"||tp==="50")?Math.round(f*+tp/100):tp==="v"?Math.max(0,parseFloat($("abono").value)||0):0;if(tp!=="v")$("abono").value=tp?ab:"";$("abono").readOnly=tp!=="v";$("dctoBox").style.display=cv?"block":"none";$("fechaBox").style.display=$("entTipo").value==="f"?"block":"none";$("otTotal").textContent=clp(t);$("rowDcto").style.display=pct||dsp?"flex":"none";$("rowDctoL").textContent=pct?(dsp?"Total con descuento y despacho":"Total con descuento"):"Total con despacho";$("rowDesp").style.display=dsp?"flex":"none";$("otDespTxt").textContent=clp(dsp);otDespSync();$("otTotalD").textContent=clp(f);const pg=otCur?sumaPagos(otCur):0;$("saldo").textContent=clp(Math.max(0,f-ab-pg));if(document.activeElement!==$("saldoEd"))$("saldoEd").value=Math.max(0,Math.round(f-ab-pg))}
function otF(){const t=otIt().reduce((a,x)=>a+x.c.tot,0),cv=$("conv").value!=="No",pct=cv?+$("dcto").value||0:0;return t*(1-pct/100)+otDespVal()}
document.addEventListener("input",e=>{if(e.target.id!=="saldoEd")return;const f=otF();$("abonoTipo").value="v";$("abono").value=Math.max(0,Math.round(f-(otCur?sumaPagos(otCur):0)-(parseFloat(e.target.value)||0)));otTot()});
document.addEventListener("input",e=>{const d=e.target.dataset;if(d.o!==undefined)otIt()[+d.o].obs=e.target.value;if(e.target.closest(".v-ot"))otTot()});
document.addEventListener("change",e=>{if(e.target.id==="abonoTipo"&&e.target.value==="v")$("abono").value="";if(e.target.closest(".v-ot"))otTot()});
$("ot").onclick=()=>{if(!cart.length)return toast("Agrega al menos un trabajo");location.hash="nueva-orden"};
$("otOk").onclick=()=>{if(facFalta("o"))return toast("Escribe los datos de facturación");if($("otDesp").checked&&!despItem()&&!$("otDir").value.trim())return toast("Escribe la dirección de despacho");if(!$("abonoTipo").value)return toast("Elige el abono: 100 %, 50 % o variable");if($("abonoTipo").value==="v"&&$("abono").value==="")return toast("Escribe el monto del abono");if(otCur){if(!$("cNom").value.trim()||!$("cTel").value.trim())return toast("Faltan el nombre y el teléfono del cliente");return otSave()}if(!$("cNom").value.trim()||!$("cTel").value.trim())return toast("Faltan el nombre y el teléfono del cliente");const m=$("cMail").value.trim();$("dlgTxt").textContent=`Se confirmará la orden por ${$("rowDcto").style.display==="flex"?$("otTotalD").textContent:$("otTotal").textContent}. Después podrás descargar el PDF y enviarlo por WhatsApp al ${$("cTel").value}.`;$("dlg").showModal()};
const RF={rNom:"nom",rTel:"tel",rMail:"mail",rObj:"obj",rUni:"uni",rObs:"obs",rPrecio:"precio",rAbono:"abono",rPago:"pago",rFecha:"fecha"};
let rests=[],rEd=null,rPh=[null,null,null];
fill("rPago",["POS","Mercado Pago","Transferencia","Efectivo"],"Seleccionar");
function rPhSet(i,u){const el=$("rph"+i),o=el.querySelector("img");if(o)o.remove();if(u){const im=document.createElement("img");im.src=fotoSrc(u);im.alt="";el.appendChild(im)}}
function rTot(){const p=Math.max(0,parseFloat($("rPrecio").value)||0),a=Math.max(0,parseFloat($("rAbono").value)||0),o=rEd!==null?rests.find(x=>x.n===rEd):null;$("rSaldo").textContent=clp(Math.max(0,p-a-(o?sumaPagos(o):0)))}
function rLoad(r){rEd=r?r.n:null;$("rN").textContent=r?"N° "+r.n:"";for(const id in RF)$(id).value=r?(r[RF[id]]??""):(id==="rUni"?1:"");facCargar("r",r);rPh=r?[...r.ph]:[null,null,null];rPh.forEach((u,i)=>rPhSet(i+1,u));$("rCobro").style.display=r?"block":"none";$("rSave").textContent=r?"Guardar cambios":"Guardar orden";$("rNew").style.display=r?"inline-block":"none";rTot()}
function rList(){$("rLista").innerHTML=rests.length?rests.map(r=>`<div class="item"><div class="t"><span>N° ${r.n} · ${esc(r.nom)}</span><span>${r.precio?clp(+r.precio):"Por evaluar"}</span></div><div class="d">${esc(r.obj)} · ${esc(r.uni)} u.${r.precio?` · Saldo ${clp(Math.max(0,r.precio-(+r.abono||0)))}`:""}</div><button class="btn s" data-re="${r.n}" type="button">Editar</button></div>`).join(""):'<p class="empty">Aún no hay órdenes de restauración.</p>'}
$("rSave").onclick=async()=>{if(guardando)return;if(facFalta("r"))return toast("Escribe los datos de facturación");if(!$("rNom").value.trim()||!$("rTel").value.trim()||!$("rObj").value.trim())return toast("Faltan el nombre, el teléfono o el objeto");const r={tipo:"rest",vendedora:nombreVend,creado:Date.now(),taller:"",estado:"Recibida",hist:[]};for(const id in RF)r[RF[id]]=$(id).value;Object.assign(r,facDatos("r"));r.ph=[...rPh];if(rEd!==null){const o=rests.find(x=>x.n===rEd);r.creado=o.creado;r.taller=o.taller;r.estado=o.estado||"Recibida";r.hist=o.hist||[];r.avisado=o.avisado;r.vendedora=o.vendedora;r.pagos=o.pagos;r.recordatorios=o.recordatorios;r.pendientes=o.pendientes;r.urgente=o.urgente;r.n=rEd;guardando=true;const ok=await guardarOrden(r);guardando=false;if(!ok)return;rests[rests.indexOf(o)]=r;toast("Orden actualizada")}else{guardando=true;toast("Guardando la orden…");try{await crearOrden(r)}catch(e){console.error(e);return toast("No se pudo guardar la orden. Revisa la conexión y vuelve a intentarlo")}finally{guardando=false}rests.push(r);toast(`Orden N° ${r.n} guardada`);ofrecerEnvio(r)}if(document.body.dataset.v==="ordenes"){ordList();rLoad(rests.find(x=>x.n===r.n));ordEst()}else{rLoad(null);rList()}scrollTo({top:0,behavior:"smooth"})};
$("rNew").onclick=()=>rLoad(null);
document.addEventListener("input",e=>{if(e.target.id==="rPrecio"||e.target.id==="rAbono")rTot()});
document.addEventListener("change",e=>{const p=e.target.dataset.rp;if(p&&e.target.files[0]){shrink(e.target.files[0],u=>{rPh[p-1]=u;rPhSet(p,u)})}});
document.addEventListener("click",e=>{const n=e.target.dataset.re;if(n!==undefined){rLoad(rests.find(x=>x.n==n));scrollTo({top:0,behavior:"smooth"})}});
rLoad(null);rList();
const ots=[],chosen=new Set();let otCur=null,ordSel=null,lastV="";
const otIt=()=>otCur?otCur.items:cart;
const allOT=()=>[...ots,...rests].sort((a,b)=>a.n-b.n);
const fd=d=>d.toLocaleDateString("es-CL");
function due(o){if(o.papel)return o.entTipo==="f"&&o.entFecha?new Date(o.entFecha+"T23:59:59"):new Date(o.creado+21*864e5);if(o.tipo==="rest")return o.fecha?new Date(o.fecha+"T23:59:59"):null;if(o.entTipo==="f"&&o.entFecha)return new Date(o.entFecha+"T23:59:59");return new Date(o.creado+21*864e5)}
function est(o){if(o.estado==="Entregada")return["verde","Entregada"];const d=due(o);return d?(Date.now()>d?["rojo","Atrasada"]:["verde","A tiempo"]):["gris","Sin fecha de entrega"]}
function shrink(f,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1000/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.85))};im.onerror=()=>cb(r.result);im.src=r.result};r.readAsDataURL(f)}
function otRec(){return{tipo:"enm",...otDespDatos(),...facDatos("o"),nom:$("cNom").value.trim(),tel:$("cTel").value.trim(),mail:$("cMail").value.trim(),entTipo:$("entTipo").value,entFecha:$("entFecha").value,items:cart.map(x=>({...x})),como:$("como").value,conv:$("conv").value,dcto:$("dcto").value,pago:$("pago").value,abono:$("abono").value,abonoTipo:$("abonoTipo").value,vendedora:nombreVend,creado:Date.now(),taller:"",estado:"Recibida",hist:[]}}
function otClear(){["cNom","cTel","cMail","entFecha","abono"].forEach(i=>$(i).value="");$("entTipo").value="s";$("como").value="";$("conv").value="No";$("dcto").value="";$("pago").value="";$("abonoTipo").value="";otDespCargar(null);facCargar("o",null)}
function otLoad(o){otCur=o;otDespCargar(o);facCargar("o",o);$("cNom").value=o.nom||"";$("cTel").value=o.tel||"";$("cMail").value=o.mail||"";$("entTipo").value=o.entTipo;$("entFecha").value=o.entFecha;$("como").value=o.como;$("conv").value=o.conv;$("dcto").value=o.dcto;$("pago").value=o.pago;$("abonoTipo").value=o.abono!==""&&o.abono!=null?"v":(o.abonoTipo||"");$("abono").value=o.abono;$("otOk").textContent="Guardar cambios";$("otBack").style.display="none";otRender()}
async function otSave(){const o=otCur;Object.assign(o,otDespDatos(),facDatos("o"));o.nom=$("cNom").value.trim();o.tel=$("cTel").value.trim();o.mail=$("cMail").value.trim();o.entTipo=$("entTipo").value;o.entFecha=$("entFecha").value;o.como=$("como").value;o.conv=$("conv").value;o.dcto=$("dcto").value;o.pago=$("pago").value;o.abono=$("abono").value;o.abonoTipo=$("abonoTipo").value;if(!await guardarOrden(o))return;toast("Orden actualizada");ordList();ordEst()}
const ESTADOS=["Recibida","Enviada al taller","Devuelta al taller","Lista para retirar","Entregada"];
const estOf=o=>o.estado||"Recibida";
let pendEst=null;
const nrm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function otTxt(o){const parts=[];(function w(v){if(v==null)return;if(typeof v==="string"){if(!v.startsWith("data:"))parts.push(v)}else if(typeof v==="number")parts.push(String(v));else if(Array.isArray(v))v.forEach(w);else if(typeof v==="object")Object.entries(v).forEach(([k,x])=>{if(k!=="hist")w(x)})})(o);parts.push("OT "+o.n,o.tipo==="rest"?"restauracion":"enmarcacion",estOf(o));return nrm(parts.join(" "))}
function ordMatch(o){const q=nrm($("oQ").value).trim().split(/\s+/).filter(Boolean);if(!q.length)return true;const t=otTxt(o);return q.every(w=>t.includes(w))}
function ordList(){const L=allOT().filter(ordMatch).sort((a,b)=>b.n-a.n);$("oList").innerHTML=L.map(o=>`<div class="orow${o.n===ordSel?" on":""}${esUrgente(o)?" urg":""}" data-os="${o.n}"><input type="checkbox" data-oc="${o.n}"${chosen.has(o.n)?" checked":""} aria-label="Elegir OT ${o.n}"><i class="dot ${est(o)[0]}"></i><span>OT ${o.n}${o.nom?" · "+esc(o.nom):""}<small>${esUrgente(o)?'<b class="urgtag">Urgente</b> ':""}${o.tipo==="rest"?"Restauración":"Enmarcación"}${o.papel?" (papel)":""}${pendAbiertosDe(o)?` · ${pendAbiertosDe(o)} pendiente${pendAbiertosDe(o)>1?"s":""}`:""}${o.factura?" · Factura":""}${(()=>{const r=resumenOT(o);return r.total>0&&r.saldo<=0?" · Pagada":""})()}${o.vendedora?" · Vendedora: "+esc(o.vendedora):""}${o.taller?" · Taller: "+esc(o.taller):""}</small></span><select class="estsel" data-es="${o.n}" aria-label="Estado de la OT ${o.n}">${ESTADOS.map(x=>`<option${x===estOf(o)?" selected":""}>${x}</option>`).join("")}</select></div>`).join("")||(allOT().length?'<p class="empty">Ninguna orden coincide con la búsqueda.</p>':'<p class="empty">Aún no hay órdenes.</p>');$("oCnt").textContent=chosen.size}
const fh=t=>new Date(t).toLocaleString("es-CL",{dateStyle:"short",timeStyle:"short"});
function ordHist(){pagosRender();const o=allOT().find(x=>x.n===ordSel);if(!o){$("oHist").innerHTML="";return}
$("oHist").innerHTML="<h2>Historial de estados</h2>"+[...(o.hist||[])].reverse().map(h=>`<div class="tr"><span>${esc(h.de)} → <b>${esc(h.a)}</b>${h.por?` <small style="color:var(--mute)">(${esc(h.por)})</small>`:""}${h.wa?` <small style="color:var(--mute)">· aviso por WhatsApp</small>`:""}</span><span style="color:var(--mute)">${fh(h.t)}</span></div>`).join("")+`<div class="tr"><span>Recibida (orden creada${o.vendedora?" por "+esc(o.vendedora):""})</span><span style="color:var(--mute)">${fh(o.creado)}</span></div>`+(o.avisado?`<div class="tr"><span>Aviso «lista para retirar» abierto en WhatsApp</span><span style="color:var(--mute)">${fh(o.avisado)}</span></div>`:"")}
function setEstado(n,nuevo){const o=allOT().find(x=>x.n===n),ant=estOf(o);if(!o||nuevo===ant){ordList();return}
const apply=wa=>{o.hist=o.hist||[];o.hist.push({de:ant,a:nuevo,t:Date.now(),por:nombreVend||usuaria,...(wa?{wa:true}:{})});o.estado=nuevo;ordList();ordEst();ordHist();guardarOrden(o);toast(`OT ${n}: ${nuevo}`)};
// Mensaje de WhatsApp según el nuevo estado (textos en js/mensajes.js)
const tipoWA=nuevo==="Lista para retirar"&&!o.avisado?"listo":nuevo==="Devuelta al taller"?"devuelta":null;
if(tipoWA&&o.tel){pendEst={o,apply,tipo:tipoWA};$("waTxt").innerHTML=`Se abrirá WhatsApp para enviar este mensaje al <b>${esc(o.tel)}</b>:<br><br><i>${esc(textoWA(tipoWA,o)).replace(/\n/g,"<br>")}</i>`;linkWA($("waGo"),o,tipoWA);$("waDlg").showModal();return}
apply();if(nuevo==="Lista para retirar"&&o.avisado)toast(`OT ${n}: ${nuevo}. Ya se había avisado al cliente`)}
$("waDlg").addEventListener("close",()=>{const v=$("waDlg").returnValue,p=pendEst;$("waDlg").returnValue="";pendEst=null;if(!p)return;if(v==="avisar"){if(p.tipo==="listo")p.o.avisado=Date.now();p.apply(true);toast("Revisa WhatsApp y aprieta Enviar")}else if(v==="solo")p.apply();else ordList()});
document.addEventListener("input",e=>{if(e.target.id==="oQ")ordList()});
function ordEst(){const o=allOT().find(x=>x.n===ordSel),e=o?est(o):null,d=o?due(o):null;$("oEst").className="est "+(e?e[0]:"");$("oEst").textContent=e?(o.estado==="Entregada"?"Entregada":estOf(o)+" · "+e[1]+(d?" · entrega "+(o.tipo==="enm"&&o.entTipo!=="f"?"hasta el ":"el ")+fd(d):"")):""}
// Cerrar la orden abierta y volver a la lista (en tablet y celular la lista se oculta al abrir una orden)
function ordCerrar(){papCur=null;if(rEd!==null)rLoad(null);if(otCur){otCur=null;otClear();$("otOk").textContent="Confirmar";$("otBack").style.display=""}
  ordSel=null;document.body.dataset.sel="";$("oCliBox").style.display="none";ordList();ordEst();ordHist();scrollTo(0,0)}
$("oBack").onclick=ordCerrar;
function ordOpen(n){ordSel=n;$("oCliBox").style.display="block";const o=allOT().find(x=>x.n===n);document.body.dataset.sel=o.papel?"papel":o.tipo;if(o.papel)papLoad(o);else if(o.tipo==="rest")rLoad(o);else otLoad(o);ordList();ordEst();ordHist();scrollTo({top:0,behavior:"smooth"})}
document.addEventListener("change",e=>{const c=e.target.dataset.oc;if(c!==undefined){e.target.checked?chosen.add(+c):chosen.delete(+c);$("oCnt").textContent=chosen.size}const d=e.target.dataset.om;if(d!==undefined&&otCur){const[i,k]=d.split("-").map(Number),it=otCur.items[i];it.molds[k]=+e.target.value;const prev=snap();load(it);Object.assign(it,snap());load(prev);otRender()}});
document.addEventListener("change",e=>{const es=e.target.dataset.es;if(es!==undefined)setEstado(+es,e.target.value)});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest(".estsel"))return;const pi=e.target.dataset&&e.target.dataset.pi;if(pi){const[a,b]=pi.split("-");$("picImg").src=fotoSrc(otIt()[+a]["ph"+b]);$("picDlg").showModal();return}if(e.target.id==="picX"||e.target===$("picDlg")){$("picDlg").close();return}if(e.target.dataset.oc!==undefined)return;const r=e.target.closest&&e.target.closest(".orow");if(r)ordOpen(+r.dataset.os)});
$("oGen").onclick=genPdf;
$("oCli").onclick=cliPdf;
// Enviar la orden por WhatsApp: 1) descargar el PDF, 2) abrir el chat con el mensaje
let envO=null;
function ofrecerEnvio(o,titulo){envO=o;linkWA($("envWa"),o,"confirmacion");$("envT").textContent=titulo||`Orden N° ${o.n} guardada`;$("envDlg").showModal()}
$("envPdf").onclick=()=>cliPdf(envO);
$("envWa").onclick=e=>{if(e.currentTarget.dataset.sinTel){e.preventDefault();return avisoTelInvalido()}toast("Adjunta el PDF en el chat y aprieta Enviar")};
$("waGo").onclick=e=>{if(e.currentTarget.dataset.sinTel){e.preventDefault();avisoTelInvalido();$("waDlg").close("solo");return}$("waDlg").close("avisar")};
$("envX").onclick=()=>$("envDlg").close();
$("oWa").onclick=()=>{const o=allOT().find(x=>x.n===ordSel);if(o)ofrecerEnvio(o,`Enviar orden N° ${o.n}`)};
async function cliPdf(x){const o=x&&x.n?x:allOT().find(y=>y.n===ordSel);if(!o)return toast("Selecciona una orden");
const J=window.jspdf&&window.jspdf.jsPDF,dl=window.claude&&claude.use?await claude.use("downloads"):{save:async({filename,data})=>{const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}};
if(!J)return toast("No se pudo cargar el generador de PDF. Revisa la conexión y recarga la página");if(!dl)return toast("La descarga no está disponible en esta vista");
try{const d=await armarPdfCliente(J,o);  // formato en js/pdf-cliente.js
await dl.save({filename:`Orden de trabajo ${o.n} Las Ureta.pdf`,data:d.output("blob")});toast("PDF del cliente generado")}catch(e){if(!e||e.code!=="declined")toast("No se pudo generar el PDF");console.error(e)}}

async function genPdf(){const tl=$("oTaller").value;if(!tl)return toast("Elige el taller");const sel=allOT().filter(o=>chosen.has(o.n));if(!sel.length)return toast("Selecciona al menos una orden");
const J=window.jspdf&&window.jspdf.jsPDF,dl=window.claude&&claude.use?await claude.use("downloads"):{save:async({filename,data})=>{const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}};
if(!J)return toast("No se pudo cargar el generador de PDF. Revisa la conexión y recarga la página");if(!dl)return toast("La descarga no está disponible en esta vista");
try{const d=new J({unit:"mm",format:"a4"}),W=210,M=15,CW=W-2*M,PH=297;let y=M;
const need=h=>{if(y+h>PH-M){d.addPage();y=M}};
const T=(x,size=11,bold=false,gap=1.5)=>{d.setFont("helvetica",bold?"bold":"normal");d.setFontSize(size);const lh=size*0.3528*1.3;d.splitTextToSize(String(x),CW).forEach(l=>{need(lh);d.text(l,M,y+size*0.3528);y+=lh});y+=gap};
const img=async(u,label)=>{u=fotoSrc(u);if(!u)return;const im=await new Promise(r=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>r(i);i.onerror=()=>r(null);i.src=u});if(!im)return;let w=Math.min(80,CW),h=w*im.naturalHeight/im.naturalWidth;if(h>75){h=75;w=h*im.naturalWidth/im.naturalHeight}need(h+9);T(label,10,true,0.5);d.addImage(/^data:/.test(u)?u:im,/^data:image\/png/.test(u)?"PNG":"JPEG",M,y,w,h);y+=h+4};
let first=true;
for(const o of sel){if(!first){d.addPage();y=M}first=false;
const ent=o.tipo==="rest"?(o.fecha?fd(new Date(o.fecha+"T12:00:00")):"Por definir"):(o.entTipo==="f"&&o.entFecha?fd(new Date(o.entFecha+"T12:00:00")):"2 a 3 semanas");
T(`Orden de trabajo N° ${o.n}`,18,true,3);T(`Taller: ${tl}`);if(o.vendedora)T(`Vendedora: ${o.vendedora}`);T(`Tipo: ${o.tipo==="rest"?"Restauración":"Enmarcación"}`);T(`Entrega: ${ent}`,11,false,3);if(o.desp&&!o.papel)T(`Despacho a domicilio: ${o.dir||""}`,11,false,3);
if(o.papel){T("Orden en papel"+(o.local?" · Local "+o.local:""),11,false,2);String(o.det||"").split("\n").filter(x=>x.trim()).forEach(l=>T(l));if(o.desp)T("Despacho a domicilio: "+(o.dir||""));y+=2;await img(o.ph&&o.ph[0],"Foto de la orden en papel")}else if(o.tipo==="rest"){T(`Objeto: ${o.obj} · Unidades: ${o.uni}`);T(`Observaciones: ${o.obs||"-"}`,11,false,3);for(const[k,u]of o.ph.entries())await img(u,`Foto ${k+1}`)}
else for(const[n,it]of o.items.entries()){const g=k=>(OPT[k][it.sel[["vidrio","paspa","fondo","montaje","java"].indexOf(k)]]||["-"])[0];
if(n)y+=4;need(30);T(it.nombre||"Sin nombre",14,true,1.5);
T(`Medidas de la obra: ${it.alto} x ${it.ancho} cm · Unidades: ${it.c.u}`);T(`Medida vidrio (MV): ${it.c.mvA} x ${it.c.mvW} cm`);{const mk=(it.mw||[]).reduce((a,x)=>a+(parseFloat(x)||0),0);T(`Medida final (con marco): ${fmtN(it.c.mvA+2*mk)} x ${fmtN(it.c.mvW+2*mk)} cm`)}T(`Márgenes (cm): superior ${it.m[0]}, inferior ${it.m[1]}, izquierdo ${it.m[2]}, derecho ${it.m[3]}`);if(it.blanco)T(blancoTxt(it));
T(`Moldura: ${it.molds.map((s,k)=>MOLD[s][0]+" "+MOLD[s][1]+colorM(it,k)).join(" + ")}`);T(`Vidrio: ${g("vidrio")} · Paspartú: ${g("paspa")} · Fondo: ${g("fondo")}`);T(`Montaje: ${g("montaje")} · Java: ${g("java")}`);
const ex=[it.chk[0]&&desmTxt(it),it.chk[1]&&("URGENTE"+(it.urgF?" para el "+fd(new Date(it.urgF+"T12:00:00")):"")),it.chk[2]&&"Conservación museo",it.chk[3]&&("Despacho a domicilio"+(it.dir?": "+it.dir:""))].filter(Boolean);if(ex.length)T(`Extras: ${ex.join(", ")}`);
T(`Observaciones: ${it.obs||"-"}`,11,false,2);await img(it.ph1,"Obra original");await img(it.ph2,"Muestra de moldura")}}
await dl.save({filename:`Ordenes taller ${tl} ${new Date().toISOString().slice(0,10)}.pdf`,data:d.output("blob")});sel.forEach(o=>{o.taller=tl;guardarOrden(o)});chosen.clear();ordList();toast("PDF para el taller generado")}catch(e){if(!e||e.code!=="declined")toast("No se pudo generar el PDF");console.error(e)}}
// Proveedor de vidrios, paspartú y fondos (tercer dato de cada opción, si es texto)
const PV={vidrio:OPT.vidrio.map((o,i)=>PROV_MAT.vidrio[i]||""),paspa:OPT.paspa.map(o=>o[2]||""),fondo:OPT.fondo.map(o=>o[2]||""),montaje:OPT.montaje.map((o,i)=>PROV_MAT.montaje[i]||"")};
const fq=n=>n.toFixed(2).replace(".",",");
function provLines(){const L=[];ots.forEach(o=>o.items.forEach((it,i)=>{const u=it.c.u,add=(k,prov,d,q,unit)=>{const opts=String(prov||"").split(" / ").map(x=>x.trim()).filter(Boolean);if(opts.length)L.push({o,key:i+"-"+k,opts,prov:null,d,q,unit,it})};it.molds.forEach((s,j)=>add("m"+j,MOLD[s][2],MOLD[s][0]+" · "+MOLD[s][1]+colorM(it,j),it.c.ml*u,"ML"));[["vidrio",0],["paspa",1],["fondo",2]].forEach(([k,n])=>add(k,PV[k][it.sel[n]],OPT[k][it.sel[n]][0],it.c.area*u,"m²"));{const mi=it.sel[3],mt=OPT.montaje[mi];if(mt&&PV.montaje[mi])add("montaje",PV.montaje[mi],mt[0].replace(/ \(.*\)/,""),(mt[2]==="ml"?it.c.ml:it.c.area)*u,mt[2]==="ml"?"ML":"m²")}}));
const pend=l=>!(l.o.ped||{})[l.key],cnt={};
L.forEach(l=>{const lk=(l.o.sup||{})[l.key];if(lk&&l.opts.includes(lk))l.prov=lk;else if(l.opts.length===1)l.prov=l.opts[0]});
L.filter(l=>l.prov&&pend(l)).forEach(l=>cnt[l.prov]=(cnt[l.prov]||0)+1);
L.filter(l=>!l.prov).forEach(l=>{let b=l.opts[0];l.opts.forEach(x=>{if((cnt[x]||0)>(cnt[b]||0))b=x});l.prov=b;if(pend(l))cnt[b]=(cnt[b]||0)+1});
return L}
// Estado de cada línea de pedido a proveedor: por pedir (rojo), pedido (amarillo), llegó al taller (verde)
const ESTP={pend:["rojo","Por pedir"],ped:["amarillo","Pedido"],lleg:["verde","Llegó al taller"]};
const estPed=l=>{const v=(l.o.ped||{})[l.key];return v==="lleg"?"lleg":v?"ped":"pend"};
function provRender(){const L=provLines().filter(l=>l.o.estado!=="Entregada"),g={};L.forEach(l=>(g[l.prov]=g[l.prov]||[]).push(l));
$("provList").innerHTML=Object.keys(g).sort().map(p=>{const ls=g[p],c={pend:0,ped:0,lleg:0};ls.forEach(l=>c[estPed(l)]++);
const s={};ls.filter(l=>estPed(l)==="pend").forEach(l=>{const k=l.d+"|"+l.unit;s[k]=(s[k]||0)+l.q});
const res=Object.keys(s).map(k=>{const[d,u]=k.split("|");return esc(d)+": <b>"+fq(s[k])+" "+u+"</b>"}).join(" · ");
const lin=Object.keys(s).map(k=>{const[d,unit]=k.split("|");return{d,unit,q:s[k]}}),tel=PROV_TEL[p],real=p!=="Por definir";
const peor=c.pend?"rojo":c.ped?"amarillo":"verde";
const chips=[c.pend&&`<span class="pchip rojo">${c.pend} por pedir</span>`,c.ped&&`<span class="pchip amarillo">${c.ped} pedido${c.ped>1?"s":""}</span>`,c.lleg&&`<span class="pchip verde">${c.lleg} en taller</span>`].filter(Boolean).join("");
return `<div class="card pcard ${peor}"><div class="phead"><h2>${esc(p)}</h2><div class="pchips">${chips}</div></div>`+
(res?`<p class="sub" style="margin-bottom:12px">Por pedir: ${res}</p>`:"")+
`<div class="pacc">${lin.length&&real?`<a class="btn p s" target="_blank" rel="noopener" data-wap="${esc(p)}" href="${esc(urlPedido(p,lin))}">Enviar pedido por WhatsApp</a><button class="btn s" type="button" data-pall="${esc(p)}" data-a="ped">Marcar todo como pedido</button>`:""}${c.ped?`<button class="btn s" type="button" data-pall="${esc(p)}" data-a="lleg">Marcar todo como llegado</button>`:""}${lin.length&&real&&!tel?`<small>Sin número guardado: WhatsApp te pedirá elegir el contacto.</small>`:""}</div>`+
ls.map(l=>{const e=estPed(l);return `<div class="pline ${e}"><i class="dot ${ESTP[e][0]}" aria-hidden="true"></i><span class="pdesc">${esc(l.d)} · <b>${fq(l.q)} ${l.unit}</b> <small>OT ${l.o.n} · ${esc(l.it.nombre||"Sin nombre")}</small></span>${l.opts.length>1?`<select class="psel" data-ps="${l.o.n}|${l.key}" aria-label="Proveedor">${l.opts.map(x=>`<option${x===l.prov?" selected":""}>${esc(x)}</option>`).join("")}</select>`:""}<select class="psel pest ${ESTP[e][0]}" data-pe="${l.o.n}|${l.key}" aria-label="Estado del pedido">${Object.keys(ESTP).map(k=>`<option value="${k}"${k===e?" selected":""}>${ESTP[k][1]}</option>`).join("")}</select></div>`}).join("")+`</div>`}).join("")||'<p class="empty">No hay pedidos. Aparecen cuando se confirma una orden de enmarcación.</p>';
const row=(a,b)=>`<div class="tr"><span>${esc(a)}</span><span style="color:var(--mute)">${esc(b||"—")}</span></div>`;
$("provCat").innerHTML="<h2>Molduras</h2>"+MOLD.map(m=>row(m[0]+" · "+m[1],m[2]||(HECHO_EN_TALLER.includes(m[1])?"Taller (no se pide)":""))).join("")+"<h2 style='margin-top:14px'>Vidrios</h2>"+OPT.vidrio.map((o,i)=>row(o[0],PV.vidrio[i])).join("")+"<h2 style='margin-top:14px'>Paspartú</h2>"+OPT.paspa.map((o,i)=>row(o[0],PV.paspa[i])).join("")+"<h2 style='margin-top:14px'>Montaje</h2>"+OPT.montaje.map((o,i)=>row(o[0],PV.montaje[i])).join("")}
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-wap]");if(a)toast("Cuando lo envíes, aprieta «Marcar todo como pedido»");
  const b=e.target.closest&&e.target.closest("[data-pall]");if(!b)return;const prov=b.dataset.pall,nuevo=b.dataset.a,desde=nuevo==="lleg"?"ped":"pend",cambiadas=new Set();
  provLines().filter(l=>l.prov===prov&&l.o.estado!=="Entregada"&&estPed(l)===desde).forEach(l=>{l.o.ped=l.o.ped||{};l.o.sup=l.o.sup||{};l.o.ped[l.key]=nuevo;l.o.sup[l.key]=prov;cambiadas.add(l.o)});
  cambiadas.forEach(o=>guardarOrden(o));provRender();toast(nuevo==="lleg"?`Pedido de ${prov} marcado como llegado`:`Pedido a ${prov} marcado como pedido`)});
document.addEventListener("change",e=>{const p=e.target.dataset.pe;if(p!==undefined){const[n,k]=p.split("|"),o=ots.find(x=>x.n==n),v=e.target.value;o.ped=o.ped||{};
  if(v==="pend")delete o.ped[k];else{o.ped[k]=v;const l=provLines().find(x=>x.o===o&&x.key===k);if(l){o.sup=o.sup||{};o.sup[k]=l.prov}}provRender();guardarOrden(o)}
const q=e.target.dataset.ps;if(q!==undefined){const[n,k]=q.split("|"),o=ots.find(x=>x.n==n);o.sup=o.sup||{};o.sup[k]=e.target.value;provRender();guardarOrden(o)}});
// ---- Envíos a domicilio: trabajos con despacho de órdenes que aún no se entregan
function envRender(){const g={};[...ots,...rests].forEach(o=>{if(o.desp&&estOf(o)!=="Entregada"){const k=o.n+"|"+(o.dir||"")+"|"+o.region;g[k]={o,dir:o.dir||"",region:o.region,its:o.papel?[{nombre:String(o.det||"").split("\n")[0]}]:[...(o.items||[])]}}});ots.forEach(o=>{if(estOf(o)==="Entregada"||o.papel)return;(o.items||[]).forEach(it=>{if(!(it.chk&&it.chk[3]))return;const k=o.n+"|"+(it.dir||"")+"|"+it.region;(g[k]=g[k]||{o,dir:it.dir||"",region:it.region,its:[]}).its.push(it)})});
const gs=Object.values(g).sort((a,b)=>(due(a.o)||0)-(due(b.o)||0)),lista=x=>estOf(x.o)==="Lista para retirar";
$("envCnt").textContent=gs.length?`(${gs.length})`:"";
const card=x=>{const zona=(REG[x.region]||[""])[0],q=encodeURIComponent(x.dir+(zona&&!/por ver/i.test(zona)&&!nrm(x.dir).includes(nrm(zona))?", "+zona:"")+", Chile"),d=due(x.o),atr=d&&Date.now()>d,ok=lista(x);
return `<div class="card ecard ${ok?"verde":"amarillo"}"><div class="phead"><h2>OT ${x.o.n}${x.o.nom?" · "+esc(x.o.nom):""}</h2><span class="pchip ${ok?"verde":"amarillo"}">${ok?"Listo para enviar":esc(estOf(x.o))}</span></div>
<div class="edat"><div><span class="elbl">Pago</span>${pagoTxt(x.o)}</div><div><span class="elbl">Dirección</span>${x.dir?`<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${esc(x.dir)}</a>`:"Sin dirección"}${zona?`<small>${esc(zona)}</small>`:""}</div><div><span class="elbl">Teléfono</span>${esc(x.o.tel||"—")}</div><div><span class="elbl">Entrega</span>${d?fd(d):"—"}${atr?` <small class="atr">Atrasada</small>`:""}</div></div>
<div class="eits">${x.its.map(it=>`<div>• ${esc(it.nombre||"Sin nombre")}${it.alto?` · ${it.alto} × ${it.ancho} cm`:""}${it.c&&it.c.u>1?` · ${it.c.u} unidades`:""}</div>`).join("")}</div>
<div class="pacc"><button class="btn s" type="button" data-eopen="${x.o.n}">Ver orden</button>${ok?`<button class="btn p s" type="button" data-eent="${x.o.n}">Marcar como entregada</button>`:""}</div></div>`};
const ls=gs.filter(lista),ot=gs.filter(x=>!lista(x));
$("envList").innerHTML=(ls.length?`<h2 class="esec">Listos para enviar · ${ls.length}</h2>`+ls.map(card).join(""):"")+(ot.length?`<h2 class="esec">En proceso · ${ot.length}</h2>`+ot.map(card).join(""):"")||'<p class="empty">No hay envíos pendientes. Aparecen aquí cuando un trabajo tiene «Despacho a domicilio».</p>'}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-eopen],[data-eent]");if(!t)return;
  if(t.dataset.eopen){const n=+t.dataset.eopen;location.hash="ordenes";setTimeout(()=>ordOpen(n),60)}
  else{setEstado(+t.dataset.eent,"Entregada");envRender()}});
// ---- Órdenes en papel: traspaso de órdenes antiguas con su número, fecha y montos originales
let papCur=null,papFoto=null;
fill("pEstado",ESTADOS);fill("pPago",["POS","Mercado Pago","Transferencia","Efectivo"],"Seleccionar");
$("pRegion").innerHTML='<option value="">Seleccionar zona…</option>'+REG.map((o,i)=>`<option value="${i}">${o[0]}</option>`).join("");
const hoyISO=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const PF={pN:"n",pTipo:"tipo",pLocal:"local",pRecep:"recep",pEntTipo:"entTipo",pEntFecha:"entFecha",pVend:"vendedora",pEstado:"estado",pTaller:"taller",pNom:"nom",pTel:"tel",pMail:"mail",pDet:"det",pRegion:"region",pDir:"dir",pTotal:"total",pAbono:"abono",pPago:"pago"};
function papSync(){$("pFechaBox").style.display=$("pEntTipo").value==="f"?"block":"none";$("pDespBox").style.display=$("pDesp").checked?"block":"none";const t=Math.max(0,parseFloat($("pTotal").value)||0),a=Math.max(0,parseFloat($("pAbono").value)||0);$("pSaldo").textContent=clp(Math.max(0,t-a-(papCur?sumaPagos(papCur):0)))}
function papFotoSet(u){const el=$("pph1"),o=el.querySelector("img");if(o)o.remove();if(u){const im=document.createElement("img");im.src=fotoSrc(u);im.alt="";el.appendChild(im)}}
function papLoad(o){papCur=o||null;for(const id in PF)$(id).value=o?(o[PF[id]]??""):"";
  if(!o){$("pTipo").value="enm";$("pEntTipo").value="s";$("pEstado").value="Recibida";$("pRecep").value=hoyISO()}
  $("pDesp").checked=!!(o&&o.desp);$("pUrg").checked=!!(o&&o.urgente);facCargar("p",o);papFoto=o&&o.ph?o.ph[0]||null:null;papFotoSet(papFoto);
  ["pN","pTipo","pEstado"].forEach(id=>$(id).disabled=!!o);
  $("pT").textContent=o?`Orden en papel N° ${o.n}`:"Orden en papel";$("pSave").textContent=o?"Guardar cambios":"Guardar orden";$("pBack").style.display=o?"none":"";$("pSub").style.display=o?"none":"";papSync()}
document.addEventListener("input",e=>{if(e.target.closest&&e.target.closest(".v-papel"))papSync()});
document.addEventListener("change",e=>{if(e.target.closest&&e.target.closest(".v-papel"))papSync();if(e.target.dataset&&e.target.dataset.pfoto&&e.target.files[0])shrink(e.target.files[0],u=>{papFoto=u;papFotoSet(u)})});
$("pSave").onclick=async()=>{if(guardando)return;const v=id=>$(id).value.trim(),n=parseInt(v("pN"),10);
  if(!papCur&&!(n>0))return toast("Escribe el número de la orden en papel");
  if(facFalta("p"))return toast("Escribe los datos de facturación");if(!papCur){await cargarOrdenes();if(allOT().some(x=>x.n===n))return toast(`Ya existe la orden N° ${n} en el portal`)}
  if(!v("pRecep"))return toast("Indica la fecha de recepción");
  if(!v("pNom")||!v("pTel"))return toast("Faltan el nombre y el teléfono del cliente");
  if(!v("pDet"))return toast("Escribe el detalle de la orden");
  if($("pEntTipo").value==="f"&&!v("pEntFecha"))return toast("Indica la fecha de entrega");
  if($("pDesp").checked&&!v("pDir"))return toast("Escribe la dirección de despacho");
  const o=papCur||{papel:true,hist:[],items:[]};
  for(const id in PF){if(papCur&&(id==="pN"||id==="pTipo"||id==="pEstado"))continue;o[PF[id]]=id==="pN"?n:$(id).value.trim()}
  o.desp=$("pDesp").checked;o.urgente=$("pUrg").checked;Object.assign(o,facDatos("p"));o.ph=[papFoto];o.creado=Date.parse(o.recep+"T12:00:00");
  if(o.tipo==="rest"){o.obj=o.det.split("\n")[0];o.obs=o.det;o.uni=o.uni||"1";o.precio=o.total;o.fecha=o.entTipo==="f"?o.entFecha:""}
  guardando=true;
  try{if(papCur){if(!await guardarOrden(o))return;toast("Orden actualizada");ordList();ordEst();ordHist();envRender()}
    else{toast("Guardando la orden…");await crearOrdenPapel(o);(o.tipo==="rest"?rests:ots).push(o);toast(`Orden en papel N° ${o.n} ingresada. Puedes ingresar la siguiente`);papLoad(null);scrollTo({top:0,behavior:"smooth"})}}
  catch(e){console.error(e);toast(e&&e.code==="23505"?`Ya existe la orden N° ${n} en el portal`:"No se pudo guardar. Revisa la conexión y vuelve a intentarlo")}
  finally{guardando=false}};
// ---- Factura: casilla y datos (enmarcación "o", restauración "r", orden en papel "p")
function facSync(){["o","r","p"].forEach(k=>{$(k+"FacBox").style.display=$(k+"Fac").checked?"block":"none"})}
function facDatos(k){const on=$(k+"Fac").checked;return{factura:on,facturaDatos:on?$(k+"FacDat").value.trim():""}}
function facCargar(k,o){$(k+"Fac").checked=!!(o&&o.factura);$(k+"FacDat").value=o&&o.factura?o.facturaDatos||"":"";facSync()}
const facFalta=k=>$(k+"Fac").checked&&!$(k+"FacDat").value.trim();
document.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.fac)facSync()});
// ---- Cambiar el número de una orden
$("oNum").onclick=async()=>{const o=allOT().find(x=>x.n===ordSel);if(!o)return;
  const v=prompt(`Nuevo número para la orden N° ${o.n}:`,o.n);if(v===null)return;const n=parseInt(String(v).replace(/\D/g,""),10);
  if(!(n>0))return toast("Ese número no es válido");if(n===o.n)return;
  await cargarOrdenes();if(allOT().some(x=>x.n===n))return toast(`Ya existe la orden N° ${n}`);
  const viejo=o.n,act=allOT().find(x=>x.n===viejo)||o;act.hist=act.hist||[];act.hist.push({de:`N° ${viejo}`,a:`N° ${n}`,t:Date.now(),por:nombreVend||usuaria});
  const {error}=await db.from("ordenes").update({n,...aFila(act)}).eq("n",viejo);
  if(error){console.error(error);return toast(error.code==="23505"?`Ya existe la orden N° ${n}`:"No se pudo cambiar el número. Revisa la conexión")}
  await cargarOrdenes();toast(`La orden N° ${viejo} ahora es la N° ${n}`);ordOpen(n)};
function route(){const h=location.hash.slice(1);if(lastV==="ordenes"&&h!=="ordenes"){papCur=null;if(rEd!==null)rLoad(null);if(otCur){otCur=null;otClear();$("otOk").textContent="Confirmar";$("otBack").style.display=""}}lastV=h;let v=h==="enmarcaciones"?h:TIT[h]?"otro":"menu";if(h==="nueva-orden"){if(!cart.length){location.hash="enmarcaciones";return}const urgente=cart.filter(x=>x.chk[1]&&x.urgF).map(x=>x.urgF).sort()[0];if(urgente&&!$("entFecha").value){$("entTipo").value="f";$("entFecha").value=urgente}v="ot";otRender()}if(h==="restauraciones"){v="rest";if(rEd===null)$("rN").textContent=""}if(h==="proveedores"){v="prov";provRender()}if(h==="envios"){v="envios";envRender()}if(h==="retiros"){v="retiros";retRender()}if(h==="presupuestos"){v="presupuestos";presRender()}if(h==="pendientes"){v="pendientes";pendRender()}if(h==="orden-papel"){v="papel";papLoad(null)}if(h==="ordenes"){v="ordenes";if(lastV!=="ordenes")ordSel=null;document.body.dataset.sel=ordSel===null?"":(allOT().find(x=>x.n===ordSel)||{}).tipo||"";ordList();ordEst();ordHist()}document.body.dataset.v=v;if(v==="otro")$("phT").textContent=TIT[h];scrollTo(0,0);if(["ordenes","proveedores","restauraciones"].includes(h)||["envios","retiros","presupuestos","pendientes"].includes(h))recargar(h)}
// Trae los cambios que hicieron las demás desde la base de datos
async function recargar(h){if(!await cargarOrdenes()||location.hash.slice(1)!==h)return;if(h==="proveedores")provRender();if(h==="restauraciones")rList();if(h==="ordenes"){ordList();ordEst();ordHist()}if(["ordenes","envios","retiros","presupuestos","pendientes"].includes(h)){envRender();retRender();pendRender()}}
// Inicio de sesión
async function arrancar(){
  if(!db){document.body.dataset.v="login";$("lErr").textContent="No se pudo cargar la conexión con la base de datos. Recarga la página.";return}
  const {data:{session}}=await db.auth.getSession();
  if(!session){document.body.dataset.v="login";return}
  usuaria=session.user.email;nombreVend=(session.user.user_metadata||{}).nombre||"";mostrarQuien();if(!nombreVend)pedirNombre();
  await cargarOrdenes();rList();addEventListener("hashchange",route);route();
}
$("loginForm").onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector("button");b.disabled=true;$("lErr").textContent="";
  const {error}=await db.auth.signInWithPassword({email:$("lMail").value.trim(),password:$("lPass").value});
  b.disabled=false;if(error){$("lErr").textContent=/invalid/i.test(error.message)?"Correo o contraseña incorrectos.":"No se pudo iniciar sesión: "+error.message;return}
  $("lPass").value="";arrancar()};
$("salir").onclick=cerrarSesion;
// Nombre de la vendedora: se pide una vez y queda guardado en su usuario
function mostrarQuien(){$("quien").textContent=nombreVend?`${nombreVend} (${usuaria})`:usuaria}
function pedirNombre(){$("nomIn").value=nombreVend;$("nomErr").textContent="";$("nomX").style.display=nombreVend?"":"none";$("nomDlg").showModal()}
$("cambiarNom").onclick=pedirNombre;
$("nomX").onclick=()=>$("nomDlg").close();
$("nomDlg").addEventListener("cancel",e=>{if(!nombreVend)e.preventDefault()});
$("nomForm").onsubmit=async e=>{e.preventDefault();const n=$("nomIn").value.trim().replace(/\s+/g," ");if(!n)return;const b=e.target.querySelector("button[type=submit]");b.disabled=true;
  const {error}=await db.auth.updateUser({data:{nombre:n}});b.disabled=false;
  if(error){console.error(error);$("nomErr").textContent="No se pudo guardar. Revisa la conexión y vuelve a intentarlo.";return}
  nombreVend=n;mostrarQuien();$("nomDlg").close();toast(`¡Hola, ${n}!`)};
arrancar();
