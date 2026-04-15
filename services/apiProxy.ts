// ============================================
// Cals2Gains - Cloud Functions API Proxy
// ============================================
// All AI and sensitive API calls go through Firebase Cloud Functions
// so that API keys never leave the server.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';

const functions = getFunctions(getApp(), 'europe-west1');

// Uncomment for local development with emulator:
// connectFunctionsEmulator(functions, 'localhost', 5001);

// ============================================
// OpenAI Chat Completions (via Cloud Function)
// ============================================

interface ChatRequest {
  messages: Array<{ role: string; content: any }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

interface ChatResponse {
  content: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}

/**
 * Call OpenAI chat completions through the server-side proxy.
 * The API key never leaves the server.
 */
export async function callOpenAIChat(request: ChatRequest): Promise<ChatResponse> {
  const fn = httpsCallable<ChatRequest, ChatResponse>(functions, 'openaiChat');
  const result = await fn(request);
  return result.data;
}

// ============================================
// OpenAI Whisper Transcription (via Cloud Function)
// ============================================

interface TranscribeRequest {
  audioBase64: string;
  language?: string;
}

interface TranscribeResponse {
  text: string;
}

/**
 * Transcribe audio through the server-side Whisper proxy.
 */
export async function callOpenAITranscribe(request: TranscribeRequest): Promise<TranscribeResponse> {
  const fn = httpsCallable<TranscribeRequest, TranscribeResponse>(functions, 'openaiTranscribe');
  const result = await fn(request);
  return result.data;
}

// ============================================
// InBody OAuth Token Exchange (via Cloud Function)
// ============================================

interface InBodyTokenRequest {
  authCode: string;
}

interface InBodyTokenResponse {
  accessToken: string;
  userId: string;
}

/**
 * Exchange InBody auth code for token through the server-side proxy.
 * The client_secret never leaves the server.
 */
export async function exchangeInBodyToken(authCode: string): Promise<InBodyTokenResponse> {
  const fn = httpsCallable<InBodyTokenRequest, InBodyTokenResponse>(functions, 'inbodyTokenExchange');
  const result = await fn({ authCode });
  return result.data;
}
