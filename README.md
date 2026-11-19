# PharmaCatalog VN – Hệ thống Tra cứu và Quản lý Danh mục Thuốc

Hệ thống **Website Tra cứu và Quản lý Danh mục Thuốc** được thiết kế và phát triển theo kiến trúc **Modular Monolith** trên nền tảng **Next.js App Router (TypeScript)**, tích hợp cơ sở dữ liệu **Neon PostgreSQL (Prisma ORM)**, lưu trữ hình ảnh qua **Neon Object Storage (S3-compatible, AWS SDK v3)** và xác thực Quản trị viên duy nhất bằng **Auth.js (NextAuth v5)**.

> **Tuyên bố miễn trừ trách nhiệm y tế:** Hệ thống chỉ phục vụ mục đích tra cứu và giới thiệu thông tin danh mục thuốc đã được Quản trị viên nhập và xác minh từ nguồn chính thống. Hệ thống không thực hiện chẩn đoán, không kê đơn, không tư vấn điều trị và không kinh doanh thương mại điện tử.

---

## 1. Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Ngôn ngữ** | TypeScript 5 |
| **Giao diện (UI)** | React 18, Ant Design v5 (`@ant-design/nextjs-registry`), Tailwind CSS |
| **Backend** | Next.js Route Handlers (`/api/v1/*`) |
| **Cơ sở dữ liệu** | Neon PostgreSQL (Pooled & Direct Connections) |
| **ORM** | Prisma ORM v5 (`schema.prisma`, Migrations, Seed) |
| **Lưu trữ hình ảnh** | Neon Object Storage (S3-compatible) với AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| **Xác thực** | Auth.js (`next-auth` v5) + Bcrypt password hashing + Brute-force rate limiter |
| **Kiểm tra dữ liệu** | Zod Schema Validation + Kiểm tra chữ ký Magic Bytes cho tệp ảnh |
| **Kiểm thử** | Vitest (Unit Tests & Integration/Security Flow Tests) |
| **Triển khai** | Vercel + GitHub + Neon |

---

## 2. Kiến trúc Phần mềm (Modular Monolith)

Dự án tuân thủ chặt chẽ việc phân tách 5 lớp:

```text
medicine-catalog/
├── prisma/
│   ├── schema.prisma                            # Thiết kế 8 bảng nghiệp vụ (UUID, Decimal(18,2), Timestamptz)
│   ├── migrations/20261119000000_init/          # Prisma SQL Migration
│   └── seed.ts                                  # Khởi tạo Admin duy nhất, Danh mục cha-con, Thuộc tính động & Thuốc mẫu
├── src/
│   ├── app/
│   │   ├── (public)/                            # Website tra cứu công khai (Trang chủ, Danh mục, Thuốc, Chi tiết biến thể)
│   │   ├── admin/                               # Cổng Quản trị Admin (Login, Dashboard, Categories, Medicines, Attributes, Account)
│   │   ├── api/v1/                              # RESTful API Endpoints (/api/v1/*)
│   │   ├── sitemap.ts                           # Sitemap.xml động chuẩn SEO
│   │   └── robots.ts                            # Robots.txt chuẩn SEO
│   ├── components/
│   │   ├── ui/                                  # AppProviders (Ant Design Registry & Theme), DatabaseStatusNotice
│   │   ├── layout/                              # PublicHeader, PublicFooter
│   │   ├── medicine/                            # MedicineCard, MedicineCatalogBrowser, MedicineDetailInteractive
│   │   └── admin/                               # AdminAppShell
│   ├── modules/                                 # Business & Repository Layer
│   │   ├── category/category.service.ts         # Quản lý danh mục cha-con, chống vòng lặp, bảo vệ xóa mềm
│   │   ├── medicine/medicine.service.ts         # Quản lý thuốc, kiểm tra điều kiện xuất bản, tìm kiếm & lọc động
│   │   ├── variant/variant.service.ts           # Quản lý biến thể SKU, giá tham khảo & gán thuộc tính động EAV
│   │   ├── attribute/attribute.service.ts       # Quản lý thuộc tính động (TEXT, NUMBER, BOOLEAN, SELECT) & tùy chọn
│   │   ├── image/image.service.ts               # Đồng bộ an toàn giữa Neon Object Storage (S3) và PostgreSQL
│   │   └── auth/auth.service.ts                 # Xác thực Admin duy nhất, đổi mật khẩu, chống brute-force
│   ├── infrastructure/                          # Infrastructure Layer
│   │   ├── database/prisma.ts                   # Prisma Client Singleton & kiểm tra kết nối Neon PostgreSQL
│   │   ├── storage/neon-storage.service.ts      # Neon Object Storage S3 Client (forcePathStyle: true, Magic bytes)
│   │   └── auth/                                # Cấu hình Auth.js (NextAuth v5) & Server Guard
│   ├── lib/                                     # Logger, AppError Handler, Rate Limiter, Tiếng Việt Utils
│   ├── hooks/                                   # useDebounce
│   └── config/env.ts                            # Kiểm tra biến môi trường bằng Zod
└── tests/
    ├── unit/business-rules.test.ts              # Unit Test các quy tắc nghiệp vụ, S3 Magic Bytes, Circular check
    └── integration/api-security.test.ts         # Integration & Security Test cho các Route Handlers
```

---

## 3. Hướng dẫn Cấu hình & Triển khai Thực tế (Neon & Vercel)

