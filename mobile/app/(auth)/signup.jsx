import { View, Text, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import React, { useState } from 'react';
import styles from './../../assets/styles/signup.styles';
import { Ionicons } from "@expo/vector-icons";
import COLORS from '../../constants/colors';
import { Link, useRouter } from "expo-router";
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password_1: '',
    password_2: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(1))[0];

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async () => {
    try {
      // Validate form data
      if (!formData.username || !formData.email || !formData.phone || !formData.password_1 || !formData.password_2) {
        Alert.alert(
          "Thông báo",
          "Vui lòng điền đầy đủ thông tin đăng ký",
          [{ text: "OK" }]
        );
        return;
      }

      if (formData.password_1.length < 3) {
        Alert.alert(
          "Thông báo",
          "Mật khẩu phải có ít nhất 3 ký tự",
          [{ text: "OK" }]
        );
        return;
      }

      if (formData.password_1 !== formData.password_2) {
        Alert.alert(
          "Thông báo",
          "Mật khẩu xác nhận không khớp",
          [{ text: "OK" }]
        );
        return;
      }

      if (formData.phone.length !== 10) {
        Alert.alert(
          "Thông báo",
          "Số điện thoại phải có 10 chữ số",
          [{ text: "OK" }]
        );
        return;
      }

      setIsLoading(true);
      console.log('Sending registration data:', formData);

      const response = await axios.post('http://172.20.10.2:4000/api/user/register', {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password_1: formData.password_1,
        password_2: formData.password_2
      });

      console.log('Registration response:', response.data);

      if (response.data.success) {
        Alert.alert(
          "Thành công",
          "Tạo tài khoản thành công! Vui lòng đăng nhập để tiếp tục.",
          [
            {
              text: "Đăng nhập ngay",
              onPress: () => {
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  router.replace('/(auth)/login');
                });
              },
            }
          ]
        );
      } else {
        Alert.alert(
          "Thông báo",
          response.data.message || "Đăng ký thất bại. Vui lòng thử lại sau.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Lỗi đăng ký:', error.response?.data || error);
      Alert.alert(
        "Thông báo",
        error.response?.data?.message || "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại sau.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.title}>Couple TX</Text>
              <Text style={styles.subtitle}>Nơi Mua Sắm Tuyệt Vời</Text>
            </View>

            <View style={styles.formContainer}>
              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên đăng nhập</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: '#333' }]}
                    placeholder="Nhập tên đăng nhập"
                    placeholderTextColor="#555"
                    value={formData.username}
                    onChangeText={(value) => handleChange('username', value)}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: '#333' }]}
                    placeholder="Nhập email của bạn"
                    placeholderTextColor="#555"
                    value={formData.email}
                    onChangeText={(value) => handleChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: '#333' }]}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor="#555"
                    value={formData.phone}
                    onChangeText={(value) => handleChange('phone', value)}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: '#333' }]}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#555"
                    value={formData.password_1}
                    onChangeText={(value) => handleChange('password_1', value)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Xác nhận mật khẩu</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: '#333' }]}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#555"
                    value={formData.password_2}
                    onChangeText={(value) => handleChange('password_2', value)}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color='#fff' />
                ) : (
                  <Text style={styles.buttonText}>Đăng ký</Text>
                )}
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Đã có tài khoản?</Text>
                <Link href="/(auth)/login">
                  <Text style={styles.link}>Đăng nhập</Text>
                </Link>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
