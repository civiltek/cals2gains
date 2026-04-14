// ============================================
// Cals2Gains - Voice Food Logging Service
// ============================================
// Uses OpenAI Whisper for speech-to-text, then GPT for nutrition estimation

import * as FileSystem from 'expo-file-system/legacy';
import { FoodItem } from '../types';
import { analyzeTextFood } from './foodDatabase';
import { getAppLanguage } from '../utils/language';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

/**
 * Transcribe audio file to text using OpenAI Whisper
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Create form data with the audio
  const formData = new FormData();

  // Convert base64 to blob-like structure for RN
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', getAppLanguage()); // Use app language setting for Whisper

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Whisper API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * Full voice-to-nutrition pipeline:
 * 1. Transcribe audio → text
 * 2. Parse text → food description
 * 3. Estimate nutrition → FoodItem
 */
export async function voiceToNutrition(
  audioUri: string,
  language: 'es' | 'en' = getAppLanguage()
): Promise<{ transcription: string; food: FoodItem | null }> {
  const transcription = await transcribeAudio(audioUri);

  if (!transcription.trim()) {
    return { transcription: '', food: null };
  }

  const food = await analyzeTextFood(transcription, language);
  return { transcription, food };
}