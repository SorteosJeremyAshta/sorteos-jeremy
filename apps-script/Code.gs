/**
 * ==========================================================
 *  SORTEOS JEREMY ASHTA — BACKEND (Google Apps Script)
 *  Base de datos: la hoja de cálculo donde pegas este código.
 *  Comprobantes: carpeta de Google Drive (se crea sola).
 * ==========================================================
 *
 *  Hojas que se crean automáticamente:
 *    - Reservas : una fila por cada participación
 *    - Config   : fecha del sorteo, vencimiento, ganadores, etc.
 *
 *  Estados de una reserva:
 *    PENDIENTE  → números en amarillo (reservados), esperando verificación
 *    CONFIRMADO → números en rojo (vendidos)
 *    CANCELADO  → números liberados por el admin
 *    VENCIDO    → nadie la confirmó a tiempo; números liberados
 */

// ---------- AJUSTES ----------
const CANTIDAD_NUMEROS = 275;
const PRECIO = 5;
const PROMO_CANTIDAD = 3;
const PROMO_PRECIO = 10;
const PREMIOS = [400, 200, 150, 50];
const NOMBRE_CARPETA = "Comprobantes Sorteos Jeremy Ashta";
const MAX_NUMEROS_POR_RESERVA = 50;
const HORAS_SESION_ADMIN = 6;

const HOJA_RESERVAS = "Reservas";
const HOJA_CONFIG = "Config";
const COLUMNAS = [
  "Codigo", "Registrado", "Nombre", "Celular", "Numeros", "Cantidad",
  "Total", "Comprobante", "Estado", "Vence", "Actualizado", "Nota"
];
const C = {}; COLUMNAS.forEach((n, i) => C[n] = i);

const CONFIG_INICIAL = {
  fechaSorteo: "",          // AAAA-MM-DDTHH:MM
  horasVencimiento: 24,     // horas que dura una reserva sin confirmar
  abierto: "SI",            // SI / NO
  ganadores: "[]"
};

// ==========================================================
//  ENTRADAS WEB
// ==========================================================

