// Utilidades
const $=id=>document.getElementById(id);
const clp=n=>"$"+Math.round(n).toLocaleString("es-CL");
const colorM=(it,k)=>it.mc&&it.mc[k]?", color "+it.mc[k]:"";
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// Cotizador, órdenes, restauraciones y proveedores
for(const k in OPT){$(k).innerHTML='<option value="">Seleccionar…</option>'+OPT[k].map((o,i)=>`<option value="${i}">${o[0]}</option>`).join("")}
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
  const mt=OPT.montaje[$("montaje").value]||["",0,"fijo"],mp=mt[2]==="manual"?g("montajeManual"):mt[1];if(mp){const v=mt[2]==="ml"?ml*mp:mt[2]==="area"?area*mp:mp;sub+=v;L.push(["Montaje: "+mt[0].replace(/ \(.*\)/,"")+(mt[2]==="ml"?` (${ml.toFixed(2).replace(".",",")} ML)`:mt[2]==="area"?` (${area.toFixed(3).replace(".",",")} m²)`:""),v])}
  const ja=(OPT.java[$("java").value]||[0,0])[1];if(ja){sub+=ja;L.push(["Java",ja])}
  if($("desm").checked){sub+=DESM;L.push(["Desmontaje",DESM])}
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
  $("cart").innerHTML=cart.length?cart.map((it,i)=>`<div class="item"><div class="t"><span>${it.nombre||"Sin nombre"}</span><span>${clp(it.c.tot)}</span></div><div class="d">${it.alto}×${it.ancho} cm · ${it.c.u} u. · MV ${it.c.mvA}×${it.c.mvW}<br>${it.mn.join(" + ")} · ${it.mats.join(", ")}${it.ph1?" · 📷":""}</div><button class="btn s" data-e="${i}" type="button">Editar</button> <button class="btn s" data-d="${i}" type="button">Eliminar</button></div>`).join(""):'<p class="empty">Aún no hay trabajos. Completa el formulario y agrégalo.</p>';
  $("total").textContent=clp(cart.reduce((a,x)=>a+x.c.tot,0));
}
function snap(){
  const c=calc(),t=k=>(OPT[k][$(k).value]||["Sin"])[0];
  return{nombre:$("nombre").value,alto:$("alto").value,ancho:$("ancho").value,cant:$("cant").value,m:["mSup","mInf","mIzq","mDer"].map(i=>$(i).value),molds:molds.filter(s=>s>=0),mw:molds.map((s,i)=>s>=0?mw[i]:null).filter(x=>x!==null),mc:molds.map((s,i)=>s>=0?(mc[i]||""):null).filter(x=>x!==null),sel:["vidrio","paspa","fondo","montaje","java"].map(k=>$(k).value),chk:["desm","urg","museo","desp"].map(i=>$(i).checked),region:$("region").value,obs:$("obs").value,mn:molds.map((s,i)=>s>=0?MOLD[s][0]+(mc[i]?` (${mc[i]})`:""):null).filter(x=>x!==null),mats:[t("vidrio"),t("paspa"),t("fondo")].filter(x=>!x.startsWith("Sin")),ph1:photos[1],ph2:photos[2],mm:$("montajeManual").value,c};
}
function load(s){
  $("nombre").value=s.nombre;$("alto").value=s.alto;$("ancho").value=s.ancho;$("cant").value=s.cant;
  ["mSup","mInf","mIzq","mDer"].forEach((i,n)=>$(i).value=s.m[n]);$("mUni").value=s.m[0];$("mPers").checked=!s.m.every(x=>x==s.m[0]);syncM();
  ["vidrio","paspa","fondo","montaje","java"].forEach((k,n)=>$(k).value=s.sel[n]);
  ["desm","urg","museo","desp"].forEach((k,n)=>$(k).checked=s.chk[n]);
  $("region").value=s.region;$("obs").value=s.obs;$("montajeManual").value=s.mm||"";molds=s.molds.length?[...s.molds]:[-1];mw=molds.map((_,i)=>s.mw&&s.mw[i]!=null?String(s.mw[i]):"");mc=molds.map((_,i)=>s.mc&&s.mc[i]!=null?String(s.mc[i]):"");mq=molds.map(()=>"");photos={1:s.ph1,2:s.ph2};
  [1,2].forEach(p=>setPh(p,photos[p]));syncDesp();syncMM();renderMolds();refresh();
}
function setPh(p,url){const el=$("ph"+p);const old=el.querySelector("img");if(old)old.remove();if(url){const im=document.createElement("img");im.src=fotoSrc(url);im.alt="";el.appendChild(im)}}
function syncMM(){$("mmBox").style.display=(OPT.montaje[$("montaje").value]||[])[2]==="manual"?"block":"none"}
document.addEventListener("change",e=>{if(e.target.id==="montaje"){syncMM();refresh()}});
function syncDesp(){$("regionBox").style.display=$("desp").checked?"block":"none"}
function toast(t){const e=$("toast");e.textContent=t;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",2600)}
function reset(){load({nombre:"",alto:"",ancho:"",cant:1,m:["","","",""],molds:[-1],sel:["","","","",""],chk:[false,false,false,false],region:"",obs:"",ph1:null,ph2:null});editing=null;$("add").textContent="Agregar al carrito";$("cancel").style.display="none"}
document.addEventListener("change",e=>{if(e.target.classList)e.target.classList.remove("req")});
document.addEventListener("input",e=>{if(e.target.classList)e.target.classList.remove("req");const q=e.target.dataset.mq;if(q!==undefined){mq[+q]=e.target.value;fillRes(+q)}refresh()});
document.addEventListener("input",e=>{if(e.target.dataset.mw!==undefined){mw[+e.target.dataset.mw]=e.target.value;refresh()}if(e.target.dataset.mc!==undefined)mc[+e.target.dataset.mc]=e.target.value;});
document.addEventListener("change",e=>{if(e.target.dataset.m!==undefined){molds[+e.target.dataset.m]=+e.target.value}if(e.target.id==="desp")syncDesp();if(e.target.type==="file"&&e.target.dataset.p){const f=e.target.files[0],p=e.target.dataset.p;if(f)shrink(f,u=>{photos[p]=u;setPh(p,u)})}refresh()});
document.addEventListener("click",e=>{const d=e.target.dataset;
  if(d.pick!==undefined){const[a,b]=d.pick.split("|").map(Number);molds[a]=b;renderMolds();refresh()}
  if(d.chg!==undefined){molds[+d.chg]=-1;mw[+d.chg]="";mc[+d.chg]="";mq[+d.chg]="";renderMolds();refresh()}
  if(d.rm!==undefined){molds.splice(+d.rm,1);mw.splice(+d.rm,1);mc.splice(+d.rm,1);mq.splice(+d.rm,1);renderMolds();refresh()}
  if(d.e!==undefined){editing=+d.e;load(cart[editing]);$("add").textContent="Guardar cambios";$("cancel").style.display="inline-block";scrollTo({top:0,behavior:"smooth"})}
  if(d.d!==undefined){cart.splice(+d.d,1);renderCart();toast("Trabajo eliminado")}});
$("addMold").onclick=()=>{if(molds.length<3){molds.push(-1);mw.push("");mc.push("");mq.push("");renderMolds();refresh()}else toast("Máximo tres molduras por trabajo")};
$("add").onclick=()=>{if(!(parseFloat($("alto").value)>0&&parseFloat($("ancho").value)>0))return toast("Completa las medidas de la obra");if(!$("mPers").checked&&$("mUni").value==="")return toast("Indica el margen (puede ser 0)");if(!molds.some(s=>s>=0))return toast("Elige al menos una moldura");if(molds.some((s,i)=>s>=0&&!(parseFloat(mw[i])>0)))return toast("Indica el ancho de cada moldura");
const falta=[["vidrio","Vidrio"],["paspa","Paspartú"],["fondo","Fondo"],["montaje","Montaje"],["java","Java o embalaje"]].filter(([k])=>$(k).value==="");if($("desp").checked&&$("region").value==="")falta.push(["region","Zona de despacho"]);
if($("montaje").value!==""&&(OPT.montaje[$("montaje").value]||[])[2]==="manual"&&!(parseFloat($("montajeManual").value)>0))falta.push(["montajeManual","Precio del montaje de objetos"]);
if(falta.length){["vidrio","paspa","fondo","montaje","java","region","montajeManual"].forEach(k=>$(k).classList.remove("req"));falta.forEach(([k])=>$(k).classList.add("req"));$(falta[0][0]).focus();return toast("Falta elegir: "+falta.map(x=>x[1]).join(", "))}const s=snap();if(editing!==null){cart[editing]=s;toast("Trabajo actualizado")}else{cart.push(s);toast("Trabajo agregado")}renderCart();reset()};
$("cancel").onclick=reset;
$("draft").onclick=()=>toast(cart.length?"Borrador guardado":"Agrega al menos un trabajo");
$("ot").onclick=()=>{if(!cart.length)return toast("Agrega al menos un trabajo");$("dlgTxt").textContent=`Se creará una orden con ${cart.length} trabajo(s) por ${$("total").textContent}. En la versión final se genera el PDF del cliente y se pregunta si enviarlo por WhatsApp.`;$("dlg").showModal()};
$("dlg").addEventListener("close",async()=>{const ok=$("dlg").returnValue==="si";$("dlg").returnValue="";if(ok){if(guardando)return;guardando=true;const rec=otRec();toast("Guardando la orden…");try{await crearOrden(rec)}catch(e){console.error(e);return toast("No se pudo guardar la orden. Revisa la conexión y vuelve a intentarlo")}finally{guardando=false}ots.push(rec);toast(`Orden N° ${rec.n} confirmada`);cart=[];renderCart();reset();["cNom","cTel","cMail","entFecha","abono"].forEach(i=>$(i).value="");$("entTipo").value="s";$("como").value="";$("conv").value="No";$("dcto").value="";$("pago").value="";$("abonoTipo").value="";location.hash="menu";ofrecerEnvio(rec)}});
renderMolds();refresh();renderCart();
function syncM(){const p=$("mPers").checked;$("mGrid").style.display=p?"grid":"none";$("mUni").disabled=p;if(!p)["mSup","mInf","mIzq","mDer"].forEach(i=>$(i).value=$("mUni").value)}
document.addEventListener("input",e=>{if(e.target.id==="mUni"){syncM();refresh()}});
document.addEventListener("change",e=>{if(e.target.id==="mPers"){syncM();refresh()}});
const TIT={restauraciones:"Restauraciones",ordenes:"Órdenes de trabajo",proveedores:"Proveedores"};
let guardando=false;
const fill=(id,a,ph)=>{$(id).innerHTML=(ph?`<option value="">${ph}</option>`:"")+a.map(x=>`<option>${x}</option>`).join("")};
fill("como",["Boca a boca","Cliente","Google","ChatGPT","Instagram","TikTok","Pasando por el local"],"Seleccionar");
fill("conv",["No","Clases de arte","Art Stgo","Otro"]);
fill("pago",["POS","Mercado Pago","Transferencia","Efectivo"],"Seleccionar");
$("dcto").innerHTML='<option value="">Seleccionar</option>'+[5,7,10,15].map(p=>`<option value="${p}">${p} %</option>`).join("");
function otRender(){$("otN").textContent=otCur?"N° "+otCur.n:"(el número se asigna al confirmar)";$("otItems").innerHTML=otIt().map((it,i)=>`<div class="item"><div class="t"><span>${esc(it.nombre||"Sin nombre")}</span><span>${clp(it.c.tot)}</span></div><div class="d">${it.alto}×${it.ancho} cm · ${it.c.u} u. · MV ${it.c.mvA}×${it.c.mvW}<br>${esc(it.mn.join(" + "))} · ${esc(it.mats.join(", "))}</div>${it.ph1||it.ph2?`<div class="oph">${[[it.ph1,"Obra original",1],[it.ph2,"Muestra de moldura",2]].map(([u,l,k])=>u?`<figure><img src="${fotoSrc(u)}" alt="${l}" data-pi="${i}-${k}"><figcaption>${l}</figcaption></figure>`:"").join("")}</div>`:""}${otCur?it.molds.map((s,k)=>`<label>Moldura ${k+1}</label><select data-om="${i}-${k}">${MOLD.map((m,j)=>`<option value="${j}"${j===s?" selected":""}>${esc(m[0]+" · "+m[1])}</option>`).join("")}</select>`).join(""):""}<label for="o${i}">Observaciones ${esc(it.nombre||"")}</label><input type="text" id="o${i}" data-o="${i}" value="${esc(it.obs||"")}" placeholder="Detalles extra para este trabajo"></div>`).join("");otTot()}
function otTot(){const t=otIt().reduce((a,x)=>a+x.c.tot,0),cv=$("conv").value!=="No",pct=cv?+$("dcto").value||0:0,f=t*(1-pct/100),tp=$("abonoTipo").value,ab=(tp==="100"||tp==="50")?Math.round(f*+tp/100):tp==="v"?Math.max(0,parseFloat($("abono").value)||0):0;if(tp!=="v")$("abono").value=tp?ab:"";$("abono").readOnly=tp!=="v";$("dctoBox").style.display=cv?"block":"none";$("fechaBox").style.display=$("entTipo").value==="f"?"block":"none";$("otTotal").textContent=clp(t);$("rowDcto").style.display=pct?"flex":"none";$("otTotalD").textContent=clp(f);$("saldo").textContent=clp(Math.max(0,f-ab));if(document.activeElement!==$("saldoEd"))$("saldoEd").value=Math.max(0,Math.round(f-ab))}
function otF(){const t=otIt().reduce((a,x)=>a+x.c.tot,0),cv=$("conv").value!=="No",pct=cv?+$("dcto").value||0:0;return t*(1-pct/100)}
document.addEventListener("input",e=>{if(e.target.id!=="saldoEd")return;const f=otF();$("abonoTipo").value="v";$("abono").value=Math.max(0,Math.round(f-(parseFloat(e.target.value)||0)));otTot()});
document.addEventListener("input",e=>{const d=e.target.dataset;if(d.o!==undefined)otIt()[+d.o].obs=e.target.value;if(e.target.closest(".v-ot"))otTot()});
document.addEventListener("change",e=>{if(e.target.id==="abonoTipo"&&e.target.value==="v")$("abono").value="";if(e.target.closest(".v-ot"))otTot()});
$("ot").onclick=()=>{if(!cart.length)return toast("Agrega al menos un trabajo");location.hash="nueva-orden"};
$("otOk").onclick=()=>{if(!$("abonoTipo").value)return toast("Elige el abono: 100 %, 50 % o variable");if($("abonoTipo").value==="v"&&$("abono").value==="")return toast("Escribe el monto del abono");if(otCur){if(!$("cNom").value.trim()||!$("cTel").value.trim())return toast("Faltan el nombre y el teléfono del cliente");return otSave()}if(!$("cNom").value.trim()||!$("cTel").value.trim())return toast("Faltan el nombre y el teléfono del cliente");const m=$("cMail").value.trim();$("dlgTxt").textContent=`Se confirmará la orden por ${$("rowDcto").style.display==="flex"?$("otTotalD").textContent:$("otTotal").textContent}. Después podrás descargar el PDF y enviarlo por WhatsApp al ${$("cTel").value}.`;$("dlg").showModal()};
const RF={rNom:"nom",rTel:"tel",rMail:"mail",rObj:"obj",rUni:"uni",rObs:"obs",rPrecio:"precio",rAbono:"abono",rPago:"pago",rFecha:"fecha"};
let rests=[],rEd=null,rPh=[null,null,null];
fill("rPago",["POS","Mercado Pago","Transferencia","Efectivo"],"Seleccionar");
function rPhSet(i,u){const el=$("rph"+i),o=el.querySelector("img");if(o)o.remove();if(u){const im=document.createElement("img");im.src=fotoSrc(u);im.alt="";el.appendChild(im)}}
function rTot(){const p=Math.max(0,parseFloat($("rPrecio").value)||0),a=Math.max(0,parseFloat($("rAbono").value)||0);$("rSaldo").textContent=clp(Math.max(0,p-a))}
function rLoad(r){rEd=r?r.n:null;$("rN").textContent=r?"N° "+r.n:"";for(const id in RF)$(id).value=r?(r[RF[id]]??""):(id==="rUni"?1:"");rPh=r?[...r.ph]:[null,null,null];rPh.forEach((u,i)=>rPhSet(i+1,u));$("rCobro").style.display=r?"block":"none";$("rSave").textContent=r?"Guardar cambios":"Guardar orden";$("rNew").style.display=r?"inline-block":"none";rTot()}
function rList(){$("rLista").innerHTML=rests.length?rests.map(r=>`<div class="item"><div class="t"><span>N° ${r.n} · ${esc(r.nom)}</span><span>${r.precio?clp(+r.precio):"Por evaluar"}</span></div><div class="d">${esc(r.obj)} · ${esc(r.uni)} u.${r.precio?` · Saldo ${clp(Math.max(0,r.precio-(+r.abono||0)))}`:""}</div><button class="btn s" data-re="${r.n}" type="button">Editar</button></div>`).join(""):'<p class="empty">Aún no hay órdenes de restauración.</p>'}
$("rSave").onclick=async()=>{if(guardando)return;if(!$("rNom").value.trim()||!$("rTel").value.trim()||!$("rObj").value.trim())return toast("Faltan el nombre, el teléfono o el objeto");const r={tipo:"rest",vendedora:nombreVend,creado:Date.now(),taller:"",estado:"Recibida",hist:[]};for(const id in RF)r[RF[id]]=$(id).value;r.ph=[...rPh];if(rEd!==null){const o=rests.find(x=>x.n===rEd);r.creado=o.creado;r.taller=o.taller;r.estado=o.estado||"Recibida";r.hist=o.hist||[];r.avisado=o.avisado;r.vendedora=o.vendedora;r.n=rEd;guardando=true;const ok=await guardarOrden(r);guardando=false;if(!ok)return;rests[rests.indexOf(o)]=r;toast("Orden actualizada")}else{guardando=true;toast("Guardando la orden…");try{await crearOrden(r)}catch(e){console.error(e);return toast("No se pudo guardar la orden. Revisa la conexión y vuelve a intentarlo")}finally{guardando=false}rests.push(r);toast(`Orden N° ${r.n} guardada`);ofrecerEnvio(r)}if(document.body.dataset.v==="ordenes"){ordList();rLoad(rests.find(x=>x.n===r.n));ordEst()}else{rLoad(null);rList()}scrollTo({top:0,behavior:"smooth"})};
$("rNew").onclick=()=>rLoad(null);
document.addEventListener("input",e=>{if(e.target.id==="rPrecio"||e.target.id==="rAbono")rTot()});
document.addEventListener("change",e=>{const p=e.target.dataset.rp;if(p&&e.target.files[0]){shrink(e.target.files[0],u=>{rPh[p-1]=u;rPhSet(p,u)})}});
document.addEventListener("click",e=>{const n=e.target.dataset.re;if(n!==undefined){rLoad(rests.find(x=>x.n==n));scrollTo({top:0,behavior:"smooth"})}});
rLoad(null);rList();
const ots=[],chosen=new Set();let otCur=null,ordSel=null,lastV="";
const otIt=()=>otCur?otCur.items:cart;
const allOT=()=>[...ots,...rests].sort((a,b)=>a.n-b.n);
const fd=d=>d.toLocaleDateString("es-CL");
function due(o){if(o.tipo==="rest")return o.fecha?new Date(o.fecha+"T23:59:59"):null;if(o.entTipo==="f"&&o.entFecha)return new Date(o.entFecha+"T23:59:59");return new Date(o.creado+21*864e5)}
function est(o){if(o.estado==="Entregada")return["verde","Entregada"];const d=due(o);return d?(Date.now()>d?["rojo","Atrasada"]:["verde","A tiempo"]):["gris","Sin fecha de entrega"]}
function shrink(f,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1000/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.85))};im.onerror=()=>cb(r.result);im.src=r.result};r.readAsDataURL(f)}
function otRec(){return{tipo:"enm",nom:$("cNom").value.trim(),tel:$("cTel").value.trim(),mail:$("cMail").value.trim(),entTipo:$("entTipo").value,entFecha:$("entFecha").value,items:cart.map(x=>({...x})),como:$("como").value,conv:$("conv").value,dcto:$("dcto").value,pago:$("pago").value,abono:$("abono").value,abonoTipo:$("abonoTipo").value,vendedora:nombreVend,creado:Date.now(),taller:"",estado:"Recibida",hist:[]}}
function otClear(){["cNom","cTel","cMail","entFecha","abono"].forEach(i=>$(i).value="");$("entTipo").value="s";$("como").value="";$("conv").value="No";$("dcto").value="";$("pago").value="";$("abonoTipo").value=""}
function otLoad(o){otCur=o;$("cNom").value=o.nom;$("cTel").value=o.tel;$("cMail").value=o.mail;$("entTipo").value=o.entTipo;$("entFecha").value=o.entFecha;$("como").value=o.como;$("conv").value=o.conv;$("dcto").value=o.dcto;$("pago").value=o.pago;$("abonoTipo").value=o.abonoTipo||(o.abono?"v":"");$("abono").value=o.abono;$("otOk").textContent="Guardar cambios";$("otBack").style.display="none";otRender()}
async function otSave(){const o=otCur;o.nom=$("cNom").value.trim();o.tel=$("cTel").value.trim();o.mail=$("cMail").value.trim();o.entTipo=$("entTipo").value;o.entFecha=$("entFecha").value;o.como=$("como").value;o.conv=$("conv").value;o.dcto=$("dcto").value;o.pago=$("pago").value;o.abono=$("abono").value;o.abonoTipo=$("abonoTipo").value;if(!await guardarOrden(o))return;toast("Orden actualizada");ordList();ordEst()}
const ESTADOS=["Recibida","Enviada al taller","Devuelta al taller","Lista para retirar","Entregada"];
const estOf=o=>o.estado||"Recibida";
let pendEst=null;
const nrm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function otTxt(o){const parts=[];(function w(v){if(v==null)return;if(typeof v==="string"){if(!v.startsWith("data:"))parts.push(v)}else if(typeof v==="number")parts.push(String(v));else if(Array.isArray(v))v.forEach(w);else if(typeof v==="object")Object.entries(v).forEach(([k,x])=>{if(k!=="hist")w(x)})})(o);parts.push("OT "+o.n,o.tipo==="rest"?"restauracion":"enmarcacion",estOf(o));return nrm(parts.join(" "))}
function ordMatch(o){const q=nrm($("oQ").value).trim().split(/\s+/).filter(Boolean);if(!q.length)return true;const t=otTxt(o);return q.every(w=>t.includes(w))}
function ordList(){const L=allOT().filter(ordMatch);$("oList").innerHTML=L.map(o=>`<div class="orow${o.n===ordSel?" on":""}" data-os="${o.n}"><input type="checkbox" data-oc="${o.n}"${chosen.has(o.n)?" checked":""} aria-label="Elegir OT ${o.n}"><i class="dot ${est(o)[0]}"></i><span>OT ${o.n}${o.nom?" · "+esc(o.nom):""}<small>${o.tipo==="rest"?"Restauración":"Enmarcación"}${o.vendedora?" · Vendedora: "+esc(o.vendedora):""}${o.taller?" · Taller: "+esc(o.taller):""}</small></span><select class="estsel" data-es="${o.n}" aria-label="Estado de la OT ${o.n}">${ESTADOS.map(x=>`<option${x===estOf(o)?" selected":""}>${x}</option>`).join("")}</select></div>`).join("")||(allOT().length?'<p class="empty">Ninguna orden coincide con la búsqueda.</p>':'<p class="empty">Aún no hay órdenes.</p>');$("oCnt").textContent=chosen.size}
const fh=t=>new Date(t).toLocaleString("es-CL",{dateStyle:"short",timeStyle:"short"});
function ordHist(){const o=allOT().find(x=>x.n===ordSel);if(!o){$("oHist").innerHTML="";return}
$("oHist").innerHTML="<h2>Historial de estados</h2>"+[...(o.hist||[])].reverse().map(h=>`<div class="tr"><span>${esc(h.de)} → <b>${esc(h.a)}</b>${h.por?` <small style="color:var(--mute)">(${esc(h.por)})</small>`:""}</span><span style="color:var(--mute)">${fh(h.t)}</span></div>`).join("")+`<div class="tr"><span>Recibida (orden creada${o.vendedora?" por "+esc(o.vendedora):""})</span><span style="color:var(--mute)">${fh(o.creado)}</span></div>`+(o.avisado?`<div class="tr"><span>Aviso «lista para retirar» abierto en WhatsApp</span><span style="color:var(--mute)">${fh(o.avisado)}</span></div>`:"")}
function setEstado(n,nuevo){const o=allOT().find(x=>x.n===n),ant=estOf(o);if(!o||nuevo===ant){ordList();return}
const apply=()=>{o.hist=o.hist||[];o.hist.push({de:ant,a:nuevo,t:Date.now(),por:nombreVend||usuaria});o.estado=nuevo;ordList();ordEst();ordHist();guardarOrden(o);toast(`OT ${n}: ${nuevo}`)};
if(nuevo==="Lista para retirar"&&!o.avisado&&o.tel){pendEst={o,apply};$("waTxt").innerHTML=`Se abrirá WhatsApp para enviar este mensaje al <b>${esc(o.tel)}</b>:<br><br><i>${esc(textoWA("listo",o)).replace(/\n/g,"<br>")}</i>`;linkWA($("waGo"),o,"listo");$("waDlg").showModal();return}
apply();if(nuevo==="Lista para retirar"&&o.avisado)toast(`OT ${n}: ${nuevo}. Ya se había avisado al cliente`)}
$("waDlg").addEventListener("close",()=>{const v=$("waDlg").returnValue,p=pendEst;$("waDlg").returnValue="";pendEst=null;if(!p)return;if(v==="avisar"){p.o.avisado=Date.now();p.apply();toast("Revisa WhatsApp y aprieta Enviar")}else if(v==="solo")p.apply();else ordList()});
document.addEventListener("input",e=>{if(e.target.id==="oQ")ordList()});
function ordEst(){const o=allOT().find(x=>x.n===ordSel),e=o?est(o):null,d=o?due(o):null;$("oEst").className="est "+(e?e[0]:"");$("oEst").textContent=e?(o.estado==="Entregada"?"Entregada":estOf(o)+" · "+e[1]+(d?" · entrega "+(o.tipo==="enm"&&o.entTipo!=="f"?"hasta el ":"el ")+fd(d):"")):""}
function ordOpen(n){ordSel=n;$("oCliBox").style.display="block";const o=allOT().find(x=>x.n===n);document.body.dataset.sel=o.tipo;if(o.tipo==="rest")rLoad(o);else otLoad(o);ordList();ordEst();ordHist();scrollTo({top:0,behavior:"smooth"})}
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
T(`Orden de trabajo N° ${o.n}`,18,true,3);T(`Taller: ${tl}`);if(o.vendedora)T(`Vendedora: ${o.vendedora}`);T(`Tipo: ${o.tipo==="rest"?"Restauración":"Enmarcación"}`);T(`Entrega: ${ent}`,11,false,3);
if(o.tipo==="rest"){T(`Objeto: ${o.obj} · Unidades: ${o.uni}`);T(`Observaciones: ${o.obs||"-"}`,11,false,3);for(const[k,u]of o.ph.entries())await img(u,`Foto ${k+1}`)}
else for(const[n,it]of o.items.entries()){const g=k=>(OPT[k][it.sel[["vidrio","paspa","fondo","montaje","java"].indexOf(k)]]||["-"])[0];
if(n)y+=4;need(30);T(it.nombre||"Sin nombre",14,true,1.5);
T(`Medidas de la obra: ${it.alto} x ${it.ancho} cm · Unidades: ${it.c.u}`);T(`Medida vidrio (MV): ${it.c.mvA} x ${it.c.mvW} cm`);T(`Márgenes (cm): superior ${it.m[0]}, inferior ${it.m[1]}, izquierdo ${it.m[2]}, derecho ${it.m[3]}`);
T(`Moldura: ${it.molds.map((s,k)=>MOLD[s][0]+" "+MOLD[s][1]+colorM(it,k)).join(" + ")}`);T(`Vidrio: ${g("vidrio")} · Paspartú: ${g("paspa")} · Fondo: ${g("fondo")}`);T(`Montaje: ${g("montaje")} · Java: ${g("java")}`);
const ex=[it.chk[0]&&"Desmontaje",it.chk[1]&&"Urgencia",it.chk[2]&&"Conservación museo"].filter(Boolean);if(ex.length)T(`Extras: ${ex.join(", ")}`);
T(`Observaciones: ${it.obs||"-"}`,11,false,2);await img(it.ph1,"Obra original");await img(it.ph2,"Muestra de moldura")}}
await dl.save({filename:`Ordenes taller ${tl} ${new Date().toISOString().slice(0,10)}.pdf`,data:d.output("blob")});sel.forEach(o=>{o.taller=tl;guardarOrden(o)});chosen.clear();ordList();toast("PDF para el taller generado")}catch(e){if(!e||e.code!=="declined")toast("No se pudo generar el PDF");console.error(e)}}
const PV={vidrio:Array(8).fill(""),paspa:Array(4).fill(""),fondo:Array(4).fill("")};
const fq=n=>n.toFixed(2).replace(".",",");
function provLines(){const L=[];ots.forEach(o=>o.items.forEach((it,i)=>{const u=it.c.u,add=(k,prov,d,q,unit)=>{const opts=String(prov).split(" / ").map(x=>x.trim()).filter(Boolean);if(opts.length)L.push({o,key:i+"-"+k,opts,prov:null,d,q,unit,it})};it.molds.forEach((s,j)=>add("m"+j,MOLD[s][2],MOLD[s][0]+" · "+MOLD[s][1]+colorM(it,j),it.c.ml*u,"ML"));[["vidrio",0],["paspa",1],["fondo",2]].forEach(([k,n])=>add(k,PV[k][it.sel[n]],OPT[k][it.sel[n]][0],it.c.area*u,"m²"))}));
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
$("provCat").innerHTML="<h2>Molduras</h2>"+MOLD.map(m=>row(m[0]+" · "+m[1],m[2])).join("")+"<h2 style='margin-top:14px'>Vidrios</h2>"+OPT.vidrio.map((o,i)=>row(o[0],PV.vidrio[i])).join("")+"<h2 style='margin-top:14px'>Paspartú</h2>"+OPT.paspa.map((o,i)=>row(o[0],PV.paspa[i])).join("")}
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-wap]");if(a)toast("Cuando lo envíes, aprieta «Marcar todo como pedido»");
  const b=e.target.closest&&e.target.closest("[data-pall]");if(!b)return;const prov=b.dataset.pall,nuevo=b.dataset.a,desde=nuevo==="lleg"?"ped":"pend",cambiadas=new Set();
  provLines().filter(l=>l.prov===prov&&l.o.estado!=="Entregada"&&estPed(l)===desde).forEach(l=>{l.o.ped=l.o.ped||{};l.o.sup=l.o.sup||{};l.o.ped[l.key]=nuevo;l.o.sup[l.key]=prov;cambiadas.add(l.o)});
  cambiadas.forEach(o=>guardarOrden(o));provRender();toast(nuevo==="lleg"?`Pedido de ${prov} marcado como llegado`:`Pedido a ${prov} marcado como pedido`)});
