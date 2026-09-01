import { db } from "./db";

export function orderRef(uid: string, orderId: string): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> {
  return db.collection("users").doc(uid).collection("orders").doc(orderId);
}

export function orderCollectionRef(uid: string): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> {
  return db.collection("users").doc(uid).collection("orders");
}
