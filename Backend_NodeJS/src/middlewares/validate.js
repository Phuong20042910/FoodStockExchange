const { validationResult } = require('express-validator');

/**
 * Middleware để kiểm tra kết quả từ express-validator.
 * Nếu có lỗi, sẽ trả về HTTP 400 Bad Request cùng danh sách chi tiết các lỗi.
 */
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

module.exports = {
  checkValidationResult
};
