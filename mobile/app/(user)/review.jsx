import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import RatingStars from '../../components/RatingStars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/config';

const Review = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchReviews();
    } else {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để xem đánh giá');
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      if (!user?.token) {
        Alert.alert('Thông báo', 'Vui lòng đăng nhập để xem đánh giá');
        return;
      }

      const response = await axios.get(`${API_URL}/api/user/reviews`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setReviews(response.data.reviews);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách đánh giá');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      if (error.response?.status === 401) {
        Alert.alert('Thông báo', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else {
        Alert.alert('Lỗi', 'Không thể lấy danh sách đánh giá. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa đánh giá này?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.token) {
                Alert.alert('Thông báo', 'Vui lòng đăng nhập để thực hiện thao tác này');
                return;
              }

              const response = await axios.delete(`${API_URL}/api/user/reviews/${reviewId}`, {
                headers: {
                  Authorization: `Bearer ${user.token}`
                }
              });

              if (response.data.success) {
                Alert.alert('Thành công', 'Đã xóa đánh giá');
                fetchReviews();
              } else {
                Alert.alert('Lỗi', response.data.message || 'Không thể xóa đánh giá');
              }
            } catch (error) {
              console.error('Error deleting review:', error);
              if (error.response?.status === 401) {
                Alert.alert('Thông báo', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
              } else {
                Alert.alert('Lỗi', 'Không thể xóa đánh giá. Vui lòng thử lại sau.');
              }
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredReviews = reviews.filter(review => {
    const searchLower = searchQuery.toLowerCase();
    return (
      review.product?.name?.toLowerCase().includes(searchLower) ||
      review.order?.orderNumber?.toLowerCase().includes(searchLower) ||
      review.comment?.toLowerCase().includes(searchLower)
    );
  });

  const renderReviewItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reviewItem}
      onPress={() => {
        setSelectedReview(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.productInfo}>
          {item.product?.image && (
            <Image 
              source={{ uri: item.product.image }} 
              style={styles.productImage}
            />
          )}
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{item.product?.name}</Text>
            <Text style={styles.orderNumber}>Đơn hàng: {item.order?.orderNumber}</Text>
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <View style={styles.reviewContent}>
        <RatingStars rating={item.rating} size={16} />
        <Text style={styles.comment}>{item.comment}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteReview(item._id)}
      >
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.navbar}>
            <Text style={styles.navbarTitle}>Đánh Giá Của Tôi</Text>
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
          <Text style={styles.navbarTitle}>Đánh Giá Của Tôi</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm đánh giá..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Bạn chưa có đánh giá nào</Text>
          }
        />

        <Modal
          visible={showDetailModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedReview && (
                <ScrollView>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chi tiết đánh giá</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setShowDetailModal(false)}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.modalProductInfo}>
                    {selectedReview.product?.image && (
                      <Image 
                        source={{ uri: selectedReview.product.image }} 
                        style={styles.modalProductImage}
                      />
                    )}
                    <View style={styles.modalProductDetails}>
                      <Text style={styles.modalProductName}>
                        {selectedReview.product?.name}
                      </Text>
                      <Text style={styles.modalOrderNumber}>
                        Mã đơn hàng: {selectedReview.order?.orderNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalRating}>
                    <Text style={styles.modalRatingLabel}>Đánh giá:</Text>
                    <RatingStars rating={selectedReview.rating} size={24} />
                  </View>
                  <Text style={styles.modalComment}>{selectedReview.comment}</Text>
                  <Text style={styles.modalDate}>
                    Ngày đánh giá: {formatDate(selectedReview.createdAt)}
                  </Text>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
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
  listContent: {
    padding: 15,
  },
  reviewItem: {
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewContent: {
    marginBottom: 10,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  deleteButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  modalProductDetails: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalOrderNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalRatingLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  modalComment: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
});

export default Review;
