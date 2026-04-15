/**
 * Sincronización de Finanzas con Notion
 * Lee FINANCES.md y sincroniza gastos y suscripciones con Notion.
 */
import { getNotionClient, getDatabaseIds, notionHelpers, SyncResult } from './notionClient';

interface Expense {
  date: string;
  provider: string;
  concept: string;
  amountEur: number;
  originalAmount?: string;
  type: string;
  invoiceNumber?: string;
}

interface Subscription {
  service: string;
  monthlyCost: number;
  nextCharge?: string;
  status: string;
  account?: string;
  notes?: string;
}

/**
 * Normaliza fecha de formato DD/MM/YYYY a YYYY-MM-DD.
 */
function normalizeDate(dateStr: string): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

/**
 * Parsea importe del formato "18,00 €" o "111,32 € ($121 USD)".
 */
function parseAmount(amountStr: string): { eur: number; original?: string } {
  const cleaned = amountStr.replace(/\*\*/g, '').trim();
  const eurMatch = cleaned.match(/([\d.,]+)\s*€/);
  const eur = eurMatch ? parseFloat(eurMatch[1].replace('.', '').replace(',', '.')) : 0;

  const originalMatch = cleaned.match(/\((.+)\)/);
  return { eur, original: originalMatch?.[1] };
}

/**
 * Detecta el tipo de gasto basándose en el concepto.
 */
function detectExpenseType(concept: string): string {
  const text = concept.toLowerCase();
  if (text.includes('suscripción') || text.includes('mensual') || text.includes('monthly')) return 'Suscripción';
  if (text.includes('recarga') || text.includes('credits') || text.includes('pay-as-you-go')) return 'Recarga API';
  if (text.includes('prepaid') || text.includes('extra usage')) return 'Prepaid';
  return 'Pago único';
}

/**
 * Parsea la tabla de gastos de FINANCES.md.
 */
export function parseExpenses(content: string): Expense[] {
  const expenses: Expense[] = [];
  const lines = content.split('\n');

  let inExpenseTable = false;
  for (const line of lines) {
    if (line.includes('Gastos Totales Confirmados')) {
      inExpenseTable = true;
      continue;
    }
    if (inExpenseTable && line.trim() === '') {
      // Seguir buscando hasta la tabla
      continue;
    }
    if (inExpenseTable && line.startsWith('**Total')) {
      inExpenseTable = false;
      continue;
    }

    if (!inExpenseTable) continue;

    const rowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/
    );
    if (!rowMatch) continue;

    const [, dateRaw, provider, concept, amountRaw] = rowMatch;
    if (dateRaw.includes('Fecha') || dateRaw.startsWith('-')) continue;

    const date = normalizeDate(dateRaw.trim());
    const { eur, original } = parseAmount(amountRaw);

    expenses.push({
      date,
      provider: provider.trim(),
      concept: concept.trim(),
      amountEur: eur,
      originalAmount: original,
      type: detectExpenseType(concept),
    });
  }

  return expenses;
}

/**
 * Parsea la tabla de suscripciones activas de FINANCES.md.
 */
export function parseSubscriptions(content: string): Subscription[] {
  const subs: Subscription[] = [];
  const lines = content.split('\n');

  let inSubTable = false;
  for (const line of lines) {
    if (line.includes('Suscripciones Activas')) {
      inSubTable = true;
      continue;
    }
    if (inSubTable && line.startsWith('**Coste mensual')) {
      inSubTable = false;
      continue;
    }

    if (!inSubTable) continue;

    const rowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/
    );
    if (!rowMatch) continue;

    const [, service, costRaw, nextChargeRaw, statusRaw] = rowMatch;
    if (service.includes('Servicio') || service.startsWith('-')) continue;

    const { eur } = parseAmount(costRaw);

    // Parsear próximo cobro
    const dateMatch = nextChargeRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const nextCharge = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      : undefined;

    // Extraer cuenta del status si viene entre paréntesis
    const accountMatch = statusRaw.match(/\(([^)]+)\)/);

    subs.push({
      service: service.trim(),
      monthlyCost: eur,
      nextCharge,
      status: statusRaw.includes('Activa') ? 'Activa' : 'Pendiente',
      account: accountMatch?.[1],
    });
  }

  return subs;
}

/**
 * Obtiene gastos existentes en Notion para evitar duplicados.
 */
async function getExistingExpenses(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { finances: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Concepto'];
        if (titleProp?.type === 'title' && titleProp.title.length > 0) {
          const dateProp = page.properties['Fecha'];
          const dateStr = dateProp?.type === 'date' && dateProp.date?.start
            ? dateProp.date.start : '';
          const key = `${titleProp.title[0].plain_text}|${dateStr}`;
          existing.set(key, page.id);
        }
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return existing;
}

/**
 * Obtiene suscripciones existentes en Notion.
 */
async function getExistingSubs(): Promise<Map<string, string>> {
  const client = getNotionClient();
  const { subscriptions: dbId } = getDatabaseIds();
  const existing = new Map<string, string>();

  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if ('properties' in page) {
        const titleProp = page.properties['Servicio'];
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
 * Sincroniza gastos desde FINANCES.md a Notion.
 */
export async function syncFinances(markdownContent: string): Promise<SyncResult> {
  const client = getNotionClient();
  const { finances: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Finanzas', created: 0, updated: 0, skipped: 0, errors: [] };

  const expenses = parseExpenses(markdownContent);
  const existing = await getExistingExpenses();

  for (const expense of expenses) {
    try {
      const properties: Record<string, any> = {
        Concepto: notionHelpers.title(expense.concept),
        Fecha: notionHelpers.date(expense.date),
        Proveedor: notionHelpers.select(expense.provider),
        'Importe (EUR)': notionHelpers.number(expense.amountEur),
        Tipo: notionHelpers.select(expense.type),
      };

      if (expense.originalAmount) {
        properties['Importe Original'] = notionHelpers.richText(expense.originalAmount);
      }
      if (expense.invoiceNumber) {
        properties['Nº Factura'] = notionHelpers.richText(expense.invoiceNumber);
      }

      const key = `${expense.concept}|${expense.date}`;
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
      result.errors.push(`${expense.concept}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Sincroniza suscripciones desde FINANCES.md a Notion.
 */
export async function syncSubscriptions(markdownContent: string): Promise<SyncResult> {
  const client = getNotionClient();
  const { subscriptions: dbId } = getDatabaseIds();
  const result: SyncResult = { database: 'Suscripciones', created: 0, updated: 0, skipped: 0, errors: [] };

  const subs = parseSubscriptions(markdownContent);
  const existing = await getExistingSubs();

  for (const sub of subs) {
    try {
      const properties: Record<string, any> = {
        Servicio: notionHelpers.title(sub.service),
        'Coste Mensual (EUR)': notionHelpers.number(sub.monthlyCost),
        Estado: notionHelpers.select(sub.status),
      };

      if (sub.nextCharge) {
        properties['Próximo Cobro'] = notionHelpers.date(sub.nextCharge);
      }
      if (sub.account) {
        properties['Cuenta'] = notionHelpers.richText(sub.account);
      }
      if (sub.notes) {
        properties['Notas'] = notionHelpers.richText(sub.notes);
      }

      const existingId = existing.get(sub.service);
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
      result.errors.push(`${sub.service}: ${err.message}`);
    }
  }

  return result;
}
