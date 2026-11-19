'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Form, Input, Button, Tag, Spin, App } from 'antd';

interface AdminProfileData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAccountPage() {
  const { message } = App.useApp();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/account');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể tải thông tin tài khoản.');
      }
      setProfile(json.data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tải tài khoản Admin.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile && !loading) {
      profileForm.setFieldsValue({
        fullName: profile.fullName,
        email: profile.email,
      });
    }
  }, [profile, loading, profileForm]);

  const handleUpdateProfile = async (values: { fullName: string; email: string }) => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/v1/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể cập nhật thông tin.');
      }
      message.success('Đã cập nhật thông tin tài khoản Quản trị viên!');
      fetchProfile();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi cập nhật thông tin.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setSavingPassword(true);
    try {
      const res = await fetch('/api/v1/admin/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể đổi mật khẩu.');
      }
      message.success('Đã đổi mật khẩu Quản trị viên thành công!');
      passwordForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi đổi mật khẩu.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Spin size="large" tip="Đang tải hồ sơ Quản trị viên..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      {profile && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pharma-600 text-2xl font-extrabold text-white">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {profile.fullName}
                </h2>
                <Tag color="green">Single System Admin</Tag>
              </div>
              <p className="text-xs text-slate-500">
                Username: <strong className="font-mono">{profile.username}</strong> • Email:{' '}
                <strong>{profile.email}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
            <ClockCircleOutlined className="text-pharma-600" />
            <div>
              <span className="block text-[11px] text-slate-400">
                Thời gian đăng nhập gần nhất
              </span>
              <span className="font-semibold text-slate-800">
                {profile.lastLoginAt
                  ? new Date(profile.lastLoginAt).toLocaleString('vi-VN')
                  : 'Phiên đăng nhập đầu tiên'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form Cập nhật Họ tên & Email */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserOutlined className="text-pharma-600" />
            <h3 className="text-base font-bold text-slate-900">
              Cập nhật Thông tin Cá nhân
            </h3>
          </div>

          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
          >
            <Form.Item label="Tên đăng nhập (Username cố định)">
              <Input value={profile?.username} disabled />
            </Form.Item>

            <Form.Item
              label="Họ và tên Quản trị viên"
              name="fullName"
              rules={[
                { required: true, message: 'Vui lòng nhập họ và tên.' },
                { min: 2, message: 'Tối thiểu 2 ký tự.' },
              ]}
            >
              <Input placeholder="Quản trị viên Hệ thống Dược điển" />
            </Form.Item>

            <Form.Item
              label="Địa chỉ Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập Email.' },
                { type: 'email', message: 'Email không hợp lệ.' },
              ]}
            >
              <Input placeholder="admin@pharmacatalog.vn" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={savingProfile}
            >
              Lưu thông tin tài khoản
            </Button>
          </Form>
        </div>

        {/* Form Đổi mật khẩu */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <LockOutlined className="text-pharma-600" />
            <h3 className="text-base font-bold text-slate-900">
              Đổi Mật khẩu Quản trị (Bcrypt Hash)
            </h3>
          </div>

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              label="Mật khẩu hiện tại"
              name="currentPassword"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại.' }]}
            >
              <Input.Password placeholder="Nhập mật khẩu hiện tại..." />
            </Form.Item>

            <Form.Item
              label="Mật khẩu mới (Tối thiểu 8 ký tự, có chữ hoa, chữ thường và số)"
              name="newPassword"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới.' },
                { min: 8, message: 'Mật khẩu mới tối thiểu 8 ký tự.' },
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu mới..." />
            </Form.Item>

            <Form.Item
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới.' }]}
            >
              <Input.Password placeholder="Nhập lại mật khẩu mới..." />
            </Form.Item>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <SafetyCertificateOutlined /> Mật khẩu được mã hóa một chiều bằng Bcrypt (12 rounds)
              </span>
              <Button
                type="primary"
                htmlType="submit"
                loading={savingPassword}
              >
                Cập nhật mật khẩu
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

