'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Tabs,
  Tag,
  Space,
  Input,
  Popconfirm,
  Badge,
  Empty,
  Tooltip,
  App as AntdApp,
} from 'antd';
import {
  RestOutlined,
  ReloadOutlined,
  UndoOutlined,
  DeleteOutlined,
  SearchOutlined,
  MedicineBoxOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface TrashMedicine {
  id: string;
  name: string;
  slug: string;
  activeIngredient: string;
  manufacturer: string;
  registrationNumber: string | null;
  deletedAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants?: Array<{
    id: string;
    sku: string;
    name: string;
  }>;
  images?: Array<{
    id: string;
    fileName: string;
    isPrimary: boolean;
  }>;
}

interface TrashCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  deletedAt: string;
  parent?: {
    id: string;
    name: string;
  } | null;
}

export default function AdminTrashPage() {
  const { message } = AntdApp.useApp();

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [emptyLoading, setEmptyLoading] = useState(false);

  const [medicines, setMedicines] = useState<TrashMedicine[]>([]);
  const [categories, setCategories] = useState<TrashCategory[]>([]);
  const [search, setSearch] = useState('');

  const fetchTrashData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/trash');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể tải dữ liệu thùng rác.');
      }
      setMedicines(json.data.medicines || []);
      setCategories(json.data.categories || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tải thùng rác.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchTrashData();
  }, [fetchTrashData]);

  // 1. Khôi phục bản ghi
  const handleRestore = async (type: 'medicine' | 'category', id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch('/api/v1/admin/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể khôi phục bản ghi.');
      }
      message.success(`Đã khôi phục "${name}" thành công!`);
      fetchTrashData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi khôi phục.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Xóa vĩnh viễn (Hard Delete)
  const handleHardDelete = async (type: 'medicine' | 'category', id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch('/api/v1/admin/trash/hard-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa vĩnh viễn bản ghi.');
      }
      message.success(`Đã xóa vĩnh viễn "${name}" khỏi cơ sở dữ liệu!`);
      fetchTrashData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xóa vĩnh viễn.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Dọn sạch toàn bộ thùng rác
  const handleEmptyTrash = async (target: 'all' | 'medicine' | 'category' = 'all') => {
    setEmptyLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/trash?target=${target}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể dọn sạch thùng rác.');
      }
      message.success(
        `Đã dọn sạch thùng rác: Đã xóa ${json.data.deletedMedicines} thuốc và ${json.data.deletedCategories} danh mục vĩnh viễn!`
      );
      fetchTrashData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi dọn thùng rác.');
    } finally {
      setEmptyLoading(false);
    }
  };

  // Lọc dữ liệu tìm kiếm
  const filteredMedicines = medicines.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.activeIngredient.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q) ||
      (m.category?.name && m.category.name.toLowerCase().includes(q))
    );
  });

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.parent?.name && c.parent.name.toLowerCase().includes(q))
    );
  });

  const medicineColumns = [
    {
      title: 'Tên thuốc & Nhà sản xuất',
      key: 'name',
      render: (_: unknown, record: TrashMedicine) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">{record.name}</div>
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">NSX:</span> {record.manufacturer}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {record.slug}
          </div>
        </div>
      ),
    },
    {
      title: 'Hoạt chất chính',
      dataIndex: 'activeIngredient',
      key: 'activeIngredient',
      render: (val: string) => (
        <span className="font-medium text-slate-700">{val}</span>
      ),
    },
    {
      title: 'Danh mục',
      key: 'category',
      render: (_: unknown, record: TrashMedicine) => (
        <Tag color="cyan">{record.category?.name || 'Chưa phân danh mục'}</Tag>
      ),
    },
    {
      title: 'Dữ liệu kèm theo',
      key: 'meta',
      width: 170,
      render: (_: unknown, record: TrashMedicine) => (
        <div className="text-xs space-y-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <BarcodeOutlined className="text-slate-400" />
            <span>{record.variants?.length || 0} biến thể SKU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PictureOutlined className="text-slate-400" />
            <span>{record.images?.length || 0} tệp ảnh (S3)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Thời gian xóa',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 160,
      render: (val: string) => (
        <span className="text-xs font-medium text-rose-600">
          {dayjs(val).format('DD/MM/YYYY HH:mm')}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 190,
      render: (_: unknown, record: TrashMedicine) => (
        <Space size="small">
          <Button
            size="small"
            icon={<UndoOutlined />}
            loading={actionLoadingId === record.id}
            onClick={() => handleRestore('medicine', record.id, record.name)}
            className="text-emerald-600 hover:!text-emerald-700 hover:!border-emerald-600"
          >
          </Button>

          <Popconfirm
            title="Xóa vĩnh viễn thuốc này?"
            description={
              <div className="max-w-xs text-xs space-y-1">
                <p className="font-semibold text-rose-600">Hành động này KHÔNG THỂ hoàn tác!</p>
                <p>Toàn bộ thông tin thuốc, biến thể, giá và tệp hình ảnh trên Neon Object Storage sẽ bị xóa sạch.</p>
              </div>
            }
            okText="Xóa vĩnh viễn"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleHardDelete('medicine', record.id, record.name)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoadingId === record.id}
            >
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const categoryColumns = [
    {
      title: 'Tên danh mục & Đường dẫn',
      key: 'name',
      render: (_: unknown, record: TrashCategory) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{record.name}</div>
          <div className="text-xs text-slate-400 font-mono">
            {record.slug}
          </div>
        </div>
      ),
    },
    {
      title: 'Danh mục cha trực thuộc',
      key: 'parent',
      render: (_: unknown, record: TrashCategory) =>
        record.parent ? (
          <Tag color="blue">{record.parent.name}</Tag>
        ) : (
          <span className="text-xs text-slate-400">Danh mục gốc (Parent)</span>
        ),
    },
    {
      title: 'Thời gian xóa',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 170,
      render: (val: string) => (
        <div className="text-xs">
          <div className="font-medium text-rose-600">
            {dayjs(val).format('DD/MM/YYYY HH:mm')}
          </div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 190,
      render: (_: unknown, record: TrashCategory) => (
        <Space size="small">
          <Button
            size="small"
            icon={<UndoOutlined />}
            loading={actionLoadingId === record.id}
            onClick={() => handleRestore('category', record.id, record.name)}
            className="text-emerald-600 hover:!text-emerald-700 hover:!border-emerald-600"
          >
          </Button>

          <Popconfirm
            title="Xóa vĩnh viễn danh mục này?"
            description="Hành động này không thể hoàn tác. Danh mục sẽ bị xóa vĩnh viễn khỏi Database."
            okText="Xóa vĩnh viễn"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleHardDelete('category', record.id, record.name)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoadingId === record.id}
            >
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalTrashCount = medicines.length + categories.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">


        <div className="flex items-center gap-2">
          {totalTrashCount > 0 && (
            <Popconfirm
              title="Dọn sạch toàn bộ thùng rác?"
              description={
                <div className="max-w-xs text-xs space-y-1">
                  <p className="font-semibold text-rose-600">CẢNH BÁO NGUY HIỂM TỐI CAO:</p>
                  <p>Hành động này sẽ xóa vĩnh viễn tất cả {medicines.length} thuốc và {categories.length} danh mục trong thùng rác cùng toàn bộ tệp ảnh trên Neon Object Storage.</p>
                  <p className="italic">Dữ liệu sau khi xóa sẽ không thể khôi phục lại được.</p>
                </div>
              }
              okText="Đồng ý xóa sạch"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleEmptyTrash('all')}
            >
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                loading={emptyLoading}
              >
                Dọn sạch thùng rác ({totalTrashCount})
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Tìm kiếm nhanh trong thùng rác theo tên, hoạt chất, NSX..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          allowClear
        />

        <div className="text-xs text-slate-500">
          Tổng số mục trong thùng rác: <span className="font-bold text-rose-600">{totalTrashCount}</span> mục
        </div>
      </div>

      {/* Tabs Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Tabs
          defaultActiveKey="medicines"
          items={[
            {
              key: 'medicines',
              label: (
                <span className="flex items-center gap-2">
                  <MedicineBoxOutlined />
                  Thuốc đã xóa mềm
                  <Badge
                    count={medicines.length}
                    overflowCount={999}
                    className="ml-1"
                    color={medicines.length > 0 ? '#ef4444' : '#94a3b8'}
                  />
                </span>
              ),
              children: (
                <div className="pt-2">
                  <Table
                    rowKey="id"
                    columns={medicineColumns}
                    dataSource={filteredMedicines}
                    loading={loading}
                    scroll={{ x: 980 }}
                    pagination={{
                      pageSize: 10,
                      showTotal: (total) => `Tổng cộng ${total} thuốc đã xóa`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Thùng rác thuốc trống. Không có hồ sơ thuốc nào bị xóa mềm."
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'categories',
              label: (
                <span className="flex items-center gap-2">
                  <AppstoreOutlined />
                  Danh mục đã xóa mềm
                  <Badge
                    count={categories.length}
                    overflowCount={999}
                    className="ml-1"
                    color={categories.length > 0 ? '#ef4444' : '#94a3b8'}
                  />
                </span>
              ),
              children: (
                <div className="pt-2">
                  <Table
                    rowKey="id"
                    columns={categoryColumns}
                    dataSource={filteredCategories}
                    loading={loading}
                    scroll={{ x: 800 }}
                    pagination={{
                      pageSize: 10,
                      showTotal: (total) => `Tổng cộng ${total} danh mục đã xóa`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Thùng rác danh mục trống. Không có danh mục nào bị xóa mềm."
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

