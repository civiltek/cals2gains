/**
 * Sincronización de Plan de Contenido con Notion
 * Lee CONTENT_PLAN.md y sincroniza el calendario con la base de datos de Notion.
 */
import { getNotionClient, getDatabaseIds, notionHelpers, SyncResult } from './notionClient';

interface ContentItem {
  title: string;
  account: string;
  type: string;
  status: string;
  phase: string;
  dateRange?: string;
  tema?: string;
}

/**
 * Parsea CONTENT_PLAN.md y extrae los items del calendario.
 */
export function parseContentPlanMarkdown(content: string): ContentItem[] {
  const items: ContentItem[] = [];
  const lines = content.split('\n');

  let currentAccount = '';
  let currentPhase = 'Fase 1 - Pre-lanzamiento';

  for (const line of lines) {
    // Detectar fase
    const phaseMatch = line.match(/^##\s+Fase\s+(\d+):\s*(.+)/);
    if (phaseMatch) {
      currentPhase = `Fase ${phaseMatch[1]} - ${phaseMatch[2].trim().split('(')[0].trim()}`;
      continue;
    }

    // Detectar cuenta (### Instagram ES, ### Instagram EN, ### Reels, ### Facebook)
    const accountMatch = line.match(/^###\s+(Instagram\s+\w+|Reels|Facebook)\s*(\(.+\))?/);
    if (accountMatch) {
      const accountMap: Record<string, string> = {
        'Instagram ES': '@cals2gains_es',
        'Instagram EN': '@cals2gains',
        'Reels': '@cals2gains_es', // Reels van a la cuenta principal por defecto
        'Facebook': 'Facebook ES',
      };
      const accountKey = accountMatch[1].trim();
      currentAccount = accountMap[accountKey] ?? accountKey;
      continue;
    }

    // Detectar filas de tabla de posts
    const postRowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/
    );
    if (postRowMatch && currentAccount) {
      const [, idRaw, tema, statusRaw, dateRange] = postRowMatch;
      if (idRaw.includes('#') && idRaw.includes('Tema')) continue;
      if (idRaw.startsWith('-')) continue;

      // Mapear status
      const statusMap: Record<string, string> = {
        '✅ Programado en MBS': 'Programado',
        '✅ Programado': 'Programado',
        '✅ Asset creado': 'Aprobado',
        '❌ Pendiente programar': 'Borrador',
        '❌ Pendiente': 'Borrador',
        '🚧 En progreso': 'Borrador',
      };
      const status = statusMap[statusRaw.trim()] ?? 'Borrador';

      // Determinar tipo
      const isReel = currentAccount.includes('Reel') || tema.toLowerCase().includes('reel');
      const type = isReel ? 'Reel' : 'Post';

      items.push({
        title: `${idRaw.trim()} - ${tema.trim()}`,
        account: currentAccount,
        type,
        status,
        phase: currentPhase,
        dateRange: dateRange.trim() !== '—' ? dateRange.trim() : undefined,
        tema: tema.trim(),
      });
    }

    // Detectar filas de tabla de reels
    const reelRowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/
    );
    if (reelRowMatch && line.includes('Reel') || (reelRowMatch && line.includes('Demo'))) {
      const [, reelName, idioma, statusRaw] = reelRowMatch;
      if (reelName.includes('Reel') && !reelName.includes('---')) {
        if (reelName.trim() === 'Reel') continue; // Header

        const accountForReel = idioma.trim() === 'ES' ? '@cals2gains_es' : '@cals2gains';
        const status = statusRaw.includes('✅') ? 'Aprobado' : 'Borrador';

        items.push({
          title: reelName.trim(),
          account: accountForReel,
          type: 'Reel',
          status,
          phase: currentPhase,
          tema: reelName.trim(),
        });
      }
    }
  }

  return items;
}

/**
 * Obtiene items existentes en Notion.
 */
async function getExistingItems(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { contentPlan: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Título'];
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
 * Sincroniza plan de contenido desde CONTENT_PLAN.md a Notion.
 */
export async function syncContentPlan(markdownContent: string): Promise<SyncResult> {
  const client = getNotionClient();
  const { contentPlan: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Calendario de Contenido', created: 0, updated: 0, skipped: 0, errors: [] };

  const items = parseContentPlanMarkdown(markdownContent);
  const existing = await getExistingItems();

  for (const item of items) {
    try {
      const properties: Record<string, any> = {
        'Título': notionHelpers.title(item.title),
        Cuenta: notionHelpers.select(item.account),
        Tipo: notionHelpers.select(item.type),
        Estado: notionHelpers.select(item.status),
        Fase: notionHelpers.select(item.phase),
      };

      if (item.tema) {
        properties['Tema'] = notionHelpers.richText(item.tema);
      }

      const existingId = existing.get(item.title);
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
      result.errors.push(`${item.title}: ${err.message}`);
    }
  }

  return result;
}
