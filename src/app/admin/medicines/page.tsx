'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UndoOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Popconfirm,
  App,
} from 'antd';
import { formatVND, slugify } from '@/lib/utils';

interface MedicineRecord {
  id: string;
  name: string;
  slug: string;
  activeIngredient: string;
  manufacturer: string;
  registrationNumber: string | null;
  isPrescriptionRequired: boolean;
  isFeatured: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
  primaryImageUrl?: string | null;
  referencePrice?: number | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants?: Array<{ id: string; sku: string; name: string }>;
}

interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

export default function AdminMedicinesListPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [createForm] = Form.useForm();

  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/categories?includeInactive=true');
      const json = await res.json();
      if (res.ok && json.success) {
        setCategories(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchMedicines = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '12',
          includeUnpublished: 'true',
          includeDeleted: String(includeDeleted),
        });
        if (search.trim()) params.set('search', search.trim());
        if (categoryId) params.set('categoryId', categoryId);
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/v1/medicines?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Không thể tải danh sách thuốc.');
        }

        setMedicines(json.data || []);
        if (json.meta) setMeta(json.meta);
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Lỗi tải danh sách thuốc.');
      } finally {
        setLoading(false);
      }
    },
    [includeDeleted, search, categoryId, statusFilter, message]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMedicines(1);
  }, [fetchMedicines]);

  const handleCreateMedicine = async (values: {
    name: string;
    slug?: string;
    categoryId: string;
    activeIngredient: string;
    manufacturer: string;
    registrationNumber?: string;
    isPrescriptionRequired: boolean;
    isFeatured: boolean;
    description?: string;
    usageInformation?: string;
    storageInformation?: string;
  }) => {
    setCreating(true);
    try {
      const res = await fetch('/api/v1/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          status: 'DRAFT',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể khởi tạo hồ sơ thuốc.');
      }

      message.success(
        'Đã tạo hồ sơ thuốc bản nháp! Chuyển đến trang cấu hình chi tiết 7 nhóm thông tin, biến thể & hình ảnh...'
      );
      setCreateModalOpen(false);
      router.push(`/admin/medicines/${json.data.id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tạo thuốc.');
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (record: MedicineRecord) => {
    try {
      const res = await fetch(`/api/v1/medicines/${record.id}/publish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không đủ điều kiện xuất bản.');
      }
      message.success(`Đã xuất bản thuốc "${record.name}" lên cổng tra cứu công khai!`);
      fetchMedicines(meta.page);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xuất bản thuốc.');
    }
  };

  const handleUnpublish = async (record: MedicineRecord) => {
    try {
      const res = await fetch(`/api/v1/medicines/${record.id}/unpublish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể ngừng hiển thị thuốc.');
      }
      message.success(`Đã ngừng hiển thị thuốc "${record.name}".`);
      fetchMedicines(meta.page);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi ngừng hiển thị.');
    }
  };

  const handleDelete = async (record: MedicineRecord) => {
    try {
      const res = await fetch(`/api/v1/medicines/${record.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa mềm thuốc.');
      }
      message.success(`Đã xóa mềm thuốc "${record.name}".`);
      fetchMedicines(meta.page);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xóa mềm thuốc.');
    }
  };

  const handleRestore = async (record: MedicineRecord) => {
    try {
      const res = await fetch(`/api/v1/medicines/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true, status: 'DRAFT' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể khôi phục thuốc.');
      }
      message.success(`Đã khôi phục thuốc "${record.name}" về trạng thái Bản nháp.`);
      fetchMedicines(meta.page);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khôi phục thuốc.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setCreateModalOpen(true);
            setTimeout(() => {
              createForm.resetFields();
              createForm.setFieldsValue({
                isPrescriptionRequired: false,
                isFeatured: false,
              });
            }, 0);
          }}
        >
          Tạo hồ sơ thuốc mới
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo tên thuốc, hoạt chất, NSX, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
            allowClear
          />

          <Select
            placeholder="Lọc theo danh mục"
            allowClear
            value={categoryId || undefined}
            onChange={(val) => setCategoryId(val || '')}
            className="w-56"
            options={categories.map((c) => ({
              label: c.parentId ? `↳ ${c.name}` : c.name,
              value: c.id,
            }))}
          />

          <Select
            placeholder="Trạng thái xuất bản"
            allowClear
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            className="w-44"
            options={[
              { label: 'Đã xuất bản (PUBLISHED)', value: 'PUBLISHED' },
              { label: 'Bản nháp (DRAFT)', value: 'DRAFT' },
              { label: 'Ngừng hiển thị (ARCHIVED)', value: 'ARCHIVED' },
            ]}
          />

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <Switch
              size="small"
              checked={includeDeleted}
              onChange={(checked) => setIncludeDeleted(checked)}
            />
            <span>Hiển thị đã xóa mềm</span>
          </label>
        </div>

        <Button icon={<ReloadOutlined />} onClick={() => fetchMedicines(meta.page)}>
          Làm mới
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={medicines}
          scroll={{ x: 980 }}
          pagination={{
            current: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            onChange: (p) => fetchMedicines(p),
          }}
          columns={[
            {
              title: 'Thông tin thuốc',
              key: 'info',
              width: 300,
              render: (_: unknown, record: MedicineRecord) => (
                <div className="flex items-center gap-3 max-w-[280px]">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                    {record.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={record.primaryImageUrl}
                        alt={record.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-pharma-600">RX/OTC</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/medicines/${record.id}`}
                      className="font-bold text-slate-900 hover:text-pharma-700 block truncate"
                      title={record.name}
                    >
                      {record.name}
                    </Link>
                    <div
                      className="text-xs text-slate-500 truncate"
                      title={record.activeIngredient}
                    >
                      Hoạt chất: <strong>{record.activeIngredient}</strong>
                    </div>
                    <div
                      className="text-[11px] text-slate-400 truncate"
                      title={`${record.manufacturer}${record.registrationNumber ? ` • SĐK: ${record.registrationNumber}` : ''}`}
                    >
                      NSX: {record.manufacturer}{' '}
                      {record.registrationNumber ? `• SĐK: ${record.registrationNumber}` : ''}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Danh mục',
              key: 'category',
              width: 170,
              render: (_: unknown, record: MedicineRecord) =>
                record.category ? (
                  <Tag
                    color="cyan"
                    className="!whitespace-normal !h-auto py-0.5 leading-snug max-w-[155px]"
                  >
                    {record.category.name}
                  </Tag>
                ) : (
                  '—'
                ),
            },
            {
              title: 'Biến thể & Giá',
              key: 'variants',
              width: 145,
              render: (_: unknown, record: MedicineRecord) => (
                <div className="text-xs">
                  <div className="font-semibold text-pharma-700 whitespace-nowrap">
                    {record.referencePrice !== null && record.referencePrice !== undefined
                      ? `Từ ${formatVND(record.referencePrice)}`
                      : 'Chưa có giá'}
                  </div>
                  <div className="text-slate-400">
                    {record.variants?.length ?? 0} biến thể SKU
                  </div>
                </div>
              ),
            },
            {
              title: 'Phân loại',
              key: 'flags',
              width: 145,
              render: (_: unknown, record: MedicineRecord) => (
                <Space direction="vertical" size={2}>
                  {record.isPrescriptionRequired ? (
                    <Tag color="volcano" className="m-0">
                      Thuốc kê đơn (Rx)
                    </Tag>
                  ) : (
                    <Tag color="green" className="m-0">
                      Không kê đơn (OTC)
                    </Tag>
                  )}
                  {record.isFeatured && (
                    <Tag color="gold" className="m-0">
                      Nổi bật
                    </Tag>
                  )}
                </Space>
              ),
            },
            {
              title: 'Trạng thái',
              key: 'status',
              width: 130,
              render: (_: unknown, record: MedicineRecord) => {
                if (record.deletedAt) {
                  return <Tag color="red">Đã xóa mềm</Tag>;
                }
                if (record.status === 'PUBLISHED') {
                  return <Tag color="success">ĐÃ XUẤT BẢN</Tag>;
                }
                if (record.status === 'DRAFT') {
                  return <Tag color="warning">BẢN NHÁP</Tag>;
                }
                return <Tag color="default">NGỪNG HIỂN THỊ</Tag>;
              },
            },
            {
              title: 'Thao tác',
              key: 'actions',
              align: 'right',
              width: 230,
              render: (_: unknown, record: MedicineRecord) => (
                <Space size={4} wrap className="justify-end">
                  {record.status === 'PUBLISHED' && !record.deletedAt && (
                    <Link
                      href={`/medicines/${record.slug}`}
                      target="_blank"
                      title="Xem trên website công khai"
                    >
                      <Button size="small" icon={<EyeOutlined />} />
                    </Link>
                  )}

                  {!record.deletedAt ? (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/admin/medicines/${record.id}`)}
                      >
                        Chi tiết
                      </Button>

                      {record.status !== 'PUBLISHED' ? (
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handlePublish(record)}
                        >
                          Xuất bản
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          icon={<StopOutlined />}
                          onClick={() => handleUnpublish(record)}
                        >
                          Ẩn
                        </Button>
                      )}

                      <Popconfirm
                        title="Xác nhận xóa mềm hồ sơ thuốc này?"
                        okText="Xóa mềm"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      icon={<UndoOutlined />}
                      onClick={() => handleRestore(record)}
                    >
                      Khôi phục
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </div>

      {/* Create Medicine Initial Modal */}
      <Modal
        title="Khởi tạo Hồ sơ Thuốc mới (Lưu Bản nháp)"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={680}
        forceRender
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateMedicine}
          className="mt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="Tên thuốc"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên thuốc.' }]}
            >
              <Input
                placeholder="Ví dụ: Hapacol 650 DHG Pharma"
                onChange={(e) =>
                  createForm.setFieldValue('slug', slugify(e.target.value))
                }
              />
            </Form.Item>

            <Form.Item
              label="Slug URL chuẩn SEO"
              name="slug"
              rules={[{ required: true, message: 'Vui lòng nhập slug.' }]}
            >
              <Input placeholder="hapacol-650-dhg-pharma" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="Danh mục phân loại"
              name="categoryId"
              rules={[{ required: true, message: 'Vui lòng chọn danh mục.' }]}
            >
              <Select
                placeholder="-- Chọn danh mục thuốc --"
                options={categories.map((c) => ({
                  label: c.parentId ? `↳ ${c.name}` : c.name,
                  value: c.id,
                }))}
              />
            </Form.Item>

            <Form.Item label="Số đăng ký lưu hành" name="registrationNumber">
              <Input placeholder="Ví dụ: VD-25551-16" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="Hoạt chất chính & Hàm lượng"
              name="activeIngredient"
              rules={[{ required: true, message: 'Vui lòng nhập hoạt chất.' }]}
            >
              <Input placeholder="Ví dụ: Paracetamol 650mg" />
            </Form.Item>

            <Form.Item
              label="Nhà sản xuất"
              name="manufacturer"
              rules={[{ required: true, message: 'Vui lòng nhập nhà sản xuất.' }]}
            >
              <Input placeholder="Ví dụ: DHG Pharma" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Thuốc kê đơn (Rx)"
              name="isPrescriptionRequired"
              valuePropName="checked"
            >
              <Switch checkedChildren="Thuốc kê đơn (Rx)" unCheckedChildren="Không kê đơn (OTC)" />
            </Form.Item>

            <Form.Item
              label="Hiển thị đề xuất nổi bật"
              name="isFeatured"
              valuePropName="checked"
            >
              <Switch checkedChildren="Nổi bật" unCheckedChildren="Thường" />
            </Form.Item>
          </div>

          <Form.Item label="Mô tả tóm tắt chế phẩm" name="description">
            <Input.TextArea
              rows={2}
              placeholder="Nhập mô tả thông tin thuốc từ tờ hướng dẫn sử dụng..."
            />
          </Form.Item>

          <Form.Item label="Thông tin hướng dẫn sử dụng (Từ NSX)" name="usageInformation">
            <Input.TextArea
              rows={2}
              placeholder="Thông tin cách dùng được nhà sản xuất cung cấp..."
            />
          </Form.Item>

          <Form.Item label="Thông tin bảo quản" name="storageInformation">
            <Input.TextArea
              rows={2}
              placeholder="Ví dụ: Bảo quản nơi khô mát, dưới 30°C..."
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Khởi tạo &amp; Tiếp tục cấu hình Biến thể / Hình ảnh
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

