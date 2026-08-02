# Lược đồ Cơ sở dữ liệu (Database Schema Details)
## Dự án: Food Stock Exchange

Tài liệu này mở rộng từ ERD, định nghĩa chi tiết các trường, kiểu dữ liệu và cách tối ưu hóa (Indexing) cho Database (Phù hợp với PostgreSQL hoặc SQL Server).

---

### Bảng 1: `USERS` (Người dùng & Khách hàng)
Lưu trữ thông tin khách hàng và số dư ví điện tử nội bộ.
*   `id` (INT / PK / Auto-increment)
*   `username` (VARCHAR 50 / Unique)
*   `password_hash` (VARCHAR 255)
*   `role` (VARCHAR 20): Bảng liệt kê [ADMIN, CASHIER, KITCHEN, CUSTOMER].
*   `wallet_balance` (DECIMAL 12,2): Số tiền khách nạp sẵn tại quầy thu ngân để thanh toán siêu tốc 1-click.

### Bảng 2: `PRODUCTS` (Món ăn / Đồ uống)
*   `id` (INT / PK)
*   `name` (VARCHAR 255)
*   `image_url` (VARCHAR 500)
*   `base_price` (DECIMAL 10,2): Giá gốc xuất xưởng.
*   `current_price` (DECIMAL 10,2): Giá thay đổi realtime (Dùng để cache).
*   `min_price` (DECIMAL 10,2): Giá không được phép thấp hơn (để tránh lỗ).
*   `max_price` (DECIMAL 10,2): Giá không được phép cao hơn.
*   `is_active` (BOOLEAN): Trạng thái món đang bán hay đã hết hàng.

### Bảng 3: `PRICE_HISTORY` (Lịch sử giá - Dữ liệu Lớn)
Bảng này sẽ phình to rất nhanh vì mỗi 10 giây có thể lưu hàng chục dòng. Dùng để Frontend vẽ biểu đồ lịch sử.
*   `id` (BIGINT / PK)
*   `product_id` (INT / FK)
*   `recorded_price` (DECIMAL 10,2)
*   `timestamp` (DATETIME)
*   **Database Indexing:** BẮT BUỘC phải tạo Composite Index cho `(product_id, timestamp)` để truy vấn lấy lịch sử vẽ biểu đồ đạt tốc độ mili-giây.

### Bảng 4: `ORDERS` (Hóa đơn)
*   `id` (INT / PK)
*   `user_id` (INT / FK)
*   `total_amount` (DECIMAL 12,2)
*   `status` (VARCHAR 20): [PENDING, PREPARING, READY, SERVED, CANCELLED]
*   `created_at` (DATETIME)

### Bảng 5: `ORDER_ITEMS` (Chi tiết hóa đơn)
*   `id` (BIGINT / PK)
*   `order_id` (INT / FK)
*   `product_id` (INT / FK)
*   `quantity` (INT)
*   `price_at_purchase` (DECIMAL 10,2): **Trường Cực Quan Trọng.** Lưu cứng giá của món ăn tại đúng giây mà khách hàng bấm mua, tránh việc khách mua xong giá thị trường thay đổi làm sai lệch hóa đơn.

---

### Bảng 6: `TABLES` (Danh mục Bàn & Sơ Đồ 2D)
*   `id` (INT / PK)
*   `table_number` (VARCHAR 20 / Unique)
*   `zone` (VARCHAR 50): [ZONE_BAR, ZONE_MAIN, ZONE_VIP, ZONE_TERRACE]
*   `pin_code` (VARCHAR 4): Mã PIN định danh 4 số chống quét nhầm bàn.
*   `status` (VARCHAR 20): [AVAILABLE, RESERVED, OCCUPIED, CLEANING]

### Bảng 7: `STATIONS` (Trạm Chế Biến KDS)
*   `id` (INT / PK)
*   `station_name` (VARCHAR 100): [STATION_BAR, STATION_HOT_KITCHEN, STATION_COLD_KITCHEN]
*   `display_ip` (VARCHAR 50): Địa chỉ IP màn hình hiển thị tại trạm.

### Bảng 8: `PURCHASE_ORDERS` (Đơn Mua Hàng Tự Động Nhà Cung Cấp)
*   `id` (INT / PK)
*   `raw_material_id` (INT / FK)
*   `supplier_name` (VARCHAR 255)
*   `order_qty` (DECIMAL 10,2)
*   `unit_cost` (DECIMAL 10,2)
*   `status` (VARCHAR 20): [DRAFT, SENT, DELIVERED, COMPLETED]

### Bảng 9: `PAYMENT_LOGS` (Nhật Ký Auto-Topup Ngân Hàng VietQR)
*   `id` (BIGINT / PK)
*   `user_id` (INT / FK)
*   `gateway` (VARCHAR 50): VD: MBBank, VPBank.
*   `amount` (DECIMAL 12,2)
*   `reference_code` (VARCHAR 100 / Unique)
*   `created_at` (DATETIME)

