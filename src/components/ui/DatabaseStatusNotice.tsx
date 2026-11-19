import React from 'react';
import { DatabaseOutlined, InfoCircleOutlined } from '@ant-design/icons';

export function DatabaseStatusNotice({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-5 text-amber-900 shadow-sm">
      <div className="flex items-start gap-3">
        <DatabaseOutlined className="mt-1 text-xl text-amber-600" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-amber-950">
            Cần cấu hình kết nối Cơ sở dữ liệu Neon PostgreSQL
          </p>
          <p className="text-amber-800">
            {message ||
              'Hệ thống chưa nhận được chuỗi kết nối DATABASE_URL hợp lệ tới Neon PostgreSQL. Vui lòng thiết lập biến môi trường DATABASE_URL và DIRECT_URL trong file .env, sau đó chạy lệnh khởi tạo migration và seed.'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700">
            <InfoCircleOutlined />
            <span>
              Lệnh khởi tạo: <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">npm run db:deploy</code> &amp;{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">npm run db:seed</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

