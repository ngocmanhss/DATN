// styles/login.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";
import { SIZES } from '../../constants/sizes';

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: "center",
  },
  scrollViewStyle: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topIllustration: {
    alignItems: "center",
    width: "100%",
  },
  illustrationImage: {
    width: width * 0.75,
    height: width * 0.75,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginTop: -24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    marginRight: 5,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: SIZES.medium,
    borderRadius: SIZES.radius,
    marginTop: SIZES.medium,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: SIZES.small,
  },
  googleButtonText: {
    color: '#333',
    fontSize: SIZES.body3,
    fontWeight: '500',
  },
   successAnimation: {
    width: 300,
    height: 300,
    alignSelf: 'center',
    marginTop: 50,
  },
   successText: {
    fontSize: 20,               // Kích thước chữ
    fontWeight: 'bold',         // Đậm
    color: COLORS.success,     // Màu chữ, có thể thay đổi thành một màu bạn muốn
    textAlign: 'center',       // Căn giữa văn bản
    marginTop: 20,             // Khoảng cách từ trên xuống
    paddingHorizontal: 20,     // Padding từ trái và phải
    lineHeight: 30,            // Chiều cao dòng để có khoảng cách giữa các dòng (nếu có)
    backgroundColor: COLORS.white,  // Màu nền của thông báo
    borderRadius: 10,          // Bo góc cho nền
    paddingVertical: 10,       // Padding từ trên và dưới
    elevation: 5,              // Đổ bóng nhẹ cho thông báo (Android)
    shadowColor: '#000',       // Màu bóng (iOS)
    shadowOffset: { width: 0, height: 2 }, // Vị trí bóng (iOS)
    shadowOpacity: 0.1,        // Độ mờ của bóng (iOS)
    shadowRadius: 5,           // Độ lan tỏa của bóng (iOS)
  },
});

export default styles;