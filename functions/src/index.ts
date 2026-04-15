import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// ============================================
// Rate limiting helper
// ============================================

const DAILY_LIMIT = 100; // max OpenAI calls per user per day

async function checkRateLimit(uid: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ref = db.doc(`apiUsage/${uid}_${today}`);
  const snap = await ref.get();

  const current = snap.exists ? (snap.data()?.count ?? 0) : 0;
  if (current >= DAILY_LIMIT) {
    throw new HttpsError(
      "resource-exhausted",
      `Daily API limit reached (${DAILY_LIMIT} calls/day). Try again tomorrow.`
    );
  }

  await ref.set(
    { count: FieldValue.increment(1), uid, date: today },
    { merge: true }
  );
}

// ============================================
// OpenAI Chat Completions Proxy
// ============================================

export const openaiChat = onCall(
  { region: "europe-west1", memory: "256MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "OpenAI API key not configured on server.");
    }

    const { messages, model, max_tokens, temperature } = request.data;

    if (!messages || !Array.isArray(messages)) {
      throw new HttpsError("invalid-argument", "messages array is required.");
    }

    // Whitelist allowed models
    const allowedModels = ["gpt-5.4", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
    const safeModel = allowedModels.includes(model) ? model : "gpt-5.4";
    const safeMaxTokens = Math.min(max_tokens || 1000, 4000);

    await checkRateLimit(request.auth.uid);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: safeModel,
        messages,
        max_tokens: safeMaxTokens,
        ...(temperature !== undefined && { temperature }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const msg = (error as any)?.error?.message || `OpenAI API error ${response.status}`;
      if (response.status === 429) {
        throw new HttpsError("resource-exhausted", msg);
      }
      throw new HttpsError("internal", msg);
    }

    const data = await response.json();
    return {
      content: (data as any).choices?.[0]?.message?.content ?? null,
      usage: (data as any).usage ?? null,
    };
  }
);

// ============================================
// OpenAI Whisper Transcription Proxy
// ============================================

export const openaiTranscribe = onCall(
  { region: "europe-west1", memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "OpenAI API key not configured on server.");
    }

    const { audioBase64, language } = request.data;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      throw new HttpsError("invalid-argument", "audioBase64 string is required.");
    }

    // Limit audio size (10 MB base64 ≈ 7.5 MB raw)
    if (audioBase64.length > 10 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Audio file too large (max 10 MB).");
    }

    await checkRateLimit(request.auth.uid);

    // Convert base64 to buffer and create form data
    const buffer = Buffer.from(audioBase64, "base64");
    const blob = new Blob([buffer], { type: "audio/m4a" });

    const formData = new FormData();
    formData.append("file", blob, "recording.m4a");
    formData.append("model", "whisper-1");
    if (language) {
      formData.append("language", language);
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new HttpsError(
        "internal",
        (error as any)?.error?.message || `Whisper API error ${response.status}`
      );
    }

    const data = await response.json();
    return { text: (data as any).text || "" };
  }
);

// ============================================
// InBody OAuth Token Exchange Proxy
// ============================================

export const inbodyTokenExchange = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const clientId = process.env.INBODY_CLIENT_ID;
    const clientSecret = process.env.INBODY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new HttpsError("internal", "InBody credentials not configured on server.");
    }

    const { authCode } = request.data;

    if (!authCode || typeof authCode !== "string") {
      throw new HttpsError("invalid-argument", "authCode string is required.");
    }

    const response = await fetch("https://api.inbody.com/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: "cals2gains://inbody-callback",
      }),
    });

    if (!response.ok) {
      throw new HttpsError("internal", `InBody token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: (data as any).access_token,
      userId: (data as any).user_id,
    };
  }
);
