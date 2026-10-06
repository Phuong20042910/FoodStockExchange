require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'foodstock',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 5432,
});

async function testInsert() {
  try {
    const name = 'Mì trộn thập cẩm test';
    const category = 'BEER';
    const image_url = 'https://source.unsplash.com/400x400/?drink,glass&sig=425';
    const base_price = 50000;
    const min_price = 30000;
    const max_price = 120000;
    const elasticity_k = 0.020;

    const result = await pool.query(`
      INSERT INTO products (name, category, image_url, base_price, current_price, min_price, max_price, elasticity_k)
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
      RETURNING *
    `, [name, category, image_url, base_price, min_price, max_price, elasticity_k]);

    console.log('Insert successful:', result.rows[0]);
  } catch (err) {
    console.error('SQL Error details:', err.message);
  } finally {
    pool.end();
  }
}

testInsert();
