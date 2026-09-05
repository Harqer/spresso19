import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "get-spresso",
    databaseURL: "https://get-spresso-default-rtdb.firebaseio.com"
  });
}
