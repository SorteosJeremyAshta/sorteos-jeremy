// =====================================
// CONFIGURACIÓN DEL SORTEO
// =====================================

const CONFIG = {
  precio: 5,
  cantidadNumeros: 275,
  fechaSorteo: "Por definir",
  whatsapp: "51956069098"
};

// =====================================
// ESTADOS DE LOS NÚMEROS
// =====================================

const numerosVendidos = [];
const numerosReservados = [];

let seleccionados = [];

// =====================================
// INGRESAR AL SORTEO
// =====================================

function irAlSorteo() {
  const portada = document.getElementById("portada");
  const sorteo = document.getElementById("sorteo");

  portada.style.setProperty("display", "none", "important");
  sorteo.style.setProperty("display", "block", "important");

  generarNumeros();
  actualizarResumen();

  window.scrollTo(0, 0);
}

// =====================================
// GENERAR LOS 275 NÚMEROS
// =====================================

function generarNumeros() {
  const cuadricula = document.getElementById("cuadricula");
  if (!cuadricula) return;

  cuadricula.innerHTML = "";

  for (let numero = 1; numero <= CONFIG.cantidadNumeros; numero++) {
    const boton = document.createElement("button");

    boton.textContent = numero;
    boton.classList.add("numero");

    if (numerosVendidos.includes(numero)) {
      boton.classList.add("vendido");
      boton.disabled = true;
    } else if (numerosReservados.includes(numero)) {
      boton.classList.add("reservado");
      boton.disabled = true;
    } else {
      boton.addEventListener("click", () => seleccionarNumero(numero, boton));
    }

    if (seleccionados.includes(numero)) {
      boton.classList.add("seleccionado");
    }

    cuadricula.appendChild(boton);
  }
}

// =====================================
// SELECCIONAR NÚMEROS
// =====================================

function seleccionarNumero(numero, boton) {
  if (seleccionados.includes(numero)) {
    seleccionados = seleccionados.filter(n => n !== numero);
    boton.classList.remove("seleccionado");
  } else {
    seleccionados.push(numero);
    boton.classList.add("seleccionado");
  }

  actualizarResumen();
}

// =====================================
// CALCULAR TOTAL
// =====================================

function calcularTotal(cantidad) {
  return Math.floor(cantidad / 3) * 10 + (cantidad % 3) * 5;
}

// =====================================
// ACTUALIZAR RESUMEN
// =====================================

function actualizarResumen() {
  const cantidad = seleccionados.length;
  const total = calcularTotal(cantidad);

  const numerosSeleccionados = document.getElementById("numerosSeleccionados");
  const totalElemento = document.getElementById("total");

  if (numerosSeleccionados) {
    numerosSeleccionados.textContent = cantidad
      ? seleccionados.sort((a, b) => a - b).join(", ")
      : "Ninguno";
  }

  if (totalElemento) {
    totalElemento.textContent = `S/ ${total.toFixed(2)}`;
  }
}

// =====================================
// MENÚ
// =====================================

function toggleMenu() {
  document.getElementById("menu")?.classList.toggle("activo");
}

function cerrarMenu() {
  document.getElementById("menu")?.classList.remove("activo");
}

// =====================================
// FORMULARIO
// =====================================

function abrirFormulario() {
  if (seleccionados.length === 0) {
    alert("Primero selecciona tus números.");
    return;
  }

  const formulario = document.getElementById("participar");
  if (formulario) {
    formulario.style.display = "block";
    formulario.scrollIntoView({ behavior: "smooth" });
  }
}

// =====================================
// ENVIAR PARTICIPACIÓN POR WHATSAPP
// =====================================

function enviarWhatsApp() {
  const nombre = document.getElementById("nombre")?.value.trim();
  const celular = document.getElementById("celular")?.value.trim();
  const comprobante = document.getElementById("comprobante")?.files[0];

  if (!nombre || !celular || !comprobante) {
    alert("Completa tus datos y selecciona tu comprobante de Yape.");
    return;
  }

  if (!/^\d{9}$/.test(celular)) {
    alert("Ingresa un número de celular válido de 9 dígitos.");
    return;
  }

  if (seleccionados.length === 0) {
    alert("Selecciona al menos un número.");
    return;
  }

  const total = calcularTotal(seleccionados.length);

  const mensaje =
    `¡Hola! Quiero participar en el sorteo.%0A%0A` +
    `Nombre: ${encodeURIComponent(nombre)}%0A` +
    `Celular: ${encodeURIComponent(celular)}%0A` +
    `Números: ${seleccionados.sort((a, b) => a - b).join(", ")}%0A` +
    `Total: S/ ${total.toFixed(2)}%0A%0A` +
    `Adjuntaré mi comprobante de Yape.`;

  window.open(
    `https://wa.me/${CONFIG.whatsapp}?text=${mensaje}`,
    "_blank"
  );
}

// =====================================
// INICIAR PÁGINA
// =====================================

document.addEventListener("DOMContentLoaded", () => {
  generarNumeros();
  actualizarResumen();

  const fecha = document.getElementById("fechaSorteo");
  if (fecha) fecha.textContent = CONFIG.fechaSorteo;

  const contacto = document.getElementById("whatsappContacto");
  if (contacto) {
    contacto.href = `https://wa.me/${CONFIG.whatsapp}`;
  }
});
