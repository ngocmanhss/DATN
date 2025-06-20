import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import axios from 'axios';

const registerForPushNotificationsAsync = async (userToken) => {
  try {
    if (!Device.isDevice) {
      console.warn('Thông báo chỉ hoạt động trên thiết bị thật');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Không được cấp quyền gửi thông báo');
      return;
    }

    const pushToken = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra?.eas?.projectId, // chỉ cần nếu dùng EAS Build
    })).data;

    console.log('🔔 FCM Token:', pushToken);

    await axios.post('http://172.20.10.2:4000/api/user/save-fcm-token', {
      token: pushToken,
    }, {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });

    console.log('✅ FCM token đã gửi về server');
  } catch (error) {
    console.error('❌ Lỗi đăng ký FCM token:', error);
  }
};

export default registerForPushNotificationsAsync;
