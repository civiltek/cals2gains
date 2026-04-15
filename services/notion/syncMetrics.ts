/**
 * Sincronización de Métricas con Notion
 * Lee METRICS.md y sincroniza snapshots de métricas con la base de datos de Notion.
 */
import { getNotionClient, getDatabaseIds, notionHelpers, SyncResult } from './notionClient';

interface MetricSnapshot {
  period: string;
  date: string;
  channel: string;
  followers?: number;
  views28d?: number;
  reach28d?: number;
  interactions28d?: number;
  engagementRate?: string;
  notes?: string;
}

/**
 * Parsea la tabla de tendencias de METRICS.md.
 */
export function parseMetricsMarkdown(content: string): MetricSnapshot[] {
  const snapshots: MetricSnapshot[] = [];

  // Extraer fecha de recopilación
  const dateMatch = content.match(/Ultima actualizacion:\s*(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] ?? new Date().toISOString().split('T')[0];

  // Extraer periodo
  const periodMatch = content.match(/Periodo analizado:\s*(.+?)(?:\n|$)/);
  const period = periodMatch?.[1]?.trim() ?? `Semana del ${date}`;

  // Parsear tabla de tendencias
  const lines = content.split('\n');
  let inTrendsTable = false;

  for (const line of lines) {
    if (line.includes('Tendencias')) {
      inTrendsTable = true;
      continue;
    }
    if (inTrendsTable && line.trim() === '') continue;
    if (inTrendsTable && line.startsWith('*')) {
      inTrendsTable = false;
      continue;
    }
    if (inTrendsTable && line.startsWith('---')) {
      inTrendsTable = false;
      continue;
    }

    if (!inTrendsTable) continue;

    const rowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/
    );
    if (!rowMatch) continue;

    const [, channelRaw, followersRaw, viewsRaw, reachRaw, interactionsRaw] = rowMatch;
    if (channelRaw.includes('Cuenta') || channelRaw.startsWith('-')) continue;

    // Mapear nombre de canal
    const channelMap: Record<string, string> = {
      '@cals2gains (EN)': '@cals2gains',
      '@cals2gains_es (ES)': '@cals2gains_es',
      '@calstogains (EN sec.)': '@calstogains',
      'FB Cals2Gains (ES)': 'Facebook ES',
      'FB AI Nutrition (EN)': 'Facebook EN',
    };
    const channel = channelMap[channelRaw.trim()] ?? channelRaw.trim();

    const parseNum = (val: string): number | undefined => {
      const cleaned = val.replace(/[~*]/g, '').trim();
      if (cleaned === 'N/D' || cleaned === '--' || cleaned === '0') return cleaned === '0' ? 0 : undefined;
      return parseInt(cleaned, 10) || undefined;
    };

    snapshots.push({
      period,
      date,
      channel,
      followers: parseNum(followersRaw),
      views28d: parseNum(viewsRaw),
      reach28d: parseNum(reachRaw),
      interactions28d: parseNum(interactionsRaw),
    });
  }

  // También parsear datos individuales de cada sección de Instagram
  const igSections = content.split(/^###\s+@/m).slice(1);
  for (const section of igSections) {
    const accountMatch = section.match(/^(\S+)/);
    if (!accountMatch) continue;

    const account = `@${accountMatch[1].trim()}`;
    const engMatch = section.match(/Engagement rate estimado:\s*~?([\d,.%]+)/);

    // Si ya tenemos este canal en los snapshots, añadir engagement rate
    const existing = snapshots.find((s) => s.channel === account);
    if (existing && engMatch) {
      existing.engagementRate = engMatch[1];
    }
  }

  return snapshots;
}

/**
 * Obtiene snapshots existentes en Notion para evitar duplicados.
 */
async function getExistingSnapshots(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { metrics: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Periodo'];
        const channelProp = page.properties['Canal'];
        if (titleProp?.type === 'title' && titleProp.title.length > 0) {
          const channelName = channelProp?.type === 'select' ? channelProp.select?.name : '';
          const key = `${titleProp.title[0].plain_text}|${channelName}`;
          existing.set(key, page.id);
        }
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return existing;
}

/**
 * Sincroniza métricas desde METRICS.md a Notion.
 */
export async function syncMetrics(markdownContent: string): Promise<SyncResult> {
  const client = getNotionClient();
  const { metrics: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Métricas', created: 0, updated: 0, skipped: 0, errors: [] };

  const snapshots = parseMetricsMarkdown(markdownContent);
  const existing = await getExistingSnapshots();

  for (const snapshot of snapshots) {
    try {
      const properties: Record<string, any> = {
        Periodo: notionHelpers.title(snapshot.period),
        'Fecha Recopilación': notionHelpers.date(snapshot.date),
        Canal: notionHelpers.select(snapshot.channel),
      };

      if (snapshot.followers !== undefined) {
        properties['Seguidores'] = notionHelpers.number(snapshot.followers);
      }
      if (snapshot.views28d !== undefined) {
        properties['Visualizaciones 28d'] = notionHelpers.number(snapshot.views28d);
      }
      if (snapshot.reach28d !== undefined) {
        properties['Alcance 28d'] = notionHelpers.number(snapshot.reach28d);
      }
      if (snapshot.interactions28d !== undefined) {
        properties['Interacciones 28d'] = notionHelpers.number(snapshot.interactions28d);
      }
      if (snapshot.engagementRate) {
        properties['Engagement Rate'] = notionHelpers.richText(snapshot.engagementRate);
      }
      if (snapshot.notes) {
        properties['Notas'] = notionHelpers.richText(snapshot.notes);
      }

      const key = `${snapshot.period}|${snapshot.channel}`;
      const existingId = existing.get(key);

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
      result.errors.push(`${snapshot.channel}: ${err.message}`);
    }
  }

  return result;
}
