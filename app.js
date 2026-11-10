
const CONFIG = {
  precio: 5,
  cantidadNumeros: 275,
  fechaSorteo: "Por definir",
  whatsapp: "51956069098"
};

const numerosVendidos = [];
const numerosReservados = [];

let seleccionados = [];


// ENTRAR A LA SEGUNDA PANTALLA
function irAlSorteo() {
  const portada = document.getElementById("portada");
  const sorteo = document.getElementById("sorteo");

  if (!portada || !sorteo) {
    console.error("No se encontraron las secciones del sorteo.");
    alert("No se pudo abrir el sorteo. Recarga la página.");
    return;
  }

  portada.classList.add("ocultar");
  sorteo.classList.add("mostrar");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// GENERAR LOS 275 NUMEROS
function generarNumeros() {
  const cuadricula = document.getElementById("cuadricula");

  if (!cuadricula) return;

  cuadricula.innerHTML = "";

  for (let i = 1; i <= CONFIG.cantidadNumeros; i++) {
    const numero = String(i);
    const boton = document.createElement("button");

    boton.type = "button";
    boton.textContent = numero;
    boton.className = "numero";

    if (numerosVendidos.includes(numero)) {
      boton.classList.add("vendido");
      boton.disabled = true;
      boton.title = "Número vendido";

    } else if (numerosReservados.includes(numero)) {
      boton.classList.add("reservado");
      boton.disabled = true;
      boton.title = "Número reservado";

    } else {
      boton.addEventListener("click", function () {
        seleccionarNumero(numero, boton);
      });
    }

    cuadricula.appendChild(boton);
  }
}


// SELECCIONAR Y DESELECCIONAR NUMEROS
function seleccionarNumero(numero, boton) {
  if (seleccionados.includes(numero)) {
    seleccionados = seleccionados.filter(function (n) {
      return n !== numero;
    });

    boton.classList.remove("seleccionado");

  } else {
    seleccionados.push(numero);
    boton.classList.add("seleccionado");
  }

  actualizarResumen();
}


// CALCULAR PRECIO Y PROMOCION
// 1 número = S/5
// 2 números = S/10
// 3 números = S/10
// 4 números = S/15
// 5 números = S/20
// 6 números = S/20
function calcularTotal(cantidad) {
  const grupos = Math.floor(cantidad / 3);
  const restantes = cantidad % 3;

  return (grupos * 10) + (restantes * CONFIG.precio);
}


// ACTUALIZAR RESUMEN Y MONTO DE YAPE
function actualizarResumen() {
  const ordenados = seleccionados.slice().sort(function (a, b) {
    return Number(a) - Number(b);
  });

  const total = calcularTotal(ordenados.length);

  const numerosElemento = document.getElementById("numerosSeleccionados");
  const totalElemento = document.getElementById("total");
  const montoYape = document.getElementById("montoYape");

  if (numerosElemento) {
    numerosElemento.textContent = ordenados.length
      ? ordenados.join(", ")
      : "Ninguno";
  }

  if (totalElemento) {
    totalElemento.textContent = "S/. " + total.toFixed(2);
  }

  // Actualizar automáticamente el monto que debe pagar por Yape
  if (montoYape) {
    montoYape.textContent = "S/ " + total.toFixed(2);
  }
}


// MENU
function toggleMenu() {
  const menu = document.getElementById("menu");

  if (menu) {
    menu.classList.toggle("activo");
  }
}

function cerrarMenu() {
  const menu = document.getElementById("menu");

  if (menu) {
    menu.classList.remove("activo");
  }
}


// IR AL FORMULARIO
function abrirFormulario() {
  if (seleccionados.length === 0) {
    alert("Primero selecciona tus numeritos.");
    return;
  }

  const formulario = document.getElementById("participar");

  if (formulario) {
    formulario.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


// ENVIAR PARTICIPACION DIRECTAMENTE A WHATSAPP
function enviarWhatsApp() {
  const nombreElemento = document.getElementById("nombre");
  const celularElemento = document.getElementById("celular");
  const archivo = document.getElementById("comprobante");

  if (!nombreElemento || !celularElemento || !archivo) {
    alert("No se encontró el formulario completo.");
    return;
  }

  const nombre = nombreElemento.value.trim();
  const celular = celularElemento.value.trim();
  const comprobante = archivo.files[0];

  if (seleccionados.length === 0) {
    alert("Selecciona al menos un número.");
    return;
  }

  if (!nombre || !celular) {
    alert("Completa tu nombre y número de celular.");
    return;
  }

  if (!/^[0-9]{9}$/.test(celular)) {
    alert("Ingresa un celular válido de 9 dígitos.");
    return;
  }

  if (!comprobante || !comprobante.type.startsWith("image/")) {
    alert("Adjunta tu comprobante de Yape.");
    return;
  }

  const telefono = CONFIG.whatsapp.replace(/[^0-9]/g, "");

  if (!/^51[0-9]{9}$/.test(telefono)) {
    alert("Configura un número válido de WhatsApp en app.js.");
    return;
  }

  const ordenados = seleccionados.slice().sort(function (a, b) {
    return Number(a) - Number(b);
  });

  const total = calcularTotal(ordenados.length);

  const mensaje =
    "🌿 SORTEOS JEREMY ASHTA 🌿\n\n" +
    "🎟️ NUEVA PARTICIPACIÓN\n\n" +
    "👤 Nombre: " + nombre + "\n" +
    "📱 Celular: " + celular + "\n\n" +
    "🎫 Números: " + ordenados.join(", ") + "\n\n" +
    "💰 Total a pagar: S/ " + total.toFixed(2) + "\n" +
    "📅 Fecha: " + CONFIG.fechaSorteo + "\n\n" +
    "📎 Adjunto mi comprobante de pago.";

  const url =
    "https://wa.me/" + telefono + "?text=" + encodeURIComponent(mensaje);

  window.open(url, "_blank");
}


// INICIALIZACION
document.addEventListener("DOMContentLoaded", function () {
  generarNumeros();
  actualizarResumen();

  const fecha = document.getElementById("fechaSorteo");

  if (fecha) {
    fecha.textContent = CONFIG.fechaSorteo;
  }

  const telefono = CONFIG.whatsapp.replace(/[^0-9]/g, "");
  const contacto = document.getElementById("whatsappContacto");

  if (contacto && /^51[0-9]{9}$/.test(telefono)) {
    contacto.href = "https://wa.me/" + telefono;
  }
});
