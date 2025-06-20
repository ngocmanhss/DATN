import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Alert,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import COLORS from '../constants/colors'; // Import COLORS

const SOCKET_URL = 'http://172.20.10.2:4000';

const UserChat = ({ isVisible, onClose }) => {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Cải thiện hàm decode token với logging chi tiết
  const decodeToken = (token) => {
    try {
      if (!token) {
        console.log('Token is null or undefined');
        return null;
      }

      console.log('Attempting to decode token:', token.substring(0, 20) + '...');
      
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        console.log('Invalid token format - no payload found');
        return null;
      }

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      console.log('Decoded payload:', jsonPayload);

      const decoded = JSON.parse(jsonPayload);
      console.log('Parsed token data:', {
        id: decoded.id,
        exp: decoded.exp,
        iat: decoded.iat
      });
      
      // Kiểm tra token hết hạn
      const currentTime = Math.floor(Date.now() / 1000);
      console.log('Token expiration check:', {
        currentTime,
        expirationTime: decoded.exp,
        isExpired: decoded.exp < currentTime
      });

      if (decoded.exp < currentTime) {
        console.log('Token expired');
        return null;
      }
      
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Log user info when component mounts or user changes
  useEffect(() => {
    const decodedToken = token ? decodeToken(token) : null;
    console.log('Decoded token:', decodedToken);
    console.log('Current user info:', {
      userId: decodedToken?.id,
      userName: user?.name,
      hasToken: !!token,
      isAdmin: user?.isAdmin,
      role: user?.role,
      userKeys: user ? Object.keys(user) : []
    });
  }, [user, token]);

  useEffect(() => {
    // Log initial state
    console.log('Chat component mounted with state:', {
      isVisible,
      hasUser: !!user,
      hasToken: !!user?.token,
      userData: user ? {
        id: user.id,
        name: user.name,
        token: user.token ? user.token.substring(0, 20) + '...' : null
      } : null
    });

    if (!isVisible || !user || !user.token) {
      console.log('Socket not initialized:', {
        isVisible,
        hasUser: !!user,
        hasToken: !!user?.token
      });
      return;
    }

    const decodedToken = decodeToken(user.token);
    console.log('Decoded token result:', decodedToken);

    if (!decodedToken) {
      console.error('Invalid or expired token');
      Alert.alert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    // Lấy userId từ token
    const userId = decodedToken.id;
    console.log('User ID from token:', userId);

    if (!userId) {
      console.error('No user ID in token:', decodedToken);
      Alert.alert('Lỗi', 'Không thể xác thực người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    console.log('Initializing socket with token and user:', {
      userId,
      userName: user.name,
      hasToken: !!user.token,
      tokenExpiration: new Date(decodedToken.exp * 1000).toISOString()
    });

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: user.token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      
      // Gửi sự kiện join với userId
      console.log('Joining user chat room with userId:', userId);
      socket.emit('join_user_chat', { userId: userId.toString() });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      if (error.message.includes('jwt') || error.message.includes('token')) {
        Alert.alert(
          'Lỗi xác thực',
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        );
      } else {
        Alert.alert(
          'Lỗi kết nối',
          'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
        );
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.');
    });

    socket.on('join_error', (error) => {
      console.error('Join room error:', error);
      Alert.alert('Lỗi', 'Không thể tham gia phòng chat. Vui lòng thử lại sau.');
    });

    socket.on('new_message', (message) => {
      console.log('Received new message:', message);
      setMessages(prev => {
        const messageExists = prev.some(msg => msg._id === message._id);
        if (messageExists) {
          return prev;
        }

        const isUserMessage = message.sender._id === userId || message.receiver._id === userId;
        
        if (!isUserMessage) {
          console.log('Message not related to user, skipping:', message);
          return prev;
        }

        console.log('Adding message to chat:', message);
        return [...prev, {
          ...message,
          displaySender: message.sender._id === userId ? 'user' : 'admin',
          displayReceiver: message.sender._id === userId ? 'admin' : 'user'
        }];
      });
      scrollToBottom();
    });

    socket.on('message_status', ({ messageId, status }) => {
      console.log('Message status updated:', { messageId, status });
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg._id === messageId 
            ? { ...msg, status } 
            : msg
        )
      );
    });

    socket.on('user_typing', ({ userId: typingUserId, isTyping }) => {
      console.log('User typing status:', { typingUserId, isTyping });
      if (typingUserId === 'admin') {
        setIsTyping(isTyping);
      }
    });

    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
      }
    };
  }, [isVisible, user]);

  useEffect(() => {
    if (isVisible) {
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

  const handleTyping = () => {
    if (!socketRef.current || !isConnected) return;

    const decodedToken = token ? decodeToken(token) : null;
    const userId = decodedToken?.id;

    if (!userId) {
      console.error('Cannot send typing status: No user ID available');
      return;
    }

    const typingData = {
      receiver: '684aa904b94a32c714cb7540', // ID của admin
      userId: userId
    };

    console.log('Sending typing status:', typingData);
    socketRef.current.emit('typing', typingData);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      console.log('Sending stop typing status:', typingData);
      socketRef.current.emit('stop_typing', typingData);
    }, 1000);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) {
      console.log('Cannot send message:', {
        hasMessage: !!newMessage.trim(),
        hasSocket: !!socketRef.current,
        isConnected
      });
      return;
    }

    const decodedToken = token ? decodeToken(token) : null;
    const userId = decodedToken?.id;

    if (!userId) {
      console.error('Cannot send message: No user ID available');
      Alert.alert('Lỗi', 'Vui lòng đăng nhập lại để tiếp tục');
      return;
    }

    const messageData = {
      content: newMessage.trim(),
      receiver: '684aa904b94a32c714cb7540',  // ID của admin
      sender: userId
    };

    console.log('Sending message:', messageData);

    // Tạo message tạm thời để hiển thị
    const tempMessage = {
      _id: Date.now().toString(),
      content: newMessage.trim(),
      sender: {
        _id: userId,
        name: user.name
      },
      receiver: {
        _id: '684aa904b94a32c714cb7540',
        name: 'Admin'
      },
      timestamp: new Date().toISOString(),
      status: 'sent',
      displaySender: 'user',
      displayReceiver: 'admin'
    };

    // Thêm tin nhắn vào danh sách trước khi gửi
    setMessages(prev => [...prev, tempMessage]);
    
    // Gửi tin nhắn qua socket
    socketRef.current.emit('send_message', messageData);

    setNewMessage('');
    scrollToBottom();
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.displaySender === 'user';
    
    const messageTime = new Date(item.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.botMessage
      ]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={40} color="#666" />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.botMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isUser ? styles.userMessageTime : styles.botMessageTime
            ]}>
              {messageTime}
            </Text>
            {isUser && (
              <Text style={styles.messageStatus}>
                {item.status === 'sent' ? '✓' : item.status === 'delivered' ? '✓✓' : '✓✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

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
            { opacity: opacityAnim }
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
                }
              ]}
            >
              <View style={styles.container}>
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                    <Text style={styles.title}>Chat với nhân viên</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>

                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.keyboardAvoidingView}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                  <View style={styles.messagesContainer}>
                    <FlatList
                      ref={flatListRef}
                      data={messages}
                      renderItem={renderMessage}
                      keyExtractor={(item) => item._id}
                      style={styles.scrollView}
                      contentContainerStyle={styles.messagesList}
                      onContentSizeChange={scrollToBottom}
                      onLayout={scrollToBottom}
                      showsVerticalScrollIndicator={true}
                      bounces={true}
                    />

                    {isTyping && (
                      <View style={styles.typingIndicator}>
                        <View style={styles.typingDots}>
                          <View style={[styles.typingDot, styles.typingDot1]} />
                          <View style={[styles.typingDot, styles.typingDot2]} />
                          <View style={[styles.typingDot, styles.typingDot3]} />
                        </View>
                        <Text style={styles.typingText}>Admin đang nhập tin nhắn...</Text>
                      </View>
                    )}

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={newMessage}
                        onChangeText={(text) => {
                          setNewMessage(text);
                          handleTyping();
                        }}
                        placeholder="Nhập tin nhắn..."
                        placeholderTextColor="#999"
                        multiline
                        maxLength={500}
                        onFocus={scrollToBottom}
                        editable={isConnected}
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendButton, 
                          (!newMessage.trim() || !isConnected) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!newMessage.trim() || !isConnected}
                      >
                        <Ionicons
                          name="send"
                          size={20}
                          color={newMessage.trim() && isConnected ? '#fff' : '#999'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
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
  messageContainer: {
    marginBottom: 8,
    maxWidth: '85%',
    paddingHorizontal: 0,
  },
  userMessage: {
    alignSelf: 'flex-end',
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
  messageBubble: {
    padding: 12,
    borderRadius: 15,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  botBubble: {
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
  },
  botMessageText: {
    color: '#333',
    fontSize: 13,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: '#fff',
    opacity: 0.8,
  },
  botMessageTime: {
    color: '#666',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageStatus: {
    fontSize: 11,
    color: '#fff',
    marginLeft: 4,
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
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserChat; 