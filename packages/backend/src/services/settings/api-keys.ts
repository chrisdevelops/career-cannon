import prisma from '../../lib/prisma.js';

export type ApiProvider = 'openai';

export async function getApiKey(provider: ApiProvider): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({
    where: { provider },
  });
  return record?.value ?? null;
}

export async function setApiKey(provider: ApiProvider, value: string): Promise<void> {
  await prisma.apiKey.upsert({
    where: { provider },
    update: { value },
    create: { provider, value },
  });
}

export async function clearApiKey(provider: ApiProvider): Promise<void> {
  await prisma.apiKey.deleteMany({ where: { provider } });
}

export async function getEffectiveApiKey(provider: ApiProvider): Promise<string | null> {
  const override = await getApiKey(provider);
  if (override && override.trim().length > 0) return override;
  const envKey = process.env.OPENAI_API_KEY;
  if (!envKey || envKey === 'your-api-key-here') return null;
  return envKey;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}••••••••${key.slice(-4)}`;
}
