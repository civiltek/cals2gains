/**
 * Notion Client - Inicialización y configuración del SDK de Notion
 * Servicio base para la integración del hub completo con Notion.
 */
import { Client } from '@notionhq/client';

// --- Tipos base ---

export interface NotionConfig {
  apiKey: string;
  parentPageId: string; // Página padre donde se crean las bases de datos
}

export interface DatabaseIds {
  features: string;
  changelog: string;
  finances: string;
  subscriptions: string;
  metrics: string;
  contentPlan: string;
  bugs: string;
}

export interface SyncResult {
  database: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// --- Cliente singleton ---

let notionClient: Client | null = null;
let currentConfig: NotionConfig | null = null;
let databaseIds: DatabaseIds | null = null;

/**
 * Inicializa el cliente de Notion con la API key.
 * Se llama una vez al arrancar o al configurar.
 */
export function initNotion(config: NotionConfig): Client {
  notionClient = new Client({ auth: config.apiKey });
  currentConfig = config;
  return notionClient;
}

/**
 * Obtiene el cliente de Notion inicializado.
 * Lanza error si no se ha llamado a initNotion().
 */
export function getNotionClient(): Client {
  if (!notionClient) {
    throw new Error(
      'Notion no inicializado. Llama a initNotion() primero con tu API key.'
    );
  }
  return notionClient;
}

/**
 * Obtiene la configuración actual de Notion.
 */
export function getNotionConfig(): NotionConfig {
  if (!currentConfig) {
    throw new Error('Notion no configurado. Llama a initNotion() primero.');
  }
  return currentConfig;
}

/**
 * Guarda los IDs de las bases de datos creadas en Notion.
 */
export function setDatabaseIds(ids: DatabaseIds): void {
  databaseIds = ids;
}

/**
 * Obtiene los IDs de las bases de datos.
 */
export function getDatabaseIds(): DatabaseIds {
  if (!databaseIds) {
    throw new Error(
      'Database IDs no configurados. Ejecuta el setup primero (notion-cli setup).'
    );
  }
  return databaseIds;
}

/**
 * Verifica la conexión con la API de Notion.
 */
export async function verifyConnection(): Promise<{
  ok: boolean;
  user?: string;
  error?: string;
}> {
  try {
    const client = getNotionClient();
    const me = await client.users.me({});
    return {
      ok: true,
      user: me.name ?? me.id,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? String(err),
    };
  }
}

// --- Helpers para propiedades de Notion ---

export const notionHelpers = {
  title(text: string) {
    return { title: [{ text: { content: text } }] };
  },

  richText(text: string) {
    return { rich_text: [{ text: { content: text } }] };
  },

  number(value: number) {
    return { number: value };
  },

  select(name: string) {
    return { select: { name } };
  },

  multiSelect(names: string[]) {
    return { multi_select: names.map((name) => ({ name })) };
  },

  date(dateStr: string, endStr?: string) {
    return { date: { start: dateStr, ...(endStr ? { end: endStr } : {}) } };
  },

  checkbox(checked: boolean) {
    return { checkbox: checked };
  },

  url(url: string) {
    return { url };
  },

  email(email: string) {
    return { email };
  },
};
