import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/ui/AppProviders';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Dược sĩ Khánh – Hệ thống Tra cứu & Quản lý Danh mục Thuốc',
    template: '%s | Dược sĩ Khánh',
  },
  description:
    'Hệ thống tra cứu thông tin danh mục thuốc, hoạt chất, nhà sản xuất, số đăng ký lưu hành, quy cách đóng gói và giá tham khảo chính thống tại Việt Nam.',
  keywords: [
    'tra cứu thuốc',
    'danh mục thuốc',
    'dược điển',
    'hoạt chất thuốc',
    'số đăng ký thuốc',
    'giá thuốc tham khảo',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: appUrl,
    siteName: 'Dược sĩ Khánh',
    title: 'Dược sĩ Khánh – Hệ thống Tra cứu & Quản lý Danh mục Thuốc',
    description:
      'Cổng thông tin tra cứu danh mục thuốc, hoạt chất, nhà sản xuất, dạng bào chế và giá tham khảo được kiểm duyệt bởi Quản trị viên Dược phẩm.',
  },
  alternates: {
    canonical: appUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

