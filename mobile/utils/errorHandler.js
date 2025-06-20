// Tiện ích xử lý lỗi
export const registerError = (error) => {
  // Ghi log lỗi vào console trong môi trường phát triển
  if (__DEV__) {
    console.error('Lỗi:', error);
  }

  // Bạn có thể thêm logic xử lý lỗi bổ sung ở đây
  // Ví dụ:
  // - Gửi lỗi đến dịch vụ theo dõi lỗi
  // - Hiển thị thông báo lỗi
  // - Ghi log lỗi vào file
}; 