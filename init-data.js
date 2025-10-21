const { db, createCategory, createProduct } = require('./database');

console.log('Инициализация базы данных с начальными данными...\n');

try {
  // Проверяем, есть ли уже данные
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();

  if (existingCategories.count > 0 || existingProducts.count > 0) {
    console.log('❌ База данных уже содержит данные.');
    console.log(`   Категорий: ${existingCategories.count}`);
    console.log(`   Товаров: ${existingProducts.count}`);
    console.log('\nЕсли вы хотите перезаписать данные, сначала удалите файл orders.db\n');
    process.exit(0);
  }

  // Создаем категории
  console.log('Создание категорий...');
  const cat1 = createCategory('Автоцветы', '🌱');
  const cat2 = createCategory('Фотопериоды', '🌿');
  console.log(`✓ Создано категорий: 2\n`);

  // Создаем товары
  console.log('Создание товаров...');

  // Автоцветы
  const autoflowers = [
    {
      name: 'Northern Lights Auto',
      price: 450,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?w=400&h=400&fit=crop',
      description: 'Классический автоцвет с высокой урожайностью. Период цветения 8-9 недель. THC до 18%. Отлично подходит для начинающих.'
    },
    {
      name: 'Amnesia Haze Auto',
      price: 520,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1536964549089-8b7a39471e35?w=400&h=400&fit=crop',
      description: 'Сативная автоцветущая версия легендарного сорта. Цветение 10-11 недель. THC до 20%. Бодрящий эффект.'
    },
    {
      name: 'White Widow Auto',
      price: 480,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400&h=400&fit=crop',
      description: 'Сбалансированный гибрид с обильной смолой. Цветение 8-9 недель. THC до 19%. Классический вкус и аромат.'
    },
    {
      name: 'Gorilla Glue Auto',
      price: 550,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=400&h=400&fit=crop',
      description: 'Мощный автоцвет с высоким содержанием ТГК. Цветение 8-9 недель. THC до 24%. Липкие смолистые шишки.'
    },
    {
      name: 'Blue Dream Auto',
      price: 490,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1530028828-25e8270e8299?w=400&h=400&fit=crop',
      description: 'Популярный сорт с ягодным ароматом. Цветение 9-10 недель. THC до 21%. Расслабляющий эффект.'
    },
    {
      name: 'Zkittlez Auto',
      price: 530,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1534194973429-1ca2e0e6d6a1?w=400&h=400&fit=crop',
      description: 'Фруктовый автоцвет с яркими красками. Цветение 8-9 недель. THC до 20%. Сладкий тропический вкус.'
    },
    {
      name: 'AK-47 Auto',
      price: 470,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=400&fit=crop',
      description: 'Быстрый и надежный автоцвет. Цветение 7-8 недель. THC до 17%. Сбалансированный гибрид.'
    },
    {
      name: 'Girl Scout Cookies Auto',
      price: 560,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400&h=400&fit=crop',
      description: 'Премиальный автоцвет с десертным ароматом. Цветение 9-10 недель. THC до 22%. Мощный расслабляющий эффект.'
    },
    {
      name: 'Cheese Auto',
      price: 440,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1502943693086-33b5b1cfdf2f?w=400&h=400&fit=crop',
      description: 'Легендарный сорт с уникальным ароматом. Цветение 8-9 недель. THC до 16%. Проверенная генетика.'
    },
    {
      name: 'Gelato Auto',
      price: 580,
      category_id: cat1.id,
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop',
      description: 'Элитный автоцвет с кремовым вкусом. Цветение 8-9 недель. THC до 23%. Премиальное качество.'
    }
  ];

  // Фотопериоды
  const photoperiods = [
    {
      name: 'OG Kush',
      price: 650,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&h=400&fit=crop',
      description: 'Легендарный калифорнийский сорт. Цветение 8-9 недель. THC до 24%. Мощный расслабляющий эффект с цитрусовым ароматом.'
    },
    {
      name: 'Sour Diesel',
      price: 620,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
      description: 'Классическая сатива с дизельным ароматом. Цветение 10-11 недель. THC до 22%. Энергичный и творческий эффект.'
    },
    {
      name: 'Purple Haze',
      price: 680,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop',
      description: 'Фиолетовая красавица с ягодным вкусом. Цветение 9-10 недель. THC до 20%. Психоделический сативный эффект.'
    },
    {
      name: 'Critical Kush',
      price: 590,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop',
      description: 'Высокоурожайная индика. Цветение 7-8 недель. THC до 25%. Сильный седативный эффект.'
    },
    {
      name: 'Jack Herer',
      price: 640,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400&h=400&fit=crop',
      description: 'Медицинский сорт с четким эффектом. Цветение 8-10 недель. THC до 23%. Баланс расслабления и бодрости.'
    },
    {
      name: 'Strawberry Cough',
      price: 610,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=400&fit=crop',
      description: 'Сатива с клубничным ароматом. Цветение 9-10 недель. THC до 21%. Бодрящий и приятный эффект.'
    },
    {
      name: 'Sunset Sherbet',
      price: 720,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&h=400&fit=crop',
      description: 'Премиальный гибрид Cookie Family. Цветение 8-9 недель. THC до 24%. Сладкий десертный вкус.'
    },
    {
      name: 'Super Lemon Haze',
      price: 660,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=400&fit=crop',
      description: 'Цитрусовая сатива-чемпион. Цветение 9-10 недель. THC до 22%. Яркий лимонный аромат и энергичный эффект.'
    },
    {
      name: 'Granddaddy Purple',
      price: 670,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=400&h=400&fit=crop',
      description: 'Фиолетовая индика с виноградным вкусом. Цветение 8-9 недель. THC до 23%. Глубокое расслабление.'
    },
    {
      name: 'Wedding Cake',
      price: 750,
      category_id: cat2.id,
      image: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400&h=400&fit=crop',
      description: 'Топовый десертный сорт. Цветение 7-9 недель. THC до 25%. Ванильно-сладкий аромат, мощный эффект.'
    }
  ];

  let createdCount = 0;
  for (const product of [...autoflowers, ...photoperiods]) {
    createProduct(product);
    createdCount++;
  }

  console.log(`✓ Создано товаров: ${createdCount}\n`);

  console.log('🎉 База данных успешно инициализирована!');
  console.log('\nТеперь вы можете:');
  console.log('1. Запустить сервер: npm start');
  console.log('2. Управлять товарами через админ-панель: https://seed.xrednode.com/products.html\n');

} catch (error) {
  console.error('❌ Ошибка при инициализации базы данных:', error);
  process.exit(1);
}
