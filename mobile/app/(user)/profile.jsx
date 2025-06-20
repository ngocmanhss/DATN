import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import COLORS from '../../constants/colors';
import { API_URL } from '../../constants/config';

const Profile = () => {
    const router = useRouter();
    const { user: authUser, setUser } = useAuthStore();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (authUser?.token) {
            fetchUserData();
        } else {
            router.replace('/login');
        }
    }, [authUser]);

    const fetchUserData = async () => {
        try {
            if (!authUser?.token) {
                router.replace('/login');
                return;
            }

            const response = await axios.get(`${API_URL}/api/user/get-user`, {
                headers: { 
                    Authorization: `Bearer ${authUser.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                const user = response.data.user;
                // Xử lý URL ảnh
                if (user.image) {
                    // Kiểm tra xem URL đã có http chưa
                    if (!user.image.startsWith('http')) {
                        user.image = `${API_URL}/${user.image.replace(/\\/g, '/')}`;
                    }
                    console.log('Profile image URL:', user.image); // Debug log
                }
                setUserData(user);
                setFormData({
                    name: user.name || '',
                    phone: user.phone || '',
                    address: user.address || ''
                });
            }
        } catch (error) {
            console.error('Fetch user data error:', error);
            if (error.response?.status === 401) {
                setUser(null);
                router.replace('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleImagePick = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                await updateProfileImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        }
    };

    const updateProfileImage = async (imageUri) => {
        try {
            if (!authUser?.token) {
                Alert.alert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                router.replace('/login');
                return;
            }

            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'profile.jpg',
            });
            formData.append('userId', userData._id);

            const response = await axios.put(
                `${API_URL}/api/user/update-profile`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${authUser.token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (response.data.success) {
                Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');
                fetchUserData();
            } else {
                Alert.alert('Lỗi', response.data.message || 'Cập nhật ảnh thất bại');
            }
        } catch (error) {
            console.error('Update image error:', error);
            if (error.response?.status === 401) {
                setUser(null);
                router.replace('/login');
            } else {
                Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện');
            }
        }
    };

    const updateProfile = async (data) => {
        try {
            if (!authUser?.token) {
                Alert.alert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                router.replace('/login');
                return;
            }

            const response = await axios.put(
                `${API_URL}/api/user/update-profile`,
                {
                    userId: userData._id,
                    name: data.name,
                    phone: data.phone,
                    address: data.address
                },
                {
                    headers: {
                        'Authorization': `Bearer ${authUser.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                const updatedUser = {
                    ...userData,
                    name: data.name,
                    phone: data.phone,
                    address: data.address
                };
                
                setUserData(updatedUser);
                Alert.alert('Thành công', 'Cập nhật thông tin thành công');
                setEditing(false);
                fetchUserData();
            } else {
                Alert.alert('Lỗi', response.data.message || 'Cập nhật thông tin thất bại');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            if (error.response?.status === 401) {
                setUser(null);
                router.replace('/login');
            } else {
                Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật thông tin');
            }
        }
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên người dùng');
            return;
        }
        updateProfile(formData);
    };

    const handleLogout = async () => {
        try {
            setUser(null);
            router.replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Lỗi', 'Không thể đăng xuất');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            {/* Navigation Bar */}
            <View style={styles.navbar}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>Tài khoản</Text>
                <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleImagePick} style={styles.imageContainer}>
                        {userData?.image ? (
                            <Image 
                                source={{ uri: userData.image }} 
                                style={styles.profileImage}
                                onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                            />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="person" size={50} color="#666" />
                            </View>
                        )}
                        <View style={styles.editIconContainer}>
                            <Ionicons name="camera" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.userName}>{userData?.name || 'Chưa cập nhật'}</Text>
                </View>

                <View style={styles.infoContainer}>
                    {editing ? (
                        <>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="Tên người dùng"
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                placeholder="Số điện thoại"
                                keyboardType="phone-pad"
                            />
                            <TextInput
                                style={styles.input}
                                value={formData.address}
                                onChangeText={(text) => setFormData({ ...formData, address: text })}
                                placeholder="Địa chỉ"
                                multiline
                            />
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.saveButton]}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.buttonText}>Lưu</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={() => {
                                        setEditing(false);
                                        setFormData({
                                            name: userData.name || '',
                                            phone: userData.phone || '',
                                            address: userData.address || ''
                                        });
                                    }}
                                >
                                    <Text style={styles.buttonText}>Hủy</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Tên:</Text>
                                    <Text style={styles.value}>{userData?.name || 'Chưa cập nhật'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Email:</Text>
                                    <Text style={styles.value}>{userData?.email || 'Chưa cập nhật'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Số điện thoại:</Text>
                                    <Text style={styles.value}>{userData?.phone || 'Chưa cập nhật'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Địa chỉ:</Text>
                                    <Text style={styles.value}>{userData?.address || 'Chưa cập nhật'}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, styles.editButton]}
                                onPress={() => setEditing(true)}
                            >
                                <Text style={styles.buttonText}>Chỉnh sửa thông tin</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    navbar: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        height: 150,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    navbarTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
    },
    backButton: {
        padding: 8,
    },
    logoutButton: {
        padding: 8,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#e1e1e1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#007AFF',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    infoContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    label: {
        flex: 1,
        fontSize: 16,
        color: '#666',
    },
    value: {
        flex: 2,
        fontSize: 16,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e1e1e1',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10,
    },
    editButton: {
        backgroundColor: '#007AFF',
    },
    saveButton: {
        backgroundColor: '#34C759',
        flex: 1,
        marginRight: 5,
    },
    cancelButton: {
        backgroundColor: '#FF3B30',
        flex: 1,
        marginLeft: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Profile;
