import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Sử dụng địa chỉ IP thực tế của máy tính của bạn
const API_URL = 'http://172.20.10.2:4000/api'; // Thay đổi IP này theo địa chỉ IP của máy tính của bạn

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Timeout sau 10 giây
});

// Thêm interceptor để tự động thêm token vào header
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        } catch (error) {
            console.error('Error in request interceptor:', error);
            return config;
        }
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Thêm interceptor để xử lý response
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token hết hạn hoặc không hợp lệ
            try {
                // Xóa token và user data
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                
                // Chuyển hướng về trang login
                router.replace('/(auth)/login');
                
                // Hiển thị thông báo
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            } catch (e) {
                console.error('Error handling 401:', e);
            }
        }
        return Promise.reject(error);
    }
);

export const userService = {
    register: async (userData) => {
        try {
            const response = await api.post('/user/register', userData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Register Error:', error);
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Kết nối đến server bị timeout'
                };
            }
            if (error.message === 'Network Error') {
                return {
                    success: false,
                    error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
                };
            }
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    },

    login: async (credentials) => {
        try {
            const response = await api.post('/user/login', credentials);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Login Error:', error);
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Kết nối đến server bị timeout'
                };
            }
            if (error.message === 'Network Error') {
                return {
                    success: false,
                    error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
                };
            }
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    },

    // Thêm hàm kiểm tra token
    checkToken: async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                return false;
            }
            // Thử gọi một API đơn giản để kiểm tra token
            await api.get('/user/check-token');
            return true;
        } catch (error) {
            console.error('Token check error:', error);
            return false;
        }
    }
};

export default api; 