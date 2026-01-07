import React, { useState } from 'react';
import { 
  View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, StatusBar 
} from 'react-native';
import ImageViewing from "react-native-image-viewing"; // Thư viện xem ảnh xịn xò
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HistoryDetailScreen({ route, navigation }) {
  const { date, images } = route.params;

  // State quản lý việc xem ảnh full màn hình
  const [visible, setIsVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Chuẩn bị dữ liệu cho trình xem ảnh (Thư viện yêu cầu key là 'uri')
  const imagesForViewer = images.map(img => ({
    uri: img.url,
    // Bạn có thể thêm các thông tin phụ nếu muốn hiển thị caption
    time: img.displayTime 
  }));

  // Hàm xử lý khi bấm vào 1 ảnh nhỏ
  const onImagePress = (index) => {
    setCurrentImageIndex(index);
    setIsVisible(true);
  };

  // Render từng ảnh nhỏ trong lưới
  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.imageContainer} 
      onPress={() => onImagePress(index)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.url }} 
        style={styles.image} 
        resizeMode="cover"
      />
      <View style={styles.timeTag}>
        <Ionicons name="time-outline" size={12} color="white" style={{marginRight: 4}} />
        <Text style={styles.timeText}>{item.displayTime}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header nhỏ hiển thị ngày */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Album ngày {date}</Text>
        <Text style={styles.headerSub}>{images.length} tấm ảnh</Text>
      </View>

      {/* Lưới ảnh */}
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* TRÌNH XEM ẢNH FULL MÀN HÌNH (Zoom, Vuốt) */}
      <ImageViewing
        images={imagesForViewer}
        imageIndex={currentImageIndex}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
        swipeToCloseEnabled={true} // Vuốt xuống để đóng
        doubleTapToZoomEnabled={true} // Nhấn đúp để phóng to
        FooterComponent={({ imageIndex }) => (
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              {imagesForViewer[imageIndex]?.time} • Ảnh {imageIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  
  // Header Style
  headerContainer: {
    padding: 15, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
    alignItems: 'center', marginBottom: 5
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' },
  headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },

  // List Style
  listContent: { padding: 5 },
  imageContainer: { 
    width: (width / 2) - 10, // Chia đôi màn hình
    margin: 5, 
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden', // Bo góc ảnh
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
  },
  image: { width: '100%', height: 160 },
  
  // Tag thời gian đè lên ảnh
  timeTag: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 8
  },
  timeText: { color: 'white', fontSize: 12, fontWeight: '600' },

  // Footer khi xem Full màn hình
  footerContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
    marginBottom: 40
  },
  footerText: {
    fontSize: 16, color: "#FFF", fontWeight: "600",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  }
});