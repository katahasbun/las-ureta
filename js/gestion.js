// Gestión: pagos del saldo, recordatorios de retiro y presupuestos.
// Se carga después de app.js y usa sus funciones (allOT, guardarOrden, toast, etc.).
const DIA = 864e5;

// ============ Pagos del saldo ============
const sumaPagos = o => (o.pagos || []).reduce((a, p) => a + (+p.monto || 0), 0);

// Texto corto del estado de pago (para Envíos y Por retirar)
function pagoTxt(o) {
  const r = resumenOT(o);
  if (o.tipo === "rest" && !r.total) return "Sin precio aún";
  return r.saldo > 0 ? `<b class="atr">Saldo ${clp(r.saldo)}</b>` : "Pagado ✓";
}

function pagosRender() {
  const el = $("oPagos"), o = allOT().find(x => x.n === ordSel);
  if (!o) { el.innerHTML = ""; return; }
  const r = resumenOT(o), sinPrecio = o.tipo === "rest" && !r.total, inicial = r.ab - sumaPagos(o);
  if (sinPrecio) { el.innerHTML = '<h2>Pagos</h2><p class="sub" style="margin:0">Esta restauración aún no tiene precio.</p>'; return; }
  el.innerHTML = "<h2>Pagos</h2>"
    + `<div class="tr"><span>Total</span><b>${clp(r.total)}</b></div>`
    + (inicial > 0 ? `<div class="tr"><span>Abono inicial${o.pago ? " (" + esc(o.pago) + ")" : ""}</span><span>${clp(inicial)}</span></div>` : "")
    + (o.pagos || []).map(p => `<div class="tr"><span>Pago del ${fh(p.t)}${p.forma ? " · " + esc(p.forma) : ""}${p.por ? ` <small style="color:var(--mute)">(${esc(p.por)})</small>` : ""}</span><span>${clp(+p.monto)}</span></div>`).join("")
    + `<div class="tr big"><span>${r.saldo > 0 ? "Saldo pendiente" : "Pagada"}</span><span>${r.saldo > 0 ? clp(r.saldo) : "✓"}</span></div>`
    + (r.saldo > 0 ? `<div class="grid pagoform"><div><label for="pgMonto">Monto pagado ($)</label><input type="number" id="pgMonto" min="0" value="${Math.round(r.saldo)}"></div>`
      + `<div><label for="pgForma">Forma de pago</label><select id="pgForma"><option value="">Seleccionar</option>${["POS", "Mercado Pago", "Transferencia", "Efectivo"].map(f => `<option>${f}</option>`).join("")}</select></div>`
      + `<div style="align-self:end"><button class="btn p" id="pgOk" type="button">Registrar pago</button></div></div>` : "");
}

document.addEventListener("click", async e => {
  if (e.target.id !== "pgOk" || guardando) return;
  const o = allOT().find(x => x.n === ordSel); if (!o) return;
  const monto = Math.round(parseFloat($("pgMonto").value) || 0), forma = $("pgForma").value;
  if (!(monto > 0)) return toast("Escribe el monto pagado");
  if (!forma) return toast("Elige la forma de pago");
  o.pagos = o.pagos || [];
  o.pagos.push({ t: Date.now(), monto, forma, por: nombreVend || usuaria });
  guardando = true; const ok = await guardarOrden(o); guardando = false;
  if (!ok) { o.pagos.pop(); return; }
  toast(resumenOT(o).saldo > 0 ? `Pago de ${clp(monto)} registrado` : "¡Orden pagada por completo!");
  pagosRender(); ordList(); ordEst();
  if (otCur && otCur.n === o.n) otTot();
  if (rEd === o.n) rTot();
  if (papCur && papCur.n === o.n) papSync();
});

// ============ Por retirar: recordatorios cada 2 semanas ============
const DIAS_RECORDAR = 14;
// Momento en que la orden quedó lista para retirar
function listaDesde(o) {
  const h = [...(o.hist || [])].reverse().find(x => x.a === "Lista para retirar");
  return h ? h.t : (o.avisado || o.creado);
}
const ultimoAviso = o => Math.max(o.avisado || 0, ...(o.recordatorios || [])) || null;
const tocaRecordar = o => Date.now() - (ultimoAviso(o) || listaDesde(o)) >= DIAS_RECORDAR * DIA;

