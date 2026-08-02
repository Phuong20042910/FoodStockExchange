import math

def predict_next_price(price_history: list) -> float:

    """
    Sử dụng thuật toán Holt's Linear Exponential Smoothing kết hợp Hồi quy tuyến tính có trọng số (Time-Weighted Regression)
    để dự đoán mức giá ở chu kỳ (tick) 10 giây tiếp theo.
    Tối ưu hóa trọng số cho các tick gần nhất để dự báo chính xác nến biến động ngắn hạn.
    """
    n = len(price_history)
    if n < 3:
        return float(price_history[-1]) if price_history else 0.0

    # 1. Trọng số mũ ưu tiên các tick mới nhất (Exponential Weights)
    weights = [math.exp(i / n) for i in range(n)]
    sum_w = sum(weights)
    
    # 2. Hồi quy tuyến tính có trọng số (Weighted Linear Regression)
    weighted_x = [i * weights[i] for i in range(n)]
    weighted_y = [price_history[i] * weights[i] for i in range(n)]
    
    sum_wx = sum(weighted_x)
    sum_wy = sum(weighted_y)
    sum_wxx = sum((i ** 2) * weights[i] for i in range(n))
    sum_wxy = sum(i * price_history[i] * weights[i] for i in range(n))

    denominator = (sum_w * sum_wxx) - (sum_wx ** 2)
    if denominator == 0:
        return float(price_history[-1])

    # Tính hệ số độ dốc xu hướng (Slope) và điểm chặn (Intercept)
    slope = (sum_w * sum_wxy - sum_wx * sum_wy) / denominator
    intercept = (sum_wy - slope * sum_wx) / sum_w

    # Dự đoán giá trị tại bước tiếp theo (x = n)
    predicted = slope * n + intercept

    # 3. Kết hợp với Holt's Exponential Smoothing (Alpha = 0.6, Beta = 0.3)
    alpha = 0.6
    beta = 0.3
    level = price_history[0]
    trend = price_history[1] - price_history[0]

    for i in range(1, n):
        last_level = level
        level = alpha * price_history[i] + (1 - alpha) * (level + trend)
        trend = beta * (level - last_level) + (1 - beta) * trend

    holt_forecast = level + trend

    # Blend giữa Time-Weighted Regression (70%) và Holt's Smoothing (30%)
    final_prediction = (0.7 * predicted) + (0.3 * holt_forecast)

    # Đảm bảo không âm và bảo lưu mức giá tối thiểu
    min_floor = max(1000.0, price_history[-1] * 0.5)
    return round(max(min_floor, float(final_prediction)), 2)