### 3.1. Bước 1: Khởi tạo Neon PostgreSQL

1. Đăng nhập vào [Neon Console](https://console.neon.tech) và tạo một Project mới (khuyến nghị chọn region `ap-southeast-1` Singapore hoặc gần người dùng nhất).
2. Tại bảng điều khiển **Connection Details**:
   - Sao chép chuỗi kết nối **Pooled connection** (chứa hậu tố `-pooler` trong hostname) và gán vào biến `DATABASE_URL`.
   - Sao chép chuỗi kết nối **Direct connection** (không có `-pooler`) và gán vào biến `DIRECT_URL`.

### 3.2. Bước 2: Cấu hình Neon Object Storage (S3-Compatible)

1. Trong Neon Project/Branch của bạn, kích hoạt **Neon Object Storage** (tham khảo tài liệu chính thức tại `https://neon.com/docs/storage/overview` và `https://neon.com/docs/storage/s3-compatibility`).
2. Tạo bucket có tên `medicine-images`:
   - Nếu cấu hình bucket ở chế độ `public_read`, đặt `S3_BUCKET_ACCESS="public_read"`.
   - Nếu giữ bucket ở chế độ mặc định `private`, đặt `S3_BUCKET_ACCESS="private"` (Hệ thống sẽ tự động sinh **Presigned GET URL** qua AWS SDK v3).
3. Lấy thông tin xác thực S3 của branch hiện tại từ Neon Console hoặc CLI (`neon env pull`):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_ENDPOINT_URL_S3` (Ví dụ: `https://br-xxxx.storage.c-1.ap-southeast-1.aws.neon.tech`)
   - `AWS_REGION` (Ví dụ: `ap-southeast-1`)

> **Lưu ý kỹ thuật Neon S3:** Neon Object Storage bắt buộc sử dụng **Path-Style Addressing** (`forcePathStyle: true`) và chỉ hỗ trợ chữ ký **SigV4**. `NeonStorageService` trong `src/infrastructure/storage/neon-storage.service.ts` đã được cấu hình chuẩn xác theo yêu cầu này.

### 3.3. Bước 3: Thiết lập file `.env` ở môi trường Local (Development)

Sao chép `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Điền đầy đủ các biến môi trường trong `.env`:

| Biến môi trường | Mô tả |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối Pooled Neon PostgreSQL (`?sslmode=require`) |
| `DIRECT_URL` | Chuỗi kết nối Direct Neon PostgreSQL dùng cho Prisma Migration |
| `AUTH_SECRET` | Khóa bí mật 32-byte ký JWT Session của Auth.js |
| `AUTH_URL` | `http://localhost:3000` (hoặc URL domain trên Production) |
| `NEXT_PUBLIC_APP_URL` | URL công khai của website dùng cho SEO Metadata & Sitemap |
| `AWS_ACCESS_KEY_ID` | Access Key ID của Neon Object Storage |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key của Neon Object Storage |
| `AWS_ENDPOINT_URL_S3` | Branch-specific S3 Endpoint URL của Neon Object Storage |
| `AWS_REGION` | Region của Neon Object Storage (`ap-southeast-1`, `us-east-1`, `us-east-2`, `eu-central-1`) |
| `S3_BUCKET_NAME` | Tên bucket mặc định: `medicine-images` |
| `S3_BUCKET_ACCESS` | `public_read` hoặc `private` |
| `INITIAL_ADMIN_USERNAME` | Tên đăng nhập Admin khởi tạo khi chạy seed (mặc định: `admin`) |
| `INITIAL_ADMIN_EMAIL` | Email Admin khởi tạo khi chạy seed |
| `INITIAL_ADMIN_PASSWORD` | Mật khẩu Admin khởi tạo khi chạy seed |

### 3.4. Bước 4: Chạy Migration, Seed dữ liệu và Khởi động

```bash
# 1. Cài đặt dependencies
npm install

# 2. Sinh Prisma Client
npm run db:generate

# 3. Thực thi Prisma Migration lên Neon PostgreSQL
npm run db:deploy

# 4. Khởi tạo tài khoản Admin duy nhất, Danh mục cha-con, Thuộc tính động & Thuốc mẫu
npm run db:seed

# 5. Chạy máy chủ Development
npm run dev
```

### 3.5. Bước 5: Triển khai lên Vercel (Production Deployment)

1. Đẩy mã nguồn lên GitHub Repository (File `.gitignore` đã loại trừ `.env` để đảm bảo không lộ thông tin bí mật).
2. Tạo Project mới trên [Vercel](https://vercel.com) và kết nối với GitHub Repository.
3. Trong mục **Settings -> Environment Variables** trên Vercel, khai báo các biến môi trường giống như trong `.env.example` (cập nhật `AUTH_URL` và `NEXT_PUBLIC_APP_URL` thành domain chính thức của Vercel).
4. Lệnh Build mặc định trên Vercel: `npm run build` (`prisma generate && next build`).
   - *Lưu ý vận hành Production:* Không tự động chạy `prisma migrate` một cách tùy tiện trong lệnh build của Vercel. Hãy chạy `npm run db:deploy` có kiểm soát từ pipeline CI/CD hoặc máy trạm quản trị trước khi release.

---

## 4. Kiểm thử (Testing)

Chạy toàn bộ Unit Test và Integration/Security Test bằng lệnh:

```bash
npm test
```

