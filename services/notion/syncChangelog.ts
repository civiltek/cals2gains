/**
 * Sincronización de Changelog con Notion
 * Lee CHANGELOG.md y sincroniza las entradas con la base de datos de Changelog.
 */
import { getNotionClient, getDatabaseIds, notionHelpers, SyncResult } from './notionClient';

interface ChangelogEntry {
  title: string;
  date: string; // ISO format
  type: string;
  details: string[];
  agent?: string;
}

/**
 * Detecta el tipo de cambio basándose en palabras clave del título/detalle.
 */
function detectChangeType(title: string, details: string): string {
  const text = `${title} ${details}`.toLowerCase();
  if (text.includes('fix') || text.includes('corregir') || text.includes('corregido') || text.includes('bug')) return 'Fix';
  if (text.includes('build') || text.includes('eas') || text.includes('apk')) return 'Build';
  if (text.includes('marketing') || text.includes('post') || text.includes('reel') || text.includes('brevo') || text.includes('email')) return 'Marketing';
  if (text.includes('financ') || text.includes('recibo') || text.includes('gasto')) return 'Finanzas';
  if (text.includes('motor') || text.includes('engine') || text.includes('refactor')) return 'Mejora';
  if (text.includes('infraestructura') || text.includes('deploy') || text.includes('firebase') || text.includes('config')) return 'Infraestructura';
  return 'Feature';
}

/**
 * Detecta el agente responsable basándose en el contenido.
 */
function detectAgent(title: string, details: string): string | undefined {
  const text = `${title} ${details}`.toLowerCase();
  if (text.includes('marketing') || text.includes('post') || text.includes('reel') || text.includes('brevo') || text.includes('content')) return 'marketing';
  if (text.includes('financ') || text.includes('recibo') || text.includes('dashboard')) return 'finance';
  if (text.includes('landing') || text.includes('seo') || text.includes('firebase hosting') || text.includes('website')) return 'web-dev';
  if (text.includes('métrica') || text.includes('analytics') || text.includes('ga4') || text.includes('growth')) return 'growth';
  if (text.includes('build') || text.includes('expo') || text.includes('react native') || text.includes('android') || text.includes('ios') || text.includes('reanimated')) return 'app-dev';
  if (text.includes('reorganización') || text.includes('limpieza') || text.includes('estructura')) return 'ops';
  return undefined;
}

/**
 * Parsea CHANGELOG.md y extrae las entradas estructuradas.
 */
export function parseChangelogMarkdown(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const sections = content.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const headerLine = lines[0].trim();

    // Extraer fecha del header: "2026-04-14 (noche) — Descripción"
    const dateMatch = headerLine.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const titleMatch = headerLine.match(/^[\d-]+(?:\s*\([^)]*\))?\s*(?:—\s*)?(.+)?/);
    const title = titleMatch?.[1]?.trim() ?? headerLine;

    // Recoger subsecciones como detalles
    const details: string[] = [];
    const subSections = section.split(/^### /m).slice(1);

    if (subSections.length > 0) {
      for (const sub of subSections) {
        const subLines = sub.split('\n');
        const subTitle = subLines[0].trim();
        const subDetails = subLines
          .slice(1)
          .filter((l) => l.trim().startsWith('-'))
          .map((l) => l.trim().replace(/^-\s*/, ''))
          .slice(0, 5); // Máximo 5 bullets por subsección

        if (subTitle) {
          details.push(`**${subTitle}**: ${subDetails.join('; ')}`);
        }
      }
    } else {
      // Sin subsecciones: recoger bullets directos
      const bullets = lines
        .filter((l) => l.trim().startsWith('-'))
        .map((l) => l.trim().replace(/^-\s*/, ''))
        .slice(0, 8);
      details.push(...bullets);
    }

    const detailText = details.join('\n');
    const type = detectChangeType(title, detailText);
    const agent = detectAgent(title, detailText);

    entries.push({ title, date, type, details, agent });
  }

  return entries;
}

/**
 * Obtiene entradas existentes en Notion para evitar duplicados.
 */
async function getExistingEntries(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { changelog: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Entrada'];
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
 * Sincroniza changelog desde CHANGELOG.md a Notion.
 */
export async function syncChangelog(markdownContent: string): Promise<SyncResult> {
  const client = getNotionClient();
  const { changelog: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Changelog', created: 0, updated: 0, skipped: 0, errors: [] };

  const entries = parseChangelogMarkdown(markdownContent);
  const existing = await getExistingEntries();

  for (const entry of entries) {
    try {
      // Truncar título a 100 chars (límite Notion para title)
      const truncatedTitle = entry.title.length > 100
        ? entry.title.substring(0, 97) + '...'
        : entry.title;

      const properties: Record<string, any> = {
        Entrada: notionHelpers.title(truncatedTitle),
        Fecha: notionHelpers.date(entry.date),
        Tipo: notionHelpers.select(entry.type),
        Detalle: notionHelpers.richText(
          entry.details.join('\n').substring(0, 2000) // Límite Notion rich_text
        ),
      };

      if (entry.agent) {
        properties['Agente'] = notionHelpers.select(entry.agent);
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
      result.errors.push(`${entry.title.substring(0, 50)}: ${err.message}`);
    }
  }

  return result;
}
