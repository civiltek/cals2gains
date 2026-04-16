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
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { useProgressPhotoStore } from '../store/progressPhotoStore';
import { useMeasurementStore } from '../store/measurementStore';
import { useWeightStore } from '../store/weightStore';
import { useUserStore } from '../store/userStore';
import { ProgressPhoto } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../store/themeStore';

const { width, height } = Dimensions.get('window');

type PhotoAngle = 'front' | 'side' | 'back';

// Use the store's ProgressPhoto type which has 'photoUri', 'date', 'weight', 'bodyFat', 'note'
// We add a helper to get the display URI and formatted date
const getPhotoUri = (photo: any): string => {
  const uri = photo.photoUri || photo.uri || '';
  // On web, local file:// URIs don't work — return empty to show placeholder
  if (Platform.OS === 'web' && uri && !uri.startsWith('data:') && !uri.startsWith('http')) {
    return '';
  }
  return uri;
};
const getPhotoDate = (photo: any): string => {
  if (photo.fecha) return photo.fecha;
  if (photo.date) {
    const d = photo.date instanceof Date ? photo.date : new Date(photo.date);
    return d.toISOString().split('T')[0];
  }
  return '';
};
const getPhotoTimestamp = (photo: any): number => {
  if (photo.timestamp) return photo.timestamp;
  if (photo.date) {
    const d = photo.date instanceof Date ? photo.date : new Date(photo.date);
    return d.getTime();
  }
  return 0;
};

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}> = ({ label, isActive, onPress, colors }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive, {
      backgroundColor: isActive ? colors.primary : colors.card,
      borderColor: isActive ? colors.primary : colors.border
    }]}
    onPress={onPress}
  >
    <Text style={[styles.tabText, isActive && styles.tabTextActive, {
      color: isActive ? colors.white : colors.textSecondary
    }]}>{label}</Text>
  </TouchableOpacity>
);

