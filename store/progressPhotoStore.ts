// ============================================
// Cals2Gains - Progress Photo Store (Zustand)
// ============================================

import { create } from 'zustand';
import { ProgressPhoto, PhotoAngle } from '../types';
import {
  saveProgressPhoto,
  getProgressPhotos,
  deleteProgressPhoto as deleteProgressPhotoFromFirebase,
} from '../services/firebase';

interface ProgressPhotoComparison {
  first: ProgressPhoto | null;
  latest: ProgressPhoto | null;
}

interface ProgressPhotoState {
  photos: ProgressPhoto[];
  isLoading: boolean;

  // Actions
  loadPhotos: (userId: string) => Promise<void>;
  addPhoto: (photo: Omit<ProgressPhoto, 'id'>) => Promise<string>;
  deletePhoto: (id: string) => Promise<void>;

  // Computed
  getByAngle: (angle: PhotoAngle) => ProgressPhoto[];
  getPhotosByAngle: (angle: PhotoAngle) => ProgressPhoto[];
  getByDateRange: (start: Date, end: Date) => ProgressPhoto[];
  getComparison: (angle: PhotoAngle) => ProgressPhotoComparison;
}

export const useProgressPhotoStore = create<ProgressPhotoState>((set, get) => ({
  photos: [],
  isLoading: false,

  loadPhotos: async (userId: string) => {
    set({ isLoading: true });
    try {
      const photos = await getProgressPhotos(userId);
      // Sort by date descending (most recent first)
      const sorted = photos.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      set({ photos: sorted });
    } catch (error) {
      console.error('Failed to load progress photos:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addPhoto: async (photo: Omit<ProgressPhoto, 'id'>) => {
    set({ isLoading: true });
    try {
      const id = await saveProgressPhoto(photo);
      const newPhoto = { ...photo, id } as ProgressPhoto;

      const { photos } = get();
      const updated = [newPhoto, ...photos].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      set({ photos: updated });

      return id;
    } catch (error) {
      console.error('Failed to add progress photo:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deletePhoto: async (id: string) => {
    try {
      await deleteProgressPhotoFromFirebase(id);

      const { photos } = get();
      const updated = photos.filter((p) => p.id !== id);
      set({ photos: updated });
    } catch (error) {
      console.error('Failed to delete progress photo:', error);
      throw error;
    }
  },

  getByAngle: (angle: PhotoAngle) => {
    const { photos } = get();
    return photos.filter((p) => p.angle === angle);
  },

  getPhotosByAngle: (angle: PhotoAngle) => {
    const { photos } = get();
    return photos.filter((p) => p.angle === angle);
  },

  getByDateRange: (start: Date, end: Date) => {
    const { photos } = get();
    return photos.filter((p) => {
      const photoDate = new Date(p.date);
      return photoDate >= start && photoDate <= end;
    });
  },

  getComparison: (angle: PhotoAngle): ProgressPhotoComparison => {
    const byAngle = get().getByAngle(angle);
    if (byAngle.length === 0) {
      return { first: null, latest: null };
    }

    const latest = byAngle[0]; // Most recent (sorted descending)
    const first = byAngle[byAngle.length - 1]; // Oldest

    return { first, latest };
  },
}));
