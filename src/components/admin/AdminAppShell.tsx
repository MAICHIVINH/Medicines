'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  DashboardOutlined,
  AppstoreOutlined,
  MedicineBoxOutlined,
  ControlOutlined,
  RestOutlined,
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Button, Dropdown, Breadcrumb } from 'antd';

const { Header, Sider, Content } = Layout;

interface AdminAppShellProps {
  children: React.ReactNode;
  adminUser?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
  } | null;
}

const MENU_ITEMS = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: <Link href="/admin">Tổng quan (Dashboard)</Link>,
    title: 'Dashboard',
  },
  {
    key: '/admin/categories',
    icon: <AppstoreOutlined />,
    label: <Link href="/admin/categories">Quản lý Danh mục</Link>,
    title: 'Quản lý Danh mục',
  },
  {
    key: '/admin/medicines',
    icon: <MedicineBoxOutlined />,
    label: <Link href="/admin/medicines">Quản lý Thuốc & Biến thể</Link>,
    title: 'Quản lý Thuốc',
  },
  {
    key: '/admin/attributes',
    icon: <ControlOutlined />,
    label: <Link href="/admin/attributes">Thuộc tính động</Link>,
    title: 'Thuộc tính động',
  },
  {
    key: '/admin/trash',
    icon: <RestOutlined />,
    label: <Link href="/admin/trash">Thùng rác</Link>,
    title: 'Thùng rác',
  },
  {
    key: '/admin/account',
    icon: <UserOutlined />,
    label: <Link href="/admin/account">Tài khoản Admin</Link>,
    title: 'Tài khoản Admin',
  },
];

export function AdminAppShell({ children, adminUser }: AdminAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Nếu đang ở trang /admin/login thì render trực tiếp trang login không kèm Sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const selectedKey =
    MENU_ITEMS.slice()
      .reverse()
      .find((item) =>
        item.key === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.key)
      )?.key || '/admin';

  const currentMenuTitle =
    MENU_ITEMS.find((i) => i.key === selectedKey)?.title || 'Quản trị Hệ thống';

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={80}
        width={255}
        className="!fixed left-0 top-0 bottom-0 z-40 h-screen overflow-y-auto border-r border-slate-800 !bg-slate-900"
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        {/* Brand Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4 sticky top-0 z-10 bg-slate-900">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pharma-600 text-white">
            <MedicineBoxOutlined className="text-lg" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="block truncate text-sm font-bold text-white">
                Dược sĩ Khánh
              </span>
              <span className="block truncate text-[11px] text-slate-400">
                Quản trị Dược điển
              </span>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS.map(({ key, icon, label }) => ({ key, icon, label }))}
          className="!bg-slate-900 mt-2"
        />
      </Sider>

      <Layout
        className="bg-slate-50 min-w-0 flex-1 transition-all duration-200"
        style={{ marginLeft: collapsed ? 80 : 255 }}
      >
        <Header className="!bg-white border-b border-slate-200 !px-6 flex items-center justify-between h-16 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Breadcrumb
              items={[
                { title: <Link href="/admin">Admin</Link> },
                { title: currentMenuTitle },
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <GlobalOutlined className="text-pharma-600" />
              <span>Xem Website Công khai</span>
            </Link>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'account',
                    icon: <UserOutlined />,
                    label: 'Thông tin tài khoản',
                    onClick: () => router.push('/admin/account'),
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    danger: true,
                    label: 'Đăng xuất',
                    onClick: handleLogout,
                  },
                ],
              }}
            >
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pharma-600 text-xs font-bold text-white">
                  {adminUser?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="hidden md:block">
                  <span className="block text-xs font-bold text-slate-800 leading-none">
                    {adminUser?.fullName || 'Quản trị viên'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-none">
                    {adminUser?.username || 'admin'}
                  </span>
                </div>
              </button>
            </Dropdown>
          </div>
        </Header>

        <Content className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full min-w-0 mx-auto overflow-x-hidden">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