const PhotoThumbnail: React.FC<{
  photo: any;
  onPress: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useColors>;
}> = ({ photo, onPress, onDelete, colors }) => (
  <TouchableOpacity
    style={[styles.thumbnail, { backgroundColor: colors.card, borderColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Image
      source={{ uri: getPhotoUri(photo) }}
      style={styles.thumbnailImage}
      resizeMode="cover"
    />
    <View style={styles.thumbnailOverlay}>
      <Text style={[styles.thumbnailDate, { color: colors.white }]}>{getPhotoDate(photo)}</Text>
    </View>
    {/* Delete button */}
    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="trash-outline" size={15} color="#FF6B6B" />
      </View>
    </TouchableOpacity>
  </TouchableOpacity>
);

const ComparisonSlider: React.FC<{
  earliestPhoto: any;
  latestPhoto: any;
  position: number;
  onPositionChange: (pos: number) => void;
  colors: ReturnType<typeof useColors>;
}> = ({ earliestPhoto, latestPhoto, position, onPositionChange, colors }) => {
  const sliderWidth = width - 32;

  return (
    <View style={styles.comparisonContainer}>
      <View
        style={[
          styles.comparisonSlider,
          { width: sliderWidth, backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        {/* Background image (latest) */}
        <Image
          source={{ uri: getPhotoUri(latestPhoto) }}
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
            source={{ uri: getPhotoUri(earliestPhoto) }}
            style={[styles.comparisonImage, { width: sliderWidth }]}
            resizeMode="cover"
          />
        </View>

        {/* Slider handle */}
        <TouchableOpacity
          style={[
            styles.sliderHandle,
            { left: `${position}%`, backgroundColor: colors.accent },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.sliderHandleInner, { backgroundColor: colors.accent }]} />
        </TouchableOpacity>
      </View>

      {/* Slider track for positioning */}
      <View
        style={[styles.sliderTrack, { backgroundColor: colors.background, borderColor: colors.border }]}
        onTouchMove={(e) => {
          const touchX = e.nativeEvent.locationX;
          const trackWidth = sliderWidth;
          const newPosition = Math.max(0, Math.min(100, (touchX / trackWidth) * 100));
          onPositionChange(newPosition);
        }}
      >
        <View style={[styles.sliderFill, { width: `${position}%`, backgroundColor: colors.primary }]} />
      </View>

      {/* Labels */}
      <View style={styles.comparisonLabels}>
        <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>{getPhotoDate(earliestPhoto)}</Text>
        <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>{getPhotoDate(latestPhoto)}</Text>
      </View>
    </View>
  );
};

export default function ProgressPhotosScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photos, addPhoto, getPhotosByAngle, deletePhoto, loadPhotos } = useProgressPhotoStore();
  const { measurements } = useMeasurementStore();
  const { entries: weights } = useWeightStore();
  const { user } = useUserStore();

  const [activeTab, setActiveTab] = useState<PhotoAngle>('front');
  const [tabPhotos, setTabPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);

  const tabLabels: Record<PhotoAngle, string> = {
    front: t('progressPhotos.front'),
    side: t('progressPhotos.side'),
    back: t('progressPhotos.back'),
  };

  // Load photos from Firebase on mount
  useEffect(() => {
    if (user?.uid && !photosLoaded) {
      loadPhotos(user.uid).then(() => setPhotosLoaded(true));
    }
    requestCameraPermission();
  }, [user?.uid]);

  useEffect(() => {
    loadPhotosForTab();
  }, [activeTab, photos]);

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
    setTabPhotos(filtered.sort((a: any, b: any) => getPhotoTimestamp(b) - getPhotoTimestamp(a)));
  };

  const savePhotoLocally = async (photoUri: string): Promise<string> => {
    try {
      // On web, FileSystem paths don't work — convert to base64 data URI
      if (Platform.OS === 'web') {
        // The picker already returns a usable URI on web (blob or data URI)
        return photoUri;
      }

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
        t('permissions.required'),
        t('permissions.cameraNeeded')
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

        // Save locally so URI persists across app restarts
        const localPath = await savePhotoLocally(photoUri);

        // Get current weight and body fat
        const currentWeight = weights && weights.length > 0 ? weights[0].weight : undefined;
        const currentBodyFat =
          measurements && measurements.length > 0
            ? measurements[0].bodyFat
            : undefined;

        // Save to Firestore — use localPath as photoUri for persistence
        if (!user?.uid) {
          Alert.alert('Error', t('common.userNotAuthenticated'));
          return;
        }
        await addPhoto({
          userId: user.uid,
          date: new Date(),
          angle: activeTab,
          photoUri: localPath,
          weight: currentWeight,
          bodyFat: currentBodyFat,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadPhotosForTab();
        Alert.alert(t('common.success'), t('photos.saved'));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', t('photos.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissions.required'),
          t('permissions.galleryNeeded')
        );
        return;
      }

      setIsLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;

        // Save locally so URI persists
        const localPath = await savePhotoLocally(photoUri);

        const currentWeight = weights && weights.length > 0 ? weights[0].weight : undefined;
        const currentBodyFat =
          measurements && measurements.length > 0
            ? measurements[0].bodyFat
            : undefined;

        if (!user?.uid) {
          Alert.alert('Error', t('common.userNotAuthenticated'));
          return;
        }
        await addPhoto({
          userId: user.uid,
          date: new Date(),
          angle: activeTab,
          photoUri: localPath,
          weight: currentWeight,
          bodyFat: currentBodyFat,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadPhotosForTab();
        Alert.alert(t('common.success'), t('photos.saved'));
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', t('photos.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhoto = (photo: any) => {
    setSelectedPhoto(photo);
    setShowDetailModal(true);
  };

  const handleStartComparison = () => {
    if (tabPhotos.length < 2) {
      Alert.alert(t('progressPhotos.info'), t('progressPhotos.needTwoPhotos'));
      return;
    }
    setComparisonPosition(50);
    setShowComparisonModal(true);
  };

  const handleDeletePhoto = (photo: any) => {
    Alert.alert(
      t('photos.deleteTitle'),
      t('photos.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto(photo.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadPhotosForTab();
              // Close detail modal if open
              if (showDetailModal && selectedPhoto?.id === photo.id) {
                setShowDetailModal(false);
                setSelectedPhoto(null);
              }
            } catch (error) {
              Alert.alert('Error', t('photos.deleteError'));
            }
          },
        },
      ]
    );
  };

  const getPhotoMetadata = (photo: any) => {
    const lines = [];
    if (photo.weight) lines.push(t('progressPhotos.weight', { value: photo.weight.toFixed(1) }));
    else if (photo.weight) lines.push(t('progressPhotos.weight', { value: photo.weight.toFixed(1) }));
    if (photo.bodyFat !== undefined) lines.push(`Grasa: ${photo.bodyFat.toFixed(1)}%`);
    else if (photo.grasaCorporal !== undefined) lines.push(`Grasa: ${photo.grasaCorporal.toFixed(1)}%`);
    return lines;
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top, zIndex: 10, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.6}
            style={{ backgroundColor: C.surface, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('progressPhotos.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['front', 'side', 'back'] as PhotoAngle[]).map((angle) => (
            <TabButton
              key={angle}
              label={tabLabels[angle]}
              isActive={activeTab === angle}
              onPress={() => setActiveTab(angle)}
              colors={C}
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
            style={[styles.actionButton, { backgroundColor: C.accent, borderColor: C.accent }]}
            onPress={handleTakePhoto}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={18} color={C.white} />
                <Text style={[styles.actionButtonText, { color: C.white }]}>{t('progressPhotos.camera')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: C.primary, borderColor: C.primary }]}
            onPress={handlePickFromGallery}
            disabled={isLoading}
          >
            <Ionicons name="images" size={18} color={C.white} />
            <Text style={[styles.actionButtonText, { color: C.white }]}>{t('progressPhotos.gallery')}</Text>
          </TouchableOpacity>

          {tabPhotos.length > 1 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={handleStartComparison}
            >
              <Ionicons name="swap-horizontal" size={18} color={C.text} />
              <Text style={[styles.actionButtonText, { color: C.text }]}>{t('progressPhotos.compare')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos Grid */}
        {tabPhotos.length > 0 ? (
          <>
            <Text style={[styles.gridTitle, { color: C.textSecondary }]}>
              {tabPhotos.length} foto{tabPhotos.length !== 1 ? 's' : ''}
            </Text>
            <View style={styles.photoGrid}>
              {tabPhotos.map((photo: any) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  onPress={() => handleSelectPhoto(photo)}
                  onDelete={() => handleDeletePhoto(photo)}
                  colors={C}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={48} color={C.primary} />
            <Text style={[styles.emptyStateTitle, { color: C.text }]}>{t('progressPhotos.emptyTitle')}</Text>
            <Text style={[styles.emptyStateText, { color: C.textSecondary }]}>
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
          <View style={[styles.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            {selectedPhoto && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
                  <Text style={[styles.modalTitle, { color: C.text }]}>{getPhotoDate(selectedPhoto)}</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color={C.text} />
                  </TouchableOpacity>
                </View>

                <Image
                  source={{ uri: getPhotoUri(selectedPhoto) }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                {getPhotoMetadata(selectedPhoto).length > 0 && (
                  <View style={[styles.metadataSection, { borderTopColor: C.border }]}>
                    {getPhotoMetadata(selectedPhoto).map((line, idx) => (
                      <View key={idx} style={styles.metadataRow}>
                        <Text style={[styles.metadataText, { color: C.textSecondary }]}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {(selectedPhoto.note || selectedPhoto.note) && (
                  <View style={[styles.notasSection, { borderTopColor: C.border }]}>
                    <Text style={[styles.notasLabel, { color: C.primary }]}>{t('progressPhotos.notes')}</Text>
                    <Text style={[styles.notasText, { color: C.textSecondary }]}>{selectedPhoto.note || selectedPhoto.note}</Text>
                  </View>
                )}

                {/* Delete from detail view */}
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: C.error || '#FF4444' }]}
                  onPress={() => handleDeletePhoto(selectedPhoto)}
                >
                  <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>{t('progressPhotos.deleteTitle')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: C.primary, marginTop: 0 }]}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={[styles.closeButtonText, { color: C.white }]}>{t('progressPhotos.close')}</Text>
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
          <View style={[styles.comparisonModalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            {tabPhotos.length > 1 && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
                  <Text style={[styles.modalTitle, { color: C.text }]}>{t('progressPhotos.comparison')}</Text>
                  <TouchableOpacity onPress={() => setShowComparisonModal(false)}>
                    <Ionicons name="close" size={24} color={C.text} />
                  </TouchableOpacity>
                </View>

                <ComparisonSlider
                  earliestPhoto={tabPhotos[tabPhotos.length - 1]}
                  latestPhoto={tabPhotos[0]}
                  position={comparisonPosition}
                  onPositionChange={setComparisonPosition}
                  colors={C}
                />

                <View style={styles.comparisonInfo}>
                  <View style={[styles.infoCard, { backgroundColor: C.background, borderColor: C.border }]}>
                    <Text style={[styles.infoLabel, { color: C.textTertiary }]}>{t('progressPhotos.firstPhoto')}</Text>
                    <Text style={[styles.infoValue, { color: C.text }]}>
                      {getPhotoDate(tabPhotos[tabPhotos.length - 1])}
                    </Text>
                  </View>
                  <View style={[styles.infoCard, { backgroundColor: C.background, borderColor: C.border }]}>
                    <Text style={[styles.infoLabel, { color: C.textTertiary }]}>{t('progressPhotos.lastPhoto')}</Text>
                    <Text style={[styles.infoValue, { color: C.text }]}>{getPhotoDate(tabPhotos[0])}</Text>
                  </View>
                </View>

                {(tabPhotos[0].weight || tabPhotos[0].weight) && (tabPhotos[tabPhotos.length - 1].weight || tabPhotos[tabPhotos.length - 1].weight) && (
                  <View style={[styles.comparisonStats, { backgroundColor: C.background, borderColor: C.border }]}>
                    <Text style={[styles.statsLabel, { color: C.textTertiary }]}>{t('progressPhotos.weightChange')}</Text>
                    <Text style={[styles.statsValue, { color: C.accent }]}>
                      {((tabPhotos[0].weight || tabPhotos[0].weight) - (tabPhotos[tabPhotos.length - 1].weight || tabPhotos[tabPhotos.length - 1].weight)).toFixed(1)} kg
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: C.primary }]}
                  onPress={() => setShowComparisonModal(false)}
                >
                  <Text style={[styles.closeButtonText, { color: C.white }]}>{t('progressPhotos.close')}</Text>
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
  },
  headerContainer: {
    borderBottomWidth: 1,
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
    borderWidth: 1,
    alignItems: 'center',
  },
  tabButtonActive: {
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
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
  },
  compareButton: {
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    borderWidth: 1,
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
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  thumbnailDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F7F2EA',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 12,
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  comparisonModalContent: {
    width: width - 32,
    maxHeight: height - 100,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalImage: {
    width: '100%',
    height: (height - 250) * 0.7,
  },
  metadataSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  metadataRow: {
    paddingVertical: 6,
  },
  metadataText: {
    fontSize: 13,
  },
  notasSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  notasLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  notasText: {
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  comparisonSlider: {
    height: height * 0.4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -2 }],
  },
  sliderHandleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.7,
  },
  sliderTrack: {
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  sliderFill: {
    height: '100%',
  },
  comparisonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    borderRadius: 12,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  comparisonStats: {
    paddingHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
