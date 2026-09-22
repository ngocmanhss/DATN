# 👕 Clothing E-commerce Mobile Application

## 📌 Giới thiệu

Đây là **đồ án tốt nghiệp** xây dựng hệ thống bán quần áo trực tuyến, gồm ứng dụng mobile dành cho người dùng và hệ thống Backend cung cấp REST API.

Ứng dụng hỗ trợ người dùng xem sản phẩm, tìm kiếm, quản lý giỏ hàng, đặt hàng, theo dõi đơn hàng, trò chuyện realtime và tương tác với **Chatbot hỗ trợ người dùng**.

## 🚀 Chức năng chính

### 👤 Người dùng

* Đăng ký và đăng nhập tài khoản
* Xác thực người dùng bằng JWT
* Quản lý thông tin cá nhân
* Xem danh sách sản phẩm
* Xem chi tiết sản phẩm
* Tìm kiếm và lọc sản phẩm
* Thêm sản phẩm vào giỏ hàng
* Quản lý giỏ hàng
* Đặt hàng
* Theo dõi đơn hàng
* Chat realtime
* Tương tác với Chatbot
* Nhận thông báo

### 🤖 Chatbot

* Hỗ trợ người dùng trong quá trình sử dụng ứng dụng
* Trả lời các câu hỏi thường gặp
* Hỗ trợ tìm kiếm và tư vấn thông tin sản phẩm
* Hỗ trợ giải đáp thông tin liên quan đến đơn hàng và mua sắm
* Giao tiếp với người dùng thông qua giao diện chat

### 🛒 Quản lý sản phẩm

* Hiển thị sản phẩm và danh mục
* Quản lý hình ảnh sản phẩm
* Hiển thị thông tin, giá và số lượng sản phẩm

## 🛠️ Công nghệ sử dụng

### Mobile

* React Native 0.79
* Expo 53
* Expo Router
* React 19
* JavaScript / TypeScript
* Zustand
* Axios
* Socket.IO Client
* Async Storage
* React Native Reanimated
* Expo Notifications
* Expo Image Picker
* React Native WebView
* EAS Build

### Backend

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* Socket.IO
* JWT
* bcrypt
* Cloudinary
* Multer
* CORS
* dotenv
* Morgan

### Tích hợp dịch vụ

* Cloudinary
* Expo Push Notifications
* Chatbot

## 🏗️ Kiến trúc hệ thống

```text
                    Mobile App
              React Native + Expo
                       │
              REST API / Socket.IO
                       │
                       ▼
                Backend Server
                Node.js + Express
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
      MongoDB      Cloudinary    Chatbot
```

## 📂 Cấu trúc thư mục

```text
DATN/
│
├── mobile/              # Ứng dụng React Native
│
├── backend/             # REST API Backend
│
├── .vscode/
│
├── package.json
├── package-lock.json
└── README.md
```

## ⚙️ Cài đặt và chạy dự án

### 1. Clone repository

```bash
git clone https://github.com/ngocmanhss/DATN.git
cd DATN
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` và cấu hình các biến môi trường cần thiết:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Sau đó chạy Backend:

```bash
npm run dev
```

### 3. Cài đặt Mobile

Mở terminal mới:

```bash
cd mobile
npm install
```

Chạy ứng dụng:

```bash
npx expo start
```

Sau đó có thể chạy ứng dụng trên Android Emulator hoặc thiết bị thật.

## 🔐 Bảo mật

Các thông tin nhạy cảm như:

* Database connection string
* JWT secret
* Cloudinary API credentials
* Các API key của dịch vụ bên thứ ba

được lưu trong biến môi trường và **không đưa lên GitHub**.

## 👨‍💻 Tác giả

**Ngọc Mạnh**

Sinh viên ngành Công nghệ thông tin

GitHub: https://github.com/ngocmanhss

## 📄 Mục đích

Dự án được thực hiện với mục đích **học tập và làm đồ án tốt nghiệp**, đồng thời áp dụng kiến thức về phát triển ứng dụng mobile, Backend, cơ sở dữ liệu, realtime communication và tích hợp Chatbot.
