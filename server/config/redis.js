const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    },
  });

  redisClient.on('error', (err) => logger.error('Redis client error:', err));
  redisClient.on('connect', () => logger.info('Redis connection established'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redisClient.connect();
  return redisClient;
};

const getRedis = () => {
  if (!redisClient) throw new Error('Redis client not initialised');
  return redisClient;
};

// Helper: cache with TTL
const cacheSet = async (key, value, ttlSeconds = 300) => {
  await getRedis().setEx(key, ttlSeconds, JSON.stringify(value));
};

const cacheGet = async (key) => {
  const data = await getRedis().get(key);
  return data ? JSON.parse(data) : null;
};

const cacheDel = async (key) => {
  await getRedis().del(key);
};

// const cacheDelByPattern = async (pattern) => {
//   const keys = await getRedis().keys(pattern);
//   if (keys.length > 0) await getRedis().del(keys);
// };

const cacheDelByPattern = async (pattern) => {
  const redis = getRedis();

  let cursor = 0;

  do {
    const reply = await redis.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = reply.cursor;

    const keys = reply.keys;

    if (keys.length) {
      await redis.del(keys);
    }
  } while (cursor !== 0);
};

module.exports = { connectRedis, getRedis, cacheSet, cacheGet, cacheDel, cacheDelByPattern };
