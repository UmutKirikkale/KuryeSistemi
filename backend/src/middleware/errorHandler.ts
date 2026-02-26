import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('❌ Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code?: string; meta?: { target?: string[]; column?: string; column_name?: string } };

    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'Aynı kayıt zaten mevcut'
      });
    }

    if (prismaError.code === 'P2022') {
      const column = prismaError.meta?.column_name || prismaError.meta?.column || 'unknown_column';
      return res.status(500).json({
        error: `Veritabanı şeması güncel değil (${column}). Lütfen migration çalıştırın.`
      });
    }

    return res.status(400).json({
      error: 'Database operation failed'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  // Default error
  return res.status(500).json({
    error: 'Internal server error'
  });
};
