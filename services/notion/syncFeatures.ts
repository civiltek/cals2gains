/**
 * Sincronización de Features con Notion
 * Lee FEATURES.md y lo sincroniza con la base de datos de Features en Notion.
 */
import { getNotionClient, getDatabaseIds, notionHelpers, SyncResult } from './notionClient';

interface Feature {
  name: string;
  file: string;
  status: string;
  category: string;
  bugDescription?: string;
}

const STATUS_MAP: Record<string, string> = {
  '✅': 'Implementado',
  '🔧': 'Bug conocido',
  '🚧': 'En progreso',
  '⏳': 'Pendiente',
};

/**
 * Parsea FEATURES.md y extrae las features con su estado.
 */
export function parseFeaturesMarkdown(content: string): Feature[] {
  const features: Feature[] = [];
  let currentCategory = '';

  const lines = content.split('\n');

  for (const line of lines) {
    // Detectar categoría (### heading)
    const categoryMatch = line.match(/^###\s+(.+)/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      continue;
    }

    // Detectar fila de tabla con feature
    const rowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*`?([^|`]*)`?\s*\|\s*(.+?)\s*\|$/
    );
    if (rowMatch) {
      const [, name, file, statusRaw] = rowMatch;
      if (name === 'Feature' || name === '---' || name.startsWith('-')) continue;

      const statusEmoji = statusRaw.trim().charAt(0) + statusRaw.trim().charAt(1);
      const status = STATUS_MAP[statusEmoji] ?? STATUS_MAP[statusRaw.trim().charAt(0)] ?? 'Pendiente';

      let bugDescription: string | undefined;
      if (status === 'Bug conocido') {
        const bugMatch = statusRaw.match(/🔧\s*(.+)/);
        if (bugMatch) bugDescription = bugMatch[1].trim();
      }

      features.push({
        name: name.trim(),
        file: file.trim(),
        status,
        category: currentCategory,
        bugDescription,
      });
    }
  }

  return features;
}

/**
 * Obtiene todas las features existentes en Notion para evitar duplicados.
 */
async function getExistingFeatures(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { features: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Feature'];
        if (titleProp?.type === 'title' && titleProp.title.length > 0) {
          existing.set(titleProp.title[0].plain_text, page.id);
        }
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return existing;
}

/**
 * Sincroniza features desde FEATURES.md a Notion.
 */
export async function syncFeatures(markdownContent: string): Promise<SyncResult> {
  const client = getNotionClient();
  const { features: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Features', created: 0, updated: 0, skipped: 0, errors: [] };

  const features = parseFeaturesMarkdown(markdownContent);
  const existing = await getExistingFeatures();

  for (const feature of features) {
    try {
      const properties: Record<string, any> = {
        Feature: notionHelpers.title(feature.name),
        Estado: notionHelpers.select(feature.status),
        Archivo: notionHelpers.richText(feature.file),
      };

      // Mapear categoría del markdown a la opción de Notion
      const categoryMap: Record<string, string> = {
        'Onboarding y Autenticación': 'Onboarding',
        'Core - Registro de Comidas': 'Core',
        'Tracking y Métricas': 'Tracking',
        'IA y Coaching': 'IA/Coaching',
        'Utilidades': 'Utilidades',
        'Infraestructura': 'Infraestructura',
      };
      const mappedCategory = categoryMap[feature.category] ?? feature.category;
      if (mappedCategory) {
        properties['Categoría'] = notionHelpers.select(mappedCategory);
      }

      if (feature.bugDescription) {
        properties['Bug Descripción'] = notionHelpers.richText(feature.bugDescription);
      }

      const existingId = existing.get(feature.name);
      if (existingId) {
        await client.pages.update({ page_id: existingId, properties });
        result.updated++;
      } else {
        await client.pages.create({
          parent: { database_id: dbId },
          properties,
        });
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`${feature.name}: ${err.message}`);
    }
  }

  return result;
}
