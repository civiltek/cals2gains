// =============================================================
// Cals2Gains — Archivo de metricas actualizado automaticamente
// Ultima actualizacion: 2026-04-13
// NO EDITAR MANUALMENTE — Este archivo lo actualiza la tarea
// programada semanal c2g-weekly-metrics
// =============================================================

const C2G_METRICS = {
    lastUpdated: '2026-04-13T10:30:00',

    // --- Metricas semanales acumuladas ---
    weeklyMetrics: [
        // Sem 14: sin actividad (cuentas no publicaban aun)
        { week: 'Sem 14 (30 mar-5 abr)', igEN: 0, igES: 0, visits: 0, waitlist: 0, reels: 0, engRate: 0, comments: 0, gaUsers: 0, gaPageviews: 0, gaBounce: 0 },
        // Sem 15: posts publicados (9, 11, 12 abr). GA4 activo. Gran salto de seguidores EN (868).
        { week: 'Sem 15 (6-12 abr)', igEN: 868, igES: 11, visits: 30, waitlist: 0, reels: 0, engRate: 16.8, comments: 2, gaUsers: 30, gaPageviews: 37, gaBounce: 0 }
    ],

    // --- Log de contenido publicado ---
    contentLog: [
        // Posts del 9 de abril (primer contenido publicado)
        { date: '2026-04-09', account: '@cals2gains', type: 'Post (foto)', topic: 'Still logging your food manually?', reach: 3, likes: 5, comments: 1, saves: 1, shares: 0 },
        { date: '2026-04-09', account: '@cals2gains_es', type: 'Post (foto)', topic: '\u00bfSigues buscando alimentos a mano?', reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 },
        // Posts del 11 de abril (detectados via Meta Business Suite)
        { date: '2026-04-11', account: '@cals2gains_es', type: 'Post (foto)', topic: '\u00bfSigues buscando alimentos a mano? (v2)', reach: 0, likes: 1, comments: 0, saves: 0, shares: 0 },
        { date: '2026-04-11', account: '@cals2gains_es', type: 'Post (foto)', topic: '\u00bfSigues buscando "pechuga de pollo"?', reach: 10, likes: 4, comments: 1, saves: 0, shares: 1 },
        // Posts del 12 de abril — nuevos esta semana
        { date: '2026-04-12', account: '@cals2gains_es', type: 'Post (foto)', topic: 'Tu app dice 1800 kcal. \u00bfDe d\u00f3nde sale? (Caja Negra)', reach: 21, likes: 0, comments: 0, saves: 0, shares: 0 },
        { date: '2026-04-12', account: '@cals2gains_es', type: 'Post (foto)', topic: '\u00bfCu\u00e1nto tardas en registrar una comida?', reach: 13, likes: 0, comments: 0, saves: 0, shares: 0 },
        { date: '2026-04-12', account: '@cals2gains', type: 'Post (foto)', topic: 'BLACK BOX — Your app says 1800 kcal', reach: 2, likes: 0, comments: 0, saves: 0, shares: 0 },
        { date: '2026-04-12', account: '@cals2gains', type: 'Post (foto)', topic: 'SOMETHING IS COMING', reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 }
    ],

    // --- KPIs actuales ---
    kpis: {
        // Instagram (datos recogidos 2026-04-13)
        igEN: 868, igES: 11, bioClicks: 0, commentsDay: 0,
        // Marketing (Meta Business Suite — Instagram, ultimos 28 dias hasta 12-abr)
        reach: 31, engRate: 16.8, convRate: 0, mktCost: 0,
        // Google Analytics 4 (6-12 abr 2026, ultimos 7 dias)
        gaUsers: 30, gaPageviews: 37, gaBounce: 0, gaAvgSession: 14,
        // Producto (post-lanzamiento)
        downloads: 0, activation: 0, dauMau: 0, d7: 0,
        photos: 0, meals: 0, logTime: 0, rating: 0,
        // Revenue (post-lanzamiento)
        mrr: 0, convPremium: 0, arpu: 0, churn: 0,
        ltv: 0, subs: 0, trialPaid: 0,
        // ASO
        searchImp: 0, impConv: 0
    },

    // --- Checklist de pre-lanzamiento ---
    checklist: {
        'App funcional (MVP completo)': 'wip',
        'Fichas App Store + Google Play preparadas': 'pending',
        'Screenshots reales (dark + light mode)': 'pending',
        'Landing page activa con formulario de espera': 'done',
        'Dominio cals2gains.com configurado': 'done',
        'Email corporativo info@cals2gains.com': 'done',
        'Cuentas Instagram creadas (@cals2gains + @cals2gains_es)': 'done',
        'Logo y brand guidelines finalizados': 'done',
        'RevenueCat configurado': 'wip',
        'Firebase Auth + Firestore activos': 'done',
        'Primeros 5 Reels (EN) publicados': 'pending',
        'Primeros 5 Reels (ES) publicados': 'pending',
        'Apple Developer Account activa': 'done',
        'Google Play Console verificada': 'done',
        'Politica de privacidad publicada': 'pending',
        'Terminos de uso publicados': 'pending',
        'Google Analytics 4 configurado': 'done',
        'Dashboard de crecimiento activo': 'done'
    },

    // --- Historial de Google Analytics semanal ---
    gaWeekly: [
        { week: 'Sem 14 (30 mar-5 abr)', users: 0, newUsers: 0, sessions: 0, pageviews: 0, bounceRate: 0, avgSessionDuration: 0, topPages: [], topSources: [] },
        { week: 'Sem 15 (6-12 abr)', users: 30, newUsers: 30, sessions: 33, pageviews: 37, bounceRate: 0, avgSessionDuration: 14, topPages: ['Cals2Gains — Landing page principal'], topSources: ['Direct (33 sesiones)'] }
    ],

    // --- Metricas de Instagram detalladas ---
    igDetailed: {
        en: {
            followers: 868, posts: 2, following: 36,
            weeklyReach: 2, weeklyImpressions: 7, weeklyProfileVisits: 0,
            topPost: { date: '2026-04-12', topic: 'BLACK BOX — Your app says 1800 kcal', reach: 2, engagement: 0 }
        },
        es: {
            followers: 11, posts: 2, following: 73,
            weeklyReach: 34, weeklyImpressions: 66, weeklyProfileVisits: 0,
            topPost: { date: '2026-04-12', topic: 'Tu app dice 1800 kcal. De donde sale? (Caja Negra)', reach: 21, engagement: 0 }
        }
    }
};
