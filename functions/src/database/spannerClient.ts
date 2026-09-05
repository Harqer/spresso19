import { Spanner } from '@google-cloud/spanner';

// Hardcoded or ENV driven project values
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'get-spresso';
const instanceId = process.env.SPANNER_INSTANCE || 'spresso-catalog';
const databaseId = process.env.SPANNER_DATABASE || 'catalog_db';

/**
 * Global singleton Spanner client.
 * Declared outside the function scope to reuse connections across invocations
 * in a serverless (Cloud Functions) environment.
 */
const spanner = new Spanner({ projectId });

// Setup connection pooling suitable for serverless bursts
const spannerInstance = spanner.instance(instanceId);
const spannerDatabase = spannerInstance.database(databaseId, {
    min: 0,
    max: 5,  // Max sessions per cloud function instance
    incStep: 1, // Number of sessions to create when scaling up
});

export const getSpannerDatabase = () => {
    return spannerDatabase;
};
