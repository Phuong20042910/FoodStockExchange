# Quy tắc Nghiệp vụ Startup (Startup Business Rules & Market Mechanics)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

Tài liệu này đặc tả toàn bộ các quy tắc nghiệp vụ, thuật toán tài chính và cơ chế vận hành thị trường của hệ thống. Đây là tài liệu pháp lý kỹ thuật (Technical Specs) để định hình logic vận hành của dự án nhằm mục đích cạnh tranh thương mại thực tế.

---

## 1. Thuật toán Định giá Động Nâng cao (Adaptive Dynamic Pricing Engine)

Giá sản phẩm không thay đổi tuyến tính đơn giản mà tự thích ứng (adaptive) theo hành vi thị trường thời gian thực.

### BR-1.1: Chu kỳ cập nhật (Tick Rate)
*   Giá của tất cả mặt hàng được tính toán lại sau mỗi chu kỳ **10 giây (1 Tick)**.
*   Giá trị thay đổi sẽ được broadcast ngay lập tức qua WebSocket đến tất cả client đang kết nối.

### BR-1.2: Các tham số cơ bản của sản phẩm
Mỗi sản phẩm trong Database có các thuộc tính giới hạn tài chính bắt buộc:
*   $P_{base}$ (Base Price): Giá tiêu chuẩn ban đầu khi mở cửa.
*   $P_{min}$ (Min Price / Floor): Giá sàn bảo toàn vốn (thường là Giá vốn nguyên liệu + 10% chi phí vận hành).
*   $P_{max}$ (Max Price / Ceiling): Giá trần bảo vệ người tiêu dùng (thường là $P_{base} \times 2.5$).
*   $P_{current}$ (Current Price): Giá giao dịch hiện tại.
*   $K$ (Elasticity Factor - Hệ số co giãn): Mức độ nhạy cảm của giá đối với lực mua (mặc định từ $0.005$ đến $0.05$).

### BR-1.3: Thuật toán tăng giá theo Lực Mua (Surge Pricing Formula)
Khi có giao dịch phát sinh, giá mới của sản phẩm $i$ ở chu kỳ tiếp theo được tính như sau:

$$P_{new} = P_{current} \times \left(1 + \ln(1 + Q_{5m}) \times K_{adaptive}\right)$$

*Trong đó:*
*   $Q_{5m}$: Tổng số lượng sản phẩm $i$ được bán ra trong 5 phút gần nhất. Việc dùng hàm Logarit tự nhiên ($\ln$) giúp kìm hãm đà tăng phi mã của giá khi có hiện tượng FOMO tập thể đột biến, giữ giá tăng một cách bền vững.
*   $K_{adaptive}$: Hệ số co giãn tự thích ứng (được định nghĩa ở mục BR-1.5).

### BR-1.4: Thuật toán giảm giá kích cầu (Cool-down Formula)
Nếu sản phẩm $i$ không phát sinh bất kỳ giao dịch nào trong khoảng thời gian $T_{idle}$ (mặc định 10 phút):
*   Cứ mỗi 1 phút tiếp theo không có đơn hàng, giá tự động giảm:
    $$P_{new} = P_{current} \times (1 - D_{rate})$$
    *(Với $D_{rate}$ là tỷ lệ giảm mặc định $0.015$ - tức 1.5% mỗi phút).*
*   Giá giảm liên tục cho đến khi chạm mức $P_{min}$ thì dừng lại.

### BR-1.5: Hệ số Co giãn Tự thích ứng theo Mật độ Khách (Adaptive K-Factor)
Hệ số co giãn $K_{adaptive}$ tự động thay đổi dựa vào số lượng người dùng online đồng thời trên hệ thống (Active Connections):
*   Nếu $Connections < 50$ (Quán vắng): $K_{adaptive} = K \times 0.5$ (Giá tăng chậm hơn để khuyến khích mua).
*   Nếu $Connections \ge 200$ (Quán đông): $K_{adaptive} = K \times 1.5$ (Giá tăng nhanh hơn để tối đa hóa doanh thu).

---

## 2. Cơ chế Bảo vệ Thị trường (Market Security & Circuit Breaker)

