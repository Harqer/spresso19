"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpannerDatabase = void 0;
const spanner_1 = require("@google-cloud/spanner");
// Hardcoded or ENV driven project values
const projectId = process.env.GCLOUD_PROJECT || 'spresso-19';
const instanceId = process.env.SPANNER_INSTANCE || 'spresso-global-instance';
const databaseId = process.env.SPANNER_DATABASE || 'spresso-catalog';
/**
 * Global singleton Spanner client.
 * Declared outside the function scope to reuse connections across invocations
 * in a serverless (Cloud Functions) environment.
 */
const spanner = new spanner_1.Spanner({ projectId });
// Setup connection pooling suitable for serverless bursts
const spannerInstance = spanner.instance(instanceId);
const spannerDatabase = spannerInstance.database(databaseId, {
    min: 0,
    max: 5, // Max sessions per cloud function instance
    incStep: 1, // Number of sessions to create when scaling up
});
const getSpannerDatabase = () => {
    return spannerDatabase;
};
exports.getSpannerDatabase = getSpannerDatabase;
//# sourceMappingURL=spannerClient.js.map