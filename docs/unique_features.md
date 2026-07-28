# Tính năng Đột phá & Khác biệt (Unique Selling Features)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

> Tài liệu này liệt kê toàn bộ các tính năng khiến dự án này **KHÔNG GIỐNG BẤT KỲ** dự án quản lý nhà hàng nào ngoài thị trường hiện nay. Mỗi tính năng đều được giải thích rõ về giá trị mang lại và độ phức tạp kỹ thuật.

---

## NHÓM 1: CORE DIFFERENTIATORS (Khác biệt Cốt lõi)
*Những tính năng này chỉ riêng dự án này mới có. Không tìm thấy ở KiotViet, Sapo, hay bất kỳ app quản lý nhà hàng nào trên thị trường Việt Nam.*

---

### USF-01: Dynamic Pricing Engine (Bộ máy Định giá Động theo Cung-Cầu)
**Mô tả:** Giá của mỗi món ăn/đồ uống KHÔNG phải con số cố định. Nó thay đổi mỗi 10 giây dựa trên lượng người đặt mua trong 5 phút vừa qua. Cơ chế y hệt sàn chứng khoán hoặc giá vé máy bay.

**Người hưởng lợi:**
- *Khách hàng:* Cảm giác hồi hộp, kích thích, muốn "bắt đáy" đặt mua khi giá rẻ.
- *Chủ quán:* Tự động kích cầu những món ít bán (giá tự giảm) và tối ưu lợi nhuận những món hot (giá tự tăng). Không cần thuê Marketing Manager.

**Thuật toán cốt lõi:**
```
Nếu món có lượng order TĂNG trong 5 phút qua:
  NewPrice = CurrentPrice × (1 + QtySold_5m × K_Factor)
  (giới hạn không vượt MaxPrice)

Nếu món KHÔNG có ai order trong 15 phút:
  NewPrice = CurrentPrice × 0.98  (giảm 2% mỗi chu kỳ)
  (giới hạn không thấp hơn MinPrice)
```

**Kỹ thuật:**
- Background Job / CRON Worker chạy mỗi 10 giây trên Server.
- Ghi log mỗi lần thay đổi giá vào bảng `PRICE_HISTORY` để vẽ biểu đồ lịch sử.

---

### USF-02: Live Trading Board (Bảng Điện tử Giao dịch Thời gian Thực)
**Mô tả:** Thay vì một trang Menu PDF nhàm chán, toàn bộ giao diện đặt món của khách hàng là một bảng điện tử nhấp nháy y hệt màn hình sàn Binance hoặc HSX (Sàn chứng khoán Hà Nội).

**Trải nghiệm thực tế:**
- Mỗi món ăn là một ô (Cell) hiển thị Tên, Giá Hiện tại, % Thay đổi so với 5 phút trước.
- Khi giá tăng: Ô đó chớp màu **Xanh Lá** và xuất hiện mũi tên ▲.
- Khi giá giảm: Ô đó chớp màu **Đỏ** và xuất hiện mũi tên ▼.
- Con số giá nhảy lên/xuống với animation smooth.

**Kỹ thuật:**
- WebSockets (Socket.io hoặc SignalR) duy trì kết nối liên tục.
- Frontend ReactJS lắng nghe event `PRICE_UPDATE` và re-render chỉ các ô thay đổi (Optimized rendering, không load lại cả trang).
- Sử dụng CSS Animation / Framer Motion để tạo hiệu ứng chớp màu chuyên nghiệp.

---

### USF-03: Biểu đồ Lịch sử Giá (Price History Chart per Item)
**Mô tả:** Mỗi món ăn có riêng một trang chi tiết hiển thị biểu đồ đường (Line Chart) cho thấy giá đã biến động như thế nào trong 1 giờ, 3 giờ, hoặc 24 giờ qua.

**Giá trị độc đáo:** Khách hàng có thể "phân tích kỹ thuật" (Technical Analysis) để quyết định thời điểm tốt nhất đặt mua một ly cocktail, hệt như đang phân tích đồ thị coin trên TradingView.

**Kỹ thuật:**
- Thư viện biểu đồ: Recharts hoặc ApexCharts (React-friendly).
- Dữ liệu lấy từ API `GET /api/products/{id}/history?timeframe=1h`.
- Tối ưu bằng Composite Index `(product_id, timestamp)` trên Database.

