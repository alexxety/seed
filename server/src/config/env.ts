import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET должен быть минимум 32 символа'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

export function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('✅ ENV валидация прошла успешно');
    return parsed;
  } catch (error) {
    console.error('❌ Ошибка валидации ENV:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err: z.ZodIssue) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\n🛑 Сервер не может запуститься без корректных ENV переменных');
    process.exit(1);
  }
}
