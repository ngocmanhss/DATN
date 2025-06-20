import api from './userService';
import { AxiosError } from 'axios';

interface ApiError {
  code?: string;
  message: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const chatService = {
  // Lấy danh sách người dùng đã chat
  getChatUsers: async () => {
    try {
      const response = await api.get('/chat/users');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const err = error as ApiError;
      console.error('Get Chat Users Error:', err);
      if (err.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Kết nối đến server bị timeout'
        };
      }
      if (err.message === 'Network Error') {
        return {
          success: false,
          error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
        };
      }
      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  },

  // Lấy tin nhắn với một người dùng cụ thể
  getMessages: async (userId: string) => {
    try {
      const response = await api.get(`/chat/messages/${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const err = error as ApiError;
      console.error('Get Messages Error:', err);
      if (err.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Kết nối đến server bị timeout'
        };
      }
      if (err.message === 'Network Error') {
        return {
          success: false,
          error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
        };
      }
      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  },

  // Gửi tin nhắn mới
  sendMessage: async (receiverId: string, content: string) => {
    try {
      const response = await api.post('/chat/messages', {
        receiverId,
        content,
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const err = error as ApiError;
      console.error('Send Message Error:', err);
      if (err.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Kết nối đến server bị timeout'
        };
      }
      if (err.message === 'Network Error') {
        return {
          success: false,
          error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
        };
      }
      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  },

  // Đánh dấu tin nhắn đã đọc
  markAsRead: async (messageId: string) => {
    try {
      const response = await api.put(`/chat/messages/${messageId}/read`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const err = error as ApiError;
      console.error('Mark As Read Error:', err);
      if (err.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Kết nối đến server bị timeout'
        };
      }
      if (err.message === 'Network Error') {
        return {
          success: false,
          error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.'
        };
      }
      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  },
};

export default chatService; 