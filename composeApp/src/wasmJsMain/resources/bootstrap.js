// Module loading and Firebase's persisted session must finish before Kotlin
// invokes the synchronous auth bridge. Script tag order alone cannot ensure this.
try {
    await import("./firebase-auth.js");
    await window._firebaseAuth.authStateReady();
    await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "composeApp.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
    document.getElementById("startup-message").remove();
} catch {
    const message = document.getElementById("startup-message");
    message.textContent = "Unable to load Spresso. Please check your connection and try again.";
    const retry = document.createElement("button");
    retry.textContent = "Try again";
    retry.onclick = () => window.location.reload();
    message.appendChild(retry);
}
