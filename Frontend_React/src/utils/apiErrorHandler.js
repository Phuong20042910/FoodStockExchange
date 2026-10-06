/**
 * Xử lý đối tượng lỗi (error) trả về từ Axios 
 * và trích xuất các thông báo lỗi chi tiết của express-validator (nếu có).
 * 
 * @param {Error} err Lỗi ném ra từ Axios
 * @returns {string} Chuỗi thông báo lỗi đã được làm gọn gàng để hiển thị
 */
export const parseApiError = (err) => {
  // Lỗi mạng hoặc server không phản hồi
  if (!err.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  const data = err.response.data;
  
  // Nếu server trả về mảng errors chi tiết từ express-validator
  if (data && data.errors && Array.isArray(data.errors)) {
    const errorMessages = data.errors.map(e => `• ${e.message} (trường: ${e.field})`);
    return `Dữ liệu không hợp lệ:\n${errorMessages.join('\n')}`;
  }

  // Nếu server trả về message tĩnh chung chung
  if (data && data.message) {
    return data.message;
  }

  return 'Đã xảy ra lỗi không xác định từ máy chủ.';
};
