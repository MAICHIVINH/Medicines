/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành không dấu
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tạo slug chuẩn SEO từ chuỗi tiếng Việt
 */
export function slugify(text: string): string {
  return removeVietnameseTones(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Định dạng tiền tệ VNĐ
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return 'Liên hệ';
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Định dạng dung lượng file (bytes -> KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Trích xuất địa chỉ IP an toàn từ Request Headers
 */
export function extractClientIp(headers: Headers): string {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp.slice(0, 64);
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim().slice(0, 64);
  return '127.0.0.1';
}

/**
 * Lấy Base URL chính thức của ứng dụng (Hỗ trợ tự động nhận diện domain Vercel và Localhost)
 */
export function getBaseUrl(): string {
  // 1. Ưu tiên biến môi trường NEXT_PUBLIC_APP_URL nếu được chỉ định domain thực tế
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Tự động nhận diện domain Vercel (Production hoặc Preview domain)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Mặc định cho môi trường phát triển local
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

