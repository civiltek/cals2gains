/**
 * Notion Databases - Definición de esquemas y creación de bases de datos
 * Crea todas las bases de datos del hub en Notion bajo una página padre.
 */
import { getNotionClient, getNotionConfig, DatabaseIds } from './notionClient';

// --- Esquemas de las bases de datos ---

const DB_SCHEMAS = {
  features: {
    title: '📱 Features',
    icon: '📱',
    properties: {
      Feature: { title: {} },
      Estado: {
        select: {
          options: [
            { name: 'Implementado', color: 'green' },
            { name: 'Bug conocido', color: 'red' },
            { name: 'En progreso', color: 'yellow' },
            { name: 'Pendiente', color: 'gray' },
          ],
        },
      },
      Categoría: {
        select: {
          options: [
            { name: 'Onboarding', color: 'blue' },
            { name: 'Core', color: 'purple' },
            { name: 'Tracking', color: 'orange' },
            { name: 'IA/Coaching', color: 'pink' },
            { name: 'Utilidades', color: 'green' },
            { name: 'Infraestructura', color: 'gray' },
          ],
        },
      },
      Archivo: { rich_text: {} },
      'Bug Descripción': { rich_text: {} },
      Prioridad: {
        select: {
          options: [
            { name: 'Alta', color: 'red' },
            { name: 'Media', color: 'yellow' },
            { name: 'Baja', color: 'gray' },
          ],
        },
      },
      Plataforma: {
        multi_select: {
          options: [
            { name: 'Android', color: 'green' },
            { name: 'iOS', color: 'blue' },
            { name: 'Web', color: 'orange' },
          ],
        },
      },
    },
  },

  changelog: {
    title: '📝 Changelog',
    icon: '📝',
    properties: {
      Entrada: { title: {} },
      Fecha: { date: {} },
      Tipo: {
        select: {
          options: [
            { name: 'Feature', color: 'green' },
            { name: 'Fix', color: 'red' },
            { name: 'Mejora', color: 'blue' },
            { name: 'Infraestructura', color: 'gray' },
            { name: 'Marketing', color: 'pink' },
            { name: 'Finanzas', color: 'yellow' },
            { name: 'Build', color: 'orange' },
          ],
        },
      },
      Agente: {
        select: {
          options: [
            { name: 'app-dev', color: 'purple' },
            { name: 'web-dev', color: 'blue' },
            { name: 'finance', color: 'yellow' },
            { name: 'marketing', color: 'pink' },
            { name: 'growth', color: 'green' },
            { name: 'ops', color: 'gray' },
            { name: 'research', color: 'orange' },
          ],
        },
      },
      Detalle: { rich_text: {} },
    },
  },

  finances: {
    title: '💰 Finanzas',
    icon: '💰',
    properties: {
      Concepto: { title: {} },
      Fecha: { date: {} },
      Proveedor: {
        select: {
          options: [
            { name: 'Anthropic', color: 'orange' },
            { name: 'OpenAI', color: 'green' },
            { name: 'Google', color: 'blue' },
            { name: 'Apple', color: 'gray' },
            { name: 'Meta', color: 'blue' },
            { name: 'Expo', color: 'purple' },
            { name: 'Firebase', color: 'yellow' },
            { name: 'Otro', color: 'default' },
          ],
        },
      },
      'Importe (EUR)': { number: { format: 'euro' } },
      'Importe Original': { rich_text: {} },
      Tipo: {
        select: {
          options: [
            { name: 'Suscripción', color: 'blue' },
            { name: 'Pago único', color: 'green' },
            { name: 'Recarga API', color: 'orange' },
            { name: 'Prepaid', color: 'yellow' },
          ],
        },
      },
      'Recibo PDF': { url: {} },
      'Nº Factura': { rich_text: {} },
    },
  },

  subscriptions: {
    title: '🔄 Suscripciones',
    icon: '🔄',
    properties: {
      Servicio: { title: {} },
      'Coste Mensual (EUR)': { number: { format: 'euro' } },
      'Próximo Cobro': { date: {} },
      Estado: {
        select: {
          options: [
            { name: 'Activa', color: 'green' },
            { name: 'Pendiente', color: 'yellow' },
            { name: 'Cancelada', color: 'red' },
          ],
        },
      },
      Cuenta: { rich_text: {} },
      Notas: { rich_text: {} },
    },
  },

  metrics: {
    title: '📊 Métricas',
    icon: '📊',
    properties: {
      Periodo: { title: {} },
      'Fecha Recopilación': { date: {} },
      Canal: {
        select: {
          options: [
            { name: '@cals2gains', color: 'purple' },
            { name: '@cals2gains_es', color: 'orange' },
            { name: '@calstogains', color: 'blue' },
            { name: 'Facebook ES', color: 'blue' },
            { name: 'Facebook EN', color: 'blue' },
            { name: 'Web (GA4)', color: 'green' },
            { name: 'Google Play', color: 'green' },
            { name: 'App Store', color: 'gray' },
          ],
        },
      },
      Seguidores: { number: {} },
      'Visualizaciones 28d': { number: {} },
      'Alcance 28d': { number: {} },
      'Interacciones 28d': { number: {} },
      'Engagement Rate': { rich_text: {} },
      Notas: { rich_text: {} },
    },
  },

  contentPlan: {
    title: '📅 Calendario de Contenido',
    icon: '📅',
    properties: {
      Título: { title: {} },
      Fecha: { date: {} },
      Cuenta: {
        select: {
          options: [
            { name: '@cals2gains', color: 'purple' },
            { name: '@cals2gains_es', color: 'orange' },
            { name: '@calstogains', color: 'blue' },
            { name: 'Facebook ES', color: 'blue' },
            { name: 'Facebook EN', color: 'blue' },
          ],
        },
      },
      Tipo: {
        select: {
          options: [
            { name: 'Post', color: 'blue' },
            { name: 'Reel', color: 'pink' },
            { name: 'Story', color: 'yellow' },
            { name: 'Carousel', color: 'green' },
          ],
        },
      },
      Estado: {
        select: {
          options: [
            { name: 'Borrador', color: 'gray' },
            { name: 'Aprobado', color: 'blue' },
            { name: 'Programado', color: 'yellow' },
            { name: 'Publicado', color: 'green' },
            { name: 'Analizado', color: 'purple' },
          ],
        },
      },
      Tema: { rich_text: {} },
      Copy: { rich_text: {} },
      Hashtags: { rich_text: {} },
      'Asset URL': { url: {} },
      Fase: {
        select: {
          options: [
            { name: 'Fase 1 - Pre-lanzamiento', color: 'blue' },
            { name: 'Fase 2 - Lanzamiento', color: 'green' },
            { name: 'Fase 3 - Crecimiento', color: 'purple' },
          ],
        },
      },
    },
  },

  bugs: {
    title: '🐛 Bugs',
    icon: '🐛',
    properties: {
      Bug: { title: {} },
      Estado: {
        select: {
          options: [
            { name: 'Abierto', color: 'red' },
            { name: 'En progreso', color: 'yellow' },
            { name: 'Resuelto', color: 'green' },
            { name: 'No reproducible', color: 'gray' },
          ],
        },
      },
      Prioridad: {
        select: {
          options: [
            { name: 'Crítica', color: 'red' },
            { name: 'Alta', color: 'orange' },
            { name: 'Media', color: 'yellow' },
            { name: 'Baja', color: 'gray' },
          ],
        },
      },
      Componente: { rich_text: {} },
      'Pasos para reproducir': { rich_text: {} },
      Plataforma: {
        select: {
          options: [
            { name: 'Android', color: 'green' },
            { name: 'iOS', color: 'blue' },
            { name: 'Web', color: 'orange' },
            { name: 'Todas', color: 'purple' },
          ],
        },
      },
      'Fecha Reporte': { date: {} },
      'Fecha Resolución': { date: {} },
      'Build Afectado': { rich_text: {} },
      Agente: {
        select: {
          options: [
            { name: 'app-dev', color: 'purple' },
            { name: 'web-dev', color: 'blue' },
            { name: 'ops', color: 'gray' },
          ],
        },
      },
    },
  },
};

