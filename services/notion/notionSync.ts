/**
 * Notion Sync - Orquestador de sincronización completa
 * Coordina la sincronización de todos los archivos del hub con Notion.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  initNotion,
  setDatabaseIds,
  getDatabaseIds,
  verifyConnection,
  NotionConfig,
  DatabaseIds,
  SyncResult,
} from './notionClient';
import { createAllDatabases, verifyDatabases } from './databases';
import { syncFeatures } from './syncFeatures';
import { syncChangelog } from './syncChangelog';
import { syncFinances, syncSubscriptions } from './syncFinances';
import { syncMetrics } from './syncMetrics';
import { syncContentPlan } from './syncContentPlan';
import { syncBugs } from './syncBugs';

// Ruta al config file donde se guardan los IDs de las bases de datos
const CONFIG_FILE = path.join(__dirname, '..', '..', '.notion-config.json');

// Ruta al hub de proyecto
const HUB_DIR = path.join(__dirname, '..', '..', '_project-hub');

/**
 * Lee un archivo del hub.
 */
function readHubFile(filename: string): string {
  const filePath = path.join(HUB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo del hub no encontrado: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Guarda la configuración de Notion (IDs de bases de datos) en disco.
 */
function saveConfig(ids: DatabaseIds): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(ids, null, 2), 'utf-8');
  console.log(`💾 Configuración guardada en ${CONFIG_FILE}`);
}

/**
 * Carga la configuración de Notion desde disco.
 */
