require('dotenv').config();
const db = require('./src/config/db');

async function fixImages() {
  try {
    const { rows } = await db.query(`SELECT id, name FROM products WHERE image_url LIKE '%pollinations%' OR image_url LIKE '%source.unsplash.com%'`);
    for (let row of rows) {
      const newUrl = "https://picsum.photos/seed/" + encodeURIComponent(row.name) + "/400/400";
      await db.query(`UPDATE products SET image_url = $1 WHERE id = $2`, [newUrl, row.id]);
    }
    console.log('Images fixed to Picsum!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fixImages();
