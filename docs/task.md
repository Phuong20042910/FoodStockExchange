# Danh sách Công việc Triển khai Startup (Startup Implementation Tasks)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

Lộ trình này chia nhỏ toàn bộ quá trình phát triển hệ thống thành các giai đoạn cụ thể để bạn dễ dàng theo dõi và thực hiện.

---

### GIAI ĐOẠN 1: THIẾT LẬP CƠ SỞ DỮ LIỆU & BẢO MẬT (Supabase Setup)
- [x] **Khởi tạo Database trên Supabase:**
  - [x] Chạy SQL Script tạo các bảng: `users`, `products`, `price_history`, `raw_materials`, `recipes`, `orders`, `order_items`, `wallet_transactions`, `system_config`.
  - [x] Thiết lập Khóa chính, Khóa ngoại và Ràng buộc (Constraints).
- [x] **Tối ưu hóa Database Indexing:**
  - [x] Tạo Composite Index `(product_id, timestamp DESC)` trên bảng `price_history` để tối ưu hóa truy vấn biểu đồ đường.
- [x] **Cấu hình Row Level Security (RLS) & Policies:**
  - [x] Bật RLS cho tất cả các bảng.
  - [x] Tạo policy cho phép khách hàng (`CUSTOMER`) chỉ được đọc bảng `products` và `price_history`.
  - [x] Tạo policy chỉ cho phép user truy cập dòng dữ liệu của chính họ trong `orders` và `wallet_transactions`.
  - [x] Khóa chặt bảng `system_config` chỉ cho phép quyền `ADMIN` đọc/ghi.

---

### GIAI ĐOẠN 2: THUẬT TOÁN TÀI CHÍNH & ĐỊNH GIÁ ĐỘNG (Database Engine & Logic)
- [x] **Lập trình Thuật toán Định giá (SQL Functions):**
  - [x] Viết hàm tính toán tăng giá theo Lực mua ($Q_{5m}$) sử dụng hàm logarit (`LN`) và hệ số $K$ thích ứng.
  - [x] Viết hàm giảm giá tự động cho món ế (Cool-down) sau thời gian rảnh ($T_{idle}$).
  - [x] Viết logic ngắt mạch tự động (Circuit Breaker) nếu giá biến động >40% trong 60 giây (Cập nhật `is_trading = false`).
- [x] **Lịch trình chạy tự động (Cron Jobs):**
  - [x] Cấu hình chạy hàm định giá động mỗi 10 giây thông qua `pg_cron` (hoặc Edge Function/Worker).
- [x] **Xây dựng Sổ cái Bất biến (Financial Ledger Hash):**
  - [x] Viết PostgreSQL trigger tự động băm mã hóa SHA-256 (`tx_hash`) mỗi khi chèn một bản ghi mới vào bảng `wallet_transactions` để tránh gian lận số dư.

---

### GIAI ĐOẠN 3: LUỒNG REAL-TIME & ĐẶT MÓN (Edge Functions / Backend API)
- [x] **Xây dựng API Khớp lệnh Đặt món (`/api/orders/place`):**
  - [x] Kiểm tra tính hợp lệ của `expected_price` gửi lên từ client (dung sai trễ mạng trong 3 giây).
  - [x] Viết cơ chế lock hàng đợi (Row lock trong Postgres) để tránh Race Condition khi lượng mua dồn dập.
  - [x] Khấu trừ tiền ví, tạo đơn và cập nhật tồn kho vật lý tự động dựa trên bảng công thức định mức (BOM).
- [x] **Xây dựng API Hủy đơn phạt phí:**
  - [x] Viết logic kiểm tra thời gian hủy (dưới 30 giây) và phạt 5% giá trị đơn hàng.
- [x] **Tích hợp Kênh truyền phát Real-time (Supabase Channels):**
  - [x] Bật Postgres Replication cho bảng `products` để tự động đẩy giá mới xuống client.
  - [x] Thiết lập kênh Broadcast `market-alerts` phục vụ cho sự kiện "Market Crash" và "Trading Halt".

---

### GIAI ĐOẠN 4: FRONTEND TRADING BOARD & TRẢI NGHIỆM (ReactJS Client)
- [x] **Khởi tạo & Cấu hình Giao diện:**
  - [x] Khởi tạo ReactJS (Sử dụng Vite), cài đặt TailwindCSS.
  - [x] Thiết kế giao diện Dark Mode / Cyberpunk (Sử dụng palette màu đen xám, neon xanh đỏ).
