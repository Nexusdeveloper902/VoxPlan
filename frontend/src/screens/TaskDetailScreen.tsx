import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient, { setAuthToken } from '../api/client';
import { Wand2, CheckCircle, Circle, Trash2 } from 'lucide-react-native';

export default function TaskDetailScreen({ route, navigation }: any) {
  const { task } = route.params;
  const { getAccessToken } = useAuth();
  
  const [steps, setSteps] = useState<any[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [planifying, setPlanifying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSteps();
  }, [task.id]);

  const fetchSteps = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setAuthToken(token);
        const { data } = await apiClient.get(`/tasks/${task.id}/steps`);
        setSteps(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSteps(false);
    }
  };

  const handlePlanify = async () => {
    setPlanifying(true);
    try {
      const token = await getAccessToken();
      if (token) {
        setAuthToken(token);
        const { data } = await apiClient.post(`/tasks/${task.id}/planify`);
        if (data.steps) {
          setSteps(data.steps);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo planificar la tarea');
    } finally {
      setPlanifying(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '¿Eliminar tarea?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await getAccessToken();
              if (token) {
                setAuthToken(token);
                await apiClient.delete(`/tasks/${task.id}`);
                navigation.goBack();
              }
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'No se pudo eliminar la tarea');
            } finally {
              setDeleting(false);
            }
          }
        },
      ]
    );
  };

  const toggleStep = async (stepId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    
    // Optimistic update
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: newStatus } : s));

    try {
      const token = await getAccessToken();
      if (token) {
        setAuthToken(token);
        await apiClient.patch(`/tasks/steps/${stepId}`, { status: newStatus });
      }
    } catch (error) {
      console.error(error);
      // Revert if failed
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: currentStatus } : s));
      Alert.alert('Error', 'No se pudo actualizar el estado del paso');
    }
  };

  const renderStep = ({ item, index }: any) => (
    <TouchableOpacity 
      style={styles.stepCard}
      onPress={() => toggleStep(item.id, item.status)}
      activeOpacity={0.7}
    >
      <View style={styles.stepHeader}>
        {item.status === 'done' ? (
          <CheckCircle color="#10B981" size={24} />
        ) : (
          <Circle color="#94A3B8" size={24} />
        )}
        <Text style={[styles.stepTitle, item.status === 'done' && styles.stepTitleDone]}>
          Paso {index + 1}: {item.title}
        </Text>
      </View>
      <Text style={[styles.stepDescription, item.status === 'done' && styles.stepDescriptionDone]}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Title block */}
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{task.title}</Text>
          <TouchableOpacity onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Trash2 color="#EF4444" size={24} />
            )}
          </TouchableOpacity>
        </View>
        {task.due_date && (
          <Text style={styles.dueDate}>Vence: {new Date(task.due_date).toLocaleDateString('es-ES')}</Text>
        )}
        <Text style={styles.rawDesc}>Dictado original: "{task.description}"</Text>
      </View>

      {/* Steps List */}
      <View style={styles.stepsContainer}>
        <Text style={styles.sectionTitle}>Pasos Accionables</Text>
        
        {loadingSteps ? (
          <ActivityIndicator color="#007AFF" />
        ) : steps.length === 0 ? (
          <View style={styles.emptySteps}>
            <Text style={styles.emptyText}>Esta tarea aún no ha sido planificada.</Text>
            
            <TouchableOpacity 
              style={styles.planifyButton}
              onPress={handlePlanify}
              disabled={planifying}
            >
              {planifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Wand2 color="#fff" size={20} style={{marginRight: 8}} />
                  <Text style={styles.buttonText}>Planificar con IA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={steps}
            keyExtractor={item => item.id.toString()}
            renderItem={renderStep}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  headerBlock: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dueDate: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 16,
  },
  rawDesc: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  stepsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  emptySteps: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
  },
  planifyButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6', // Magic purple color for AI
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
    flex: 1,
  },
  stepTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginLeft: 32,
  },
  stepDescriptionDone: {
    color: '#CBD5E1',
  }
});
