import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';

export default function ManagerOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [orderDetailsModalVisible, setOrderDetailsModalVisible] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://172.20.10.2:4000/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách đơn hàng');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      // Nếu trạng thái mới là Cancelled, hiển thị modal xác nhận
      if (newStatus === 'Cancelled') {
        setOrderToCancel(orderId);
        setCancelModalVisible(true);
        return;
      }

      // Xử lý các trạng thái khác
      const response = await axios.put(
        `http://172.20.10.2:4000/api/admin/order/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      if (response.data.success) {
        if (Platform.OS === 'web') {
          alert('Cập nhật trạng thái đơn hàng thành công');
        } else {
          Alert.alert('Thành công', 'Cập nhật trạng thái đơn hàng thành công');
        }
        fetchOrders();
      } else {
        if (Platform.OS === 'web') {
          alert(response.data.message || 'Không thể cập nhật trạng thái đơn hàng');
        } else {
          Alert.alert('Lỗi', response.data.message || 'Không thể cập nhật trạng thái đơn hàng');
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      if (Platform.OS === 'web') {
        alert('Không thể cập nhật trạng thái đơn hàng');
      } else {
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn hàng');
      }
    }
  };

  const confirmCancelOrder = async () => {
    try {
      const response = await axios.put(
        `http://172.20.10.2:4000/api/admin/order/${orderToCancel}/status`,
        { 
          status: 'Cancelled',
          paymentStatus: 'refunded'
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      if (response.data.success) {
        if (Platform.OS === 'web') {
          alert('Đã hủy đơn hàng và hoàn tiền');
        } else {
          Alert.alert('Thành công', 'Đã hủy đơn hàng và hoàn tiền');
        }
        fetchOrders();
      } else {
        if (Platform.OS === 'web') {
          alert(response.data.message || 'Không thể hủy đơn hàng');
        } else {
          Alert.alert('Lỗi', response.data.message || 'Không thể hủy đơn hàng');
        }
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (Platform.OS === 'web') {
        alert('Không thể hủy đơn hàng');
      } else {
        Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
      }
    } finally {
      setCancelModalVisible(false);
      setOrderToCancel(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#FFA500';
      case 'Approved':
        return '#2196F3';
      case 'Prepare':
        return '#9C27B0';
      case 'Delivered':
        return '#4CAF50';
      case 'Success':
        return '#4CAF50';
      case 'Cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FFA500';
      case 'failed':
        return '#F44336';
      case 'refunded':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Pending':
        return 'Chờ xác nhận';
      case 'Approved':
        return 'Đã xác nhận';
      case 'Prepare':
        return 'Đơn hàng đã rời khỏi kho';
      case 'Delivered':
        return 'Đang giao hàng';
      case 'Success':
        return 'Hoàn thành';
      case 'Cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status, orderStatus) => {
    // Nếu đơn hàng đã hủy, hiển thị trạng thái thanh toán là "Đã hủy"
    if (orderStatus === 'Cancelled') {
       console.log('Nút hủy đơn đã được nhấn');  // Thêm console.log để kiểm tra
      return 'Đã hủy đơn hàng';
    }

    // Các trạng thái thanh toán khác
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'failed':
        return 'Thanh toán thất bại';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Đơn hàng #{item._id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.infoText}>Ngày đặt: {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
        <Text style={styles.infoText}>Tổng tiền: {item.totalPrice.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.infoText}>Thanh toán: {item.paymentMethod === 'COD' ? 'Tiền mặt' : 'Chuyển khoản'}</Text>
        <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(item.paymentStatus) }]}>
          <Text style={styles.paymentStatusText}>
            {getPaymentStatusText(item.paymentStatus, item.status)}
          </Text>
        </View>
      </View>

      {/* Ẩn thông tin giao hàng và chi tiết sản phẩm khỏi danh sách chính */}
      {/* <View style={styles.shippingInfo}>
        <Text style={styles.shippingTitle}>Thông tin giao hàng:</Text>
        <Text style={styles.shippingText}>Địa chỉ: {item.shippingAddress.address}</Text>
        <Text style={styles.shippingText}>Số điện thoại: {item.shippingAddress.phone}</Text>
      </View> */}

      {/* <View style={styles.orderItems}>
        <Text style={styles.itemsTitle}>Chi tiết đơn hàng:</Text>
        {item.orderItems.map((orderItem, index) => (
          <View key={index} style={styles.orderItemContainer}>
            {orderItem.product?.image && (
              <Image source={{ uri: orderItem.product.image }} style={styles.orderItemImage} />
            )}
            <View style={styles.orderItemInfo}>
              <Text style={styles.itemName}>{orderItem.product?.name || orderItem.name}</Text>
              <Text style={styles.itemDetails}>
                {orderItem.quantity}x - {orderItem.color} - Size {orderItem.size}
              </Text>
            </View>
          </View>
        ))}
      </View> */}

      {/* Nút Xem chi tiết */}
      <TouchableOpacity
        style={styles.viewDetailsButton}
        onPress={() => {
          setSelectedOrderForDetails(item);
          setOrderDetailsModalVisible(true);
        }}
      >
        <Text style={styles.viewDetailsButtonText}>Xem chi tiết</Text>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        {item.status === 'Pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleUpdateStatus(item._id, 'Approved')}
          >
            <Text style={styles.buttonText}>Xác nhận</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Approved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.prepareButton]}
            onPress={() => handleUpdateStatus(item._id, 'Prepare')}
          >
            <Text style={styles.buttonText}>Chuẩn bị</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Prepare' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deliverButton]}
            onPress={() => handleUpdateStatus(item._id, 'Delivered')}
          >
            <Text style={styles.buttonText}>Giao hàng</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Delivered' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleUpdateStatus(item._id, 'Success')}
          >
            <Text style={styles.buttonText}>Hoàn thành</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'Cancelled' && item.status !== 'Success' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleUpdateStatus(item._id, 'Cancelled')}
          >
            <Text style={styles.buttonText}>Hủy đơn</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
      />

      {/* Cancel Order Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.cancelModalContent}>
            <Text style={styles.cancelModalTitle}>Xác nhận hủy đơn</Text>
            <Text style={styles.cancelModalText}>
              Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này sẽ hoàn tiền cho khách hàng.
            </Text>
            <View style={styles.cancelModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.buttonText}>Không</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmCancelButton]}
                onPress={confirmCancelOrder}
              >
                <Text style={styles.buttonText}>Có, hủy đơn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Details Modal */}
      {orderDetailsModalVisible && selectedOrderForDetails && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={orderDetailsModalVisible}
          onRequestClose={() => setOrderDetailsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.orderDetailsModalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setOrderDetailsModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.grey} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Chi tiết đơn hàng #{selectedOrderForDetails._id.slice(-6)}</Text>
                <View style={{ width: 24 }} />{/* Spacer */}
              </View>

              <ScrollView style={styles.modalScrollView}>
                {/* Thông tin đơn hàng */}
                <View style={styles.orderInfoModal}>
                  <Text style={styles.orderInfoTitle}>Thông tin đơn hàng:</Text>
                  <Text style={styles.orderInfoText}>Ngày đặt: {new Date(selectedOrderForDetails.createdAt).toLocaleDateString('vi-VN')}</Text>
                  <Text style={styles.orderInfoText}>Tổng tiền: {selectedOrderForDetails.totalPrice.toLocaleString('vi-VN')}đ</Text>
                  <Text style={styles.orderInfoText}>Phương thức thanh toán: {selectedOrderForDetails.paymentMethod === 'COD' ? 'Tiền mặt' : 'Chuyển khoản'}</Text>
                  <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(selectedOrderForDetails.paymentStatus) }]}>
                    <Text style={styles.paymentStatusText}>
                      {getPaymentStatusText(selectedOrderForDetails.paymentStatus, selectedOrderForDetails.status)}
                    </Text>
                  </View>
                </View>

                {/* Thông tin giao hàng */}
                <View style={styles.shippingInfo}>
                  <Text style={styles.shippingTitle}>Thông tin giao hàng:</Text>
                  <Text style={styles.shippingText}>Địa chỉ: {selectedOrderForDetails.shippingAddress.address}</Text>
                  <Text style={styles.shippingText}>Số điện thoại: {selectedOrderForDetails.shippingAddress.phone}</Text>
                </View>

                {/* Chi tiết sản phẩm */}
                <View style={styles.orderItems}>
                  <Text style={styles.itemsTitle}>Chi tiết đơn hàng:</Text>
                  {selectedOrderForDetails.orderItems.map((orderItem, index) => (
                    <View key={index} style={styles.orderItemContainer}>
                      {orderItem.product?.image ? (
                        <Image 
                          source={{ uri: orderItem.product.image }} 
                          style={styles.orderItemImage} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.orderItemImage, styles.noImageContainer]}>
                          <Ionicons name="image-outline" size={24} color="#999" />
                        </View>
                      )}
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.itemName}>{orderItem.product?.name || orderItem.name}</Text>
                        <Text style={styles.itemDetails}>
                          {orderItem.quantity}x - {orderItem.color} - Size {orderItem.size}
                        </Text>
                        <Text style={styles.itemPrice}>
                          {orderItem.price.toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Các nút hành động khác nếu cần trong modal */}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 60,
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
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  listContainer: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderInfo: {
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  paymentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 5,
  },
  paymentStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shippingInfo: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  shippingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  shippingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderItems: {
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  orderItem: {
    marginBottom: 5,
  },
  orderItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  noImageContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#2196F3',
  },
  prepareButton: {
    backgroundColor: '#9C27B0',
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cancelModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  cancelModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  cancelModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  confirmCancelButton: {
    backgroundColor: '#F44336',
  },
  viewDetailsButton: {
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderDetailsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '95%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  modalScrollView: {
    flexGrow: 1,
  },
  closeButton: {
    padding: 5,
    marginRight: -5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 0,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.primary,
    flex: 1,
  },
  orderInfoModal: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  orderInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.primary,
  },
  orderInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});
