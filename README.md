# Las Ureta · Portal de gestión de pedidos

Prototipo del cotizador y gestor de órdenes del taller de enmarcación.

## Cómo abrirlo
Se abre desde un servidor web (por ejemplo, publicado en Netlify) e
ingresando con un usuario creado en Supabase → Authentication → Users.

## Estructura
- `index.html`: las pantallas (menú, enmarcaciones, restauraciones, órdenes, proveedores)
- `css/estilos.css`: diseño y colores
- `js/catalogo.js`: molduras, materiales, zonas de despacho y recargos (precios de ejemplo)
- `js/app.js`: cálculos, carrito, órdenes, estados, proveedores y PDF
- `js/config.js`: dirección y clave pública de Supabase (nunca la secret key)
- `js/datos.js`: inicio de sesión, guardar y cargar órdenes, subir fotos
- `js/mensajes.js`: textos de WhatsApp para los clientes (fáciles de editar)
- `js/vendor/`: librería de Supabase (supabase-js 2.45.4)
- `supabase/esquema.sql`: tablas, numeración de OT, seguridad y fotos

## Pendiente
- Si dos personas editan la misma orden al mismo tiempo, queda el último cambio guardado.
- «Guardar borrador» del cotizador todavía no guarda nada.
- Precios y fórmulas marcadas como «provisoria» son de ejemplo.
