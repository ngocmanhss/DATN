import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import COLORS from '../../constants/colors';

export default function Settings() {
  const { setUser } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          onPress: () => {
            setUser(null);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Cài đặt</Text>
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome name="bell" size={20} color="#666" />
            <Text style={styles.menuText}>Thông báo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome name="lock" size={20} color="#666" />
            <Text style={styles.menuText}>Bảo mật</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome name="question-circle" size={20} color="#666" />
            <Text style={styles.menuText}>Trợ giúp & Hỗ trợ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome name="info-circle" size={20} color="#666" />
            <Text style={styles.menuText}>Về ứng dụng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome name="file-text" size={20} color="#666" />
            <Text style={styles.menuText}>Điều khoản sử dụng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome name="shield" size={20} color="#666" />
            <Text style={styles.menuText}>Chính sách bảo mật</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navbar: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 190,
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -40,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
