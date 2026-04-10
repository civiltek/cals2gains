import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useProgressPhotoStore } from '../store/progressPhotoStore';
import { useMeasurementStore } from '../store/measurementStore';
import { useWeightStore } from '../store/weightStore';
import { COLORS } from '../theme';

const { width, height } = Dimensions.get('window');

type PhotoAngle = 'front' | 'side' | 'back';

interface ProgressPhoto {
  id: string;
  uri: string;
  localPath: string;
  fecha: string;
  angle: PhotoAngle;
  peso?: number;
  grasaCorporal?: number;
  notas?: string;
  timestamp: number;
}

interface PhotoDetail {
  photo: ProgressPhoto;
  isDayLight?: boolean;
}

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const PhotoThumbnail: React.FC<{
  photo: ProgressPhoto;
  onPress: () => void;
}> = ({ photo, onPress }) => (
  <TouchableOpacity
    style={styles.thumbnail}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Image
      source={{ uri: photo.uri }}
      style={styles.thumbnailImage}
      resizeMode="cover"
    />
    <View style={styles.thumbnailOverlay}>
      <Text style={styles.thumbnailDate}>{photo.fecha}</Text>
    </View>
  </TouchableOpacity>
);

const ComparisonSlider: React.FC<{
  earliestPhoto: ProgressPhoto;
  latestPhoto: ProgressPhoto;
  position: number;
  onPositionChange: (pos: number) => void;
}> = ({ earliestPhoto, latestPhoto, position, onPositionChange }) => {
  const sliderWidth = width - 32;

  return (
    <View style={styles.comparisonContainer}>
      <View
        style={[
          styles.comparisonSlider,
          { width: sliderWidth },
        ]}
      >
        {/* Background image (latest) */}
        <Image
          source={{ uri: latestPhoto.uri }}
          style={styles.comparisonImage}
          resizeMode="cover"
        />

        {/* Overlay image (earliest) with adjustable mask */}
        <View
          style={[
            styles.comparisonOverlay,
            { width: `${position}%` },
          ]}
        >
          <Image
            source={{ uri: earliestPhoto.uri }}
            style={[styles.comparisonImage, { width: sliderWidth }]}
            resizeMode="cover"
          />
        </View>

        {/* Slider handle */}
        <TouchableOpacity
          style={[
            styles.sliderHandle,
            { left: `${position}%` },
          ]}
          onPress={() => {}}
        >
          <View style={styles.sliderHandleInner} />
        </TouchableOpacity>
      </View>

      {/* Slider track for positioning */}
      <View
        style={styles.sliderTrack}
        onTouchMove={(e) => {
          const touchX = e.nativeEvent.locationX;
          const trackWidth = sliderWidth;
          const newPosition = Math.max(0, Math.min(100, (touchX / trackWidth) * 100));
          onPositionChange(newPosition);
        }}
      >
        <View style={[styles.sliderFill, { width: `${position}%` }]} />
      </View>

      {/* Labels */}
      <View style={styles.comparisonLabels}>
        <Text style={styles.comparisonLabel}>{earliestPhoto.fecha}</Text>
        <Text style={styles.comparisonLabel}>{latestPhoto.fecha}</Text>
      </View>
    </View>
  );
};

