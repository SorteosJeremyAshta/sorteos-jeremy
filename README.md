# Sorteos Jeremy Ashta: instalación

La página reserva los numeritos de verdad: se guardan en una hoja de Google Sheets y las capturas del Yape van a tu Google Drive. Desde el **panel de administrador** (`admin.html`) puedes confirmar o rechazar pagos, registrar ventas en efectivo, fijar la fecha del sorteo y publicar a los ganadores.

```
sorteos-jeremy-ashta/
├── index.html          ← página pública
├── admin.html          ← panel de administrador
├── config.js           ← ÚNICO archivo que editas (URL del Apps Script, precios, WhatsApp)
├── comun.js, app.js, admin.js
├── styles.css, admin.css
├── assets/             ← logo, fondos, QR de Yape
└── apps-script/
    ├── Code.gs         ← backend (se pega en Google Apps Script)
    └── appsscript.json
```

---

## Paso 1. Crear la hoja de Google

1. Entra a <https://sheets.new> con tu cuenta de Google.
2. Ponle de nombre **BD Sorteos Jeremy Ashta**.
3. Abre el menú **Extensiones → Apps Script**.

## Paso 2. Pegar el backend

1. En el editor de Apps Script borra todo lo que hay en `Código.gs`.
2. Pega el contenido de `apps-script/Code.gs`.
3. **Cambia la clave**: busca la línea `const CLAVE_ADMIN = "CambiaEstaClave2026";` (dentro de la función `instalar`) y pon tu propia clave.
4. Guarda el proyecto con 💾.
5. En la lista de funciones de arriba elige **instalar** y pulsa **▶ Ejecutar**.
6. Google te pedirá permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir**. Es tu propio script, así que es normal.

Al terminar ya tienes las hojas **Reservas** y **Config**, la carpeta **Comprobantes Sorteos Jeremy Ashta** en tu Drive y un activador que libera cada 15 minutos las reservas vencidas.

> Después de instalar puedes volver a poner cualquier texto en `CLAVE_ADMIN`, porque la clave real ya quedó guardada (cifrada). Para cambiarla más adelante usa el panel: **Sorteo → Cambiar clave**.

## Paso 3. Publicar como aplicación web

1. Pulsa **Implementar → Nueva implementación**.
2. En el engranaje ⚙ elige **Aplicación web**.
3. Configúrala así:
   - **Ejecutar como:** *Yo (tu correo)*
   - **Quién tiene acceso:** *Cualquier persona*
4. Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

## Paso 4. Conectar la página

Abre `config.js` y pega la URL:

```js
apiUrl: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
```

Revisa también el `whatsapp`. Si quieres una fecha por defecto, ponla en `fechaSorteo`, aunque es mejor fijarla desde el panel.

## Paso 5. Subir la página

Sube toda la carpeta (menos `apps-script/`, que no hace falta) a tu hosting, por ejemplo **GitHub Pages**, Netlify o el que ya usas. Luego:

- Página pública: `https://tu-sitio/index.html`
- Panel: `https://tu-sitio/admin.html`. No pongas este enlace en la página; solo tú debes conocerlo.

---

## Cómo funciona

| Paso | Qué pasa |
|---|---|
| El cliente elige números, yapea y adjunta la captura | Los números quedan **amarillos (reservados)** y la captura se guarda en tu Drive |
| Tú revisas tu Yape y pulsas **✔ Confirmar** en el panel | Los números pasan a **rojo (vendido)** |
| Pulsas **✖ Rechazar** (no llegó el pago) | Los números vuelven a estar disponibles |
| No haces nada en el plazo (24 h por defecto) | La reserva **vence** y los números se liberan solos. Puedes **↺ Reactivarla** si sus números siguen libres |

- **Precio:** S/ 5 por número y la promoción 3 x S/ 10. El servidor calcula el total, así que no se puede alterar desde el navegador.
- **Dos personas con el mismo número:** el servidor usa un candado, y si alguien ya lo tomó, el segundo recibe un aviso para elegir otro.
- **Ganadores:** escribe los números en el panel. La página muestra el nombre con el apellido abreviado (ej. *Juan Perez L.*).
- **Cerrar ventas:** en el panel, pestaña **Sorteo**, desmarca *Ventas abiertas*.
- **Exportar:** en Reservas, el botón **⬇ Exportar CSV** abre en Excel.
- La página pública se actualiza sola cada 30 s y el panel cada 60 s.

## Si cambias el código de Code.gs

Hay que publicar otra vez: **Implementar → Gestionar implementaciones → ✏ Editar → Versión: Nueva versión → Implementar**. Así la URL sigue siendo la misma.

## Modo demostración

Si `apiUrl` está vacío, la página funciona como antes: no guarda nada y solo arma el mensaje de WhatsApp. Sirve para probar el diseño.

## Problemas comunes

- **"No se pudo actualizar el estado de los numeritos":** la URL de `config.js` está mal o la implementación no está en *Cualquier persona*.
- **"Aún no se configuró la clave":** falta ejecutar la función `instalar` (Paso 2.5).
- **"Demasiados intentos":** pusiste mal la clave 8 veces. Espera 10 minutos.