---

### USF-04: Market Crash Event — Sự kiện "Sập Sàn"
**Mô tả:** Một sự kiện có thể xảy ra bất ngờ bất cứ lúc nào trong đêm, làm toàn bộ đồ uống trong quán đồng loạt rớt về giá tối thiểu (MinPrice) trong vòng đúng 3 phút.

**Trải nghiệm thực tế:**
- Màn hình tivi lớn trong quán + điện thoại của TẤT CẢ khách hàng đang kết nối đồng thời chuyển sang nền đỏ rực nhấp nháy.
- Âm thanh còi báo động phát ra từ loa (Web Audio API).
- Một đồng hồ đếm ngược `02:59 → 02:58...` khổng lồ xuất hiện giữa màn hình.
- Khách hàng bật dậy khỏi ghế, hô hào nhau, tranh nhau bấm đặt đồ uống.
- Hết 3 phút, giá vọt trở lại `BasePrice` với animation màn hình trắng bừng sáng.

**Kỹ thuật:**
- Admin bấm "TRIGGER CRASH" → Server gọi WebSocket broadcast event `MARKET_CRASH_ALERT` tới toàn bộ client.
- Server tự set một `setTimeout` hoặc Job 3 phút để phát event `MARKET_RECOVERED`.
- Frontend hiển thị toàn màn hình overlay với Countdown Timer và hiệu ứng.

---

### USF-05: Ví Điện tử Nội bộ (In-house Digital Wallet) — Thanh toán 1-click
**Mô tả:** Khách hàng không phải gọi nhân viên, không cần chờ tính tiền. Chỉ cần nạp tiền mặt vào Ví lúc mới vào quán, sau đó toàn bộ đêm thoải mái bấm "Mua Ngay" 1 nút, tiền trừ tức thì.

**Lý do quan trọng cho hệ thống:** Đây là yếu tố làm cho toàn bộ mô hình "Sàn giao dịch" trở nên khả thi về mặt tốc độ. Nếu mỗi lần đặt món lại phải qua cổng thanh toán (MoMo, VNPay), độ trễ sẽ làm hỏng trải nghiệm "bắt đáy" siêu tốc.

**Kỹ thuật:**
- Trường `wallet_balance` trên bảng `USERS`.
- Dùng Database Transaction (ACID) để đảm bảo khi trừ tiền, không xảy ra lỗi Race Condition (2 request cùng trừ cùng 1 lúc làm âm số dư).
- Thu ngân nạp tiền bằng màn hình POS riêng.

---

## NHÓM 2: ADVANCED DIFFERENTIATORS (Khách biệt Nâng cao)
*Những tính năng này rất hiếm, thậm chí một số App startup triệu đô cũng chưa làm được đẹp.*

---

### USF-06: KDS Thông minh với Cảnh báo SLA (Smart Kitchen Display System)
**Mô tả:** Màn hình dành riêng cho Bếp hiển thị danh sách đơn cần nấu theo dạng Kanban Board. Nếu một đơn ngồi ở cột "Chờ nấu" quá 15 phút, thẻ đó tự động chuyển đỏ rực kèm âm thanh cảnh báo.

**Điểm tinh tế:** Đây là khái niệm "Service Level Agreement" (SLA) của ngành dịch vụ, được áp dụng vào nhà bếp. Rất ít phần mềm nhà hàng tại Việt Nam làm được điều này.

**Kỹ thuật:**
- Mỗi khi có Order mới, WebSocket broadcast event `KITCHEN_NEW_ORDER` chỉ tới màn hình bếp.
- Frontend dùng `setInterval` đếm thời gian mỗi thẻ đơn từ lúc tạo.
- Khi vượt ngưỡng 15 phút, React component tự động đổi className → CSS animation nhấp nháy đỏ.

---

### USF-07: Gamification — Bảng xếp hạng Khách hàng "Trader" Đêm nay
**Mô tả:** Cuối đêm (hoặc real-time), quán hiển thị một "Bảng Trader Xuất sắc" trên màn hình tivi lớn. Đây là bảng xếp hạng Top khách hàng đặt được nhiều đơn nhất trong đêm, hoặc người nào "bắt đáy" giỏi nhất (mua được nhiều món ở mức giá thấp nhất).