function loadConfig(): DatabaseIds | null {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Setup completo: crea las bases de datos en Notion y guarda la configuración.
 */
export async function setup(config: NotionConfig): Promise<DatabaseIds> {
  console.log('🚀 Iniciando setup de Notion para Cals2Gains...\n');

  // Inicializar cliente
  initNotion(config);

  // Verificar conexión
  console.log('🔑 Verificando conexión con Notion...');
  const conn = await verifyConnection();
  if (!conn.ok) {
    throw new Error(`Error de conexión: ${conn.error}`);
  }
  console.log(`  ✅ Conectado como: ${conn.user}\n`);

  // Crear bases de datos
  const ids = await createAllDatabases();

  // Guardar configuración
  setDatabaseIds(ids);
  saveConfig(ids);

  console.log('\n📋 IDs de bases de datos creadas:');
  for (const [name, id] of Object.entries(ids)) {
    console.log(`  ${name}: ${id}`);
  }

  return ids;
}

/**
 * Sincronización completa: sincroniza todos los archivos del hub con Notion.
 */
export async function syncAll(config: NotionConfig): Promise<SyncResult[]> {
  console.log('\n🔄 Iniciando sincronización completa con Notion...\n');

  // Inicializar cliente
  initNotion(config);

  // Cargar IDs de bases de datos
  const ids = loadConfig();
  if (!ids) {
    throw new Error(
      'No se encontró configuración de Notion. Ejecuta "setup" primero.'
    );
  }
  setDatabaseIds(ids);

  // Verificar que las bases de datos existen
  console.log('🔍 Verificando bases de datos...');
  const valid = await verifyDatabases(ids);
  if (!valid) {
    throw new Error(
      'Algunas bases de datos no son accesibles. Ejecuta "setup" de nuevo.'
    );
  }
  console.log('');

  const results: SyncResult[] = [];

  // 1. Features
  try {
    console.log('📱 Sincronizando Features...');
    const featuresContent = readHubFile('FEATURES.md');
    const r = await syncFeatures(featuresContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Features', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // 2. Changelog
  try {
    console.log('📝 Sincronizando Changelog...');
    const changelogContent = readHubFile('CHANGELOG.md');
    const r = await syncChangelog(changelogContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Changelog', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // 3. Finanzas
  try {
    console.log('💰 Sincronizando Finanzas...');
    const financesContent = readHubFile('FINANCES.md');
    const r = await syncFinances(financesContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Finanzas', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // 4. Suscripciones
  try {
    console.log('🔄 Sincronizando Suscripciones...');
    const financesContent = readHubFile('FINANCES.md');
    const r = await syncSubscriptions(financesContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Suscripciones', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // 5. Métricas
  try {
    console.log('📊 Sincronizando Métricas...');
    const metricsContent = readHubFile('METRICS.md');
    const r = await syncMetrics(metricsContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Métricas', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // 6. Calendario de Contenido
  try {
    console.log('📅 Sincronizando Calendario de Contenido...');
    const contentContent = readHubFile('CONTENT_PLAN.md');
    const r = await syncContentPlan(contentContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Calendario', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // 7. Bugs
  try {
    console.log('🐛 Sincronizando Bugs...');
    const statusContent = readHubFile('PROJECT_STATUS.md');
    const featuresContent = readHubFile('FEATURES.md');
    const r = await syncBugs(statusContent, featuresContent);
    results.push(r);
    console.log(`  ✅ ${r.created} creadas, ${r.updated} actualizadas`);
    if (r.errors.length) console.log(`  ⚠️ ${r.errors.length} errores`);
  } catch (err: any) {
    console.error(`  ❌ Error: ${err.message}`);
    results.push({ database: 'Bugs', created: 0, updated: 0, skipped: 0, errors: [err.message] });
  }

  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMEN DE SINCRONIZACIÓN');
  console.log('='.repeat(50));

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const r of results) {
    const status = r.errors.length === 0 ? '✅' : '⚠️';
    console.log(
      `${status} ${r.database}: ${r.created} nuevas, ${r.updated} actualizadas${
        r.errors.length ? `, ${r.errors.length} errores` : ''
      }`
    );
    totalCreated += r.created;
    totalUpdated += r.updated;
    totalErrors += r.errors.length;
  }

  console.log('');
  console.log(`Total: ${totalCreated} creadas, ${totalUpdated} actualizadas, ${totalErrors} errores`);
  console.log(`Fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(50) + '\n');

  return results;
}

/**
 * Sincroniza solo una base de datos específica.
 */
export async function syncOne(
  config: NotionConfig,
  database: keyof DatabaseIds
): Promise<SyncResult> {
  initNotion(config);

  const ids = loadConfig();
  if (!ids) throw new Error('No se encontró configuración. Ejecuta "setup" primero.');
  setDatabaseIds(ids);

  console.log(`\n🔄 Sincronizando ${database}...\n`);

  switch (database) {
    case 'features':
      return syncFeatures(readHubFile('FEATURES.md'));
    case 'changelog':
      return syncChangelog(readHubFile('CHANGELOG.md'));
    case 'finances':
      return syncFinances(readHubFile('FINANCES.md'));
    case 'subscriptions':
      return syncSubscriptions(readHubFile('FINANCES.md'));
    case 'metrics':
      return syncMetrics(readHubFile('METRICS.md'));
    case 'contentPlan':
      return syncContentPlan(readHubFile('CONTENT_PLAN.md'));
    case 'bugs':
      return syncBugs(readHubFile('PROJECT_STATUS.md'), readHubFile('FEATURES.md'));
    default:
      throw new Error(`Base de datos desconocida: ${database}`);
  }
}

/**
 * Añade una entrada al changelog de Notion directamente (sin pasar por markdown).
 */
export async function addChangelogEntry(
  config: NotionConfig,
  entry: {
    title: string;
    type: string;
    details: string;
    agent?: string;
  }
): Promise<void> {
  initNotion(config);

  const ids = loadConfig();
  if (!ids) throw new Error('No se encontró configuración. Ejecuta "setup" primero.');
  setDatabaseIds(ids);

  const { getNotionClient, notionHelpers } = await import('./notionClient');
  const client = getNotionClient();

  const properties: Record<string, any> = {
    Entrada: notionHelpers.title(entry.title),
    Fecha: notionHelpers.date(new Date().toISOString().split('T')[0]),
    Tipo: notionHelpers.select(entry.type),
    Detalle: notionHelpers.richText(entry.details.substring(0, 2000)),
  };

  if (entry.agent) {
    properties['Agente'] = notionHelpers.select(entry.agent);
  }

  await client.pages.create({
    parent: { database_id: ids.changelog },
    properties,
  });
}