function retRender() {
  const L = allOT().filter(o => estOf(o) === "Lista para retirar").sort((a, b) => listaDesde(a) - listaDesde(b));
  const toca = L.filter(tocaRecordar);
  $("retCnt").textContent = L.length ? `(${L.length}${toca.length ? ` · ${toca.length} por recordar` : ""})` : "";
  $("retList").innerHTML = L.map(o => {
    const dias = Math.floor((Date.now() - listaDesde(o)) / DIA), u = ultimoAviso(o), t = tocaRecordar(o), n = (o.recordatorios || []).length, url = urlWA(o, "recordatorio");
    return `<div class="card ecard ${t ? "rojo" : "verde"}"><div class="phead"><h2>OT ${o.n}${o.nom ? " · " + esc(o.nom) : ""}</h2><span class="pchip ${t ? "rojo" : "verde"}">${t ? "Toca recordar" : "Al día"}</span></div>
<div class="edat"><div><span class="elbl">Lista hace</span>${dias} día${dias === 1 ? "" : "s"}<small>desde el ${fd(new Date(listaDesde(o)))}</small></div><div><span class="elbl">Último aviso</span>${u ? fd(new Date(u)) : "Sin aviso"}<small>${n} recordatorio${n === 1 ? "" : "s"}</small></div><div><span class="elbl">Pago</span>${pagoTxt(o)}</div></div>
<div class="pacc"><button class="btn s" type="button" data-eopen="${o.n}">Ver orden</button>${url ? `<a class="btn s${t ? " p" : ""}" target="_blank" rel="noopener" href="${esc(url)}" data-rec="${o.n}">Enviar recordatorio por WhatsApp</a>` : "<small>Sin teléfono válido</small>"}</div></div>`;
  }).join("") || '<p class="empty">No hay órdenes listas para retirar.</p>';
}

document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("[data-rec]"); if (!a) return;
  const o = allOT().find(x => x.n === +a.dataset.rec); if (!o) return;
  o.recordatorios = o.recordatorios || [];
  o.recordatorios.push(Date.now());
  guardarOrden(o);
  toast("Revisa WhatsApp y aprieta Enviar");
  setTimeout(retRender, 300);
});

// ============ Presupuestos ============
let presLista = [], presAct = null, presEnvAct = null;

$("draft").onclick = () => {
  if (!cart.length) return toast("Agrega al menos un trabajo");
  $("prNom").value = presAct ? presAct.nom || "" : ""; $("prTel").value = presAct ? presAct.tel || "" : ""; $("prMail").value = presAct ? presAct.mail || "" : "";
  $("presDlg").showModal();
};
$("prX").onclick = () => $("presDlg").close();

$("presForm").onsubmit = async e => {
  e.preventDefault(); if (guardando) return;
  const nom = $("prNom").value.trim(); if (!nom) return;
  const p = { tipo: "enm", nom, tel: $("prTel").value.trim(), mail: $("prMail").value.trim(), items: cart.map(x => ({ ...x })), conv: "No", abono: "", vendedora: nombreVend, creado: Date.now(), vence: Date.now() + 30 * DIA };
  const b = e.target.querySelector("button[type=submit]"); b.disabled = true; guardando = true;
  try { await crearPresupuesto(p); }
  catch (err) { console.error(err); return toast(/presupuestos|PGRST205|42P01/.test(JSON.stringify(err)) ? "Falta activar los presupuestos en Supabase (supabase/presupuestos.sql)" : "No se pudo guardar el presupuesto. Revisa la conexión"); }
  finally { b.disabled = false; guardando = false; }
  $("presDlg").close(); presLista.unshift(p); presAct = p;
  toast(`Presupuesto P-${p.id} guardado`); presEnviar(p);
};

function presEnviar(p) {
  presEnvAct = p;
  $("peT").textContent = `Presupuesto P-${p.id}`;
  const url = urlWA(p, "presupuesto");
  $("peWa").href = url || "#"; $("peWa").dataset.sinTel = url ? "" : "1";
  $("presEnvDlg").showModal();
}
$("pePdf").onclick = () => presPdf(presEnvAct);
$("peWa").onclick = e => { if (e.currentTarget.dataset.sinTel) { e.preventDefault(); return toast("Falta un teléfono válido para enviarlo por WhatsApp"); } toast("Adjunta el PDF en el chat y aprieta Enviar"); };
$("peX").onclick = () => $("presEnvDlg").close();

