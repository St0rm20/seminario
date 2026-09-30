# ComParte

MVP frontend-only de **ComParte**, una plataforma cívica que conecta comercios de barrio
y vecinos en Bogotá para publicar excedentes de comida en buen estado y retirarlos
antes de que se conviertan en desperdicio.

No hay backend: todo vive en `sessionStorage` del navegador. Al cerrar la pestaña la
sesión se reinicia con los datos demo.

---

## Cómo ejecutarlo

No requiere instalación, build ni servidor. Cualquiera de estas opciones funciona:

```bash
# 1. Abrir el archivo directamente
xdg-open index.html

# 2. Servidor local (recomendado: evita restricciones de file://)
python3 -m http.server 8080
# luego visita http://localhost:8080
```

Requiere conexión a internet solo para dos CDNs: **Tailwind** (estilos) y
**Leaflet + OpenStreetMap** (el mapa). Si el mapa no carga, la pantalla muestra un
aviso y ofrece volver al listado; el resto de la app sigue operativa.

### Cuentas de prueba

Contraseña para las tres: `1234`. También hay botones de acceso de 1 toque en `login.html`.

| Correo | Perfil | Publicaciones |
| --- | --- | --- |
| `ana@demo.com` | Panadería La Candelaria | 4 |
| `carlos@demo.com` | Vecino particular | 2 |
| `lucia@demo.com` | Comedor Comunitario La Esperanza | 2 |

---

## Arquitectura

Todo el código vive en `js/` como scripts clásicos. **No se usan módulos ES** porque
`file://` no los soporta. El namespace global es `window.ComParte`.

| Archivo | Responsabilidad |
| --- | --- |
| `js/tailwind-config.js` | Única fuente de la configuración de Tailwind (tokens de color, tipografía, spacing) |
| `js/store.js` | Capa de datos sobre `sessionStorage`: CRUD, migraciones, cuotas y **todas las reglas de negocio** |
| `js/seed.js` | Datos demo, zonas de Bogotá e imágenes de marca. Único lugar con datos ficticios |
| `js/auth.js` | Sesión simulada, login, registro y guardas de ruta |
| `js/ui.js` | Header, nav inferior, toasts, modales, tarjetas, avatar, compresión de imágenes |
| `js/<pantalla>.js` | Un script por pantalla: `feed`, `detalle`, `publicar`, `reservas`, `notificacion`, `perfil`, `map`, `login`, `register`, `acerca` |

### Orden de carga (obligatorio)

```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="js/tailwind-config.js"></script>
<!-- al final del body, en este orden: -->
<script src="js/store.js"></script>
<script src="js/seed.js"></script>
<script src="js/auth.js"></script>
<script src="js/ui.js"></script>
<script src="js/<pantalla>.js"></script>
```

`store.js` no puede ir después de `seed.js` porque el seed siembra datos, y `ui.js`
necesita a los tres anteriores.

### Pantallas

| Archivo | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `index.html` | `/` | público | Onboarding y propuesta de valor |
| `acerca.html` | `/acerca` | público | Marco legal, pilares e impacto calculado de la sesión |
| `login.html` | `/login` | público | Acceso con validación en vivo |
| `register.html` | `/register` | público | Alta de cuenta eligiendo rol (donante o beneficiario) |
| `feed.html` | `/feed` | sesión | Inicio: búsqueda, filtros, orden, mapa/listado |
| `map.html` | `/map` | sesión | Mapa Leaflet con marcadores reales |
| `publicar.html` | `/publicar` | sesión | Crear y editar publicaciones |
| `detalle.html` | `/detalle?id=…` | sesión | Detalle, reserva y gestión del publicador |
| `reservas.html` | `/reservas` | sesión | Códigos de retiro, cancelación e historial |
| `notificacion.html` | `/notificaciones` | sesión | Avisos de reservas y retiros |
| `perfil.html` | `/perfil` | sesión | Impacto, publicaciones, edición de datos, salida |
| `code.html` | — | — | **Redirección** a `login.html` (formulario duplicado del prototipo) |
| `detail.html` | — | — | **Redirección** a `detalle.html`, preservando `?id=` |

`detalle.html` es el nombre canónico; `detail.html` se conserva solo para no romper
enlaces antiguos.

---

## Modelo de datos

```js
{
  schema: 1,
  users: [{
    id, name, email, password, phone, address,
    lat, lng, zoneId, businessName, role, points, createdAt
  }],
  listings: [{
    id, ownerId, title, description, category, photo,
    portionsTotal, portionsLeft, weightKg, maxPerPerson,
    startTime, endTime, allergens, needsFridge, consumeToday,
    pickupAddress, pickupNotes, lat, lng, zoneId,
    status, createdAt, updatedAt
  }],
  reservations: [{
    id, listingId, userId, quantity, code, status, createdAt, pickedUpAt
  }],
  notifications: [{ id, userId, type, title, body, listingId, reservationId, read, createdAt }],
  session: { currentUserId },
  selectedZone
}
```

**Dos roles.** `donor` (público / comercio) publica, edita, gestiona y confirma
retiros de sus publicaciones. `beneficiary` aparta y retira raciones. Nadie puede
reservar su propia publicación, y el rol se valida en `store.js` (no solo en la UI).
Las cuentas de la v1 sin rol se migran a `donor` al cargar.

### Estados

