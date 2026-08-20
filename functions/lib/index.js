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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.verifyPasskeyRegistration = exports.generatePasskeyChallenge = exports.webhooks = void 0;
__exportStar(require("./orders"), exports);
__exportStar(require("./wardrobe"), exports);
__exportStar(require("./ai"), exports);
__exportStar(require("./payments"), exports);
__exportStar(require("./catalog"), exports);
__exportStar(require("./interactions"), exports);
__exportStar(require("./users"), exports);
const webhooks = __importStar(require("./webhooks"));
exports.webhooks = webhooks;
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
const server_1 = require("@simplewebauthn/server");
exports.generatePasskeyChallenge = (0, https_1.onCall)((request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to generate a challenge.");
    }
    const challenge = crypto.randomBytes(32).toString("base64url");
    return { challenge };
});
exports.verifyPasskeyRegistration = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    }
    const { responseJson, challenge } = request.data;
    try {
        const response = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
        const verification = await (0, server_1.verifyRegistrationResponse)({
            response,
            expectedChallenge: challenge,
            expectedOrigin: ["https://spresso.com", "android:apk-key-hash"],
            expectedRPID: "spresso.com",
        });
        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;
            const { db } = await Promise.resolve().then(() => __importStar(require("./shared/db")));
            // Persist the passkey to user profile
            await db.collection("users").doc(request.auth.uid).collection("passkeys").doc(credential.id).set({
                credentialId: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString("base64"),
                counter: credential.counter,
                createdAt: new Date().toISOString()
            });
        }
        return { success: verification.verified };
    }
    catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});
//# sourceMappingURL=index.js.map