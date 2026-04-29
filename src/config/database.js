const { Pool } = require('pg');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';
const isCloudDB = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('neon.tech') ||
  process.env.DATABASE_URL.includes('supabase') ||
  process.env.DATABASE_URL.includes('railway') ||
  process.env.DATABASE_URL.includes('render') ||
  process.env.DATABASE_URL.includes('heroku')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (isProduction || isCloudDB) ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle DB client', { message: err.message });
});

const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms`);
    return result;
  } catch (error) {
    logger.error('Database query error', { text, error: error.message });
    throw error;
  }
};

const getClient = async () => {
  return await pool.connect();
};

const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Database connected successfully');
    return true;
  } catch (err) {
    logger.error('❌ Database connection failed', { message: err.message });
    return false;
  }
};

module.exports = { query, getClient, pool, testConnection };