- **Publicación:** `active` → `soldout` | `expired` | `cancelled`
- **Reserva:** `reserved` → `picked_up` | `cancelled` | `expired`

Las transiciones válidas están todas en `store.js`. Un `soldout` con racciones
liberadas y ventana abierta vuelve a `active` automáticamente.

---

## Reglas de negocio

| Regla | Valor |
| --- | --- |
| Puntos al publicar | +50 |
| Puntos por retiro confirmado | +10 para **ambos** |
| CO₂e evitado | `pesoKg × 2.5` |
| Raciones por publicación | 1 – 99 |
| Peso por publicación | 0.1 – 500 kg |
| Ventana de retiro | hasta 24 h, debe cerrar en el futuro |
| Límite por persona | opcional, nunca mayor al total |
| Código de retiro | 6 caracteres, sin `I`, `O`, `0`, `1` |
| Vencimiento automático | cada 30 s en pantalla |

Al editar una publicación no se puede bajar `portionsTotal` por debajo de lo ya
reservado, y las raciones reservadas se descuentan del total al recalcular stock.

### Ciclo de vida de una reserva

1. El vecino abre `detalle.html` y aparta raciones (respeta el máximo por persona).
2. El stock baja y el publicador recibe una notificación con el código.
3. Al retirar, el receptor muestra su código y el publicador lo confirma en su panel.
4. La reserva pasa a `picked_up`, ambos ganan 10 puntos y se avisa al receptor.
5. Si el receptor cancela, las raciones vuelven al stock y se avisa al publicador.
6. Si se acaba el stock, la publicación pasa a `soldout` automáticamente.

---

## Almacenamiento y robustez

- Clave única: `comparte_v1`.
- `migrate()` repara registros manipulados a mano: coerciona tipos, descarta
  estados inválidos y rellena campos faltantes.
- JSON corrupto ⇒ re-siembra automática con los datos demo.
- Cuota excedida ⇒ se captura y se ofrece restablecer la sesión con un toast.
- Modo privado estricto ⇒ respaldo en memoria, con aviso visible.
- Todas las fechas del seed son **relativas al momento de abrir** la app, así que
  siempre hay publicaciones vigentes sin importar cuándo se abra.
- Las imágenes se redimensionan a 800 px y se comprimen en el navegador antes de
  guardarse como dataURL.

---

## Seguridad y sanitización

- Todo el contenido dinámico se inserta con `textContent` mediante el constructor
  `h()` de `ui.js`. **No hay `innerHTML` con datos de usuario.**
- `next=` en el login solo acepta rutas internas: se rechazan URLs absolutas y
  protocolos externos.
- Las imágenes de la marca y del seed son URLs ya presentes en el prototipo; las
  fotos que sube el usuario se comprimen localmente y nunca salen del navegador.

---

## Verificación

Se ejecutaron tres suites automáticas sobre el código real:

| Suite | Cobertura | Resultado |
| --- | --- | --- |
| Datos | seed, persistencia, validaciones, reserva, permisos, cuotas, migración | 70/70 |
| Pantallas | las 13 páginas con jsdom: sin excepciones, sin `undefined`/`NaN`/`[object Object]`, header y nav montados | 80/80 |
| Flujos | guardas de ruta, búsqueda y filtros, publicación con validación, reserva, confirmación de retiro, cancelación, notificaciones, edición de perfil | 79/79 |

Comprobaciones adicionales:

- `node --check` en los 15 archivos de `js/`.
- Sin `href="#"` ni botones muertos en ninguna pantalla.
- Configuración de Tailwind duplicada **cero** veces (solo `js/tailwind-config.js`).
- Datos ficticios fuera de `seed.js` **cero** veces.

### Criterios de aceptación

- [x] Registro con elección de rol (donante o beneficiario)
- [x] Solo `donor` publica, edita, gestiona y confirma retiros
- [x] Solo `beneficiary` reserva, retira y cancela reservas
- [x] Cuentas v1 sin rol migran a `donor` sin romper datos
- [x] Publicación visible en Inicio, Mapa y Perfil al instante
- [x] Reserva descuenta stock y genera código único
- [x] Confirmación de retiro con código reparte 10 puntos a cada parte
- [x] Límites por persona y raciones respetados
- [x] Solo el dueño edita, agota, cierra o cancela
- [x] Agotada y vencida muestran estado y no se pueden reservar
- [x] Cancelar reserva devuelve raciones al stock
- [x] Retirar muestra el punto exacto en el mapa
- [x] Cerrar la pestaña reinicia la sesión con el seed
- [x] Estados vacío, error y de cuota visible
- [x] Sin `href="#"`, sin datos hardcodeados, sin errores de consola

---

## Limitaciones conocidas

Es un prototipo funcional, no un producto listo para producción:

- **Sin backend ni autenticación real.** Las contraseñas se guardan en texto plano
  y cualquiera puede leer `sessionStorage` desde la consola.
- **Los datos se pierden al cerrar la pestaña**, por diseño.
- **No hay subida de imágenes a servidor**: las fotos viven en `sessionStorage` y
  pueden agotar la cuota con varias publicaciones.
- **No hay verificación sanitaria.** El checkbox de inocuidad es una declaración
  del usuario, no una garantía.
- **Métricas aproximadas.** El CO₂e usa un factor fijo de 2,5 kg/kg; no es una
  medición de ciclo de vida.
- **Mapa sin agrupamiento**: con muchas publicaciones en la misma zona los
  marcadores se superponen.
