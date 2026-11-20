// ==========================================================
//  PANEL DE ADMINISTRADOR — SORTEOS JEREMY ASHTA
// ==========================================================

let token = sessionStorageGet("sja_token");
let datos = null;            // última respuesta de adminDatos
let vistaActual = "reservas";
const PREMIOS_DEF = [400, 200, 150, 50];

// sessionStorage puede fallar en algunos navegadores; lo protejo
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sessionStorageSet(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }

// ---------- LLAMADAS CON SESIÓN ----------
async function adminPost(accion, extra = {}) {
  try {
    return await apiPost(accion, { token, ...extra });
  } catch (e) {
    if (e.message === "SESION_VENCIDA") {
      cerrarSesionLocal();
      aviso("Tu sesión venció. Ingresa de nuevo.", "alerta");
    }
    throw e;
  }
}

// ---------- LOGIN ----------
document.getElementById("formLogin").addEventListener("submit", async ev => {
  ev.preventDefault();
  const clave = document.getElementById("clave").value;
  if (!clave) return;
  const btn = document.getElementById("btnLogin");
  btn.disabled = true; btn.textContent = "INGRESANDO...";
  try {
    const r = await apiPost("login", { clave });
    token = r.token;
    sessionStorageSet("sja_token", token);
    document.getElementById("clave").value = "";
    await entrar();
  } catch (e) {
    aviso(e.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "INGRESAR";
  }
});

async function entrar() {
  await cargarDatos();
  if (!token) return;
  document.getElementById("vistaLogin").hidden = true;
  document.getElementById("vistaPanel").hidden = false;
}

async function salir() {
  try { await adminPost("logout"); } catch (e) {}
  cerrarSesionLocal();
}

function cerrarSesionLocal() {
  token = null;
  sessionStorageSet("sja_token", null);
  document.getElementById("vistaPanel").hidden = true;
  document.getElementById("vistaLogin").hidden = false;
}

// ---------- DATOS ----------
async function cargarDatos() {
  try {
    datos = await adminPost("adminDatos");
    pintarTodo();
    document.getElementById("ultimaActualizacion").textContent =
      "Actualizado " + new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    if (e.message !== "SESION_VENCIDA") aviso(e.message, "error");
  }
}

function pintarTodo() {
  pintarResumen();
  pintarReservas();
  pintarTablero();
  pintarConfig();
  pintarGanadores();
}

function mapaNumeros() {
  // numero -> reserva activa (PENDIENTE o CONFIRMADO)
  const mapa = {};
  datos.reservas.forEach(r => {
    if (r.estado !== "PENDIENTE" && r.estado !== "CONFIRMADO") return;
    String(r.numeros).split(",").map(s => s.trim()).filter(Boolean).forEach(n => mapa[n] = r);
  });
  return mapa;
}

function pintarResumen() {
  let vend = 0, res = 0, monto = 0, pend = 0, porVerif = 0;
  datos.reservas.forEach(r => {
    if (r.estado === "CONFIRMADO") { vend += Number(r.cantidad); monto += Number(r.total); }
    if (r.estado === "PENDIENTE") { res += Number(r.cantidad); pend++; porVerif += Number(r.total); }
  });
  const total = datos.cantidadNumeros;
  document.getElementById("kDisp").textContent = total - vend - res;
  document.getElementById("kRes").textContent = res;
  document.getElementById("kVend").textContent = vend;
  document.getElementById("kMonto").textContent = soles(monto);
  document.getElementById("kPorVerificar").textContent = pend + " · " + soles(porVerif);
  document.getElementById("progreso").style.width = ((vend + res) / total * 100).toFixed(1) + "%";

  const badge = document.getElementById("badgePend");
  badge.textContent = pend;
  badge.hidden = pend === 0;
}

// ---------- TABLA DE RESERVAS ----------
function reservasFiltradas() {
  const q = document.getElementById("buscar").value.trim().toLowerCase();
  const est = document.getElementById("filtroEstado").value;
  return datos.reservas.filter(r => {
    if (est && r.estado !== est) return false;
    if (!q) return true;
    if (/^\d{1,3}$/.test(q)) {
      const nums = String(r.numeros).split(",").map(s => s.trim());
      if (nums.includes(q)) return true;
    }
    return [r.codigo, r.nombre, r.celular, r.numeros].join(" ").toLowerCase().includes(q);
  });
}

function pintarReservas() {
  const lista = reservasFiltradas();
  const tbody = document.getElementById("tablaReservas");
  document.getElementById("sinReservas").hidden = lista.length > 0;

  tbody.innerHTML = lista.map(r => {
    const esperado = calcularTotal(Number(r.cantidad));
    const alertaMonto = Number(r.total) !== esperado
      ? `<small class="alerta-monto" title="Según la promoción debería ser ${soles(esperado)}">⚠ ${soles(esperado)}</small>` : "";
    const wa = r.celular
      ? `<a class="mini-btn mini-wa" target="_blank" rel="noopener" title="Escribir por WhatsApp"
           href="https://wa.me/51${escaparHtml(r.celular)}?text=${encodeURIComponent(mensajeCliente(r))}">${ICONO_CHAT}</a>` : "";
    const vence = r.estado === "PENDIENTE" && r.vence
      ? `<small class="vence">Vence ${formatoFechaCorta(r.vence)}</small>` : "";
    const nota = r.nota ? `<small class="nota">${escaparHtml(r.nota)}</small>` : "";

    return `<tr>
      <td data-t="Código"><code>${escaparHtml(r.codigo)}</code></td>
      <td data-t="Registrado">${formatoFechaCorta(r.registrado)}</td>
      <td data-t="Participante"><strong>${escaparHtml(r.nombre)}</strong><small>${escaparHtml(r.celular || "—")}</small>${nota}</td>
      <td data-t="Números"><span class="nums">${escaparHtml(r.numeros)}</span><small>${r.cantidad} número(s)</small></td>
      <td data-t="Total"><strong>${soles(r.total)}</strong>${alertaMonto}</td>
      <td data-t="Comprobante">${r.comprobante
        ? `<a class="mini-btn" href="${escaparHtml(r.comprobante)}" target="_blank" rel="noopener">Ver 🧾</a>`
        : "<small>—</small>"}</td>
      <td data-t="Estado"><span class="estado e-${r.estado}">${r.estado}</span>${vence}</td>
      <td data-t="Acciones"><div class="acciones">${botonesAccion(r)}${wa}</div></td>
    </tr>`;
  }).join("");
}

function botonesAccion(r) {
  const c = escaparHtml(r.codigo);
  if (r.estado === "PENDIENTE") {
    return `<button class="mini-btn mini-ok" onclick="accion('confirmar','${c}')">✔ Confirmar</button>
            <button class="mini-btn mini-no" onclick="accion('cancelar','${c}')">✖ Rechazar</button>`;
  }
  if (r.estado === "CONFIRMADO") {
    return `<button class="mini-btn mini-no" onclick="accion('cancelar','${c}')">Anular</button>`;
  }
  return `<button class="mini-btn" onclick="accion('reactivar','${c}')">↺ Reactivar</button>`;
}

function mensajeCliente(r) {
  if (r.estado === "CONFIRMADO") {
    return `🌿 *SORTEOS JEREMY ASHTA* 🌿\n\nHola ${r.nombre}, tu pago fue verificado ✅\n\n🧾 Código: ${r.codigo}\n🎟️ Tus números: ${r.numeros}\n\n¡Mucha suerte! 🍀`;
  }
  return `🌿 *SORTEOS JEREMY ASHTA* 🌿\n\nHola ${r.nombre}, te escribimos por tu reserva ${r.codigo} (números ${r.numeros}).`;
}

async function accion(tipo, codigo) {
  const r = datos.reservas.find(x => x.codigo === codigo);
  const textos = {
    confirmar: `¿Confirmar el pago de ${r.nombre}?\nNúmeros: ${r.numeros}\nTotal: ${soles(r.total)}\n\nRevisa antes que el Yape haya llegado a tu cuenta.`,
    cancelar: r.estado === "CONFIRMADO"
      ? `¿ANULAR la venta de ${r.nombre}? Los números ${r.numeros} volverán a estar disponibles.`
      : `¿Rechazar la reserva de ${r.nombre}? Los números ${r.numeros} se liberarán.`,
    reactivar: `¿Reactivar la reserva de ${r.nombre}? Volverá a quedar pendiente.`
  };
  if (!confirm(textos[tipo])) return;

  let nota;
  if (tipo === "cancelar") {
    nota = prompt("Motivo (opcional):", r.estado === "CONFIRMADO" ? "Venta anulada" : "Pago no recibido");
    if (nota === null) return;
  }

  try {
    await adminPost(tipo, { codigo, nota });
    aviso("Listo ✔", "ok", 2);
    await cargarDatos();
  } catch (e) {
    if (e.message !== "SESION_VENCIDA") aviso(e.message, "error", 6);
  }
}

function exportarCSV() {
  const filas = [["Codigo", "Registrado", "Nombre", "Celular", "Numeros", "Cantidad", "Total", "Estado", "Comprobante", "Nota"]];
  reservasFiltradas().forEach(r => filas.push([
    r.codigo, formatoFechaCorta(r.registrado), r.nombre, r.celular, r.numeros,
    r.cantidad, r.total, r.estado, r.comprobante, r.nota
  ]));
  const csv = filas.map(f => f.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reservas_sorteo_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- TABLERO ----------
function pintarTablero() {
  const mapa = mapaNumeros();
  const cont = document.getElementById("tablero");
  let html = "";
  for (let i = 1; i <= datos.cantidadNumeros; i++) {
    const r = mapa[String(i)];
    const cls = !r ? "l-disp" : r.estado === "CONFIRMADO" ? "l-vend" : "l-res";
    html += `<button type="button" class="celda ${cls}" onclick="verNumero(${i})">${i}</button>`;
  }
  cont.innerHTML = html;
}

function verNumero(n) {
  const r = mapaNumeros()[String(n)];
  const caja = document.getElementById("detalleNumero");
  caja.hidden = false;
  if (!r) {
    caja.innerHTML = `<strong>N° ${n}</strong> — Disponible`;
    return;
  }
  caja.innerHTML = `<strong>N° ${n}</strong> — <span class="estado e-${r.estado}">${r.estado}</span><br>
    ${escaparHtml(r.nombre)} · ${escaparHtml(r.celular || "sin celular")} · Código <code>${escaparHtml(r.codigo)}</code>
    <br><button class="mini-btn" onclick="irAReserva('${escaparHtml(r.codigo)}')">Ver reserva</button>`;
}

function irAReserva(codigo) {
  document.getElementById("buscar").value = codigo;
  document.getElementById("filtroEstado").value = "";
  cambiarVista("reservas");
  pintarReservas();
}

// ---------- VENTA MANUAL ----------
document.getElementById("mCelular").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 9);
});
document.getElementById("mNumeros").addEventListener("input", () => {
  const n = String(document.getElementById("mNumeros").value).split(/[,\s]+/).filter(x => /^\d+$/.test(x)).length;
  document.getElementById("mTotal").placeholder = n ? "Promoción: " + soles(calcularTotal(n)) : "Se calcula solo";
});

