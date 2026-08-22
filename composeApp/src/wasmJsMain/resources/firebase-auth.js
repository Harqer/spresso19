import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

try {
    const configResponse = await fetch("/firebase-applet-config.json");
    if (!configResponse.ok) {
        throw new Error("Failed to load Firebase config from /firebase-applet-config.json");
    }
    const firebaseConfig = await configResponse.json();

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();
    
    window._firebaseApp = app;
    window._firebaseAuth = auth;
    window._googleProvider = googleProvider;
} catch (error) {
    console.error("Critical Firebase Initialization Error:", error);
    throw error;
}

const getAuthInstance = () => {
    if (!window._firebaseAuth) throw new Error("Firebase Auth is not initialized yet.");
    return window._firebaseAuth;
};
const getProvider = () => window._googleProvider;

window.signInWithGoogle = async function() {
    try {
        const result = await signInWithPopup(getAuthInstance(), getProvider());
        console.log("Signed in with Google", result.user);
    } catch (error) {
        console.error("Google Sign-In Error", error);
        throw error;
    }
};

window.getFirebaseUserUid = function() {
    const user = getAuthInstance().currentUser;
    return user ? user.uid : null;
};

window.getFirebaseUserIdToken = async function() {
    const user = getAuthInstance().currentUser;
    if (user) {
        return await user.getIdToken(false);
    }
    return null;
};

window.signOutFirebase = function() {
    signOut(getAuthInstance());
};

window.signInWithEmailAndPasswordFirebase = async function(email, password) {
    return await signInWithEmailAndPassword(getAuthInstance(), email, password);
};

window.createUserWithEmailAndPasswordFirebase = async function(email, password) {
    return await createUserWithEmailAndPassword(getAuthInstance(), email, password);
};

window.signInWithPhone = async function(phoneNumber) {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(getAuthInstance(), 'recaptcha-container', {
          'size': 'invisible'
        });
    }
    try {
        const confirmationResult = await signInWithPhoneNumber(getAuthInstance(), phoneNumber, window.recaptchaVerifier);
        window.confirmationResult = confirmationResult;
        return true;
    } catch (error) {
        console.error("Phone Auth Error", error);
        throw error;
    }
};

window.verifyPhoneCode = async function(code) {
    if (window.confirmationResult) {
        try {
            const result = await window.confirmationResult.confirm(code);
            return result.user !== null;
        } catch (error) {
            console.error("Verify Code Error", error);
            throw error;
        }
    }
    return false;
};
