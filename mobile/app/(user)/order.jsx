import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

// ----- Notification handler: không show gì khi app foreground -----
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Order = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  // 2 state mới:
  const [orders, setOrders] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [lastUpdate, setLastUpdate] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [selectedProductToReview, setSelectedProductToReview] = useState(null);
  const [isProductReviewModalVisible, setIsProductReviewModalVisible] = useState(false);

  // ordersRef lưu phiên bản cũ để so sánh
  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Xin quyền notification và tạo Android channel
  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Thông báo', 'Ứng dụng chưa được cấp quyền hiển thị thông báo.');
      }
    })();

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
    }
  }, []);

  // Lần đầu fetch data
  const fetchInitialOrders = async () => {
    try {
      setInitialLoading(true);
      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để xem đơn hàng');
        router.replace('/login');
        return;
      }

      const response = await axios.get('http://172.20.10.2:4000/api/user/get-orders', {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (response.data.success) {
        const newOrders = response.data.orders || [];
        console.log('Received orders from backend:', JSON.stringify(newOrders, null, 2));
        setOrders(newOrders);
        ordersRef.current = newOrders;
        setLastUpdate(new Date());
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách đơn hàng');
      }
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        Alert.alert('Thông báo', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại');
        router.replace('/login');
      } else {
        Alert.alert('Lỗi', 'Không thể lấy danh sách đơn hàng');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  // Các lần cập nhật tiếp (polling hoặc pull-to-refresh)
  const fetchUpdatedOrders = async (fromPull = false) => {
    if (fromPull) setIsRefreshing(true);

    try {
      if (!user?.token) {
        return;
      }

      const response = await axios.get('http://172.20.10.2:4000/api/user/get-orders', {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (response.data.success) {
        const newOrders = response.data.orders || [];
        const oldOrders = ordersRef.current;

        if (lastUpdate) {
          newOrders.forEach((newOrder) => {
            const oldOrder = oldOrders.find((o) => o._id === newOrder._id);
            if (oldOrder && oldOrder.status !== newOrder.status) {
              const statusText = getStatusText(newOrder.status);

              // Chỉ schedule notification, không show in-app
              const title =
                newOrder.status === 'Success'
                  ? '🎉 Đơn hàng đã hoàn thành'
                  : 'ℹ️ Couple TX cập nhật đơn hàng';
              const body =
                newOrder.status === 'Success'
                  ? `Đơn hàng #${newOrder._id.slice(-6)} đã giao thành công!`
                  : `Đơn #${newOrder._id.slice(-6)}: ${statusText}`;

              Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body,
                  data: { orderId: newOrder._id, status: newOrder.status },
                  channelId: 'default',
                  sound: 'default',
                  priority: 'high',
                },
                trigger: null,
              });
            }
          });
        }

        setOrders(newOrders);
        ordersRef.current = newOrders;
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Không show Alert, vì chỉ fetch ngầm
    } finally {
      if (fromPull) setIsRefreshing(false);
    }
  };

  // Khi màn hình focus lần đầu, gọi fetchInitialOrders
  useFocusEffect(
    useCallback(() => {
      fetchInitialOrders();
    }, [])
  );

  // Polling mỗi 30s, chỉ sau khi initialLoading false
  useEffect(() => {
    if (!initialLoading) {
      const intervalId = setInterval(() => {
        fetchUpdatedOrders(false);
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [initialLoading]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#FFA500';
      case 'Accepted':
        return '#4CAF50';
      case 'Delivery':
        return '#2196F3';
      case 'Successful':
        return '#4CAF50';
      case 'Cancelled':
        return '#FF0000';
      default:
        return '#000000';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Pending':
        return 'Chờ xác nhận';
      case 'Approved':
        return 'Đã xác nhận';
      case 'Prepare':
        return 'Đơn hàng của bạn đã rời khỏi kho';
      case 'Delivered':
        return 'Đơn hàng của bạn đang được giao';
      case 'Success':
        return 'Đơn hàng của bạn đã được giao thành công';
      case 'Cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để thực hiện thao tác này');
        router.replace('/login');
        return;
      }

      const response = await axios.post(
        `http://172.20.10.2:4000/api/user/cancel-order/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId ? { ...order, status: 'Cancelled' } : order
          )
        );
        Alert.alert('Thông báo', 'Đã hủy đơn hàng thành công');
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể hủy đơn hàng');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
    }
  };

  const handleProductReviewSubmit = async () => {
    try {
      if (!selectedProductToReview || !selectedProductToReview.orderId || !selectedProductToReview.productId) {
        Alert.alert('Lỗi', 'Thông tin sản phẩm đánh giá không đầy đủ.');
        return;
      }

      if (!reviewText.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập nội dung đánh giá.');
        return;
      }

      console.log('Submitting review with data:', selectedProductToReview);

      const apiUrl = selectedProductToReview.reviewId
        ? 'http://172.20.10.2:4000/api/user/reviews' // PUT for update
        : 'http://172.20.10.2:4000/api/user/reviews'; // POST for add

      const method = selectedProductToReview.reviewId ? 'put' : 'post';

      const payload = {
        orderId: selectedProductToReview.orderId,
        productId: selectedProductToReview.productId,
        rating: rating,
        comment: reviewText,
      };

      if (selectedProductToReview.reviewId) {
        payload.reviewId = selectedProductToReview.reviewId; // Include reviewId for update
      }

      const response = await axios[method](
        apiUrl,
        payload,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Thành công', response.data.message || 'Cảm ơn bạn đã đánh giá sản phẩm!');
        setIsProductReviewModalVisible(false);
        setRating(5);
        setReviewText('');
        setSelectedProductToReview(null);
        fetchUpdatedOrders(false); // Tải lại danh sách đơn hàng để cập nhật trạng thái
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể gửi đánh giá sản phẩm');
      }
    } catch (error) {
      console.error('Error submitting product review:', error);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá sản phẩm');
    }
  };

  const openProductReviewModal = (orderItem, orderId, existingReview = null) => {
    setSelectedProductToReview({
      ...orderItem,
      orderId,
      productId: orderItem.product._id,
      reviewId: existingReview ? existingReview._id : null,
    });
    setIsProductReviewModalVisible(true);
    setRating(existingReview ? existingReview.rating : 5);
    setReviewText(existingReview ? existingReview.comment : '');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0đ';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Đơn hàng #{item._id.slice(-6)}</Text>
        <Text style={styles.statusLabel}>Trạng thái: 
          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </Text>
      </View>

      <Text style={styles.date}>Ngày đặt: {formatDate(item.createdAt)}</Text>

      <View style={styles.itemsContainer}>
        {item.orderItems.map((orderItem, index) => (
          <View key={index} style={styles.itemRow}>
            <Image source={{ uri: orderItem.image }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text
                style={styles.itemName}
                onPress={() => router.push({ pathname: '/(user)', params: { productId: orderItem.product?._id || orderItem.product } })}
              >
                {orderItem.name}
              </Text>
              <Text style={styles.itemSize}>Size: {orderItem.size || 'Không có'}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>x{orderItem.quantity}</Text>
                <Text style={styles.itemPrice}>
                  {formatCurrency(orderItem.price * orderItem.quantity)}
                </Text>
              </View>
              {item.status === 'Success' && (!orderItem.review || !orderItem.review.rating) && (
                <TouchableOpacity
                  style={styles.reviewProductButton}
                  onPress={() => openProductReviewModal(orderItem, item._id)}
                >
                  <Text style={styles.reviewProductButtonText}>Đánh giá</Text>
                </TouchableOpacity>
              )}
              {item.status === 'Success' && orderItem.review?.rating && (
                <View style={styles.reviewedStatusContainer}>
                  <View style={styles.reviewedStatus}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
                    <Text style={styles.reviewedText}>Đã đánh giá</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editReviewButton}
                    onPress={() => openProductReviewModal(orderItem, item._id, orderItem.review)}
                  >
                    <Text style={styles.editReviewButtonText}>Sửa</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Tổng tiền:</Text>
        <Text style={styles.totalAmount}>{formatCurrency(item.totalPrice)}</Text>
      </View>

      <View style={styles.paymentInfo}>
        <Text style={styles.paymentMethod}>
          Phương thức thanh toán:
          {item.paymentMethod === 'COD'
            ? 'Thanh toán khi nhận hàng'
            : 'Thanh toán qua QR Code'}
        </Text>

        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryTitle}>Thông tin giao hàng</Text>
          <View style={styles.deliveryDetail}>
            <Text style={styles.deliveryLabel}>Địa chỉ:</Text>
            <Text style={styles.deliveryValue}>
              {item.shippingAddress?.address || 'Chưa có địa chỉ'}
            </Text>
          </View>
          <View style={styles.deliveryDetail}>
            <Text style={styles.deliveryLabel}>Số điện thoại:</Text>
            <Text style={styles.deliveryValue}>
              {item.shippingAddress?.phone || 'Chưa có số điện thoại'}
            </Text>
          </View>
        </View>

        {item.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Ghi chú:</Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}
      </View>

      {item.status === 'Pending' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            Alert.alert(
              'Xác nhận',
              'Bạn có chắc chắn muốn hủy đơn hàng này?',
              [
                {
                  text: 'Hủy',
                  style: 'cancel',
                },
                {
                  text: 'Xác nhận',
                  onPress: () => handleCancelOrder(item._id),
                },
              ]
            );
          }}
        >
          <Text style={styles.cancelButtonText}>Hủy đơn hàng</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderProductReviewModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isProductReviewModalVisible}
      onRequestClose={() => setIsProductReviewModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đánh giá sản phẩm</Text>
            <TouchableOpacity 
              onPress={() => {
                setIsProductReviewModalVisible(false);
                setRating(5);
                setReviewText('');
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
          </View>
          {selectedProductToReview && (
            <View style={styles.productReviewInfo}>
              <Image source={{ uri: selectedProductToReview.image }} style={styles.productReviewImage} />
              <Text style={styles.productReviewName}>{selectedProductToReview.name}</Text>
            </View>
          )}
          
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Số sao:</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={30}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={styles.reviewInput}
            placeholder="Nhập đánh giá của bạn..."
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButtonModal]}
              onPress={() => {
                setIsProductReviewModalVisible(false);
                setRating(5);
                setReviewText('');
              }}
            >
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButtonModal]}
              onPress={handleProductReviewSubmit}
            >
              <Text style={styles.buttonText}>Gửi đánh giá</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
          <TouchableOpacity onPress={() => fetchUpdatedOrders(true)} style={styles.refreshButton}>
            <Ionicons name="refresh-circle-outline" size={30} color="white" />
          </TouchableOpacity>
        </View>

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : orders.length === 0 ? (
          <Text style={styles.emptyOrderText}>Bạn chưa có đơn hàng nào.</Text>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchUpdatedOrders(true)} />
            }
          />
        )}

        {renderProductReviewModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyOrderText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: COLORS.grey,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: COLORS.grey,
    marginBottom: 15,
  },
  itemsContainer: {
    marginBottom: 15,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
    textDecorationLine: 'underline',
  },
  itemSize: {
    fontSize: 13,
    color: COLORS.grey,
    marginBottom: 2,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 13,
    color: COLORS.grey,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentInfo: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentMethod: {
    fontSize: 14,
    color: COLORS.darkGrey,
    marginBottom: 10,
  },
  deliveryInfo: {
    marginTop: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  deliveryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  deliveryDetail: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  deliveryLabel: {
    fontSize: 14,
    color: COLORS.darkGrey,
    width: 90,
  },
  deliveryValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
  },
  noteContainer: {
    marginTop: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  noteLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 5,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.darkGrey,
  },
  cancelButton: {
    backgroundColor: COLORS.red,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  closeButton: {
    padding: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    color: COLORS.black,
    marginRight: 10,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: COLORS.grey,
    borderRadius: 8,
    padding: 10,
    width: '100%',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonModal: {
    backgroundColor: COLORS.red,
  },
  submitButtonModal: {
    backgroundColor: COLORS.primary,
  },
  reviewProductButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  reviewProductButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reviewedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewedText: {
    fontSize: 12,
    color: COLORS.green,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  editReviewButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editReviewButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  productReviewInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  productReviewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginBottom: 10,
  },
  productReviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Order;