**Giá trị:** Khách hàng thấy tên mình trên màn hình lớn, cực kỳ kích thích. Tạo thêm lý do để họ order nhiều hơn.

**Kỹ thuật:**
- Query SQL tổng hợp: Tính tổng số tiền tiết kiệm của mỗi User dựa vào `(base_price - price_at_purchase) × quantity` từ bảng `ORDER_ITEMS`.
- Phát leaderboard qua WebSocket hoặc refresh định kỳ 1 phút.

---

### USF-08: Market Controller Dashboard — Bảng điều khiển Thị trường của Admin
**Mô tả:** Một màn hình chỉ dành cho Quản lý, cho phép điều chỉnh hành vi của thuật toán định giá **mà không cần restart server** hay chỉnh code.

**Các thông số điều chỉnh được:**
- **K_Factor Slider:** Kéo thanh trượt để quyết định giá tăng nhanh hay chậm khi có người mua.
- **Crash Duration:** Chỉnh thời gian Sập sàn (Ví dụ: hôm nay đặc biệt crash kéo dài 5 phút).
- **Protected Items:** Tick chọn các món ăn KHÔNG bị ảnh hưởng bởi Market Crash (Ví dụ: các combo đặt trước).
- **Nút TRIGGER CRASH** có nắp đậy (phải lift-up nắp rồi bấm để tránh bấm nhầm).

**Kỹ thuật:**
- Các thông số lưu trong bảng `SYSTEM_CONFIG` trên Database, Background Worker đọc lại mỗi chu kỳ.
- Admin thay đổi qua API PATCH → Worker nhận giá trị mới trong chu kỳ tiếp theo mà không cần restart.

---

## NHÓM 3: POLISH FEATURES (Hoàn thiện đẳng cấp thương mại)
*Những tính năng nhỏ nhưng làm dự án trông như một Startup thực thụ đang kinh doanh.*

---

### USF-09: Inventory Auto-deduct với BOM (Công thức Nguyên liệu)
**Mô tả:** Mỗi khi một đơn hàng được tạo, hệ thống tự động trừ kho nguyên vật liệu dựa theo "Công thức" (Bill of Materials). VD: Bán 1 ly Matcha Latte → Trừ kho: 15g bột matcha, 200ml sữa, 1 cốc nhựa, 1 ống hút.

### USF-10: Báo cáo Doanh thu "Trading Report" theo style Finance
**Mô tả:** Thay vì báo cáo cột/thanh thông thường, Dashboard của Admin hiển thị Doanh thu hàng đêm theo biểu đồ hình nến Candlestick (như biểu đồ chứng khoán), mỗi "nến" đại diện cho 1 giờ kinh doanh (Cao nhất, Thấp nhất, Mở cửa, Đóng cửa theo lượng đơn hàng).

### USF-11: QR-code Table Linking
**Mô tả:** Mỗi bàn trong quán có 1 mã QR riêng. Khách quét QR, điện thoại tự nhận diện "Tôi đang ở Bàn số 7" và mọi đơn hàng đặt từ điện thoại đó sẽ tự liên kết với Bàn 7 mà không cần nhân viên nhập thủ công.

---

## Tổng kết — Ma trận So sánh với Đối thủ

| Tính năng | Food Stock Exchange | KiotViet | Sapo F&B | App đồ án thông thường |
|---|---|---|---|---|
| Giá động theo Cung-Cầu | ✅ | ❌ | ❌ | ❌ |
| Bảng Trading Real-time | ✅ | ❌ | ❌ | ❌ |
| Biểu đồ lịch sử giá | ✅ | ❌ | ❌ | ❌ |
| Sự kiện Sập sàn | ✅ | ❌ | ❌ | ❌ |
| Ví điện tử nội bộ | ✅ | ✅ | ✅ | ❌ |
| KDS Bếp Real-time | ✅ | ✅ | ✅ | ❌ |
| Gamification Leaderboard | ✅ | ❌ | ❌ | ❌ |
| Market Controller Dashboard | ✅ | ❌ | ❌ | ❌ |
| QR Table Linking | ✅ | ❌ | ✅ | ❌ |
| Báo cáo Candlestick | ✅ | ❌ | ❌ | ❌ |
