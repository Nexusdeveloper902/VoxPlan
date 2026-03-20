import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiClient, { setAuthToken } from '../api/client';
import { Calendar, CheckCircle } from 'lucide-react-native';

export default function TasksScreen({ navigation }: any) {
  const { getAccessToken } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setAuthToken(token);
        const { data } = await apiClient.get('/tasks');
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={[styles.card, item.status === 'completed' && styles.cardCompleted]} 
      onPress={() => navigation.navigate('TaskDetail', { task: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, item.status === 'completed' && styles.cardTitleCompleted]}>
          {item.title}
        </Text>
        {item.status === 'completed' && (
          <CheckCircle color="#10B981" size={20} />
        )}
      </View>
      {item.due_date && (
        <View style={styles.dateRow}>
          <Calendar color="#64748B" size={16} />
          <Text style={styles.cardDate}>
            Vence: {new Date(item.due_date).toLocaleDateString('es-ES')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mis Tareas</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aún no hay tareas. ¡Asegúrate de grabar una!</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    marginTop: 40, // For non-safe-area padding if required
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  cardTitleCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCompleted: {
    backgroundColor: '#F1F5F9',
    opacity: 0.8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
  }
});
