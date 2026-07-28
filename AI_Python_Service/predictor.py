def predict_next_price(price_history: list) -> float:
    """
    Sử dụng thuật toán Hồi quy Tuyến tính (Linear Regression) viết bằng Python thuần
    để dự đoán mức giá ở chu kỳ (tick) 10 giây tiếp theo.
    Không phụ thuộc vào numpy hay scikit-learn để chạy tốt trên mọi phiên bản Python (kể cả Python 3.14).
    Nhận vào một mảng chứa lịch sử giá gần nhất (float).
    """
    # Nếu lịch sử giá quá ngắn (dưới 3 điểm dữ liệu), trả về mức giá hiện tại
    n = len(price_history)
    if n < 3:
        return price_history[-1] if price_history else 0.0

    # Tính các giá trị tổng cần thiết cho Hồi quy Tuyến tính y = ax + b
    # x ở đây là các chỉ số thời gian: 0, 1, 2, ..., n-1
    sum_x = sum(range(n))
    sum_y = sum(price_history)
    sum_x_squared = sum(i ** 2 for i in range(n))
    sum_xy = sum(i * price_history[i] for i in range(n))

    # Công thức tính độ dốc (slope a) và hệ số chặn (intercept b)
    denominator = n * sum_x_squared - (sum_x ** 2)
    if denominator == 0:
        return price_history[-1]

    a = (n * sum_xy - sum_x * sum_y) / denominator
    b = (sum_y - a * sum_x) / n

    # Dự đoán giá trị tại bước tiếp theo (x = n)
    predicted = a * n + b

    # Không để giá trị dự đoán âm hoặc vô lý (giới hạn tối thiểu là 1,000đ)
    return max(1000.0, float(predicted))

