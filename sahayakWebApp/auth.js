import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- START: Changes for Local Development ---
// Replace this config with your OWN Firebase config.
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};
// --- END: Changes for Local Development ---

// Initialize Firebase App instance once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const authEmailInput = document.getElementById('authEmail');
    const authPasswordInput = document.getElementById('authPassword');
    const signUpButton = document.getElementById('signUpButton');
    const signInButton = document.getElementById('signInButton');
    const authMessageDiv = document.getElementById('auth-message');

    // Helper to display auth messages
    function showAuthMessage(message, isError = false) {
        authMessageDiv.textContent = message;
        authMessageDiv.classList.remove('hidden', 'text-green-600', 'text-red-600');
        authMessageDiv.classList.add(isError ? 'text-red-600' : 'text-green-600');
    }

    // Function to handle user sign-up
    async function handleSignUp() {
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        if (!email || !password) {
            showAuthMessage("Please enter both email and password.", true);
            return;
        }
        if (password.length < 6) {
            showAuthMessage("Password must be at least 6 characters long.", true);
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showAuthMessage("Account created and signed in successfully! Redirecting...", false);
            // Redirect to main app page after successful sign-up
            window.location.href = 'index.html';
        } catch (error) {
            showAuthMessage(`Sign Up Error: ${error.message}`, true);
            console.error("Sign Up Error:", error);
        }
    }

    // Function to handle user sign-in
    async function handleSignIn() {
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        if (!email || !password) {
            showAuthMessage("Please enter both email and password.", true);
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showAuthMessage("Signed in successfully! Redirecting...", false);
            // Redirect to main app page after successful sign-in
            window.location.href = 'index.html';
        } catch (error) {
            showAuthMessage(`Sign In Error: ${error.message}`, true);
            console.error("Sign In Error:", error);
        }
    }

    // Listen for authentication state changes on the login page
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // If already authenticated (e.g., from a previous session), redirect to main app
            console.log("Already authenticated on login page, redirecting to main app.");
            window.location.href = 'index.html';
        }
        // No else block needed here; if not authenticated, the user stays on login.html
    });

    // Event Listeners
    signUpButton.addEventListener('click', handleSignUp);
    signInButton.addEventListener('click', handleSignIn);
});