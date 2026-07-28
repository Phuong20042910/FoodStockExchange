# Danh sách Công việc Triển khai Startup (Startup Implementation Tasks)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

Lộ trình này chia nhỏ toàn bộ quá trình phát triển hệ thống thành các giai đoạn cụ thể để bạn dễ dàng theo dõi và thực hiện.

---

### GIAI ĐOẠN 1: THIẾT LẬP CƠ SỞ DỮ LIỆU & BẢO MẬT (Supabase Setup)
- [ ] **Khởi tạo Database trên Supabase:**
  - [ ] Chạy SQL Script tạo các bảng: `users`, `products`, `price_history`, `raw_materials`, `recipes`, `orders`, `order_items`, `wallet_transactions`, `system_config`.
  - [ ] Thiết lập Khóa chính, Khóa ngoại và Ràng buộc (Constraints).
- [ ] **Tối ưu hóa Database Indexing:**
  - [ ] Tạo Composite Index `(product_id, timestamp DESC)` trên bảng `price_history` để tối ưu hóa truy vấn biểu đồ đường.
- [ ] **Cấu hình Row Level Security (RLS) & Policies:**
  - [ ] Bật RLS cho tất cả các bảng.
  - [ ] Tạo policy cho phép khách hàng (`CUSTOMER`) chỉ được đọc bảng `products` và `price_history`.
  - [ ] Tạo policy chỉ cho phép user truy cập dòng dữ liệu của chính họ trong `orders` và `wallet_transactions`.
  - [ ] Khóa chặt bảng `system_config` chỉ cho phép quyền `ADMIN` đọc/ghi.

---

### GIAI ĐOẠN 2: THUẬT TOÁN TÀI CHÍNH & ĐỊNH GIÁ ĐỘNG (Database Engine & Logic)
- [ ] **Lập trình Thuật toán Định giá (SQL Functions):**
  - [ ] Viết hàm tính toán tăng giá theo Lực mua ($Q_{5m}$) sử dụng hàm logarit (`LN`) và hệ số $K$ thích ứng.
  - [ ] Viết hàm giảm giá tự động cho món ế (Cool-down) sau thời gian rảnh ($T_{idle}$).
  - [ ] Viết logic ngắt mạch tự động (Circuit Breaker) nếu giá biến động >40% trong 60 giây (Cập nhật `is_trading = false`).
- [ ] **Lịch trình chạy tự động (Cron Jobs):**
  - [ ] Cấu hình chạy hàm định giá động mỗi 10 giây thông qua `pg_cron` (hoặc Edge Function/Worker).
- [ ] **Xây dựng Sổ cái Bất biến (Financial Ledger Hash):**
  - [ ] Viết PostgreSQL trigger tự động băm mã hóa SHA-256 (`tx_hash`) mỗi khi chèn một bản ghi mới vào bảng `wallet_transactions` để tránh gian lận số dư.

---

### GIAI ĐOẠN 3: LUỒNG REAL-TIME & ĐẶT MÓN (Edge Functions / Backend API)
- [ ] **Xây dựng API Khớp lệnh Đặt món (`/api/orders/place`):**
  - [ ] Kiểm tra tính hợp lệ của `expected_price` gửi lên từ client (dung sai trễ mạng trong 3 giây).
  - [ ] Viết cơ chế lock hàng đợi (Row lock trong Postgres) để tránh Race Condition khi lượng mua dồn dập.
  - [ ] Khấu trừ tiền ví, tạo đơn và cập nhật tồn kho vật lý tự động dựa trên bảng công thức định mức (BOM).
- [ ] **Xây dựng API Hủy đơn phạt phí:**
  - [ ] Viết logic kiểm tra thời gian hủy (dưới 30 giây) và phạt 5% giá trị đơn hàng.
- [ ] **Tích hợp Kênh truyền phát Real-time (Supabase Channels):**
  - [ ] Bật Postgres Replication cho bảng `products` để tự động đẩy giá mới xuống client.
  - [ ] Thiết lập kênh Broadcast `market-alerts` phục vụ cho sự kiện "Market Crash" và "Trading Halt".

---

### GIAI ĐOẠN 4: FRONTEND TRADING BOARD & TRẢI NGHIỆM (ReactJS Client)
- [ ] **Khởi tạo & Cấu hình Giao diện:**
  - [ ] Khởi tạo ReactJS (Sử dụng Vite), cài đặt TailwindCSS.
  - [ ] Thiết kế giao diện Dark Mode / Cyberpunk (Sử dụng palette màu đen xám, neon xanh đỏ).
- [ ] **Bảng Điện Tử Giao Dịch (Live Trading Grid):**
  - [ ] Lắng nghe kênh realtime của Supabase để cập nhật giá.
  - [ ] Viết Custom CSS / Framer Motion để tạo hiệu ứng nhấp nháy chớp màu Xanh lá/Đỏ mỗi khi giá thay đổi.
  - [ ] Tích hợp nút đặt món nhanh 1-Click.
- [ ] **Vẽ Biểu Đồ Lịch Sử Giá:**
  - [ ] Tích hợp thư viện Recharts để vẽ biểu đồ đường lịch sử giá của từng món ăn.
- [ ] **Xây dựng Màn hình "Panic Mode" (Market Crash):**
  - [ ] Lắng nghe sự kiện Broadcast sập sàn.
  - [ ] Hiển thị màn hình đỏ chớp tắt cường độ cao, thanh countdown đếm ngược 3 phút và phát âm thanh còi hú qua Web Audio API.

---

### GIAI ĐOẠN 5: CÁC PHÂN HỆ PHỤ TRỢ & PHÁT HÀNH (KDS, POS & Admin)
- [ ] **Xây dựng POS Thu Ngân:**
  - [ ] Thiết kế màn hình nạp tiền vào ví khách hàng nhanh bằng mã QR.
- [ ] **Xây dựng Màn hình Bếp (KDS):**
  - [ ] Thiết kế bảng Kanban phân loại đơn hàng.
  - [ ] Lập trình logic đếm thời gian xử lý và đổi màu thẻ đơn sang đỏ nhấp nháy khi trễ >15 phút.
- [ ] **Bảng điều khiển Admin (Dashboard):**
  - [ ] Tích hợp các thanh trượt Slider điều chỉnh hệ số $K$ và nút kích hoạt sập sàn thủ công.
  - [ ] Vẽ biểu đồ nến Nhật (Candlestick) thống kê doanh thu theo giờ.
