// 1. Import the correct CDN modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// 2. Your specific Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgjjPJeB-Kh9YPI3fe12CtfFYb_i9swtE",
    authDomain: "elite-qr.firebaseapp.com",
    projectId: "elite-qr",
    storageBucket: "elite-qr.firebasestorage.app",
    messagingSenderId: "1054075970480",
    appId: "1:1054075970480:web:acf61f08b7b6fc7c292c75",
    measurementId: "G-128CRPKENW"
};

// 3. Initialize Firebase Services
const app = initializeApp(firebaseConfig);

// 4. Export them so main.js and auth.js can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();