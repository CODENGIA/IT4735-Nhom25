import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator 
} from 'react-native';

import { auth, database } from '../firebaseConfig'; 
// Import push để tạo Key ngẫu nhiên (SessionId)
import { ref, set, push } from 'firebase/database';
// Import AsyncStorage để lưu SessionId vào máy
import AsyncStorage from '@react-native-async-storage/async-storage';

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const createSession = async (userEmail) => {
    try {
      const sessionRef = push(ref(database, 'users'));
      const sessionId = sessionRef.key; 

      await set(sessionRef, {
        email: userEmail,
        createdAt: new Date().toISOString(), 
        system_status: { armed: false } 
      });

      await AsyncStorage.setItem('currentSessionId', sessionId);

      console.log("Đã tạo Session:", sessionId);
      return true;
    } catch (error) {
      console.log("Lỗi tạo session:", error);
      return false;
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      const success = await createSession(email);
      
      if (success) {
        navigation.replace('Dashboard');
      } else {
        Alert.alert("Lỗi", "Không thể tạo phiên làm việc");
      }

    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isRegistering ? "ĐĂNG KÝ" : "ĐĂNG NHẬP"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>
            {isRegistering ? "ĐĂNG KÝ & ĐĂNG NHẬP" : "ĐĂNG NHẬP"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => setIsRegistering(!isRegistering)}
      >
        <Text style={styles.switchText}>
          {isRegistering ? "Quay lại Đăng Nhập" : "Chưa có tài khoản? Đăng ký"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333' },
  input: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15, paddingHorizontal: 10 },
  button: { backgroundColor: '#28a745', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#007bff' }
});