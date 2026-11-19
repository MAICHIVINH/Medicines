'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MedicineBoxOutlined,
  LockOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Form, Input, Button, Checkbox, Alert } from 'antd';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: {
    identifier: string;
    password: string;
    remember?: boolean;
  }) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await signIn('credentials', {
        identifier: values.identifier.trim(),
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        setErrorMsg(
          'Tên đăng nhập/Email hoặc mật khẩu không chính xác, hoặc tài khoản đã vượt quá giới hạn đăng nhập cho phép.'
        );
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pharma-600 text-white shadow-md">
          <MedicineBoxOutlined className="text-3xl" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Quản trị Hệ thống Dược điển
        </h1>
        <p className="text-xs text-slate-500">
          Đăng nhập bằng tài khoản Quản trị viên duy nhất (Auth.js Security)
        </p>
      </div>

      {errorMsg && (
        <Alert
          type="error"
          showIcon
          message="Xác thực không thành công"
          description={errorMsg}
        />
      )}

      <Form
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ remember: true }}
        requiredMark={false}
      >
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Username hoặc Email</span>}
          name="identifier"
          rules={[
            { required: true, message: 'Vui lòng nhập Tên đăng nhập hoặc Email.' },
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-slate-400" />}
            placeholder="admin hoặc admin@pharmacatalog.vn"
            size="large"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Mật khẩu quản trị</span>}
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-slate-400" />}
            placeholder="Nhập mật khẩu..."
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>

        <div className="flex items-center justify-between mb-4">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox className="text-xs text-slate-600">
              Ghi nhớ phiên đăng nhập an toàn (24h)
            </Checkbox>
          </Form.Item>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          className="w-full font-semibold"
        >
          Đăng nhập Khu vực Quản trị
        </Button>
      </Form>

      <div className="border-t border-slate-100 pt-4 space-y-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-pharma-700">
          <SafetyCertificateOutlined />
          <span>Hệ thống không cho phép đăng ký công khai • Bảo vệ chống Brute-force</span>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-pharma-600"
          >
            <ArrowLeftOutlined className="text-[10px]" />
            <span>Quay về trang tra cứu công khai</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-pharma-950 to-slate-900 px-4 py-12">
      <Suspense
        fallback={
          <div className="text-sm text-white">Đang tải cổng đăng nhập Admin...</div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}

