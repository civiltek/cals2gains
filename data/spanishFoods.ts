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

  // ══════════════════════════════════════════════════════
  // EXPANSIÓN v2 — COMIDA LATINOAMERICANA Y ESPAÑOLA AMPLIADA
  // Sources: BEDCA, INCAP, USDA Latin American adaptations
  // ══════════════════════════════════════════════════════

  // ── MEXICANA ──
  f('taco_al_pastor', 'Taco al pastor', 'Al pastor taco', 80, 'g', 218, 12, 20, 9, 2, 'mexicana', ['al pastor', 'pastor']),
  f('taco_carnitas', 'Taco de carnitas', 'Carnitas taco', 80, 'g', 230, 13, 19, 10, 2, 'mexicana', ['carnitas']),
  f('taco_suadero', 'Taco de suadero', 'Suadero taco', 80, 'g', 225, 12, 20, 10, 2, 'mexicana', ['suadero']),
  f('enchiladas', 'Enchiladas', 'Enchiladas', 200, 'g', 168, 9, 17, 8, 2, 'mexicana', ['enchilada']),
  f('tamales', 'Tamales', 'Tamales', 100, 'g', 218, 7, 27, 9, 2, 'mexicana', ['tamal']),
  f('pozole_rojo', 'Pozole rojo', 'Red pozole', 350, 'g', 80, 6, 10, 2, 2, 'mexicana', ['pozole']),
  f('chilaquiles', 'Chilaquiles', 'Chilaquiles', 200, 'g', 220, 9, 25, 10, 3, 'mexicana', ['chilaquil']),
  f('mole_pollo', 'Pollo en mole', 'Chicken in mole sauce', 200, 'g', 210, 18, 12, 10, 3, 'mexicana', ['mole']),
  f('quesadilla', 'Quesadilla', 'Quesadilla', 120, 'g', 280, 14, 25, 14, 2, 'mexicana', ['quesadillas']),
  f('elote_cocido', 'Elote cocido', 'Corn on the cob', 150, 'g', 86, 3.3, 19, 1.4, 2.7, 'mexicana', ['elote', 'mazorca', 'choclo']),
  f('guacamole', 'Guacamole', 'Guacamole', 50, 'g', 152, 1.9, 8.6, 13.2, 5.4, 'mexicana', ['guacamol']),
  f('tostada_mexicana', 'Tostada mexicana', 'Mexican tostada', 80, 'g', 210, 8, 22, 10, 3, 'mexicana', ['tostada taco']),
  f('gordita', 'Gordita', 'Gordita', 100, 'g', 215, 6, 30, 8, 3, 'mexicana', ['gorditas']),
  f('sope', 'Sope', 'Sope', 80, 'g', 190, 7, 25, 7, 2, 'mexicana', ['sopes']),
  f('chile_relleno', 'Chile relleno', 'Stuffed chile pepper', 150, 'g', 180, 8, 12, 11, 3, 'mexicana', ['chiles rellenos']),
  f('barbacoa_mex', 'Barbacoa', 'Mexican barbacoa', 150, 'g', 225, 18, 0, 16, 0, 'mexicana', ['barbacoa']),
  f('carnitas_cerdo', 'Carnitas de cerdo', 'Braised pork carnitas', 150, 'g', 290, 22, 1, 22, 0, 'mexicana', []),
  f('birria', 'Birria', 'Birria (goat stew)', 300, 'g', 95, 9, 5, 5, 1, 'mexicana', []),
  f('flautas', 'Flautas', 'Rolled crispy tacos', 80, 'g', 240, 10, 22, 13, 2, 'mexicana', ['flauta']),
  f('huarache_mex', 'Huarache mexicano', 'Mexican huarache', 150, 'g', 200, 8, 28, 7, 3, 'mexicana', ['huarache']),
  f('tlayuda', 'Tlayuda oaxaqueña', 'Oaxacan tlayuda', 200, 'g', 310, 14, 35, 13, 4, 'mexicana', ['tlayuda']),
  f('molletes_mex', 'Molletes', 'Bean toast Mexican style', 120, 'g', 230, 9, 30, 8, 4, 'mexicana', ['mollete']),
  f('enfrijoladas', 'Enfrijoladas', 'Tortillas in black bean sauce', 200, 'g', 160, 8, 18, 7, 5, 'mexicana', []),
  f('tamale_dulce', 'Tamal dulce', 'Sweet tamale', 100, 'g', 240, 4, 36, 9, 1, 'mexicana', ['tamal de dulce', 'tamal de rajas']),
  f('tortilla_maiz', 'Tortilla de maíz', 'Corn tortilla', 30, 'g', 218, 5.6, 46, 2.5, 4, 'mexicana', ['tortilla maiz', 'taco shell']),

  // ── ARGENTINA / URUGUAYA ──
  f('milanesa_ternera', 'Milanesa de ternera', 'Breaded beef milanesa', 150, 'g', 280, 22, 15, 15, 1, 'argentina', ['milanesa']),
  f('milanesa_napolitana', 'Milanesa napolitana', 'Napolitana milanesa', 200, 'g', 295, 22, 15, 17, 1, 'argentina', ['napolitana']),
  f('choripan', 'Choripán', 'Argentine chorizo sandwich', 180, 'g', 380, 18, 28, 22, 1, 'argentina', ['choripan']),
  f('asado_parrilla', 'Asado a la parrilla', 'Argentine grilled beef', 200, 'g', 310, 28, 0, 22, 0, 'argentina', ['asado', 'parrillada']),
  f('dulce_leche', 'Dulce de leche', 'Dulce de leche caramel', 15, 'g', 320, 5, 55, 9, 0, 'argentina', ['dulce de leche', 'arequipe', 'manjar']),
  f('alfajor', 'Alfajor', 'Argentine alfajor cookie', 50, 'g', 450, 5, 65, 19, 1, 'argentina', ['alfajores']),
  f('medialunas', 'Medialunas', 'Argentine croissant', 40, 'g', 375, 8, 46, 18, 1, 'argentina', ['medialuna']),
  f('locro', 'Locro', 'Argentine thick stew', 350, 'g', 145, 8, 18, 5, 4, 'argentina', ['locro argentino']),
  f('empanada_criolla', 'Empanada criolla', 'Argentine beef empanada', 80, 'g', 280, 10, 27, 15, 1, 'argentina', ['empanada criolla']),
  f('factura_arg', 'Factura (pastelería)', 'Argentine pastry', 50, 'g', 390, 6, 50, 18, 1, 'argentina', ['facturas', 'facturas argentinas']),
  f('mate_bebida', 'Mate', 'Mate (herbal infusion)', 200, 'ml', 4, 0.2, 0.5, 0, 0.3, 'argentina', ['mate amargo', 'yerba mate']),
  f('provoleta', 'Provoleta', 'Grilled provolone cheese', 80, 'g', 350, 22, 2, 28, 0, 'argentina', ['provolone a la parrilla']),
  f('chipa', 'Chipa', 'Paraguayan cheese bread', 40, 'g', 320, 8, 36, 16, 1, 'argentina', ['chipas']),
  f('pasta_frola', 'Pasta frola', 'Quince paste tart', 80, 'g', 380, 5, 55, 15, 1, 'argentina', ['tarta de membrillo']),
  f('puchero_arg', 'Puchero argentino', 'Argentine puchero stew', 350, 'g', 105, 8, 10, 4, 2, 'argentina', ['puchero']),

  // ── COLOMBIANA / VENEZOLANA ──
  f('arepa_maiz', 'Arepa de maíz', 'Corn arepa', 100, 'g', 195, 4, 40, 2, 3, 'colombiana', ['arepa', 'arepas', 'arepa venezolana']),
  f('arepa_queso', 'Arepa rellena de queso', 'Cheese-stuffed arepa', 130, 'g', 250, 9, 38, 8, 3, 'colombiana', ['arepa con queso', 'arepa de chócolo']),
  f('bandeja_paisa', 'Bandeja paisa', 'Colombian bandeja paisa', 500, 'g', 135, 9, 12, 6, 3, 'colombiana', ['bandeja', 'paisa']),
  f('patakon', 'Patacón', 'Double-fried green plantain', 100, 'g', 190, 1.5, 32, 7, 2, 'colombiana', ['patacon', 'tostón', 'patacones']),
  f('pabellon_criollo', 'Pabellón criollo', 'Venezuelan rice beans beef dish', 400, 'g', 115, 8, 14, 3, 3, 'colombiana', ['pabellon']),
  f('cachapa', 'Cachapa', 'Sweet corn pancake Venezuelan', 120, 'g', 185, 5, 30, 6, 2, 'colombiana', ['cachapas']),
  f('tequenos', 'Tequeños', 'Venezuelan cheese sticks', 40, 'g', 335, 10, 36, 17, 1, 'colombiana', ['tequeno', 'tequeños']),
  f('sancocho_col', 'Sancocho colombiano', 'Colombian sancocho soup', 400, 'g', 75, 5, 9, 2, 2, 'colombiana', ['sancocho']),
  f('ajiaco', 'Ajiaco bogotano', 'Bogotá chicken potato soup', 400, 'g', 65, 5, 8, 1.5, 1.5, 'colombiana', ['ajiaco']),
  f('obleas', 'Obleas con arequipe', 'Wafer with dulce de leche', 30, 'g', 300, 4, 52, 8, 0, 'colombiana', ['obleas']),
  f('pan_de_bono', 'Pan de bono', 'Colombian cheese bread', 40, 'g', 310, 7, 38, 14, 1, 'colombiana', ['pandebono']),
  f('hallaca', 'Hallaca', 'Venezuelan corn dough wrap', 150, 'g', 210, 8, 25, 8, 2, 'colombiana', ['hayaca']),
  f('carimañola', 'Carimañola', 'Colombian yuca roll', 80, 'g', 220, 7, 30, 8, 2, 'colombiana', []),
  f('mondongo', 'Mondongo', 'Tripe soup', 350, 'g', 70, 6, 8, 2, 1.5, 'colombiana', ['menudo']),
  f('mazamorra', 'Mazamorra', 'Colombian corn drink', 250, 'g', 60, 1.5, 12, 0.5, 1, 'colombiana', []),

  // ── PERUANA ──
  f('ceviche_peruano', 'Ceviche peruano', 'Peruvian ceviche', 200, 'g', 98, 14, 8, 2, 1.5, 'peruana', ['ceviche', 'seviche']),
  f('lomo_saltado', 'Lomo saltado', 'Peruvian stir-fried beef', 300, 'g', 175, 14, 16, 7, 2, 'peruana', ['lomo saltado']),
  f('aji_gallina', 'Ají de gallina', 'Chicken in aji amarillo sauce', 300, 'g', 165, 13, 12, 7, 2, 'peruana', ['aji de gallina']),
  f('causa_limena', 'Causa limeña', 'Peruvian stuffed potato cake', 200, 'g', 155, 6, 22, 5, 2, 'peruana', ['causa']),
  f('arroz_chaufa', 'Arroz chaufa', 'Peruvian fried rice', 300, 'g', 170, 9, 25, 5, 1.5, 'peruana', ['chaufa']),
  f('papa_rellena', 'Papa rellena', 'Peruvian stuffed potato', 150, 'g', 200, 8, 25, 8, 2, 'peruana', ['papas rellenas']),
  f('anticuchos', 'Anticuchos', 'Grilled beef heart skewers', 100, 'g', 175, 20, 4, 9, 1, 'peruana', ['anticucho']),
  f('tacu_tacu', 'Tacu-tacu', 'Peruvian beans and rice cake', 300, 'g', 155, 8, 25, 4, 4, 'peruana', ['tacutacu']),
  f('aguadito', 'Aguadito de pollo', 'Peruvian cilantro chicken soup', 400, 'g', 65, 5, 8, 1.5, 1, 'peruana', ['aguadito']),
  f('rocoto_relleno', 'Rocoto relleno', 'Peruvian stuffed rocoto pepper', 200, 'g', 180, 10, 12, 9, 3, 'peruana', ['rocoto']),
  f('picarones', 'Picarones', 'Peruvian sweet potato donuts', 80, 'g', 270, 4, 35, 13, 3, 'peruana', ['picarón']),
  f('suspiro_limeno', 'Suspiro limeño', 'Peruvian meringue dessert', 100, 'g', 280, 4, 44, 10, 0, 'peruana', ['suspiro']),

  // ── CENTROAMERICANA ──
  f('pupusas', 'Pupusas', 'Salvadoran corn pupusas', 100, 'g', 190, 6, 28, 6, 2, 'centroamericana', ['pupusa']),
  f('gallo_pinto', 'Gallo pinto', 'Costa Rican rice and beans', 200, 'g', 145, 6, 28, 2, 4, 'centroamericana', ['gallopinto', 'gallo pinto']),
  f('baleadas', 'Baleadas', 'Honduran bean flour tortilla', 150, 'g', 255, 10, 32, 10, 4, 'centroamericana', ['baleada']),
  f('casamiento', 'Casamiento', 'Salvadoran rice and beans', 200, 'g', 130, 5, 25, 2, 3, 'centroamericana', []),
  f('vigoron', 'Vigorón', 'Nicaraguan yuca and chicharrón', 200, 'g', 165, 5, 25, 6, 3, 'centroamericana', ['vigoron']),
  f('nacatamal', 'Nacatamal', 'Nicaraguan corn tamale', 200, 'g', 215, 8, 26, 8, 3, 'centroamericana', []),
  f('sopa_res', 'Sopa de res', 'Central American beef soup', 400, 'g', 70, 6, 8, 2, 2, 'centroamericana', ['caldo de res']),
  f('tamales_ca', 'Tamales centroamericanos', 'Central American tamales', 150, 'g', 200, 6, 28, 7, 3, 'centroamericana', ['tamal centroamericano']),
  f('chao_mein_ca', 'Chao mein centroamericano', 'Central American chow mein', 250, 'g', 155, 6, 24, 5, 2, 'centroamericana', ['chao mein']),
  f('tortilla_maiz_ca', 'Tortillita de maíz (CA)', 'Small Central American corn tortilla', 25, 'g', 218, 5.6, 46, 2.5, 4, 'centroamericana', []),

  // ── CARIBEÑA ──
  f('mofongo', 'Mofongo', 'Puerto Rican mashed plantain', 200, 'g', 225, 5, 35, 9, 3, 'caribena', ['mofongo']),
  f('tostones', 'Tostones', 'Double-fried green plantain', 100, 'g', 190, 1.5, 32, 7, 2, 'caribena', ['toston', 'tostones']),
  f('ropa_vieja', 'Ropa vieja', 'Cuban shredded beef stew', 250, 'g', 170, 18, 8, 7, 2, 'caribena', ['ropa vieja']),
  f('arroz_gandules', 'Arroz con gandules', 'Puerto Rican rice with pigeon peas', 200, 'g', 165, 5, 32, 3, 3, 'caribena', ['gandules', 'arroz con porotos']),
  f('pernil', 'Pernil', 'Slow-roasted pork leg Caribbean', 150, 'g', 280, 24, 0, 20, 0, 'caribena', ['pernil asado']),
  f('tembleque', 'Tembleque', 'Puerto Rican coconut pudding', 120, 'g', 175, 2, 21, 9, 0.5, 'caribena', []),
  f('platano_maduro', 'Plátano maduro frito', 'Fried sweet plantain (ripe)', 100, 'g', 180, 1, 32, 6, 2, 'caribena', ['maduros', 'platano frito', 'amarillos']),
  f('jibarito', 'Jibarito', 'Puerto Rican plantain sandwich', 200, 'g', 310, 12, 40, 12, 4, 'caribena', []),
  f('pasteles_pr', 'Pasteles puertorriqueños', 'Puerto Rican pasteles', 150, 'g', 220, 8, 27, 9, 3, 'caribena', ['pasteles']),
  f('sancocho_caribe', 'Sancocho caribeño', 'Caribbean sancocho', 400, 'g', 80, 6, 10, 2, 2, 'caribena', []),

  // ── ESPAÑOLA AMPLIADA ──
  f('salmorejo', 'Salmorejo cordobés', 'Córdoba cold tomato cream', 250, 'g', 80, 2, 7, 5, 1, 'platos', ['salmorejo']),
  f('pisto_manchego', 'Pisto manchego', 'La Mancha ratatouille', 200, 'g', 55, 1.5, 7, 2.5, 2, 'platos', ['pisto', 'samfaina']),
  f('migas_extremenas', 'Migas extremeñas', 'Extremaduran fried breadcrumbs', 200, 'g', 275, 8, 30, 14, 2, 'platos', ['migas']),
  f('callos_madrid', 'Callos a la madrileña', 'Madrid-style tripe stew', 250, 'g', 145, 12, 8, 8, 1, 'platos', ['callos']),
  f('fideua', 'Fideuá valenciana', 'Valencian noodle paella', 350, 'g', 155, 10, 18, 5, 1, 'platos', ['fideua', 'fideuá']),
  f('arroz_banda', 'Arroz a banda', 'Rice cooked in seafood broth', 350, 'g', 160, 9, 22, 4, 1, 'platos', ['arroz a banda']),
  f('escalivada', 'Escalivada', 'Catalan roasted vegetables', 150, 'g', 52, 1, 7, 2.5, 2, 'platos', ['escalibada']),
  f('menestra', 'Menestra de verduras', 'Spanish vegetable stew', 300, 'g', 60, 3, 9, 2, 3, 'platos', ['menestra']),
  f('albondigas_salsa', 'Albóndigas en salsa', 'Meatballs in tomato sauce', 200, 'g', 210, 14, 10, 13, 1, 'platos', ['albóndigas', 'albondigas']),
  f('sepia_plancha', 'Sepia a la plancha', 'Grilled cuttlefish', 150, 'g', 95, 19, 1, 1.5, 0, 'platos', ['sepia', 'jibia']),
  f('bacalao_pil_pil', 'Bacalao al pil-pil', 'Basque pil-pil cod', 200, 'g', 195, 20, 0, 12, 0, 'platos', ['pil pil', 'bacalao pil']),
  f('porrusalda', 'Porrusalda', 'Basque leek and potato soup', 350, 'g', 55, 1.5, 9, 1.5, 2, 'platos', []),
  f('rabo_toro', 'Rabo de toro estofado', 'Braised oxtail Córdoba style', 200, 'g', 255, 19, 8, 17, 1, 'platos', ['rabo toro', 'oxtail']),
  f('merluza_verde', 'Merluza en salsa verde', 'Hake in green parsley sauce', 200, 'g', 105, 17, 3, 3, 0.5, 'platos', ['merluza salsa verde']),
  f('conejo_guisado', 'Conejo guisado', 'Spanish rabbit stew', 200, 'g', 175, 22, 5, 8, 1, 'platos', ['conejo en salsa']),
  f('patatas_guisadas', 'Patatas guisadas', 'Spanish braised potatoes', 300, 'g', 90, 2, 18, 2, 2.5, 'platos', ['patatas en salsa']),
  f('cochinillo_asado', 'Cochinillo asado segoviano', 'Segovian roast suckling pig', 200, 'g', 340, 24, 0, 27, 0, 'platos', ['cochinillo', 'tostón']),
  f('empanada_gallega', 'Empanada gallega de atún', 'Galician tuna pie', 100, 'g', 255, 9, 27, 12, 1.5, 'platos', ['empanada gallega']),
  f('arroz_cubana', 'Arroz a la cubana', 'Cuban-style rice with tomato', 250, 'g', 175, 7, 28, 5, 1, 'platos', ['arroz cubana']),
  f('huevos_estrellados', 'Huevos estrellados con patatas', 'Smashed eggs with potatoes', 250, 'g', 265, 12, 22, 15, 2, 'platos', ['huevos rotos', 'patatas con huevos']),

  // ── TAPAS ──
  f('patatas_bravas', 'Patatas bravas', 'Spicy potatoes with aioli', 150, 'g', 230, 3, 28, 12, 3, 'tapas', ['bravas', 'patatas bravas']),
  f('boquerones_vinagre', 'Boquerones en vinagre', 'White anchovies in vinegar', 60, 'g', 105, 14, 0, 6, 0, 'tapas', ['boquerones', 'boquerones blancos']),
  f('gambas_ajillo', 'Gambas al ajillo', 'Garlic sautéed prawns', 100, 'g', 145, 18, 1, 8, 0, 'tapas', ['gambas ajillo']),
  f('pimientos_padron', 'Pimientos de Padrón', 'Galician Padrón peppers', 100, 'g', 45, 2, 7, 1.5, 2, 'tapas', ['padron', 'padrón', 'pimientos padrón']),
  f('pan_tomate', 'Pan con tomate', 'Catalan bread with tomato', 60, 'g', 180, 5, 28, 6, 2, 'tapas', ['pa amb tomaquet', 'pan con tomate']),
  f('montadito', 'Montadito', 'Small open sandwich pintxo', 40, 'g', 150, 5, 16, 7, 1, 'tapas', ['pintxo', 'pincho', 'montaditos']),
  f('aceitunas', 'Aceitunas aliñadas', 'Marinated olives', 20, 'g', 128, 0.8, 4, 12, 2, 'tapas', ['aceitunas', 'olivas', 'aceituna']),
  f('berberechos', 'Berberechos al vapor', 'Steamed cockles', 80, 'g', 78, 15, 2, 1, 0, 'tapas', ['berberecho']),
  f('puntillitas', 'Puntillitas fritas', 'Fried baby squid', 100, 'g', 210, 15, 16, 9, 0, 'tapas', ['puntillitas', 'chopitos']),
  f('chistorra', 'Chistorra', 'Basque thin spiced sausage', 30, 'g', 415, 18, 2, 37, 0, 'tapas', ['txistorra']),
  f('gilda_pintxo', 'Gilda (pintxo)', 'Gilda pintxo with anchovy olive pepper', 30, 'g', 120, 3, 2, 11, 0.5, 'tapas', ['gilda']),
  f('bocadillo_calamares', 'Bocadillo de calamares', 'Madrid squid sandwich', 150, 'g', 290, 13, 33, 11, 2, 'tapas', ['bocadillo calamar', 'calamares bocadillo']),
  f('tosta_salmon', 'Tosta de salmón', 'Smoked salmon toast', 80, 'g', 220, 14, 18, 10, 1, 'tapas', ['tosta salmon', 'tostada salmon']),

  // ── DESAYUNOS LATINOS ──
  f('huevos_rancheros', 'Huevos rancheros', 'Mexican ranch-style eggs', 200, 'g', 175, 10, 14, 9, 3, 'desayunos', ['rancheros']),
  f('mangu', 'Mangú', 'Dominican mashed plantain', 200, 'g', 155, 2, 35, 2, 3, 'desayunos', ['mangú', 'mangu']),
  f('calentado', 'Calentado colombiano', 'Colombian breakfast leftovers', 300, 'g', 155, 8, 22, 4, 4, 'desayunos', ['calentado']),
  f('perico_vene', 'Perico venezolano', 'Venezuelan scrambled eggs with tomato', 150, 'g', 145, 10, 5, 10, 1, 'desayunos', ['perico']),
  f('pan_frances_leche', 'Torrejas', 'Latin French toast', 150, 'g', 240, 8, 38, 7, 1, 'desayunos', ['torrejas', 'French toast latino']),
  f('tapioca_br', 'Tapioca brasileña', 'Brazilian tapioca crepe', 80, 'g', 180, 1, 44, 0.1, 0.5, 'desayunos', ['tapioca', 'beiju']),
  f('arepas_desayuno', 'Arepa de desayuno', 'Breakfast arepa simple', 80, 'g', 185, 4, 38, 2, 3, 'desayunos', []),
  f('atol', 'Atol de maíz', 'Corn atole drink', 250, 'g', 95, 2, 21, 0.5, 0.5, 'desayunos', ['atole', 'champurrado']),

  // ── POSTRES LATINOAMERICANOS Y ESPAÑOLES ──
  f('churros', 'Churros', 'Spanish fried dough churros', 60, 'g', 370, 5, 45, 19, 2, 'postres', ['churro']),
  f('tres_leches', 'Pastel tres leches', 'Three milks cake', 100, 'g', 285, 5, 37, 13, 0, 'postres', ['tres leches']),
  f('arroz_leche', 'Arroz con leche', 'Rice pudding', 150, 'g', 120, 3, 20, 3, 0.2, 'postres', ['arroz leche', 'rice pudding']),
  f('bunuelos', 'Buñuelos', 'Fried dough fritters', 60, 'g', 315, 5, 40, 15, 1, 'postres', ['buñuelo', 'buñuelos']),
  f('polvoron', 'Polvorón', 'Spanish almond shortbread', 25, 'g', 495, 7, 54, 28, 2, 'postres', ['mantecado', 'polvorones']),
  f('leche_frita', 'Leche frita', 'Spanish fried milk custard', 80, 'g', 195, 5, 27, 8, 0.3, 'postres', []),
  f('crema_catalana', 'Crema catalana', 'Catalan burnt cream', 125, 'g', 155, 3.5, 18, 8, 0, 'postres', ['creme brulee', 'crema catala']),
  f('bienmesabe', 'Bienmesabe canario', 'Canarian almond honey cream', 80, 'g', 340, 5, 46, 15, 2, 'postres', ['bienmesabe']),
  f('pestiños', 'Pestiños', 'Andalusian honey-glazed pastry', 30, 'g', 420, 4, 50, 22, 1, 'postres', ['pestiño']),
  f('tarta_santiago', 'Tarta de Santiago', 'Galician almond cake', 80, 'g', 430, 9, 46, 25, 4, 'postres', ['torta de Santiago']),
  f('roscon_reyes', 'Roscón de Reyes', 'Three Kings ring cake', 80, 'g', 310, 7, 55, 8, 1.5, 'postres', ['roscon']),
  f('mazapan', 'Mazapán', 'Spanish marzipan', 30, 'g', 445, 8, 63, 19, 2, 'postres', ['marzipan']),
  f('turrón_jijona', 'Turrón de Jijona (blando)', 'Soft Jijona nougat', 30, 'g', 540, 14, 44, 34, 4, 'postres', ['turrón blando', 'turron jijona']),
  f('membrillo', 'Carne de membrillo', 'Quince paste', 30, 'g', 251, 0.3, 64, 0.1, 4, 'postres', ['dulce de membrillo']),
  f('tiramisu', 'Tiramisú', 'Classic tiramisu', 100, 'g', 240, 5, 25, 13, 0.5, 'postres', ['tiramisu']),

  // ── BEBIDAS LATINAS Y NUEVAS ──
  f('horchata', 'Horchata de chufa', 'Tiger nut horchata', 250, 'ml', 66, 0.5, 15, 1, 0.1, 'bebidas', ['horchata', 'orxata']),
  f('agua_jamaica', 'Agua de Jamaica', 'Hibiscus flower water', 250, 'ml', 15, 0.2, 3.5, 0, 0, 'bebidas', ['jamaica', 'hibisco', 'flor de jamaica']),
  f('chicha_morada', 'Chicha morada', 'Peruvian purple corn drink', 250, 'ml', 50, 0.3, 12, 0, 0, 'bebidas', ['chicha']),
  f('agua_tamarindo', 'Agua de tamarindo', 'Tamarind water', 250, 'ml', 45, 0.3, 11, 0.1, 0.5, 'bebidas', ['tamarindo']),
  f('licuado', 'Licuado de frutas', 'Latin fruit smoothie', 300, 'ml', 90, 1.5, 20, 0.5, 1, 'bebidas', ['licuado', 'batido de frutas']),
  f('calimocho', 'Calimocho', 'Red wine with cola', 300, 'ml', 64, 0, 9, 0, 0, 'bebidas', ['kalimotxo']),
  f('tinto_verano', 'Tinto de verano', 'Red wine with lemonade', 300, 'ml', 70, 0, 7, 0, 0, 'bebidas', ['tinto verano']),
  f('vermut', 'Vermut', 'Spanish vermouth', 100, 'ml', 159, 0, 16, 0, 0, 'bebidas', ['vermú', 'vermú rojo']),
  f('clara_limon', 'Clara con limón', 'Beer with lemon shandy', 330, 'ml', 25, 0.3, 5, 0, 0, 'bebidas', ['clara', 'shandy']),
  f('colacao', 'Colacao / Cacao soluble', 'Chocolate malt drink powder', 25, 'g', 385, 9, 73, 6, 3, 'bebidas', ['nesquik', 'cacao soluble', 'Nesquik']),
  f('batido_chocolate', 'Batido de chocolate', 'Chocolate milkshake', 300, 'ml', 90, 3.5, 14, 3, 0.5, 'bebidas', ['batido choco']),
  f('zumo_manzana', 'Zumo de manzana', 'Apple juice', 250, 'ml', 46, 0.1, 11, 0.1, 0, 'bebidas', ['jugo manzana']),
  f('agua_coco', 'Agua de coco', 'Coconut water', 250, 'ml', 19, 0.7, 3.7, 0.2, 0, 'bebidas', ['coco water']),
  f('pisco', 'Pisco sour', 'Pisco sour cocktail', 100, 'ml', 140, 0.5, 10, 0, 0, 'bebidas', ['pisco']),

  // ── CARNES ESPAÑOLAS AMPLIADAS ──
  f('jamon_iberico', 'Jamón ibérico', 'Iberian cured ham', 30, 'g', 375, 30, 0, 28, 0, 'carnes', ['jamon iberico', 'pata negra', 'ibérico']),
  f('lomo_embuchado', 'Lomo embuchado', 'Cured pork loin', 30, 'g', 240, 32, 0, 13, 0, 'carnes', ['lomo curado']),
  f('morcilla', 'Morcilla', 'Spanish blood sausage', 30, 'g', 378, 13, 17, 31, 1, 'carnes', ['moronga', 'morcilla de Burgos']),
  f('butifarra', 'Butifarra', 'Catalan pork sausage', 80, 'g', 280, 17, 2, 23, 0, 'carnes', ['botifarra']),
  f('fuet', 'Fuet', 'Catalan dried thin sausage', 20, 'g', 450, 26, 2, 38, 0, 'carnes', ['fuet catalán']),
  f('sobrasada', 'Sobrasada', 'Mallorcan soft paprika sausage', 20, 'g', 464, 20, 2, 42, 0, 'carnes', ['sobrasada mallorca']),
  f('cecina', 'Cecina de vacuno', 'Cured air-dried beef', 30, 'g', 175, 31, 0, 6, 0, 'carnes', ['cecina']),
  f('secreto_iberico', 'Secreto ibérico', 'Iberian pork secret cut', 150, 'g', 225, 22, 0, 15, 0, 'carnes', ['secreto']),
  f('presa_iberica', 'Presa ibérica', 'Iberian pork presa cut', 150, 'g', 240, 20, 0, 17, 0, 'carnes', ['presa']),
  f('carrilleras', 'Carrilleras de cerdo', 'Braised pork cheeks', 180, 'g', 195, 19, 3, 12, 0, 'carnes', ['carrillada', 'mofletes']),
  f('conejo', 'Conejo de campo', 'Field rabbit', 150, 'g', 173, 25, 0, 8, 0, 'carnes', ['conejo', 'liebre']),
  f('pato_asado', 'Pato asado', 'Roast duck', 150, 'g', 335, 19, 0, 28, 0, 'carnes', ['pato']),
  f('codillo_cerdo', 'Codillo de cerdo', 'Pork knuckle', 200, 'g', 195, 18, 0, 14, 0, 'carnes', ['codillo']),
  f('prosciutto', 'Prosciutto / Jamón italiano', 'Italian prosciutto', 30, 'g', 219, 27, 0, 12, 0, 'carnes', ['prosciutto di parma']),
  f('mortadela', 'Mortadela', 'Italian mortadella', 30, 'g', 311, 14, 2, 28, 0, 'carnes', ['mortadella']),

  // ── PESCADOS AMPLIADOS ──
  f('lenguado', 'Lenguado a la plancha', 'Grilled sole', 150, 'g', 84, 16, 0, 2, 0, 'pescados', ['lenguado']),
  f('besugo', 'Besugo al horno', 'Baked red sea bream', 150, 'g', 97, 19, 0, 2.5, 0, 'pescados', ['besugo']),
  f('rape', 'Rape a la plancha', 'Grilled monkfish', 150, 'g', 76, 17, 0, 0.5, 0, 'pescados', ['rape', 'lotte']),
  f('rodaballo', 'Rodaballo', 'Turbot', 150, 'g', 95, 18, 0, 2.5, 0, 'pescados', []),
  f('pez_espada', 'Pez espada', 'Swordfish', 150, 'g', 121, 20, 0, 4.5, 0, 'pescados', ['emperador', 'espadón']),
  f('caballa', 'Caballa a la plancha', 'Grilled mackerel', 150, 'g', 205, 19, 0, 14, 0, 'pescados', ['caballa', 'scomber']),
  f('mero', 'Mero', 'Grouper', 150, 'g', 87, 18, 0, 1.5, 0, 'pescados', []),
  f('cigalas', 'Cigalas', 'Dublin Bay prawns', 100, 'g', 92, 20, 0, 1.5, 0, 'pescados', ['cigala', 'langostino tigre']),
  f('vieiras', 'Vieiras', 'Scallops', 80, 'g', 88, 15, 4, 1.5, 0, 'pescados', ['zamburiñas', 'vieira']),
  f('salmon_ahumado', 'Salmón ahumado', 'Smoked salmon', 50, 'g', 177, 21, 0, 10, 0, 'pescados', ['salmón ahumado']),
  f('surimi', 'Palitos de cangrejo', 'Crab sticks surimi', 50, 'g', 96, 10, 10, 2, 0, 'pescados', ['surimi', 'palitos de mar']),
  f('chipirón', 'Chipirones a la plancha', 'Grilled baby squid', 100, 'g', 92, 17, 2, 1.5, 0, 'pescados', ['chipirón', 'calamarín']),
  f('mejillones_escabeche', 'Mejillones en escabeche', 'Pickled mussels in canned', 60, 'g', 155, 11, 7, 9, 0, 'pescados', ['mejillones lata']),
  f('langosta', 'Langosta cocida', 'Cooked lobster', 150, 'g', 98, 20, 1.3, 1.5, 0, 'pescados', ['bogavante', 'lobster']),

  // ── LÁCTEOS AMPLIADOS ──
  f('queso_idiazabal', 'Queso Idiazábal', 'Basque smoked Idiazábal cheese', 30, 'g', 402, 27, 0.5, 33, 0, 'lacteos', ['idiazabal']),
  f('queso_tetilla', 'Queso tetilla', 'Galician tetilla cheese', 30, 'g', 328, 19, 0.5, 28, 0, 'lacteos', ['tetilla']),
  f('queso_crema', 'Queso crema', 'Cream cheese', 30, 'g', 342, 6, 3.8, 34, 0, 'lacteos', ['Philadelphia', 'queso philadelphia', 'queso en crema']),
  f('leche_condensada', 'Leche condensada', 'Sweetened condensed milk', 20, 'g', 321, 8, 55, 9, 0, 'lacteos', ['leche condensada azucarada']),
  f('kefir', 'Kéfir', 'Kefir fermented milk', 200, 'ml', 52, 3.5, 6, 1.5, 0, 'lacteos', ['kefir']),
  f('queso_azul', 'Queso azul', 'Blue cheese', 30, 'g', 353, 22, 2.3, 29, 0, 'lacteos', ['gorgonzola', 'roquefort', 'cabrales']),

  // ── VERDURAS Y FRUTAS LATINAS ──
  f('chayote', 'Chayote', 'Chayote squash', 150, 'g', 19, 0.8, 4.5, 0.1, 1.7, 'verduras', ['chayota', 'güisquil', 'tayota']),
  f('nopal', 'Nopal', 'Cactus nopales', 100, 'g', 16, 1.3, 3.5, 0.1, 2, 'verduras', ['nopales', 'cactus']),
  f('platano_verde', 'Plátano verde', 'Unripe green plantain', 100, 'g', 122, 1.3, 32, 0.4, 2.3, 'frutas', ['plátano macho', 'banano verde', 'banana verde']),
  f('yuca', 'Yuca / Mandioca cocida', 'Cooked cassava yuca', 150, 'g', 160, 1.4, 38, 0.3, 1.8, 'verduras', ['cassava', 'mandioca', 'yuca cocida']),
  f('calabaza', 'Calabaza', 'Pumpkin', 100, 'g', 26, 1, 6.5, 0.1, 0.5, 'verduras', ['zapallo', 'auyama', 'calabaza naranja']),
  f('yuca_frita', 'Yuca frita', 'Fried yuca sticks', 150, 'g', 210, 1.5, 40, 6, 2, 'verduras', ['mandioca frita', 'yuca chips']),
  f('chile_poblano', 'Chile poblano', 'Poblano pepper', 100, 'g', 20, 1, 4, 0.3, 1.5, 'verduras', ['poblano', 'chile ancho']),
  f('tomatillo', 'Tomatillo', 'Green Mexican tomatillo', 100, 'g', 32, 1, 6, 1, 1.9, 'verduras', ['tomate verde', 'tomate de fresadilla']),
  f('puerro', 'Puerro', 'Leek', 100, 'g', 61, 1.5, 14, 0.3, 1.8, 'verduras', ['puerros', 'ajo porro']),
  f('rucola', 'Rúcula', 'Rocket / Arugula', 50, 'g', 25, 2.6, 3.7, 0.7, 1.6, 'verduras', ['arugula', 'ruqueta']),
  f('endivia', 'Endivia', 'Belgian endive', 80, 'g', 17, 1.3, 3.1, 0.1, 3.1, 'verduras', ['endivias', 'endibia']),
  f('nabo', 'Nabo', 'Turnip', 100, 'g', 28, 0.9, 6, 0.1, 1.8, 'verduras', []),
  f('papaya', 'Papaya', 'Papaya', 150, 'g', 43, 0.5, 11, 0.3, 1.7, 'frutas', ['lechosa', 'mamón']),
  f('guayaba', 'Guayaba', 'Guava', 100, 'g', 68, 2.6, 14, 1, 5.4, 'frutas', ['guava', 'goiaba']),
  f('maracuya', 'Maracuyá', 'Passion fruit', 50, 'g', 97, 2.2, 23, 0.7, 10.4, 'frutas', ['fruta de la pasión', 'parchita', 'granadilla']),
  f('ciruela', 'Ciruela', 'Plum', 80, 'g', 46, 0.7, 11, 0.3, 1.4, 'frutas', ['ciruelas', 'prunas']),
  f('albaricoque', 'Albaricoque', 'Apricot', 60, 'g', 48, 1.4, 11, 0.4, 2, 'frutas', ['damasco', 'chabacano']),
  f('chirimoya', 'Chirimoya', 'Cherimoya', 150, 'g', 75, 1.6, 18, 0.7, 3, 'frutas', ['anon', 'annona']),
  f('nispero', 'Níspero', 'Loquat', 100, 'g', 47, 0.4, 12, 0.2, 1.7, 'frutas', ['nispero japonés']),
  f('pitahaya', 'Pitahaya', 'Dragon fruit', 100, 'g', 60, 1.2, 13, 0.4, 3, 'frutas', ['dragon fruit', 'pitaya']),

  // ── CEREALES Y GRANOS AMPLIADOS ──
  f('tortilla_trigo', 'Tortilla de trigo', 'Wheat flour tortilla', 40, 'g', 304, 8, 52, 7, 3, 'cereales', ['wrap', 'tortilla de harina', 'burrito wrap']),
  f('yuca_harina', 'Harina de yuca', 'Cassava flour', 30, 'g', 338, 0.3, 83, 0.3, 1.8, 'cereales', ['almidón de yuca', 'tapioca starch']),
  f('harina_maiz', 'Harina de maíz precocida', 'Pre-cooked corn flour', 30, 'g', 352, 8, 76, 1.5, 2, 'cereales', ['masarepa', 'harina pan', 'PAN flour']),
  f('arroz_basmati', 'Arroz basmati cocido', 'Cooked basmati rice', 200, 'g', 121, 3.5, 25, 0.4, 0.6, 'cereales', ['basmati']),
  f('bulgur', 'Bulgur cocido', 'Cooked bulgur wheat', 150, 'g', 83, 3, 19, 0.2, 4.5, 'cereales', ['trigo bulgur']),
  f('polenta', 'Polenta cocida', 'Cooked polenta', 200, 'g', 70, 2, 15, 0.7, 1, 'cereales', ['polenta italiana']),
  f('pan_pita', 'Pan pita', 'Pita bread', 60, 'g', 275, 9, 55, 1.5, 2, 'cereales', ['pita', 'pan árabe']),
  f('pan_naan', 'Pan naan', 'Indian naan bread', 80, 'g', 290, 9, 50, 6, 2, 'cereales', ['naan']),
  f('granola', 'Granola', 'Granola oat mix', 50, 'g', 450, 10, 65, 16, 5, 'cereales', ['granola casera']),
  f('muesli', 'Muesli', 'Swiss muesli', 50, 'g', 368, 11, 62, 7, 7, 'cereales', []),
  f('crackers', 'Crackers integrales', 'Whole grain crackers', 20, 'g', 400, 11, 65, 8, 7, 'cereales', ['galletas saladas', 'crakers']),
  f('focaccia', 'Focaccia', 'Italian focaccia bread', 80, 'g', 265, 7, 38, 10, 2, 'cereales', ['focacia']),
  f('farro_cocido', 'Farro cocido', 'Cooked farro/spelt', 150, 'g', 131, 6, 27, 0.7, 5, 'cereales', ['espelta cocida', 'farro']),

  // ── LEGUMBRES AMPLIADAS ──
  f('alubias_negras', 'Alubias negras cocidas', 'Cooked black beans', 200, 'g', 132, 9, 24, 0.5, 7.5, 'legumbres', ['frijoles negros', 'caraotas', 'habichuelas negras']),
  f('habas_tiernas', 'Habas tiernas', 'Fresh broad beans', 100, 'g', 88, 8, 12, 0.7, 5, 'legumbres', ['habas', 'faves', 'judías habas']),
  f('soja_texturizada', 'Soja texturizada', 'Textured soy protein TSP', 30, 'g', 348, 51, 30, 1.5, 13, 'legumbres', ['carne de soja', 'proteína soja', 'TSP']),
  f('tempeh', 'Tempeh', 'Fermented soy tempeh', 100, 'g', 193, 19, 9, 11, 9, 'legumbres', []),
  f('lupini', 'Altramuces / Chochos', 'Lupin beans', 50, 'g', 119, 15, 7, 3, 5, 'legumbres', ['altramuces', 'chochos', 'lupins']),
  f('seitan', 'Seitán', 'Seitan wheat gluten', 100, 'g', 120, 25, 4, 2, 0.5, 'legumbres', ['setan', 'proteína de trigo']),

  // ── SALSAS AMPLIADAS ──
  f('pesto', 'Pesto genovés', 'Basil pesto sauce', 20, 'g', 540, 5, 5, 55, 2, 'salsas', ['pesto']),
  f('tahini', 'Tahini', 'Sesame seed paste', 15, 'g', 595, 17, 21, 54, 9, 'salsas', ['pasta de sésamo', 'tahina']),
  f('hummus', 'Hummus', 'Hummus de garbanzos', 50, 'g', 177, 5, 14, 11, 4, 'salsas', ['humus']),
  f('tzatziki', 'Tzatziki', 'Greek yogurt cucumber dip', 50, 'g', 67, 3.5, 5, 4, 0.5, 'salsas', []),
  f('chimichurri', 'Chimichurri', 'Argentine herb sauce', 15, 'ml', 150, 0.5, 1.5, 16, 0.5, 'salsas', []),
  f('pico_gallo', 'Pico de gallo', 'Fresh Mexican salsa', 50, 'g', 20, 0.8, 4, 0.3, 1, 'salsas', ['salsa fresca', 'salsa mexicana']),
  f('salsa_verde_mex', 'Salsa verde (mexicana)', 'Mexican tomatillo sauce', 30, 'g', 35, 0.7, 5, 1.5, 1, 'salsas', ['salsa tomatillo', 'green salsa']),
  f('romesco', 'Salsa romesco', 'Catalan nut and pepper sauce', 30, 'g', 215, 5, 8, 19, 2, 'salsas', []),
  f('alioli', 'Allioli', 'Catalan garlic aioli', 15, 'g', 460, 1, 2, 50, 0, 'salsas', ['alioli', 'ajoaceite', 'aioli']),
  f('worcestershire', 'Salsa Worcestershire', 'Worcestershire sauce', 10, 'ml', 78, 1, 19, 0.1, 0, 'salsas', ['perrins', 'perrin']),

  // ── COMIDA ITALIANA (POPULAR EN ESPAÑA) ──
  f('pizza_4quesos', 'Pizza 4 quesos', 'Four cheese pizza', 100, 'g', 280, 13, 32, 11, 2, 'platos', ['cuatro quesos']),
  f('lasana', 'Lasaña bolonesa', 'Bolognese lasagne', 200, 'g', 180, 10, 18, 8, 2, 'platos', ['lasagna', 'lasaña']),
  f('canelones', 'Canelones', 'Stuffed cannelloni baked', 200, 'g', 155, 10, 15, 7, 1, 'platos', ['cannelloni']),
  f('risotto', 'Risotto de setas', 'Mushroom risotto', 250, 'g', 160, 4, 28, 5, 0.5, 'platos', ['risotto']),
  f('bruschetta', 'Bruschetta', 'Italian toasted bread with tomato', 60, 'g', 175, 4, 24, 7, 2, 'tapas', ['brusceta']),
  f('panna_cotta', 'Panna cotta', 'Italian cream dessert', 100, 'g', 185, 3, 19, 11, 0, 'postres', ['pannacotta']),

  // ── COMIDA ASIÁTICA (POPULAR EN ESPAÑA) ──
  f('pad_thai', 'Pad Thai', 'Thai stir-fried rice noodles', 300, 'g', 175, 8, 27, 5, 1.5, 'platos', ['pad thai']),
  f('gyozas', 'Gyozas', 'Pan-fried Japanese dumplings', 100, 'g', 200, 8, 24, 8, 1, 'platos', ['dumplings', 'potstickers', 'jiaozi']),
  f('ramen', 'Ramen', 'Japanese ramen noodle soup', 400, 'g', 95, 7, 13, 3, 1, 'platos', []),
  f('pollo_teriyaki', 'Pollo teriyaki', 'Chicken teriyaki', 200, 'g', 165, 18, 10, 7, 0.5, 'platos', ['teriyaki']),
  f('spring_rolls', 'Rollitos de primavera', 'Fried spring rolls', 80, 'g', 210, 5, 22, 12, 2, 'platos', ['rollitos primavera']),
  f('arroz_tres_delicias', 'Arroz tres delicias', 'Chinese fried rice', 250, 'g', 155, 6, 26, 4, 1, 'platos', ['arroz frito chino', 'fried rice']),
  f('wonton_sopa', 'Sopa wonton', 'Wonton soup', 300, 'g', 75, 5, 8, 3, 0.5, 'platos', ['wontons']),
  f('curry_pollo', 'Curry de pollo', 'Chicken curry', 300, 'g', 155, 14, 9, 7, 2, 'platos', ['pollo al curry', 'chicken curry']),

  // ── COMIDA INTERNACIONAL POPULAR ──
  f('shawarma', 'Shawarma', 'Middle Eastern shawarma wrap', 200, 'g', 245, 16, 22, 10, 2, 'platos', []),
  f('kebab_doner', 'Döner kebab', 'Turkish doner kebab', 200, 'g', 250, 17, 21, 11, 2, 'platos', ['kebab', 'doner']),
  f('falafel', 'Falafel', 'Middle Eastern chickpea balls', 100, 'g', 333, 13, 31, 17, 8, 'platos', []),
  f('nuggets_pollo', 'Nuggets de pollo', 'Chicken nuggets', 100, 'g', 296, 15, 18, 18, 1, 'platos', ['nuggets']),
  f('nachos', 'Nachos con queso', 'Corn tortilla chips with cheese', 100, 'g', 465, 10, 56, 22, 4, 'dulces', ['nacho', 'nachos']),
  f('tortitas', 'Tortitas (pancakes)', 'American pancakes', 100, 'g', 225, 6, 35, 7, 1, 'dulces', ['pancakes', 'hotcakes']),
  f('brownie', 'Brownie de chocolate', 'Chocolate brownie', 50, 'g', 400, 5, 50, 22, 2, 'dulces', ['brownie']),
  f('cheesecake', 'Tarta de queso', 'New York cheesecake', 100, 'g', 321, 5.5, 25, 22, 0.3, 'dulces', ['cheesecake']),

  // ── SNACKS Y DULCES EXTRA ──
  f('patatas_chips', 'Patatas chips', 'Potato crisps', 30, 'g', 536, 7, 53, 35, 5, 'dulces', ['chips', 'papas chips', 'crisps']),
  f('palomitas', 'Palomitas de maíz', 'Popcorn', 30, 'g', 375, 11, 74, 4, 14, 'dulces', ['palomitas', 'popcorn', 'pochoclos']),
  f('mantecado', 'Mantecado', 'Spanish lard shortbread', 25, 'g', 490, 7, 53, 28, 2, 'dulces', ['mantecados']),
  f('gofres', 'Gofres', 'Waffles', 100, 'g', 290, 8, 42, 10, 1, 'dulces', ['waffles', 'gaufres']),

  // ── PLATOS DE SOPA / CALDOS ──
  f('caldo_pollo', 'Caldo de pollo casero', 'Homemade chicken broth', 250, 'ml', 15, 1.5, 0.5, 0.5, 0, 'platos', ['caldo pollo', 'consomé']),
  f('caldo_vegetal', 'Caldo vegetal', 'Vegetable broth', 250, 'ml', 10, 0.5, 2, 0, 0, 'platos', ['caldo verduras', 'caldo de verdura']),
  f('crema_verduras', 'Crema de verduras', 'Cream of vegetable soup', 300, 'ml', 65, 2, 8, 3, 2, 'platos', ['crema de verdura', 'velouté']),
  f('minestrone', 'Sopa minestrone', 'Italian minestrone soup', 350, 'ml', 55, 2.5, 9, 1, 2.5, 'platos', ['minestrone']),
  f('potaje', 'Potaje de verduras', 'Spanish thick vegetable potage', 300, 'g', 80, 4, 12, 2, 4, 'platos', ['potaje', 'potaje de lentejas']),
  f('sopa_fideos', 'Sopa de fideos', 'Spanish noodle soup', 300, 'ml', 65, 3, 12, 1, 0.5, 'platos', ['sopa fideos', 'sopa de letras']),
  f('revuelto_champis', 'Revuelto de champiñones', 'Mushroom and egg scramble', 150, 'g', 160, 9, 3, 13, 1, 'platos', ['revuelto setas', 'revuelto hongos']),
  f('judias_guisadas', 'Judías guisadas', 'Spanish bean stew', 300, 'g', 125, 7, 20, 3, 6, 'platos', ['habichuelas guisadas', 'alubias guisadas', 'frijoles guisados']),
  f('paella_mixta', 'Paella mixta', 'Mixed meat and seafood paella', 350, 'g', 145, 9, 18, 5, 1, 'platos', ['paella mixta', 'paella especial']),
  f('paella_marinera', 'Paella marinera', 'Seafood paella', 350, 'g', 140, 10, 18, 4, 1, 'platos', ['paella de marisco', 'paella pescado']),

  // ── MÁS CARNES Y PREPARACIONES ──
  f('pollo_tikka', 'Pollo tikka masala', 'Chicken tikka masala', 300, 'g', 160, 14, 9, 7, 2, 'carnes', ['tikka masala', 'pollo tikka']),
  f('pechuga_rellena', 'Pechuga de pollo rellena', 'Stuffed chicken breast', 180, 'g', 175, 22, 3, 8, 0.5, 'carnes', ['pollo relleno']),
  f('ternera_guisada', 'Ternera guisada', 'Spanish beef stew', 200, 'g', 175, 18, 5, 9, 1, 'carnes', ['carne guisada', 'estofado de ternera']),
  f('hamburguesa_gourmet', 'Hamburguesa gourmet', 'Gourmet beef burger', 180, 'g', 385, 22, 30, 19, 2, 'platos', ['burger gourmet', 'hamburguesa artesana']),
  f('bocata_jamon', 'Bocadillo de jamón', 'Ham bocadillo sandwich', 160, 'g', 275, 17, 28, 10, 1.5, 'platos', ['bocadillo jamón', 'bocata jamon']),
  f('montado_lomo', 'Montado de lomo', 'Pork loin montado tapa', 50, 'g', 195, 12, 15, 9, 1, 'tapas', ['montadito lomo']),

  // ── MÁS FRUTAS Y VEGETALES ──
  f('lichi', 'Lichi', 'Lychee', 80, 'g', 66, 0.8, 17, 0.4, 1.3, 'frutas', ['litchi', 'lychee']),
  f('lucuma', 'Lúcuma', 'Lucuma fruit', 100, 'g', 99, 1.5, 24, 0.5, 1.5, 'frutas', ['lucuma peruana']),
  f('tamarindo_fruta', 'Tamarindo (fruta)', 'Tamarind fruit', 30, 'g', 239, 2.8, 63, 0.6, 5.1, 'frutas', ['tamarindo fruto']),
  f('escarola', 'Escarola', 'Frisée lettuce', 80, 'g', 17, 1.3, 3.1, 0.2, 3.1, 'verduras', ['frisée', 'escarola rizada']),
  f('berro', 'Berros', 'Watercress', 50, 'g', 11, 2.3, 1.3, 0.1, 0.5, 'verduras', ['berro', 'mastuerzo acuático']),
  f('ñame', 'Ñame cocido', 'Cooked yam', 150, 'g', 118, 1.5, 28, 0.1, 4, 'verduras', ['name', 'yame', 'inhame']),

  // ── MÁS CEREALES ──
  f('mijo', 'Mijo cocido', 'Cooked millet', 150, 'g', 119, 3.5, 23, 1, 1.3, 'cereales', ['millet']),
  f('amaranto', 'Amaranto cocido', 'Cooked amaranth', 150, 'g', 102, 4, 19, 1.5, 2, 'cereales', ['amaranth']),
  f('pan_pita_integral', 'Pan pita integral', 'Whole grain pita bread', 60, 'g', 254, 11, 50, 2, 5, 'cereales', ['pita integral']),
  f('copos_maiz', 'Copos de maíz tostados', 'Toasted corn flakes', 30, 'g', 378, 7, 84, 0.9, 3, 'cereales', ['cornflakes', 'cereales maíz']),
  f('semola', 'Sémola de trigo cocida', 'Cooked wheat semolina', 150, 'g', 150, 5, 30, 0.5, 1.5, 'cereales', ['semolina', 'semola']),

  // ── MÁS POSTRES ──
  f('baba_au_rhum', 'Bizcocho borracho', 'Rum-soaked sponge cake', 80, 'g', 245, 4, 35, 9, 0.3, 'postres', ['borracho', 'biscocho al ron']),
  f('yemas_sta_teresa', 'Yemas de Santa Teresa', 'Ávila egg yolk sweets', 15, 'g', 380, 6, 55, 15, 0, 'postres', ['yemas', 'yemas de yema']),
  f('pan_de_cadiz', 'Mazapán de Cádiz', 'Cádiz almond marzipan', 50, 'g', 430, 7, 62, 18, 3, 'postres', ['pan de Cádiz']),

  // ── MÁS BEBIDAS ──
  f('zumo_tomate', 'Zumo de tomate', 'Tomato juice', 250, 'ml', 17, 0.9, 3.5, 0.2, 0.5, 'bebidas', ['jugo de tomate', 'V8']),
  f('agua_limon', 'Agua con limón', 'Lemon water', 250, 'ml', 10, 0.1, 2.5, 0, 0, 'bebidas', ['limonada natural', 'agua limon']),
  f('batido_fresa', 'Batido de fresa', 'Strawberry milkshake', 300, 'ml', 85, 3, 14, 2.5, 0.3, 'bebidas', ['batido fresa', 'smoothie fresa']),
  f('kombucha', 'Kombucha', 'Fermented tea kombucha', 250, 'ml', 15, 0, 3, 0, 0, 'bebidas', []),
  f('zumo_granada', 'Zumo de granada', 'Pomegranate juice', 250, 'ml', 54, 0.2, 13, 0.3, 0.1, 'bebidas', ['jugo de granada']),
  f('cafe_americano', 'Café americano', 'Americano coffee', 300, 'ml', 5, 0.3, 0.8, 0, 0, 'bebidas', ['americano', 'café largo']),
  f('capuccino', 'Capuchino', 'Cappuccino', 200, 'ml', 55, 3.5, 5, 2.5, 0, 'bebidas', ['cappuccino', 'capuchino']),
  f('latte_cafe', 'Café latte', 'Café latte', 300, 'ml', 65, 4, 7, 2.5, 0, 'bebidas', ['latte', 'café con leche grande']),

  // ── PRODUCTOS LÁCTEOS Y SUSTITUTOS ──
  f('queso_lonchas', 'Queso en lonchas', 'Sliced processed cheese', 20, 'g', 330, 23, 2, 25, 0, 'lacteos', ['queso americano', 'queso loncha']),
  f('tofu_ahumado', 'Tofu ahumado', 'Smoked tofu', 100, 'g', 130, 13, 2, 8, 0.5, 'lacteos', ['smoked tofu']),
  f('leche_soja', 'Leche de soja', 'Soy milk', 250, 'ml', 33, 3.3, 2.4, 1.8, 0.4, 'lacteos', ['bebida de soja', 'soy milk']),
  f('nata_acida', 'Nata ácida / Crème fraîche', 'Sour cream', 30, 'g', 193, 0.7, 2.7, 20, 0, 'lacteos', ['sour cream', 'crema agria']),
  f('yogur_proteico', 'Yogur proteico', 'High-protein yogurt', 150, 'g', 80, 15, 6, 0.5, 0, 'lacteos', ['skyr', 'fromage blanc', 'yogur alto en proteínas']),

  // ── SALSAS Y ADEREZOS EXTRA ──
  f('vinagreta', 'Vinagreta clásica', 'Classic French vinaigrette', 15, 'ml', 130, 0.1, 0.5, 14, 0, 'salsas', ['aderezo', 'vinagreta francesa']),
  f('aderezo_cesar', 'Aderezo César', 'Caesar dressing', 15, 'g', 175, 1.5, 2, 18, 0, 'salsas', ['Caesar dressing', 'salsa cesar']),
  f('salsa_barbacoa', 'Salsa barbacoa', 'BBQ sauce', 15, 'g', 95, 0.5, 22, 0.3, 0.3, 'salsas', ['bbq sauce', 'barbecue sauce']),
  f('salsa_picante', 'Salsa picante', 'Hot sauce', 5, 'ml', 50, 1, 9, 0.5, 1, 'salsas', ['hot sauce', 'tabasco', 'sriracha']),
  f('salsa_teriyaki', 'Salsa teriyaki', 'Teriyaki sauce', 15, 'ml', 95, 2, 20, 0.5, 0, 'salsas', ['teriyaki sauce']),

  // ── PLATOS COMPLETADORES ──
  f('bocata_lomo', 'Bocadillo de lomo', 'Pork loin bocadillo', 160, 'g', 290, 18, 29, 11, 1.5, 'platos', ['bocadillo lomo', 'bocata de lomo']),
  f('patatas_pobres', 'Patatas a lo pobre', 'Poor man\'s potatoes with pepper', 200, 'g', 120, 2, 20, 4, 2, 'platos', ['patatas pobres', 'papas a lo pobre']),
  f('ensalada_cesar', 'Ensalada César', 'Classic Caesar salad', 200, 'g', 135, 7, 8, 9, 2, 'platos', ['cesar', 'ensalada césár']),
  f('caldo_gallego', 'Caldo gallego', 'Galician broth with greens and pork', 350, 'ml', 65, 4, 7, 2, 2, 'platos', ['caldo gallego']),
  f('espinacas_garbanzos', 'Espinacas con garbanzos', 'Spinach with chickpeas Seville style', 300, 'g', 115, 6, 14, 4, 5, 'platos', ['espinacas garbanzos', 'potaje espinacas']),

  // ── CARNES COMPLETADORES ──
  f('pollo_asado_entero', 'Pollo asado entero', 'Whole roast chicken', 200, 'g', 190, 27, 0, 9, 0, 'carnes', ['pollo asado entero', 'pollo de asar']),
  f('fiambre_pollo', 'Fiambre de pollo', 'Sliced cooked chicken', 30, 'g', 95, 19, 0.5, 1.8, 0, 'carnes', ['pechuga de pollo fiambre']),
  f('salchicha_frankfurt', 'Salchicha frankfurt', 'Frankfurt sausage hot dog', 50, 'g', 290, 10, 2, 26, 0, 'carnes', ['frankfurt', 'salchicha cocida']),
  f('pepperoni', 'Pepperoni', 'Pepperoni pizza topping', 20, 'g', 490, 20, 2, 45, 0, 'carnes', ['peperoni']),

  // ── PESCADOS COMPLETADORES ──
  f('boquerones_fritura', 'Boquerones en fritura', 'Fried fresh anchovies', 100, 'g', 215, 17, 10, 12, 0, 'pescados', ['boquerones fritos', 'pescaito frito']),
  f('pez_limon', 'Pez limón', 'Amberjack / Greater amberjack', 150, 'g', 106, 21, 0, 2.5, 0, 'pescados', ['serviola', 'medregal']),
  f('navajas', 'Navajas a la plancha', 'Grilled razor clams', 80, 'g', 72, 13, 2, 1, 0, 'pescados', ['navaja', 'navajuela']),

  // ── FRUTAS COMPLETADORAS ──
  f('grosella', 'Grosellas rojas', 'Red currants', 80, 'g', 56, 1.4, 14, 0.2, 4.3, 'frutas', ['grosellas', 'groseilles']),
  f('mora', 'Moras', 'Blackberries', 80, 'g', 43, 1.4, 10, 0.5, 5.3, 'frutas', ['zarzamoras', 'blackberries']),
  f('melocoton_en_almibar', 'Melocotón en almíbar', 'Canned peaches in syrup', 100, 'g', 75, 0.5, 19, 0.1, 0.8, 'frutas', ['durazno en almíbar', 'piña en lata']),

  // ── MISCELÁNEA ──
  f('proteina_vegana', 'Proteína vegana en polvo', 'Vegan protein powder', 30, 'g', 360, 70, 10, 5, 5, 'bebidas', ['vegan protein', 'proteína de guisante', 'pea protein']),
  f('barrita_proteina', 'Barrita de proteína', 'Protein bar', 60, 'g', 365, 20, 40, 12, 4, 'dulces', ['protein bar', 'barrita energética']),
  f('tortita_avena', 'Tortita de avena', 'Oat pancake protein', 80, 'g', 215, 10, 28, 7, 4, 'dulces', ['tortita proteica', 'oat pancake']),
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
