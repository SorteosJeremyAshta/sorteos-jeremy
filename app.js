// ==========================================
// CONFIGURACIÓN DEL SORTEO
// ==========================================

const CONFIG = {
  precio: 5,
  cantidadNumeros: 275,
  fechaSorteo: "Por definir",
  whatsapp: "51956069098"
};

// ==========================================
// ESTADOS DE LOS NÚMEROS
// ==========================================

const numerosVendidos = [];
const numerosReservados = [];

let seleccionados = [];
let envioEnProceso = false;

// ==========================================
// CAMBIAR DE PANTALLA
// ==========================================

function irAlSorteo() {
  const portada = document.getElementById("portada");
  const sorteo = document.getElementById("sorteo");

  portada.style.setProperty("display", "none", "important");
  sorteo.style.setProperty("display", "block", "important");

  sorteo.classList.add("mostrar");

  generarNumeros();
  actualizarResumen();

  window.scrollTo(0, 0);
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
// GENERAR LOS 275 NÚMEROS
// ==========================================

function generarNumeros() {
  const cuadricula = document.getElementById("cuadricula");

  if (!cuadricula) return;

  cuadricula.innerHTML = "";

  for (let i = 1; i <= CONFIG.cantidadNumeros; i++) {
    const numero = String(i);
    const boton = document.createElement("button");

    boton.type = "button";
    boton.textContent = numero;
    boton.classList.add("numero");

    if (numerosVendidos.includes(numero)) {
      boton.classList.add("vendido");
      boton.disabled = true;
      boton.title = "Número vendido";

    } else if (numerosReservados.includes(numero)) {
      boton.classList.add("reservado");
      boton.disabled = true;
      boton.title = "Número reservado";

    } else {
      if (seleccionados.includes(numero)) {
        boton.classList.add("seleccionado");
      }

      boton.addEventListener("click", () => {
        seleccionarNumero(numero);
      });
    }

    cuadricula.appendChild(boton);
  }

  actualizarResumen();
}

// ==========================================
// SELECCIONAR NÚMEROS
// ==========================================

function seleccionarNumero(numero) {
  if (
    numerosVendidos.includes(numero) ||
    numerosReservados.includes(numero)
  ) {
    return;
  }

  if (seleccionados.includes(numero)) {
    seleccionados = seleccionados.filter((n) => n !== numero);
  } else {
    seleccionados.push(numero);
  }

  seleccionados.sort((a, b) => Number(a) - Number(b));

  generarNumeros();
}

// ==========================================
// CALCULAR TOTAL
// PROMOCIÓN: 3 NÚMEROS POR S/10
// ==========================================

function calcularTotal(cantidad) {
  const grupos = Math.floor(cantidad / 3);
  const restantes = cantidad % 3;

  return (grupos * 10) + (restantes * CONFIG.precio);
}

// ==========================================
// ACTUALIZAR RESUMEN
// ==========================================

function actualizarResumen() {
  const textoNumeros = document.getElementById("numerosSeleccionados");
  const textoTotal = document.getElementById("total");

  if (!textoNumeros || !textoTotal) return;

  textoNumeros.textContent =
    seleccionados.length === 0
      ? "Ninguno"
      : seleccionados.join(", ");

  const total = calcularTotal(seleccionados.length);

  textoTotal.textContent = "S/. " + total.toFixed(2);
}

// ==========================================
// ABRIR FORMULARIO
// ==========================================

function abrirFormulario() {
  if (seleccionados.length === 0) {
    alert("Primero selecciona tus numeritos.");
    return;
  }

  document.getElementById("participar").scrollIntoView({
    behavior: "smooth"
  });
}

// ==========================================
// ENVIAR PARTICIPACIÓN POR WHATSAPP
// ==========================================

async function enviarWhatsApp() {
  if (envioEnProceso) return;

  const nombre = document.getElementById("nombre").value.trim();
  const celular = document.getElementById("celular").value.trim();
  const comprobante = document.getElementById("comprobante");

  if (!nombre) {
    alert("Ingresa tu nombre completo.");
    return;
  }

  if (!/^\d{9}$/.test(celular)) {
    alert("Ingresa un número de celular válido de 9 dígitos.");
    return;
  }

  if (!comprobante.files || comprobante.files.length === 0) {
    alert("Debes seleccionar tu comprobante de Yape.");
    return;
  }

  if (seleccionados.length === 0) {
    alert("Primero selecciona tus numeritos.");
    return;
  }

  const total = calcularTotal(seleccionados.length);
  const numerosTexto = [...seleccionados].join(", ");

  const confirmar = confirm(
    "CONFIRMA TU PARTICIPACIÓN\n\n" +
    "Nombre: " + nombre + "\n" +
    "Celular: " + celular + "\n" +
    "Números: " + numerosTexto + "\n" +
    "Total: S/. " + total.toFixed(2) + "\n\n" +
    "¿Deseas continuar a WhatsApp?"
  );

  if (!confirmar) return;

  envioEnProceso = true;

  const boton = document.querySelector(".boton-enviar");

  if (boton) {
    boton.disabled = true;
    boton.textContent = "ABRIENDO WHATSAPP...";
  }

  try {
    const mensaje =
      "🌿 *SORTEOS JEREMY ASHTA* 🌿\n\n" +
      "¡Hola! Quiero confirmar mi participación.\n\n" +
      "👤 *Nombre:* " + nombre + "\n" +
      "📱 *Celular:* " + celular + "\n" +
      "🎟️ *Números:* " + numerosTexto + "\n" +
      "💰 *Total a pagar:* S/. " + total.toFixed(2) + "\n\n" +
      "Adjunto mi comprobante de Yape para confirmar mi pago.\n\n" +
      "¡Muchas gracias! 🍀";

    const url =
      "https://wa.me/" +
      CONFIG.whatsapp +
      "?text=" +
      encodeURIComponent(mensaje);

    window.location.href = url;

  } catch (error) {
    console.error("Error al enviar:", error);
    alert("Ocurrió un error. Inténtalo nuevamente.");

  } finally {
    envioEnProceso = false;

    if (boton) {
      boton.disabled = false;
      boton.textContent = "ENVIAR POR WHATSAPP";
    }
  }
}

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const fecha = document.getElementById("fechaSorteo");

  if (fecha) {
    fecha.textContent = CONFIG.fechaSorteo;
  }

  const contacto = document.getElementById("whatsappContacto");

  if (contacto) {
    contacto.href = "https://wa.me/" + CONFIG.whatsapp;
  }

  generarNumeros();
  actualizarResumen();
});
