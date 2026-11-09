
const CONFIG = {
  precio: 5,
  cantidadNumeros: 275,
  fechaSorteo: "Por definir",
  whatsapp: "51956069098"
};

// ==========================================
// FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAeF2aSss4WLPB5s_lk4dz6IWykzFAnMyo",
  authDomain: "sorteos-jeremy-ashta.firebaseapp.com",
  projectId: "sorteos-jeremy-ashta",
  storageBucket: "sorteos-jeremy-ashta.firebasestorage.app",
  messagingSenderId: "1063051655246",
  appId: "1:1063051655246:web:a0999b935ee5aaba306b1f"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let firebaseListo = false;
let seleccionados = [];

const numerosVendidos = [];
const numerosReservados = [];

let reservaEnProceso = false;

// ==========================================
// INICIAR FIREBASE Y ESCUCHAR LOS NÚMEROS
// ==========================================

async function iniciarFirebase() {
  try {
    await auth.signInAnonymously();

    firebaseListo = true;

    console.log("Firebase conectado correctamente.");

    escucharNumeros();

  } catch (error) {
    console.error("Error al conectar Firebase:", error);

    alert(
      "No se pudo conectar con Firebase. " +
      "Verifica tu conexión y la configuración de Firebase."
    );
  }
}

// ==========================================
// ACTUALIZACIÓN AUTOMÁTICA DE LOS NÚMEROS
// ==========================================

function escucharNumeros() {
  db.collection("numeros").onSnapshot(
    (snapshot) => {

      numerosVendidos.length = 0;
      numerosReservados.length = 0;

      snapshot.forEach((doc) => {
        const datos = doc.data();
        const numero = String(datos.numero || doc.id);

        if (datos.estado === "vendido") {
          numerosVendidos.push(numero);
        }

        if (datos.estado === "reservado") {
          numerosReservados.push(numero);
        }
      });

      generarNumeros();

    },
    (error) => {
      console.error("Error al escuchar números:", error);

      alert(
        "No se pudieron cargar los números. " +
        "Revisa las reglas de Firestore."
      );
    }
  );
}

// ==========================================
// PANTALLAS
// ==========================================

function irAlSorteo() {
  document.getElementById("portada").hidden = true;
  document.getElementById("sorteo").hidden = false;

  document.getElementById("sorteo").scrollIntoView({
    behavior: "smooth"
  });
}

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

      boton.classList.add("disponible");

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

    seleccionados = seleccionados.filter(
      (n) => n !== numero
    );

  } else {

    seleccionados.push(numero);

  }

  seleccionados.sort((a, b) => Number(a) - Number(b));

  generarNumeros();
}

// ==========================================
// CALCULAR PRECIO
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

  const textoNumeros = document.getElementById(
    "numerosSeleccionados"
  );

  const textoTotal = document.getElementById("total");

  if (!textoNumeros || !textoTotal) return;

  if (seleccionados.length === 0) {

    textoNumeros.textContent = "Ninguno";

  } else {

    textoNumeros.textContent = seleccionados.join(", ");

  }

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

  const formulario = document.getElementById("participar");

  formulario.scrollIntoView({
    behavior: "smooth"
  });
}

// ==========================================
// RESERVAR NÚMEROS EN FIRESTORE
// ==========================================

async function reservarNumeros() {

  if (!firebaseListo) {
    throw new Error("Firebase todavía no está conectado.");
  }

  if (seleccionados.length === 0) {
    throw new Error("No has seleccionado números.");
  }

  const numeros = [...seleccionados];

  const reservaRef = db.collection("reservas").doc();

  const reservaId = reservaRef.id;

  await db.runTransaction(async (transaction) => {

    const referencias = numeros.map((numero) =>
      db.collection("numeros").doc(numero)
    );

    const documentos = [];

    // Primero se leen todos los documentos.
    for (const referencia of referencias) {
      documentos.push(await transaction.get(referencia));
    }

    // Se comprueba que todos estén disponibles.
    for (let i = 0; i < documentos.length; i++) {

      if (documentos[i].exists) {
        throw new Error(
          "El número " + numeros[i] +
          " ya fue reservado o vendido. Selecciona otro."
        );
      }
    }

    // Si todos están disponibles, se reservan juntos.
    for (let i = 0; i < referencias.length; i++) {

      transaction.set(referencias[i], {
        numero: Number(numeros[i]),
        estado: "reservado",
        reservaId: reservaId,
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

    }

  });

  return reservaId;
}

// ==========================================
// ENVIAR PARTICIPACIÓN POR WHATSAPP
// ==========================================

async function enviarWhatsApp() {

  if (reservaEnProceso) return;

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

  if (!firebaseListo) {
    alert("Espera un momento mientras se conecta Firebase.");
    return;
  }

  const total = calcularTotal(seleccionados.length);

  const numerosTexto = [...seleccionados].join(", ");

  const confirmar = confirm(
    "Confirma tu participación:\n\n" +
    "Nombre: " + nombre + "\n" +
    "Celular: " + celular + "\n" +
    "Números: " + numerosTexto + "\n" +
    "Total: S/. " + total.toFixed(2) + "\n\n" +
    "¿Deseas reservar tus números y continuar a WhatsApp?"
  );

  if (!confirmar) return;

  reservaEnProceso = true;

  const boton = document.querySelector(".boton-enviar");

  const textoOriginal = boton.textContent;

  boton.disabled = true;
  boton.textContent = "RESERVANDO NÚMEROS...";

  try {

    const reservaId = await reservarNumeros();

    const mensaje =
      "🌿 *SORTEOS JEREMY ASHTA* 🌿\n\n" +
      "¡Hola! Quiero confirmar mi participación.\n\n" +
      "👤 *Nombre:* " + nombre + "\n" +
      "📱 *Celular:* " + celular + "\n" +
      "🎟️ *Números:* " + numerosTexto + "\n" +
      "💰 *Total a pagar:* S/. " + total.toFixed(2) + "\n" +
      "🧾 *Código de reserva:* " + reservaId + "\n\n" +
      "Adjunto mi comprobante de Yape para confirmar mi pago.\n\n" +
      "¡Muchas gracias! 🍀";

    const url =
      "https://wa.me/" +
      CONFIG.whatsapp +
      "?text=" +
      encodeURIComponent(mensaje);

    alert(
      "¡Tus números fueron reservados correctamente!\n\n" +
      "Ahora continuarás a WhatsApp. Recuerda adjuntar tu comprobante."
    );

    window.location.href = url;

  } catch (error) {

    console.error("Error al reservar:", error);

    alert(
      error.message ||
      "Ocurrió un error al reservar tus números. Inténtalo nuevamente."
    );

  } finally {

    reservaEnProceso = false;

    boton.disabled = false;
    boton.textContent = textoOriginal;

  }
}

// ==========================================
// CONFIGURACIÓN INICIAL DE LA PÁGINA
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

  iniciarFirebase();

});
