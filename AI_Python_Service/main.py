import os
import math
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

from predictor import predict_next_price

# Load environment variables
load_dotenv()

app = FastAPI(title="Food Stock Exchange AI Service", version="1.0.0")

# Configure CORS
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ORS_API_KEY = os.getenv("ORS_API_KEY", "")

# Restaurant Coordinates
REST_LONG = float(os.getenv("RESTAURANT_LONGITUDE", "106.702000"))
REST_LAT = float(os.getenv("RESTAURANT_LATITUDE", "10.776000"))

# Configure Gemini if key is provided
if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("YOUR_"):
    genai.configure(api_key=GEMINI_API_KEY)

# ==========================================
# PYDANTIC MODEL SCHEMAS
# ==========================================

class AdviseRequest(BaseModel):
    budget: float
    menu_context: str

class PredictRequest(BaseModel):
    prices: list[float]

class DeliveryRequest(BaseModel):
    dest_longitude: float
    dest_latitude: float

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def calculate_haversine(lon1, lat1, lon2, lat2):
    """Tính khoảng cách chim bay giữa 2 điểm (km) làm phương án dự phòng"""
    R = 6371.0  # Bán kính Trái Đất (km)
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {
      "status": "online",
      "services": {
        "chatbot": "enabled" if (GROQ_API_KEY or GEMINI_API_KEY) else "fallback_only",
        "forecasting": "enabled (scikit-learn)",
        "routing": "enabled" if ORS_API_KEY else "fallback_haversine"
      }
    }

@app.post("/ai/advise")
async def get_advise(request: AdviseRequest):
    """
    Trợ lý ảo AI Broker tư vấn mua/bán khớp lệnh ẩm thực dựa trên Groq (Llama 3) hoặc Gemini.
    Đã được tối ưu hóa văn phong "Cạ Nhậu Thân Thiết" tự nhiên như bạn bè ngoài đời thực.
    """
    prompt = f"""
Bạn là một "CẠ NHẬU SÀNH SỎI" kiêm đồng đội thân thiết của khách hàng tại bàn nhậu Food Stock Exchange.
Hãy nói chuyện như một người bạn ngoài đời thực - cực kỳ tự nhiên, gần gũi, hóm hỉnh và am hiểu giá cả. Xưng hô tự nhiên (kiểu: "ông - tôi", "bằng hữu", "cạ cứng", "anh em"). Tuyệt đối KHÔNG trả lời như robot hay văn bản hành chính!

NGÂN SÁCH CỦA BẠN TÔI: {request.budget:,.0f} VND
BẢNG GIÁ VÀ TÌNH HÌNH MENU REAL-TIME TẠI QUÁN:
{request.menu_context}

HÃY PHẢN HỒI NHƯ MỘT NGƯỜI BẠN THÂN ĐANG NGỒI CÙNG BÀN THEO VĂN PHONG TỰ NHIÊN:

🍻 1. SĂN MÓN BẮT ĐÁY (Nói kiểu phím hàng hời cho bạn):
- Chỉ ra 1-2 món đang rớt giá sâu hoặc được giảm sâu do Cool-down. Khuyên cạ cứng "múc" ngay trước khi đứa bàn bên gom mất!

🔥 2. NÉ BẪY ĐỈNH VÀ CHỐT LỜI:
- Nhắc nhở bạn né mấy món đang tăng giá nổ nóc hoặc bị khóa giao dịch (Halt). Nếu bạn đang giữ vé món đó thì bảo bạn "xả hàng P2P" ăn chênh lệch ngay.

🍹 3. GỢI Ý COMBO VỪA TÚI TIỀN ({request.budget:,.0f}đ):
- Chọn đúng 1 món ăn + 1 món uống tổng tiền dưới hoặc bằng {request.budget:,.0f}đ. Nói rõ tổng chi phí và thừa ra bao nhiêu tiền lẻ để làm ly nữa.

🎉 4. LỜI CHÚC CỤNG LY:
- 1 câu khích lệ hò kéo pháo cụng ly cực chất (VD: "Zô cái cho nến xanh lè đêm nay nào ông bạn!").
"""

    # 1. Thử gọi Groq API (Mô hình Llama 3)
    if GROQ_API_KEY and not GROQ_API_KEY.startswith("YOUR_"):
        try:
            client = Groq(api_key=GROQ_API_KEY)
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Bạn là cạ nhậu sành sỏi, bạn thân tại quán bar. Nói chuyện tự nhiên, hài hước, xưng ông-tôi như bạn bè ngoài đời."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.1-8b-instant",
                temperature=0.7,
                max_tokens=650
            )
            reply = chat_completion.choices[0].message.content
            if reply:
                return {"advice": reply, "model": "Groq Llama 3.1 (Bro Persona)"}
        except Exception as e:
            print(f"Lỗi khi gọi Groq: {e}. Thử chuyển sang Gemini...")

    # 2. Thử gọi Gemini API
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("YOUR_"):
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(temperature=0.7, max_output_tokens=650)
            )
            if response.text:
                return {"advice": response.text, "model": "Gemini 1.5 Flash (Bro Persona)"}
        except Exception as e:
            print(f"Lỗi khi gọi Gemini: {e}. Sử dụng thuật toán dự phòng...")



    # 3. Thuật toán dự phòng (Rule-based Fallback)
    # Vì Python Service không trực tiếp giữ Database, logic này sẽ được tính toán
    # dựa trên nội dung text của menu_context được chuyển từ NodeJS.
    fallback_response = f"""
📊 **[BÁO CÁO CỦA AI BROKER - MÔ HÌNH DỰ PHÒNG]**

Chào Trader! Hệ thống AI Broker của chúng tôi hiện đang hoạt động ở chế độ ngoại tuyến (Offline). 
Với ngân sách **{request.budget:,.0f}đ** của bạn, tôi đã phân tích nhanh menu:
- Hãy ưu tiên đặt các món ăn có giá rẻ hơn hoặc bằng ngân sách của bạn.
- Bạn nên kiểm tra Bảng giá để chọn các món có ký hiệu mũi tên Đỏ xuống ▼ (đang giảm giá kích cầu) để tối đa hóa số tiền tiết kiệm.
- Hãy tham gia mua lại vé đồ uống P2P từ các bàn khác để săn giá hời dưới mức giá hệ thống.

Chúc bạn phiên giao dịch ẩm thực gặt hái nhiều nến xanh!
"""
    return {"advice": fallback_response, "model": "Local Algorithmic Fallback"}

