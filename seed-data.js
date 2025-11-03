const { createCategory, createProduct } = require('./database');

console.log('Starting database seeding...');

try {
  // Создаем категории
  console.log('Creating categories...');
  const indica = createCategory('Индика', '🌿');
  const sativa = createCategory('Сатива', '🌱');
  const hybrid = createCategory('Гибрид', '🌾');
  const cbd = createCategory('CBD', '🍃');

  console.log(`✓ Created ${indica.name} (ID: ${indica.id})`);
  console.log(`✓ Created ${sativa.name} (ID: ${sativa.id})`);
  console.log(`✓ Created ${hybrid.name} (ID: ${hybrid.id})`);
  console.log(`✓ Created ${cbd.name} (ID: ${cbd.id})`);

  // Создаем товары
  console.log('\nCreating products...');

  const products = [
    {
      name: 'Northern Lights',
      price: 3500,
      category_id: indica.id,
      image: 'https://images.unsplash.com/photo-1536964310528-e47dd655ecf3?w=800',
      description:
        'Классический сорт индики с расслабляющим эффектом. Идеален для вечернего использования. ТГК: 18-22%',
    },
    {
      name: 'Blue Dream',
      price: 3800,
      category_id: hybrid.id,
      image: 'https://images.unsplash.com/photo-1550082673-3a2c5db9e45e?w=800',
      description:
        'Популярный гибрид с балансом эффектов. Легкая эйфория и расслабление. ТГК: 17-24%',
    },
    {
      name: 'Sour Diesel',
      price: 4000,
      category_id: sativa.id,
      image: 'https://images.unsplash.com/photo-1566278012055-a1f0e87d3b42?w=800',
      description:
        'Энергичная сатива с цитрусовым ароматом. Отлично подходит для дневного использования. ТГК: 20-25%',
    },
    {
      name: 'OG Kush',
      price: 4200,
      category_id: hybrid.id,
      image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800',
      description: 'Легендарный гибрид из Калифорнии. Мощный эффект и земляной аромат. ТГК: 19-26%',
    },
    {
      name: 'Gorilla Glue',
      price: 4500,
      category_id: hybrid.id,
      image: 'https://images.unsplash.com/photo-1560854808-61c8b8cb0b91?w=800',
      description: 'Очень липкие шишки с мощным эффектом. Победитель Cannabis Cup. ТГК: 25-30%',
    },
    {
      name: 'White Widow',
      price: 3600,
      category_id: hybrid.id,
      image: 'https://images.unsplash.com/photo-1603909976745-c2d2e79d7bcc?w=800',
      description:
        'Классический голландский гибрид с белым налетом. Сбалансированный эффект. ТГК: 18-25%',
    },
    {
      name: 'Girl Scout Cookies',
      price: 4300,
      category_id: hybrid.id,
      image: 'https://images.unsplash.com/photo-1622457551994-84f6e6a6baa6?w=800',
      description: 'Сладкий аромат с мощным расслабляющим эффектом. ТГК: 25-28%',
    },
    {
      name: 'Grandaddy Purple',
      price: 3700,
      category_id: indica.id,
      image: 'https://images.unsplash.com/photo-1558293842-c0fd3db86157?w=800',
      description: 'Индика с фиолетовыми оттенками. Сильное расслабление и сонливость. ТГК: 17-23%',
    },
    {
      name: "Charlotte's Web",
      price: 2800,
      category_id: cbd.id,
      image: 'https://images.unsplash.com/photo-1583912267550-41c31c1f3d56?w=800',
      description:
        'Высокое содержание CBD, минимум ТГК. Лечебные свойства без психоактивного эффекта. CBD: 15-20%, ТГК: <1%',
    },
    {
      name: 'Harlequin',
      price: 3200,
      category_id: cbd.id,
      image: 'https://images.unsplash.com/photo-1512699355324-f07e3106dae5?w=800',
      description:
        'Сбалансированное соотношение CBD/THC. Легкий эффект с лечебными свойствами. CBD: 8-16%, ТГК: 4-10%',
    },
    {
      name: 'Green Crack',
      price: 3900,
      category_id: sativa.id,
      image: 'https://images.unsplash.com/photo-1624626965173-e91e846f456d?w=800',
      description:
        'Энергичная сатива для активного дня. Фруктовый вкус с нотками манго. ТГК: 15-25%',
    },
    {
      name: 'AK-47',
      price: 3800,
      category_id: hybrid.id,
      image: 'https://images.unsplash.com/photo-1609682799162-bfbf03af6f2c?w=800',
      description: 'Культовый гибрид с креативным эффектом. Сладкий цветочный аромат. ТГК: 13-20%',
    },
  ];

  products.forEach(product => {
    const created = createProduct(product);
    console.log(`✓ Created ${product.name} (ID: ${created.id})`);
  });

  console.log('\n✅ Database seeding completed successfully!');
  console.log(`\nCreated:`);
  console.log(`- 4 categories`);
  console.log(`- ${products.length} products`);
} catch (error) {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
}
