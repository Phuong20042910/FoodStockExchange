require('dotenv').config();
const db = require('./src/config/db');

async function testImages() {
  try {
    const { rows } = await db.query(`SELECT id, name, image_url FROM products`);
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
testImages();
