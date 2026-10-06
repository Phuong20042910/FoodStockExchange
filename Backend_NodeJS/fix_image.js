require('dotenv').config();
const db = require('./src/config/db');

async function fixImages() {
  try {
    const { rows } = await db.query(`SELECT id, name FROM products WHERE image_url LIKE '%source.unsplash.com%'`);
    for (let row of rows) {
      const newUrl = "https://image.pollinations.ai/prompt/" + encodeURIComponent(row.name + " high quality food photography dark background") + "?width=400&height=400&nologo=true";
      await db.query(`UPDATE products SET image_url = $1 WHERE id = $2`, [newUrl, row.id]);
    }
    console.log('Images fixed!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fixImages();
