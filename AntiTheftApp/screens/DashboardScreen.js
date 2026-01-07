import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, 
  SafeAreaView, StatusBar, Dimensions, TextInput, Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import { auth, database } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Không cần lấy width để chia đôi nữa
// const { width } = Dimensions.get('window'); 

export default function DashboardScreen({ navigation }) {
  const [sessionId, setSessionId] = useState(null);
  const [startHour, setStartHour] = useState('0');
  const [endHour, setEndHour] = useState('0');
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const lastAlertTime = useRef(Date.now());

  // --- 1. LẮNG NGHE CONFIG GIỜ (GIỮ NGUYÊN) ---
  useEffect(() => {
    const configRef = ref(database, 'devices/ESP32_CAM/config');
    const unsubscribe = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStartHour(String(data.start_hour));
        setEndHour(String(data.end_hour));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. LOGIC CẢNH BÁO (GIỮ NGUYÊN) ---
  useEffect(() => {
    if (user && user.email) {
      const emailKey = user.email.replace(/\./g, ',');
      const detectRef = ref(database, `detected/${emailKey}`);
      const unsubscribe = onValue(detectRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.timestamp) {
            const eventTime = Number(data.timestamp);
            if (eventTime > lastAlertTime.current) {
                lastAlertTime.current = eventTime;
                Alert.alert(
                    "⚠️ CẢNH BÁO!",
                    `Phát hiện chuyển động!\nThời gian: ${new Date(eventTime).toLocaleTimeString()}`,
                    [
                        { text: "Xem Lịch Sử", onPress: () => navigation.navigate('History') },
                        { text: "Đóng", style: "cancel" }
                    ]
                );
            }
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // --- 3. LOGIC SESSION (GIỮ NGUYÊN) ---
  useEffect(() => {
    const getSession = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem('currentSessionId');
        if (storedSessionId) setSessionId(storedSessionId);
      } catch (e) { console.log(e); }
    };
    getSession();
  }, []);

  // --- HÀM TẮT BÁO ĐỘNG (GIỮ NGUYÊN) ---
  const handleStopAlarm = () => {
    Alert.alert(
      "Xác nhận", 
      "Bạn muốn tắt còi báo động? (Camera vẫn hoạt động)",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "TẮT CÒI", 
          onPress: () => {
            update(ref(database, 'system_status/'), {
                alarm_active: false 
            })
            .then(() => Alert.alert("Thành công", "Đã gửi lệnh tắt còi báo động!"))
            .catch((error) => Alert.alert("Lỗi", error.message));
          }
        }
      ]
    );
  };

  // --- HÀM CẬP NHẬT GIỜ (GIỮ NGUYÊN) ---
  const handleUpdateConfig = () => {
    const start = parseInt(startHour);
    const end = parseInt(endHour);
    if (isNaN(start) || isNaN(end) || start < 0 || start > 23 || end < 0 || end > 23) {
      Alert.alert("Lỗi", "Giờ phải là số từ 0 đến 23.");
      return;
    }
    Keyboard.dismiss();
    update(ref(database, 'devices/ESP32_CAM/config'), {
      start_hour: start,
      end_hour: end
    })
    .then(() => Alert.alert("Thành công", "Đã cập nhật thời gian hoạt động!"))
    .catch((err) => Alert.alert("Lỗi", err.message));
  };

  const handleLogout = async () => {
    try {
        if(sessionId) await AsyncStorage.removeItem('currentSessionId');
        await auth.signOut();
        navigation.replace('Login');
    } catch (error) { Alert.alert("Lỗi", error.message); }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Thiết bị: ESP32_CAM</Text>
            <Text style={styles.username}>{user?.email?.split('@')[0]}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtnSmall} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* 1. NÚT TẮT BÁO ĐỘNG */}
        <View style={styles.statusContainer}>
          <TouchableOpacity 
            style={[styles.bigButton, styles.alarmShadow]}
            onPress={handleStopAlarm}
            activeOpacity={0.7}
          >
            <View style={[styles.innerCircle, { backgroundColor: '#FF9500' }]}>
              <MaterialCommunityIcons name="volume-off" size={64} color="white" />
              <Text style={styles.statusText}>TẮT BÁO ĐỘNG</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.hintText}>
            Chạm để tắt còi hú (Thiết bị vẫn ghi hình)
          </Text>
        </View>

        {/* 2. CẤU HÌNH THỜI GIAN (ĐÃ SỬA GIAO DIỆN) */}
        <View style={styles.configCard}>
          {/* Đã xóa icon đồng hồ và sửa text */}
          <Text style={styles.cardTitle}>Thời gian hoạt động</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bắt đầu (Giờ)</Text>
              <TextInput 
                style={styles.input} 
                value={startHour}
                onChangeText={setStartHour}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.arrowBox}>
              <Ionicons name="arrow-forward" size={20} color="#AEAEB2" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kết thúc (Giờ)</Text>
              <TextInput 
                style={styles.input} 
                value={endHour}
                onChangeText={setEndHour}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleUpdateConfig}>
            {/* Đổi text thành Lưu */}
            <Text style={styles.saveBtnText}>Lưu</Text>
          </TouchableOpacity>
        </View>

        {/* 3. MENU CHỨC NĂNG (ĐÃ XÓA NÚT XEM LIVE) */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionCardFull} onPress={() => navigation.navigate('History')}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF4E5' }]}>
              <Ionicons name="images" size={28} color="#FF9500" />
            </View>
            <Text style={styles.actionText}>Thư viện ảnh đã lưu</Text>
            <Ionicons name="chevron-forward" size={24} color="#C7C7CC" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 },
  greeting: { fontSize: 13, color: '#8E8E93' },
  username: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' },
  logoutBtnSmall: { padding: 10, backgroundColor: 'white', borderRadius: 12, elevation: 2 },

  // Big Button
  statusContainer: { alignItems: 'center', marginBottom: 20 },
  bigButton: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'white', justifyContent: 'center', alignItems: 'center',
    marginBottom: 15,
  },
  innerCircle: {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'white'
  },
  alarmShadow: { 
    shadowColor: "#FF9500", shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 
  },
  statusText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 5, textAlign: 'center' },
  hintText: { fontSize: 12, color: '#8E8E93', fontStyle: 'italic' },

  // Config Card
  configCard: { 
    backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15, color: '#1C1C1E' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, color: '#8E8E93', marginBottom: 5 },
  input: { 
    height: 50, backgroundColor: '#F2F2F7', borderRadius: 12, 
    fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#1C1C1E' 
  },
  arrowBox: { paddingHorizontal: 10 },
  saveButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Action Menu (Style mới cho nút đơn)
  actionContainer: { marginTop: 10 },
  actionCardFull: {
    width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionText: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
});