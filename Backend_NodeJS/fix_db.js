require('dotenv').config();
const db = require('./src/config/db');

async function fixDatabase() {
  try {
    console.log('Đang đồng bộ lại bộ đếm ID (Sequence)...');
    await db.query(`SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1));`);
    console.log('✅ Đã đồng bộ xong ID!');
    
    console.log('Đang mở rộng danh mục (Category Check Constraint)...');
    await db.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;`);
    await db.query(`ALTER TABLE products ADD CONSTRAINT products_category_check CHECK (category IN ('BEER', 'COCKTAIL', 'WINE', 'SPIRIT', 'SOFT_DRINK', 'COFFEE', 'TEA', 'JUICE', 'FOOD', 'SNACK', 'DESSERT', 'OTHER'));`);
    console.log('✅ Đã mở rộng danh mục thành công!');
    
  } catch (err) {
    console.error('❌ Lỗi khi sửa Database:', err.message);
  } finally {
    process.exit(0);
  }
}

fixDatabase();
