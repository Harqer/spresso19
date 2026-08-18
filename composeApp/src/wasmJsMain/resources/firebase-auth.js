import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "dummy_api_key_for_local_build",
  authDomain: "spresso-5561f.firebaseapp.com",
  projectId: "spresso-5561f",
  storageBucket: "spresso-5561f.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:0000000000000000000000"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

window.signInWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Signed in with Google", result.user);
    } catch (error) {
        console.error("Google Sign-In Error", error);
        throw error;
    }
};

window.getFirebaseUserUid = function() {
    const user = auth.currentUser;
    return user ? user.uid : null;
};

window.getFirebaseUserIdToken = async function() {
    const user = auth.currentUser;
    if (user) {
        return await user.getIdToken(false);
    }
    return null;
};

window.signOutFirebase = function() {
    signOut(auth);
};

window.signInWithEmailAndPasswordFirebase = async function(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
};

window.createUserWithEmailAndPasswordFirebase = async function(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password);
};

window.signInWithPhone = async function(phoneNumber) {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
    }
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
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
