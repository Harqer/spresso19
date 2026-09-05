"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.passkeyAndroidOrigin = exports.passkeyWebOrigin = exports.passkeyRpId = void 0;
exports.expectedPasskeyOrigins = expectedPasskeyOrigins;
exports.issuePasskeyChallenge = issuePasskeyChallenge;
exports.consumePasskeyChallenge = consumePasskeyChallenge;
const params_1 = require("firebase-functions/params");
const crypto = __importStar(require("crypto"));
const https_1 = require("firebase-functions/v2/https");
const db_1 = require("./db");
exports.passkeyRpId = (0, params_1.defineString)("PASSKEY_RP_ID", {
    default: "get-spresso.web.app",
    description: "WebAuthn relying-party domain shared by the web app and Android Digital Asset Links.",
});
exports.passkeyWebOrigin = (0, params_1.defineString)("PASSKEY_WEB_ORIGIN", {
    default: "https://get-spresso.web.app",
    description: "Canonical HTTPS origin for Spresso web passkeys.",
});
exports.passkeyAndroidOrigin = (0, params_1.defineString)("PASSKEY_ANDROID_ORIGIN", {
    description: "Release Android WebAuthn origin in android:apk-key-hash:<base64url-sha256> form.",
});
function expectedPasskeyOrigins() {
    const androidOrigin = exports.passkeyAndroidOrigin.value().trim();
    if (!androidOrigin.startsWith("android:apk-key-hash:")) {
        throw new Error("PASSKEY_ANDROID_ORIGIN is not configured with a release signing certificate hash");
    }
    return [exports.passkeyWebOrigin.value(), androidOrigin];
}
async function issuePasskeyChallenge(uid) {
    const challenge = crypto.randomBytes(32).toString("base64url");
    await db_1.db.collection("users").doc(uid).collection("security").doc("passkeyChallenge").set({
        challenge,
        expiresAtMs: Date.now() + 5 * 60 * 1000,
    });
    return challenge;
}
async function consumePasskeyChallenge(uid, suppliedChallenge) {
    const challengeRef = db_1.db.collection("users").doc(uid).collection("security").doc("passkeyChallenge");
    await db_1.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(challengeRef);
        const stored = snapshot.data();
        const expected = typeof (stored === null || stored === void 0 ? void 0 : stored.challenge) === "string" ? stored.challenge : "";
        const supplied = Buffer.from(suppliedChallenge);
        const expectedBuffer = Buffer.from(expected);
        const matches = supplied.length === expectedBuffer.length && crypto.timingSafeEqual(supplied, expectedBuffer);
        if (!snapshot.exists || !matches || Number(stored === null || stored === void 0 ? void 0 : stored.expiresAtMs) < Date.now()) {
            throw new https_1.HttpsError("permission-denied", "The passkey challenge is invalid or expired.");
        }
        transaction.delete(challengeRef);
    });
}
//# sourceMappingURL=passkeys.js.map