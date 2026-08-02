# Kiến Trúc Luồng Doanh Nghiệp Mở Rộng (Enterprise Flow Architecture)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

Tài liệu này định nghĩa chi tiết 5 luồng nghiệp vụ thương mại chuyên sâu (End-to-End Enterprise Flows) để đưa dự án lên cấp độ vận hành quy mô doanh nghiệp kinh doanh nhà hàng/quán bar thực chiến.

---

## 1. Luồng Sơ Đồ Bàn Trực Quan & Đặt Bàn Trực Truyền (Visual Floor Plan & Table Reservation Engine)

### 1.1. Sơ Đồ Bàn 2D & Định Danh Mã PIN
- **Mô tả**: Quản lý mặt bằng theo các phân khu:
  - `ZONE_BAR`: Khu quầy Bar trung tâm (Bàn cao, xem bảng điện tử trực tiếp).
  - `ZONE_MAIN`: Khu vực sảnh chính (Bàn nhóm 4 - 8 người).
  - `ZONE_VIP`: Khu vực phòng VIP riêng biệt.
  - `ZONE_TERRACE`: Khu ban công ngoài trời.
- **Cơ chế Mã QR + Dynamic PIN**:
  - Mỗi bàn có 1 mã QR tĩnh in trên mặt bàn. Khi khách quét mã QR, ứng dụng yêu cầu nhập mã **PIN 4 chữ số** hiển thị trên màn hình e-ink tại bàn hoặc cấp bởi thu ngân để xác nhận khách đang ngồi đúng vị trí vật lý.

### 1.2. Đặt Bàn Trước (Pre-order & Limit Order Auto-Checkin)
- **Luồng hoạt động**:
  ```mermaid
  sequenceDiagram
      autonumber
      actor Client as Khách Hàng
      participant App as React Client App
      participant API as Backend Server
      participant DB as Database
      
      Client->>App: Chọn bàn trên sơ đồ 2D & Thời gian đến
      App->>API: POST /api/reservations (bàn, thời gian, món đặt trước/limit order)
      API->>DB: Lưu trạng thái RESERVED cho bàn & Tạo Lệnh Chờ
      Client->>App: Đến quán & Quét QR code tại bàn
      App->>API: POST /api/reservations/checkin (PIN bàn)
      API->>DB: Đổi trạng thái bàn -> OCCUPIED
      API->>API: Kích hoạt khớp lệnh tự động các món đặt trước theo giá thị trường thời điểm check-in
  ```

---

## 2. Luồng Cổng Thanh Toán Auto-Topup & Danh Mục Đầu Tư Ẩm Thực (VietQR Auto-Topup & Trader PnL Portfolio)

### 2.1. Cổng Nạp Tiền Ngân Hàng Tự Động VietQR / SePAY
- Khách hàng bấm **"NẠP TIỀN VÍ"** trên App -> Hệ thống tạo mã VietQR chuẩn NAPAS 247 kèm cú pháp nội dung chuyển khoản duy nhất: `NAP <USER_ID>`.
- **Webhook Xử Lý Tự Động (POST /api/wallet/webhook/sepay)**:
  ```json
  {
    "gateway": "MBBank",
    "transactionDate": "2026-08-01 23:45:00",
    "accountNumber": "0988888888",
    "subAccount": null,
    "amountIn": 500000.00,
    "amountOut": 0,
    "accumulated": 10500000.00,
    "code": null,
    "transactionContent": "NAP 1042",
    "referenceNumber": "FT2621400982",
    "body": "NAP 1042"
  }
  ```
- **Xử lý Backend**:
  - Trích xuất `USER_ID` từ nội dung chuyển khoản -> Thực hiện ACID Transaction cộng tiền ví -> Ghi log Sổ cái Hash SHA-256 (`tx_hash`) -> Broadcast WebSocket cập nhật số dư hiển thị tức thì trên màn hình khách trong **<2 giây**.

### 2.2. Bảng Quản Lý Danh Mục Đầu Tư Ẩm Thực (Trader PnL Portfolio)
Mỗi tài khoản khách hàng có một tab danh mục đầu tư giống như tài khoản chứng khoán:
- **Mark Price**: Giá thị trường hiện tại của món ăn.
- **Average Entry Price**: Giá mua trung bình của món ăn mà khách đang nắm giữ vé/coupon.
- **Unrealized PnL (Lời/Lỗ Dự Tính)**: 
  $$\text{Unrealized PnL} = (\text{Mark Price} - \text{Entry Price}) \times \text{Số lượng}$$
