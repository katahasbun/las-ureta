// Base de datos (Supabase): sesión, órdenes y fotos.
const db = window.supabase ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let usuaria = null;   // correo de quien inició sesión
const FOTO_URL = {};  // ruta de la foto en Storage → dirección para mostrarla

// Una foto puede estar recién tomada (data:...) o guardada en Storage (ruta).
const fotoSrc = u => !u ? "" : String(u).startsWith("data:") ? u : (FOTO_URL[u] || "");

// Cada orden se guarda como una fila: número, tipo, estado y el resto en "datos".
function aFila(o) { const { n, tipo, estado, creado, ...datos } = o; return { tipo, estado: estado || "Recibida", datos }; }
function deFila(f) { return { ...f.datos, n: f.n, tipo: f.tipo, estado: f.estado, creado: Date.parse(f.creado) }; }

function fotosDe(o) { return o.tipo === "rest" ? (o.ph || []) : (o.items || []).flatMap(it => [it.ph1, it.ph2]); }

// Sube a Storage las fotos nuevas de una orden y las reemplaza por su ruta.
async function subirFotos(o) {
  const sube = async u => {
    if (!u || !String(u).startsWith("data:")) return u;
    const blob = await (await fetch(u)).blob();
    const ruta = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`;
    const { error } = await db.storage.from("fotos").upload(ruta, blob, { contentType: blob.type || "image/jpeg" });
    if (error) throw error;
    FOTO_URL[ruta] = u;
    return ruta;
  };
  if (o.tipo === "rest") o.ph = await Promise.all((o.ph || []).map(sube));
  else for (const it of o.items || []) { it.ph1 = await sube(it.ph1); it.ph2 = await sube(it.ph2); }
}

// Pide direcciones temporales (12 horas) para mostrar las fotos guardadas.
async function firmarFotos(lista) {
  const rutas = [...new Set(lista.flatMap(fotosDe).filter(u => u && !String(u).startsWith("data:") && !FOTO_URL[u]))];
  if (!rutas.length) return;
  const { data, error } = await db.storage.from("fotos").createSignedUrls(rutas, 60 * 60 * 12);
  if (error) { console.error(error); return; }
  data.forEach(x => { if (x.signedUrl) FOTO_URL[x.path] = x.signedUrl; });
}

async function cargarOrdenes() {
  const { data, error } = await db.from("ordenes").select("*").order("n");
  if (error) { console.error(error); toast("No se pudieron cargar las órdenes. Revisa la conexión"); return false; }
  const L = data.map(deFila);
  await firmarFotos(L);
  ots.length = 0; rests.length = 0;
  L.forEach(o => (o.tipo === "rest" ? rests : ots).push(o));
  return true;
}

// Crea una orden nueva; la base de datos le asigna el número.
async function crearOrden(o) {
  await subirFotos(o);
  const { data, error } = await db.from("ordenes").insert(aFila(o)).select().single();
  if (error) throw error;
  o.n = data.n; o.creado = Date.parse(data.creado);
  return o;
}

async function guardarOrden(o) {
  try {
    await subirFotos(o);
    const { error } = await db.from("ordenes").update(aFila(o)).eq("n", o.n);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(e);
    toast("No se pudo guardar en la base de datos. Revisa la conexión y vuelve a intentarlo");
    return false;
  }
}

async function cerrarSesion() { if (db) await db.auth.signOut(); location.hash = ""; location.reload(); }