function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || "estado";
  try {
    if (accion === "estado") return responder(estadoPublico());
    if (accion === "ping") return responder({ ok: true, hora: new Date().toISOString() });
    throw new Error("Acción no válida.");
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const datos = JSON.parse((e.postData && e.postData.contents) || "{}");
    const acciones = {
      reservar: reservar,
      login: login,
      adminDatos: conAdmin(adminDatos),
      confirmar: conAdmin(confirmarReserva),
      cancelar: conAdmin(cancelarReserva),
      reactivar: conAdmin(reactivarReserva),
      ventaManual: conAdmin(ventaManual),
      guardarConfig: conAdmin(guardarConfig),
      guardarGanadores: conAdmin(guardarGanadores),
      cambiarClave: conAdmin(cambiarClave),
      logout: conAdmin(logout)
    };
    const fn = acciones[datos.accion];
    if (!fn) throw new Error("Acción no válida.");
    return responder(fn(datos));
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================================
//  PÚBLICO
// ==========================================================

function estadoPublico() {
  vencerReservas();
  const cfg = leerConfig();
  const filas = leerReservas();
  const vendidos = [], reservados = [];

  filas.forEach(r => {
    if (r.Estado === "CONFIRMADO") vendidos.push(...r.lista);
    else if (r.Estado === "PENDIENTE") reservados.push(...r.lista);
  });

  return {
    ok: true,
    vendidos: vendidos,
    reservados: reservados,
    abierto: cfg.abierto !== "NO",
    fechaSorteo: cfg.fechaSorteo || "",
    ganadores: ganadoresPublicos(cfg)
  };
}

function reservar(d) {
  const nombre = String(d.nombre || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const celular = String(d.celular || "").trim();
  const numeros = limpiarNumeros(d.numeros);

  if (nombre.length < 5) throw new Error("Ingresa tu nombre completo.");
  if (!/^9\d{8}$/.test(celular)) throw new Error("Celular inválido.");
  if (!numeros.length) throw new Error("No seleccionaste números.");
  if (numeros.length > MAX_NUMEROS_POR_RESERVA) throw new Error("Máximo " + MAX_NUMEROS_POR_RESERVA + " números por reserva.");
  if (!d.imagen || String(d.imagen).length < 1000) throw new Error("Falta la captura del Yape.");
  if (String(d.imagen).length > 8 * 1024 * 1024) throw new Error("La imagen es muy pesada.");

  const cfg = leerConfig();
  if (cfg.abierto === "NO") throw new Error("Las ventas de este sorteo están cerradas.");

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error("Hay muchas personas reservando. Intenta en unos segundos.");

  try {
    vencerReservas();
    const ocupados = numerosOcupados();
    const tomados = numeros.filter(n => ocupados.has(n));
    if (tomados.length) {
      throw new Error("Los números " + tomados.join(", ") + " ya fueron tomados. Elige otros.");
    }

    const codigo = nuevoCodigo();
    const ahora = new Date();
    const vence = new Date(ahora.getTime() + Number(cfg.horasVencimiento || 24) * 3600 * 1000);
    const total = calcularTotal(numeros.length);

    // Guardar comprobante en Drive (privado, solo el dueño lo ve)
    const blob = Utilities.newBlob(
      Utilities.base64Decode(String(d.imagen)),
      "image/jpeg",
      codigo + "_" + celular + ".jpg"
    );
    const archivo = carpetaComprobantes().createFile(blob);
    archivo.setDescription(nombre + " · " + numeros.join(", ") + " · S/ " + total);

    hoja(HOJA_RESERVAS).appendRow([
      codigo, ahora, nombre, "'" + celular, numeros.join(", "), numeros.length,
      total, archivo.getUrl(), "PENDIENTE", vence, ahora, ""
    ]);
    SpreadsheetApp.flush();

    return { ok: true, codigo: codigo, total: total, vence: vence.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================================
//  ADMINISTRADOR
// ==========================================================

function login(d) {
  const props = PropertiesService.getScriptProperties();
  const clave = props.getProperty("ADMIN_CLAVE");
  if (!clave) throw new Error("Aún no se configuró la clave. Ejecuta la función 'instalar' en Apps Script.");

  // Freno simple contra adivinar la clave
  const cache = CacheService.getScriptCache();
  const intentos = Number(cache.get("intentos") || 0);
  if (intentos >= 8) throw new Error("Demasiados intentos. Espera 10 minutos.");

  if (hashTexto(String(d.clave || "")) !== clave) {
    cache.put("intentos", String(intentos + 1), 600);
    throw new Error("Clave incorrecta.");
  }
  cache.remove("intentos");

  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put("ses_" + token, "1", HORAS_SESION_ADMIN * 3600);
  return { ok: true, token: token };
}

function conAdmin(fn) {
  return function (d) {
    const t = String(d.token || "");
    if (!t || !CacheService.getScriptCache().get("ses_" + t)) {
      throw new Error("SESION_VENCIDA");
    }
    return fn(d);
  };
}

function logout(d) {
  CacheService.getScriptCache().remove("ses_" + d.token);
  return { ok: true };
}

function adminDatos() {
  vencerReservas();
  const cfg = leerConfig();
  const reservas = leerReservas().map(r => ({
    codigo: r.Codigo,
    registrado: fechaIso(r.Registrado),
    nombre: r.Nombre,
    celular: String(r.Celular).replace(/^'/, ""),
    numeros: r.Numeros,
    cantidad: r.Cantidad,
    total: r.Total,
    comprobante: r.Comprobante,
    estado: r.Estado,
    vence: fechaIso(r.Vence),
    actualizado: fechaIso(r.Actualizado),
    nota: r.Nota
  })).reverse(); // más recientes primero

  return {
    ok: true,
    reservas: reservas,
    config: {
      fechaSorteo: cfg.fechaSorteo || "",
      horasVencimiento: Number(cfg.horasVencimiento || 24),
      abierto: cfg.abierto !== "NO"
    },
    ganadores: ganadoresPublicos(cfg),
    premios: PREMIOS,
    cantidadNumeros: CANTIDAD_NUMEROS
  };
}

function confirmarReserva(d) {
  return cambiarEstado(d.codigo, ["PENDIENTE"], "CONFIRMADO");
}

function cancelarReserva(d) {
  return cambiarEstado(d.codigo, ["PENDIENTE", "CONFIRMADO"], "CANCELADO", d.nota);
}

// Volver a poner como PENDIENTE una reserva vencida/cancelada (si sus números siguen libres)
function reactivarReserva(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = hoja(HOJA_RESERVAS);
    const fila = buscarFila(d.codigo);
    const valores = sh.getRange(fila, 1, 1, COLUMNAS.length).getValues()[0];
    if (["VENCIDO", "CANCELADO"].indexOf(valores[C.Estado]) < 0) throw new Error("Solo se reactivan reservas vencidas o canceladas.");
    const lista = limpiarNumeros(String(valores[C.Numeros]).split(","));
    const ocupados = numerosOcupados();
    const tomados = lista.filter(n => ocupados.has(n));
    if (tomados.length) throw new Error("Ya no se puede: los números " + tomados.join(", ") + " están tomados.");
    const cfg = leerConfig();
    const vence = new Date(Date.now() + Number(cfg.horasVencimiento || 24) * 3600 * 1000);
    sh.getRange(fila, C.Estado + 1).setValue("PENDIENTE");
    sh.getRange(fila, C.Vence + 1).setValue(vence);
    sh.getRange(fila, C.Actualizado + 1).setValue(new Date());
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Venta registrada por el admin (pago en efectivo, etc.) → queda CONFIRMADA
function ventaManual(d) {
  const nombre = String(d.nombre || "").trim().slice(0, 80);
  const celular = String(d.celular || "").trim();
  const numeros = limpiarNumeros(d.numeros);
  if (nombre.length < 2) throw new Error("Escribe el nombre.");
  if (celular && !/^9\d{8}$/.test(celular)) throw new Error("Celular inválido.");
  if (!numeros.length) throw new Error("Escribe al menos un número válido.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    vencerReservas();
    const ocupados = numerosOcupados();
    const tomados = numeros.filter(n => ocupados.has(n));
    if (tomados.length) throw new Error("Los números " + tomados.join(", ") + " ya están tomados.");
    const ahora = new Date();
    const codigo = nuevoCodigo();
    const total = d.total !== undefined && d.total !== "" ? Number(d.total) : calcularTotal(numeros.length);
    hoja(HOJA_RESERVAS).appendRow([
      codigo, ahora, nombre, celular ? "'" + celular : "", numeros.join(", "), numeros.length,
      total, "", "CONFIRMADO", "", ahora, String(d.nota || "Venta manual").slice(0, 120)
    ]);
    return { ok: true, codigo: codigo };
  } finally {
    lock.releaseLock();
  }
}

function guardarConfig(d) {
  const fecha = String(d.fechaSorteo || "").trim();
  if (fecha && isNaN(new Date(fecha).getTime())) throw new Error("Fecha inválida.");
  const horas = Number(d.horasVencimiento);
  if (!(horas >= 1 && horas <= 240)) throw new Error("El vencimiento debe estar entre 1 y 240 horas.");
  escribirConfig("fechaSorteo", fecha);
  escribirConfig("horasVencimiento", horas);
  escribirConfig("abierto", d.abierto ? "SI" : "NO");
  return { ok: true };
}

function guardarGanadores(d) {
  const lista = (d.ganadores || []).slice(0, PREMIOS.length).map((g, i) => {
    const n = String(g || "").trim();
    if (!n) return null;
    const num = Number(n);
    if (!(num >= 1 && num <= CANTIDAD_NUMEROS)) throw new Error("Número de ganador inválido: " + n);
    return { puesto: i + 1, numero: num };
  });
  escribirConfig("ganadores", JSON.stringify(lista.filter(Boolean)));
  return { ok: true, ganadores: ganadoresPublicos(leerConfig()) };
}

function cambiarClave(d) {
  const nueva = String(d.nueva || "");
  if (nueva.length < 6) throw new Error("La nueva clave debe tener al menos 6 caracteres.");
  const props = PropertiesService.getScriptProperties();
  if (hashTexto(String(d.actual || "")) !== props.getProperty("ADMIN_CLAVE")) throw new Error("La clave actual no es correcta.");
  props.setProperty("ADMIN_CLAVE", hashTexto(nueva));
  return { ok: true };
}

// ==========================================================
//  INSTALACIÓN (ejecutar UNA vez desde el editor)
// ==========================================================

/**
 * 1) Cambia la clave de abajo.  2) Selecciona "instalar" y pulsa Ejecutar.
 * Crea las hojas, la carpeta de comprobantes, la clave de admin y
 * un activador que vence reservas cada 15 minutos.
 */
function instalar() {
  const CLAVE_ADMIN = "CambiaEstaClave2026";   // ← CAMBIA ESTO

  hoja(HOJA_RESERVAS);
  hoja(HOJA_CONFIG);
  leerConfig();
  carpetaComprobantes();
  PropertiesService.getScriptProperties().setProperty("ADMIN_CLAVE", hashTexto(CLAVE_ADMIN));

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "vencerReservas")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("vencerReservas").timeBased().everyMinutes(15).create();

  Logger.log("✅ Instalación lista. Ahora: Implementar > Nueva implementación > Aplicación web.");
}

// ==========================================================
//  AUXILIARES
// ==========================================================

function hoja(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    if (nombre === HOJA_RESERVAS) {
      sh.appendRow(COLUMNAS);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, COLUMNAS.length).setFontWeight("bold").setBackground("#003b17").setFontColor("#ffffff");
      sh.getRange("B:B").setNumberFormat("dd/mm/yyyy hh:mm");
      sh.getRange("J:K").setNumberFormat("dd/mm/yyyy hh:mm");
      sh.getRange("G:G").setNumberFormat("\"S/ \"0.00");
    }
    if (nombre === HOJA_CONFIG) {
      sh.appendRow(["Clave", "Valor"]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, 2).setFontWeight("bold");
    }
  }
  return sh;
}

function leerReservas() {
  const sh = hoja(HOJA_RESERVAS);
  const n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  return sh.getRange(2, 1, n, COLUMNAS.length).getValues()
    .filter(f => f[C.Codigo])
    .map(f => {
      const o = {};
      COLUMNAS.forEach((col, i) => o[col] = f[i]);
      o.lista = limpiarNumeros(String(f[C.Numeros]).split(","));
      return o;
    });
}

function numerosOcupados() {
  const set = new Set();
  leerReservas().forEach(r => {
    if (r.Estado === "PENDIENTE" || r.Estado === "CONFIRMADO") r.lista.forEach(n => set.add(n));
  });
  return set;
}

// Pasa a VENCIDO las reservas PENDIENTE cuya fecha de vencimiento ya pasó
function vencerReservas() {
  const sh = hoja(HOJA_RESERVAS);
  const n = sh.getLastRow() - 1;
  if (n <= 0) return;
  const rango = sh.getRange(2, C.Estado + 1, n, 3); // Estado, Vence, Actualizado
  const valores = rango.getValues();
  const ahora = new Date();
  let cambios = false;
  valores.forEach(v => {
    if (v[0] === "PENDIENTE" && esFecha(v[1]) && v[1].getTime() < ahora.getTime()) {
      v[0] = "VENCIDO";
      v[2] = ahora;
      cambios = true;
    }
  });
  if (cambios) rango.setValues(valores);
}

function cambiarEstado(codigo, desde, hacia, nota) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = hoja(HOJA_RESERVAS);
    const fila = buscarFila(codigo);
    const estado = sh.getRange(fila, C.Estado + 1).getValue();
    if (desde.indexOf(estado) < 0) throw new Error("La reserva está " + estado + "; no se puede pasar a " + hacia + ".");
    sh.getRange(fila, C.Estado + 1).setValue(hacia);
    sh.getRange(fila, C.Actualizado + 1).setValue(new Date());
    if (nota) sh.getRange(fila, C.Nota + 1).setValue(String(nota).slice(0, 120));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function buscarFila(codigo) {
  const sh = hoja(HOJA_RESERVAS);
  const n = sh.getLastRow() - 1;
  if (n > 0) {
    const codigos = sh.getRange(2, 1, n, 1).getValues();
    for (let i = 0; i < codigos.length; i++) {
      if (String(codigos[i][0]) === String(codigo)) return i + 2;
    }
  }
  throw new Error("No se encontró la reserva " + codigo + ".");
}

function leerConfig() {
  const sh = hoja(HOJA_CONFIG);
  const cfg = {};
  const n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, 2).getValues().forEach(f => { if (f[0]) cfg[f[0]] = f[1]; });
  let faltaba = false;
  Object.keys(CONFIG_INICIAL).forEach(k => {
    if (!(k in cfg)) { sh.appendRow([k, CONFIG_INICIAL[k]]); cfg[k] = CONFIG_INICIAL[k]; faltaba = true; }
  });
  if (faltaba) SpreadsheetApp.flush();
  if (esFecha(cfg.fechaSorteo)) {
    cfg.fechaSorteo = Utilities.formatDate(cfg.fechaSorteo, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
  }
  return cfg;
}

function escribirConfig(clave, valor) {
  const sh = hoja(HOJA_CONFIG);
  leerConfig();
  const n = sh.getLastRow() - 1;
  const claves = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < claves.length; i++) {
    if (claves[i][0] === clave) {
      // Texto plano para que Sheets no convierta la fecha
      sh.getRange(i + 2, 2).setNumberFormat("@").setValue(valor);
      return;
    }
  }
  sh.appendRow([clave, valor]);
}

function ganadoresPublicos(cfg) {
  let lista = [];
  try { lista = JSON.parse(cfg.ganadores || "[]"); } catch (e) { lista = []; }
  if (!lista.length) return [];
  // Nombre del dueño del número (solo reservas confirmadas)
  const duenos = {};
  leerReservas().forEach(r => {
    if (r.Estado === "CONFIRMADO") r.lista.forEach(n => duenos[n] = r.Nombre);
  });
  return lista.map(g => ({
    puesto: g.puesto,
    numero: g.numero,
    premio: PREMIOS[g.puesto - 1] || 0,
    nombre: ocultarApellido(duenos[g.numero] || "")
  }));
}

// "María Fernanda López Ruiz" → "María Fernanda L."
function ocultarApellido(nombre) {
  const p = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (p.length <= 1) return p.join("");
  if (p.length === 2) return p[0] + " " + p[1][0] + ".";
  return p.slice(0, 2).join(" ") + " " + p[2][0] + ".";
}

function limpiarNumeros(entrada) {
  const arr = Array.isArray(entrada) ? entrada : String(entrada || "").split(/[,\s]+/);
  const set = new Set();
  arr.forEach(x => {
    const n = Number(String(x).trim());
    if (Number.isInteger(n) && n >= 1 && n <= CANTIDAD_NUMEROS) set.add(n);
  });
  return Array.from(set).sort((a, b) => a - b);
}

function calcularTotal(cantidad) {
  return Math.floor(cantidad / PROMO_CANTIDAD) * PROMO_PRECIO + (cantidad % PROMO_CANTIDAD) * PRECIO;
}

function nuevoCodigo() {
  const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMdd");
  const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "SA-" + fecha + "-" + azar;
}

function carpetaComprobantes() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("CARPETA_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se creará otra */ }
  }
  const carpeta = DriveApp.createFolder(NOMBRE_CARPETA);
  props.setProperty("CARPETA_ID", carpeta.getId());
  return carpeta;
}

function hashTexto(texto) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "sja::" + texto, Utilities.Charset.UTF_8);
  return bytes.map(b => ("0" + (b & 0xff).toString(16)).slice(-2)).join("");
}

function fechaIso(v) {
  return esFecha(v) ? v.toISOString() : (v || "");
}

function esFecha(v) {
  return Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime());
}