export default function ProgressPhotosScreen() {
  const router = useRouter();
  const { photos, addPhoto, getPhotosByAngle } = useProgressPhotoStore();
  const { measurements } = useMeasurementStore();
  const { weights } = useWeightStore();

  const [activeTab, setActiveTab] = useState<PhotoAngle>('front');
  const [tabPhotos, setTabPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const tabLabels: Record<PhotoAngle, string> = {
    front: 'Frontal',
    side: 'Lateral',
    back: 'Espalda',
  };

  useEffect(() => {
    loadPhotosForTab();
  }, [activeTab]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  const loadPhotosForTab = () => {
    const filtered = getPhotosByAngle(activeTab);
    setTabPhotos(filtered.sort((a, b) => b.timestamp - a.timestamp));
  };

  const savePhotoLocally = async (photoUri: string): Promise<string> => {
    try {
      const filename = `progress_${Date.now()}.jpg`;
      const localPath = `${FileSystem.documentDirectory}progress_photos/${filename}`;

      // Ensure directory exists
      const dirPath = `${FileSystem.documentDirectory}progress_photos`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      // Copy file
      await FileSystem.copyAsync({
        from: photoUri,
        to: localPath,
      });

      return localPath;
    } catch (error) {
      console.error('Error saving photo locally:', error);
      throw error;
    }
  };

  const handleTakePhoto = async () => {
    if (permissionDenied) {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a la cámara para tomar fotos'
      );
      return;
    }

    try {
      setIsLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;

        // Save locally
        const localPath = await savePhotoLocally(photoUri);

        // Get current weight and body fat
        const currentWeight = weights && weights.length > 0 ? weights[0].peso : undefined;
        const currentBodyFat =
          measurements && measurements.length > 0
            ? measurements[0].grasaCorporal
            : undefined;

        const newPhoto: ProgressPhoto = {
          id: Date.now().toString(),
          uri: photoUri,
          localPath,
          fecha: new Date().toISOString().split('T')[0],
          angle: activeTab,
          peso: currentWeight,
          grasaCorporal: currentBodyFat,
          timestamp: Date.now(),
        };

        addPhoto(newPhoto);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadPhotosForTab();
        Alert.alert('Éxito', 'Foto guardada correctamente');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo guardar la foto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhoto = (photo: ProgressPhoto) => {
    setSelectedPhoto(photo);
    setShowDetailModal(true);
  };

  const handleStartComparison = () => {
    if (tabPhotos.length < 2) {
      Alert.alert('Información', 'Necesitas al menos 2 fotos para comparar');
      return;
    }
    setComparisonPosition(50);
    setShowComparisonModal(true);
  };

  const getPhotoMetadata = (photo: ProgressPhoto) => {
    const lines = [];
    if (photo.peso) lines.push(`Peso: ${photo.peso.toFixed(1)} kg`);
    if (photo.grasaCorporal !== undefined)
      lines.push(`Grasa: ${photo.grasaCorporal.toFixed(1)}%`);
    return lines;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.violet} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fotos de Progreso</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['front', 'side', 'back'] as PhotoAngle[]).map((angle) => (
            <TabButton
              key={angle}
              label={tabLabels[angle]}
              isActive={activeTab === angle}
              onPress={() => setActiveTab(angle)}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.takePhotoButton]}
            onPress={handleTakePhoto}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.bone} size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={20} color={COLORS.bone} />
                <Text style={styles.actionButtonText}>Tomar Foto</Text>
              </>
            )}
          </TouchableOpacity>

          {tabPhotos.length > 1 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.compareButton]}
              onPress={handleStartComparison}
            >
              <Ionicons name="swap-horizontal" size={20} color={COLORS.bone} />
              <Text style={styles.actionButtonText}>Comparar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos Grid */}
        {tabPhotos.length > 0 ? (
          <>
            <Text style={styles.gridTitle}>
              {tabPhotos.length} foto{tabPhotos.length !== 1 ? 's' : ''}
            </Text>
            <View style={styles.photoGrid}>
              {tabPhotos.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  onPress={() => handleSelectPhoto(photo)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={48} color={COLORS.violet} />
            <Text style={styles.emptyStateTitle}>No hay fotos</Text>
            <Text style={styles.emptyStateText}>
              Comienza a registrar tu progreso tomando una foto
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedPhoto && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedPhoto.fecha}</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.bone} />
                  </TouchableOpacity>
                </View>

                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                {getPhotoMetadata(selectedPhoto).length > 0 && (
                  <View style={styles.metadataSection}>
                    {getPhotoMetadata(selectedPhoto).map((line, idx) => (
                      <View key={idx} style={styles.metadataRow}>
                        <Text style={styles.metadataText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedPhoto.notas && (
                  <View style={styles.notasSection}>
                    <Text style={styles.notasLabel}>Notas</Text>
                    <Text style={styles.notasText}>{selectedPhoto.notas}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Comparison Modal */}
      <Modal
        visible={showComparisonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComparisonModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.comparisonModalContent}>
            {tabPhotos.length > 1 && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Comparación</Text>
                  <TouchableOpacity onPress={() => setShowComparisonModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.bone} />
                  </TouchableOpacity>
                </View>

                <ComparisonSlider
                  earliestPhoto={tabPhotos[tabPhotos.length - 1]}
                  latestPhoto={tabPhotos[0]}
                  position={comparisonPosition}
                  onPositionChange={setComparisonPosition}
                />

                <View style={styles.comparisonInfo}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Primera foto</Text>
                    <Text style={styles.infoValue}>
                      {tabPhotos[tabPhotos.length - 1].fecha}
                    </Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Última foto</Text>
                    <Text style={styles.infoValue}>{tabPhotos[0].fecha}</Text>
                  </View>
                </View>

                {tabPhotos[0].peso && tabPhotos[tabPhotos.length - 1].peso && (
                  <View style={styles.comparisonStats}>
                    <Text style={styles.statsLabel}>Cambio de peso</Text>
                    <Text style={styles.statsValue}>
                      {(tabPhotos[0].peso - tabPhotos[tabPhotos.length - 1].peso).toFixed(1)} kg
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowComparisonModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.bone,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.bone,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  takePhotoButton: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  compareButton: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bone,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  thumbnail: {
    width: (width - 48) / 2,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  thumbnailDate: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.bone,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 32,
    maxHeight: height - 100,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comparisonModalContent: {
    width: width - 32,
    maxHeight: height - 100,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bone,
  },
  modalImage: {
    width: '100%',
    height: (height - 250) * 0.7,
  },
  metadataSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metadataRow: {
    paddingVertical: 6,
  },
  metadataText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  notasSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notasLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.violet,
    marginBottom: 6,
  },
  notasText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  closeButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bone,
  },
  comparisonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  comparisonSlider: {
    height: height * 0.4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  comparisonImage: {
    width: '100%',
    height: '100%',
  },
  comparisonOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    overflow: 'hidden',
  },
  sliderHandle: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: '100%',
    backgroundColor: COLORS.coral,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -2 }],
  },
  sliderHandleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.coral,
    opacity: 0.7,
  },
  sliderTrack: {
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.violet,
  },
  comparisonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  comparisonInfo: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.bone,
  },
  comparisonStats: {
    paddingHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.coral,
  },
});
