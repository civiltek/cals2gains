// ============================================
// Cals2Gains - Spanish Food Database
// ============================================
// Comprehensive local database of common Spanish/Latin foods
// All names in Spanish, nutrition per 100g, with typical serving sizes
// Sources: BEDCA (Base de Datos Española de Composición de Alimentos),
// USDA adapted, and standard food composition tables

import { FoodItem, Nutrition } from '../types';

// Helper to create a food item with calculated per-serving nutrition
function f(
  id: string,
  name: string,
  nameEn: string,
  servingSize: number,
  servingUnit: string,
  cal: number, prot: number, carb: number, fat: number, fiber: number,
  category: string,
  aliases: string[] = []
): FoodItem & { category: string; aliases: string[] } {
  const factor = servingSize / 100;
  return {
    id: `es_${id}`,
    name,
    nameEs: name,
    nameEn,
    servingSize,
    servingUnit,
    nutritionPer100g: { calories: cal, protein: prot, carbs: carb, fat, fiber },
    nutritionPerServing: {
      calories: Math.round(cal * factor),
      protein: Math.round(prot * factor * 10) / 10,
      carbs: Math.round(carb * factor * 10) / 10,
      fat: Math.round(fat * factor * 10) / 10,
      fiber: Math.round(fiber * factor * 10) / 10,
    },
    source: 'local' as const,
    verified: true,
    category,
    aliases,
  };
}

// ============================================
// COMPLETE DATABASE
// ============================================