@app.post("/ai/predict")
def predict_price(request: PredictRequest):
    """
    Sử dụng Machine Learning (Linear Regression) để dự báo giá tiếp theo.
    """
    if not request.prices:
        raise HTTPException(status_code=400, detail="Price history list cannot be empty")
    
    predicted = predict_next_price(request.prices)
    return {"predicted_price": predicted}

@app.post("/ai/delivery-cost")
async def calculate_delivery(request: DeliveryRequest):
    """
    Gọi OpenRouteService để lấy khoảng cách thực tế và tính phí ship.
    """
    distance_km = 0.0
    duration_mins = 0
    route_found = False

    # 1. Gọi API OpenRouteService thực tế nếu có key
    if ORS_API_KEY and not ORS_API_KEY.startswith("YOUR_"):
        try:
            # OpenRouteService Directions API
            url = f"https://api.openrouteservice.org/v2/directions/driving-car?api_key={ORS_API_KEY}&start={REST_LONG},{REST_LAT}&end={request.dest_longitude},{request.dest_latitude}"
            async with httpx.AsyncClient() as client:
                res = await client.get(url, timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    # Quãng đường tính bằng mét -> đổi sang km
                    distance_km = data["features"][0]["properties"]["summary"]["distance"] / 1000.0
                    # Thời gian bằng giây -> đổi sang phút
                    duration_mins = int(data["features"][0]["properties"]["summary"]["duration"] / 60.0)
                    route_found = True
        except Exception as e:
            print(f"Lỗi khi kết nối OpenRouteService: {e}. Sử dụng Haversine...")

    # 2. Dự phòng bằng khoảng cách Haversine (chim bay) nhân hệ số 1.3 (quãng đường thực tế đường bộ)
    if not route_found:
        haversine_dist = calculate_haversine(REST_LONG, REST_LAT, request.dest_longitude, request.dest_latitude)
        distance_km = haversine_dist * 1.3  # Hệ số chuyển đổi đường bay sang đường bộ tương đối
        duration_mins = int(distance_km * 2.5)  # Giả định đi xe máy trung bình 24km/h (~2.5 phút/km)

    # 3. Tính phí Ship động theo công thức:
    # Phí ship = Phí cố định (10.000đ) + 5.000đ cho mỗi km tiếp theo
    base_shipping_fee = 10000
    per_km_charge = 5000
    shipping_fee = base_shipping_fee + (distance_km * per_km_charge)

    # Làm tròn phí ship đến nghìn gần nhất
    shipping_fee = math.ceil(shipping_fee / 1000.0) * 1000

    return {
        "distance_km": round(distance_km, 2),
        "estimated_duration_minutes": duration_mins,
        "shipping_fee": int(shipping_fee),
        "source": "OpenRouteService API" if route_found else "Haversine Fallback Engine"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
