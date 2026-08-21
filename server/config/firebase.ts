import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "spresso-5561f",
    databaseURL: "https://spresso-5561f-default-rtdb.firebaseio.com"
  });
}
