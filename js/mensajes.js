// Mensajes de WhatsApp para los clientes.
// Para cambiar un texto, edita las líneas entre comillas. "" deja una línea en blanco
// y null quita la línea (se usa cuando un dato no aplica, por ejemplo sin abono).

const MENSAJES = {
  // Al confirmar una orden nueva (se adjunta el PDF)
  confirmacion(o) {
    const r = resumenOT(o), hola = saludo(o);
    if (o.tipo === "rest") return [
      `¡Hola${hola}! 👋✨`,
      "",
      "Muchas gracias por confiar en Las Ureta 🎨💛",
      `Recibimos tu obra${o.obj ? " (" + o.obj + ")" : ""} con la orden de restauración N.º ${o.n} 🔍`,
      r.total ? `💰 Total: ${clp(r.total)}` : "Nuestro restaurador la va a evaluar con mucho cariño y te contaremos el presupuesto apenas lo tengamos.",
      r.total && r.ab ? `✅ Abono: ${clp(r.ab)}` : null,
      r.total ? `🧾 Saldo: ${clp(r.saldo)}` : null,
      "",
      "Te adjuntamos el comprobante de tu orden 📎",
      "Cualquier duda, escríbenos por aquí 😊",
    ];
    return [
      `¡Hola${hola}! 👋✨`,
      "",
      "Muchas gracias por confiar en Las Ureta 🖼️💛",
      `Tu orden de trabajo N.º ${o.n} ya quedó registrada:`,
      "",
      `💰 Total: ${clp(r.total)}`,
      r.ab ? `✅ Abono: ${clp(r.ab)}` : null,
      `🧾 Saldo: ${clp(r.saldo)}`,
      `📅 Entrega estimada: ${entregaTxt(o)}`,
      "",
      "Te adjuntamos el detalle de tu orden 📎",
      "Cualquier duda, escríbenos por aquí. ¡Nos encanta ser parte de tu proyecto! 😊",
    ];
  },

  // Al cambiar el estado a "Lista para retirar"
  listo(o) {
    const r = resumenOT(o);
    return [
      `¡Hola${saludo(o)}! 🎉`,
      "",
      `Te contamos que tu orden N.º ${o.n} ya está lista para retirar 🖼️✨`,
      r.saldo ? `🧾 Saldo pendiente: ${clp(r.saldo)}` : null,
      "",
      "Te esperamos en nuestra tienda 🏠",
      "¡Muchas gracias por confiar en Las Ureta! 💛",
    ];
  },
};

// ---- Funciones de apoyo (no hace falta tocarlas para cambiar los textos) ----

const saludo = o => { const n = (o.nom || "").trim().split(/\s+/)[0]; return n ? " " + n : ""; };

// Total (con descuento de convenio), abono y saldo de una orden
function resumenOT(o) {
  if (o.tipo === "rest") {
    const total = parseFloat(o.precio) || 0, ab = parseFloat(o.abono) || 0;
    return { total, ab, saldo: Math.max(0, total - ab) };
  }
  const bruto = (o.items || []).reduce((a, x) => a + x.c.tot, 0);
  const pct = o.conv && o.conv !== "No" ? +o.dcto || 0 : 0;
  const total = bruto * (1 - pct / 100), ab = parseFloat(o.abono) || 0;
  return { total, ab, saldo: Math.max(0, total - ab) };
}

function entregaTxt(o) {
  const f = o.tipo === "rest" ? o.fecha : (o.entTipo === "f" ? o.entFecha : "");
  if (f) return "el " + fd(new Date(f + "T12:00:00"));
  return o.tipo === "rest" ? "por definir" : "en 2 a 3 semanas";
}

const textoWA = (tipo, o) => MENSAJES[tipo](o).filter(x => x !== null).join("\n");

// Convierte "+56 9 1234 5678", "912345678" o "12345678" al formato de WhatsApp (56912345678)
function telWA(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d[0] === "9") d = "56" + d;
  else if (d.length === 8) d = "569" + d;
  return d.length >= 11 ? d : null;
}

// Abre WhatsApp (app o WhatsApp Web) con el chat del cliente y el mensaje ya escrito
function abrirWA(o, tipo) {
  const n = telWA(o.tel);
  if (!n) { toast("El teléfono del cliente no parece válido. Revísalo en la orden"); return false; }
  window.open("https://wa.me/" + n + "?text=" + encodeURIComponent(textoWA(tipo, o)), "_blank", "noopener");
  return true;
}