- **Realized PnL (Lời/Lỗ Đã Chốt)**: Tổng số tiền thu được từ việc rao bán lại trên Chợ P2P minus giá gốc mua ban đầu.

---

## 3. Luồng Điều Phối Trạm Bếp/Bar Tách Biệt & In Phiếu Chế Biến (Multi-Station KDS & Thermal Receipt Printing)

### 3.1. Phân Luồng Trạm Tự Động (Station Routing)
Mỗi đơn hàng sau khi khớp lệnh sẽ tự động phân tách danh mục sản phẩm (Item Splitting) về đúng các màn hình trạm chế biến:
- `STATION_BAR`: Đồ uống (Bia, Cocktail, Mocktail, Rượu vang).
- `STATION_HOT_KITCHEN`: Món ăn nóng (Steak, Burger, Món nướng, Món chiên).
- `STATION_COLD_KITCHEN`: Món lạnh (Salad, Sushi, Trái cây, Tráng miệng).

### 3.2. Giả Lập In Phiếu Nhiệt ESC/POS (Thermal Receipt Printer)
- Ngay khi đơn hàng được trạm bấm **"BẮT ĐẦU NẤU"**, hệ thống sinh định dạng cuộn in nhiệt ESC/POS:
  ```text
  ========================================
         FOOD STOCK EXCHANGE BAR TICKET   
  ========================================
  Thời gian: 01/08/2026 23:45:10
  Bàn số: 09 | Mã đơn: #8F93EE2C
  Trạm: BAR PHA CHẾ
  ----------------------------------------
  [X] 2 x Neon Whiskey Sour (65,000đ)
  [X] 1 x Bia Thủ Công IPA (48,500đ)
  ----------------------------------------
  Ghi chú: Khách yêu cầu ít đá
  ========================================
  ```

---

## 4. Luồng Tự Động Nhập Kho & Tính Biên Lợi Nhuận Thực Tế (Supplier Auto-PO & Food Cost Margin)

### 4.1. Tự Động Sinh Đơn Mua Hàng (Purchase Order - PO)
- Mỗi khi nguyên liệu vật lý (VD: Hạt cà phê, Sữa tươi, Bò Bít tết) trong bảng `raw_materials` giảm xuống dưới ngưỡng `min_threshold`:
- Hệ thống tự động tạo một bản ghi `PURCHASE_ORDERS` ở trạng thái `DRAFT` gửi tới email Nhà cung cấp đã đăng ký kèm số lượng cần nhập bù để duy trì tồn kho an toàn.

### 4.2. Tính Báo Cáo Food Cost Margin Ratio (%) Real-time
$$\text{Food Cost Margin (\%)} = \frac{\text{Giá vốn nguyên liệu định mức (BOM Cost)}}{\text{Giá bán hiện tại (Current Price)}} \times 100\%$$
- Bảng điều khiển Admin tự động cảnh báo nếu giá bán sập sàn khiến `Food Cost Margin > 70%` (Chạm ngưỡng hòa vốn/lỗ nguyên liệu).

---

## 5. Bộ Chỉ Số Tâm Lý Thị Trường & Sự Kiện Lịch Trình (Volatility Index VIX & Scheduled Events)

### 5.1. Chỉ Số Sợ Hãi & Tham Lam (Food Market Volatility Index - VIX)
- Tính toán theo tần suất khớp lệnh và biến động giá trung bình 15 phút:
  $$VIX = \min\left(100, \frac{\text{Tổng đơn 15m}}{\text{Số khách online}} \times 50 + \text{Biến động giá trung bình \%}\right)$$
- Phân loại chỉ số:
  - `0 - 25`: Sợ hãi cực độ (Extreme Fear - Thị trường ảm đạm, giá giảm mạnh).
  - `26 - 50`: Trung tính (Neutral).
  - `51 - 75`: Tham lam (Greed - Sức mua cao).
  - `76 - 100`: Tham lam cực độ (Extreme Greed - Sức mua dồn dập, giá tiệm cận trần).

### 5.2. Sự Kiện Thị Trường Lập Trình Trước (Scheduled Volatility Events)
- Admin có thể đặt lịch chạy tự động:
  - **Happy Hour Volatility Boost**: 20:00 - 21:00 hàng ngày (Tăng hệ số $K$ gấp 2 lần).
  - **Flash Midnight Crash**: 00:00 đêm (Tự động kích hoạt Market Crash 3 phút).
