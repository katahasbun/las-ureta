// Restaura en Supabase las órdenes y fotos de un respaldo.
// Lo ejecuta GitHub Actions a pedido (.github/workflows/restaurar.yml).
// Uso: node restaurar.mjs <carpeta-del-respaldo>
//
// Qué hace: vuelve a crear las órdenes que falten y deja las existentes como estaban
// en el respaldo (las identifica por su número). No borra órdenes creadas después del respaldo.
// Sube las fotos que falten.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Falta la carpeta del respaldo");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const filas = JSON.parse(fs.readFileSync(path.join(dir, "ordenes.json"), "utf8"));
// creado_por / actualizado_por apuntan a usuarios: se omiten por si un usuario ya no existe
const limpias = filas.map(({ creado_por, actualizado_por, ...f }) => f);
for (let i = 0; i < limpias.length; i += 200) {
  const { error } = await db.from("ordenes").upsert(limpias.slice(i, i + 200), { onConflict: "n" });
  if (error) throw error;
}

let subidas = 0;
const base = path.join(dir, "fotos");
function archivos(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? archivos(path.join(carpeta, e.name)) : [path.join(carpeta, e.name)]);
}
for (const archivo of archivos(base)) {
  const ruta = path.relative(base, archivo).split(path.sep).join("/");
  const { error } = await db.storage.from("fotos").upload(ruta, fs.readFileSync(archivo), { contentType: "image/jpeg", upsert: false });
  if (!error) subidas++;
  else if (!/exists|duplicate/i.test(error.message || "")) throw error;
}

console.log(`Restauración lista: ${limpias.length} órdenes restauradas, ${subidas} fotos subidas.`);
