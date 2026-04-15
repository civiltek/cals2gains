// ============================================
// Cals2Gains - Voice Food Logging Service
// ============================================
// Uses OpenAI Whisper for speech-to-text, then GPT-5.4 for nutrition estimation

import * as FileSystem from 'expo-file-system/legacy';
import { FoodItem } from '../types';
import { analyzeTextFood } from './foodDatabase';
import { getAppLanguage } from '../utils/language';
import { callOpenAITranscribe } from './apiProxy';

/**
 * Transcribe audio file to text using OpenAI Whisper (via Cloud Function proxy)
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const result = await callOpenAITranscribe({
    audioBase64: base64,
    language: getAppLanguage(),
  });

  return result.text;
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
