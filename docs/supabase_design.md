# Kiến trúc Supabase & Tối ưu hóa Real-time
## Dự án: Food Stock Exchange

Sử dụng **Supabase** (nền tảng Postgres-as-a-Service) cho dự án này là một lựa chọn **cực kỳ thông minh và hiện đại**. Nó giúp giảm tải khoảng 60% khối lượng code Backend truyền thống nhờ các tính năng Real-time và Auth tích hợp sẵn.

Dưới đây là cách Supabase thay đổi và tối ưu hóa kiến trúc dự án "Sàn giao dịch ẩm thực":

---

## 1. Bản đồ Thay thế Công nghệ (Tech Stack Mapping)

| Thành phần truyền thống | Giải pháp thay thế bằng Supabase | Ưu điểm mang lại |
|---|---|---|
| **Database** (PostgreSQL/SQL Server) | **Supabase Database** (Managed PostgreSQL) | Postgres đầy đủ tính năng, hiệu năng cao, tự động backup. |
| **Authentication** (JWT, Sign-in, Register) | **Supabase Auth** (GoTrue) | Xử lý đăng ký, đăng nhập, bảo mật JWT tự động chỉ với vài dòng code ở Frontend. |
| **WebSocket Server** (Socket.io/SignalR) | **Supabase Realtime (Channels & Broadcast)** | Đồng bộ thay đổi bảng hoặc phát tín hiệu khẩn cấp thời gian thực mà không cần viết server WebSocket riêng. |
| **Server Storage** (Lưu ảnh món ăn) | **Supabase Storage** | CDN lưu trữ ảnh món ăn tốc độ cao. |
| **CRON Job / Worker** | **pg_cron** hoặc **Edge Functions** | Chạy thuật toán cập nhật giá mỗi 10 giây trực tiếp bên trong Database hoặc qua Serverless Functions. |

---

## 2. Thiết kế Cơ chế Real-time bằng Supabase

Thay vì phải tự dựng server WebSocket phức tạp để truyền nhận giá, ta sẽ tận dụng 2 tính năng chính của **Supabase Realtime**:

### A. Postgres Changes (Lắng nghe bảng PRODUCTS)
Khi Background Job cập nhật trường `current_price` của một món ăn trong DB, Supabase sẽ tự động "bắn" giá mới xuống cho toàn bộ ứng dụng ReactJS đang mở.
*   **Frontend Code (ReactJS):**
    ```javascript
    import { createClient } from '@supabase/supabase-js'
    const supabase = createClient('SUPABASE_URL', 'SUPABASE_ANON_KEY')

    // Lắng nghe thay đổi giá món ăn thời gian thực
    const priceSubscription = supabase
      .channel('public:products')
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'products' }, 
          (payload) => {
              console.log('Giá mới cập nhật:', payload.new);
              // Kích hoạt hiệu ứng chớp xanh/đỏ trên UI React
          })
      .subscribe()
    ```

### B. Broadcast Channel (Xử lý sự kiện "Sập Sàn" - Market Crash)
Đối với các sự kiện cần gửi tức thời và không nhất thiết phải lưu vào Database (như bật còi báo động toàn quán), ta dùng kênh **Broadcast**.
*   **Admin phát tín hiệu:**
    ```javascript
    const channel = supabase.channel('market-events')
    channel.send({
      type: 'broadcast',
      event: 'crash',
      payload: { duration: 180 }
    })
    ```
*   **Client (Khách hàng) lắng nghe:**
    ```javascript
    supabase.channel('market-events')
      .on('broadcast', { event: 'crash' }, (payload) => {
        // Rung chuông, nhấp nháy màn hình đỏ, hiện đếm ngược
        startCrashCountdown(payload.duration);
      })
    ```

---

## 3. Thuật toán định giá chạy trực tiếp trong Database (SQL / pg_cron)

Để hệ thống hoạt động 24/7 mà không sợ server backend bị crash, ta có thể viết thuật toán cập nhật giá bằng **PostgreSQL Triggers & Functions** kết hợp với extension `pg_cron` của Supabase.

### SQL Function cập nhật giá tự động (Viết trong Supabase SQL Editor):
```sql
CREATE OR REPLACE FUNCTION update_stock_prices()
RETURNS void AS $$
BEGIN
  -- 1. Giảm giá các món ế (không bán được trong 15 phút qua)
  UPDATE products
  SET current_price = GREATEST(current_price * 0.98, min_price)
  WHERE id NOT IN (
    SELECT DISTINCT product_id 
    FROM order_items 
    JOIN orders ON orders.id = order_items.order_id
    WHERE orders.created_at > now() - interval '15 minutes'
  );

  -- 2. Tăng giá các món bán chạy (tính theo số lượng order trong 5 phút qua)
  -- (Thuật toán sẽ tự động quét bảng order_items để cập nhật)
  -- 3. Ghi lịch sử giá vào price_history
  INSERT INTO price_history (product_id, recorded_price, timestamp)
  SELECT id, current_price, now() FROM products;
END;
$$ LANGUAGE plpgsql;
```

*Sau đó, cấu hình chạy hàm này mỗi 10 giây thông qua giao diện Cron Jobs của Supabase.*

---

## 4. Bảo mật dữ liệu bằng Row Level Security (RLS)

Postgres của Supabase hỗ trợ **RLS (Bảo mật cấp dòng dữ liệu)** cực mạnh, đảm bảo hack ở Client không thể phá hoại Database:
- **Bảng Products:** Tất cả mọi người (kể cả khách vãng lai chưa đăng nhập) đều được phép `SELECT` (Xem menu). Chỉ tài khoản Admin mới được `UPDATE` (Chỉnh sửa thông tin món).
- **Bảng Orders & Users:** User chỉ được xem/sửa dữ liệu của chính mình (`auth.uid() = user_id`). Không thể đọc hóa đơn hay số dư ví của khách bàn bên cạnh.
- **Bảng Price History:** Chỉ cho phép đọc (`SELECT`), cấm chỉnh sửa (`UPDATE`/`DELETE`) để bảo toàn tính minh bạch của lịch sử giá.
