// ==========================================================
//  PÁGINA PÚBLICA — SORTEOS JEREMY ASHTA
//  Requiere: config.js y comun.js cargados antes.
// ==========================================================

let seleccionados = [];      // números elegidos por el visitante (texto)
let numerosVendidos = [];    // confirmados por el admin
let numerosReservados = [];  // pendientes de verificación
let sorteoAbierto = true;
let fechaSorteo = leerFecha(CONFIG.fechaSorteo);
let enviando = false;
let temporizadorCuenta = null;

// ==========================================
// CAMBIAR DE PANTALLA
// ==========================================

function irAlSorteo() {
  const portada = document.getElementById("portada");
  const sorteo = document.getElementById("sorteo");
  if (!portada || !sorteo) return;

  portada.style.setProperty("display", "none", "important");
  sorteo.style.setProperty("display", "block", "important");
  sorteo.classList.add("mostrar");

  generarNumeros();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================
// MENÚ
// ==========================================

function toggleMenu() {
  document.getElementById("menu").classList.toggle("activo");
}

function cerrarMenu() {
  document.getElementById("menu").classList.remove("activo");
}

// ==========================================
// ESTADO DESDE EL SERVIDOR (Google Sheets)
// ==========================================

async function cargarEstado() {
  if (!hayServidor()) {
    actualizarConteo();
    return;
  }

  try {
    const r = await apiGet("estado");
    numerosVendidos = (r.vendidos || []).map(String);
    numerosReservados = (r.reservados || []).map(String);
    sorteoAbierto = r.abierto !== false;
    if (r.fechaSorteo) fechaSorteo = leerFecha(r.fechaSorteo);
    if (r.fechaSorteo === "") fechaSorteo = null;

    // Si alguien tomó un número que yo tenía seleccionado, lo quito
    const ocupados = new Set([...numerosVendidos, ...numerosReservados]);
    const perdidos = seleccionados.filter(n => ocupados.has(n));
    if (perdidos.length) {
      seleccionados = seleccionados.filter(n => !ocupados.has(n));
      aviso("Los números " + perdidos.join(", ") + " acaban de ser tomados por otra persona.", "alerta", 6);
    }

    generarNumeros();
    mostrarFecha();
    mostrarGanadores(r.ganadores || []);
    document.getElementById("avisoCerrado").hidden = sorteoAbierto;
  } catch (e) {
    console.error(e);
    document.getElementById("conteoNumeros").textContent =
      "⚠️ No se pudo actualizar el estado de los numeritos. Revisa tu conexión.";
  }
}

// ==========================================
// GENERAR LOS NÚMEROS
// ==========================================

function generarNumeros() {
  const cuadricula = document.getElementById("cuadricula");
  if (!cuadricula) return;

  const vendidos = new Set(numerosVendidos);
  const reservados = new Set(numerosReservados);
  const fragmento = document.createDocumentFragment();

  for (let i = 1; i <= CONFIG.cantidadNumeros; i++) {
    const numero = String(i);
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = numero;
    boton.classList.add("numero");

    if (vendidos.has(numero)) {
      boton.classList.add("vendido");
      boton.disabled = true;
      boton.title = "Número vendido";
    } else if (reservados.has(numero)) {
      boton.classList.add("reservado");
      boton.disabled = true;
      boton.title = "Número reservado";
    } else {
      boton.classList.add("disponible");
      if (seleccionados.includes(numero)) boton.classList.add("seleccionado");
      if (!sorteoAbierto) boton.disabled = true;
      boton.addEventListener("click", () => seleccionarNumero(numero));
    }

    fragmento.appendChild(boton);
  }

  cuadricula.innerHTML = "";
  cuadricula.appendChild(fragmento);
  actualizarResumen();
  actualizarConteo();
}

function actualizarConteo() {
  const el = document.getElementById("conteoNumeros");
  if (!el) return;
  const disp = CONFIG.cantidadNumeros - numerosVendidos.length - numerosReservados.length;
  el.textContent = `Quedan ${disp} de ${CONFIG.cantidadNumeros} numeritos disponibles`;
}

// ==========================================
// SELECCIONAR NÚMEROS
// ==========================================

function seleccionarNumero(numero) {
  if (!sorteoAbierto) return;
  if (numerosVendidos.includes(numero) || numerosReservados.includes(numero)) return;

  if (seleccionados.includes(numero)) {
    seleccionados = seleccionados.filter(n => n !== numero);
  } else {
    seleccionados.push(numero);
  }
  seleccionados.sort((a, b) => Number(a) - Number(b));

  // Solo cambio el botón tocado (más rápido que redibujar todo)
  const boton = [...document.querySelectorAll("#cuadricula .numero")][Number(numero) - 1];
  if (boton) boton.classList.toggle("seleccionado", seleccionados.includes(numero));
  actualizarResumen();
}

// ==========================================
// RESUMEN Y MONTO EXACTO DE YAPE
// ==========================================

function actualizarResumen() {
  const cantidad = seleccionados.length;
  const total = calcularTotal(cantidad);
  const texto = cantidad === 0 ? "Ninguno" : seleccionados.join(", ");

  setTexto("numerosSeleccionados", texto);
  setTexto("total", soles(total));
  setTexto("montoYape", soles(total));   // ← antes no se actualizaba
  setTexto("formNumeros", texto);
  setTexto("formTotal", soles(total));
}

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

// ==========================================
// IR AL FORMULARIO
// ==========================================

function abrirFormulario() {
  if (seleccionados.length === 0) {
    aviso("Primero selecciona tus numeritos.", "alerta");
    return;
  }
  document.getElementById("participar")?.scrollIntoView({ behavior: "smooth" });
}

// ==========================================
// FECHA Y CUENTA REGRESIVA
// ==========================================

function mostrarFecha() {
  setTexto("fechaSorteo", formatoFechaLarga(fechaSorteo));
  const caja = document.getElementById("cuentaRegresiva");

  clearInterval(temporizadorCuenta);
  if (!fechaSorteo) {
    caja.hidden = true;
    return;
  }
  caja.hidden = false;

  const pintar = () => {
    const falta = fechaSorteo.getTime() - Date.now();
    if (falta <= 0) {
      setTexto("cuentaTitulo", "🎉 ¡EL SORTEO YA SE REALIZÓ O ESTÁ EN CURSO!");
      ["cdDias", "cdHoras", "cdMin", "cdSeg"].forEach(id => setTexto(id, "00"));
      clearInterval(temporizadorCuenta);
      return;
    }
    const s = Math.floor(falta / 1000);
    setTexto("cuentaTitulo", "FALTAN PARA EL SORTEO");
    setTexto("cdDias", String(Math.floor(s / 86400)).padStart(2, "0"));
    setTexto("cdHoras", String(Math.floor((s % 86400) / 3600)).padStart(2, "0"));
    setTexto("cdMin", String(Math.floor((s % 3600) / 60)).padStart(2, "0"));
    setTexto("cdSeg", String(s % 60).padStart(2, "0"));
  };
  pintar();
  temporizadorCuenta = setInterval(pintar, 1000);
}

// ==========================================
// GANADORES
// ==========================================

function mostrarGanadores(ganadores) {
  const lista = document.getElementById("ganadoresLista");
  const vacio = document.getElementById("ganadoresVacio");
  const validos = ganadores.filter(g => g && g.numero);

  if (validos.length === 0) {
    lista.hidden = true;
    vacio.hidden = false;
    return;
  }

  const medallas = ["🥇", "🥈", "🥉", "🏅"];
  lista.innerHTML = validos.map(g => `
    <div class="ganador">
      <span class="ganador-medalla">${medallas[(g.puesto || 1) - 1] || "🏅"}</span>
      <div>
        <small>${escaparHtml(g.puesto)}° PUESTO · ${soles(g.premio)}</small>
        <strong>N° ${escaparHtml(g.numero)}</strong>
        <em>${escaparHtml(g.nombre || "")}</em>
      </div>
    </div>`).join("");
  lista.hidden = false;
  vacio.hidden = true;
}

// ==========================================
// VISTA PREVIA DEL COMPROBANTE
// ==========================================

function prepararVistaPrevia() {
  const input = document.getElementById("comprobante");
  const vista = document.getElementById("vistaComprobante");
  input.addEventListener("change", () => {
    const archivo = input.files && input.files[0];
    if (!archivo) { vista.hidden = true; return; }
    vista.src = URL.createObjectURL(archivo);
    vista.hidden = false;
  });
}

// ==========================================
// ENVIAR PARTICIPACIÓN
// ==========================================

async function enviarParticipacion() {
  if (enviando) return;

  const nombre = document.getElementById("nombre").value.trim().replace(/\s+/g, " ");
  const celular = document.getElementById("celular").value.trim();
  const archivo = document.getElementById("comprobante").files[0];

  if (!sorteoAbierto) return aviso("Las ventas de este sorteo están cerradas.", "error");
  if (seleccionados.length === 0) return aviso("Primero selecciona tus numeritos.", "alerta");
  if (nombre.length < 5) return aviso("Ingresa tu nombre completo.", "alerta");
  if (!/^9\d{8}$/.test(celular)) return aviso("Ingresa un celular válido de 9 dígitos (empieza con 9).", "alerta");
  if (!archivo) return aviso("Adjunta la captura de tu Yape.", "alerta");

  const total = calcularTotal(seleccionados.length);
  const numerosTexto = seleccionados.join(", ");

  if (!confirm(
    "Confirma tu participación:\n\n" +
    "Nombre: " + nombre + "\n" +
    "Celular: " + celular + "\n" +
    "Números: " + numerosTexto + "\n" +
    "Total yapeado: " + soles(total) + "\n\n¿Todo está correcto?"
  )) return;

  enviando = true;
  const boton = document.getElementById("botonEnviar");
  boton.disabled = true;
  boton.textContent = "ENVIANDO...";

  try {
    let codigo, venceTexto = "";

    if (hayServidor()) {
      const imagen = await comprimirImagen(archivo);
      const r = await apiPost("reservar", {
        nombre, celular,
        numeros: seleccionados.map(Number),
        imagen
      });
      codigo = r.codigo;
      if (r.vence) venceTexto = "Verificaremos tu pago antes del " + formatoFechaCorta(r.vence);
    } else {
      codigo = "SA-" + Date.now().toString().slice(-8);
      venceTexto = "Modo demostración: envía tu comprobante por WhatsApp para confirmar.";
    }

    mostrarReservaOk({ codigo, nombre, celular, numerosTexto, total, venceTexto });

    // Marco como reservados en pantalla de inmediato
    numerosReservados.push(...seleccionados);
    seleccionados = [];
    generarNumeros();
    document.getElementById("comprobante").value = "";
    document.getElementById("vistaComprobante").hidden = true;

  } catch (e) {
    console.error(e);
    aviso(e.message || "No se pudo registrar tu reserva. Intenta de nuevo.", "error", 7);
    cargarEstado(); // por si otro tomó los números
  } finally {
    enviando = false;
    boton.disabled = false;
    boton.textContent = "ENVIAR MI PARTICIPACIÓN";
  }
}

function mostrarReservaOk({ codigo, nombre, celular, numerosTexto, total, venceTexto }) {
  setTexto("okCodigo", codigo);
  setTexto("okNumeros", numerosTexto);
  setTexto("okTotal", soles(total));
  setTexto("okVence", venceTexto);

  const mensaje =
    "🌿 *" + CONFIG.nombreSorteo + "* 🌿\n\n" +
    "¡Hola! Acabo de registrar mi participación.\n\n" +
    "🧾 *Código:* " + codigo + "\n" +
    "👤 *Nombre:* " + nombre + "\n" +
    "📱 *Celular:* " + celular + "\n" +
    "🎟️ *Números:* " + numerosTexto + "\n" +
    "💰 *Total yapeado:* " + soles(total) + "\n\n" +
    (hayServidor() ? "Mi comprobante ya quedó adjunto en la web." : "Adjunto mi comprobante de Yape.") +
    "\n\n¡Muchas gracias! 🍀";

  document.getElementById("okWhatsapp").href =
    "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(mensaje);

  document.querySelector(".formulario-grid").hidden = true;
  const ok = document.getElementById("reservaOk");
  ok.hidden = false;
  ok.scrollIntoView({ behavior: "smooth", block: "center" });
}

function nuevaCompra() {
  document.getElementById("reservaOk").hidden = true;
  document.querySelector(".formulario-grid").hidden = false;
  document.getElementById("numeros").scrollIntoView({ behavior: "smooth" });
}

// ==========================================
// INICIO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const contacto = document.getElementById("whatsappContacto");
  if (contacto) {
    contacto.href = "https://wa.me/" + CONFIG.whatsapp;
    contacto.innerHTML = ICONO_CHAT;
  }

  // Solo dígitos en el celular
  const cel = document.getElementById("celular");
  cel.addEventListener("input", () => { cel.value = cel.value.replace(/\D/g, "").slice(0, 9); });

  prepararVistaPrevia();
  generarNumeros();
  mostrarFecha();
  cargarEstado();

  if (hayServidor()) {
    setInterval(() => {
      if (!document.hidden && !enviando) cargarEstado();
    }, CONFIG.refrescoSegundos * 1000);
  }
});
