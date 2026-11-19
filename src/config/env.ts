import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16).default('dev-fallback-secret-change-in-production-32bytes'),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_ENDPOINT_URL_S3: z.string().optional(),
  AWS_REGION: z.string().default('ap-southeast-1'),
  S3_BUCKET_NAME: z.string().default('medicine-images'),
  S3_BUCKET_ACCESS: z.enum(['public_read', 'private']).default('public_read'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn('⚠️ Cảnh báo cấu hình biến môi trường:', parsed.error.flatten().fieldErrors);
    return envSchema.parse({});
  }
  return parsed.data;
}

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(
    url &&
      url.startsWith('postgres') &&
      !url.includes('YOUR_PASSWORD') &&
      !url.includes('ep-example')
  );
}

export function isS3StorageConfigured(): boolean {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3 } = process.env;
  return Boolean(
    AWS_ACCESS_KEY_ID &&
      AWS_SECRET_ACCESS_KEY &&
      AWS_ENDPOINT_URL_S3 &&
      !AWS_ACCESS_KEY_ID.includes('your-neon-s3') &&
      !AWS_ENDPOINT_URL_S3.includes('br-example')
  );
}

