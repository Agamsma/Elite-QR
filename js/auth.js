import { auth, googleProvider } from './firebase-config.js';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

/**
 * Premium Google Sign-In
 * Only allows @gmail.com addresses
 */
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        if (!user.email.endsWith('@gmail.com')) {
            alert("Access Denied: Only valid @gmail.com accounts are permitted.");
            await signOut(auth);
            return null;
        }
        return user;
    } catch (error) {
        console.error("Auth Error:", error.message);
        alert("Authentication failed. Please try again.");
    }
};

/**
 * Secure Logout
 */
export const logoutUser = () => {
    signOut(auth).then(() => {
        window.location.reload(); // Refresh to clear sensitive data
    });
};

/**
 * State Observer
 * Updates the UI based on whether Agam (or another user) is logged in
 */
export const monitorAuthState = (callback) => {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};