export const SPANISH_FOODS: (FoodItem & { category: string; aliases: string[] })[] = [
  // ── HUEVOS ──
  f('huevo_cocido', 'Huevo cocido', 'Boiled egg', 60, 'g', 155, 13, 1.1, 11, 0, 'huevos', ['huevo duro', 'huevo hervido']),
  f('huevo_frito', 'Huevo frito', 'Fried egg', 60, 'g', 196, 14, 0.8, 15, 0, 'huevos', ['huevo a la plancha']),
  f('huevo_revuelto', 'Huevo revuelto', 'Scrambled egg', 80, 'g', 149, 10, 1.6, 11, 0, 'huevos', ['revuelto']),
  f('huevo_crudo', 'Huevo (crudo)', 'Raw egg', 60, 'g', 143, 13, 0.7, 10, 0, 'huevos', ['huevo']),
  f('tortilla_francesa', 'Tortilla francesa', 'French omelette', 100, 'g', 154, 11, 0.6, 12, 0, 'huevos', ['omelette']),
  f('tortilla_espanola', 'Tortilla española', 'Spanish omelette', 150, 'g', 120, 7, 8, 7, 0.8, 'huevos', ['tortilla de patatas', 'tortilla patata']),
  f('huevo_poche', 'Huevo poché', 'Poached egg', 60, 'g', 143, 13, 0.7, 10, 0, 'huevos', ['huevo escalfado']),
  f('clara_huevo', 'Clara de huevo', 'Egg white', 33, 'g', 52, 11, 0.7, 0.2, 0, 'huevos', ['clara', 'claras']),

  // ── CARNES ──
  f('pechuga_pollo', 'Pechuga de pollo', 'Chicken breast', 150, 'g', 165, 31, 0, 3.6, 0, 'carnes', ['pollo', 'pollo a la plancha']),
  f('muslo_pollo', 'Muslo de pollo', 'Chicken thigh', 130, 'g', 209, 26, 0, 11, 0, 'carnes', ['muslo pollo']),
  f('pollo_asado', 'Pollo asado', 'Roast chicken', 150, 'g', 190, 29, 0, 8, 0, 'carnes', ['pollo al horno']),
  f('pavo_pechuga', 'Pechuga de pavo', 'Turkey breast', 150, 'g', 135, 30, 0, 1.5, 0, 'carnes', ['pavo', 'fiambre pavo']),
  f('ternera_filete', 'Filete de ternera', 'Beef steak', 150, 'g', 250, 26, 0, 16, 0, 'carnes', ['ternera', 'bistec', 'entrecot']),
  f('ternera_picada', 'Carne picada de ternera', 'Ground beef', 150, 'g', 250, 26, 0, 16, 0, 'carnes', ['carne picada', 'picada']),
  f('cerdo_lomo', 'Lomo de cerdo', 'Pork loin', 150, 'g', 143, 27, 0, 3.5, 0, 'carnes', ['cerdo', 'lomo']),
  f('cerdo_chuleta', 'Chuleta de cerdo', 'Pork chop', 150, 'g', 231, 25, 0, 14, 0, 'carnes', ['chuleta']),
  f('cordero', 'Cordero', 'Lamb', 150, 'g', 294, 25, 0, 21, 0, 'carnes', ['pierna cordero', 'chuleta cordero']),
  f('jamon_serrano', 'Jamón serrano', 'Serrano ham', 30, 'g', 241, 31, 0.1, 13, 0, 'carnes', ['jamon', 'jamón']),
  f('jamon_york', 'Jamón york', 'Cooked ham', 30, 'g', 126, 21, 1, 4, 0, 'carnes', ['jamon cocido', 'jamón cocido']),
  f('chorizo', 'Chorizo', 'Chorizo sausage', 30, 'g', 455, 24, 2, 39, 0, 'carnes', ['chorizo español']),
  f('salchichon', 'Salchichón', 'Salami', 30, 'g', 438, 26, 1, 37, 0, 'carnes', ['salami']),
  f('bacon', 'Bacon', 'Bacon', 30, 'g', 541, 37, 1.4, 42, 0, 'carnes', ['beicon', 'tocino']),
  f('hamburguesa', 'Hamburguesa de ternera', 'Beef burger patty', 120, 'g', 254, 17, 0, 20, 0, 'carnes', ['hamburguesa', 'burger']),

  // ── PESCADOS Y MARISCOS ──
  f('salmon', 'Salmón', 'Salmon', 150, 'g', 208, 20, 0, 13, 0, 'pescados', ['salmon a la plancha', 'salmón']),
  f('atun_lata', 'Atún en lata', 'Canned tuna', 80, 'g', 116, 26, 0, 1, 0, 'pescados', ['atun', 'atún']),
  f('atun_fresco', 'Atún fresco', 'Fresh tuna', 150, 'g', 144, 23, 0, 5, 0, 'pescados', ['atún fresco']),
  f('merluza', 'Merluza', 'Hake', 150, 'g', 89, 18, 0, 1.8, 0, 'pescados', ['merluza al horno']),
  f('bacalao', 'Bacalao', 'Cod', 150, 'g', 82, 18, 0, 0.7, 0, 'pescados', ['bacalao fresco']),
  f('sardinas', 'Sardinas', 'Sardines', 100, 'g', 208, 25, 0, 11, 0, 'pescados', ['sardina', 'sardinas en lata']),
  f('gambas', 'Gambas', 'Prawns/Shrimp', 100, 'g', 99, 24, 0.2, 0.3, 0, 'pescados', ['langostinos', 'camarones', 'gamba']),
  f('mejillones', 'Mejillones', 'Mussels', 100, 'g', 86, 12, 3.7, 2.2, 0, 'pescados', ['mejillon']),
  f('pulpo', 'Pulpo', 'Octopus', 100, 'g', 82, 15, 2.2, 1, 0, 'pescados', ['pulpo a la gallega']),
  f('lubina', 'Lubina', 'Sea bass', 150, 'g', 97, 18, 0, 2.5, 0, 'pescados', ['lubina al horno']),
  f('dorada', 'Dorada', 'Sea bream', 150, 'g', 100, 20, 0, 2.5, 0, 'pescados', ['dorada al horno']),
  f('calamares', 'Calamares', 'Squid', 100, 'g', 175, 15, 7, 9, 0, 'pescados', ['calamar', 'calamares a la romana']),
  f('anchoas', 'Anchoas', 'Anchovies', 30, 'g', 210, 29, 0, 10, 0, 'pescados', ['anchoa', 'boquerones']),
  f('trucha', 'Trucha', 'Trout', 150, 'g', 119, 20, 0, 4, 0, 'pescados', []),

  // ── LÁCTEOS ──
  f('leche_entera', 'Leche entera', 'Whole milk', 250, 'ml', 61, 3.2, 4.8, 3.3, 0, 'lacteos', ['leche']),
  f('leche_semi', 'Leche semidesnatada', 'Semi-skimmed milk', 250, 'ml', 46, 3.3, 4.8, 1.6, 0, 'lacteos', ['leche semi']),
  f('leche_desnatada', 'Leche desnatada', 'Skimmed milk', 250, 'ml', 35, 3.4, 5, 0.1, 0, 'lacteos', []),
  f('yogur_natural', 'Yogur natural', 'Natural yogurt', 125, 'g', 61, 3.5, 4.7, 3.3, 0, 'lacteos', ['yogur', 'yogurt']),
  f('yogur_griego', 'Yogur griego', 'Greek yogurt', 125, 'g', 97, 9, 3.6, 5, 0, 'lacteos', ['griego', 'yogurt griego']),
  f('yogur_desnatado', 'Yogur desnatado', 'Low-fat yogurt', 125, 'g', 45, 4.3, 6.3, 0.2, 0, 'lacteos', ['yogur 0%', 'yogur light']),
  f('queso_manchego', 'Queso manchego', 'Manchego cheese', 30, 'g', 390, 26, 0.5, 32, 0, 'lacteos', ['manchego']),
  f('queso_fresco', 'Queso fresco', 'Fresh cheese', 50, 'g', 174, 12, 2.5, 13, 0, 'lacteos', ['queso burgos', 'queso blanco']),
  f('queso_mozzarella', 'Mozzarella', 'Mozzarella', 30, 'g', 280, 22, 2.2, 17, 0, 'lacteos', ['mozzarella', 'queso pizza']),
  f('queso_parmesano', 'Queso parmesano', 'Parmesan', 15, 'g', 431, 38, 4.1, 29, 0, 'lacteos', ['parmesano']),
  f('queso_cabra', 'Queso de cabra', 'Goat cheese', 30, 'g', 364, 22, 0.1, 30, 0, 'lacteos', ['cabra']),
  f('nata', 'Nata para montar', 'Heavy cream', 30, 'ml', 340, 2, 2.8, 36, 0, 'lacteos', ['nata', 'crema']),
  f('requesón', 'Requesón', 'Cottage cheese', 100, 'g', 98, 11, 3.4, 4.3, 0, 'lacteos', ['requeson']),
  f('queso_cheddar', 'Queso cheddar', 'Cheddar cheese', 30, 'g', 403, 25, 1.3, 33, 0, 'lacteos', ['cheddar']),

  // ── CEREALES Y PAN ──
  f('arroz_blanco', 'Arroz blanco cocido', 'Cooked white rice', 200, 'g', 130, 2.7, 28, 0.3, 0.4, 'cereales', ['arroz', 'arroz cocido']),
  f('arroz_integral', 'Arroz integral cocido', 'Cooked brown rice', 200, 'g', 111, 2.6, 23, 0.9, 1.8, 'cereales', ['arroz integral']),
  f('pasta_cocida', 'Pasta cocida', 'Cooked pasta', 200, 'g', 131, 5, 25, 1.1, 1.8, 'cereales', ['pasta', 'espaguetis', 'macarrones', 'fideos', 'spaghetti']),
  f('pasta_integral', 'Pasta integral cocida', 'Whole wheat pasta', 200, 'g', 124, 5.3, 25, 0.5, 3.9, 'cereales', ['pasta integral']),
  f('pan_blanco', 'Pan blanco', 'White bread', 30, 'g', 265, 9, 49, 3.2, 2.7, 'cereales', ['pan', 'pan de molde']),
  f('pan_integral', 'Pan integral', 'Whole wheat bread', 30, 'g', 247, 13, 41, 3.4, 6, 'cereales', ['pan integral']),
  f('pan_centeno', 'Pan de centeno', 'Rye bread', 30, 'g', 259, 8.5, 48, 3.3, 5.8, 'cereales', ['centeno']),
  f('baguette', 'Baguette', 'Baguette', 60, 'g', 274, 9, 56, 1, 2.4, 'cereales', ['pan francés', 'barra de pan']),
  f('tostada', 'Tostada', 'Toast', 25, 'g', 293, 10, 55, 3.5, 3, 'cereales', ['tostada integral']),
  f('avena', 'Avena (copos)', 'Oats', 40, 'g', 389, 17, 66, 7, 11, 'cereales', ['copos de avena', 'porridge', 'oatmeal']),
  f('cereales_desayuno', 'Cereales de desayuno', 'Breakfast cereal', 30, 'g', 379, 7, 84, 1.5, 3, 'cereales', ['cereales', 'cornflakes']),
  f('quinoa', 'Quinoa cocida', 'Cooked quinoa', 150, 'g', 120, 4.4, 21, 1.9, 2.8, 'cereales', ['quinua']),
  f('cuscus', 'Cuscús cocido', 'Cooked couscous', 150, 'g', 112, 3.8, 23, 0.2, 1.4, 'cereales', ['cous cous']),

  // ── LEGUMBRES ──
  f('lentejas', 'Lentejas cocidas', 'Cooked lentils', 200, 'g', 116, 9, 20, 0.4, 7.9, 'legumbres', ['lentejas', 'lenteja']),
  f('garbanzos', 'Garbanzos cocidos', 'Cooked chickpeas', 200, 'g', 164, 9, 27, 2.6, 7.6, 'legumbres', ['garbanzos', 'garbanzo', 'hummus']),
  f('alubias', 'Alubias cocidas', 'Cooked beans', 200, 'g', 127, 9, 22, 0.5, 6, 'legumbres', ['judías', 'judias', 'alubias blancas', 'frijoles']),
  f('guisantes', 'Guisantes', 'Peas', 100, 'g', 81, 5.4, 14, 0.4, 5, 'legumbres', ['petit pois', 'chicharos']),
  f('edamame', 'Edamame', 'Edamame', 100, 'g', 121, 12, 9, 5, 5, 'legumbres', ['soja verde']),
  f('tofu', 'Tofu', 'Tofu', 100, 'g', 76, 8, 1.9, 4.8, 0.3, 'legumbres', ['tofu firme']),

  // ── FRUTAS ──
  f('platano', 'Plátano', 'Banana', 120, 'g', 89, 1.1, 23, 0.3, 2.6, 'frutas', ['banana', 'platano']),
  f('manzana', 'Manzana', 'Apple', 170, 'g', 52, 0.3, 14, 0.2, 2.4, 'frutas', ['manzana verde', 'manzana roja']),
  f('naranja', 'Naranja', 'Orange', 170, 'g', 47, 0.9, 12, 0.1, 2.4, 'frutas', ['naranja']),
  f('mandarina', 'Mandarina', 'Tangerine', 80, 'g', 53, 0.8, 13, 0.3, 1.8, 'frutas', ['clementina']),
  f('pera', 'Pera', 'Pear', 180, 'g', 57, 0.4, 15, 0.1, 3.1, 'frutas', ['pera conferencia']),
  f('fresa', 'Fresas', 'Strawberries', 150, 'g', 32, 0.7, 7.7, 0.3, 2, 'frutas', ['fresa', 'fresones']),
  f('uva', 'Uvas', 'Grapes', 100, 'g', 69, 0.7, 18, 0.2, 0.9, 'frutas', ['uva', 'uvas']),
  f('melocoton', 'Melocotón', 'Peach', 150, 'g', 39, 0.9, 10, 0.3, 1.5, 'frutas', ['durazno']),
  f('kiwi', 'Kiwi', 'Kiwi', 80, 'g', 61, 1.1, 15, 0.5, 3, 'frutas', []),
  f('piña', 'Piña', 'Pineapple', 100, 'g', 50, 0.5, 13, 0.1, 1.4, 'frutas', ['ananas']),
  f('sandia', 'Sandía', 'Watermelon', 200, 'g', 30, 0.6, 7.6, 0.2, 0.4, 'frutas', ['melon de agua']),
  f('melon', 'Melón', 'Melon', 200, 'g', 34, 0.8, 8.2, 0.2, 0.9, 'frutas', []),
  f('mango', 'Mango', 'Mango', 150, 'g', 60, 0.8, 15, 0.4, 1.6, 'frutas', []),
  f('aguacate', 'Aguacate', 'Avocado', 80, 'g', 160, 2, 8.5, 15, 6.7, 'frutas', ['palta']),
  f('cerezas', 'Cerezas', 'Cherries', 100, 'g', 63, 1, 16, 0.2, 2.1, 'frutas', ['cereza', 'picotas']),
  f('arandanos', 'Arándanos', 'Blueberries', 100, 'g', 57, 0.7, 14, 0.3, 2.4, 'frutas', ['blueberries']),
  f('frambuesas', 'Frambuesas', 'Raspberries', 100, 'g', 52, 1.2, 12, 0.7, 6.5, 'frutas', ['frambuesa']),
  f('higos', 'Higos', 'Figs', 50, 'g', 74, 0.8, 19, 0.3, 2.9, 'frutas', ['higo', 'breva']),
  f('coco', 'Coco rallado', 'Shredded coconut', 20, 'g', 660, 6, 6.4, 62, 16, 'frutas', ['coco']),
  f('limon', 'Limón (zumo)', 'Lemon juice', 30, 'ml', 29, 0.4, 9, 0.3, 0.3, 'frutas', ['limon', 'zumo limon']),
  f('granada', 'Granada', 'Pomegranate', 100, 'g', 83, 1.7, 19, 1.2, 4, 'frutas', []),

  // ── VERDURAS Y HORTALIZAS ──
  f('tomate', 'Tomate', 'Tomato', 150, 'g', 18, 0.9, 3.9, 0.2, 1.2, 'verduras', ['tomate cherry', 'jitomate']),
  f('lechuga', 'Lechuga', 'Lettuce', 80, 'g', 15, 1.4, 2.9, 0.2, 1.3, 'verduras', ['ensalada verde']),
  f('pepino', 'Pepino', 'Cucumber', 100, 'g', 15, 0.7, 3.6, 0.1, 0.5, 'verduras', []),
  f('zanahoria', 'Zanahoria', 'Carrot', 80, 'g', 41, 0.9, 10, 0.2, 2.8, 'verduras', ['zanahorias']),
  f('cebolla', 'Cebolla', 'Onion', 80, 'g', 40, 1.1, 9, 0.1, 1.7, 'verduras', ['cebolleta']),
  f('pimiento', 'Pimiento', 'Bell pepper', 100, 'g', 31, 1, 6, 0.3, 2.1, 'verduras', ['pimiento rojo', 'pimiento verde', 'morrón']),
  f('brocoli', 'Brócoli', 'Broccoli', 100, 'g', 34, 2.8, 7, 0.4, 2.6, 'verduras', ['brecol']),
  f('espinacas', 'Espinacas', 'Spinach', 100, 'g', 23, 2.9, 3.6, 0.4, 2.2, 'verduras', ['espinaca']),
  f('calabacin', 'Calabacín', 'Zucchini', 100, 'g', 17, 1.2, 3.1, 0.3, 1, 'verduras', ['zucchini']),
  f('berenjena', 'Berenjena', 'Eggplant', 100, 'g', 25, 1, 6, 0.2, 3, 'verduras', []),
  f('champiñones', 'Champiñones', 'Mushrooms', 80, 'g', 22, 3.1, 3.3, 0.3, 1, 'verduras', ['setas', 'hongos']),
  f('patata', 'Patata cocida', 'Boiled potato', 200, 'g', 77, 2, 17, 0.1, 1.8, 'verduras', ['papa', 'patatas', 'papas']),
  f('patata_frita', 'Patatas fritas', 'French fries', 150, 'g', 312, 3.4, 41, 15, 3.8, 'verduras', ['papas fritas', 'patatas fritas']),
  f('boniato', 'Boniato', 'Sweet potato', 150, 'g', 86, 1.6, 20, 0.1, 3, 'verduras', ['batata', 'camote']),
  f('coliflor', 'Coliflor', 'Cauliflower', 100, 'g', 25, 1.9, 5, 0.3, 2, 'verduras', []),
  f('judias_verdes', 'Judías verdes', 'Green beans', 100, 'g', 31, 1.8, 7, 0.1, 3.4, 'verduras', ['ejotes', 'habichuelas']),
  f('alcachofa', 'Alcachofa', 'Artichoke', 100, 'g', 47, 3.3, 11, 0.2, 5.4, 'verduras', ['alcachofas']),
  f('espárragos', 'Espárragos', 'Asparagus', 100, 'g', 20, 2.2, 3.9, 0.1, 2.1, 'verduras', ['esparragos']),
  f('maiz', 'Maíz dulce', 'Sweet corn', 100, 'g', 86, 3.3, 19, 1.4, 2.7, 'verduras', ['elote', 'choclo']),
  f('acelgas', 'Acelgas', 'Chard', 100, 'g', 19, 1.8, 3.7, 0.2, 1.6, 'verduras', ['acelga']),
  f('remolacha', 'Remolacha', 'Beetroot', 100, 'g', 43, 1.6, 10, 0.2, 2.8, 'verduras', ['betabel']),
  f('col', 'Col / Repollo', 'Cabbage', 100, 'g', 25, 1.3, 6, 0.1, 2.5, 'verduras', ['repollo']),
  f('apio', 'Apio', 'Celery', 50, 'g', 16, 0.7, 3, 0.2, 1.6, 'verduras', []),

  // ── FRUTOS SECOS Y SEMILLAS ──
  f('almendras', 'Almendras', 'Almonds', 30, 'g', 579, 21, 22, 50, 12, 'frutos_secos', ['almendra']),
  f('nueces', 'Nueces', 'Walnuts', 30, 'g', 654, 15, 14, 65, 7, 'frutos_secos', ['nuez']),
  f('cacahuetes', 'Cacahuetes', 'Peanuts', 30, 'g', 567, 26, 16, 49, 9, 'frutos_secos', ['maní', 'cacahuete']),
  f('pistachos', 'Pistachos', 'Pistachios', 30, 'g', 560, 20, 28, 45, 10, 'frutos_secos', ['pistacho']),
  f('avellanas', 'Avellanas', 'Hazelnuts', 30, 'g', 628, 15, 17, 61, 10, 'frutos_secos', ['avellana']),
  f('semillas_chia', 'Semillas de chía', 'Chia seeds', 15, 'g', 486, 17, 42, 31, 34, 'frutos_secos', ['chia', 'chía']),
  f('semillas_lino', 'Semillas de lino', 'Flaxseeds', 15, 'g', 534, 18, 29, 42, 27, 'frutos_secos', ['linaza']),
  f('semillas_girasol', 'Semillas de girasol', 'Sunflower seeds', 20, 'g', 584, 21, 20, 51, 9, 'frutos_secos', ['pipas']),
  f('crema_cacahuete', 'Crema de cacahuete', 'Peanut butter', 15, 'g', 588, 25, 20, 50, 6, 'frutos_secos', ['mantequilla de cacahuete', 'mantequilla de maní']),

  // ── ACEITES Y GRASAS ──
  f('aceite_oliva', 'Aceite de oliva virgen extra', 'Extra virgin olive oil', 10, 'ml', 884, 0, 0, 100, 0, 'aceites', ['aceite oliva', 'aove', 'aceite']),
  f('aceite_girasol', 'Aceite de girasol', 'Sunflower oil', 10, 'ml', 884, 0, 0, 100, 0, 'aceites', []),
  f('mantequilla', 'Mantequilla', 'Butter', 10, 'g', 717, 0.9, 0.1, 81, 0, 'aceites', []),
  f('margarina', 'Margarina', 'Margarine', 10, 'g', 717, 0.2, 0.7, 80, 0, 'aceites', []),

  // ── BEBIDAS ──
  f('cafe_solo', 'Café solo', 'Black coffee', 200, 'ml', 2, 0.1, 0, 0, 0, 'bebidas', ['café', 'cafe', 'espresso']),
  f('cafe_con_leche', 'Café con leche', 'Coffee with milk', 200, 'ml', 30, 1.6, 2.4, 1.6, 0, 'bebidas', ['café con leche']),
  f('te', 'Té', 'Tea', 200, 'ml', 1, 0, 0.3, 0, 0, 'bebidas', ['te verde', 'infusion', 'infusión']),
  f('zumo_naranja', 'Zumo de naranja', 'Orange juice', 250, 'ml', 45, 0.7, 10, 0.2, 0.2, 'bebidas', ['jugo naranja', 'zumo']),
  f('cocacola', 'Coca-Cola', 'Coca-Cola', 330, 'ml', 42, 0, 11, 0, 0, 'bebidas', ['coca cola', 'refresco', 'cola']),
  f('cerveza', 'Cerveza', 'Beer', 330, 'ml', 43, 0.5, 3.6, 0, 0, 'bebidas', ['birra', 'caña']),
  f('vino_tinto', 'Vino tinto', 'Red wine', 150, 'ml', 85, 0.1, 2.6, 0, 0, 'bebidas', ['vino', 'copa vino']),
  f('batido_proteina', 'Batido de proteína (whey)', 'Whey protein shake', 30, 'g', 400, 80, 7, 6, 0, 'bebidas', ['whey', 'proteina', 'proteína', 'batido proteinas']),
  f('leche_almendra', 'Leche de almendra', 'Almond milk', 250, 'ml', 15, 0.5, 0.3, 1.1, 0.2, 'bebidas', ['bebida almendra']),
  f('leche_avena', 'Leche de avena', 'Oat milk', 250, 'ml', 43, 1, 6.7, 1.5, 0.8, 'bebidas', ['bebida avena']),

  // ── DULCES Y SNACKS ──
  f('chocolate_negro', 'Chocolate negro 70%', 'Dark chocolate 70%', 20, 'g', 598, 8, 46, 43, 11, 'dulces', ['chocolate negro', 'chocolate']),
  f('chocolate_leche', 'Chocolate con leche', 'Milk chocolate', 20, 'g', 535, 8, 59, 30, 3, 'dulces', ['chocolate']),
  f('galletas', 'Galletas María', 'Maria biscuits', 20, 'g', 436, 7, 74, 12, 2, 'dulces', ['galleta', 'galletas']),
  f('helado', 'Helado de vainilla', 'Vanilla ice cream', 100, 'g', 207, 3.5, 24, 11, 0.7, 'dulces', ['helado']),
  f('natillas', 'Natillas', 'Custard', 125, 'g', 109, 3.4, 16, 3.6, 0, 'dulces', []),
  f('flan', 'Flan de huevo', 'Egg flan', 100, 'g', 126, 3.6, 20, 3.5, 0, 'dulces', []),
  f('magdalena', 'Magdalena', 'Muffin', 30, 'g', 390, 6, 52, 17, 1, 'dulces', ['muffin']),
  f('croissant', 'Croissant', 'Croissant', 60, 'g', 406, 8, 45, 21, 2, 'dulces', ['cruasán']),
  f('donuts', 'Donut', 'Donut', 55, 'g', 421, 5, 49, 23, 1, 'dulces', ['dona', 'rosquilla']),
  f('turrón', 'Turrón de Alicante', 'Alicante nougat', 30, 'g', 500, 14, 41, 31, 4, 'dulces', ['turron']),

  // ── COMIDAS PREPARADAS ESPAÑOLAS ──
  f('paella', 'Paella valenciana', 'Valencian paella', 350, 'g', 130, 8, 16, 4, 0.5, 'platos', ['paella', 'arroz con pollo']),
  f('gazpacho', 'Gazpacho', 'Gazpacho', 250, 'ml', 44, 0.7, 4, 2.6, 0.7, 'platos', ['gazpacho andaluz']),
  f('croquetas', 'Croquetas de jamón', 'Ham croquettes', 30, 'g', 245, 8, 22, 13, 0.5, 'platos', ['croqueta', 'croquetas']),
  f('ensalada_mixta', 'Ensalada mixta', 'Mixed salad', 200, 'g', 20, 1, 3, 0.3, 1.5, 'platos', ['ensalada']),
  f('cocido', 'Cocido madrileño', 'Madrid stew', 350, 'g', 95, 7, 8, 4, 2, 'platos', ['cocido']),
  f('fabada', 'Fabada asturiana', 'Asturian bean stew', 350, 'g', 120, 7, 12, 5, 3, 'platos', ['fabada']),
  f('sopa', 'Sopa de verduras', 'Vegetable soup', 300, 'ml', 30, 1, 5, 0.5, 1, 'platos', ['sopa', 'caldo']),
  f('sandwich_mixto', 'Sándwich mixto', 'Ham & cheese sandwich', 120, 'g', 250, 12, 26, 11, 1, 'platos', ['sandwich', 'bocadillo', 'bocata']),
  f('pizza_margarita', 'Pizza margarita', 'Margherita pizza', 100, 'g', 266, 11, 33, 10, 2, 'platos', ['pizza']),
  f('wrap', 'Wrap de pollo', 'Chicken wrap', 200, 'g', 180, 12, 20, 6, 1, 'platos', ['wrap', 'burrito']),
  f('empanada', 'Empanada de atún', 'Tuna empanada', 100, 'g', 280, 10, 30, 13, 1, 'platos', ['empanada', 'empanadilla']),
  f('taco', 'Taco', 'Taco', 80, 'g', 210, 9, 20, 10, 2, 'platos', ['tacos']),
  f('sushi_salmon', 'Sushi de salmón (6 piezas)', 'Salmon sushi (6 pcs)', 180, 'g', 140, 6, 22, 3, 0.5, 'platos', ['sushi', 'maki']),

  // ── SALSAS Y CONDIMENTOS ──
  f('tomate_frito', 'Tomate frito', 'Tomato sauce', 50, 'g', 75, 1.2, 9, 3.5, 1, 'salsas', ['salsa tomate', 'sofrito']),
  f('mayonesa', 'Mayonesa', 'Mayonnaise', 15, 'g', 680, 1, 0.6, 75, 0, 'salsas', ['mayo']),
  f('ketchup', 'Ketchup', 'Ketchup', 15, 'g', 112, 1.7, 26, 0.1, 0.3, 'salsas', []),
  f('mostaza', 'Mostaza', 'Mustard', 10, 'g', 66, 4, 6, 3, 3, 'salsas', []),
  f('salsa_soja', 'Salsa de soja', 'Soy sauce', 15, 'ml', 53, 8, 5, 0, 0.8, 'salsas', ['soja']),
  f('miel', 'Miel', 'Honey', 15, 'g', 304, 0.3, 82, 0, 0.2, 'salsas', []),
  f('mermelada', 'Mermelada', 'Jam', 15, 'g', 250, 0.4, 63, 0, 0.7, 'salsas', ['confitura']),
];