/**
 * Crea una base de datos en Notion bajo la página padre configurada.
 */
async function createDatabase(
  key: string,
  schema: (typeof DB_SCHEMAS)[keyof typeof DB_SCHEMAS]
): Promise<string> {
  const client = getNotionClient();
  const config = getNotionConfig();

  const response = await client.databases.create({
    parent: { type: 'page_id', page_id: config.parentPageId },
    icon: { type: 'emoji', emoji: schema.icon as any },
    title: [{ type: 'text', text: { content: schema.title } }],
    properties: schema.properties as any,
  });

  console.log(`  ✅ ${schema.title} creada (ID: ${response.id})`);
  return response.id;
}

/**
 * Crea todas las bases de datos del hub en Notion.
 * Devuelve un objeto con los IDs de cada base de datos.
 */
export async function createAllDatabases(): Promise<DatabaseIds> {
  console.log('\n🏗️  Creando bases de datos en Notion...\n');

  const ids: Record<string, string> = {};

  for (const [key, schema] of Object.entries(DB_SCHEMAS)) {
    try {
      ids[key] = await createDatabase(key, schema);
    } catch (err: any) {
      console.error(`  ❌ Error creando ${schema.title}: ${err.message}`);
      throw err;
    }
  }

  console.log('\n✅ Todas las bases de datos creadas correctamente.\n');

  return ids as unknown as DatabaseIds;
}

/**
 * Verifica que todas las bases de datos existen y son accesibles.
 */
export async function verifyDatabases(ids: DatabaseIds): Promise<boolean> {
  const client = getNotionClient();
  const entries = Object.entries(ids);
  let allOk = true;

  for (const [name, id] of entries) {
    try {
      await client.databases.retrieve({ database_id: id });
      console.log(`  ✅ ${name}: OK`);
    } catch {
      console.error(`  ❌ ${name}: No accesible (ID: ${id})`);
      allOk = false;
    }
  }

  return allOk;
}
