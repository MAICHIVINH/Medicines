import React from 'react';
import { getOptionalAdminSession } from '@/infrastructure/auth/guard';
import { AdminAppShell } from '@/components/admin/AdminAppShell';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getOptionalAdminSession();

  return (
    <AdminAppShell
      adminUser={
        admin
          ? {
              id: admin.adminId,
              username: admin.username,
              email: admin.email,
              fullName: admin.fullName,
            }
          : null
      }
    >
      {children}
    </AdminAppShell>
  );
}

