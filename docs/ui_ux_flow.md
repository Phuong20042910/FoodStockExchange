# Luồng Trải nghiệm Người dùng (UI/UX Flow)
## Dự án: Food Stock Exchange

Để dự án toát lên vẻ chuyên nghiệp, giao diện (Frontend) nên được thiết kế theo tone màu tối (Dark Mode / Cyberpunk) để làm nổi bật các con số nhấp nháy xanh đỏ như sàn chứng khoán.

---

### 1. Màn hình Khách hàng (Customer Web/App)

#### 1.1. Màn hình Trading Board (Bảng Giao Dịch Chạm)
*   **Giao diện:** Tương tự sàn Binance. Chia làm các ô vuông lưới (Grid). Mỗi ô là một món ăn.
*   **Hiển thị Real-time:** Giá tiền sẽ chớp màu **Xanh Lá** khi tăng giá, chớp màu **Đỏ** khi giảm giá.
*   **Tương tác:** Khách hàng thấy giá đang rẻ, bấm nút **"BUY 1"** (Mua ngay 1 ly). Hệ thống trừ tiền thẳng vào `wallet_balance` và thông báo "Khớp lệnh thành công" ở góc màn hình.

#### 1.2. Màn hình Chi tiết Món (Biểu đồ)
*   Khi bấm vào 1 món (VD: Bia Heineken), sẽ mở ra một biểu đồ đường (Line Chart) đi lên đi xuống.
*   Khách có thể xem xu hướng: 15 phút trước giá bao nhiêu, bây giờ giá bao nhiêu để đưa ra quyết định "bắt đáy".

#### 1.3. Hiệu ứng Sập sàn (Market Crash Effect)
*   Khi Admin kích hoạt Market Crash, màn hình điện thoại của toàn bộ khách trong quán sẽ tự động xuất hiện viền đỏ nhấp nháy.
*   Một đồng hồ đếm ngược `03:00` khổng lồ thả xuống giữa màn hình với dòng chữ: "CHỚP THỜI CƠ - ĐỒ UỐNG GIẢM KỊCH SÀN".

---

### 2. Màn hình Đầu bếp (Kitchen Display System - KDS)

*   **Thiết bị:** Chạy trên Tablet hoặc Màn hình cảm ứng lớn đặt trong bếp.
*   **Giao diện Kanban Board:**
    *   Cột 1: Đơn mới tới (Đèn viền bình thường).
    *   Cột 2: Đang nấu.
    *   Cột 3: Nấu xong.
*   **Cảnh báo trễ (SLA Alert):** Nếu một món ăn nằm ở Cột 1 quá 15 phút, thẻ đơn hàng đó sẽ tự động chuyển sang màu đỏ rực và phát ra âm thanh "Tít Tít" để hối thúc đầu bếp.

---

### 3. Màn hình Admin / Thu ngân (POS & Dashboard)

*   **POS Cashier:** Giao diện tính tiền thông thường, có nút **"Top-up"** để nạp tiền mặt từ khách vào ví điện tử (Wallet) trên app của khách.
*   **Market Controller:** Một bảng điều khiển bí mật của Quản lý:
    *   Kéo thanh Slider (Thanh trượt) để điều chỉnh mức độ biến động giá (Ví dụ: Chỉnh Slider cao lên thì giá tăng nhanh hơn khi có người mua).
    *   Nút bấm vật lý ảo có nắp đậy màu đỏ mang tên **"TRIGGER CRASH"**. Bấm vào là toàn quán giảm giá.
