import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import COLORS from '../../constants/colors';
import { useRouter } from 'expo-router';

export default function ManagerProduct() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { user } = useAuthStore();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const router = useRouter();

  // New states for Trash Bin
  const [trashModalVisible, setTrashModalVisible] = useState(false);
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [isRefreshingTrash, setIsRefreshingTrash] = useState(false);

  // New state for Description Modal
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    name: '',
    color: '',
    size: '',
    description: '',
    price: '',
    imageLink: '',
    stock: '',   
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://172.20.10.2:4000/api/admin/list', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (response.data.success) {
        setProducts(response.data.products);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách sản phẩm');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Lỗi', 'Không thể lấy danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch deleted products for the modal
  const fetchDeletedProducts = async (fromPull = false) => {
    if (fromPull) setIsRefreshingTrash(true);
    setIsTrashLoading(true);
    try {
      if (!user?.token) {
        Alert.alert('Lỗi', 'Token hết hạn. Vui lòng đăng nhập lại.');
        // Optionally redirect to login if not in modal context
        return;
      }

      const response = await axios.get('http://172.20.10.2:4000/api/admin/deleted-products', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.data.success) {
        setDeletedProducts(response.data.products);
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể lấy danh sách sản phẩm đã xóa');
      }
    } catch (error) {
      console.error('Error fetching deleted products:', error.response?.data || error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lấy danh sách sản phẩm đã xóa.');
    } finally {
      setIsTrashLoading(false);
      if (fromPull) setIsRefreshingTrash(false);
    }
  };

  const handleRestore = async (productId) => {
    if (!user?.token) {
      Alert.alert('Lỗi', 'Token hết hạn. Vui lòng đăng nhập lại.');
      return;
    }
    try {
      const response = await axios.post(
        'http://172.20.10.2:4000/api/admin/restore-product',
        { productId },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      if (response.data.success) {
        Alert.alert('Thành công', response.data.message);
        fetchDeletedProducts(); // Refresh deleted list
        fetchProducts(); // Refresh main product list
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể khôi phục sản phẩm');
      }
    } catch (error) {
      console.error('Error restoring product:', error.response?.data || error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể khôi phục sản phẩm.');
    }
  };

  const handleHardDelete = async (productId) => {
    if (!user?.token) {
      Alert.alert('Lỗi', 'Token hết hạn. Vui lòng đăng nhập lại.');
      return;
    }
    try {
      const response = await axios.post(
        'http://172.20.10.2:4000/api/admin/hard-delete-product',
        { productId },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      if (response.data.success) {
        Alert.alert('Thành công', response.data.message || 'Sản phẩm đã được xóa vĩnh viễn');
        fetchDeletedProducts(); // Refresh deleted list
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể xóa vĩnh viễn sản phẩm');
      }
    } catch (error) {
      console.error('Error hard deleting product:', error.response?.data || error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa vĩnh viễn sản phẩm.');
    } finally {
      setDeleteModalVisible(false); // Close confirmation modal if open
      setProductToDelete(null);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      category: product.category,
      name: product.name,
      color: product.color,
      size: product.size.join(', '),
      description: product.description,
      price: product.price.toString(),
      imageLink: product.image,
       stock: product.stock?.toString() || '',
    });
    setModalVisible(true);
  };

  // Modified handleDelete for soft delete (move to trash)
  const handleDelete = async (productId) => {
    if (!user.token) {
      if (Platform.OS === 'web') {
        alert('Token hết hạn. Vui lòng đăng nhập lại.');
      } else {
        Alert.alert('Lỗi', 'Token hết hạn. Vui lòng đăng nhập lại.');
      }
      return;
    }

    setProductToDelete(productId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await axios.post(
        'http://172.20.10.2:4000/api/admin/delete', // Soft delete endpoint
        { productId: productToDelete },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      if (response.data.success) {
        if (Platform.OS === 'web') {
          alert('Sản phẩm đã được chuyển vào thùng rác');
        } else {
          Alert.alert('Thành công', 'Sản phẩm đã được chuyển vào thùng rác');
        }
        fetchProducts(); // Refresh main list
        fetchDeletedProducts(); // Refresh trash list
      } else {
        if (Platform.OS === 'web') {
          alert(response.data.message || 'Không thể chuyển sản phẩm vào thùng rác');
        } else {
          Alert.alert('Lỗi', response.data.message || 'Không thể chuyển sản phẩm vào thùng rác');
        }
      }
    } catch (error) {
      console.error('Error soft deleting product:', error.response?.data || error);
      if (Platform.OS === 'web') {
        alert(error.response?.data?.message || 'Không thể chuyển sản phẩm vào thùng rác. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', error.response?.data?.message || 'Không thể chuyển sản phẩm vào thùng rác. Vui lòng thử lại.');
      }
    } finally {
      setDeleteModalVisible(false);
      setProductToDelete(null);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.category || !formData.name || !formData.color || 
          !formData.size || !formData.description || !formData.price) {
        Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
        return;
      }

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'size') {
          formDataToSend.append(key, formData[key].split(',').map(s => s.trim()));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (editingProduct) {
        formDataToSend.append('productId', editingProduct._id);
      }

      const response = await axios.post(
        `http://172.20.10.2:4000/api/admin/${editingProduct ? 'edit' : 'add'}`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Thành công', `Sản phẩm đã được ${editingProduct ? 'cập nhật' : 'thêm'} thành công`);
        setModalVisible(false);
        fetchProducts();
      } else {
        Alert.alert('Lỗi', response.data.message || 'Thao tác thất bại');
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      Alert.alert('Lỗi', `Không thể ${editingProduct ? 'cập nhật' : 'thêm'} sản phẩm`);
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.productDetail}>Danh mục: {item.category}</Text>
        <Text style={styles.productDetail}>Màu: {item.color}</Text>
        <Text style={styles.productDetail}>Size: {item.size.join(', ')}</Text>
        <Text style={styles.productDetail}>Tồn kho: {item.stock ?? 0}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item._id)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // New render function for deleted products in trash modal
  const renderDeletedProduct = ({ item }) => {
    console.log("Rendering deleted product:", item.name);
    return (
      <View style={[styles.productCard, { overflow: 'visible' }]}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.productDetail}>Danh mục: {item.category}</Text>
          <Text style={styles.productDetail}>Màu: {item.color}</Text>
          <Text style={styles.productDetail}>Size: {item.size.join(', ')}</Text>
          <Text style={styles.productDetail}>Tồn kho: {item.stock ?? 0}</Text>
          <Text style={styles.productDeletedAt}>Đã xóa vào: {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</Text>
        </View>
        <View style={[styles.actionButtons, { overflow: 'visible' }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={() => handleRestore(item._id)}
          >
            <Text style={styles.buttonText}>Khôi phục</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.hardDeleteButton]}
            onPress={() => {
              setProductToDelete(item._id); // Set for hard delete confirmation
              setDeleteModalVisible(true); // Reuse existing delete confirmation modal
            }}
          >
            <Text style={styles.buttonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Quản lý sản phẩm</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              console.log("Nút thêm mới được nhấn");
              setEditingProduct(null);
              setFormData({
                category: '',
                name: '',
                color: '',
                size: '',
                description: '',
                price: '',
                imageLink: '',
              });
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trashButton}
            onPress={() => {
              setTrashModalVisible(true);
              fetchDeletedProducts();
            }}
          >
            <Ionicons name="trash-bin-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
      />

      {modalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.grey} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                <TextInput
                  style={styles.input}
                  placeholder="Danh mục"
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Tên sản phẩm"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Màu sắc"
                  value={formData.color}
                  onChangeText={(text) => setFormData({ ...formData, color: text })}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Size (phân cách bằng dấu phẩy)"
                  value={formData.size}
                  onChangeText={(text) => setFormData({ ...formData, size: text })}
                />

                {/* New button to open description modal */}
                <TouchableOpacity
                  style={styles.openDescriptionModalButton}
                  onPress={() => setDescriptionModalVisible(true)}
                >
                  <Text style={styles.openDescriptionModalButtonText}>Xem/Sửa mô tả chi tiết</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Giá"
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  keyboardType="numeric"
                />
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Số lượng tồn kho"
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.imageSection}>
                  <Text style={styles.sectionTitle}>Thêm ảnh sản phẩm</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={editingProduct?.imageLink ? "Link ảnh hiện tại" : "Nhập link ảnh"}
                    value={formData.imageLink}
                    onChangeText={(text) => setFormData({ ...formData, imageLink: text })}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.buttonText}>
                    {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete Confirmation Modal (Used for both soft delete and hard delete confirmation) */}
      {deleteModalVisible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Xác nhận xóa</Text>
              <Text style={styles.deleteModalText}>
                Bạn có chắc chắn muốn xóa sản phẩm này?
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    // Distinguish between soft delete and hard delete based on modal origin or a state
                    // For simplicity, assume if this modal is triggered by renderDeletedProduct's trash icon, it's hard delete
                    // Otherwise, it's a soft delete (from main product list)
                    if (trashModalVisible) { // If trash modal is open, this delete confirms hard delete
                      handleHardDelete(productToDelete);
                    } else { // Otherwise, it's a soft delete from the main product list
                      confirmDelete();
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Trash Bin Modal */}
      {trashModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={trashModalVisible}
          onRequestClose={() => setTrashModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.trashModalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setTrashModalVisible(false)}
                >
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Thùng rác sản phẩm</Text>
                <View style={{ width: 24 }} />{/* Spacer */}
              </View>

              {isTrashLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : (
                <FlatList
                  data={deletedProducts}
                  renderItem={renderDeletedProduct}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={(
                    <Text style={styles.emptyListText}>Không có sản phẩm nào trong thùng rác.</Text>
                  )}
                />
              )}

            </View>
          </View>
        </Modal>
      )}

      {/* Description Edit Modal */}
      {descriptionModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={descriptionModalVisible}
          onRequestClose={() => setDescriptionModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chỉnh sửa mô tả</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setDescriptionModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.grey} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                <TextInput
                  style={[styles.input, styles.largeDescriptionInput]}
                  placeholder="Nhập mô tả sản phẩm..."
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  autoFocus
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDescriptionModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={() => {
                    // No direct save needed here, as formData is updated onChangeText
                    setDescriptionModalVisible(false);
                  }}
                >
                  <Text style={styles.buttonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
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
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    overflow: 'visible',
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#666',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
  },
  restoreButton: {
    backgroundColor: '#1976D2',
  },
  hardDeleteButton: {
    backgroundColor: COLORS.red,
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
    width: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'visible',
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.primary,
    flex: 1,
  },
  closeButton: {
    padding: 5,
    marginRight: -5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imageSection: {
    marginTop: 10,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.textPrimary,
  },
  modalScrollView: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    overflow: 'visible',
  },
  modalButton: {
    width: '48%',
    padding: 18,
    borderRadius: 10,
    marginHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: COLORS.grey,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  trashModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  backButton: {
    padding: 5,
  },
  emptyListText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  largeDescriptionInput: {
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 200,
    paddingTop: 15,
    fontSize: 16,
    lineHeight: 24,
  },
  openDescriptionModalButton: {
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  openDescriptionModalButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