// ============================================
// EN → ES FOOD NAME TRANSLATION MAP
// ============================================
// For translating English product names from Open Food Facts

export const EN_TO_ES_FOOD_NAMES: Record<string, string> = {
  // Proteins
  'egg': 'Huevo', 'eggs': 'Huevos', 'boiled egg': 'Huevo cocido', 'fried egg': 'Huevo frito',
  'scrambled egg': 'Huevo revuelto', 'omelette': 'Tortilla francesa', 'egg white': 'Clara de huevo',
  'chicken': 'Pollo', 'chicken breast': 'Pechuga de pollo', 'chicken thigh': 'Muslo de pollo',
  'turkey': 'Pavo', 'turkey breast': 'Pechuga de pavo',
  'beef': 'Ternera', 'steak': 'Filete', 'ground beef': 'Carne picada',
  'pork': 'Cerdo', 'pork loin': 'Lomo de cerdo', 'pork chop': 'Chuleta de cerdo',
  'lamb': 'Cordero', 'ham': 'Jamón', 'bacon': 'Bacon',
  'sausage': 'Salchicha', 'burger': 'Hamburguesa',

  // Fish
  'salmon': 'Salmón', 'tuna': 'Atún', 'canned tuna': 'Atún en lata',
  'cod': 'Bacalao', 'hake': 'Merluza', 'sardine': 'Sardina', 'sardines': 'Sardinas',
  'shrimp': 'Gambas', 'prawns': 'Gambas', 'octopus': 'Pulpo',
  'squid': 'Calamar', 'mussels': 'Mejillones', 'anchovy': 'Anchoa', 'anchovies': 'Anchoas',
  'sea bass': 'Lubina', 'trout': 'Trucha',

  // Dairy
  'milk': 'Leche', 'whole milk': 'Leche entera', 'skimmed milk': 'Leche desnatada',
  'yogurt': 'Yogur', 'yoghurt': 'Yogur', 'greek yogurt': 'Yogur griego',
  'cheese': 'Queso', 'cream cheese': 'Queso crema', 'cottage cheese': 'Requesón',
  'butter': 'Mantequilla', 'cream': 'Nata', 'whipped cream': 'Nata montada',
  'mozzarella': 'Mozzarella', 'parmesan': 'Parmesano', 'cheddar': 'Cheddar',

  // Grains
  'rice': 'Arroz', 'white rice': 'Arroz blanco', 'brown rice': 'Arroz integral',
  'pasta': 'Pasta', 'spaghetti': 'Espaguetis', 'macaroni': 'Macarrones', 'noodles': 'Fideos',
  'bread': 'Pan', 'white bread': 'Pan blanco', 'whole wheat bread': 'Pan integral',
  'toast': 'Tostada', 'oats': 'Avena', 'oatmeal': 'Avena', 'cereal': 'Cereales',
  'quinoa': 'Quinoa', 'couscous': 'Cuscús', 'tortilla': 'Tortilla (de trigo)',
  'flour': 'Harina', 'cornflakes': 'Copos de maíz', 'granola': 'Granola',

  // Fruits
  'banana': 'Plátano', 'apple': 'Manzana', 'orange': 'Naranja', 'pear': 'Pera',
  'strawberry': 'Fresa', 'strawberries': 'Fresas', 'grape': 'Uva', 'grapes': 'Uvas',
  'peach': 'Melocotón', 'kiwi': 'Kiwi', 'pineapple': 'Piña', 'watermelon': 'Sandía',
  'melon': 'Melón', 'mango': 'Mango', 'avocado': 'Aguacate', 'cherry': 'Cereza',
  'cherries': 'Cerezas', 'blueberry': 'Arándano', 'blueberries': 'Arándanos',
  'raspberry': 'Frambuesa', 'raspberries': 'Frambuesas', 'lemon': 'Limón', 'lime': 'Lima',
  'coconut': 'Coco', 'fig': 'Higo', 'figs': 'Higos', 'pomegranate': 'Granada',
  'plum': 'Ciruela', 'apricot': 'Albaricoque',

  // Vegetables
  'tomato': 'Tomate', 'tomatoes': 'Tomates', 'lettuce': 'Lechuga', 'cucumber': 'Pepino',
  'carrot': 'Zanahoria', 'carrots': 'Zanahorias', 'onion': 'Cebolla', 'garlic': 'Ajo',
  'pepper': 'Pimiento', 'bell pepper': 'Pimiento', 'broccoli': 'Brócoli',
  'spinach': 'Espinacas', 'zucchini': 'Calabacín', 'eggplant': 'Berenjena',
  'mushroom': 'Champiñón', 'mushrooms': 'Champiñones', 'potato': 'Patata', 'potatoes': 'Patatas',
  'sweet potato': 'Boniato', 'corn': 'Maíz', 'peas': 'Guisantes', 'beans': 'Alubias',
  'lentils': 'Lentejas', 'chickpeas': 'Garbanzos', 'asparagus': 'Espárragos',
  'celery': 'Apio', 'cabbage': 'Col', 'cauliflower': 'Coliflor', 'beetroot': 'Remolacha',
  'artichoke': 'Alcachofa', 'green beans': 'Judías verdes',

  // Nuts & Seeds
  'almonds': 'Almendras', 'walnuts': 'Nueces', 'peanuts': 'Cacahuetes',
  'pistachios': 'Pistachos', 'hazelnuts': 'Avellanas', 'cashews': 'Anacardos',
  'chia seeds': 'Semillas de chía', 'flaxseed': 'Semillas de lino',
  'peanut butter': 'Crema de cacahuete', 'sunflower seeds': 'Pipas de girasol',

  // Beverages
  'coffee': 'Café', 'tea': 'Té', 'juice': 'Zumo', 'orange juice': 'Zumo de naranja',
  'water': 'Agua', 'beer': 'Cerveza', 'wine': 'Vino', 'red wine': 'Vino tinto',
  'white wine': 'Vino blanco', 'soda': 'Refresco', 'smoothie': 'Batido',
  'protein shake': 'Batido de proteína', 'almond milk': 'Leche de almendra',
  'oat milk': 'Leche de avena', 'soy milk': 'Leche de soja',

  // Sweets & Snacks
  'chocolate': 'Chocolate', 'dark chocolate': 'Chocolate negro',
  'cookies': 'Galletas', 'cookie': 'Galleta', 'biscuit': 'Galleta',
  'ice cream': 'Helado', 'cake': 'Tarta', 'pie': 'Tarta',
  'donut': 'Donut', 'croissant': 'Croissant', 'muffin': 'Magdalena',
  'candy': 'Caramelo', 'chips': 'Patatas fritas', 'popcorn': 'Palomitas',

  // Sauces
  'ketchup': 'Ketchup', 'mayonnaise': 'Mayonesa', 'mustard': 'Mostaza',
  'soy sauce': 'Salsa de soja', 'honey': 'Miel', 'jam': 'Mermelada',
  'olive oil': 'Aceite de oliva', 'vinegar': 'Vinagre', 'salt': 'Sal', 'sugar': 'Azúcar',

  // Common meals
  'pizza': 'Pizza', 'sandwich': 'Sándwich', 'salad': 'Ensalada', 'soup': 'Sopa',
  'sushi': 'Sushi', 'wrap': 'Wrap', 'burrito': 'Burrito', 'taco': 'Taco',
  'french fries': 'Patatas fritas', 'fried rice': 'Arroz frito',
  'pancake': 'Tortita', 'pancakes': 'Tortitas', 'waffle': 'Gofre',
};

