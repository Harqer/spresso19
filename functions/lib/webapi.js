"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const app_check_1 = require("firebase-admin/app-check");
const db_1 = require("./shared/db");
const orderRefs_1 = require("./shared/orderRefs");
const webCart_1 = require("./cart/webCart");
const HOSTING_ORIGINS = ["https://get-spresso.web.app", "https://get-spresso.firebaseapp.com"];
async function authenticate(req) {
    const authHeader = req.header("Authorization");
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")) || authHeader.slice("Bearer ".length).trim().length === 0) {
        throw new Error("unauthorized");
    }
    try {
        const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(authHeader.slice("Bearer ".length));
        return decodedToken.uid;
    }
    catch (_a) {
        throw new Error("unauthorized");
    }
}
async function verifyAppCheck(req) {
    if (!req.header("X-Firebase-AppCheck")) {
        throw new Error("unauthorized");
    }
    try {
        await (0, app_check_1.getAppCheck)().verifyToken(req.header("X-Firebase-AppCheck"));
    }
    catch (_a) {
        throw new Error("unauthorized");
    }
}
function writeJson(res, status, body) {
    res.status(status).json(body);
}
async function checkHealth() {
    try {
        // A metadata-only Admin SDK call verifies the configured Firestore boundary
        // without exposing user data or requiring a mutable probe document.
        await db_1.db.listCollections();
        return { status: "ok", dependencies: { firestore: "ok" } };
    }
    catch (error) {
        console.error("Health dependency check failed", { error });
        return { status: "degraded", dependencies: { firestore: "error" } };
    }
}
exports.webApi = (0, https_1.onRequest)({ cors: HOSTING_ORIGINS, maxInstances: 10 }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (req.path.replace(/^\/+|\/+$/g, "") === "api/health" || req.path.replace(/^\/+|\/+$/g, "") === "health") {
        const health = await checkHealth();
        res.status(health.status === "ok" ? 200 : 503).json(health);
        return;
    }
    try {
        const uid = await authenticate(req);
        await verifyAppCheck(req);
        const path = req.path.replace(/^\/+|\/+$/g, "").replace(/^api\//, "");
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 2 && parts[0] === "user" && parts[1] === "sync" && req.method === "POST") {
            const email = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) === "string" ? req.body.email.slice(0, 200) : "";
            const name = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.name) === "string" ? req.body.name.slice(0, 100) : email.split("@")[0] || "New User";
            await db_1.db.collection("users").doc(uid).set({ email, displayName: name, updatedAt: new Date().toISOString() }, { merge: true });
            writeJson(res, 200, { success: true });
            return;
        }
        if (parts.length === 2 && parts[0] === "user" && parts[1] === "preferences") {
            const ref = db_1.db.collection("user_preferences").doc(uid);
            if (req.method === "GET") {
                const doc = await ref.get();
                const data = doc.data() || {};
                const preferences = {
                    theme: data.theme || "system",
                    seedHex: data.seedHex || "",
                    secondarySeedHex: data.secondarySeedHex || "",
                };
                writeJson(res, 200, { preferences });
                return;
            }
            if (req.method === "POST") {
                const theme = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.theme) === "string" ? req.body.theme.slice(0, 20) : undefined;
                const seedHex = typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.seedHex) === "string" ? req.body.seedHex.slice(0, 7) : undefined;
                const secondarySeedHex = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.secondarySeedHex) === "string" ? req.body.secondarySeedHex.slice(0, 7) : undefined;
                const write = {};
                if (theme)
                    write.theme = theme;
                if (seedHex)
                    write.seedHex = seedHex;
                if (secondarySeedHex)
                    write.secondarySeedHex = secondarySeedHex;
                if (Object.keys(write).length > 0) {
                    await ref.set(write, { merge: true });
                }
                writeJson(res, 200, { success: true });
                return;
            }
        }
        if (parts.length === 3 && parts[0] === "user" && parts[1] === "wallet" && parts[2] === "coinbase" && req.method === "POST") {
            const address = typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.address) === "string" ? req.body.address : "";
            const network = typeof ((_g = req.body) === null || _g === void 0 ? void 0 : _g.network) === "string" ? req.body.network : "base";
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                writeJson(res, 400, { success: false, error: "A valid wallet address is required." });
                return;
            }
            if (network !== "base" && network !== "ethereum") {
                writeJson(res, 400, { success: false, error: "Unsupported wallet network." });
                return;
            }
            await db_1.db.collection("users").doc(uid).set({
                coinbaseWalletAddress: address,
                walletNetwork: network,
                walletConnectedAt: new Date().toISOString(),
            }, { merge: true });
            writeJson(res, 200, { success: true });
            return;
        }
        if (parts.length === 1 && parts[0] === "cart") {
            const ref = db_1.db.collection("carts").doc(uid);
            if (req.method === "GET") {
                const doc = await ref.get();
                try {
                    const cart = (0, webCart_1.parseWebCart)({ cart: ((_h = doc.data()) === null || _h === void 0 ? void 0 : _h.items) || [] });
                    writeJson(res, 200, { cart });
                }
                catch (error) {
                    console.error("Malformed persisted cart state", { uid, error });
                    writeJson(res, 400, { success: false, error: "A valid cart is required." });
                }
                return;
            }
            if (req.method === "POST") {
                let items;
                try {
                    items = (0, webCart_1.parseWebCart)(req.body);
                }
                catch (_j) {
                    writeJson(res, 400, { success: false, error: "A valid cart is required." });
                    return;
                }
                await ref.set({ userId: uid, items, updatedAt: new Date().toISOString() }, { merge: true });
                writeJson(res, 200, { success: true, totalItems: items.reduce((sum, item) => sum + item.quantity, 0) });
                return;
            }
        }
        if (parts.length === 1 && parts[0] === "orders" && req.method === "GET") {
            const snapshot = await (0, orderRefs_1.orderCollectionRef)(uid).orderBy("createdAt", "desc").limit(50).get();
            const orders = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            writeJson(res, 200, { orders });
            return;
        }
        res.status(404).json({ success: false, error: "not found" });
    }
    catch (_k) {
        res.status(401).json({ success: false, error: "unauthorized" });
    }
});
//# sourceMappingURL=webapi.js.map