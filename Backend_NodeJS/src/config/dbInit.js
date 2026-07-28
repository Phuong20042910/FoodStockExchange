const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initDatabase() {
  try {
    // Kiểm tra xem bảng 'users' đã tồn tại hay chưa
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    const res = await db.query(checkQuery);
    const exists = res.rows[0].exists;

    if (!exists) {
      console.log('=================================================');
      console.log('Cơ sở dữ liệu chưa được khởi tạo. Đang tự động chạy schema.sql...');
      
      const schemaPath = path.join(__dirname, '../../schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      
      // Chạy toàn bộ file SQL
      await db.query(sql);
      
      console.log('Khởi tạo cơ sở dữ liệu thành công!');
      console.log('=================================================');
    } else {
      console.log('Cơ sở dữ liệu đã có sẵn bảng. Đang kiểm tra cập nhật (migration)...');
      // Tự động thêm các cột mới cho bảng users nếu chưa có
      await db.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
      `);
      console.log('Kiểm tra và tự động cập nhật bảng users hoàn tất.');
    }
  } catch (err) {
    console.error('Lỗi khi tự động khởi tạo cơ sở dữ liệu:', err);
  }
}

module.exports = initDatabase;
