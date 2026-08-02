# Ma Trận Phân Quyền & Quy Trình Nghiệp Vụ Theo Vai Trò (Role & Operations Matrix)

Hệ thống **Food Stock Exchange** được thiết kế chuẩn doanh nghiệp với 4 Vai trò (Role) độc lập, đảm bảo tính phân tách trách nhiệm (Separation of Duties - SoD) và tối ưu hóa vận hành nhà hàng/quán bar:

---

## 🎭 Bảng Tổng Quan Các Vai Trò (Role Overview Matrix)

| Vai Trò (Role) | Mã Role SQL | Quyền Hạn Giao Diện (UI Access) | Chức Năng Nghiệp Vụ Thực Tế |
|---|---|---|---|
| **Khách Hàng / Trader** | `CUSTOMER` | Tab **BẢNG GIAO DỊCH** | • Xem bảng giá nến 10s & biến động real-time.<br>• Đặt lệnh mua ngay (1-Touch) hoặc Lệnh chờ (Limit Order).<br>• Mua/Bán lại suất uống trên Chợ Thứ Cấp P2P.<br>• Nạp tiền ngân hàng VietQR tự động (SePAY Webhook).<br>• Trò chuyện tư vấn cùng **AI Broker Cạ Nhậu**. |
| **Nhân Viên Thu Ngân** | `CASHIER` | Tab **THU NGÂN (POS)** & **BẢNG GIAO DỊCH** | • Nạp tiền ví điện tử tại quầy trực tiếp cho khách.<br>• Tra cứu hồ sơ Trader theo Tên/SĐT.<br>• Xác nhận thanh toán & In hóa đơn nhiệt ESC/POS.<br>• Theo dõi doanh thu tiền mặt / chuyển khoản ca trực. |
| **Nhân Viên Bếp / Barista** | `KITCHEN` | Tab **MÀN HÌNH BẾP (KDS)** & **BẢNG GIAO DỊCH** | • Nhận phiếu chế biến KDS sắp xếp theo thời gian order.<br>• Theo dõi cảnh báo đếm ngược SLA (Xanh: <5p, Vàng: 5-10p, Đỏ: >10p).<br>• Chuyển trạng thái đơn: `PREPARING` ➔ `READY` ➔ `SERVED`.<br>• Báo hết hàng nguyên liệu thô (BOM Inventory Alert). |
| **Ban Quản Trị / Chủ Quán** | `ADMIN` | **TOÀN BỘ 4 TAB** (Admin, POS, KDS, Trading) | • Điều phối gia tốc biến động giá (K-factor Amplifier).<br>• Cấu hình thời gian xả giá cool-down.<br>• Nút khẩn cấp sập sàn (PANIC CRASH) hoạt náo.<br>• Quản lý danh sách tài khoản & Phân quyền Role.<br>• Nạp/Sửa số dư ví trực tiếp.<br>• Đồng bộ Menu Quốc Tế & Đặc Sản Việt Nam.<br>• Điều khiển giả lập đèn RGB IoT Smart Bar Lighting. |

---

## 🔄 Quy Trình Phối Hợp Nghiệp Vụ Giữa Các Vai Trò (Cross-Role Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor C as Khách Hàng (CUSTOMER)
    actor CS as Thu Ngân (CASHIER)
    actor K as Đầu Bếp (KITCHEN)
    actor A as Quản Trị (ADMIN)

    C->>C: Xem Bảng Giá Real-Time & Chốt Đặt Đồ Uống
    C->>CS: Nạp Tiền Ví Tại Quầy / Thanh Toán VietQR Auto
    CS->>C: Cập Nhật Số Dư Ví & Xác Nhận Đơn Hàng
    CS->>K: Đơn Hàng Tự Động Bắn Sang Màn Hình Bếp KDS
    K->>K: Chế Biến Món & Bấm 'READY' Khi Phục Vụ
    K->>C: Trả Đồ Uống Cho Khách
    A->>A: Quản Trị Viên Soi Analytics, K-Factor & Sập Sàn Activating
```

---

## 🛡 Bảo Mật & Kiểm Soát Truy Cập (Access Control Security)
- **Token JWT Validation**: Mọi endpoint Backend được bảo vệ bởi middleware `auth(['ROLE_NAME'])`.
- **Role-based Navigation**: Thanh Main Navbar tự động ẩn/hiện các tab phù hợp với Role đăng nhập, ngăn chặn việc truy cập trái phép.
