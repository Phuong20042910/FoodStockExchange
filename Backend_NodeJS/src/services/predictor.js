function predictNextPrice(priceHistory) {
    const n = priceHistory.length;
    if (n < 3) {
        return priceHistory.length > 0 ? parseFloat(priceHistory[priceHistory.length - 1]) : 0.0;
    }

    // 1. Trọng số mũ ưu tiên các tick mới nhất (Exponential Weights)
    const weights = [];
    let sumW = 0;
    for (let i = 0; i < n; i++) {
        const w = Math.exp(i / n);
        weights.push(w);
        sumW += w;
    }
    
    // 2. Hồi quy tuyến tính có trọng số (Weighted Linear Regression)
    let sumWx = 0;
    let sumWy = 0;
    let sumWxx = 0;
    let sumWxy = 0;

    for (let i = 0; i < n; i++) {
        sumWx += i * weights[i];
        sumWy += priceHistory[i] * weights[i];
        sumWxx += (i ** 2) * weights[i];
        sumWxy += i * priceHistory[i] * weights[i];
    }

    const denominator = (sumW * sumWxx) - (sumWx ** 2);
    if (denominator === 0) {
        return parseFloat(priceHistory[priceHistory.length - 1]);
    }

    // Tính hệ số độ dốc xu hướng (Slope) và điểm chặn (Intercept)
    const slope = (sumW * sumWxy - sumWx * sumWy) / denominator;
    const intercept = (sumWy - slope * sumWx) / sumW;

    // Dự đoán giá trị tại bước tiếp theo (x = n)
    const predicted = slope * n + intercept;

    // 3. Kết hợp với Holt's Exponential Smoothing (Alpha = 0.6, Beta = 0.3)
    const alpha = 0.6;
    const beta = 0.3;
    let level = priceHistory[0];
    let trend = priceHistory[1] - priceHistory[0];

    for (let i = 1; i < n; i++) {
        const lastLevel = level;
        level = alpha * priceHistory[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }

    const holtForecast = level + trend;

    // Blend giữa Time-Weighted Regression (70%) và Holt's Smoothing (30%)
    const finalPrediction = (0.7 * predicted) + (0.3 * holtForecast);

    // Đảm bảo không âm và bảo lưu mức giá tối thiểu
    const minFloor = Math.max(1000.0, priceHistory[priceHistory.length - 1] * 0.5);
    return Math.round(Math.max(minFloor, finalPrediction) * 100) / 100;
}

module.exports = {
    predictNextPrice
};
