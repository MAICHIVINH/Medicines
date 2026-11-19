'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  ReloadOutlined,
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

interface AttributeOptionRecord {
  id: string;
  variantAttributeId: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

interface AttributeRecord {
  id: string;
  name: string;
  code: string;
  dataType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
  unit: string | null;
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  options: AttributeOptionRecord[];
  _count?: { values: number };
}

export default function AdminAttributesPage() {
  const { message } = App.useApp();
  const [attrForm] = Form.useForm();
  const [optionForm] = Form.useForm();

  const [attributes, setAttributes] = useState<AttributeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AttributeRecord | null>(null);

  // Drawer quản lý danh sách tùy chọn cho thuộc tính dạng SELECT
  const [activeOptionAttr, setActiveOptionAttr] = useState<AttributeRecord | null>(null);
  const [optionSubmitting, setOptionSubmitting] = useState(false);

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/attributes?includeInactive=true');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể tải danh sách thuộc tính.');
      }
      const list: AttributeRecord[] = json.data || [];
      setAttributes(list);

      if (activeOptionAttr) {
        const refreshed = list.find((a) => a.id === activeOptionAttr.id);
        if (refreshed) setActiveOptionAttr(refreshed);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tải thuộc tính.');
    } finally {
      setLoading(false);
    }
  }, [message, activeOptionAttr]);

  useEffect(() => {
    fetchAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setEditingAttr(null);
    attrForm.resetFields();
    attrForm.setFieldsValue({
      dataType: 'TEXT',
      isFilterable: true,
      isRequired: false,
      sortOrder: 0,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (record: AttributeRecord) => {
    setEditingAttr(record);
    attrForm.setFieldsValue({
      name: record.name,
      code: record.code,
      dataType: record.dataType,
      unit: record.unit || '',
      isFilterable: record.isFilterable,
      isRequired: record.isRequired,
      sortOrder: record.sortOrder,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveAttribute = async (values: {
    name: string;
    code: string;
    dataType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
    unit?: string;
    isFilterable: boolean;
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
  }) => {
    setSubmitting(true);
    try {
      const url = editingAttr
        ? `/api/v1/attributes/${editingAttr.id}`
        : '/api/v1/attributes';
      const method = editingAttr ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          unit: values.unit?.trim() || null,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể lưu thuộc tính.');
      }

      message.success(
        editingAttr
          ? 'Đã cập nhật thuộc tính động thành công!'
          : 'Đã tạo thuộc tính động mới! Thuộc tính đã sẵn sàng trong form Biến thể và Bộ lọc công khai.'
      );
      setModalOpen(false);
      fetchAttributes();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi lưu thuộc tính.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttribute = async (record: AttributeRecord) => {
    try {
      const res = await fetch(`/api/v1/attributes/${record.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa thuộc tính.');
      }

      if (json.data?.mode === 'DEACTIVATED') {
        message.info(
          `Thuộc tính "${record.name}" đang được gán cho biến thể nên đã được chuyển sang trạng thái Ngừng sử dụng.`
        );
      } else {
        message.success(`Đã xóa thuộc tính "${record.name}" thành công.`);
      }
      fetchAttributes();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xóa thuộc tính.');
    }
  };

  const handleCreateOption = async (values: {
    label: string;
    value?: string;
    sortOrder: number;
  }) => {
    if (!activeOptionAttr) return;
    setOptionSubmitting(true);
    try {
      const res = await fetch(`/api/v1/attributes/${activeOptionAttr.id}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: values.label,
          value: values.value || slugify(values.label),
          sortOrder: values.sortOrder ?? 0,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể thêm tùy chọn.');
      }
      message.success('Đã thêm tùy chọn mới!');
      optionForm.resetFields();
      optionForm.setFieldsValue({ sortOrder: 0 });
      fetchAttributes();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi thêm tùy chọn.');
    } finally {
      setOptionSubmitting(false);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      const res = await fetch(`/api/v1/options/${optionId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa tùy chọn.');
      }
      message.success('Đã xử lý xóa/ngừng sử dụng tùy chọn.');
      fetchAttributes();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xóa tùy chọn.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAttributes}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Thêm thuộc tính động
          </Button>
        </Space>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={attributes}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'Tên thuộc tính',
              dataIndex: 'name',
              key: 'name',
              render: (text: string, record: AttributeRecord) => (
                <div>
                  <div className="font-bold text-slate-900">{text}</div>
                  <div className="text-xs font-mono text-slate-400">Mã: {record.code}</div>
                </div>
              ),
            },
            {
              title: 'Kiểu dữ liệu',
              dataIndex: 'dataType',
              key: 'dataType',
              render: (type: AttributeRecord['dataType']) => {
                const colorMap: Record<AttributeRecord['dataType'], string> = {
                  SELECT: 'purple',
                  TEXT: 'blue',
                  NUMBER: 'geekblue',
                  BOOLEAN: 'cyan',
                };
                return <Tag color={colorMap[type]}>{type}</Tag>;
              },
            },
            {
              title: 'Đơn vị',
              dataIndex: 'unit',
              key: 'unit',
              render: (u: string | null) => u || '—',
            },
            {
              title: 'Cấu hình',
              key: 'flags',
              render: (_: unknown, record: AttributeRecord) => (
                <Space size={4} wrap>
                  {record.isRequired && <Tag color="red">Bắt buộc</Tag>}
                  {record.isFilterable && <Tag color="green">Cho phép lọc</Tag>}
                  {!record.isActive && <Tag color="default">Ngừng sử dụng</Tag>}
                </Space>
              ),
            },
            {
              title: 'Tùy chọn (SELECT)',
              key: 'options',
              render: (_: unknown, record: AttributeRecord) =>
                record.dataType === 'SELECT' ? (
                  <Button
                    size="small"
                    icon={<UnorderedListOutlined />}
                    onClick={() => {
                      setActiveOptionAttr(record);
                      optionForm.resetFields();
                      optionForm.setFieldsValue({ sortOrder: 0 });
                    }}
                  >
                    Quản lý ({record.options?.length ?? 0} tùy chọn)
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">Nhập trực tiếp</span>
                ),
            },
            {
              title: 'Thứ tự',
              dataIndex: 'sortOrder',
              key: 'sortOrder',
              align: 'center',
              width: 80,
            },
            {
              title: 'Thao tác',
              key: 'actions',
              align: 'right',
              render: (_: unknown, record: AttributeRecord) => (
                <Space size="small">
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
                    title="Xóa hoặc ngừng sử dụng thuộc tính?"
                    description="Nếu thuộc tính đã có dữ liệu biến thể, hệ thống sẽ chuyển sang Ngừng sử dụng để bảo toàn dữ liệu."
                    okText="Xác nhận"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDeleteAttribute(record)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      {/* Create / Edit Attribute Modal */}
      <Modal
        title={editingAttr ? 'Chỉnh sửa Thuộc tính Động' : 'Tạo Thuộc tính Động mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form
          form={attrForm}
          layout="vertical"
          onFinish={handleSaveAttribute}
          className="mt-4"
        >
          <Form.Item
            label="Tên thuộc tính hiển thị"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên thuộc tính.' }]}
          >
            <Input
              placeholder="Ví dụ: Dạng bào chế, Hàm lượng, Hương vị..."
              onChange={(e) => {
                if (!editingAttr) {
                  attrForm.setFieldValue(
                    'code',
                    slugify(e.target.value).replace(/-/g, '_')
                  );
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Mã định danh (code - chữ thường và dấu gạch dưới)"
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã thuộc tính.' },
              {
                pattern: /^[a-z0-9_]+$/,
                message: 'Chỉ chứa chữ thường (a-z), số (0-9) và gạch dưới (_).',
              },
            ]}
          >
            <Input placeholder="dosage_form, strength, packaging..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Kiểu dữ liệu"
              name="dataType"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'TEXT (Văn bản)', value: 'TEXT' },
                  { label: 'SELECT (Danh sách tùy chọn)', value: 'SELECT' },
                  { label: 'NUMBER (Số lượng / Dung tích)', value: 'NUMBER' },
                  { label: 'BOOLEAN (Có / Không)', value: 'BOOLEAN' },
                ]}
              />
            </Form.Item>

            <Form.Item label="Đơn vị tính (Tùy chọn)" name="unit">
              <Input placeholder="mg, ml, viên, gói..." />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Form.Item
              label="Cho phép lọc công khai"
              name="isFilterable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Bắt buộc nhập"
              name="isRequired"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Kích hoạt"
              name="isActive"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item label="Thứ tự hiển thị" name="sortOrder">
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingAttr ? 'Lưu thay đổi' : 'Tạo thuộc tính'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Options Manager Drawer for SELECT Attributes */}
      <Drawer
        title={
          activeOptionAttr
            ? `Danh sách tùy chọn: ${activeOptionAttr.name} (${activeOptionAttr.code})`
            : 'Quản lý tùy chọn'
        }
        open={Boolean(activeOptionAttr)}
        onClose={() => setActiveOptionAttr(null)}
        width={520}
        forceRender
      >
        <div className={activeOptionAttr ? 'space-y-6' : 'hidden'}>
          <Form
            form={optionForm}
            layout="vertical"
            onFinish={handleCreateOption}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Thêm giá trị tùy chọn mới
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Form.Item
                label="Nhãn hiển thị"
                name="label"
                rules={[{ required: true, message: 'Nhập nhãn tùy chọn.' }]}
                className="mb-2"
              >
                <Input
                  placeholder="Ví dụ: Viên nén bao phim"
                  onChange={(e) =>
                    optionForm.setFieldValue('value', slugify(e.target.value))
                  }
                />
              </Form.Item>
              <Form.Item label="Giá trị (slug)" name="value" className="mb-2">
                <Input placeholder="vien-nen-bao-phim" />
              </Form.Item>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Form.Item label="Thứ tự" name="sortOrder" className="mb-0">
                <InputNumber min={0} />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={optionSubmitting}
              >
                Thêm tùy chọn
              </Button>
            </div>
          </Form>

          <Table
            rowKey="id"
            size="small"
            dataSource={activeOptionAttr?.options || []}
            pagination={false}
            columns={[
              {
                title: 'Nhãn hiển thị',
                dataIndex: 'label',
                key: 'label',
                render: (t: string, r: AttributeOptionRecord) => (
                  <div>
                    <div className="font-semibold text-slate-800">{t}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {r.value}
                    </div>
                  </div>
                ),
              },
              {
                title: 'Thứ tự',
                dataIndex: 'sortOrder',
                key: 'sortOrder',
                width: 70,
                align: 'center',
              },
              {
                title: 'Trạng thái',
                key: 'isActive',
                width: 90,
                render: (_: unknown, r: AttributeOptionRecord) =>
                  r.isActive ? (
                    <Tag color="green">Hoạt động</Tag>
                  ) : (
                    <Tag>Đã ẩn</Tag>
                  ),
              },
              {
                title: 'Xóa',
                key: 'del',
                width: 60,
                align: 'right',
                render: (_: unknown, r: AttributeOptionRecord) => (
                  <Popconfirm
                    title="Xóa tùy chọn này?"
                    onConfirm={() => handleDeleteOption(r.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </div>
      </Drawer>
    </div>
  );
}

