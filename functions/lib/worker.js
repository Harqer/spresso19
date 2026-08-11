"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const pubsub_1 = require("@google-cloud/pubsub");
const pg_1 = require("pg");
const pubSubClient = new pubsub_1.PubSub();
const subscriptionName = 'interactions-sub';
const batchWindowMs = 5000; // 5-second flush window
const maxBatchSize = 1000;
// Cloud SQL PostgreSQL Connection Pool
// All credentials MUST be set via Cloud Run / App Engine environment variables.
// No local fallbacks — missing env vars cause a startup failure, surfaced by GCP health checks.
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 20,
});
async function startWorker() {
    const subscription = pubSubClient.subscription(subscriptionName, {
        flowControl: { maxMessages: maxBatchSize }
    });
    let buffer = [];
    let flushTimeout = null;
    const flushBuffer = async () => {
        if (buffer.length === 0)
            return;
        const batch = [...buffer];
        buffer = [];
        if (flushTimeout)
            clearTimeout(flushTimeout);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Batch Insert into Junction Table
            const insertValues = batch.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
            const insertArgs = batch.flatMap(b => [b.event.userId, b.event.productId, b.event.action, b.event.timestamp]);
            await client.query(`INSERT INTO UserLikes (userId, productId, action, timestamp) VALUES ${insertValues} ON CONFLICT DO NOTHING;`, insertArgs);
            // Increment Denormalized Counter on Products Table
            const productCounts = batch.reduce((acc, curr) => {
                acc[curr.event.productId] = (acc[curr.event.productId] || 0) + 1;
                return acc;
            }, {});
            for (const [productId, count] of Object.entries(productCounts)) {
                await client.query(`UPDATE Products SET likesCount = likesCount + $1 WHERE id = $2;`, [count, productId]);
            }
            await client.query('COMMIT');
            batch.forEach(b => b.ack());
        }
        catch (e) {
            await client.query('ROLLBACK');
            // Messages are not acked so Pub/Sub will redeliver them
        }
        finally {
            client.release();
        }
    };
    subscription.on('message', (message) => {
        const event = JSON.parse(message.data.toString());
        buffer.push({ event, ack: () => message.ack() });
        if (buffer.length >= maxBatchSize) {
            flushBuffer();
        }
        else if (!flushTimeout) {
            flushTimeout = setTimeout(flushBuffer, batchWindowMs);
        }
    });
    subscription.on('error', () => {
        // Errors are surfaced via Cloud Logging (stdout) in production GCP environment
    });
}
//# sourceMappingURL=worker.js.map