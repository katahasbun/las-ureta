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
- `js/mensajes.js`: textos de WhatsApp para clientes y proveedores (fáciles de editar)
- `js/pdf-cliente.js`: formato de la orden de trabajo en PDF para el cliente
- `js/tema.js`: botón de modo día / noche
- `js/vendor/`: librería de Supabase (supabase-js 2.45.4)
- `supabase/esquema.sql`: tablas, numeración de OT, seguridad y fotos

## Pendiente
- Si dos personas editan la misma orden al mismo tiempo, queda el último cambio guardado.
- «Guardar borrador» del cotizador todavía no guarda nada.
- Precios confirmados con el catálogo de SumUp (noviembre 2026).
- Molduras de Pato Pérez sin precio (están en el Excel de proveedores, no en SumUp):
  3440-3085, 962, 405 Oro, 91, 313, 630-007, 384, 2840, 315, 314, 271, 6 Aluminio,
  966, 385, 974, 272, 316, 970, 307, 299-20, 420, 421, 352.
- Confirmar si son la misma moldura: 43440/43440 CCN3, A-06/A-06 (2016-47), Lisa Plata/Lisos plata,
  2043-8409/A-59, 11-G4·11-5·11-G6/CG11#4·#5·#6, 3/N° 3, AB-7/AD-7, B-143/V-143, 8/N8.
- Proveedor por definir: molduras «Especiales», «Grecado» y 14 códigos «Por definir».
