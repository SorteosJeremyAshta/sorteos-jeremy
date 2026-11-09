// =====================================
// CONEXIÓN CON FIREBASE
// =====================================

const firebaseConfig = {
  apiKey: "AIzaSyAe2FasSss4WLPB5s_lk4dz6IWykzFAnMyo",
  authDomain: "sorteos-jeremy-ashta.firebaseapp.com",
  projectId: "sorteos-jeremy-ashta",
  storageBucket: "sorteos-jeremy-ashta.firebasestorage.app",
  messagingSenderId: "1063051655246",
  appId: "1:1063051655246:web:a0999b935ee5aaba306b1f"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let usuarioAutenticado = false;

auth.onAuthStateChanged(async function(usuario) {
  if (usuario) {
    usuarioAutenticado = true;
    console.log("Firebase conectado correctamente.");
  } else {
    try {
      await auth.signInAnonymously();
    } catch (error) {
      console.error("Error de autenticación:", error);
      alert("No se pudo conectar con Firebase.");
    }
  }
});
