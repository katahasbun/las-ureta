// Respaldo de Las Ureta: copia todas las órdenes y las fotos de Supabase a una carpeta.
// Lo ejecuta GitHub Actions todos los días (.github/workflows/respaldo.yml).
// Uso: node respaldar.mjs <carpeta-destino>
// Necesita las variables SUPABASE_URL y SUPABASE_SECRET_KEY (la clave secreta va en GitHub Secrets, nunca en el código).
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Falta la carpeta de destino");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// 1. Órdenes (de a 1000)
const filas = [];
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await db.from("ordenes").select("*").order("n").range(desde, desde + 999);
  if (error) throw error;
  filas.push(...data);
  if (data.length < 1000) break;
}
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "ordenes.json"), JSON.stringify(filas, null, 1) + "\n");

// 2. Fotos: solo se descargan las que aún no están en el respaldo (las fotos no cambian)
async function listar(prefijo) {
  const rutas = [];
  for (let desde = 0; ; desde += 100) {
    const { data, error } = await db.storage.from("fotos").list(prefijo, { limit: 100, offset: desde });
    if (error) throw error;
    for (const x of data) {
      const ruta = prefijo ? `${prefijo}/${x.name}` : x.name;
      if (x.id === null) rutas.push(...(await listar(ruta)));  // es una carpeta
      else rutas.push(ruta);
    }
    if (data.length < 100) break;
  }
  return rutas;
}
const rutas = await listar("");
let nuevas = 0;
for (const ruta of rutas) {
  const destino = path.join(dir, "fotos", ruta);
  if (fs.existsSync(destino)) continue;
  const { data, error } = await db.storage.from("fotos").download(ruta);
  if (error) throw error;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.from(await data.arrayBuffer()));
  nuevas++;
}

// 3. Nota para quien abra la rama de respaldos, y aviso a Netlify para que no la publique
fs.writeFileSync(path.join(dir, "LEEME.md"), `# Respaldos de Las Ureta

Cada commit de esta rama es el respaldo de un día: \`ordenes.json\` tiene todas las órdenes
y \`fotos/\` las fotos. Para restaurar, usa la acción "Restaurar respaldo" en la pestaña
Actions del repositorio (ver README de la rama main).
`);
fs.writeFileSync(path.join(dir, "netlify.toml"), `# Esta rama solo guarda respaldos: Netlify no debe publicarla.\n[build]\n  ignore = "exit 0"\n`);

console.log(`Respaldo listo: ${filas.length} órdenes, ${rutas.length} fotos (${nuevas} nuevas).`);
