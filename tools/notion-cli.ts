#!/usr/bin/env npx tsx
/**
 * Notion CLI - Herramienta de línea de comandos para gestionar la integración con Notion
 *
 * Uso:
 *   npx tsx tools/notion-cli.ts setup          Crear bases de datos en Notion
 *   npx tsx tools/notion-cli.ts sync           Sincronizar todo el hub
 *   npx tsx tools/notion-cli.ts sync features  Sincronizar solo features
 *   npx tsx tools/notion-cli.ts verify         Verificar conexión y bases de datos
 *   npx tsx tools/notion-cli.ts status         Ver estado de la configuración
 *
 * Variables de entorno requeridas:
 *   NOTION_API_KEY       - Token de la integration de Notion (ntn_...)
 *   NOTION_PARENT_PAGE   - ID de la página padre donde crear las bases de datos
 */

import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno desde .env si existe
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

import { setup, syncAll, syncOne } from '../services/notion/notionSync';
import { initNotion, verifyConnection, getDatabaseIds, setDatabaseIds, type NotionConfig, type DatabaseIds } from '../services/notion/notionClient';
import { verifyDatabases } from '../services/notion/databases';

const CONFIG_FILE = path.join(__dirname, '..', '.notion-config.json');

function getConfig(): NotionConfig {
  const apiKey = process.env.NOTION_API_KEY;
  const parentPageId = process.env.NOTION_PARENT_PAGE;

  if (!apiKey) {
    console.error('❌ Falta NOTION_API_KEY. Añádela a tu .env:');
    console.error('   NOTION_API_KEY=ntn_...');
    process.exit(1);
  }

  if (!parentPageId) {
    console.error('❌ Falta NOTION_PARENT_PAGE. Añádela a tu .env:');
    console.error('   NOTION_PARENT_PAGE=<id-de-la-pagina-padre>');
    console.error('');
    console.error('   Para obtener el ID:');
    console.error('   1. Abre Notion y ve a la página donde quieres crear el hub');
    console.error('   2. Click en "..." → "Copy link"');
    console.error('   3. La URL tiene el formato: notion.so/Tu-Pagina-<ID>');
    console.error('   4. El ID son los últimos 32 caracteres (sin guiones)');
    process.exit(1);
  }

  return { apiKey, parentPageId };
}

function loadSavedConfig(): DatabaseIds | null {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

async function cmdSetup(): Promise<void> {
  const config = getConfig();
  await setup(config);
  console.log('\n🎉 Setup completado. Ya puedes ejecutar "sync" para sincronizar datos.');
}

async function cmdSync(target?: string): Promise<void> {
  const config = getConfig();

  if (target) {
    const validTargets: Array<keyof DatabaseIds> = [
      'features', 'changelog', 'finances', 'subscriptions',
      'metrics', 'contentPlan', 'bugs',
    ];

    if (!validTargets.includes(target as keyof DatabaseIds)) {
      console.error(`❌ Base de datos desconocida: "${target}"`);
      console.error(`   Válidas: ${validTargets.join(', ')}`);
      process.exit(1);
    }

    const result = await syncOne(config, target as keyof DatabaseIds);
    console.log(`\n✅ ${result.database}: ${result.created} nuevas, ${result.updated} actualizadas`);
    if (result.errors.length > 0) {
      console.log(`⚠️ Errores:`);
      result.errors.forEach((e) => console.log(`  - ${e}`));
    }
  } else {
    await syncAll(config);
  }
}

async function cmdVerify(): Promise<void> {
  const config = getConfig();
  initNotion(config);

  console.log('🔑 Verificando conexión...');
  const conn = await verifyConnection();
  if (!conn.ok) {
    console.error(`❌ Error de conexión: ${conn.error}`);
    process.exit(1);
  }
  console.log(`✅ Conectado como: ${conn.user}\n`);

  const ids = loadSavedConfig();
  if (!ids) {
    console.log('⚠️ No hay configuración guardada. Ejecuta "setup" primero.');
    return;
  }

  setDatabaseIds(ids);
  console.log('🔍 Verificando bases de datos...');
  const valid = await verifyDatabases(ids);
  console.log(valid ? '\n✅ Todas las bases de datos OK' : '\n❌ Algunas bases de datos no son accesibles');
}

async function cmdStatus(): Promise<void> {
  console.log('📋 Estado de la integración con Notion\n');

  // API Key
  const hasKey = !!process.env.NOTION_API_KEY;
  console.log(`API Key:      ${hasKey ? '✅ Configurada' : '❌ No configurada'}`);

  // Parent Page
  const hasPage = !!process.env.NOTION_PARENT_PAGE;
  console.log(`Parent Page:  ${hasPage ? '✅ Configurada' : '❌ No configurada'}`);

  // Config file
  const ids = loadSavedConfig();
  console.log(`Config file:  ${ids ? '✅ Existe' : '❌ No existe'}`);

  if (ids) {
    console.log('\nBases de datos configuradas:');
    for (const [name, id] of Object.entries(ids)) {
      console.log(`  ${name}: ${id}`);
    }
  }

  // Hub files
  const hubDir = path.join(__dirname, '..', '_project-hub');
  const hubFiles = [
    'FEATURES.md', 'CHANGELOG.md', 'FINANCES.md',
    'METRICS.md', 'CONTENT_PLAN.md', 'PROJECT_STATUS.md',
  ];

  console.log('\nArchivos del hub:');
  for (const file of hubFiles) {
    const exists = fs.existsSync(path.join(hubDir, file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  }
}

// --- Main ---

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<void>> = {
  setup: cmdSetup,
  sync: () => cmdSync(args[0]),
  verify: cmdVerify,
  status: cmdStatus,
};

if (!command || !commands[command]) {
  console.log(`
🔗 Notion CLI - Cals2Gains

Comandos disponibles:
  setup           Crear todas las bases de datos en Notion
  sync            Sincronizar todo el hub con Notion
  sync <db>       Sincronizar una base de datos específica
  verify          Verificar conexión y estado de las bases de datos
  status          Ver estado de la configuración

Bases de datos disponibles para sync:
  features, changelog, finances, subscriptions,
  metrics, contentPlan, bugs

Variables de entorno (.env):
  NOTION_API_KEY       Token de la integration (ntn_...)
  NOTION_PARENT_PAGE   ID de la página padre en Notion

Ejemplos:
  npx tsx tools/notion-cli.ts setup
  npx tsx tools/notion-cli.ts sync
  npx tsx tools/notion-cli.ts sync features
  npx tsx tools/notion-cli.ts verify
`);
  process.exit(0);
}

commands[command]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  });
