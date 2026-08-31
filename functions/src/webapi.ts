import { onRequest } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { db } from "./shared/db";
import { orderCollectionRef } from "./shared/orderRefs";
import { parseWebCart } from "./cart/webCart";

const HOSTING_ORIGINS = ["https://get-spresso.web.app", "https://get-spresso.firebaseapp.com"];

async function authenticate(req: import("express").Request): Promise<string> {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ") || authHeader.slice("Bearer ".length).trim().length === 0) {
    throw new Error("unauthorized");
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice("Bearer ".length));
    return decodedToken.uid;
  } catch {
    throw new Error("unauthorized");
  }
}

async function verifyAppCheck(req: import("express").Request): Promise<void> {
  if (!req.header("X-Firebase-AppCheck")) {
    throw new Error("unauthorized");
  }
  try {
    await getAppCheck().verifyToken(req.header("X-Firebase-AppCheck") as string);
  } catch {
    throw new Error("unauthorized");
  }
}

function writeJson(res: import("express").Response, status: number, body: unknown): void {
  res.status(status).json(body);
}

export const webApi = onRequest(
  { cors: HOSTING_ORIGINS, maxInstances: 10 },
  async (req, res) => {
    if (req.path.replace(/^\/+|\/+$/g, "") === "api/health" || req.path.replace(/^\/+|\/+$/g, "") === "health") {
      res.status(200).json({ status: "ok" });
      return;
    }
    try {
      const uid = await authenticate(req);
      await verifyAppCheck(req);

      const path = req.path.replace(/^\/+|\/+$/g, "").replace(/^api\//, "");
      const parts = path.split("/").filter(Boolean);

      if (parts.length === 2 && parts[0] === "user" && parts[1] === "sync" && req.method === "POST") {
        const email = typeof req.body?.email === "string" ? req.body.email.slice(0, 200) : "";
        const name = typeof req.body?.name === "string" ? req.body.name.slice(0, 100) : email.split("@")[0] || "New User";
        await db.collection("users").doc(uid).set({ email, displayName: name, updatedAt: new Date().toISOString() }, { merge: true });
        writeJson(res, 200, { success: true });
        return;
      }

      if (parts.length === 2 && parts[0] === "user" && parts[1] === "preferences") {
        const ref = db.collection("user_preferences").doc(uid);
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
          const theme = typeof req.body?.theme === "string" ? req.body.theme.slice(0, 20) : undefined;
          const seedHex = typeof req.body?.seedHex === "string" ? req.body.seedHex.slice(0, 7) : undefined;
          const secondarySeedHex = typeof req.body?.secondarySeedHex === "string" ? req.body.secondarySeedHex.slice(0, 7) : undefined;
          const write: Record<string, string> = {};
          if (theme) write.theme = theme;
          if (seedHex) write.seedHex = seedHex;
          if (secondarySeedHex) write.secondarySeedHex = secondarySeedHex;
          if (Object.keys(write).length > 0) {
            await ref.set(write, { merge: true });
          }
          writeJson(res, 200, { success: true });
          return;
        }
      }

      if (parts.length === 1 && parts[0] === "cart") {
        const ref = db.collection("carts").doc(uid);
        if (req.method === "GET") {
          const doc = await ref.get();
          writeJson(res, 200, { cart: (doc.data()?.items) || [] });
          return;
        }
        if (req.method === "POST") {
          let items;
          try {
            items = parseWebCart(req.body);
          } catch {
            writeJson(res, 400, { success: false, error: "A valid cart is required." });
            return;
          }
          await ref.set({ userId: uid, items, updatedAt: new Date().toISOString() }, { merge: true });
          writeJson(res, 200, { success: true, totalItems: items.reduce((sum, item) => sum + item.quantity, 0) });
          return;
        }
      }

      if (parts.length === 1 && parts[0] === "orders" && req.method === "GET") {
        const snapshot = await orderCollectionRef(uid).orderBy("createdAt", "desc").limit(50).get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        writeJson(res, 200, { orders });
        return;
      }

      res.status(404).json({ success: false, error: "not found" });
    } catch {
      res.status(401).json({ success: false, error: "unauthorized" });
    }
  },
);
