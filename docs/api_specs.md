# Đặc tả API Giao dịch & Luồng Real-time (Trading API & WebSocket Spec)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

Tài liệu này định nghĩa hệ thống API RESTful và luồng WebSocket thời gian thực (được tối ưu hóa bằng các kênh Supabase Channels/Broadcast) phục vụ cho các cơ chế giao dịch nâng cao của hệ thống.

---

## 1. Supabase Real-time Channels (WebSocket Events)

### 1.1. Kênh `market-prices` (Broadcast & Postgres Change)
Lắng nghe biến động giá theo từng giây của các mã sản phẩm.

*   **POSTGRES UPDATE Event:**
    *   **Trạng thái:** Tự động phát khi Database cập nhật trường `current_price`.
    *   **Payload:**
        ```json
        {
          "schema": "public",
          "table": "products",
          "commit_timestamp": "2026-07-26T09:00:10Z",
          "event": "UPDATE",
          "new": {
            "id": 101,
            "name": "Bia Thủ Công IPA",
            "current_price": 58500.00,
            "is_trading": true
          },
          "old": {
            "id": 101,
            "current_price": 55000.00
          }
        }
        ```

### 1.2. Kênh `market-alerts` (Broadcast Channel)
Phát các sự kiện khẩn cấp liên quan đến cơ chế vận hành thị trường toàn hệ thống.

*   **Event `crash_start` (Sập sàn bắt đầu):**
    *   **Payload:** `{ "duration_seconds": 180, "message": "MARKET CRASH DETECTED!" }`
*   **Event `crash_end` (Kết thúc sập sàn):**
    *   **Payload:** `{ "message": "Market stabilized. Prices returned to baseline." }`
*   **Event `trading_halt` (Ngắt mạch tự động - Circuit Breaker):**
    *   **Mục đích:** Báo hiệu một món ăn cụ thể tạm thời dừng giao dịch do biến động giá quá nhanh.
    *   **Payload:**
        ```json
        {
          "product_id": 101,
          "reason": "Volatility limit exceeded (+40% within 60s)",
          "resume_at": "2026-07-26T09:05:30Z"
        }
        ```

### 1.3. Kênh `kitchen-orders` (KDS Real-time Queue)
Kênh bảo mật kết nối giữa Client của khách và màn hình Bếp.
*   **Event `new_order`:**
    *   **Payload:**
        ```json
        {
          "order_id": "8f93ee2c-e81e-4552-b842-602a192aa0cd",
          "table_number": "09",
          "items": [
            { "product_id": 101, "name": "Bia Thủ Công IPA", "qty": 2 }
          ],
          "created_at": "2026-07-26T09:00:10Z"
        }
        ```

---

## 2. RESTful APIs (HTTPS)

### 2.1. Đăng ký & Nạp tiền (Auth & Finance)

#### `POST /api/auth/register` (Tạo tài khoản Trader)
*   **Body:** `{ "username": "trader01", "password": "securepassword" }`
*   **Response (201):** `{ "user_id": "...", "token": "JWT_TOKEN", "wallet_balance": 0.00 }`

#### `POST /api/wallet/topup` (Nạp tiền vào ví - Chỉ dành cho Cashier)
*   **Headers:** `Authorization: Bearer <CASHIER_TOKEN>`
*   **Body:** `{ "user_id": "UUID_CỦA_KHÁCH", "amount": 500000.00 }`
*   **Response (200):** `{ "transaction_id": "UUID_GD", "new_balance": 500000.00, "tx_hash": "..." }`

---

### 2.2. Giao dịch & Khớp lệnh (Trading & Order Engine)

#### `POST /api/orders/place` (Khớp lệnh đặt món)
*   **Headers:** `Authorization: Bearer <CUSTOMER_TOKEN>`
*   **Body:**
    ```json
    {
      "table_number": "14",
      "items": [
        {
          "product_id": 101,
          "quantity": 2,
          "expected_price": 55000.00
        }
      ],
      "client_timestamp": "2026-07-26T09:00:10.500Z"
    }
    ```
*   **Logic xử lý Backend:**
    - Kiểm tra `is_trading` của sản phẩm. Nếu `false`, trả về lỗi (403 - Trading halted).
    - So sánh `expected_price` với `current_price` của server. Cho phép dung sai trễ mạng (3 giây).
    - Nếu giá tăng quá nhanh vượt quá sai số cho phép, từ chối giao dịch (409 - Price mismatch), yêu cầu client cập nhật giá mới.
    - Thực hiện ACID transaction: Trừ `wallet_balance` → Tạo `ORDER` & `ORDER_ITEMS` → Ghi log `WALLET_TRANSACTIONS` → Sinh `tx_hash`.
*   **Response (200):** `{ "status": "MATCHED", "order_id": "...", "debited_amount": 110000.00 }`

#### `POST /api/orders/{order_id}/cancel` (Hủy lệnh & Phạt phí)
*   **Headers:** `Authorization: Bearer <CUSTOMER_TOKEN>`
*   **Logic xử lý Backend:**
    - Kiểm tra thời gian từ lúc tạo order. Nếu quá 30 giây, từ chối hủy (400 - Order locked).
    - Kiểm tra trạng thái món. Nếu đã chuyển sang `PREPARING` (Bếp đang nấu), từ chối hủy.
    - Hoàn trả lại 95% số tiền đơn hàng vào ví của khách.
    - Trừ 5% làm phí giao dịch (`CANCEL_PENALTY`), chuyển phí này vào quỹ nhà hàng.
*   **Response (200):** `{ "message": "Order cancelled", "refund_amount": 104500.00, "penalty_amount": 5500.00 }`

---

### 2.3. Báo cáo & Gamification

#### `GET /api/market/leaderboard` (Bảng xếp hạng Trader xuất sắc đêm nay)
*   **Query Params:** `?limit=10`
*   **Response (200):**
    ```json
    [
      {
        "username": "hoang_tuan_trader",
        "total_volume": 1250000.00,
        "total_saved": 340000.00,
        "success_trades": 18
      }
    ]
    ```

#### `GET /api/market/products/{id}/candles` (Báo cáo biểu đồ hình nến cho Admin)
*   **Query Params:** `?resolution=5m` (5 phút một nến)
*   **Response (200):**
    ```json
    [
      {
        "time": "2026-07-26T09:00:00Z",
        "open": 50000.00,
        "high": 58000.00,
        "low": 48000.00,
        "close": 55000.00,
        "volume": 42
      }
    ]
    ```
