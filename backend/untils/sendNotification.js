import fetch from 'node-fetch';

export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken || !expoPushToken.startsWith('ExpoPushToken')) {
    console.warn('Token không hợp lệ hoặc không phải Expo push token:', expoPushToken);
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });

    const result = await response.json();
    console.log('Push notification result:', result);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