// ============================================
// SEARCH FUNCTION
// ============================================

/**
 * Search the Spanish foods database — accent-insensitive, alias-aware
 */
export function searchSpanishFoods(query: string): FoodItem[] {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(query.trim());
  if (q.length < 2) return [];

  // Score-based matching for better relevance
  const scored = SPANISH_FOODS
    .map((food) => {
      const nameN = normalize(food.name);
      const nameEnN = normalize(food.nameEn || '');
      const aliasesN = food.aliases.map(normalize);

      let score = 0;

      // Exact match on name
      if (nameN === q) score = 100;
      // Name starts with query
      else if (nameN.startsWith(q)) score = 90;
      // Alias exact match
      else if (aliasesN.some(a => a === q)) score = 85;
      // Alias starts with query
      else if (aliasesN.some(a => a.startsWith(q))) score = 80;
      // Name contains query
      else if (nameN.includes(q)) score = 70;
      // Alias contains query
      else if (aliasesN.some(a => a.includes(q))) score = 60;
      // English name match (for bilingual users)
      else if (nameEnN.includes(q)) score = 50;
      // Partial word match (query is part of a word in the name)
      else {
        const words = nameN.split(/\s+/);
        if (words.some(w => w.startsWith(q))) score = 65;
      }

      return { food, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ food }) => food as FoodItem);

  return scored;
}

/**
 * Translate an English food name to Spanish using the map
 * Falls back to the original name if no translation found
 */
export function translateFoodName(englishName: string): string {
  const lower = englishName.toLowerCase().trim();

  // Try exact match first
  if (EN_TO_ES_FOOD_NAMES[lower]) return EN_TO_ES_FOOD_NAMES[lower];

  // Try matching the longest substring from the end
  // e.g., "Organic Free Range Eggs" → try "eggs" → "Huevos"
  const words = lower.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const sub = words.slice(i).join(' ');
    if (EN_TO_ES_FOOD_NAMES[sub]) return EN_TO_ES_FOOD_NAMES[sub];
  }

  // Try last word only
  const lastWord = words[words.length - 1];
  if (EN_TO_ES_FOOD_NAMES[lastWord]) return EN_TO_ES_FOOD_NAMES[lastWord];

  return englishName; // No translation found
}

/**
 * Check if a product name appears to be in English
 */
export function looksEnglish(name: string): boolean {
  const englishIndicators = /\b(with|and|free|range|organic|raw|fresh|natural|light|low|fat|sugar|whole|grain|roasted|baked|fried|grilled|smoked|dried|frozen|canned|sliced|chopped)\b/i;
  return englishIndicators.test(name);
}
