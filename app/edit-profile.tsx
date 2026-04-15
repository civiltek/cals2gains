/**
 * Edit Profile Screen
 * Cals2Gains React Native app
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { uploadProfilePhoto, updateUserDisplayName } from '../services/firebase';

// ============================================================================
// PREDEFINED AVATARS
// ============================================================================

interface PredefinedAvatar {
  id: string;
  icon: string;       // Ionicons name
  bgColor: string;
  iconColor: string;
}

const PREDEFINED_AVATARS = (colors: ReturnType<typeof useColors>): PredefinedAvatar[] => [
  { id: 'avatar_1', icon: 'person',         bgColor: colors.primary,  iconColor: '#fff' },
  { id: 'avatar_2', icon: 'fitness',         bgColor: colors.accent,   iconColor: '#fff' },
  { id: 'avatar_3', icon: 'nutrition',        bgColor: '#4ADE80',      iconColor: '#fff' },
  { id: 'avatar_4', icon: 'heart',           bgColor: '#F472B6',      iconColor: '#fff' },
  { id: 'avatar_5', icon: 'flame',           bgColor: '#FBBF24',      iconColor: '#fff' },
  { id: 'avatar_6', icon: 'leaf',            bgColor: '#34D399',      iconColor: '#fff' },
  { id: 'avatar_7', icon: 'barbell',         bgColor: '#818CF8',      iconColor: '#fff' },
  { id: 'avatar_8', icon: 'sparkles',        bgColor: colors.accent,   iconColor: '#fff' },
];

// ============================================================================
// SCREEN
// ============================================================================

export default function EditProfileScreen() {
  const C = useColors();
  const styles = createStyles(C);
  const router = useRouter();
  const { t } = useTranslation();
  const { user, userId, loadUserData } = useUserStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photoURL || null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.profile?.avatarType || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Track if anything changed
  const hasChanges = useMemo(() => {
    const origName = user?.displayName || '';
    const origBio = user?.profile?.bio || '';
    const origPhoto = user?.photoURL || null;
    const origAvatar = user?.profile?.avatarType || null;

    return (
      displayName !== origName ||
      bio !== origBio ||
      photoUri !== origPhoto ||
      selectedAvatar !== origAvatar
    );
  }, [displayName, bio, photoUri, selectedAvatar, user]);

  // ────────────────────── PHOTO PICKER ──────────────────────

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return { cameraStatus, libraryStatus };
  };

  const pickFromCamera = async () => {
    const { cameraStatus } = await requestPermissions();
    if (cameraStatus !== 'granted') {
      Alert.alert(t('editProfile.permissionDenied'), t('editProfile.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setSelectedAvatar(null); // Clear avatar selection
    }
  };

  const pickFromLibrary = async () => {
    const { libraryStatus } = await requestPermissions();
    if (libraryStatus !== 'granted') {
      Alert.alert(t('editProfile.permissionDenied'), t('editProfile.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setSelectedAvatar(null); // Clear avatar selection
    }
  };

  const handlePhotoPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('editProfile.takePhoto'), t('editProfile.chooseFromGallery'), t('editProfile.removePhoto')],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickFromCamera();
          else if (buttonIndex === 2) pickFromLibrary();
          else if (buttonIndex === 3) { setPhotoUri(null); setSelectedAvatar(null); }
        }
      );
    } else {
      Alert.alert(t('editProfile.profilePhoto'), t('editProfile.chooseOption'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('editProfile.takePhoto'), onPress: pickFromCamera },
        { text: t('editProfile.chooseFromGallery'), onPress: pickFromLibrary },
        { text: t('editProfile.removePhoto'), onPress: () => { setPhotoUri(null); setSelectedAvatar(null); }, style: 'destructive' },
      ]);
    }
  };

  const handleSelectAvatar = (avatarId: string) => {
    Haptics.selectionAsync();
    setSelectedAvatar(avatarId);
    setPhotoUri(null); // Clear photo when selecting avatar
  };

  // ────────────────────── SAVE ──────────────────────

  const handleSave = async () => {
    if (!userId || !hasChanges) return;
    setIsSaving(true);

    try {
      // Upload photo if changed and is a local file
      if (photoUri && photoUri !== user?.photoURL && !photoUri.startsWith('http')) {
        setIsUploadingPhoto(true);
        await uploadProfilePhoto(userId, photoUri);
        setIsUploadingPhoto(false);
      }

      // Update display name
      const origName = user?.displayName || '';
      if (displayName !== origName) {
        await updateUserDisplayName(userId, displayName);
      }

      // Update bio and avatar in profile via userStore
      const { updateProfile } = useUserStore.getState();
      const profileUpdate: Record<string, any> = {};
      if (bio !== (user?.profile?.bio || '')) profileUpdate.bio = bio;
      if (selectedAvatar !== (user?.profile?.avatarType || null)) profileUpdate.avatarType = selectedAvatar;
      if (Object.keys(profileUpdate).length > 0) {
        await updateProfile(profileUpdate, {});
      }

      // Reload user data
      await loadUserData(userId);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('editProfile.profileUpdated'), t('editProfile.profileUpdatedMsg'));
      router.back();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', t('editProfile.saveFailed'));
    } finally {
      setIsSaving(false);
      setIsUploadingPhoto(false);
    }
  };

  // ────────────────────── RENDER ──────────────────────

  const currentAvatar = PREDEFINED_AVATARS(C).find(a => a.id === selectedAvatar);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('editProfile.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* PHOTO SECTION */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={handlePhotoPress} style={styles.photoContainer} activeOpacity={0.7}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : currentAvatar ? (
            <View style={[styles.avatarCircle, { backgroundColor: currentAvatar.bgColor }]}>
              <Ionicons name={currentAvatar.icon as any} size={40} color={currentAvatar.iconColor} />
            </View>
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitialLarge}>
                {displayName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.photoHint}>{t('editProfile.changeTap')}</Text>
      </View>

      {/* PREDEFINED AVATARS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('editProfile.orChooseAvatar')}</Text>
        <View style={styles.avatarGrid}>
          {PREDEFINED_AVATARS(C).map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarOption,
                { backgroundColor: avatar.bgColor },
                selectedAvatar === avatar.id && styles.avatarOptionSelected,
              ]}
              onPress={() => handleSelectAvatar(avatar.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={avatar.icon as any} size={26} color={avatar.iconColor} />
              {selectedAvatar === avatar.id && (
                <View style={styles.avatarCheck}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* NAME */}
      <View style={styles.section}>
        <Text style={styles.fieldLabel}>{t('editProfile.name')}</Text>
        <TextInput
          style={styles.textInput}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('editProfile.namePlaceholder')}
          placeholderTextColor={C.textTertiary}
          maxLength={50}
        />
      </View>

      {/* BIO */}
      <View style={styles.section}>
        <Text style={styles.fieldLabel}>{t('editProfile.bioOptional')}</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder={t('editProfile.bioPlaceholder')}
          placeholderTextColor={C.textTertiary}
          multiline
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>
      </View>

      {/* EMAIL (read-only) */}
      <View style={styles.section}>
        <Text style={styles.fieldLabel}>{t('editProfile.email')}</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{user?.email || '--'}</Text>
          <Ionicons name="lock-closed-outline" size={16} color={C.textTertiary} />
        </View>
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          !hasChanges && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!hasChanges || isSaving}
        activeOpacity={0.7}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>
            {isUploadingPhoto ? t('editProfile.uploading') : t('editProfile.saveChanges')}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
    },

    // PHOTO
    photoSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    photoContainer: {
      position: 'relative',
      width: 100,
      height: 100,
    },
    photo: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
    },
    avatarCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
    },
    avatarInitialLarge: {
      fontSize: 36,
      fontWeight: '700',
    },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    photoHint: {
      fontSize: 12,
      marginTop: 8,
    },

    // SECTIONS
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 12,
    },

    // AVATAR GRID
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    avatarOption: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    avatarOptionSelected: {
      borderWidth: 3,
      borderColor: C.bone,
    },
    avatarCheck: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.success,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: C.background,
    },

    // FIELDS
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    textInput: {
      backgroundColor: C.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
    },
    textInputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: 11,
      color: C.textTertiary,
      textAlign: 'right',
      marginTop: 4,
    },
    readOnlyField: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: C.border,
      opacity: 0.6,
    },
    readOnlyText: {
      flex: 1,
      fontSize: 15,
      color: C.textSecondary,
    },

    // SAVE BUTTON
    saveButton: {
      backgroundColor: C.violet,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
