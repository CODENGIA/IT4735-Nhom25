import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { storage } from '../firebaseConfig'; 
import { ref, listAll, getDownloadURL } from 'firebase/storage';

export default function HistoryScreen({ navigation }) {
  const [groupedImages, setGroupedImages] = useState({});
  const [loading, setLoading] = useState(true);

  const parseFilename = (filename) => {
    try {
      const nameOnly = filename.split('.')[0]; 
      const parts = nameOnly.split('_');
      if (parts.length < 3) return null;

      const datePart = parts[1]; 
      const timePart = parts[2]; 

      const [year, month, day] = datePart.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      const formattedTime = timePart.replace(/-/g, ':');
      const sortTime = `${datePart} ${formattedTime}`;

      return {
        displayDate: formattedDate,
        displayTime: formattedTime,
        sortTime: sortTime
      };
    } catch (e) {
      console.log("Lỗi parse tên file:", filename);
      return null;
    }
  };

  const fetchImagesFromStorage = async () => {
    setLoading(true);
    try {
      const listRef = ref(storage, 'camera_captures/');
      const res = await listAll(listRef);
      
      if (res.items.length === 0) {
        setGroupedImages({});
        setLoading(false);
        return;
      }

      const promises = res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const info = parseFilename(itemRef.name);
        if (info) {
          return { id: itemRef.name, url: url, ...info };
        }
        return null;
      });

      const files = await Promise.all(promises);
      const groups = {};
      files.forEach(file => {
        if (!file) return;
        const dateKey = file.displayDate;
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(file);
      });

      Object.keys(groups).forEach(date => {
        groups[date].sort((a, b) => a.sortTime.localeCompare(b.sortTime));
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
         const toIso = (str) => str.split('/').reverse().join('');
         return toIso(b) - toIso(a); 
      });

      const finalGrouped = {};
      sortedKeys.forEach(key => {
        finalGrouped[key] = groups[key];
      });

      setGroupedImages(finalGrouped);

    } catch (error) {
      console.log(error);
      Alert.alert("Lỗi", "Không thể tải ảnh từ Storage: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImagesFromStorage();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{marginTop: 10, color: '#8E8E93'}}>Đang quét Storage...</Text>
        </View>
      ) : (
        <FlatList
          data={Object.keys(groupedImages)}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.dateCard}
              onPress={() => {
                navigation.navigate('HistoryDetail', { 
                  date: item, 
                  images: groupedImages[item] 
                });
              }}
            >
              
              <Text style={styles.dateText}>{item}</Text>
              
              <View style={styles.badge}>
               
                <Text style={styles.countText}>{groupedImages[item].length} ảnh</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
               <Text style={styles.empty}>Thư mục camera_captures trống.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#F2F2F7' },
  dateCard: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', padding: 20, marginBottom: 15, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  dateText: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  badge: { backgroundColor: '#E5F1FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  countText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  center: { flex:1, justifyContent:'center', alignItems: 'center' },
  empty: { fontSize: 16, color: '#8E8E93', marginTop: 50 }
});