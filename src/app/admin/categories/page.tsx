'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UndoOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Table,
  Button,
  Modal,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  Space,
  Popconfirm,
  App,
} from 'antd';
import { slugify } from '@/lib/utils';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string; slug: string } | null;
  _count?: { medicines: number };
}

export default function AdminCategoriesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CategoryRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<CategoryRecord | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeInactive: 'true',
        includeDeleted: String(includeDeleted),
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const res = await fetch(`/api/v1/categories?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể tải danh sách danh mục.');
      }
      setCategories(json.data || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tải danh mục.');
    } finally {
      setLoading(false);
    }
  }, [includeDeleted, search, message]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      sortOrder: 0,
      isActive: true,
      parentId: null,
    });
    setModalOpen(true);
  };

  const openEditModal = (record: CategoryRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description || '',
      parentId: record.parentId || null,
      sortOrder: record.sortOrder,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (values: {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string | null;
    sortOrder: number;
    isActive: boolean;
  }) => {
    setSubmitting(true);
    try {
      const url = editingRecord
        ? `/api/v1/categories/${editingRecord.id}`
        : '/api/v1/categories';
      const method = editingRecord ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          parentId: values.parentId || null,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể lưu danh mục.');
      }

      message.success(
        editingRecord
          ? 'Đã cập nhật danh mục thành công!'
          : 'Đã tạo danh mục thuốc mới thành công!'
      );
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi lưu danh mục.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (record: CategoryRecord, checked: boolean) => {
    try {
      const res = await fetch(`/api/v1/categories/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: checked }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể cập nhật trạng thái.');
      }
      message.success(
        checked
          ? `Đã kích hoạt danh mục "${record.name}"`
          : `Đã ngừng kích hoạt danh mục "${record.name}"`
      );
      fetchCategories();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái.');
    }
  };

  const handleDelete = async (record: CategoryRecord) => {
    try {
      const res = await fetch(`/api/v1/categories/${record.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa danh mục.');
      }
      message.success(`Đã xóa mềm danh mục "${record.name}" thành công.`);
      fetchCategories();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi xóa danh mục.');
    }
  };

  const handleRestore = async (record: CategoryRecord) => {
    try {
      const res = await fetch(`/api/v1/categories/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể khôi phục danh mục.');
      }
      message.success(`Đã khôi phục danh mục "${record.name}" thành công.`);
      fetchCategories();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khôi phục danh mục.');
    }
  };

  const availableParents = categories.filter(
    (c) => !c.deletedAt && (!editingRecord || c.id !== editingRecord.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Tạo danh mục mới
        </Button>
      </div> */}

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo tên danh mục hoặc slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            allowClear
          />
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <Switch
              size="small"
              checked={includeDeleted}
              onChange={(checked) => setIncludeDeleted(checked)}
            />
            <span>Hiển thị cả danh mục đã xóa mềm</span>
          </label>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchCategories}>
          Làm mới
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Tạo danh mục mới
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={categories}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'Tên danh mục',
              dataIndex: 'name',
              key: 'name',
              render: (text: string, record: CategoryRecord) => (
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    {record.parentId && (
                      <span className="text-slate-400 font-normal">↳</span>
                    )}
                    <span>{text}</span>
                    {record.deletedAt && <Tag color="red">Đã xóa mềm</Tag>}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{record.slug}</div>
                </div>
              ),
            },
            {
              title: 'Danh mục cha',
              key: 'parent',
              render: (_: unknown, record: CategoryRecord) =>
                record.parent ? (
                  <Tag color="cyan">{record.parent.name}</Tag>
                ) : (
                  <span className="text-xs text-slate-400">Danh mục gốc (Cấp 1)</span>
                ),
            },
            {
              title: 'Số lượng thuốc',
              key: 'medicinesCount',
              align: 'center',
              render: (_: unknown, record: CategoryRecord) => (
                <Tag color="blue">{record._count?.medicines ?? 0} thuốc</Tag>
              ),
            },
            {
              title: 'Thứ tự',
              dataIndex: 'sortOrder',
              key: 'sortOrder',
              align: 'center',
              width: 90,
            },
            {
              title: 'Trạng thái',
              key: 'isActive',
              align: 'center',
              render: (_: unknown, record: CategoryRecord) => (
                <Switch
                  checked={record.isActive}
                  disabled={Boolean(record.deletedAt)}
                  onChange={(checked) => handleToggleActive(record, checked)}
                  checkedChildren="Hoạt động"
                  unCheckedChildren="Tắt"
                />
              ),
            },
            {
              title: 'Thao tác',
              key: 'actions',
              align: 'right',
              render: (_: unknown, record: CategoryRecord) => (
                <Space size="small">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setDetailRecord(record)}
                  />
                  {!record.deletedAt ? (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                      >
                        Sửa
                      </Button>
                      <Popconfirm
                        title="Xác nhận xóa mềm danh mục?"
                        description="Hệ thống sẽ kiểm tra ràng buộc thuốc và danh mục con trước khi xóa."
                        okText="Xác nhận xóa"
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

      {/* Create / Edit Modal */}
      <Modal
        title={editingRecord ? 'Chỉnh sửa Danh mục Thuốc' : 'Tạo Danh mục Thuốc mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          className="mt-4"
        >
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên danh mục.' },
              { min: 2, message: 'Tên danh mục tối thiểu 2 ký tự.' },
            ]}
          >
            <Input
              placeholder="Ví dụ: Thuốc giảm đau, hạ sốt"
              onChange={(e) => {
                if (!editingRecord) {
                  form.setFieldValue('slug', slugify(e.target.value));
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Slug chuẩn SEO"
            name="slug"
            rules={[{ required: true, message: 'Vui lòng nhập slug.' }]}
          >
            <Input placeholder="thuoc-giam-dau-ha-sot" />
          </Form.Item>

          <Form.Item label="Danh mục cha (Tùy chọn)" name="parentId">
            <Select
              allowClear
              placeholder="-- Là danh mục gốc (Cấp 1) --"
              options={availableParents.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Mô tả nhóm danh mục" name="description">
            <Input.TextArea
              rows={3}
              placeholder="Nhập mô tả chuyên môn cho nhóm danh mục thuốc..."
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Thứ tự hiển thị" name="sortOrder">
              <InputNumber min={0} className="w-full" />
            </Form.Item>

            <Form.Item
              label="Trạng thái kích hoạt"
              name="isActive"
              valuePropName="checked"
            >
              <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng" />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingRecord ? 'Cập nhật danh mục' : 'Tạo danh mục'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Chi tiết Danh mục Thuốc"
        open={Boolean(detailRecord)}
        onClose={() => setDetailRecord(null)}
        width={460}
      >
        {detailRecord && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="block text-xs text-slate-400">ID Danh mục (UUID)</span>
              <span className="font-mono text-xs text-slate-800">{detailRecord.id}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Tên danh mục</span>
              <span className="font-bold text-slate-900 text-base">{detailRecord.name}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Slug URL</span>
              <span className="font-mono text-xs text-pharma-700">{detailRecord.slug}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Danh mục cha</span>
              <span>{detailRecord.parent?.name || 'Danh mục gốc (Cấp 1)'}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Số lượng thuốc tham chiếu</span>
              <span className="font-semibold">{detailRecord._count?.medicines ?? 0} thuốc</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Mô tả</span>
              <p className="text-slate-700 mt-1">
                {detailRecord.description || 'Không có mô tả.'}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
              <div>
                Tạo lúc: {new Date(detailRecord.createdAt).toLocaleString('vi-VN')}
              </div>
              <div>
                Cập nhật gần nhất: {new Date(detailRecord.updatedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

