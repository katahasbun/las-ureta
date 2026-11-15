// Conexión con Supabase.
// La publishable key es pública por diseño: sin iniciar sesión no permite ver ni cambiar nada.
// NUNCA poner aquí la secret key ni la service_role key.
const SUPABASE_URL = "https://vbhveympiafsndatfyyl.supabase.co";
const SUPABASE_KEY = "sb_publishable_sXFjL6nUBGXxiF5M8aq9lQ_3SK0JWiB";

// Datos de contacto que aparecen en la orden de trabajo (PDF del cliente).
// Si un dato queda vacío (""), no se muestra. Se pueden poner varios teléfonos.
const CONTACTO = {
  web: "www.lasureta.cl",
  telefonos: ["264659979"],
  correo: "info@lasureta.cl",
  instagram: "@lasureta",
  tiktok: "",
  direccion: "Manquehue Norte 402, Las Condes",
};
