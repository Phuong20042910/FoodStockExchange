const axios = require('axios');

// Giả lập (Mock) gọi API đến Philips Hue Bridge
const HUE_BRIDGE_IP = process.env.HUE_BRIDGE_IP || '192.168.1.100';
const HUE_USERNAME = process.env.HUE_USERNAME || 'YOUR_HUE_USERNAME';

const changeLightColor = async (colorHex, alert = 'none') => {
  console.log(`[IoT Service] Đổi màu đèn quán thành ${colorHex} (Alert: ${alert})...`);
  
  // Trong môi trường thật (có đèn), bỏ comment code dưới đây
  /*
  try {
    // 1: Red (Crash), 3: Yellow/Warm (Normal)
    const xy = colorHex === 'red' ? [0.6679, 0.3181] : [0.4448, 0.4066]; 
    
    // Gửi lệnh cho toàn bộ Group 0 (Tất cả đèn)
    await axios.put(`http://${HUE_BRIDGE_IP}/api/${HUE_USERNAME}/groups/0/action`, {
      on: true,
      xy: xy,
      bri: 254,
      alert: alert // 'lselect' cho nhấp nháy, 'none' cho đứng yên
    });
    console.log('[IoT Service] Thành công kết nối Philips Hue.');
  } catch (err) {
    console.error('[IoT Service] Lỗi kết nối đèn thông minh:', err.message);
  }
  */
};

const triggerCrashLighting = async () => {
  await changeLightColor('red', 'lselect');
};

const triggerNormalLighting = async () => {
  await changeLightColor('warm_white', 'none');
};

module.exports = {
  triggerCrashLighting,
  triggerNormalLighting
};
