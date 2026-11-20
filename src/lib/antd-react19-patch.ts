'use client';

import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { unstableSetRender } from 'antd';

/**
 * Patch tương thích Ant Design v5 trên môi trường Next.js 15 (sử dụng runtime React 19 canary).
 * - Cung cấp createRoot cho ReactDOM để giải quyết cảnh báo:
 *   "Warning: [antd: compatible] antd v5 support React is 16 ~ 18"
 * - Cấu hình render bridge cho các static components (Modal.confirm, message, notification).
 * Tham khảo tài liệu chính thức của Ant Design: https://u.ant.design/v5-for-19
 */
if (typeof window !== 'undefined') {
  // 1. Khai báo createRoot trên ReactDOM để vượt qua kiểm tra tương thích của Antd
  const rd = ReactDOM as unknown as Record<string, unknown>;
  if (!rd.createRoot) {
    rd.createRoot = createRoot;
  }

  // 2. Thiết lập bridge render hiện đại với createRoot cho các modal / message động
  unstableSetRender((node, container) => {
    const customContainer = container as unknown as { _reactRoot?: ReturnType<typeof createRoot> };
    if (!customContainer._reactRoot) {
      customContainer._reactRoot = createRoot(container);
    }
    const root = customContainer._reactRoot;
    root.render(node);
    return async () => {
      await root.unmount();
    };
  });
}