Để ngăn chặn việc đầu cơ, lỗi hệ thống hoặc việc khách hàng "phối hợp" làm lũng đoạn giá cả của quán.

### BR-2.1: Bộ ngắt mạch tự động (Circuit Breaker)
*   Nếu giá của một sản phẩm tăng hoặc giảm vượt quá **40% trong vòng 60 giây**, trạng thái giao dịch của sản phẩm đó sẽ tự động bị khóa (Freeze) trong vòng **2 phút**.
*   Màn hình khách hàng sẽ hiển thị trạng thái "TẠM NGỪNG GIAO DỊCH" (Trading Halts) đối với món đó.
*   Mục đích: Ngăn chặn lỗi spam đơn hàng hoặc hành vi trục lợi khi thuật toán bị tính toán sai lệch.

### BR-2.2: Giới hạn số lượng mua mỗi lệnh (Order Size Limit)
*   Một khách hàng không được đặt mua quá **5 đơn vị** của cùng một món ăn/đồ uống trong cùng một lệnh giao dịch ở mức giá hiện tại.
*   Muốn mua thêm, khách phải đợi chu kỳ giá tiếp theo. Điều này ngăn chặn một nhóm khách giàu có "ôm hàng" giá rẻ khi thị trường bắt đầu tăng.

### BR-2.3: Phí hủy lệnh (Cancellation Penalty / Fee)
*   Khách hàng có quyền hủy đơn hàng đã đặt trong vòng **30 giây** kể từ khi bấm đặt (phòng trường hợp bấm nhầm).
*   Tuy nhiên, hệ thống sẽ tự động trừ **5% phí giao dịch** dựa trên tổng trị giá đơn hàng đó vào ví của khách.
*   Sau 30 giây hoặc khi bếp đã chuyển trạng thái sang "Đang nấu" (`PREPARING`), khách hàng tuyệt đối không được phép hủy đơn.

---

## 3. Quản lý Kho & Định giá theo Tồn Kho (Inventory-Driven Elastic Pricing)

Sự sáng tạo của hệ thống nằm ở việc liên kết trực tiếp giữa lượng tồn kho vật lý và giá bán ảo.

### BR-3.1: Hệ số khan hiếm nguyên liệu (Scarcity Factor)
Khi lượng tồn kho của nguyên vật liệu chính của món ăn rơi xuống mức báo động (dưới 15% định mức):
*   Hệ thống tự động kích hoạt hệ số nhân khan hiếm $S_{factor} = 1.3$ vào công thức định giá.
*   Giá món ăn lập tức tăng thêm 30% so với giá tính toán thông thường để bảo toàn nguyên liệu cho những khách hàng thực sự sẵn sàng chi trả cao nhất.

### BR-3.2: Công thức khấu hao kho tự động (BOM System)
*   Mỗi món ăn liên kết với một bảng định mức nguyên vật liệu (Recipe).
*   Khi đơn hàng chuyển sang trạng thái "Đang nấu" (`PREPARING`), hệ thống sẽ trừ trực tiếp nguyên liệu thô trong kho.
*   Nếu bất kỳ nguyên liệu thô nào chạm mức 0, toàn bộ các món ăn sử dụng nguyên liệu đó trên menu sẽ tự động chuyển sang trạng thái "TẠM HẾT HÀNG" (Out of Stock) thời gian thực.

---

## 4. Cơ chế Sập Sàn (Market Crash Mechaniscs) & Gamification

### BR-4.1: Luật chơi Market Crash
Sự kiện sập sàn là công cụ marketing lan truyền (viral) cực mạnh cho quán.
*   **Thời lượng:** Đúng **180 giây** (3 phút).
*   **Giá trị:** Toàn bộ đồ uống giảm về mức $P_{min}$ (hoặc giảm sâu hơn tùy cấu hình).
*   **Giới hạn sập sàn:** Mỗi khách hàng chỉ được mua tối đa 2 món đồ uống giá sập sàn trong suốt thời gian diễn ra sự kiện để tránh việc một người gom sạch đồ uống của cả quán.