async function presPdf(p) {
  const J = window.jspdf && window.jspdf.jsPDF;
  if (!J) return toast("No se pudo cargar el generador de PDF. Recarga la página");
  try {
    const d = await armarPdfCliente(J, p, { presupuesto: true });
    const a = document.createElement("a"); a.href = URL.createObjectURL(d.output("blob")); a.download = `Presupuesto P-${p.id} Las Ureta.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast("PDF del presupuesto generado");
  } catch (e) { console.error(e); toast("No se pudo generar el PDF"); }
}

// Al confirmar una orden que vino de un presupuesto, el presupuesto queda como aceptado
function presAceptado(rec) {
  if (!presAct) return;
  presAct.estado = "Aceptado"; presAct.ot = rec.n; guardarPresupuesto(presAct); presAct = null;
}

function presRetomar(p) {
  if (cart.length && !confirm("El carrito tiene trabajos. ¿Reemplazarlos por los del presupuesto?")) return;
  cart = p.items.map(x => ({ ...x })); renderCart(); presAct = p;
  $("cNom").value = p.nom || ""; $("cTel").value = p.tel || ""; $("cMail").value = p.mail || "";
  location.hash = "enmarcaciones"; toast(`Presupuesto P-${p.id} cargado en el carrito`);
}

function presPintar() {
  const vigente = p => p.estado === "Pendiente" && Date.now() <= p.vence, nv = presLista.filter(vigente).length;
  $("presCnt").textContent = nv ? `(${nv})` : "";
  $("presList").innerHTML = presLista.map(p => {
    const venc = p.estado === "Pendiente" && Date.now() > p.vence, url = urlWA(p, "presupuesto"), ok = p.estado === "Aceptado";
    return `<div class="card ecard ${ok ? "verde" : venc ? "gris" : "amarillo"}"><div class="phead"><h2>P-${p.id}${p.nom ? " · " + esc(p.nom) : ""}</h2><span class="pchip ${ok ? "verde" : venc ? "rojo" : "amarillo"}">${ok ? "Aceptado" + (p.ot ? " · OT " + p.ot : "") : venc ? "Vencido" : "Pendiente"}</span></div>
<div class="edat"><div><span class="elbl">Trabajos</span>${(p.items || []).map(it => esc(it.nombre || "Sin nombre")).join(", ")}</div><div><span class="elbl">Total</span>${clp(resumenOT(p).total)}</div><div><span class="elbl">Válido hasta</span>${fd(new Date(p.vence))}<small>Hecho el ${fd(new Date(p.creado))}${p.vendedora ? " · " + esc(p.vendedora) : ""}</small></div></div>
<div class="pacc">${ok ? "" : `<button class="btn p s" type="button" data-pret="${p.id}">Retomar</button>`}<button class="btn s" type="button" data-ppdf="${p.id}">Descargar PDF</button>${url ? `<a class="btn s" target="_blank" rel="noopener" href="${esc(url)}">Enviar por WhatsApp</a>` : ""}</div></div>`;
  }).join("") || '<p class="empty">Aún no hay presupuestos. Se crean desde el cotizador con el botón «Presupuesto».</p>';
}

async function presRender() {
  presPintar();
  const L = await cargarPresupuestos();
  if (L === null) { $("presList").innerHTML = '<p class="empty">Los presupuestos aún no están activados: hay que pegar el código de <b>supabase/presupuestos.sql</b> en el SQL Editor de Supabase.</p>'; return; }
  presLista = L; if (location.hash.slice(1) === "presupuestos") presPintar(); else $("presCnt").textContent = L.filter(p => p.estado === "Pendiente" && Date.now() <= p.vence).length ? `(${L.filter(p => p.estado === "Pendiente" && Date.now() <= p.vence).length})` : "";
}

document.addEventListener("click", e => {
  const r = e.target.closest && e.target.closest("[data-pret],[data-ppdf]"); if (!r) return;
  const p = presLista.find(x => x.id === +(r.dataset.pret || r.dataset.ppdf)); if (!p) return;
  if (r.dataset.pret) presRetomar(p); else presPdf(p);
});

// ============ Urgentes ============
// Una orden es urgente si algún trabajo tiene "Urgencia" o si se marcó como urgente (orden en papel)
const esUrgente = o => estOf(o) !== "Entregada" && (!!o.urgente || (o.items || []).some(it => it.chk && it.chk[1]));

// ============ Pendientes (notas por OT) ============
const pendAbiertosDe = o => (o.pendientes || []).filter(p => !p.hecho).length;

function pendRender() {
  const todos = allOT().flatMap(o => (o.pendientes || []).map(p => ({ o, p }))).sort((a, b) => b.p.t - a.p.t);
  const abiertos = todos.filter(x => !x.p.hecho), hechos = todos.filter(x => x.p.hecho);
  $("pendCnt").textContent = abiertos.length ? `(${abiertos.length})` : "";
  const card = ({ o, p }) => `<div class="card ecard ${p.hecho ? "verde" : esUrgente(o) ? "morado" : "amarillo"} pend" data-pid="${p.id}" data-pot="${o.n}">
<div class="phead"><h2>OT ${o.n}${o.nom ? " · " + esc(o.nom) : ""}</h2><span class="pchip ${p.hecho ? "verde" : "amarillo"}">${p.hecho ? "Resuelto" : "Pendiente"}</span></div>
<textarea class="pendtx" rows="3" aria-label="Pendiente de la OT ${o.n}"${p.hecho ? " readonly" : ""}>${esc(p.texto)}</textarea>
<small class="pendmeta">${fh(p.t)}${p.por ? " · " + esc(p.por) : ""}${p.hecho && p.hechoT ? ` · resuelto el ${fh(p.hechoT)}${p.hechoPor ? " (" + esc(p.hechoPor) + ")" : ""}` : ""}</small>
<div class="pacc"><button class="btn s" type="button" data-eopen="${o.n}">Ver orden</button><button class="btn s${p.hecho ? "" : " p"}" type="button" data-phecho="1">${p.hecho ? "Volver a abrir" : "Marcar como resuelto"}</button></div></div>`;
  $("pendList").innerHTML = (abiertos.length ? abiertos.map(card).join("") : '<p class="empty">No hay pendientes abiertos.</p>')
    + (hechos.length ? `<details class="pendhechos"><summary>Resueltos (${hechos.length})</summary>${hechos.map(card).join("")}</details>` : "");
}

const pendDe = el => { const c = el.closest(".pend"); if (!c) return {}; const o = allOT().find(x => x.n === +c.dataset.pot); return { o, p: o && (o.pendientes || []).find(x => x.id === c.dataset.pid) }; };

$("pdAdd").onclick = async () => {
  if (guardando) return;
  const n = parseInt($("pdOT").value, 10), texto = $("pdTx").value.trim();
  if (!(n > 0)) return toast("Escribe el número de la OT");
  if (!texto) return toast("Escribe el pendiente");
  let o = allOT().find(x => x.n === n);
  if (!o) { await cargarOrdenes(); o = allOT().find(x => x.n === n); }
  if (!o) return toast(`No existe la OT N° ${n} en el portal`);
  o.pendientes = o.pendientes || [];
  const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), texto, por: nombreVend || usuaria };
  o.pendientes.push(p);
  guardando = true; const ok = await guardarOrden(o); guardando = false;
  if (!ok) { o.pendientes.pop(); return; }
  $("pdOT").value = ""; $("pdTx").value = ""; toast(`Pendiente agregado a la OT ${n}`); pendRender(); ordList();
};

// Editar el texto: se guarda al salir de la caja
document.addEventListener("change", async e => {
  if (!e.target.classList || !e.target.classList.contains("pendtx")) return;
  const { o, p } = pendDe(e.target); if (!p) return;
  const nuevo = e.target.value.trim(); if (!nuevo || nuevo === p.texto) return;
  p.texto = nuevo; p.editado = Date.now();
  if (await guardarOrden(o)) toast("Pendiente guardado");
});

document.addEventListener("click", async e => {
  const b = e.target.closest && e.target.closest("[data-phecho]"); if (!b) return;
  const { o, p } = pendDe(b); if (!p) return;
  p.hecho = !p.hecho; p.hechoT = p.hecho ? Date.now() : null; p.hechoPor = p.hecho ? (nombreVend || usuaria) : null;
  if (await guardarOrden(o)) { toast(p.hecho ? "Pendiente resuelto" : "Pendiente abierto de nuevo"); pendRender(); ordList(); }
});
