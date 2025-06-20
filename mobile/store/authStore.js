import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://172.20.10.2:4000/api';

const ADMIN_EMAIL = "admin@gmail.com"; // thêm email admin
const ADMIN_PASSWORD = "admin123";     // thêm password admin

const useAuthStore = create((set, get) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    role: null,

    initialize: async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userStr = await AsyncStorage.getItem('user');
            const role = await AsyncStorage.getItem('role');
            
            console.log('Initializing auth store...');
            console.log('Token from storage:', token);
            console.log('User from storage:', userStr);
            console.log('Role from storage:', role);
            
            if (token && userStr) {
                try {
                    const user = JSON.parse(userStr);
                    console.log('Parsed user data:', user);

                    if (!user || !user._id) {
                        console.error('Invalid user data: missing _id');
                        // Xóa dữ liệu không hợp lệ
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('user');
                        await AsyncStorage.removeItem('role');
                        throw new Error('Invalid user data');
                    }

                    // Kiểm tra token với server
                    const response = await axios.get(`${API_URL}/user/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.data.success && response.data.user) {
                        const updatedUser = response.data.user;
                        // Cập nhật user data từ server
                        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                        
                        set({ 
                            token,
                            user: updatedUser,
                            role,
                            isAuthenticated: true 
                        });
                        
                        console.log('Auth store initialized successfully:', {
                            userId: updatedUser._id,
                            userName: updatedUser.name
                        });
                    } else {
                        throw new Error('Failed to verify token with server');
                    }
                } catch (parseError) {
                    console.error('Error parsing user data:', parseError);
                    // Xóa dữ liệu không hợp lệ
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('user');
                    await AsyncStorage.removeItem('role');
                    throw parseError;
                }
            } else {
                console.log('No valid auth data found in storage');
                set({ 
                    token: null, 
                    user: null, 
                    role: null,
                    isAuthenticated: false 
                });
            }
        } catch (error) {
            console.error('Error initializing auth store:', error);
            set({ 
                token: null, 
                user: null, 
                role: null,
                isAuthenticated: false 
            });
        }
    },

    setUser: async (user) => {
        if (user) {
            await AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
            await AsyncStorage.removeItem('user');
        }
        set({ user });
    },

    login: async (email, password) => {
        try {
            set({ isLoading: true, error: null });
            console.log('Attempting login...');
            
            const response = await axios.post(`${API_URL}/user/login`, {
                email,
                password
            });

            console.log('Login response:', response.data);

            if (response.data.success && response.data.accesstoken) {
                const token = response.data.accesstoken;
                const user = response.data.user;
                const role = response.data.role;

                if (!user || !user._id) {
                    throw new Error('Invalid user data received from server');
                }

                console.log('Login successful, storing data...');
                console.log('Token:', token);
                console.log('User:', user);
                console.log('Role:', role);

                // Store in AsyncStorage
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                await AsyncStorage.setItem('role', role);
                
                // Update state
                set({ 
                    token,
                    user,
                    role,
                    isAuthenticated: true,
                    isLoading: false 
                });

                // Verify storage
                const storedToken = await AsyncStorage.getItem('token');
                const storedUser = await AsyncStorage.getItem('user');
                console.log('Verified stored data:', {
                    token: storedToken,
                    user: storedUser
                });
                
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            set({ 
                error: error.message, 
                isLoading: false,
                token: null,
                user: null,
                role: null,
                isAuthenticated: false
            });
            return { success: false, error: error.message };
        }
    },

    checkAuth: async () => {
        try {
            console.log('Checking authentication...');
            const token = await AsyncStorage.getItem('token');
            const userStr = await AsyncStorage.getItem('user');
            const role = await AsyncStorage.getItem('role');
            
            console.log('Auth check - token:', token);
            console.log('Auth check - user:', userStr);
            console.log('Auth check - role:', role);

            if (!token || !userStr) {
                console.log('No valid auth data found');
                set({ 
                    token: null, 
                    user: null, 
                    role: null,
                    isAuthenticated: false 
                });
                return false;
            }

            const user = JSON.parse(userStr);
            set({ 
                token, 
                user, 
                role,
                isAuthenticated: true 
            });
            console.log('Auth check successful');
            return true;
        } catch (error) {
            console.error('Error checking auth:', error);
            set({ 
                token: null, 
                user: null, 
                role: null,
                isAuthenticated: false 
            });
            return false;
        }
    },

    logout: async () => {
        try {
            console.log('Logging out...');
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('role');
            set({ 
                token: null, 
                user: null, 
                isAuthenticated: false, 
                role: null 
            });
            console.log('Logout complete');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    },

    getToken: () => {
        const state = get();
        return state.token;
    },

    isAdmin: () => {
        const state = get();
        return state.role === 'admin';
    },

    isUser: () => {
        const state = get();
        return state.role === 'user';
    }
}));

export { useAuthStore };
