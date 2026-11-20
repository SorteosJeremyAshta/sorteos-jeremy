// ==========================================================
//  FUNCIONES COMPARTIDAS (página pública y panel admin)
// ==========================================================

// Total con promoción: cada grupo de 3 cuesta S/ 10, el resto S/ 5 c/u
function calcularTotal(cantidad) {
  const grupos = Math.floor(cantidad / CONFIG.promoCantidad);
  const restantes = cantidad % CONFIG.promoCantidad;
  return grupos * CONFIG.promoPrecio + restantes * CONFIG.precio;
}

function soles(monto) {
  return "S/ " + Number(monto || 0).toFixed(2);
}

function hayServidor() {
  return typeof CONFIG.apiUrl === "string" && /^https:\/\/script\.google\.com\/.+\/exec$/.test(CONFIG.apiUrl.trim());
}

// Llamada GET al Apps Script
async function apiGet(accion, params = {}) {
  const url = new URL(CONFIG.apiUrl.trim());
  url.searchParams.set("accion", accion);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), { method: "GET" });
  return leerRespuesta(resp);
}

// Llamada POST al Apps Script.
// Se envía como text/plain para evitar el bloqueo CORS de Google.
async function apiPost(accion, datos = {}) {
  const resp = await fetch(CONFIG.apiUrl.trim(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ accion, ...datos })
  });
  return leerRespuesta(resp);
}

async function leerRespuesta(resp) {
  if (!resp.ok) throw new Error("El servidor respondió con error " + resp.status);
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || "Ocurrió un error en el servidor.");
  return json;
}

// Convierte "2026-12-24T20:00" (o ISO) en Date local
function leerFecha(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

function formatoFechaLarga(fecha) {
  if (!fecha) return "Por definir";
  return fecha.toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }) + " · " + fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function formatoFechaCorta(valor) {
  const d = leerFecha(valor);
  if (!d) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function escaparHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Reduce la foto del comprobante (máx. 1400 px, JPEG) para que suba rápido
function comprimirImagen(archivo, maxLado = 1400, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    if (!archivo.type.startsWith("image/")) {
      reject(new Error("El comprobante debe ser una imagen (foto o captura)."));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("La imagen del comprobante no es válida."));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        resolve(dataUrl.split(",")[1]); // solo base64
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

// Aviso flotante (reemplaza a los alert)
function aviso(mensaje, tipo = "info", segundos = 4) {
  let caja = document.getElementById("avisos");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "avisos";
    document.body.appendChild(caja);
  }
  const item = document.createElement("div");
  item.className = "aviso aviso-" + tipo;
  item.textContent = mensaje;
  caja.appendChild(item);
  setTimeout(() => item.classList.add("salir"), segundos * 1000);
  setTimeout(() => item.remove(), segundos * 1000 + 400);
}

// Ícono de chat (SVG) para los botones de WhatsApp
const ICONO_CHAT = `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="currentColor"><path d="M12 2.2C6.6 2.2 2.2 6.3 2.2 11.4c0 2 .7 3.9 1.9 5.4L3 21.4l4.8-1.5c1.3.6 2.7.9 4.2.9 5.4 0 9.8-4.1 9.8-9.2S17.4 2.2 12 2.2Zm-4.3 10.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.3 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.3 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z"/></svg>`;
