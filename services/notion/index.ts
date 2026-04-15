/**
 * Notion Integration - Punto de entrada
 * Exporta todos los servicios de integración con Notion para Cals2Gains.
 *
 * Uso:
 *   import { setup, syncAll, syncOne, addChangelogEntry } from './services/notion';
 */

// Cliente y tipos
export {
  initNotion,
  getNotionClient,
  getNotionConfig,
  getDatabaseIds,
  setDatabaseIds,
  verifyConnection,
  notionHelpers,
  type NotionConfig,
  type DatabaseIds,
  type SyncResult,
} from './notionClient';

// Setup de bases de datos
export { createAllDatabases, verifyDatabases } from './databases';

// Orquestador de sincronización
export { setup, syncAll, syncOne, addChangelogEntry } from './notionSync';

// Módulos individuales de sincronización
export { syncFeatures, parseFeaturesMarkdown } from './syncFeatures';
export { syncChangelog, parseChangelogMarkdown } from './syncChangelog';
export { syncFinances, syncSubscriptions, parseExpenses, parseSubscriptions } from './syncFinances';
export { syncMetrics, parseMetricsMarkdown } from './syncMetrics';
export { syncContentPlan, parseContentPlanMarkdown } from './syncContentPlan';
export { syncBugs, parseBugsFromStatus, parseBugsFromFeatures } from './syncBugs';