document.addEventListener("change",e=>{const p=e.target.dataset.pe;if(p!==undefined){const[n,k]=p.split("|"),o=ots.find(x=>x.n==n),v=e.target.value;o.ped=o.ped||{};
  if(v==="pend")delete o.ped[k];else{o.ped[k]=v;const l=provLines().find(x=>x.o===o&&x.key===k);if(l){o.sup=o.sup||{};o.sup[k]=l.prov}}provRender();guardarOrden(o)}
const q=e.target.dataset.ps;if(q!==undefined){const[n,k]=q.split("|"),o=ots.find(x=>x.n==n);o.sup=o.sup||{};o.sup[k]=e.target.value;provRender();guardarOrden(o)}});
function route(){const h=location.hash.slice(1);if(lastV==="ordenes"&&h!=="ordenes"){if(rEd!==null)rLoad(null);if(otCur){otCur=null;otClear();$("otOk").textContent="Confirmar";$("otBack").style.display=""}}lastV=h;let v=h==="enmarcaciones"?h:TIT[h]?"otro":"menu";if(h==="nueva-orden"){if(!cart.length){location.hash="enmarcaciones";return}v="ot";otRender()}if(h==="restauraciones"){v="rest";if(rEd===null)$("rN").textContent=""}if(h==="proveedores"){v="prov";provRender()}if(h==="ordenes"){v="ordenes";document.body.dataset.sel=ordSel===null?"":(allOT().find(x=>x.n===ordSel)||{}).tipo||"";ordList();ordEst();ordHist()}document.body.dataset.v=v;if(v==="otro")$("phT").textContent=TIT[h];scrollTo(0,0);if(["ordenes","proveedores","restauraciones"].includes(h))recargar(h)}
// Trae los cambios que hicieron las demás desde la base de datos
async function recargar(h){if(!await cargarOrdenes()||location.hash.slice(1)!==h)return;if(h==="proveedores")provRender();if(h==="restauraciones")rList();if(h==="ordenes"){ordList();ordEst();ordHist()}}
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
