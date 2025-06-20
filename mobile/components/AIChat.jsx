import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, LogBox, ActivityIndicator, FlatList, Modal, Animated, TouchableWithoutFeedback, Keyboard, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import UserChat from './UserChat';
import COLORS from '../constants/colors';

// Ẩn các thông báo không cần thiết


const API_URL = "http://172.20.10.2:4000/api/user/products";

const AIChat = ({ isVisible, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const user = useAuthStore((state) => state.user);
  const { addToCart: addToCartStore } = useCartStore();
  const [showHumanChat, setShowHumanChat] = useState(false);
  const flatListRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollViewRef = useRef(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5;
      },
      onPanResponderGrant: () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({
            scrollEnabled: false
          });
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (scrollViewRef.current) {
          const { dy } = gestureState;
          scrollViewRef.current.scrollTo({
            y: -dy,
            animated: false
          });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({
            scrollEnabled: true
          });
          const { dy, vy } = gestureState;
          if (Math.abs(vy) > 0.5) {
            scrollViewRef.current.scrollTo({
              y: -dy,
              animated: true
            });
          }
        }
      },
      onPanResponderTerminate: () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({
            scrollEnabled: true
          });
        }
      }
    })
  ).current;

  useEffect(() => {
    if (isVisible) {
      fetchCategories();
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };

  // Thêm useEffect để hiển thị lời chào khi component được mount
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const welcomeMessage = "Xin chào! 👋 Tôi là trợ lý ảo của shop couple tx. Tôi có thể giúp bạn:\n\n" +
        "1. Tìm kiếm sản phẩm\n" +
        "2. Đề xuất sản phẩm phù hợp\n" +
        "3. Cung cấp thông tin về giá và mô tả sản phẩm\n" +
        "4. Trả lời các câu hỏi về shop\n\n" +
        "Bạn cần tôi giúp gì không? 😊";
      
      setMessages([{ text: welcomeMessage, sender: 'bot' }]);
    }
  }, [isVisible]);

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
    }
  };

  // Product keywords dictionary
  const productCategories = {
    'quần': ['quần', 'pants', 'jeans', 'shorts', 'quần jean', 'quần short'],
    'áo': ['áo', 'shirt', 't-shirt', 'sơ mi', 'áo thun', 'áo sơ mi'],
    'giày': ['giày', 'shoes', 'sneakers', 'giày thể thao', 'giày lười'],
    'mũ': ['mũ', 'cap', 'hat', 'nón', 'nón lưỡi trai'],
    'vớ': ['vớ', 'socks', 'stockings', 'tất'],
  };

  // Hàm lấy danh sách sản phẩm
  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        }
      });
      if (response.status === 200 && response.data.products) {
        setProducts(response.data.products);
        return response.data.products;
      }
      return [];
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm:", error);
      return [];
    }
  };

  // Hàm tìm kiếm sản phẩm theo từ khóa
  const searchProducts = (keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(lowerKeyword) ||
      product.description?.toLowerCase().includes(lowerKeyword)
    );
  };

  // Hàm đề xuất sản phẩm theo danh mục
  const suggestProductsByCategory = (category) => {
    const categoryKeywords = productCategories[category] || [];
    return products.filter(product => 
      categoryKeywords.some(keyword => 
        product.name.toLowerCase().includes(keyword) ||
        product.description?.toLowerCase().includes(keyword)
      )
    );
  };

  // Hàm tạo tin nhắn đề xuất sản phẩm
  const createProductSuggestionMessage = (products) => {
    if (products.length === 0) {
      return {
        text: "Xin lỗi, không tìm thấy sản phẩm phù hợp.",
        sender: 'bot'
      };
    }

    let message = "Tôi tìm thấy một số sản phẩm phù hợp:\n\n";
    products.slice(0, 3).forEach((product, index) => {
      message += `${index + 1}. ${product.name}\n`;
    });
    message += "\nBạn có thể nhấn vào số thứ tự hoặc tên sản phẩm để xem chi tiết.";
    
    return {
      text: message,
      sender: 'bot',
      products: products.slice(0, 3)
    };
  };

  // Hàm xử lý khi nhấn vào sản phẩm
  const handleProductPress = (product) => {
    const detailMessage = `Thông tin chi tiết về ${product.name}:\n\n` +
      `• Giá: ${product.price}đ\n` +
      `• Mô tả: ${product.description || 'Không có mô tả'}\n` +
      `• Kích thước: ${product.sizes?.join(', ') || 'Không có thông tin'}\n\n` +
      `Để thêm sản phẩm này vào giỏ hàng, hãy nhập "thêm" hoặc "mua"`;
    
    setMessages(prevMessages => [
      ...prevMessages,
      { 
        text: detailMessage, 
        sender: 'bot', 
        product: product,
        showProductImage: true 
      }
    ]);
  };

  // Hàm xử lý thêm sản phẩm vào giỏ hàng
  const handleAddToCart = async (product) => {
    try {
      // Kiểm tra sản phẩm có đầy đủ thông tin không
      if (!product || !product._id || !product.name || !product.price) {
        console.error("Thông tin sản phẩm không hợp lệ:", product);
        return "Có lỗi xảy ra: Thông tin sản phẩm không hợp lệ. Vui lòng thử lại sau.";
      }

      // Gọi API để thêm vào giỏ hàng
      const response = await axios.post(
        `${API_URL.replace('/products', '/add_cart')}`,
        {
          productId: product._id,
          quantity: 1
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          }
        }
      );

      if (response.data.success) {
        return `Đã thêm ${product.name} vào giỏ hàng thành công!\nBạn có muốn xem thêm sản phẩm khác không?`;
      } else {
        throw new Error(response.data.message || "Không thể thêm sản phẩm vào giỏ hàng");
      }
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      return "Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng. Vui lòng thử lại sau.";
    }
  };

  // Hàm xử lý xóa sản phẩm khỏi giỏ hàng
  const handleRemoveFromCart = async (product) => {
    try {
      if (!product || !product._id) {
        console.error("Thông tin sản phẩm không hợp lệ:", product);
        return "Có lỗi xảy ra: Thông tin sản phẩm không hợp lệ. Vui lòng thử lại sau.";
      }

      // Gọi API để xóa khỏi giỏ hàng
      const response = await axios.delete(
        `${API_URL.replace('/products', '/remove_cart')}`,
        {
          data: { productId: product._id },
          headers: {
            Authorization: `Bearer ${user?.token}`,
          }
        }
      );

      if (response.data.success) {
        return `Đã xóa ${product.name} khỏi giỏ hàng thành công!`;
      } else {
        throw new Error(response.data.message || "Không thể xóa sản phẩm khỏi giỏ hàng");
      }
    } catch (error) {
      console.error("Lỗi khi xóa khỏi giỏ hàng:", error);
      return "Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ hàng. Vui lòng thử lại sau.";
    }
  };

  // Hàm kiểm tra giỏ hàng
  const checkCart = () => {
    const cart = useCartStore.getState().cart;
    console.log("Kiểm tra giỏ hàng:", cart);
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return "Giỏ hàng của bạn đang trống.";
    }

    let message = "Giỏ hàng của bạn có:\n\n";
    cart.items.forEach(item => {
      message += `- ${item.name}\n`;
      message += `  Số lượng: ${item.quantity}\n`;
      message += `  Giá: ${item.price}đ\n\n`;
    });
    message += `Tổng tiền: ${cart.totalAmount}đ\n\n`;
    message += "Bạn có muốn thanh toán không?";
    return message;
  };

  // Hàm render tin nhắn với sản phẩm
  const renderMessage = ({ item: msg, index }) => {
    if (!msg || typeof msg !== 'object') return null;

    // Ensure msg has required properties
    const messageText = msg.text || '';
    const isBot = msg.sender === 'bot';

    if (isBot && msg.showProductLinks && Array.isArray(msg.products)) {
      return (
        <View style={styles.botMessage}>
          <View style={styles.messageContent}>
            {messageText.split('\n').map((line, i) => {
              const productMatch = line.match(/^(\d+)\.\s+(.+)$/);
              if (productMatch) {
                const productIndex = parseInt(productMatch[1]) - 1;
                const product = msg.products[productIndex];
                if (product) {
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleProductPress(product)}
                      style={styles.productLink}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.productLinkText}>{line}</Text>
                    </TouchableOpacity>
                  );
                }
              }
              return <Text key={i} style={styles.messageText}>{line}</Text>;
            })}
          </View>
        </View>
      );
    }

    if (isBot && msg.showProductImage && msg.product) {
      return (
        <View style={styles.botMessage}>
          <View style={styles.messageContent}>
            {msg.product.images && Array.isArray(msg.product.images) && msg.product.images[0] && (
              <Image 
                source={{ uri: msg.product.images[0] }} 
                style={styles.productDetailImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.messageText}>{messageText}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={isBot ? styles.botMessage : styles.userMessage}>
        <View style={styles.messageContent}>
          <Text style={isBot ? styles.messageText : styles.userMessageText}>
            {messageText}
          </Text>
        </View>
      </View>
    );
  };

  // Hàm xử lý câu hỏi chi tiết về sản phẩm
  const handleProductDetailQuestion = (input, products) => {
    const lowerInput = input.toLowerCase();
    
    // Tìm sản phẩm được đề cập trong câu hỏi
    const mentionedProduct = products.find(product => 
      lowerInput.includes(product.name.toLowerCase())
    );

    if (!mentionedProduct) {
      return "Bạn muốn biết thông tin về sản phẩm nào?";
    }

    let response = `Thông tin về ${mentionedProduct.name}:\n\n`;
    
    if (lowerInput.includes('giá') || lowerInput.includes('bao nhiêu')) {
      response += `Giá: ${mentionedProduct.price}đ\n`;
    }
    
    if (lowerInput.includes('mô tả') || lowerInput.includes('chi tiết')) {
      response += `Mô tả: ${mentionedProduct.description || 'Không có mô tả'}\n`;
    }
    
    if (lowerInput.includes('kích thước') || lowerInput.includes('size')) {
      response += `Kích thước có sẵn: ${mentionedProduct.sizes?.join(', ') || 'Không có thông tin'}\n`;
    }

    if (!lowerInput.includes('giá') && !lowerInput.includes('mô tả') && 
        !lowerInput.includes('kích thước') && !lowerInput.includes('size')) {
      response = `Đây là thông tin chi tiết về ${mentionedProduct.name}:\n\n` +
                `- Giá: ${mentionedProduct.price}đ\n` +
                `- Mô tả: ${mentionedProduct.description || 'Không có mô tả'}\n` +
                `- Kích thước: ${mentionedProduct.sizes?.join(', ') || 'Không có thông tin'}\n`;
    }

    return response;
  };

  // Thêm hàm scrollToBottom được tối ưu
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Thêm hàm xử lý scroll được tối ưu
  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollOffset(offsetY);
    setShowScrollButton(offsetY > 100);
  }, []);

  // Thêm hàm scrollToTop được tối ưu
  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  // Thêm hàm xử lý content size change được tối ưu
  const handleContentSizeChange = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Thêm hàm xử lý layout được tối ưu
  const handleLayout = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleMessage = async (message) => {
    if (!message.trim()) return;

    // Kiểm tra nếu người dùng muốn chat với người bán
    if (message.toLowerCase().includes('chat với người bán') || 
        message.toLowerCase().includes('tôi muốn chat với người bán') ||
        message.toLowerCase().includes('chuyển sang người bán')) {
      setShowHumanChat(true);
      return;
    }

    const newMessages = [...messages, { text: message, sender: 'user' }];
    setMessages(newMessages);
    setInputMessage("");
    setIsThinking(true);

    try {
      if (products.length === 0) {
        await fetchProducts();
      }

      const lowerInput = message.toLowerCase();
      let botReply;

      // Kiểm tra xem có phải câu hỏi về danh mục không
      if (lowerInput.includes('danh mục') || lowerInput.includes('category') || 
          lowerInput.includes('loại') || lowerInput.includes('mục')) {
        let categoryMessage = "Chúng tôi có các danh mục sản phẩm sau:\n\n";
        categories.forEach((category, index) => {
          if (category.id !== 'all') {
            categoryMessage += `${index}. ${category.name}\n`;
            if (category.keywords && category.keywords.length > 0) {
              categoryMessage += `   Từ khóa: ${category.keywords.join(', ')}\n`;
            }
            categoryMessage += '\n';
          }
        });
        categoryMessage += "Bạn có thể chọn danh mục bằng cách nhập số thứ tự hoặc tên danh mục (ví dụ: '1' hoặc 'áo')";
        
        botReply = {
          text: categoryMessage,
          sender: 'bot'
        };
      }
      // Kiểm tra xem có phải chọn danh mục không
      else {
        // Tìm danh mục theo số thứ tự
        const categoryNumber = parseInt(lowerInput);
        if (!isNaN(categoryNumber) && categoryNumber > 0 && categoryNumber < categories.length) {
          const selectedCategory = categories[categoryNumber];
          const categoryProducts = products.filter(product => 
            product.category.toLowerCase() === selectedCategory.name.toLowerCase()
          );
          
          if (categoryProducts.length > 0) {
            let productMessage = `Các sản phẩm trong danh mục ${selectedCategory.name}:\n\n`;
            categoryProducts.slice(0, 5).forEach((product, index) => {
              productMessage += `${index + 1}. ${product.name}\n`;
            });
            
            if (categoryProducts.length > 5) {
              productMessage += `... và ${categoryProducts.length - 5} sản phẩm khác.\n\n`;
            }
            
            productMessage += "Bạn có thể click vào tên sản phẩm để xem chi tiết.";
            
            botReply = {
              text: productMessage,
              sender: 'bot',
              products: categoryProducts,
              showProductLinks: true
            };
          } else {
            botReply = {
              text: `Hiện tại không có sản phẩm nào trong danh mục ${selectedCategory.name}.`,
              sender: 'bot'
            };
          }
        } else {
          // Tìm danh mục theo tên
          const selectedCategory = categories.find(cat => 
            cat.name.toLowerCase() === lowerInput.trim() ||
            cat.keywords?.some(keyword => keyword.toLowerCase() === lowerInput.trim())
          );
          
          if (selectedCategory) {
            const categoryProducts = products.filter(product => 
              product.category.toLowerCase() === selectedCategory.name.toLowerCase()
            );
            
            if (categoryProducts.length > 0) {
              let productMessage = `Các sản phẩm trong danh mục ${selectedCategory.name}:\n\n`;
              categoryProducts.slice(0, 5).forEach((product, index) => {
                productMessage += `${index + 1}. ${product.name}\n`;
              });
              
              if (categoryProducts.length > 5) {
                productMessage += `... và ${categoryProducts.length - 5} sản phẩm khác.\n\n`;
              }
              
              productMessage += "Bạn có thể click vào tên sản phẩm để xem chi tiết.";
              
              botReply = {
                text: productMessage,
                sender: 'bot',
                products: categoryProducts,
                showProductLinks: true
              };
            } else {
              botReply = {
                text: `Hiện tại không có sản phẩm nào trong danh mục ${selectedCategory.name}.`,
                sender: 'bot'
              };
            }
          } else {
            // Nếu không phải chọn danh mục, tiếp tục xử lý các trường hợp khác
            if (lowerInput.includes('xóa') || lowerInput.includes('xoá') || lowerInput.includes('remove')) {
              // Tìm sản phẩm gần nhất được hiển thị
              const lastProductMessage = [...messages].reverse().find(msg => msg.product);
              
              if (lastProductMessage?.product) {
                botReply = {
                  text: await handleRemoveFromCart(lastProductMessage.product),
                  sender: 'bot'
                };
              } else {
                botReply = {
                  text: "Vui lòng chọn sản phẩm cần xóa khỏi giỏ hàng.",
                  sender: 'bot'
                };
              }
            }
            // Kiểm tra xem có phải yêu cầu xem giỏ hàng không
            else if (lowerInput.includes('giỏ hàng') || lowerInput.includes('cart')) {
              botReply = {
                text: checkCart(),
                sender: 'bot'
              };
            }
            // Kiểm tra xem có phải yêu cầu thêm vào giỏ hàng không
            else if (lowerInput.includes('thêm') || lowerInput.includes('mua')) {
              // Tìm sản phẩm gần nhất được hiển thị
              const lastProductMessage = [...messages].reverse().find(msg => msg.product);
              
              if (lastProductMessage?.product) {
                // Kiểm tra sản phẩm có đầy đủ thông tin không
                if (!lastProductMessage.product._id || !lastProductMessage.product.name || !lastProductMessage.product.price) {
                  console.error("Thông tin sản phẩm không đầy đủ:", lastProductMessage.product);
                  botReply = {
                    text: "Thông tin sản phẩm không đầy đủ. Vui lòng chọn sản phẩm khác.",
                    sender: 'bot'
                  };
                } else {
                  botReply = {
                    text: handleAddToCart(lastProductMessage.product),
                    sender: 'bot'
                  };
                }
              } else {
                botReply = {
                  text: "Vui lòng chọn sản phẩm trước khi thêm vào giỏ hàng.",
                  sender: 'bot'
                };
              }
            }
            // Kiểm tra các câu hỏi về chi tiết sản phẩm
            else if (lowerInput.includes('giá') || lowerInput.includes('mô tả') || 
                lowerInput.includes('kích thước') || lowerInput.includes('size') ||
                lowerInput.includes('chi tiết') || lowerInput.includes('bao nhiêu')) {
              botReply = {
                text: handleProductDetailQuestion(message, products),
                sender: 'bot'
              };
            }
            // Kiểm tra tìm kiếm sản phẩm
            else if (lowerInput.includes('sản phẩm') || lowerInput.includes('tìm')) {
              for (const [category, keywords] of Object.entries(productCategories)) {
                if (keywords.some(keyword => lowerInput.includes(keyword))) {
                  const suggestedProducts = suggestProductsByCategory(category);
                  botReply = createProductSuggestionMessage(suggestedProducts);
                  break;
                }
              }

              if (!botReply) {
                const searchResults = searchProducts(message);
                botReply = createProductSuggestionMessage(searchResults);
              }
            } else {
              try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCIGJ9AB4mJSaXq0UFX2XzHjxlHzMamf6Y', {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: message }] }]
                  })
                });

                const data = await response.json();
                const botReply = {
                  text: data.candidates[0]?.content?.parts[0]?.text || "Xin lỗi, tôi không hiểu câu hỏi của bạn.",
                  sender: 'bot'
                };

                setMessages(prevMessages => [...prevMessages, botReply]);
              } catch (error) {
                console.error("Lỗi khi gọi Gemini API:", error);
                const errorMessage = {
                  text: "Xin lỗi, tôi đang gặp vấn đề kết nối. Vui lòng thử lại sau.",
                  sender: 'bot'
                };
                setMessages(prevMessages => [...prevMessages, errorMessage]);
              }
            }
          }
        }
      }

      setMessages(prevMessages => [
        ...prevMessages,
        botReply
      ]);
      
      // Thêm scrollToBottom sau khi thêm tin nhắn mới
      setTimeout(scrollToBottom, 100);

    } catch (error) {
      console.error("Lỗi:", error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: `Có lỗi xảy ra: ${error.message}`, sender: 'bot' }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isVisible) return null;

  if (showHumanChat) {
    return (
      <UserChat
        isVisible={true}
        onClose={() => {
          setShowHumanChat(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: opacityAnim
            }
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  transform: [
                    { scale: scaleAnim },
                    {
                      translateY: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    }
                  ]
                },
                keyboardHeight > 0 && styles.modalContentWithKeyboard
              ]}
            >
              <View style={styles.container}>
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                    <Text style={styles.title}>Chat với AI</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>

                {isThinking ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1E90FF" />
                  </View>
                ) : (
                  <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                  >
                    <View 
                      style={styles.messagesContainer}
                      {...panResponder.panHandlers}
                    >
                      <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item, index) => index.toString()}
                        style={styles.scrollView}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                        onContentSizeChange={scrollToBottom}
                        onLayout={scrollToBottom}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        initialNumToRender={10}
                        onEndReachedThreshold={0.5}
                        scrollEnabled={true}
                        maintainVisibleContentPosition={{
                          minIndexForVisible: 0,
                          autoscrollToTopThreshold: 10
                        }}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={inputMessage}
                        onChangeText={setInputMessage}
                        placeholder="Nhập tin nhắn..."
                        placeholderTextColor="#999"
                        multiline
                        maxLength={500}
                        onFocus={() => {
                          setTimeout(() => {
                            if (scrollViewRef.current) {
                              scrollViewRef.current.scrollToEnd({ animated: true });
                            }
                          }, 100);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => handleMessage(inputMessage)}
                        disabled={isThinking}
                      >
                        <Ionicons
                          name="send"
                          size={20}
                          color="white"
                        />
                      </TouchableOpacity>
                    </View>
                  </KeyboardAvoidingView>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: '90%',
    height: '70%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalContentWithKeyboard: {
    width: '95%',
    height: '85%',
    maxHeight: '90%',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    padding: 12,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    padding: 12,
    paddingBottom: 20,
  },
  botMessage: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 15,
    marginBottom: 8,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  userMessage: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 15,
    marginBottom: 8,
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderBottomRightRadius: 5,
  },
  messageContent: {
    flexDirection: 'column',
  },
  messageText: {
    color: '#333',
    fontSize: 13,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    minHeight: 60,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    fontSize: 13,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#1E90FF',
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productNumber: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  productLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  productLinkText: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '500',
  },
  addToCartButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  thinkingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 13,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollToTopButton: {
    position: 'absolute',
    right: 15,
    bottom: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
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
  scrollToBottomButton: {
    position: 'absolute',
    right: 15,
    bottom: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
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
});

export default AIChat;
