// PDF para el taller: varias órdenes por hoja, compacto, y cada orden siempre completa en una hoja.
// Formato de cada orden:
//   OT 49330  [URGENTE]
//   Entrega: 25/11 · Vendedora: Kata
//   [fotos]
//   U: 1   MO: 30 × 40   MV: 40 × 50
//   Márgenes: 5 cm (o "Moldura al porte")   BO: 1 cm (solo si no es 0)
//   Montaje · Ppt · Fondo (si llevan)
//   Moldura
//   Vidrio · Java (si llevan) · Extras (desmontaje, conservación)
//   Observaciones

async function armarPdfTaller(J, ordenes, taller) {
  const d = new J({ unit: "mm", format: "a4" }), W = 210, PH = 297, M = 12, CW = W - 2 * M;
  const TOP = 24, BOT = PH - 10, PAD = 4, LH = 4.4, GAP = 4;
  const font = (sz, st = "normal", c = [30, 30, 30]) => { d.setFont("helvetica", st); d.setFontSize(sz); d.setTextColor(c[0], c[1], c[2]); };
  const dm = f => { const x = new Date(f); return String(x.getDate()).padStart(2, "0") + "/" + String(x.getMonth() + 1).padStart(2, "0"); };
  const n1 = x => fmtN(x);
  const sinNada = v => !v || /^Sin /.test(v);
  const corto = v => String(v || "").replace(/ \(.*\)$/, "");

  const cargaImg = u => new Promise(r => {
    const src = fotoSrc(u); if (!src) return r(null);
    const i = new Image(); if (!String(src).startsWith("data:")) i.crossOrigin = "anonymous";
    i.onload = () => r(i); i.onerror = () => r(null); i.src = src;
  });

  // Arma la lista de "piezas" de una orden: títulos, fotos y filas de datos
  async function piezas(o) {
    const P = [], urg = typeof esUrgente === "function" && esUrgente(o);
    const ent = (() => { const x = dueOT(o); return x ? dm(x) : "Por definir"; })();
    P.push({ tipo: "titulo", ot: o.n, urg });
    P.push({ tipo: "fila", pares: [["Entrega:", ent], ["Vendedora:", o.vendedora || ""], o.local ? ["Local:", o.local] : null] });
    const fotos = async lista => { const ims = []; for (const u of lista.filter(Boolean)) { const im = await cargaImg(u); if (im) ims.push(im); } if (ims.length) P.push({ tipo: "fotos", ims }); };

    if (o.papel) {
      await fotos([o.ph && o.ph[0]]);
      String(o.det || "").split("\n").map(x => x.trim()).filter(Boolean).forEach((l, i) => P.push({ tipo: "fila", pares: [[i === 0 ? "Detalle:" : "", l]] }));
      return P;
    }
    if (o.tipo === "rest") {
      await fotos(o.ph || []);
      P.push({ tipo: "fila", pares: [["U:", o.uni || "1"], ["Objeto:", o.obj || ""]] });
      if (o.obs) P.push({ tipo: "fila", pares: [["Observaciones:", o.obs]] });
      return P;
    }
    const keys = ["vidrio", "paspa", "fondo", "montaje", "java"];
    const items = o.items || [];
    for (const [k, it] of items.entries()) {
      const g = key => (OPT[key][it.sel[keys.indexOf(key)]] || [""])[0];
      if (items.length > 1) P.push({ tipo: "sub", texto: `${k + 1}. ${it.nombre || "Trabajo"}` });
      await fotos([it.ph1, it.ph2]);
      const c = it.c || {};
      P.push({ tipo: "fila", pares: [["U:", String(c.u || it.cant || 1)], ["MO:", `${n1(it.alto)} × ${n1(it.ancho)}`], ["MV:", `${n1(c.mvA)} × ${n1(c.mvW)}`]] });
      const m = (it.m || []).map(x => parseFloat(x) || 0);
      const mg = m.every(x => x === 0) ? "Moldura al porte" : m.every(x => x === m[0]) ? `${n1(m[0])} cm` : `sup ${n1(m[0])} · inf ${n1(m[1])} · izq ${n1(m[2])} · der ${n1(m[3])}`;
      const b = (it.blanco || []).map(x => parseFloat(x) || 0);
      const bo = !b.length || b.every(x => x === 0) ? "" : b.every(x => x === b[0]) ? `${n1(b[0])} cm` : `sup ${n1(b[0])} · inf ${n1(b[1])} · izq ${n1(b[2])} · der ${n1(b[3])}`;
      P.push({ tipo: "fila", pares: [["Márgenes:", mg], ["BO:", bo]] });
      P.push({ tipo: "fila", pares: [["Montaje:", sinNada(g("montaje")) ? "" : corto(g("montaje"))], ["Ppt:", sinNada(g("paspa")) ? "" : g("paspa").replace(/^Ppt /, "")], ["Fondo:", sinNada(g("fondo")) ? "" : g("fondo").replace(/^Fondo /, "")]] });
      P.push({ tipo: "fila", pares: [["Moldura:", (it.molds || []).map((s, j) => `${MOLD[s][0]}${parseFloat((it.mw || [])[j]) ? ` (${n1(it.mw[j])} cm)` : ""}${(it.mc || [])[j] ? ` · ${it.mc[j]}` : ""}`).join(" + ")]] });
      const extras = [it.chk && it.chk[0] && desmTxt(it), it.chk && it.chk[2] && "Conservación museo"].filter(Boolean).join(" · ");
      P.push({ tipo: "fila", pares: [["Vidrio:", sinNada(g("vidrio")) ? "" : g("vidrio")], ["Java:", sinNada(g("java")) ? "" : g("java")], ["Extras:", extras]] });
      if (it.obs) P.push({ tipo: "fila", pares: [["Observaciones:", it.obs]] });
    }
    return P;
  }

  // Dibuja (o solo mide, si dibujar = false) una orden desde y0. Devuelve su alto.
  function bloque(P, y0, dibujar, fotoH) {
    const X0 = M + PAD, X1 = W - M - PAD, ancho = X1 - X0;
    let y = y0 + PAD;
    for (const p of P) {
      if (p.tipo === "titulo") {
        if (dibujar) {
          font(13, "bold"); d.text(`OT ${p.ot}`, X0, y + 4.6);
          if (p.urg) { const x = X0 + d.getTextWidth(`OT ${p.ot}`) + 4; font(7.5, "bold", [255, 255, 255]); const w = d.getTextWidth("URGENTE") + 4; d.setFillColor(30, 30, 30); d.roundedRect(x, y + 1, w, 4.6, 1, 1, "F"); d.text("URGENTE", x + 2, y + 4.3); }
        }
        y += 6.6;
      } else if (p.tipo === "sub") {
        if (dibujar) { font(9.5, "bold"); d.text(p.texto, X0, y + 3.4); }
        y += LH + 0.6;
      } else if (p.tipo === "fotos") {
        if (fotoH <= 0) continue;
        let x = X0, filaH = 0;
        for (const im of p.ims) {
          let h = fotoH, w = h * im.naturalWidth / im.naturalHeight;
          if (w > 62) { w = 62; h = w * im.naturalHeight / im.naturalWidth; }
          if (x + w > X1) { y += filaH + 2; x = X0; filaH = 0; }
          if (dibujar) d.addImage(im, "JPEG", x, y + 1, w, h);
          x += w + 3; filaH = Math.max(filaH, h);
        }
        y += filaH + 3;
      } else if (p.tipo === "fila") {
        const pares = p.pares.filter(x => x && x[1]);
        if (!pares.length) continue;
        // ¿Caben todos los datos en una línea?
        font(9, "bold"); const wl = pares.map(([l]) => l ? d.getTextWidth(l + " ") : 0);
        font(9, "normal"); const wv = pares.map(([, v]) => d.getTextWidth(String(v)));
        const total = wl.reduce((a, x) => a + x, 0) + wv.reduce((a, x) => a + x, 0) + 6 * (pares.length - 1);
        if (total <= ancho) {
          let x = X0;
          pares.forEach(([l, v], i) => { if (dibujar) { font(9, "bold"); if (l) d.text(l, x, y + 3.3); font(9, "normal"); d.text(String(v), x + wl[i], y + 3.3); } x += wl[i] + wv[i] + 6; });
          y += LH;
        } else {
          pares.forEach(([l, v], i) => {
            font(9, "normal"); const lineas = d.splitTextToSize(String(v), ancho - wl[i]);
            lineas.forEach((t, j) => { if (dibujar) { if (j === 0 && l) { font(9, "bold"); d.text(l, X0, y + 3.3); } font(9, "normal"); d.text(t, X0 + wl[i], y + 3.3); } y += LH; });
          });
        }
      }
    }
    return y + PAD - y0;
  }

  function encabezado() {
    font(10, "bold"); d.text(`TALLER ${String(taller).toUpperCase()}`, M, 12);
    font(8.5, "normal", [110, 110, 110]); d.text(fd(new Date()), W - M, 12, { align: "right" });
    font(7.5, "normal", [110, 110, 110]); d.text("U: unidades · MO: medida obra · MV: medida vidrio · BO: blanco original (todas las medidas en cm)", M, 17);
    d.setDrawColor(200, 200, 200); d.setLineWidth(0.3); d.line(M, 19.5, W - M, 19.5);
  }

  encabezado();
  let y = TOP;
  for (const o of ordenes) {
    const P = await piezas(o);
    // Si no cabe en una hoja completa con fotos grandes, se achican las fotos
    let fotoH = 36, h = bloque(P, 0, false, fotoH);
    for (const alt of [26, 18, 0]) { if (h <= BOT - TOP) break; fotoH = alt; h = bloque(P, 0, false, fotoH); }
    if (y + h > BOT && y > TOP) { d.addPage(); encabezado(); y = TOP; }
    d.setDrawColor(190, 190, 190); d.setLineWidth(0.3); d.roundedRect(M, y, CW, h, 2, 2, "S");
    bloque(P, y, true, fotoH);
    y += h + GAP;
  }
  // Número de hoja
  const total = d.getNumberOfPages();
  for (let i = 1; i <= total; i++) { d.setPage(i); font(8, "normal", [110, 110, 110]); d.text(`Hoja ${i} de ${total}`, W - M, PH - 5, { align: "right" }); }
  return d;
}

// Fecha de entrega de una orden (usa la misma regla que la lista de órdenes)
function dueOT(o) { return typeof due === "function" ? due(o) : null; }
