import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { useCartStore } from '../../store/cartStore';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';


const Cart = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cart, setCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // === Fetch user info ===
  const fetchUserInfo = async () => {
    try {
      if (!user?.token) return;
      const response = await axios.get('http://172.20.10.2:4000/api/user/get-user', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.data.success) {
        setUserInfo(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  // === Calculate total amount ===
  const calculateTotalAmount = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      if (!item?.productId?.price || !item?.quantity) return total;
      return total + item.productId.price * item.quantity;
    }, 0);
  };

  // === Fetch cart items (from AsyncStorage + server) ===
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      
      // First try to get from server if user is logged in
      if (user?.token) {
        try {
          const response = await axios.get('http://172.20.10.2:4000/api/user/cart', {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          });
          
          if (response.data.success) {
            let serverCart = response.data.cart;
            // Đảm bảo mọi item đều có trường size
            serverCart.items = (serverCart.items || []).map(item => ({
              ...item,
              size: typeof item.size === 'undefined' || item.size === null ? 'Không có' : item.size
            }));
            setCart(serverCart);
            await AsyncStorage.setItem('cart', JSON.stringify(serverCart));
            console.log('Successfully loaded cart from server');
            return;
          }
        } catch (serverError) {
          console.error('Error fetching cart from server:', serverError.response?.data || serverError.message);
        }
      }
      
      // Fallback to AsyncStorage
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        // Đảm bảo mọi item đều có trường size
        const fixedItems = (parsedCart.items || []).map(item => ({
          ...item,
          size: typeof item.size === 'undefined' || item.size === null ? 'Không có' : item.size
        }));
        const total = calculateTotalAmount(fixedItems);
        setCart({ items: fixedItems, totalAmount: total });
        console.log('Loaded cart from AsyncStorage');
      } else {
        console.log('No cart data found in storage');
        setCart({ items: [], totalAmount: 0 });
      }
    } catch (error) {
      console.error('Error in fetchCartItems:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin giỏ hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCartItems();
      fetchUserInfo();
    }, [])
  );

  // === Remove item from cart ===
  const handleRemoveItem = async (productId, size) => {
    console.log('Gửi request xóa:', productId, size);
    try {
      const updatedItems = cart.items.filter((item) => !(item.productId._id === productId && (item.size ?? 'Không có') === size));
      const total = calculateTotalAmount(updatedItems);
      const updatedCart = { items: updatedItems, totalAmount: total };

      // Cập nhật state local
      setCart(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      // Đồng bộ với server nếu user đã đăng nhập
      if (user?.token) {
        try {
          const response = await axios.delete('http://172.20.10.2:4000/api/user/remove_cart', {
            data: { productId, size },
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.data.success) {
            Alert.alert('Lỗi', response.data.message || 'Không thể xóa sản phẩm');
          } else {
            // Load lại giỏ hàng từ server sau khi xóa thành công
            await fetchCartItems();
          }
        } catch (error) {
          console.error('Error syncing with server:', error);
          Alert.alert('Lỗi', 'Không thể đồng bộ với server');
        }
      }
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Lỗi', 'Không thể xóa sản phẩm');
    }
  };

  // === Update item quantity ===
  const handleUpdateQuantity = async (productId, size, newQuantity) => {
    const item = cart.items.find((item) => item.productId._id === productId && item.size === size);
    if (item && newQuantity > item.productId.stock) {
      Alert.alert('Lỗi', `Số lượng vượt quá tồn kho! Hiện chỉ còn ${item.productId.stock} sản phẩm.`);
      return;
    }
    try {
      if (newQuantity < 1) {
        Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
        return;
      }
      const updatedItems = cart.items.map((item) => {
        if (item.productId._id === productId && item.size === size) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      const total = calculateTotalAmount(updatedItems);
      const updatedCart = { items: updatedItems, totalAmount: total };

      setCart(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      if (user?.token) {
        const response = await axios.put(
          'http://172.20.10.2:4000/api/user/edit_cart',
          { productId, size, quantity: newQuantity },
          {
            headers: {
              token: user.token,
              'Content-Type': 'application/json',
            },
          } 
        );
        if (!response.data.success) {
          fetchCartItems();
          Alert.alert('Lỗi', response.data.message || 'Không thể cập nhật số lượng');
        }
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      fetchCartItems();
      Alert.alert('Lỗi', 'Không thể cập nhật số lượng');
    }
  };

  // === Handle checkout button ===
  const handleCheckout = async () => {
    if (!cart.items || cart.items.length === 0) {
      Alert.alert('Thông báo', 'Giỏ hàng trống');
      return;
    }
    if (!userInfo?.name || !userInfo?.phone || !userInfo?.address) {
      Alert.alert(
        'Thông báo',
        'Vui lòng cập nhật đầy đủ thông tin cá nhân (tên, số điện thoại và địa chỉ) trước khi đặt hàng',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Cập nhật', onPress: () => router.push('/profile') },
        ]
      );
      return;
    }
    setShowPaymentModal(true);
  };

  // === Handle confirm order ===
  const handleConfirmOrder = async () => {
    try {
      setLoading(true);
      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để đặt hàng');
        router.replace('/login');
        return;
      }
      if (!cart?.items || cart.items.length === 0) {
        Alert.alert('Thông báo', 'Giỏ hàng trống');
        return;
      }
      if (!userInfo?.address || !userInfo?.phone) {
        Alert.alert('Thông báo', 'Vui lòng cập nhật đầy đủ thông tin giao hàng');
        router.push('/profile');
        return;
      }

      const orderData = {
        items: cart.items.map((item) => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price,
          size: item.size || 'Không có',
        })),
        shippingAddress: {
          address: userInfo.address,
          phone: userInfo.phone,
          city: 'Hà Nội',
          country: 'Việt Nam',
          postalCode: '100000',
        },
        paymentMethod: paymentMethod === 'QR' ? 'QR_PAYMENT' : 'COD',
        note: note || '',
        totalAmount: cart.totalAmount,
        status: 'pending',
      };

      const response = await axios.post(
        'http://172.20.10.2:4000/api/user/createorders',
        orderData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        const newOrderId = response.data.order._id;

        if (paymentMethod === 'QR') {
          // Gọi Momo payment flow:
          await handleMomoPayment(newOrderId, cart.totalAmount);
          // Ứng dụng sẽ chuyển sang Momo hoặc browser, kết quả handle qua deep link
        } else {
          // COD: xóa giỏ hàng và thông báo
          setCart({ items: [], totalAmount: 0 });
          await AsyncStorage.setItem(
            'cart',
            JSON.stringify({ items: [], totalAmount: 0 })
          );
          setShowPaymentModal(false);
          setNote('');
          // Làm mới lại giỏ hàng
          await fetchCartItems();
          Alert.alert('Thành công', 'Đặt hàng thành công!', [
            {
              text: 'Xem đơn hàng',
              onPress: () => router.push('/order'),
            },
          ]);
        }
      } else {
        Alert.alert('Lỗi', response.data.message || 'Đặt hàng thất bại');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      if (error.response) {
        Alert.alert('Lỗi', error.response.data.message || 'Có lỗi xảy ra khi đặt hàng');
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
      }
    } finally {
      setLoading(false);
    }
  };

  // === Handle Momo Payment ===
const handleMomoPayment = async (orderId, totalAmount) => {
  try {
    setIsProcessingPayment(true);
    const { data } = await axios.post('http://172.20.10.2:4000/api/momo/create', {
      amount: totalAmount.toString(),
      orderInfo: `Đơn ${orderId}`,
    });

    if (data.success) {
      const { payUrl } = data;
      
      // Kiểm tra xem có thể mở URL không
      const supported = await Linking.canOpenURL(payUrl);
      if (!supported) {
        Alert.alert('Không thể mở URL', 'Không thể mở ứng dụng thanh toán MoMo');
        return;
      }

      // Thêm event listener cho deep linking trước khi mở URL
      const subscription = Linking.addEventListener('url', ({ url }) => {
        console.log('📱 [Deep Link Received]:', url);
        subscription.remove();
      });

      // Mở URL thanh toán
      await WebBrowser.openBrowserAsync(payUrl, {
        showInRecents: true,
        enableBarCollapsing: true,
        dismissButtonStyle: 'close',
      });

    } else {
      Alert.alert('Lỗi', data.message || 'Không tạo được yêu cầu thanh toán');
    }
  } catch (error) {
    console.error('Lỗi khi xử lý thanh toán:', error);
    Alert.alert('Lỗi', 'Không thể kết nối đến server MoMo');
  } finally {
    setIsProcessingPayment(false);
    setShowPaymentModal(false);
  }
};

  // === Format currency ===
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0đ';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  };

  // === Render each cart item ===
  console.log('Cart items:', cart.items);
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image
        source={{ uri: item?.productId?.image || 'https://via.placeholder.com/80' }}
        style={styles.image}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item?.productId?.name || 'Sản phẩm không xác định'}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item?.productId?.price)}</Text>
        <Text style={styles.itemSize}>Size: {item?.size || 'Không có'}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              handleUpdateQuantity(item?.productId?._id, item?.size, (item?.quantity || 0) - 1)
            }
            disabled={!item?.quantity || item.quantity <= 1}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={!item?.quantity || item.quantity <= 1 ? '#ccc' : COLORS.primary}
            />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item?.quantity || 0}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              handleUpdateQuantity(item?.productId?._id, item?.size, (item?.quantity || 0) + 1)
            }
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => {
          console.log('Xóa:', item?.productId?._id, item?.size);
          Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?',
            [
              {
                text: 'Hủy',
                style: 'cancel'
              },
              {
                text: 'Xóa',
                onPress: () => handleRemoveItem(item?.productId?._id, item?.size),
                style: 'destructive'
              }
            ]
          );
        }}
      >
        <Ionicons name="trash" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Thêm hàm xử lý làm mới giỏ hàng
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchCartItems();
    } catch (error) {
      console.error('Error refreshing cart:', error);
      Alert.alert('Lỗi', 'Không thể làm mới giỏ hàng');
    } finally {
      setRefreshing(false);
    }
  };

  // === Render ===
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.navbar}>
            <Text style={styles.navbarTitle}>Giỏ Hàng</Text>
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loading} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.navbarTitle}>Giỏ Hàng</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color="white" 
              style={refreshing ? styles.refreshingIcon : null}
            />
          </TouchableOpacity>
        </View>
        <FlatList
          data={cart?.items || []}
          keyExtractor={(item) => item?._id || Math.random().toString()}
          renderItem={renderItem}
          ListEmptyComponent={
 <View style={styles.emptyCart}>
  <Text style={styles.emptyCartText}>Giỏ hàng trống</Text>
  <TouchableOpacity
    style={styles.continueShoppingButton}
    onPress={() => router.push('/')} // Điều hướng đến trang chủ
  >
    <Text style={styles.continueShoppingText}>Tiếp tục mua sắm</Text>
  </TouchableOpacity>
</View>

}
        />
        {cart?.items && cart.items.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalAmount}>{formatCurrency(cart?.totalAmount)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Đặt Hàng</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === Payment Modal === */}
        <Modal animationType="slide" transparent visible={showPaymentModal} onRequestClose={() => setShowPaymentModal(false)}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Thông tin đặt hàng</Text>

                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryTitle}>Thông tin giao hàng</Text>
                  <View style={styles.deliveryDetail}>
                    <Text style={styles.deliveryLabel}>Địa chỉ:</Text>
                    <Text style={styles.deliveryValue}>{userInfo?.address}</Text>
                  </View>
                  <View style={styles.deliveryDetail}>
                    <Text style={styles.deliveryLabel}>Số điện thoại:</Text>
                    <Text style={styles.deliveryValue}>{userInfo?.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.updateProfileButton}
                    onPress={() => {
                      setShowPaymentModal(false);
                      router.push('/profile');
                    }}
                  >
                    <Text style={styles.updateProfileText}>Cập nhật thông tin</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.noteLabel}>Ghi chú cho đơn hàng:</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Nhập ghi chú (nếu có)"
                  placeholderTextColor="#666"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'COD' && styles.selectedPayment]}
                    onPress={() => setPaymentMethod('COD')}
                  >
                    <Text style={styles.paymentText}>Thanh toán khi nhận hàng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'QR' && styles.selectedPayment]}
                    onPress={() => setPaymentMethod('QR')}
                  >
                    <Text style={styles.paymentText}>Thanh toán qua MoMo QR</Text>
                  </TouchableOpacity>
                </View>

                {paymentMethod === 'QR' && (
                  <View style={styles.qrSection}>
                    {isProcessingPayment ? (
                      <>
                        <Text style={styles.qrTitle}>Đang chuyển sang MoMo...</Text>
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
                        <Text style={styles.qrInstruction}>
                          Xin chờ, bạn sẽ được chuyển sang ứng dụng MoMo để thanh toán.
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.qrInstruction}>
                        Khi nhấn "Xác nhận", bạn sẽ được chuyển sang MoMo để quét mã QR và thanh toán.
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowPaymentModal(false)}>
                    <Text style={styles.buttonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConfirmOrder}
                    disabled={loading || (paymentMethod === 'QR' && isProcessingPayment)}
                  >
                    {loading || (paymentMethod === 'QR' && isProcessingPayment) ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Xác nhận đặt hàng</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Cart;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -40,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navbarTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  cartList: {
    flex: 1,
    padding: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 5,
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  quantityButton: {
    padding: 5,
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#ff4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  continueShoppingButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollView: {
    width: '100%',
    maxHeight: '80%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    marginVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deliveryInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  deliveryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  deliveryDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
    fontWeight: '500',
  },
  deliveryValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  updateProfileButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    alignItems: 'center',
  },
  updateProfileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    fontWeight: '500',
  },
  paymentOptions: {
    marginBottom: 20,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedPayment: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f9f0',
  },
  paymentText: {
    marginLeft: 10,
    fontSize: 16,
  },
  qrSection: {
    marginVertical: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  qrInstruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  refreshButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshingIcon: {
    opacity: 0.5,
  },
});
