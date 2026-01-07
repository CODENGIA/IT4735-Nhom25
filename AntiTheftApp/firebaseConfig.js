import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// 1. Import thêm getStorage
import { getStorage } from "firebase/storage";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyB3rRXDoiSRQITjVAre7nrGKnqntQOR5DA",
  authDomain: "iot-theft-detection.firebaseapp.com",
  databaseURL: "https://iot-theft-detection-default-rtdb.firebaseio.com",
  projectId: "iot-theft-detection",
  // 2. Kiểm tra kỹ dòng này (đây là cái xô đựng ảnh của bạn)
  storageBucket: "iot-theft-detection.firebasestorage.app", 
  messagingSenderId: "231904295328",
  appId: "1:231904295328:web:e07d351e5e8189df344cc5"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

// 3. QUAN TRỌNG: Phải export cái này thì HistoryScreen mới dùng được
export const storage = getStorage(app); 

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});