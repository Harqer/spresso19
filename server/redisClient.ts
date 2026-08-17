import { createClient } from 'redis';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || '6379';

export const redisClient = createClient({
  url: `redis://${redisHost}:${redisPort}`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

let isConnected = false;

export async function connectRedis() {
  if (!isConnected) {
    try {
      await redisClient.connect();
      isConnected = true;
      console.log('Redis connected successfully');
    } catch (e) {
      console.error('Failed to connect to Redis', e);
    }
  }
}