### BR-4.2: Cơ chế Chia sẻ Giao dịch thành công (Viral Loop Referral)
*   Sau khi "bắt đáy" thành công một món ăn với giá rẻ hơn giá gốc từ 30% trở lên, ứng dụng khách hàng sẽ hiện popup: *"Bạn đã mua thành công Bia với giá chỉ 18k (Giá gốc 35k)! Chia sẻ lên mạng xã hội để nhận thêm 10k vào Ví điện tử"*.
*   Hệ thống tích hợp SDK chia sẻ mạng xã hội, kiểm tra callback thành công để tự động cộng tiền thưởng vào tài khoản khách.

---

## 5. Quy tắc Tài chính & Đối soát ví (Financial Audit & Wallets)

### BR-5.1: Nguyên tắc Bất biến của Giao dịch ví (Double-Entry Ledger)
*   Mọi giao dịch nạp tiền, trừ tiền đặt món, hoàn tiền, phạt hủy đơn đều phải được ghi nhận đồng thời vào bảng `WALLET_TRANSACTIONS` và bảng `FINANCIAL_LEDGER`.
*   Nghiêm cấm việc chỉ cập nhật cột `wallet_balance` trong bảng `USERS` mà không ghi log giao dịch chi tiết.
*   Mỗi dòng log giao dịch phải chứa chữ ký số băm (hash integrity check) của dòng trước đó để ngăn chặn hacker can thiệp trực tiếp vào database để sửa tiền ví.

---

## 6. Quy tắc Nghiệp vụ Mở rộng Doanh nghiệp (Enterprise Expansion Rules)

### BR-6.1: Cú pháp Nạp tiền Ngân hàng VietQR Auto-Matching
*   Cú pháp nội dung chuyển khoản bắt buộc: `NAP <USER_ID>` (VD: `NAP 1042`).
*   Webhook ngân hàng kiểm tra đúng định dạng `amountIn > 0` và trích xuất đúng `USER_ID`. Số tiền nạp tối thiểu: **20,000 VND**.
*   Mọi giao dịch nạp auto-topup khớp lệnh được cộng tiền trong <2s và bắn thông báo Push Notification / Broadcast xuống App khách hàng.

### BR-6.2: Thuật toán Tính Lời/Lỗ Danh Mục Đầu Tư (Trader PnL Calculation)
*   Đối với mỗi loại món ăn/đồ uống khách nắm giữ trong ví voucher:
    $$\text{Average Entry Price} = \frac{\sum (\text{Price}_{purchase} \times \text{Quantity})}{\sum \text{Quantity}}$$
    $$\text{Unrealized PnL} = (\text{Current Market Price} - \text{Average Entry Price}) \times \text{Holding Quantity}$$
*   Hiển thị màu xanh lá khi PnL > 0 (Đang có lời) và màu đỏ khi PnL < 0 (Đang lỗ).

### BR-6.3: Quy tắc Phân Luồng Trạm Chế Biến (Station Routing Rules)
*   Mọi sản phẩm có `category` là Beer / Cocktail / Beverage được định tuyến về `STATION_BAR`.
*   Sản phẩm `category` là Main Dish / Fast Food được định tuyến về `STATION_HOT_KITCHEN`.
*   Sản phẩm `category` Dessert / Salad được định tuyến về `STATION_COLD_KITCHEN`.
*   Trạm bếp/bar xử lý độc lập từng danh mục item mà không làm ảnh hưởng tới các item thuộc trạm khác trong cùng 1 đơn hàng.

### BR-6.4: Chỉ Số Tâm Lý Thị Trường Volatility Index (VIX) & Tự Động Đặt Hàng PO
*   $VIX$ được tính theo công thức:
    $$VIX = \min\left(100, \text{Round}\left(\frac{\text{Volume}_{15m}}{\text{Users}_{online}} \times 50 + \text{PriceChange}_{avg}\%\right)\right)$$
*   **Supplier Auto-PO Rule**: Khi `stock_qty` trong `raw_materials` $\le$ `min_threshold`, hệ thống tự động sinh `PURCHASE_ORDERS` với số lượng $Q_{reorder} = (\text{max\_threshold} - \text{stock\_qty})$ để gửi nhà cung cấp.

