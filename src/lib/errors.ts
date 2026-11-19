import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác quản trị này.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy dữ liệu yêu cầu.') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Dữ liệu bị trùng lặp hoặc xung đột ràng buộc nghiệp vụ.') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Dịch vụ bên ngoài chưa được cấu hình hoặc tạm thời không khả dụng.', details?: unknown) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  meta?: { page: number; limit: number; total: number; totalPages: number }
) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(payload, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const formatted = error.flatten();
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu đầu vào không hợp lệ.',
          details: formatted.fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Prisma unique constraint errors (P2002) & Foreign Key constraint errors (P2003)
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === 'P2002') {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: 'Giá trị định danh (Slug, SKU, Mã thuộc tính hoặc Username/Email) đã tồn tại trong hệ thống.',
          },
        },
        { status: 409 }
      );
    }
    if (prismaCode === 'P2003') {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
            message: 'Không thể xóa hoặc thay đổi bản ghi đang được tham chiếu bởi dữ liệu khác.',
          },
        },
        { status: 409 }
      );
    }
    if (prismaCode === 'P2025') {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Bản ghi cần thao tác không tồn tại hoặc đã bị xóa.',
          },
        },
        { status: 404 }
      );
    }
  }

  logger.error('Unhandled API Error', error);

  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã xảy ra lỗi hệ thống. Vui lòng kiểm tra cấu hình dịch vụ hoặc thử lại sau.',
      },
    },
    { status: 500 }
  );
}

