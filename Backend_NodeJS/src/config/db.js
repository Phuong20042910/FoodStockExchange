const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Bắt buộc khi kết nối tới Supabase Postgres từ xa
  }
});

pool.on('connect', () => {
  console.log('Database connected successfully!');
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
