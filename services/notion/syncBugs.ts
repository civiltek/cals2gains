/**
 * Sincronización de Bugs con Notion
 * Extrae bugs conocidos de PROJECT_STATUS.md y FEATURES.md y los sincroniza con Notion.
 */
import { getNotionClient, getDatabaseIds, notionHelpers, SyncResult } from './notionClient';

interface Bug {
  title: string;
  status: string;
  priority: string;
  component: string;
  description: string;
  platform: string;
  reportDate?: string;
  resolutionDate?: string;
  buildAffected?: string;
}

/**
 * Parsea bugs de PROJECT_STATUS.md (secciones "Bugs Conocidos" y "Bugs Resueltos").
 */
export function parseBugsFromStatus(content: string): Bug[] {
  const bugs: Bug[] = [];
  const lines = content.split('\n');

  let section = '';
  let currentBug: Partial<Bug> | null = null;

  for (const line of lines) {
    if (line.includes('Bugs Conocidos')) {
      section = 'open';
      continue;
    }
    if (line.includes('Bugs Resueltos')) {
      section = 'resolved';
      continue;
    }
    if (line.startsWith('## ') && !line.includes('Bug')) {
      section = '';
      continue;
    }

    if (!section) continue;

    // Detectar bug por bullet con negrita
    const bugMatch = line.match(/^-\s+\*\*(.+?)\*\*[:\s]*(.+)?/);
    if (bugMatch) {
      if (currentBug?.title) {
        bugs.push(currentBug as Bug);
      }

      const title = bugMatch[1].trim();
      const description = bugMatch[2]?.trim() ?? '';

      // Detectar fecha de resolución
      const dateMatch = title.match(/\[(\d{2}\/\d{2}(?:\s+[\d:]+)?)\]/);
      const resolutionDate = dateMatch ? normalizeDateShort(dateMatch[1]) : undefined;

      // Detectar prioridad basándose en palabras clave
      const text = `${title} ${description}`.toLowerCase();
      let priority = 'Media';
      if (text.includes('crash') || text.includes('crítico')) priority = 'Crítica';
      else if (text.includes('error') || text.includes('fail')) priority = 'Alta';
      else if (text.includes('edge case') || text.includes('cosmético')) priority = 'Baja';

      // Detectar plataforma
      let platform = 'Todas';
      if (text.includes('android') && !text.includes('ios')) platform = 'Android';
      else if (text.includes('ios') && !text.includes('android')) platform = 'iOS';
      else if (text.includes('web')) platform = 'Web';

      currentBug = {
        title: title.replace(/\[[\d/\s:]+\]\s*/, ''), // Limpiar fecha del título
        status: section === 'open' ? 'Abierto' : 'Resuelto',
        priority,
        component: detectComponent(title, description),
        description,
        platform,
        resolutionDate,
      };
      continue;
    }

    // Líneas de continuación (indentadas o sub-bullets)
    if (currentBug && line.match(/^\s+[-*]\s+/)) {
      const detail = line.trim().replace(/^[-*]\s+/, '');
      currentBug.description = `${currentBug.description}\n${detail}`;

      // Detectar build afectado
      const buildMatch = detail.match(/build[:\s]+`?([a-f0-9-]+)`?/i);
      if (buildMatch) {
        currentBug.buildAffected = buildMatch[1];
      }
    }
  }

  // Añadir último bug
  if (currentBug?.title) {
    bugs.push(currentBug as Bug);
  }

  return bugs;
}

/**
 * Extrae bugs de FEATURES.md (features con estado 🔧).
 */
export function parseBugsFromFeatures(content: string): Bug[] {
  const bugs: Bug[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.includes('🔧')) continue;

    const rowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*`?([^|`]*)`?\s*\|\s*🔧\s*(.+?)\s*\|$/
    );
    if (!rowMatch) continue;

    const [, featureName, file, bugDesc] = rowMatch;

    bugs.push({
      title: `${featureName.trim()} - ${bugDesc.trim()}`,
      status: 'Abierto',
      priority: 'Alta',
      component: file.trim(),
      description: bugDesc.trim(),
      platform: 'Todas',
    });
  }

  return bugs;
}

/**
 * Detecta el componente afectado basándose en el texto.
 */
function detectComponent(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('firebase storage') || text.includes('storage')) return 'Firebase Storage';
  if (text.includes('firebase') || text.includes('firestore')) return 'Firebase/Firestore';
  if (text.includes('notification')) return 'expo-notifications';
  if (text.includes('reanimated') || text.includes('worklet')) return 'react-native-reanimated';
  if (text.includes('camera')) return 'expo-camera';
  if (text.includes('water')) return 'Water Tracker';
  if (text.includes('theme') || text.includes('tema') || text.includes('dark')) return 'Theme/UI';
  return 'General';
}

/**
 * Normaliza fecha corta (13/04) a ISO completa (con año actual).
 */
function normalizeDateShort(dateStr: string): string {
  const parts = dateStr.trim().split('/');
  if (parts.length === 2) {
    return `2026-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Obtiene bugs existentes en Notion.
 */
async function getExistingBugs(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { bugs: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Bug'];
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
 * Sincroniza bugs desde PROJECT_STATUS.md y FEATURES.md a Notion.
 */
export async function syncBugs(
  statusContent: string,
  featuresContent: string
): Promise<SyncResult> {
  const client = getNotionClient();
  const { bugs: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Bugs', created: 0, updated: 0, skipped: 0, errors: [] };

  const statusBugs = parseBugsFromStatus(statusContent);
  const featureBugs = parseBugsFromFeatures(featuresContent);

  // Combinar, evitando duplicados por título
  const allBugs = [...statusBugs];
  for (const fb of featureBugs) {
    if (!allBugs.some((b) => b.title === fb.title)) {
      allBugs.push(fb);
    }
  }

  const existing = await getExistingBugs();

  for (const bug of allBugs) {
    try {
      const truncatedTitle = bug.title.length > 100
        ? bug.title.substring(0, 97) + '...'
        : bug.title;

      const properties: Record<string, any> = {
        Bug: notionHelpers.title(truncatedTitle),
        Estado: notionHelpers.select(bug.status),
        Prioridad: notionHelpers.select(bug.priority),
        Componente: notionHelpers.richText(bug.component),
        'Pasos para reproducir': notionHelpers.richText(
          bug.description.substring(0, 2000)
        ),
        Plataforma: notionHelpers.select(bug.platform),
      };

      if (bug.reportDate) {
        properties['Fecha Reporte'] = notionHelpers.date(bug.reportDate);
      }
      if (bug.resolutionDate) {
        properties['Fecha Resolución'] = notionHelpers.date(bug.resolutionDate);
      }
      if (bug.buildAffected) {
        properties['Build Afectado'] = notionHelpers.richText(bug.buildAffected);
      }

      const existingId = existing.get(truncatedTitle);
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
      result.errors.push(`${bug.title.substring(0, 50)}: ${err.message}`);
    }
  }

  return result;
}
