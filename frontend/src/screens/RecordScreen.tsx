import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Audio } from 'expo-av';
import { Mic } from 'lucide-react-native';
import apiClient, { setAuthToken } from '../api/client';

export default function RecordScreen({ navigation }: any) {
  const { getAccessToken } = useAuth();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Request permissions upon mount
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Se necesitan permisos de micrófono para dictar tareas');
      }
    })();
  }, []);

  const handleAuthAndGetToken = async () => {
    const token = await getAccessToken();
    if (token) {
      setAuthToken(token);
    }
  };

  async function startRecording() {
    try {
      if (isProcessing || recording) return;
      await handleAuthAndGetToken();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
    } catch (err) {
      console.error('Failed to start recording', err);
      setRecording(null);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    
    const currentRecording = recording;
    setRecording(null);
    setIsProcessing(true);
    
    try {
      await currentRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = currentRecording.getURI();
      if (!uri) throw new Error("No recording URI");

      await handleAuthAndGetToken();

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'audio.m4a',
        type: 'audio/m4a'
      } as any);

      console.log('Uploading to:', apiClient.defaults.baseURL);
      await apiClient.post('/tasks/record', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('¡Éxito!', 'Tu tarea fue capturada y guardada correctamente.');
      
    } catch (error: any) {
      console.error("Failed to process tasks", error);
      const msg = error.response?.data?.error || error.message || "Error de red";
      Alert.alert("Error", `No se pudo procesar el audio: ${msg}\n\nURL objetivo: ${apiClient.defaults.baseURL}`);
    } finally {
      setIsProcessing(false);
    }
  }

  const handlePressIn = () => {
    startRecording();
  };

  const handlePressOut = () => {
    stopRecording();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        {isProcessing ? 'Procesando audio con IA...' : 'Mantén presionado para dictar una tarea'}
      </Text>
      
      <View style={styles.buttonContainer}>
        {isProcessing ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity 
            style={[styles.recordButton, recording && styles.recordingActive]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <Mic color="#fff" size={48} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.subtitle}>
        ej. "Necesito hacer un ensayo sobre la Segunda Guerra Mundial para el 20 de marzo"
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  instructions: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 60,
  },
  buttonContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF', // Rich blue shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10, // For Android
  },
  recordingActive: {
    backgroundColor: '#EF4444', // Become red when recording
    transform: [{ scale: 1.1 }], // Need to implement animation properly later if requested
    shadowColor: '#EF4444',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
