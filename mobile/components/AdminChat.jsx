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
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import COLORS from '../constants/colors';

const SOCKET_URL = 'http://172.20.10.2:4000';

const AdminChat = ({ isVisible, onClose }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [activeUsers, setActiveUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [modalSize, setModalSize] = useState({ width: '80%', height: '70%' });
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  const initialPosition = { x: 20, y: 20 };
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMessages, setUserMessages] = useState({});
  const [userNamesMap, setUserNamesMap] = useState(new Map());

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
        const newX = position.x + gesture.dx;
        const newY = position.y + gesture.dy;

        // Giới hạn vị trí trong màn hình
        const maxX = screenWidth - 300; // 300 là chiều rộng tối thiểu của modal
        const maxY = screenHeight - 400; // 400 là chiều cao tối thiểu của modal

        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: boundedX, y: boundedY });
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleMouseDown = (e) => {
    if (e.target.className.includes('drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - initialPosition.x,
        y: e.clientY - initialPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Giới hạn vị trí trong viewport
      const maxX = window.innerWidth - 400; // 400px là chiều rộng modal
      const maxY = window.innerHeight - 500; // 500px là chiều cao modal
      
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      if (modalRef.current) {
        modalRef.current.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!user || !user.token || !user.isAdmin) {
      console.log('Admin chat not initialized:', {
        hasUser: !!user,
        hasToken: !!user?.token,
        isAdmin: user?.isAdmin
      });
      return;
    }

    console.log('Initializing admin socket connection:', {
      userId: 'admin',
      isAdmin: user.isAdmin,
      hasToken: !!user.token
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
      console.log('Admin socket connected successfully');
      setIsConnected(true);
      
      // Tự động join admin chat room khi kết nối thành công
      socket.emit('join_admin_chat');
      console.log('Admin joined chat room');
      
      // Lấy danh sách người dùng đang hoạt động (vẫn cần để biết ai đang online, dù không hiển thị)
      socket.emit('get_active_users');
    });

    socket.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error);
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
      console.log('Admin socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Tự động kết nối lại nếu server ngắt kết nối
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Admin socket reconnected after', attemptNumber, 'attempts');
      // Tự động join lại room khi kết nối lại
      socket.emit('join_admin_chat');
      socket.emit('get_active_users');
    });

    socket.on('new_message', (message) => {
      console.log('Admin received new message:', message);
      
      // Update userNamesMap with sender and receiver names
      const senderId = message.sender._id;
      const senderName = message.sender.name;
      const receiverId = message.receiver._id;
      const receiverName = message.receiver.name;

      setUserNamesMap(prevMap => {
        const newMap = new Map(prevMap);
        if (senderId && senderName && !newMap.has(senderId)) {
          newMap.set(senderId, senderName);
        }
        if (receiverId && receiverName && !newMap.has(receiverId)) {
          newMap.set(receiverId, receiverName);
        }
        return newMap;
      });

      const adminId = '684aa904b94a32c714cb7540'; // Admin's MongoDB ID
      const isIncomingToAdmin = message.receiver && (message.receiver._id === adminId || message.receiver._id === 'admin');
      const isOutgoingFromAdmin = message.sender && (message.sender._id === adminId || message.sender._id === 'admin');

      let targetUserId = null;
      if (isIncomingToAdmin) {
        targetUserId = message.sender._id; // Message from user to admin
        setSelectedUser(targetUserId); // Force selection to the sender of the incoming message
      } else if (isOutgoingFromAdmin) {
        targetUserId = message.receiver._id; // Admin's own sent message echoed back
        // If admin is sending a message and no user is selected, select the receiver
        if (!selectedUser) {
          setSelectedUser(targetUserId);
        }
      }

      if (!targetUserId) {
        console.log('Message not relevant to admin chat, skipping:', message);
        return;
      }

      setUserMessages(prevUserMessages => {
        const currentMessages = prevUserMessages[targetUserId] || [];
        let updatedMessages = [...currentMessages];

        let messageHandled = false; // Flag to indicate if this message has been handled (added or updated)

        // 1. Try to update an existing temporary client-sent message using clientTempId (if provided by server)
        if (message.clientTempId) {
          const tempMessageIndex = updatedMessages.findIndex(msg => msg._id === message.clientTempId);
          if (tempMessageIndex !== -1) {
            // Replace the temporary message with the server-confirmed message
            updatedMessages[tempMessageIndex] = {
              ...message, // Use all fields from server message
              _id: message._id, // Ensure server's _id is used
              status: 'delivered', // Assume server echo means delivered
              displaySender: isOutgoingFromAdmin ? 'admin' : 'user',
              displayReceiver: isOutgoingFromAdmin ? 'user' : 'admin'
            };
            console.log('Updated temporary message with server ID (via clientTempId):', updatedMessages[tempMessageIndex]);
            messageHandled = true;
          }
        }

        // 2. If not handled by clientTempId, check by server-assigned _id to avoid duplicates or update status
        if (!messageHandled) {
          const existingMessageIndex = updatedMessages.findIndex(msg => msg._id === message._id);
          if (existingMessageIndex !== -1) {
            // Update existing message (e.g., status from 'sending' to 'delivered')
            updatedMessages[existingMessageIndex] = {
              ...updatedMessages[existingMessageIndex], // Keep existing properties
              ...message, // Override with new properties from server (content, timestamp, etc.)
              status: message.status || (isOutgoingFromAdmin ? 'delivered' : 'received')
            };
            console.log('Updated existing message by server ID:', updatedMessages[existingMessageIndex]);
            messageHandled = true;
          } else {
            // This is a truly new message (or an admin message echo without clientTempId match)
            updatedMessages.push({
              ...message,
              displaySender: isOutgoingFromAdmin ? 'admin' : 'user',
              displayReceiver: isOutgoingFromAdmin ? 'user' : 'admin',
              status: message.status || (isOutgoingFromAdmin ? 'delivered' : 'received') // Default status
            });
            console.log('Added new message to history:', updatedMessages[updatedMessages.length - 1]);
            messageHandled = true;
          }
        }
        
        // If we are currently viewing this user's chat, update the main messages state
        // Or, if no user is selected, automatically select this target user
        if (!selectedUser || selectedUser === targetUserId) {
          setSelectedUser(targetUserId); // Auto-select this user if not already selected
          setMessages(updatedMessages);
          // No need to call scrollToBottom here directly, useEffect will handle it after setMessages
        }

        return { ...prevUserMessages, [targetUserId]: updatedMessages };
      });
    });

    socket.on('user_typing', ({ userId, isTyping }) => {
      console.log('User typing status:', { userId, isTyping });
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
          // Force selection to the typing user if no user is selected or if a different user is selected
          if (!selectedUser || selectedUser !== userId) {
            setSelectedUser(userId);
          }
          setIsTyping(true);
          Animated.sequence([
            Animated.timing(typingAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(1000),
            Animated.timing(typingAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        } else {
          newSet.delete(userId);
          if (newSet.size === 0) {
            setIsTyping(false);
          }
        }
        console.log('Updated typingUsers:', newSet);
        console.log('Current selectedUser:', selectedUser);
        return newSet;
      });
    });

    socket.on('active_users', (users) => {
      console.log('Received active users:', users);
      if (Array.isArray(users)) {
        // Lọc bỏ admin khỏi danh sách người dùng đang hoạt động
        const filteredUsers = users.filter(userId => 
          userId !== 'admin' && userId !== '684aa904b94a32c714cb7540'
        );
        console.log('Filtered active users:', filteredUsers);
        setActiveUsers(filteredUsers);
      }
    });

    socket.on('user_joined', (userId) => {
      console.log('User joined:', userId);
      // Chỉ thêm người dùng không phải admin
      if (userId !== 'admin' && userId !== '684aa904b94a32c714cb7540') {
        setActiveUsers(prev => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });
      }
    });

    socket.on('user_left', (userId) => {
      console.log('User left:', userId);
      setActiveUsers(prev => prev.filter(id => id !== userId));
    });

    // Cập nhật danh sách người dùng đang hoạt động mỗi 30 giây
    const activeUsersInterval = setInterval(() => {
      if (socket && isConnected) {
        socket.emit('get_active_users');
      }
    }, 30000);

    return () => {
      if (socket) {
        console.log('Cleaning up admin socket connection');
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('active_users');
        socket.off('user_joined');
        socket.off('user_left');
        clearInterval(activeUsersInterval);
        socket.disconnect();
      }
    };
  }, [user]); // Chỉ phụ thuộc vào user

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      
      // Cuộn xuống tin nhắn mới nhất khi mở modal
      scrollToBottom();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isVisible, isDragging]);

  useEffect(() => {
    // This useEffect handles updating `messages` when `selectedUser` or `userMessages` changes.
    // It also ensures `scrollToBottom` is called after messages are updated and rendered.
    console.log('selectedUser changed:', selectedUser);
    if (selectedUser) {
      setMessages(userMessages[selectedUser] || []);
      setTimeout(scrollToBottom, 50); // Small delay to ensure render before scroll
    } else {
      setMessages([]); // Clear messages if no user selected
    }
  }, [selectedUser, userMessages]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleTyping = (userId) => {
    if (!socketRef.current || !isConnected) return;

    const typingData = {
      receiver: userId,
      sender: 'admin'
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

    if (!selectedUser) {
      console.log('No user selected to send message to.');
      Alert.alert('Thông báo', 'Vui lòng đợi người dùng gửi tin nhắn hoặc chọn người dùng để bắt đầu cuộc trò chuyện.');
      return;
    }

    const adminId = '684aa904b94a32c714cb7540'; // Admin's MongoDB ID
    const messageContent = newMessage.trim();
    const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; // Unique temporary ID

    const tempMessage = {
      _id: tempMessageId, // Client-generated unique temporary ID
      content: messageContent,
      sender: {
        _id: adminId,
        name: 'Admin'
      },
      receiver: {
        _id: selectedUser,
        name: userNamesMap.get(selectedUser) || `User ${selectedUser.slice(-4)}`
      },
      timestamp: new Date().toISOString(),
      status: 'sending', // Optimistically set as sending
      displaySender: 'admin',
      displayReceiver: 'user'
    };

    // Immediately add the message to userMessages history for the selected user
    setUserMessages(prevUserMessages => {
      const updatedMessagesForUser = [...(prevUserMessages[selectedUser] || []), tempMessage];
      return {
        ...prevUserMessages,
        [selectedUser]: updatedMessagesForUser
      };
    });

    // Emit to server
    const messageData = {
      content: messageContent,
      receiver: selectedUser,
      sender: adminId,
      clientTempId: tempMessageId // Send client-generated ID to server
    };
    console.log('Sending message to user:', messageData);
    socketRef.current.emit('send_message', messageData);

    setNewMessage('');
    // scrollToBottom will be handled by the useEffect after messages update
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = ({ item }) => {
    const isAdmin = item.displaySender === 'admin';
    
    // Handle potentially invalid timestamp
    const messageTime = item.timestamp 
      ? (new Date(item.timestamp).toString() !== 'Invalid Date' 
          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Invalid Date')
      : 'Invalid Date';

    return (
      <View style={[
        styles.messageContainer,
        isAdmin ? styles.userMessage : styles.otherMessage
      ]}>
        {!isAdmin && (
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={40} color="#666" />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isAdmin ? styles.userBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isAdmin ? styles.userMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isAdmin ? styles.userMessageTime : styles.otherMessageTime
            ]}>
              {messageTime}
            </Text>
            {isAdmin && (
              <Text style={styles.messageStatus}>
                {item.status === 'sending' ? '↻' : item.status === 'sent' ? '✓' : item.status === 'delivered' ? '✓✓' : '✓✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // handleUserSelect is no longer called from UI, but kept as a helper
  const handleUserSelect = (userId) => {
    setSelectedUser(userId);
    setMessages(userMessages[userId] || []);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View 
              ref={modalRef}
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [600, 0]
                      })
                    }
                  ]
                }
              ]}
              onMouseDown={handleMouseDown}
            >
              <View style={styles.dragHandle} className="drag-handle" />
              <View style={styles.container}>
                <View style={styles.header}>
                  <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                  <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>
                      {selectedUser ? `Chat với ${userNamesMap.get(selectedUser) || selectedUser.slice(-4)}` : 'Chat với người dùng'}
                    </Text>
                    <View style={styles.headerSubInfo}>
                      <View style={[styles.statusDot, isConnected ? styles.statusDotActive : styles.statusDotInactive]} />
                      <Text style={styles.connectionStatus}>
                        {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.chatContainer}>
                  {/* Removed users list panel entirely */}
                  <View style={styles.messagesContainer}>
                    <FlatList
                      ref={flatListRef}
                      data={messages}
                      renderItem={renderMessage}
                      keyExtractor={(item) => item._id}
                      contentContainerStyle={styles.messagesList}
                      onContentSizeChange={scrollToBottom}
                      onLayout={scrollToBottom}
                      showsVerticalScrollIndicator={false}
                    />

                    {isTyping && typingUsers.has(selectedUser) && (
                      <Animated.View 
                        style={[
                          styles.typingIndicator,
                          {
                            opacity: typingAnim,
                            transform: [{
                              translateY: typingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                              })
                            }]
                          }
                        ]}
                      >
                        <View style={styles.typingDots}>
                          <View style={[styles.typingDot, styles.typingDot1]} />
                          <View style={[styles.typingDot, styles.typingDot2]} />
                          <View style={[styles.typingDot, styles.typingDot3]} />
                        </View>
                        <Text style={styles.typingText}>
                          Người dùng đang nhập tin nhắn...
                        </Text>
                      </Animated.View>
                    )}

                    <KeyboardAvoidingView
                      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                      style={styles.inputContainer}
                    >
                      <TextInput
                        style={styles.input}
                        value={newMessage}
                        onChangeText={(text) => {
                          setNewMessage(text);
                          if (selectedUser) {
                            handleTyping(selectedUser);
                          }
                        }}
                        placeholder="Nhập tin nhắn..."
                        placeholderTextColor="#999"
                        multiline
                        onFocus={scrollToBottom}
                        editable={isConnected && selectedUser}
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendButton, 
                          (!newMessage.trim() || !isConnected || !selectedUser) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!newMessage.trim() || !isConnected || !selectedUser}
                      >
                        <Ionicons
                          name="send"
                          size={24}
                          color={newMessage.trim() && isConnected && selectedUser ? '#fff' : '#999'}
                        />
                      </TouchableOpacity>
                    </KeyboardAvoidingView>
                  </View>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  modalContent: {
    width: 400,
    height: 500,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    position: 'absolute',
    right: 20,
    bottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        cursor: 'move',
      },
    }),
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
    cursor: 'move',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  backButton: {
    marginRight: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  headerSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusDotInactive: {
    backgroundColor: '#FFA000',
  },
  connectionStatus: {
    fontSize: 12,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
    // Removed flexDirection: 'row' to make it single column
    backgroundColor: '#f8f9fa',
  },
  // Removed usersList and related styles:
  // usersList: { ... },
  // usersListTitle: { ... },
  // userItem: { ... },
  // selectedUserItem: { ... },
  // userAvatar: { ... },
  // userInfo: { ... },
  // userName: { ... },
  // userStatus: { ... },
  // emptyUsersList: { ... },
  // emptyUsersText: { ... },
  messagesContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    padding: 8,
    borderRadius: 16,
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
  otherBubble: {
    backgroundColor: '#fff',
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
    fontSize: 14,
    lineHeight: 18,
  },
  userMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#fff',
    opacity: 0.8,
  },
  otherMessageTime: {
    color: '#666',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageStatus: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 80,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AdminChat; 