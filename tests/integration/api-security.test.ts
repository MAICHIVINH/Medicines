import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Auth guard để kiểm thử luồng chưa đăng nhập vs đã đăng nhập Admin
const mockGetOptionalAdminSession = vi.fn();
const mockRequireAdminSession = vi.fn();

vi.mock('@/infrastructure/auth/guard', () => ({
  getOptionalAdminSession: () => mockGetOptionalAdminSession(),
  requireAdminSession: () => mockRequireAdminSession(),
}));

import { POST as createCategoryPost } from '@/app/api/v1/categories/route';
import { POST as createMedicinePost } from '@/app/api/v1/medicines/route';
import { POST as uploadImagePost } from '@/app/api/v1/uploads/route';
import { GET as adminDashboardGet } from '@/app/api/v1/admin/dashboard/route';
import { PATCH as adminAccountPatch } from '@/app/api/v1/admin/account/route';
import { UnauthorizedError } from '@/lib/errors';

describe('PHẦN 11.2 & 11.3 – Integration & Security Flow Tests: API Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Luồng bảo mật: Gọi API quản trị khi chưa xác thực (Unauthenticated)', () => {
    beforeEach(() => {
      mockGetOptionalAdminSession.mockResolvedValue(null);
      mockRequireAdminSession.mockRejectedValue(
        new UnauthorizedError('Yêu cầu xác thực Quản trị viên.')
      );
    });

    it('Chặn POST /api/v1/categories khi chưa đăng nhập Admin (HTTP 401)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Danh mục trái phép' }),
      });

      const res = await createCategoryPost(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('Chặn POST /api/v1/medicines khi chưa đăng nhập Admin (HTTP 401)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/medicines', {
        method: 'POST',
        body: JSON.stringify({ name: 'Thuốc trái phép' }),
      });

      const res = await createMedicinePost(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('Chặn GET /api/v1/admin/dashboard khi chưa xác thực (HTTP 401)', async () => {
      const res = await adminDashboardGet();
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('Chặn POST /api/v1/uploads khi chưa xác thực Admin (HTTP 401)', async () => {
      const formData = new FormData();
      formData.append('medicineId', '11111111-1111-1111-1111-111111111111');
      const req = new NextRequest('http://localhost:3000/api/v1/uploads', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadImagePost(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Luồng bảo mật: Gửi dữ liệu không hợp lệ (Zod Validation HTTP 400)', () => {
    beforeEach(() => {
      mockRequireAdminSession.mockResolvedValue({
        adminId: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        email: 'admin@pharmacatalog.vn',
        fullName: 'Quản trị viên',
      });
    });

    it('Trả về HTTP 400 VALIDATION_ERROR khi tạo danh mục với tên rỗng', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'A' }), // < 2 ký tự
      });

      const res = await createCategoryPost(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Trả về HTTP 400 VALIDATION_ERROR khi cập nhật Email Admin sai định dạng', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/account', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: 'Quản trị viên',
          email: 'email-khong-hop-le',
        }),
      });

      const res = await adminAccountPatch(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Trả về HTTP 400 khi gọi API upload ảnh nhưng không đính kèm file', async () => {
      const formData = new FormData();
      formData.append('medicineId', '11111111-1111-1111-1111-111111111111');
      const req = new NextRequest('http://localhost:3000/api/v1/uploads', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadImagePost(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NO_FILE_UPLOADED');
    });
  });
});

