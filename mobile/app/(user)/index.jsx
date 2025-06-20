import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  TextInput,
  Modal,
  SafeAreaView,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCartStore } from '../../store/cartStore';
import AIChat from '../../components/AIChat';
import RatingStars from '../../components/RatingStars';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function Home() {
  const insets = useSafeAreaInsets();
  const { isAdmin, user, setUser } = useAuthStore();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const { addToCart: addToCartStore } = useCartStore();
  const [productDetailModalVisible, setProductDetailModalVisible] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isChatbotVisible, setIsChatbotVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [chatButtonPosition, setChatButtonPosition] = useState({ x: 0, y: 0 });
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const [categories, setCategories] = useState([]);
  const [productReviews, setProductReviews] = useState([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://172.20.10.2:4000/api/user/categories', {
        headers: {
          token: user.token
        }
      });
      
      if (response.data.success) {
        // Thêm category "Tất cả" vào đầu mảng
        setCategories([
          { id: 'all', name: 'Tất cả', keywords: [] },
          ...response.data.categories
        ]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Lỗi', 'Không thể tải danh mục sản phẩm');
    }
  };

  // Debounce search function
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const filterProducts = useCallback(() => {
    setIsSearching(true);
    try {
      let filtered = [...products];
      const query = searchQuery.toLowerCase().trim();
      
      // Filter by category
      if (selectedCategory !== 'all') {
        const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
        if (selectedCategoryData) {
          filtered = filtered.filter(product => {
            const productName = product.name.toLowerCase();
            const productDesc = product.description.toLowerCase();
            
            // Kiểm tra xem sản phẩm có chứa bất kỳ từ khóa nào của danh mục không
            const hasCategoryKeyword = selectedCategoryData.keywords.some(keyword => {
              const normalizedKeyword = keyword.toLowerCase();
              return productName.includes(normalizedKeyword) || 
                     productDesc.includes(normalizedKeyword);
            });

            // Nếu đang tìm kiếm, kiểm tra thêm từ khóa tìm kiếm
            if (query) {
              return hasCategoryKeyword && (
                productName.includes(query) ||
                productDesc.includes(query) ||
                product.price.toString().includes(query)
              );
            }

            return hasCategoryKeyword;
          });
        }
      } else if (query) {
        // Nếu không có danh mục được chọn, chỉ tìm kiếm theo từ khóa
        filtered = filtered.filter(product => {
          const productName = product.name.toLowerCase();
          const productDesc = product.description.toLowerCase();
          const productPrice = product.price.toString();
          
          return (
            productName.includes(query) ||
            productDesc.includes(query) ||
            productPrice.includes(query)
          );
        });
      }
      
      setFilteredProducts((filtered || []).filter(Boolean));
    } catch (error) {
      console.error('Error filtering products:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tìm kiếm sản phẩm');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategory, products]);

  // Debounced filter function
  const debouncedFilter = useCallback(
    debounce(() => {
      filterProducts();
    }, 300),
    [filterProducts]
  );

  useEffect(() => {
    fetchUserData();
    fetchProducts();
    requestPermission();
  }, []);

  useEffect(() => {
    debouncedFilter();
  }, [searchQuery, selectedCategory, products]);

  useEffect(() => {
    // Tính toán vị trí góc dưới bên phải
    const windowWidth = Dimensions.get('window').width;
    const windowHeight = Dimensions.get('window').height;
    setChatButtonPosition({
      x: windowWidth - 70, // 50 (width) + 20 (padding)
      y: windowHeight - 70 // 50 (height) + 20 (padding)
    });
  }, []);

  useEffect(() => {
    if (params.productId) {
      fetchProductDetailById(params.productId);
      setProductDetailModalVisible(true);
      // Xóa params sau khi mở modal (nếu muốn)
      router.setParams({});
    }
  }, [params.productId]);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const response = await axios.get('http://172.20.10.2:4000/api/user/products', {
        headers: {
          token: user.token
        }
      });
      
      if (response.data.success) {
        console.log('API Response:', response.data);
        console.log('Products array:', response.data.products);
        if (response.data.products && response.data.products.length > 0) {
          console.log('First product image URL:', response.data.products[0].image);
        }
        setProducts(response.data.products);
      } else {
        console.log('API returned success: false');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    }
  };

  const fetchProductDetailById = async (productId) => {
    try {
      const productResponse = await axios.get(`http://172.20.10.2:4000/api/user/products/${productId}`, {
        headers: {
          token: user.token,
        }
      });
      
      if (productResponse.data.success) {
        setSelectedProductDetail(productResponse.data.product);
        const currentCategory = productResponse.data.product.category;
        const related = products.filter(
          (p) => p._id !== productId && p.category === currentCategory
        );
        setRelatedProducts((related || []).filter(Boolean));

        // Lấy đánh giá sản phẩm
        const reviewsResponse = await axios.get(
          `http://172.20.10.2:4000/api/user/products/${productId}/reviews`,
          {
            headers: {
              token: user.token,
            }
          }
        );

        if (reviewsResponse.data.success) {
          console.log('Reviews fetched:', reviewsResponse.data.reviews);
          setProductReviews(reviewsResponse.data.reviews);
        } else {
          console.error('Failed to fetch reviews:', reviewsResponse.data.message);
          setProductReviews([]);
        }
      }
    } catch (error) {
      console.error('Error fetching product details or reviews:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết sản phẩm hoặc đánh giá');
    }
  };

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Sorry, we need camera roll permissions to make this work!');
      }
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axios.get('http://172.20.10.2:4000/api/user/get-user', {
        headers: {
          token: user.token
        }
      });
      
      if (response.data.success) {
        setUserData(response.data.user);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user data');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('userId', userData._id);

      const response = await axios.put(
        'http://172.20.10.2:4000/api/user/update-profile',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            token: user.token,
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Profile image updated');
        fetchUserData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  const handleCloseProductDetailModal = () => {
    setProductDetailModalVisible(false);
    setSelectedSize('');
  };

  const handleProductPress = async (item) => {
    if (item?._id) {
      setProductDetailModalVisible(false);
      setTimeout(async () => {
        setSelectedSize('');
        await fetchProductDetailById(item._id);
        setProductDetailModalVisible(true);
      }, 200);
    }
  };

  const addToCart = async () => {
    if (!selectedSize) {
      Alert.alert('Vui lòng chọn size!');
      return;
    }
    if (!selectedProductDetail) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin sản phẩm');
      return;
    }
    // Kiểm tra tồn kho trước khi thêm vào giỏ hàng
    if (Number(quantity) > Number(selectedProductDetail.stock)) {
      Alert.alert('Lỗi', `Số lượng vượt quá tồn kho! Hiện chỉ còn ${selectedProductDetail.stock} sản phẩm.`);
      return;
    }

    try {
      console.log('Adding to cart:', {
        product: selectedProductDetail,
        size: selectedSize,
        quantity: Number(quantity)
      });

      const cartItem = {
        ...selectedProductDetail,
        size: selectedSize,
        quantity: Number(quantity)
      };

      // Add to local store first
      await addToCartStore(cartItem);

      // If user is logged in, sync with server
      if (user?.token) {
        try {
          const response = await axios.post(
            'http://172.20.10.2:4000/api/user/add_cart',
            {
              productId: selectedProductDetail._id,
              quantity: Number(quantity),
              size: selectedSize
            },
            {
              headers: {
                Authorization: `Bearer ${user.token}`
              }
            }
          );

          if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to sync with server');
          }
        } catch (error) {
          console.error('Error syncing with server:', error);
          // Revert local changes if server sync fails
          const storedCart = await AsyncStorage.getItem('cart');
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            setCart(parsedCart);
          }
          throw error;
        }
      }

      Alert.alert('Thành công', 'Đã thêm sản phẩm vào giỏ hàng');
      setProductDetailModalVisible(false);
      setSelectedSize('');
      setQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Lỗi', 'Không thể thêm sản phẩm vào giỏ hàng');
    }
  };

  const clearCart = async () => {
    try {
      Alert.alert(
        'Xác nhận',
        'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
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
                const response = await axios.delete(
                  'http://172.20.10.2:4000/api/user/clear_cart',
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'token': user.token
                    }
                  }
                );

                if (response.data.success) {
                  Alert.alert('Thành công', 'Đã xóa toàn bộ giỏ hàng');
                } else {
                  Alert.alert('Lỗi', response.data.message || 'Không thể xóa giỏ hàng');
                }
              } catch (error) {
                console.error('Error clearing cart:', error);
                Alert.alert('Lỗi', 'Không thể xóa giỏ hàng');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in clear cart:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa giỏ hàng');
    }
  };

  const handlePositionChange = (newPosition) => {
    // Đảm bảo chat không bị kéo ra ngoài màn hình
    const maxX = Dimensions.get('window').width - 300; // 300 là width của chat
    const maxY = Dimensions.get('window').height - 500; // 500 là height của chat
    
    setChatPosition({
      x: Math.max(0, Math.min(newPosition.x, maxX)),
      y: Math.max(0, Math.min(newPosition.y, maxY))
    });
  };

  const handleButtonPositionChange = (newPosition) => {
    const maxX = Dimensions.get('window').width - 60;
    const maxY = Dimensions.get('window').height - 60;
    
    setChatButtonPosition({
      x: Math.max(0, Math.min(newPosition.x, maxX)),
      y: Math.max(0, Math.min(newPosition.y, maxY))
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDraggingButton(true);
      },
      onPanResponderMove: (_, gesture) => {
        const newX = chatButtonPosition.x + gesture.dx;
        const newY = chatButtonPosition.y + gesture.dy;
        
        // Giới hạn không cho kéo ra ngoài màn hình
        const maxX = Dimensions.get('window').width - 60;
        const maxY = Dimensions.get('window').height - 60;
        
        pan.setValue({
          x: Math.max(0, Math.min(newX, maxX)) - chatButtonPosition.x,
          y: Math.max(0, Math.min(newY, maxY)) - chatButtonPosition.y
        });
      },
      onPanResponderRelease: (_, gesture) => {
        const newX = chatButtonPosition.x + gesture.dx;
        const newY = chatButtonPosition.y + gesture.dy;
        
        // Giới hạn không cho kéo ra ngoài màn hình
        const maxX = Dimensions.get('window').width - 60;
        const maxY = Dimensions.get('window').height - 60;
        
        setChatButtonPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
        
        pan.setValue({ x: 0, y: 0 });
        setIsDraggingButton(false);
      }
    })
  ).current;

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  (filteredProducts || []).forEach((item, idx) => {
    if (!item) console.log('Undefined item in filteredProducts at index', idx);
  });
  (relatedProducts || []).forEach((item, idx) => {
    if (!item) console.log('Undefined item in relatedProducts at index', idx);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Chào Mừng</Text>
              <Text style={styles.username}>{userData?.name}</Text>
              <Text style={styles.shopName}> Đến Với Couple TX</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                <Image
                  source={
                    userData?.image
                      ? { uri: userData.image }
                      : require('../../assets/images/shop1.png')
                  }
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Floating Chat Button */}
        <Animated.View
          style={[
            styles.chatButtonContainer,
            {
              transform: pan.getTranslateTransform(),
              opacity: isDraggingButton ? 0.8 : 1,
              right: 20,
              bottom: 20,
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity 
            onPress={() => setIsChatbotVisible(!isChatbotVisible)} 
            style={styles.chatbotButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* AIChat Component */}
        <AIChat 
          isVisible={isChatbotVisible} 
          onClose={() => setIsChatbotVisible(false)}
          position={chatPosition}
          onPositionChange={handlePositionChange}
          isDragging={isDragging}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
        />

        {/* Search and Categories */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category.id && styles.categoryButtonTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <ScrollView style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          <View style={styles.productGrid}>
            {(filteredProducts || []).filter(Boolean).map((item) => {
              {console.log('Render product price:', item)}
              return (
                <View key={item._id} style={styles.productColumn}>
                  <TouchableOpacity 
                    style={styles.productCard}
                    onPress={() => handleProductPress(item)}
                  >
                    <Image
                      source={{ uri: item && item.image ? item.image : '' }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{item && item.name ? item.name : ''}</Text>
                      <Text style={styles.price}>
                        {typeof item.price === 'number' ? item.price.toLocaleString('vi-VN') + 'đ' : '0đ'}
                      </Text>
                      {/* <Text style={styles.productDescription} numberOfLines={2}>
                        {item.description}
                      </Text> */}
                      <View style={styles.productDetails}>
                        {/* <Text style={styles.productDetail}>
                          Size: {Array.isArray(item.size) ? item.size.join(', ') : item.size}
                        </Text> */}
                        {/* <Text style={styles.productDetail}>
                          Color: {item.color}
                        </Text> */}
                      </View>
                      <TouchableOpacity 
                        style={styles.addToCartButton}
                        onPress={() => handleProductPress(item)}
                      >
                        <Text style={styles.addToCartButtonText}>Thêm vào giỏ</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Product Detail Modal */}
        <Modal
          visible={productDetailModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseProductDetailModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleCloseProductDetailModal}
                >
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Chi tiết sản phẩm</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleCloseProductDetailModal}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScrollView}>
                {selectedProductDetail ? (
                  <>
                    {selectedProductDetail.isDeleted && (
                      <Text style={{ color: 'red', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                        Sản phẩm này đã ngưng kinh doanh.
                      </Text>
                    )}
                    <Image
                      source={{ uri: selectedProductDetail.image || '' }}
                      style={styles.modalProductImage}
                      resizeMode="contain"
                    />
                    <View style={styles.modalProductInfo}>
                      <Text style={styles.modalProductName}>{selectedProductDetail.name || ''}</Text>
                      <Text style={styles.modalProductPrice}>
                        {selectedProductDetail && typeof selectedProductDetail.price === 'number'
                          ? selectedProductDetail.price.toLocaleString('vi-VN') + 'đ'
                          : '0đ'}
                      </Text>
                      <View style={styles.descriptionSectionContainer}>
                        <Text style={styles.modalSectionTitle}>Mô tả</Text>
                        <Text
                          style={styles.modalDescription}
                          numberOfLines={showFullDescription ? undefined : 3}
                        >
                          {selectedProductDetail.description || ''}
                        </Text>
                        {selectedProductDetail.description && selectedProductDetail.description.length > 100 && (
                          <TouchableOpacity onPress={() => setShowFullDescription((prev) => !prev)}>
                            <Text style={{ color: COLORS.primary, marginTop: 5, fontWeight: 'bold' }}>
                              {showFullDescription ? 'Thu gọn' : 'Đọc thêm'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Thông tin chi tiết</Text>
                        <View style={styles.modalDetailsContainer}>
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Tồn kho:</Text>
                            <Text style={styles.modalDetailValue}>
                              {typeof selectedProductDetail.stock === 'number' ? selectedProductDetail.stock : 'Không rõ'}
                            </Text>
                          </View>
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Size:</Text>
                            <View style={styles.modalDetailValue}>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {Array.isArray(selectedProductDetail.size) && selectedProductDetail.size.map((size) => (
                                  <TouchableOpacity
                                    key={size}
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 8,
                                      borderRadius: 20,
                                      borderWidth: 1,
                                      borderColor: selectedSize === size ? COLORS.primary : '#ccc',
                                      backgroundColor: selectedSize === size ? COLORS.primary : '#fff',
                                      marginRight: 8,
                                      marginBottom: 8,
                                    }}
                                    onPress={() => setSelectedSize(size)}
                                  >
                                    <Text style={{ color: selectedSize === size ? '#fff' : '#333', fontWeight: 'bold' }}>{size}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Màu sắc:</Text>
                            <Text style={styles.modalDetailValue}>{selectedProductDetail.color || ''}</Text>
                          </View>
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Danh mục:</Text>
                            <Text style={styles.modalDetailValue}>{selectedProductDetail.category || ''}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.modalQuantityContainer}>
                        <Text style={styles.modalQuantityLabel}>Số lượng:</Text>
                        <TextInput
                          style={styles.modalQuantityInput}
                          value={quantity}
                          onChangeText={setQuantity}
                          keyboardType="numeric"
                          placeholder="Nhập số lượng"
                        />
                      </View>
                      {relatedProducts.length > 0 && (
                        <View style={{ marginTop: 30 }}>
                          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                            Sản phẩm liên quan
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {(relatedProducts || []).filter(Boolean).map((item) => {
                              {console.log('Render related product price:', item)}
                              return (
                                <TouchableOpacity
                                  key={item._id}
                                  onPress={() => handleProductPress(item)}
                                  style={{ marginRight: 15 }}
                                >
                                  <Image
                                    source={{ uri: item && item.image ? item.image : '' }}
                                    style={{ width: 100, height: 100, borderRadius: 8 }}
                                    resizeMode="contain"
                                  />
                                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ maxWidth: 100 }}>
                                    {item && item.name ? item.name : ''}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                      {/* Product Reviews Section */}
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Đánh giá sản phẩm</Text>
                        {productReviews && productReviews.length > 0 ? (
                          productReviews.map((review) => (
                            <View key={review._id} style={styles.reviewItemContainer}>
                              <View style={styles.reviewHeaderContent}>
                                <Text style={styles.reviewerName}>
                                  {review.user?.name || 'Người dùng ẩn danh'}
                                </Text>
                                <Text style={styles.reviewDateText}>
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  }) : ''}
                                </Text>
                              </View>
                              <RatingStars rating={review.rating} size={18} />
                              <Text style={styles.reviewComment}>{review.comment || ''}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noReviewsText}>Chưa có đánh giá nào cho sản phẩm này</Text>
                        )}
                      </View>
                    </View>
                    {selectedProductDetail.isDeleted ? (
                      <Text style={{ color: 'red', fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
                        Sản phẩm này đã ngưng kinh doanh.
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.modalAddToCartButton}
                        onPress={addToCart}
                      >
                        <Text style={styles.modalAddToCartButtonText}>Thêm vào giỏ hàng</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  shopName: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  avatarContainer: {
    marginLeft: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  productsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  productColumn: {
    width: '48%',
    marginBottom: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  productInfo: {
    padding: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  price: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productDetail: {
    fontSize: 12,
    color: '#999',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryButtonText: {
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  addToCartButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1,
  },
  modalScrollView: {
    flex: 1,
  },
  modalProductImage: {
    width: '100%',
    height: 300,
  },
  modalProductInfo: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalProductPrice: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'justify',
  },
  modalDetailsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  modalDetailLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  modalDetailValue: {
    flex: 2,
    fontSize: 16,
    color: '#333',
  },
  modalQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalQuantityLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  modalQuantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  modalAddToCartButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalAddToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
  },
  placeholder: {
    width: 24,
  },
  chatButtonContainer: {
    position: 'absolute',
    zIndex: 9999,
    width: 50,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chatbotButton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E90FF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  reviewItemContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reviewHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewDateText: {
    fontSize: 12,
    color: '#888',
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic'
  },
  descriptionSectionContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
});
