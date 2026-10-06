require('dotenv').config();
const db = require('./src/config/db');

async function fixImages() {
  try {
    const defaultImg = 'https://images.unsplash.com/photo-1414235077428-338988692140?w=500';
    await db.query(`UPDATE products SET image_url = $1 WHERE image_url LIKE '%picsum%' OR image_url LIKE '%pollinations%' OR image_url LIKE '%source.unsplash.com%'`, [defaultImg]);
    
    // specifically update takoyaki and mì
    await db.query(`UPDATE products SET image_url = 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500' WHERE name ILIKE '%Mì%' OR name ILIKE '%Takoyaki%'`);
    
    console.log('Images fixed to real Unsplash images!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
fixImages();
