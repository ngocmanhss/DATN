import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RatingStars = ({ rating, size = 20, color = '#FFD700' }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  // Thêm sao đầy
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Ionicons
        key={`star-${i}`}
        name="star"
        size={size}
        color={color}
        style={styles.star}
      />
    );
  }

  // Thêm sao nửa nếu có
  if (hasHalfStar) {
    stars.push(
      <Ionicons
        key="half-star"
        name="star-half"
        size={size}
        color={color}
        style={styles.star}
      />
    );
  }

  // Thêm sao rỗng
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Ionicons
        key={`empty-star-${i}`}
        name="star-outline"
        size={size}
        color={color}
        style={styles.star}
      />
    );
  }

  return <View style={styles.container}>{stars}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});

export default RatingStars; 