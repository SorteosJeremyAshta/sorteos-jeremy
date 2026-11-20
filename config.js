// ==========================================================
//  CONFIGURACIÓN GENERAL — SORTEOS JEREMY ASHTA
//  Este es el ÚNICO archivo que necesitas editar a mano.
// ==========================================================

const CONFIG = {
  // https://script.google.com/macros/s/AKfycbwmGSuhEj0HBil6_YYxC-2ZHhDTN7iNe413bVjZOIzPfMOuHGcgMATJPjn4upwV3pfl9Q/exec
  // Si la dejas vacía, la página funciona en "modo demostración":
  // no guarda reservas y solo envía el mensaje por WhatsApp.
  apiUrl: "",

  nombreSorteo: "SORTEOS JEREMY ASHTA",
  cantidadNumeros: 275,

  // Precios
  precio: 5,          // S/ por número
  promoCantidad: 3,   // cada 3 números...
  promoPrecio: 10,    // ...cuestan S/ 10

  // WhatsApp de contacto (con 51 delante)
  whatsapp: "51956069098",

  // Fecha del sorteo por defecto (formato AAAA-MM-DDTHH:MM).
  // Desde el panel de administrador puedes cambiarla sin tocar este archivo.
  // Déjala vacía ("") para mostrar "Por definir".
  fechaSorteo: "",

  // Cada cuántos segundos se refresca el estado de los numeritos
  refrescoSegundos: 30
};
