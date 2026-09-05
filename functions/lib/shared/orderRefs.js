"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRef = orderRef;
exports.orderCollectionRef = orderCollectionRef;
const db_1 = require("./db");
function orderRef(uid, orderId) {
    return db_1.db.collection("users").doc(uid).collection("orders").doc(orderId);
}
function orderCollectionRef(uid) {
    return db_1.db.collection("users").doc(uid).collection("orders");
}
//# sourceMappingURL=orderRefs.js.map