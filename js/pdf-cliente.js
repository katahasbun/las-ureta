// Orden de trabajo para el cliente (PDF), con el formato de la orden de papel de Las Ureta:
// contacto con íconos, logo al centro, campos grises redondeados, detalle en líneas,
// aviso de retiro y la fila "Atendido por · Total · Abono · Saldo".

// Íconos (trazos SVG) que se convierten a imagen para el PDF
const ICONOS_PDF = {
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  fono: '<path d="M5 4h3l1.6 4-2 1.3a11 11 0 0 0 7.1 7.1l1.3-2 4 1.6v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  wa: '<path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 19z"/><path d="M9.2 8.6c.2 3 3.2 6 6.2 6.2l1-1.5-2-1-.9.8a4.6 4.6 0 0 1-2.6-2.6l.8-.9-1-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
  tt: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.2 4.3 5 4.6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.2"/>',
};

async function svgPng(trazos, px = 72, color = "#5a5a5a") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${trazos}</svg>`;
  const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
  if (!im) return null;
  const c = document.createElement("canvas"); c.width = c.height = px;
  c.getContext("2d").drawImage(im, 0, 0, px, px);
  return c.toDataURL("image/png");
}

async function armarPdfCliente(J, o, opts = {}) {
  const pres = !!opts.presupuesto;  // presupuesto: sin abono/saldo, con fotos y vigencia
  const d = new J({ unit: "mm", format: "a4" }), W = 210, PH = 297, M = 14, CW = W - 2 * M;
  const GRIS = [234, 234, 234], TXT = [40, 40, 40], LBL = [140, 140, 140], LIN = [208, 208, 208], SUAVE = [95, 95, 95];
  const $$ = n => "$" + Math.round(n).toLocaleString("es-CL");
  const font = (sz, st = "normal", c = TXT) => { d.setFont("helvetica", st); d.setFontSize(sz); d.setTextColor(c[0], c[1], c[2]); };
  const pill = (x, y, w, h = 7) => { d.setFillColor(GRIS[0], GRIS[1], GRIS[2]); d.roundedRect(x, y, w, h, h / 2, h / 2, "F"); };
  const recorta = (v, max) => { v = String(v || ""); while (v && d.getTextWidth(v) > max) v = v.slice(0, -1); return v; };
  const campo = (x, y, w, etiqueta, valor) => {
    pill(x, y, w);
    font(8, "normal", LBL); d.text(etiqueta, x + 4, y + 4.7);
    const lw = d.getTextWidth(etiqueta) + 2.5;
    font(9.5); d.text(recorta(valor, w - 8 - lw), x + 4 + lw, y + 4.8);
  };

  const ic = {};
  for (const k in ICONOS_PDF) ic[k] = await svgPng(ICONOS_PDF[k], 72, k === "info" ? "#8c8c8c" : "#5a5a5a");

  // ---- Encabezado: contacto (izquierda), logo (centro), número de orden (derecha)
  const C = typeof CONTACTO !== "undefined" ? CONTACTO : {};
  const contacto = [["web", C.web], ...(C.telefonos || []).map(t => ["fono", t]), ["wa", C.whatsapp], ["mail", C.correo], ["ig", C.instagram], ["tt", C.tiktok], ["pin", C.direccion]].filter(x => x[1]);
  let cy = 13;
  font(7.5, "normal", SUAVE);
  for (const [k, v] of contacto) {
    d.text(String(v), 66, cy, { align: "right" });
    if (ic[k]) d.addImage(ic[k], "PNG", 68.5, cy - 2.9, 3.6, 3.6);
    cy += 4.4;
  }
  const logo = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = "img/logo.png"; });
  if (logo) { const h = 23; d.addImage(logo, "PNG", 84, 12, h * logo.naturalWidth / logo.naturalHeight, h); }
  else { font(26, "normal", TXT); d.text("LAS URETA", 84, 28); }
  font(9, "normal", LBL); d.text(pres ? "Presupuesto" : "Orden de Trabajo", W - M, 15, { align: "right" });
  campo(146, 24, W - M - 146, "N°", pres ? "P-" + o.id : o.n);
  font(7.5, "normal", LBL); d.text(o.tipo === "rest" ? "RESTAURACIÓN" : "ENMARCACIÓN", W - M - 3, 37, { align: "right" });

  // ---- Datos del cliente
  const ent = typeof entregaTxt === "function" ? entregaTxt(o).replace(/^el /, "") : "";
  const mitad = (CW - 3) / 2, y0 = 45;
  campo(M, y0, 124, "Nombre", o.nom);
  campo(M + 127, y0, CW - 127, "Fono", o.tel);
  campo(M, y0 + 9, mitad, pres ? "Fecha" : "Recepción", fd(new Date(o.creado)));
  if (pres) campo(M + mitad + 3, y0 + 9, mitad, "Válido hasta", fd(new Date(o.vence)));
  else campo(M + mitad + 3, y0 + 9, mitad, "Entrega", ent ? ent.charAt(0).toUpperCase() + ent.slice(1) : "");
  campo(M, y0 + 18, CW, "Correo", o.mail);
  if (pres) campo(M, y0 + 27, CW, "Atendido por", o.vendedora);
  else if (o.tipo === "rest") campo(M, y0 + 27, CW, "Forma de pago", o.pago);
  else campo(M, y0 + 27, CW, "¿Dónde nos conociste?", o.como);

  // ---- Detalle en líneas (como el cuaderno de la orden de papel)
  font(8.5, "normal", LBL); d.text("Detalle", M + 4, y0 + 41);
  const filas = [];
  const fila = (t, r, neg) => filas.push({ t, r, neg });
  if (o.papel) {
    String(o.det || "").split("\n").map(x => x.trim()).filter(Boolean).forEach((l, i) => fila(l, i === 0 && +o.total ? $$(+o.total) : "", i === 0));
  } else if (o.tipo === "rest") {
    fila(`${o.obj || "Obra"} · ${o.uni || 1} ${+o.uni > 1 ? "unidades" : "unidad"}`, +o.precio ? $$(+o.precio) : "Por evaluar", true);
    if (o.obs) fila("Observaciones: " + o.obs);
  } else {
    const keys = ["vidrio", "paspa", "fondo", "montaje", "java"];
    for (const it of o.items || []) {
      const g = k => (OPT[k][it.sel[keys.indexOf(k)]] || ["Sin"])[0];
      fila(`${it.nombre || "Trabajo"} · ${it.alto} × ${it.ancho} cm${it.c.u > 1 ? ` · ${it.c.u} unidades` : ""}`, $$(it.c.tot), true);
      {
        const m = (it.m || []).map(x => parseFloat(x) || 0), c = it.c || {};
        const marco = (it.mw || []).reduce((a, x) => a + (parseFloat(x) || 0), 0);
        const mg = m.every(x => x === m[0]) ? `${fmtN(m[0])} cm` : `sup. ${fmtN(m[0])}, inf. ${fmtN(m[1])}, izq. ${fmtN(m[2])}, der. ${fmtN(m[3])} cm`;
        fila(`Margen: ${mg} · Medida vidrio: ${fmtN(c.mvA)} × ${fmtN(c.mvW)} cm · Medida final (con marco): ${fmtN(c.mvA + 2 * marco)} × ${fmtN(c.mvW + 2 * marco)} cm`);
      }
      fila("Moldura: " + it.molds.map((s, k) => MOLD[s][0] + colorM(it, k)).join(" + "));
      const mats = [["Vidrio", g("vidrio")], ["Paspartú", g("paspa")], ["Fondo", g("fondo")], ["Montaje", g("montaje")], ["Java", g("java")]].filter(x => !/^Sin/.test(x[1]));
      if (mats.length) fila(mats.map(x => x[0] + ": " + x[1]).join(" · "));
      if (it.blanco) fila(blancoTxt(it));
      const ex = [it.chk[0] && desmTxt(it), it.chk[1] && ("Urgencia" + (it.urgF ? " (para el " + fd(new Date(it.urgF + "T12:00:00")) + ")" : "")), it.chk[2] && "Conservación museo", it.chk[3] && ("Despacho a domicilio" + (it.dir ? ": " + it.dir : ""))].filter(Boolean);
      if (ex.length) fila("Extras: " + ex.join(", "));
      if (it.obs) fila("Observaciones: " + it.obs);
    }
    if (o.desp) { const z = (REG[o.region] || [""])[0]; fila("Despacho a domicilio: " + (o.dir || "") + (z ? " (" + z + ")" : ""), +o.despCosto ? $$(+o.despCosto) : "", true); }
  }
  if (o.factura) fila("Factura: " + String(o.facturaDatos || "").split("\n").map(x => x.trim()).filter(Boolean).join(" · "), "", true);
  const LH = 7, pieArriba = PH - 46;
  let y = y0 + 44;
  const raya = () => { d.setDrawColor(LIN[0], LIN[1], LIN[2]); d.setLineWidth(0.25); d.line(M, y + LH, W - M, y + LH); };
  for (const f of filas) {
    font(f.neg ? 10 : 9, f.neg ? "bold" : "normal", f.neg ? TXT : SUAVE);
    const partes = d.splitTextToSize(f.t, CW - 8 - (f.r ? 32 : 0));
    partes.forEach((p, i) => {
      if (y + LH > pieArriba) { d.addPage(); y = M + 4; }
      font(f.neg ? 10 : 9, f.neg ? "bold" : "normal", f.neg ? TXT : SUAVE);
      d.text(p, M + 4, y + 5);
      if (f.r && i === 0) { font(10, "bold", TXT); d.text(f.r, W - M - 4, y + 5, { align: "right" }); }
      raya(); y += LH;
    });
  }
  // Fotos de la obra y de la muestra de moldura (presupuesto)
  if (pres) {
    const fotos = [];
    for (const it of o.items || []) { if (it.ph1) fotos.push([it.ph1, it.nombre || "Obra"]); if (it.ph2) fotos.push([it.ph2, "Muestra de moldura" + (it.nombre ? " · " + it.nombre : "")]); }
    const cargaImg = u => new Promise(r => { const src = typeof fotoSrc === "function" ? fotoSrc(u) : u; if (!src) return r(null); const i = new Image(); if (!String(src).startsWith("data:")) i.crossOrigin = "anonymous"; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    const BW = (CW - 8) / 3, BH = 48;
    for (let i = 0; i < fotos.length; i++) {
      if (i % 3 === 0) { if (y + BH + 14 > pieArriba) { d.addPage(); y = M + 4; } y += 4; }
      const [u, cap] = fotos[i], x = M + (i % 3) * (BW + 4), im = await cargaImg(u);
      if (im) { const s = Math.min(BW / im.naturalWidth, BH / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; d.addImage(im, "JPEG", x + (BW - w) / 2, y + (BH - h) / 2, w, h); }
      font(8, "normal", LBL); d.text(recorta(cap, BW), x, y + BH + 4);
      if (i % 3 === 2 || i === fotos.length - 1) y += BH + 8;
    }
  }
  while (y + LH <= pieArriba) { raya(); y += LH; }

  // ---- Aviso de retiro
  const fy = PH - 42;
  d.setFillColor(GRIS[0], GRIS[1], GRIS[2]); d.roundedRect(M, fy, CW, 13, 6.5, 6.5, "F");
  if (ic.info) d.addImage(ic.info, "PNG", M + 4.5, fy + 3.5, 6, 6);
  font(8, "normal", SUAVE);
  d.text(pres ? "Presupuesto válido por 30 días desde su emisión. Precios con IVA incluido." : "Te avisaremos cuando tu pedido esté listo para retirar. Los trabajos se entregan a partir de las 17:30 hrs.", M + 14, fy + 5.5);
  d.text(pres ? "Para confirmarlo, escríbenos por WhatsApp o visítanos en la tienda." : "No se responde por trabajos pasados los 60 días. Precios con IVA incluido.", M + 14, fy + 9.6);

  // ---- Atendido por · Total · Abono · Saldo
  const r = resumenOT(o), sinPrecio = o.tipo === "rest" && !r.total;
  const by = PH - 24, cols = pres ? [
    [M, 110, "ATENDIDO POR", o.vendedora || ""],
    [M + 113, CW - 113, "TOTAL", $$(r.total)],
  ] : [
    [M, 68, "ATENDIDO POR", o.vendedora || ""],
    [M + 71, 36, "TOTAL", sinPrecio ? "Por evaluar" : $$(r.total)],
    [M + 110, 34, ((o.pagos || []).length ? "PAGADO" : "ABONO" + (o.pago && r.ab ? ` (${o.pago.toUpperCase()})` : "")), $$(r.ab)],
    [M + 147, CW - 147, "SALDO", sinPrecio ? "—" : $$(r.saldo)],
  ];
  cols.forEach(([x, w, etq, val], i) => {
    font(6.8, "normal", LBL); d.text(etq, x + 2, by);
    pill(x, by + 1.8, w, 8);
    const fuerte = etq === "SALDO" || (pres && etq === "TOTAL");
    font(fuerte ? 10.5 : 9.5, fuerte ? "bold" : "normal", TXT);
    d.text(recorta(val, w - 8), x + 4, by + 7.2);
  });
  return d;
}