- [x] **Bảng Điện Tử Giao Dịch (Live Trading Grid):**
  - [x] Lắng nghe kênh realtime của Supabase để cập nhật giá.
  - [x] Viết Custom CSS / Framer Motion để tạo hiệu ứng nhấp nháy chớp màu Xanh lá/Đỏ mỗi khi giá thay đổi.
  - [x] Tích hợp nút đặt món nhanh 1-Click.
- [x] **Vẽ Biểu Đồ Lịch Sử Giá:**
  - [x] Tích hợp thư viện Recharts để vẽ biểu đồ đường lịch sử giá của từng món ăn.
- [x] **Xây dựng Màn hình "Panic Mode" (Market Crash):**
  - [x] Lắng nghe sự kiện Broadcast sập sàn.
  - [x] Hiển thị màn hình đỏ chớp tắt cường độ cao, thanh countdown đếm ngược 3 phút và phát âm thanh còi hú qua Web Audio API.

---

### GIAI ĐOẠN 5: CÁC PHÂN HỆ PHỤ TRỢ & PHÁT HÀNH (KDS, POS & Admin)
- [x] **Xây dựng POS Thu Ngân:**
  - [x] Thiết kế màn hình nạp tiền vào ví khách hàng nhanh bằng mã QR.
- [x] **Xây dựng Màn hình Bếp (KDS):**
  - [x] Thiết kế bảng Kanban phân loại đơn hàng.
  - [x] Lập trình logic đếm thời gian xử lý và đổi màu thẻ đơn sang đỏ nhấp nháy khi trễ >15 phút.
- [x] **Bảng điều khiển Admin (Dashboard):**
  - [x] Tích hợp các thanh trượt Slider điều chỉnh hệ số $K$ và nút kích hoạt sập sàn thủ công.
  - [x] Vẽ biểu đồ nến Nhật (Candlestick) thống kê doanh thu theo giờ.

---

### GIAI ĐOẠN 6: BỔ SUNG LUỒNG DOANH NGHIỆP NÂNG CAO (Enterprise Expansion)
- [x] **Đặc tả Luồng Sơ Đồ Bàn 2D & Dynamic PIN QR:**
  - [x] Thiết lập sơ đồ mặt bằng 2D phân khu (Bar, Main, VIP, Terrace) và cơ chế PIN 4 số chống quét nhầm.
- [x] **Đặc tả Cổng Thanh Toán Auto-Topup & Trader PnL Portfolio:**
  - [x] Chuẩn hóa VietQR NAPAS 247 Webhook nạp ví trong 2s và thuật toán tính Lời/Lỗ Unrealized/Realized PnL.
- [x] **Đặc tả Phân Luồng Đa Trạm KDS & In Phiếu Nhiệt:**
  - [x] Phân luồng đơn hàng tự động về Bar, Bếp Nóng, Bếp Lạnh và sinh mẫu in nhiệt ESC/POS.
- [x] **Đặc tả Tự Động Nhập Kho & Chỉ Số Volatility Index VIX:**
  - [x] Tự động tạo Purchase Order (PO) gửi nhà cung cấp và đo đếm chỉ số tâm lý thị trường VIX.

---

### GIAI ĐOẠN 7: ĐỘT PHÁ SÁNG TẠO MEGA STARTUP (VC-Grade Innovation)
- [x] **Đặc tả Thuật Toán Dynamic Hedging & Commodity Futures:**
  - [x] Tự động trích lập quỹ Hedging Reserve bảo toàn lãi gộp 35% khi giá nguyên liệu nông sản thế giới biến động.
- [x] **Đặc tả Mạng Xã Hội Social Copy-Trading & Master Trader:**
  - [x] Cho phép theo dõi cao thủ bắt đáy và sao chép lệnh mua 1-Tap với phí thưởng quản lý 1%.
- [x] **Đặc tả Giao Dịch Chênh Lệch Giá Liên Chi Nhánh (Arbitrage Trading):**
  - [x] Cho phép mua coupon sập sàn ở chi nhánh vắng và bán lại P2P cho khách ở chi nhánh đông.
- [x] **Đặc tả Cảm Biến IoT Smart Coaster & AI Social Trend Trigger:**
  - [x] Tích hợp phần cứng cảm biến trọng lượng lót ly rỗng <10% kích hoạt re-order & AI lắng nghe tỉ số bóng đá trigger giảm giá ăn mừng.



