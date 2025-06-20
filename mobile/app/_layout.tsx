// RootLayout.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  useEffect(() => {
    // Cấu hình deep linking
    const linking = {
      prefixes: ['exp://172.20.10.2:8081', 'com.mycompany.mobile://'],
      config: {
        screens: {
          '(user)/order': 'order',
        },
      },
    };

    // Xử lý deep link khi app đang chạy
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('📱 [Deep Link Received]:', event.url);
      
      // Parse URL để lấy thông tin
      const { queryParams } = Linking.parse(event.url);
      console.log('📱 [Deep Link Params]:', queryParams);
      
      // Nếu có URL từ development client hoặc URL trực tiếp
      if (queryParams?.url) {
        const urlToDecode = Array.isArray(queryParams.url) ? queryParams.url[0] : queryParams.url;
        const decodedUrl = decodeURIComponent(urlToDecode);
        console.log('📱 [Decoded URL]:', decodedUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="auth"
          options={{
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen name="(user)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
