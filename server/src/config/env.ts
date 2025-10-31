const { z } = require('zod');

// ENV валидация через Zod
const envSchema = z.object({
  // CORE
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен'),

  // SECURITY
  JWT_SECRET: z.string().min(32, 'JWT_SECRET должен быть минимум 32 символа'),

  // TELEGRAM (опциональные для новой архитектуры)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // CLOUDFLARE
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
});

function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('✅ ENV валидация прошла успешно');
    return parsed;
  } catch (error) {
    console.error('❌ Ошибка валидации ENV:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\n🛑 Сервер не может запуститься без корректных ENV переменных');
    process.exit(1);
  }
}

module.exports = { validateEnv };
