const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const parseAllowedOrigins = (): string[] => {
  const rawOrigins = process.env.CORS_ORIGIN;
  if (!rawOrigins) {
    return defaultAllowedOrigins;
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isVercelOrigin = (origin: string): boolean => {
  return /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
};

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) {
    return true;
  }

  const allowedOrigins = parseAllowedOrigins();
  return allowedOrigins.includes(origin) || isVercelOrigin(origin);
};
