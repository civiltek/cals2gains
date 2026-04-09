// ============================================
// Cals2Gains - Camera Screen
// ============================================

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors from '../../constants/colors';
import { useUserStore } from '../../store/userStore';

export default function CameraScreen() {
  const { t, i18n } = useTranslation();
  const { user, isSubscriptionActive } = useUserStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  // Check subscription
  const canUseCamera = isSubscriptionActive();

  const compressAndConvertToBase64 = async (uri: string): Promise<string> => {
    // Resize to max 1024px and compress for API efficiency
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64;
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    if (!canUseCamera) {
      router.push('/paywall');
      return;
    }

    setIsCapturing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setPreviewUri(photo.uri);
      }
    } catch (error) {
      Alert.alert(t('errors.cameraError'));
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    if (!canUseCamera) {
      router.push('/paywall');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t('errors.generic'));
    }
  };

  const handleAnalyze = async () => {
    if (!previewUri) return;
    setIsAnalyzing(true);

    try {
      const base64 = await compressAndConvertToBase64(previewUri);
      router.push({
        pathname: '/analysis',
        params: {
          imageUri: previewUri,
          imageBase64: base64,
          language: i18n.language,
        },
      });
    } catch (error) {
      Alert.alert(t('errors.generic'));
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setIsAnalyzing(false);
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.permissionTitle}>{t('camera.permissionDenied')}</Text>
        <Text style={styles.permissionMessage}>{t('camera.permissionMessage')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t('camera.openSettings')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Preview mode
  if (previewUri) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: previewUri }} style={styles.previewImage} />

        {/* Preview overlay */}
        <View style={styles.previewOverlay}>
          <SafeAreaView style={styles.previewContent}>
            {/* Header */}
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </TouchableOpacity>

            {/* Bottom actions */}
            <View style={styles.previewActions}>
              {isAnalyzing ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator color={Colors.white} size="large" />
                  <Text style={styles.analyzingText}>{t('camera.analyzing')}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={handleAnalyze}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={22} color={Colors.white} />
                  <Text style={styles.analyzeButtonText}>
                    {i18n.language === 'es' ? 'Analizar con IA' : 'Analyze with AI'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  // Camera mode
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        onCameraReady={() => {}}
      >
        {/* Camera UI overlay */}
        <SafeAreaView style={styles.cameraOverlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
            >
              <Ionicons
                name={flash === 'off' ? 'flash-off' : 'flash'}
                size={22}
                color={Colors.white}
              />
            </TouchableOpacity>

            <Text style={styles.cameraTitle}>{t('camera.title')}</Text>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Center frame guide */}
          <View style={styles.frameGuide}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          {/* Tip text */}
          <Text style={styles.tipText}>{t('camera.tip')}</Text>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            {/* Gallery button */}
            <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
              <Ionicons name="images-outline" size={28} color={Colors.white} />
            </TouchableOpacity>

            {/* Capture button */}
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.galleryButton} />
          </View>
        </SafeAreaView>
      </CameraView>

      {/* Locked overlay for non-subscribers */}
      {!canUseCamera && (
        <TouchableOpacity
          style={styles.lockedOverlay}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.9}
        >
          <Ionicons name="lock-closed" size={48} color={Colors.white} />
          <Text style={styles.lockedTitle}>{t('paywall.trialExpiredTitle')}</Text>
          <Text style={styles.lockedSubtitle}>{t('paywall.trialExpiredMessage')}</Text>
          <View style={styles.lockedButton}>
            <Text style={styles.lockedButtonText}>{t('paywall.subscribe')}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameGuide: {
    width: 260,
    height: 200,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 48,
  },
  galleryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.white,
  },

  // Preview styles
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  retakeButton: {
    margin: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewActions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  analyzeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  analyzeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
  analyzingContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  analyzingText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },

  // Permission styles
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },

  // Locked overlay
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  lockedButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  lockedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
