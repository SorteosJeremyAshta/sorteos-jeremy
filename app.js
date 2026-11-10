// =====================================
// CONEXIÓN CON FIREBASE
// =====================================

const firebaseConfig = {
  apiKey: "AIzaSyAefA2sSss4WLPB5s_Lk4dz6IWykzFAnMyo",
  authDomain: "sorteos-jeremy-ashta.firebaseapp.com",
  projectId: "sorteos-jeremy-ashta",
  storageBucket: "sorteos-jeremy-ashta.firebasestorage.app",
  messagingSenderId: "1063051655246",
  appId: "1:1063051655246:web:a0999b935ee5aaba306b1f"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

let usuarioAutenticado = false;

// Verificar autenticación
auth.onAuthStateChanged(async function(usuario) {
  if (usuario) {
    usuarioAutenticado = true;
    console.log("Firebase conectado correctamente.");
  } else {
    try {
      await auth.signInAnonymously();
    } catch (error) {
      usuarioAutenticado = false;
      console.error("Error de autenticación:", error);
      alert("No se pudo conectar con Firebase: " + error.message);
    }
  }
});
