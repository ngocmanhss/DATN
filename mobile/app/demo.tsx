import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  FlatListProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

const { width, height } = Dimensions.get('window');

type IconName = 'cart-outline' | 'search-outline' | 'shield-checkmark-outline' | 'list-outline';

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  bgColor: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Chào mừng đến với Couple TX',
    description: 'Khám phá trải nghiệm mua sắm trực tuyến mới với Couple TX - Nơi mua sắm thông minh và tiện lợi',
    icon: 'cart-outline',
    bgColor: '#E3F2FD',
  },
  {
    id: '2',
    title: 'Dễ dàng mua sắm',
    description: 'Tìm kiếm và mua sắm các sản phẩm yêu thích một cách nhanh chóng với giao diện thân thiện',
    icon: 'search-outline',
    bgColor: '#F3E5F5',
  },
  {
    id: '3',
    title: 'Thanh toán an toàn',
    description: 'Nhiều phương thức thanh toán linh hoạt và an toàn: COD, QR Code, và nhiều lựa chọn khác',
    icon: 'shield-checkmark-outline',
    bgColor: '#E8F5E9',
  },
  {
    id: '4',
    title: 'Theo dõi đơn hàng',
    description: 'Dễ dàng theo dõi trạng thái đơn hàng của bạn từ lúc đặt hàng đến khi nhận được sản phẩm',
    icon: 'list-outline',
    bgColor: '#FFF3E0',
  },
];

export default function Demo() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const router = useRouter();
  const flatListRef = useRef<FlatList<Slide>>(null);

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={120} color={COLORS.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentSlideIndex + 1,
        animated: true,
      });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const Footer = () => {
    return (
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleNext}
          >
            <Text style={styles.startButtonText}>
              {currentSlideIndex === slides.length - 1 ? 'Bắt đầu' : 'Tiếp tục'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentSlideIndex(index);
        }}
      />
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  slide: {
    width,
    height: height * 0.75,
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    height: height * 0.25,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  indicator: {
    height: 8,
    width: 8,
    backgroundColor: COLORS.grey,
    marginHorizontal: 5,
    borderRadius: 4,
  },
  activeIndicator: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    width: 150,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
