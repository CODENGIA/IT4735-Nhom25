import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import HistoryScreen from './screens/HistoryScreen';
// 1. IMPORT FILE MỚI VỪA TẠO
import HistoryDetailScreen from './screens/HistoryDetailScreen'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Trang Chủ' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch Sử' }} />
        
        {/* 2. THÊM DÒNG NÀY ĐỂ APP BIẾT ĐƯỜNG MÀ CHẠY */}
        <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: 'Chi Tiết Ảnh' }} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}