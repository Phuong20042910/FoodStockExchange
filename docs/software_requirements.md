# Yêu cầu Phần mềm Khởi nghiệp (Startup Software Requirements Specification)
## Dự án: Food Stock Exchange — Sàn Giao Dịch Ẩm Thực

Tài liệu này xác định chi tiết các tính năng nghiệp vụ, điều kiện biên kỹ thuật và tiêu chuẩn đầu ra sản phẩm (Product Deliverables) để ứng dụng có khả năng cạnh tranh trực tiếp ngoài thị trường thương mại.

---

### 1. Yêu cầu Chức năng chi tiết (Functional Requirements)

#### 1.1. Ứng dụng Khách hàng (Client Portal)
*   **FR-C1 (Màn hình Bảng Điện Tử):**
    *   Hiển thị danh sách các món ăn đang giao dịch dưới dạng bảng nhấp nháy giá liên tục theo giây.
    *   Tự động chớp Xanh Lá khi tăng giá, chớp Đỏ khi giảm giá.
    *   Hiển thị phần trăm (%) biến động giá trong 5 phút gần nhất.
*   **FR-C2 (Trực quan hóa Biểu Đồ):**
    *   Tích hợp biểu đồ đường (Line chart) hiển thị lịch sử giá của từng món theo các mốc thời gian 5 phút, 15 phút, 1 giờ.
    *   Cập nhật điểm dữ liệu mới trên biểu đồ thời gian thực mà không cần reload trang.
*   **FR-C3 (Khớp lệnh Siêu Tốc - One-Click Ordering):**
    *   Cho phép đặt món trực tiếp từ màn hình Bảng điện tử chỉ bằng 1 lượt chạm (sử dụng tiền trong ví điện tử).
    *   Tự động phát hiện chênh lệch giá do trễ mạng (Network Latency) để từ chối giao dịch nếu giá thay đổi quá dung sai cho phép (3 giây).
*   **FR-C4 (Cửa Sổ Hủy Lệnh Phạt):**
    *   Hiển thị nút "Hủy đơn" kèm thanh đếm ngược 30 giây ngay sau khi đặt hàng thành công.
    *   Tự động tính toán số tiền hoàn (95%) và số tiền phạt (5%) hiển thị trực quan trước khi khách xác nhận hủy.
*   **FR-C5 (Trải nghiệm Sự kiện Market Crash):**
    *   Chuyển toàn bộ giao diện app sang theme "PANIC MODE" (Nền tối đỏ, viền chớp sáng cường độ cao) khi có tín hiệu từ server.
    *   Hiển thị đồng hồ đếm ngược (Countdown Timer) thời gian sập sàn.
    *   Phát hiệu ứng âm thanh còi hú báo động.

#### 1.2. Ứng dụng Thu Ngân & Điểm bán (POS Portal)
*   **FR-P1 (Định danh Bàn quét QR):** Tạo/Xuất mã QR tương ứng cho từng bàn ăn. Mã QR phải chứa thông tin bàn mã hóa để tránh khách quét nhầm bàn khác.
*   **FR-P2 (Ví điện tử Khách hàng):** 
    *   Quét mã QR ID của khách để nạp tiền mặt vào ví điện tử.
    *   Hiển thị lịch sử giao dịch và mã băm Audit log để kiểm tra tính toàn vẹn tài chính.

#### 1.3. Hệ thống Bếp (KDS Portal)
*   **FR-K1 (Quy trình Kanban Bếp):** Nhận order realtime, hỗ trợ kéo thả trạng thái từ Chờ làm → Đang làm → Đã xong.
*   **FR-K2 (Hệ thống Cảnh báo SLA Bếp):**
    *   Tự động đo đếm thời gian kể từ lúc bếp nhận đơn.
    *   Tự động đổi màu thẻ đơn hàng sang cam (nếu quá 10 phút) và đỏ nhấp nháy kèm âm thanh (nếu quá 15 phút).

#### 1.4. Bảng điều khiển Quản trị (Admin Market Control)
*   **FR-A1 (Market Simulator):** Thanh trượt thay đổi $K$ (độ nhạy biến động giá) và $T_{idle}$ (thời gian giảm giá tự động của món ế).
*   **FR-A2 (Panic Button):** Nút kích hoạt Market Crash chủ động.
*   **FR-A3 (Báo cáo Tài chính Nến Nhật):** Thống kê doanh thu theo giờ dạng biểu đồ hình nến (Candlestick chart).

---

### 2. Yêu cầu Phi chức năng & Kiến trúc Chịu tải (Non-Functional Requirements)

*   **NFR-1 (Real-time Latency):** Độ trễ truyền phát giá từ database đến màn hình khách hàng không được vượt quá **150ms** trên mạng 4G/Wifi tiêu chuẩn.
*   **NFR-2 (Xử lý Race Condition):** Hệ thống phải sử dụng cơ chế khóa hàng đợi (Row-level Lock hoặc Redis Distributed Lock) để đảm bảo khi 2 người dùng bấm mua 1 món ăn duy nhất còn lại trong kho cùng một lúc, hệ thống chỉ khớp lệnh cho người đến trước và hoàn trả tiền cho người đến sau mà không gây lỗi âm kho.
*   **NFR-3 (Bảo mật Integrity):** Mọi giao dịch tiền tệ bắt buộc phải tính toán và lưu kèm mã băm SHA-256 (`tx_hash`) dựa vào dòng giao dịch liền trước (Blockchain-like Ledger). Hệ thống tự động khóa tài khoản và cảnh báo Admin nếu phát hiện số dư ví bị can thiệp bất hợp pháp mà không có log khớp hash.
*   **NFR-4 (UI/UX Aesthetics):** 
    *   Tối ưu hóa UI theo phong cách Cyberpunk tài chính (màu nền tối #0D0E12, các con số hiển thị bằng font chữ LED số hóa và phát sáng neon).
    *   Hiệu ứng chuyển cảnh mượt mà 60fps trên thiết bị di động.