document.getElementById("formManual").addEventListener("submit", async ev => {
  ev.preventDefault();
  const btn = document.getElementById("btnManual");
  const payload = {
    nombre: document.getElementById("mNombre").value.trim(),
    celular: document.getElementById("mCelular").value.trim(),
    numeros: document.getElementById("mNumeros").value,
    total: document.getElementById("mTotal").value,
    nota: document.getElementById("mNota").value.trim()
  };
  btn.disabled = true;
  try {
    const r = await adminPost("ventaManual", payload);
    aviso("Venta registrada: " + r.codigo, "ok");
    ev.target.reset();
    await cargarDatos();
  } catch (e) {
    if (e.message !== "SESION_VENCIDA") aviso(e.message, "error", 6);
  } finally {
    btn.disabled = false;
  }
});

// ---------- CONFIGURACIÓN ----------
function pintarConfig() {
  const c = datos.config;
  document.getElementById("cFecha").value = (c.fechaSorteo || "").slice(0, 16);
  document.getElementById("cHoras").value = c.horasVencimiento;
  document.getElementById("cAbierto").checked = c.abierto;
}

document.getElementById("formConfig").addEventListener("submit", async ev => {
  ev.preventDefault();
  const btn = document.getElementById("btnConfig");
  btn.disabled = true;
  try {
    await adminPost("guardarConfig", {
      fechaSorteo: document.getElementById("cFecha").value,
      horasVencimiento: Number(document.getElementById("cHoras").value),
      abierto: document.getElementById("cAbierto").checked
    });
    aviso("Cambios guardados ✔", "ok");
    await cargarDatos();
  } catch (e) {
    if (e.message !== "SESION_VENCIDA") aviso(e.message, "error");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("formClave").addEventListener("submit", async ev => {
  ev.preventDefault();
  try {
    await adminPost("cambiarClave", {
      actual: document.getElementById("clActual").value,
      nueva: document.getElementById("clNueva").value
    });
    ev.target.reset();
    aviso("Clave cambiada ✔", "ok");
  } catch (e) {
    if (e.message !== "SESION_VENCIDA") aviso(e.message, "error");
  }
});

// ---------- GANADORES ----------
function pintarGanadores() {
  const premios = datos.premios || PREMIOS_DEF;
  const actuales = {};
  (datos.ganadores || []).forEach(g => actuales[g.puesto] = g);
  const mapa = mapaNumeros();

  document.getElementById("camposGanadores").innerHTML = premios.map((p, i) => {
    const g = actuales[i + 1];
    const r = g ? mapa[String(g.numero)] : null;
    const dueno = g ? (r && r.estado === "CONFIRMADO" ? `${escaparHtml(r.nombre)} · ${escaparHtml(r.celular)}` : "⚠ Número sin venta confirmada") : "";
    return `<div class="fila-ganador">
      <span class="puesto">${i + 1}° · ${soles(p)}</span>
      <input type="number" min="1" max="${datos.cantidadNumeros}" data-puesto="${i}" value="${g ? g.numero : ""}" placeholder="N°">
      <small class="dueno" data-dueno="${i}">${dueno}</small>
    </div>`;
  }).join("");

  document.querySelectorAll("#camposGanadores input").forEach(inp => {
    inp.addEventListener("input", () => {
      const r = mapaNumeros()[inp.value.trim()];
      const el = document.querySelector(`[data-dueno="${inp.dataset.puesto}"]`);
      el.textContent = !inp.value ? "" : r && r.estado === "CONFIRMADO"
        ? `${r.nombre} · ${r.celular}` : "⚠ Número sin venta confirmada";
    });
  });
}

document.getElementById("formGanadores").addEventListener("submit", async ev => {
  ev.preventDefault();
  const valores = [...document.querySelectorAll("#camposGanadores input")].map(i => i.value.trim());
  const llenos = valores.filter(Boolean);
  if (new Set(llenos).size !== llenos.length) return aviso("Hay números ganadores repetidos.", "alerta");
  if (!confirm(llenos.length ? "¿Publicar estos ganadores en la página?" : "¿Quitar los ganadores de la página?")) return;
  const btn = document.getElementById("btnGanadores");
  btn.disabled = true;
  try {
    await adminPost("guardarGanadores", { ganadores: valores });
    aviso("Ganadores publicados ✔", "ok");
    await cargarDatos();
  } catch (e) {
    if (e.message !== "SESION_VENCIDA") aviso(e.message, "error");
  } finally {
    btn.disabled = false;
  }
});

// ---------- PESTAÑAS ----------
function cambiarVista(v) {
  vistaActual = v;
  document.querySelectorAll(".pestana").forEach(b => b.classList.toggle("activa", b.dataset.vista === v));
  document.querySelectorAll(".vista").forEach(s => s.hidden = s.id !== "vista-" + v);
}
document.querySelectorAll(".pestana").forEach(b => b.addEventListener("click", () => cambiarVista(b.dataset.vista)));
document.getElementById("buscar").addEventListener("input", () => datos && pintarReservas());
document.getElementById("filtroEstado").addEventListener("change", () => datos && pintarReservas());

// ---------- INICIO ----------
document.addEventListener("DOMContentLoaded", () => {
  if (!hayServidor()) {
    document.getElementById("vistaLogin").hidden = true;
    document.getElementById("vistaSinServidor").hidden = false;
    return;
  }
  if (token) entrar();

  // Refresco automático cada 60 s mientras la pestaña esté visible
  setInterval(() => {
    if (token && !document.hidden && datos) cargarDatos();
  }, 60000);
});
