'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Tag,
  Table,
  Modal,
  Space,
  Popconfirm,
  Alert,
  Spin,
  App,
} from 'antd';
import { formatFileSize, formatVND, slugify } from '@/lib/utils';

interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface DynamicAttribute {
  id: string;
  name: string;
  code: string;
  dataType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
  unit: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  options: Array<{ id: string; value: string; label: string }>;
}

interface ImageRecord {
  id: string;
  medicineId: string;
  medicineVariantId: string | null;
  bucketName: string;
  objectKey: string;
  displayUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isPrimary: boolean;
  sortOrder: number;
}

interface VariantRecord {
  id: string;
  sku: string;
  name: string;
  price: string | number;
  numericPrice: number;
  status: 'ACTIVE' | 'INACTIVE';
  images: ImageRecord[];
  attributeValues: Array<{
    id: string;
    variantAttributeId: string;
    variantAttributeOptionId: string | null;
    textValue: string | null;
    numberValue: string | number | null;
    booleanValue: boolean | null;
    attribute: DynamicAttribute;
    option?: { id: string; label: string; value: string } | null;
  }>;
}

interface MedicineDetailData {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  activeIngredient: string;
  manufacturer: string;
  registrationNumber: string | null;
  description: string | null;
  usageInformation: string | null;
  storageInformation: string | null;
  isPrescriptionRequired: boolean | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  publishedAt: string | null;
  images: ImageRecord[];
  variants: VariantRecord[];
}

export default function AdminMedicineEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: medicineId } = use(params);
  const { message } = App.useApp();

  const [infoForm] = Form.useForm();
  const [variantForm] = Form.useForm();

  const [medicine, setMedicine] = useState<MedicineDetailData | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [attributes, setAttributes] = useState<DynamicAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);

  // Variant Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantRecord | null>(null);
  const [savingVariant, setSavingVariant] = useState(false);

  // Image Upload Preview & State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadVariantId, setUploadVariantId] = useState<string>('');
  const [uploadAsPrimary, setUploadAsPrimary] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [medRes, catRes, attrRes] = await Promise.all([
        fetch(`/api/v1/medicines/${medicineId}?includeUnpublished=true`),
        fetch('/api/v1/categories?includeInactive=true'),
        fetch('/api/v1/attributes?includeInactive=false'),
      ]);

      const [medJson, catJson, attrJson] = await Promise.all([
        medRes.json(),
        catRes.json(),
        attrRes.json(),
      ]);

      if (!medRes.ok || !medJson.success) {
        throw new Error(medJson.error?.message || 'Không tìm thấy hồ sơ thuốc.');
      }

      const medData: MedicineDetailData = medJson.data;
      setMedicine(medData);
      if (catJson.success) setCategories(catJson.data || []);
      if (attrJson.success) setAttributes(attrJson.data || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tải dữ liệu thuốc.');
    } finally {
      setLoading(false);
    }
  }, [medicineId, message]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (medicine && !loading) {
      infoForm.setFieldsValue({
        name: medicine.name,
        slug: medicine.slug,
        categoryId: medicine.categoryId,
        activeIngredient: medicine.activeIngredient,
        manufacturer: medicine.manufacturer,
        registrationNumber: medicine.registrationNumber || '',
        isPrescriptionRequired:
          medicine.isPrescriptionRequired === true
            ? 'RX'
            : medicine.isPrescriptionRequired === false
              ? 'OTC'
              : 'NON_DRUG',
        isFeatured: medicine.isFeatured,
        description: medicine.description || '',
        usageInformation: medicine.usageInformation || '',
        storageInformation: medicine.storageInformation || '',
      });
    }
  }, [medicine, loading, infoForm]);

  // Cleanup blob preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  // ---------------------------------------------------------------------------
  // LƯU THÔNG TIN HỒ SƠ THUỐC (NHÓM 1, 2, 3, 4, 7)
  // ---------------------------------------------------------------------------
  const handleSaveMedicineInfo = async (values: Record<string, unknown>) => {
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/v1/medicines/${medicineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể lưu thông tin thuốc.');
      }
      message.success('Đã lưu thông tin hồ sơ thuốc thành công!');
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi lưu thông tin.');
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePublishStatus = async (action: 'publish' | 'unpublish') => {
    try {
      const res = await fetch(`/api/v1/medicines/${medicineId}/${action}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể thay đổi trạng thái xuất bản.');
      }
      message.success(
        action === 'publish'
          ? 'Đã xuất bản thuốc lên website công khai!'
          : 'Đã ngừng hiển thị thuốc khỏi website công khai.'
      );
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái.');
    }
  };

  // ---------------------------------------------------------------------------
  // QUẢN LÝ BIẾN THỂ & THUỘC TÍNH ĐỘNG (NHÓM 6)
  // ---------------------------------------------------------------------------
  const openCreateVariantModal = () => {
    setEditingVariant(null);
    variantForm.resetFields();
    variantForm.setFieldsValue({
      status: 'ACTIVE',
      price: 50000,
    });
    setVariantModalOpen(true);
  };

  const openEditVariantModal = (variant: VariantRecord) => {
    setEditingVariant(variant);
    const dynamicValues: Record<string, unknown> = {};
    for (const av of variant.attributeValues) {
      const fieldKey = `attr_${av.variantAttributeId}`;
      if (av.attribute.dataType === 'SELECT') {
        dynamicValues[fieldKey] = av.variantAttributeOptionId;
      } else if (av.attribute.dataType === 'NUMBER') {
        dynamicValues[fieldKey] =
          av.numberValue !== null ? Number(av.numberValue) : undefined;
      } else if (av.attribute.dataType === 'BOOLEAN') {
        dynamicValues[fieldKey] = av.booleanValue ?? false;
      } else {
        dynamicValues[fieldKey] = av.textValue || '';
      }
    }

    const primaryImg = variant.images?.find((i) => i.isPrimary);

    variantForm.setFieldsValue({
      sku: variant.sku,
      name: variant.name,
      price: Number(variant.price),
      status: variant.status,
      primaryImageId: primaryImg?.id || null,
      ...dynamicValues,
    });
    setVariantModalOpen(true);
  };

  const handleSaveVariant = async (values: Record<string, unknown>) => {
    setSavingVariant(true);
    try {
      const attributeValues = [];
      for (const attr of attributes) {
        const rawVal = values[`attr_${attr.id}`];
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;

        if (attr.dataType === 'SELECT') {
          attributeValues.push({
            variantAttributeId: attr.id,
            variantAttributeOptionId: String(rawVal),
          });
        } else if (attr.dataType === 'NUMBER') {
          attributeValues.push({
            variantAttributeId: attr.id,
            numberValue: Number(rawVal),
          });
        } else if (attr.dataType === 'BOOLEAN') {
          attributeValues.push({
            variantAttributeId: attr.id,
            booleanValue: Boolean(rawVal),
          });
        } else {
          attributeValues.push({
            variantAttributeId: attr.id,
            textValue: String(rawVal),
          });
        }
      }

      const payload = {
        sku: String(values.sku),
        name: String(values.name),
        price: Number(values.price),
        status: values.status,
        primaryImageId: values.primaryImageId || null,
        attributeValues,
      };

      const url = editingVariant
        ? `/api/v1/variants/${editingVariant.id}`
        : `/api/v1/medicines/${medicineId}/variants`;
      const method = editingVariant ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể lưu biến thể thuốc.');
      }

      message.success(
        editingVariant
          ? 'Đã cập nhật biến thể và giá tham khảo thành công!'
          : 'Đã tạo biến thể thuốc mới thành công!'
      );
      setVariantModalOpen(false);
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi lưu biến thể.');
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const res = await fetch(`/api/v1/variants/${variantId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa biến thể.');
      }
      message.success('Đã xóa mềm biến thể thành công.');
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xóa biến thể.');
    }
  };

  // ---------------------------------------------------------------------------
  // QUẢN LÝ HÌNH ẢNH NEON OBJECT STORAGE (NHÓM 5 - 6.7 & PHẦN 7)
  // ---------------------------------------------------------------------------
  const handleFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        message.error(`Tệp "${f.name}" không đúng định dạng JPEG, PNG hoặc WebP.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        message.error(`Tệp "${f.name}" vượt quá giới hạn 5 MB.`);
        continue;
      }
      validFiles.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }

    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setSelectedFiles(validFiles);
    setPreviewUrls(newPreviews);
  };

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) {
      message.warning('Vui lòng chọn ít nhất một tệp ảnh để tải lên.');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('medicineId', medicineId);
      if (uploadVariantId) {
        formData.append('medicineVariantId', uploadVariantId);
      }
      if (uploadAsPrimary) {
        formData.append('isPrimary', 'true');
      }
      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      const res = await fetch(`/api/v1/medicines/${medicineId}/images`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ||
            'Không thể tải ảnh lên Neon Object Storage. Vui lòng kiểm tra cấu hình S3.'
        );
      }

      message.success(
        `Đã tải lên ${selectedFiles.length} hình ảnh lên Neon Object Storage thành công!`
      );
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setSelectedFiles([]);
      setPreviewUrls([]);
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi tải ảnh lên S3.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSetPrimaryImage = async (img: ImageRecord) => {
    try {
      const res = await fetch(`/api/v1/images/${img.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể đặt làm ảnh đại diện.');
      }
      message.success('Đã đặt làm ảnh đại diện chính!');
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi cập nhật ảnh đại diện.');
    }
  };

  const handleUpdateImageSortOrder = async (img: ImageRecord, nextOrder: number) => {
    try {
      const res = await fetch(`/api/v1/images/${img.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: nextOrder }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể cập nhật thứ tự ảnh.');
      }
      message.success('Đã cập nhật thứ tự sắp xếp ảnh.');
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi sắp xếp ảnh.');
    }
  };

  const handleReplaceImage = async (imageId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/v1/images/${imageId}`, {
        method: 'PATCH',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể thay thế tệp ảnh.');
      }
      message.success('Đã thay thế hình ảnh trên Neon Object Storage thành công!');
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi thay thế ảnh.');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/v1/images/${imageId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Không thể xóa ảnh.');
      }
      message.success('Đã xóa hình ảnh khỏi Neon Object Storage & Database.');
      fetchAllData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi xóa ảnh.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Spin size="large" tip="Đang tải hồ sơ thuốc..." />
      </div>
    );
  }

  if (!medicine) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tìm thấy hồ sơ thuốc"
        action={
          <Link href="/admin/medicines">
            <Button size="small">Quay lại danh sách</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/medicines"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-pharma-600"
            >
              <ArrowLeftOutlined />
              <span>Danh sách thuốc</span>
            </Link>
            <span>•</span>
            {medicine.status === 'PUBLISHED' ? (
              <Tag color="success">ĐÃ XUẤT BẢN</Tag>
            ) : medicine.status === 'DRAFT' ? (
              <Tag color="warning">BẢN NHÁP</Tag>
            ) : (
              <Tag color="default">NGỪNG HIỂN THỊ</Tag>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {medicine.name}
          </h1>
          <p className="text-xs text-slate-500">
            Hoạt chất: <strong>{medicine.activeIngredient}</strong> • NSX:{' '}
            <strong>{medicine.manufacturer}</strong>
          </p>
        </div>

        <Space wrap>
          {medicine.status === 'PUBLISHED' && (
            <Link href={`/medicines/${medicine.slug}`} target="_blank">
              <Button icon={<EyeOutlined />}>Xem trang công khai</Button>
            </Link>
          )}

          {medicine.status !== 'PUBLISHED' ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handlePublishStatus('publish')}
            >
              Xuất bản thuốc (Publish)
            </Button>
          ) : (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => handlePublishStatus('unpublish')}
            >
              Ngừng hiển thị (Unpublish)
            </Button>
          )}
        </Space>
      </div>

      {/* 7 Nhóm Thông tin Quản trị Thuốc chia thành các Tab rõ ràng (6.4) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: '1-4 & 7. Thông tin thuốc, Phân loại & Mô tả chuyên ngành',
              children: (
                <Form
                  form={infoForm}
                  layout="vertical"
                  onFinish={handleSaveMedicineInfo}
                  className="space-y-6 pt-2"
                >
                  {/* NHÓM 1 & 2: THÔNG TIN CƠ BẢN & PHÂN LOẠI */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Nhóm 1 &amp; 2: Thông tin cơ bản &amp; Phân loại danh mục
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Form.Item
                        label="Tên thuốc thương mại"
                        name="name"
                        rules={[{ required: true, message: 'Nhập tên thuốc.' }]}
                      >
                        <Input
                          onChange={(e) =>
                            infoForm.setFieldValue('slug', slugify(e.target.value))
                          }
                        />
                      </Form.Item>

                      <Form.Item
                        label="Slug URL chuẩn SEO"
                        name="slug"
                        rules={[{ required: true, message: 'Nhập slug.' }]}
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item
                        label="Danh mục phân loại"
                        name="categoryId"
                        rules={[{ required: true, message: 'Chọn danh mục.' }]}
                      >
                        <Select
                          options={categories.map((c) => ({
                            label: c.parentId ? `↳ ${c.name}` : c.name,
                            value: c.id,
                          }))}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* NHÓM 3: THÔNG TIN CHUYÊN NGÀNH */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Nhóm 3: Thông tin chuyên ngành Dược phẩm
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Form.Item
                        label="Hoạt chất & Hàm lượng"
                        name="activeIngredient"
                        rules={[{ required: true, message: 'Nhập hoạt chất.' }]}
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item
                        label="Nhà sản xuất"
                        name="manufacturer"
                        rules={[{ required: true, message: 'Nhập nhà sản xuất.' }]}
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item
                        label="Số đăng ký lưu hành (Bộ Y tế)"
                        name="registrationNumber"
                      >
                        <Input placeholder="VD-xxxxx-xx" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* NHÓM 4: MÔ TẢ & HƯỚNG DẪN SỬ DỤNG / BẢO QUẢN */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Nhóm 4: Mô tả thuốc, Hướng dẫn sử dụng &amp; Bảo quản (Bắt buộc khi xuất bản)
                    </h3>
                    <Form.Item
                      label="Mô tả thông tin chế phẩm"
                      name="description"
                      rules={[
                        {
                          required: true,
                          message: 'Vui lòng nhập mô tả thuốc đã được xác minh.',
                        },
                      ]}
                    >
                      <Input.TextArea rows={4} />
                    </Form.Item>

                    <Form.Item
                      label="Thông tin hướng dẫn sử dụng (Theo tài liệu của Nhà sản xuất)"
                      name="usageInformation"
                      rules={[
                        {
                          required: true,
                          message: 'Vui lòng nhập thông tin hướng dẫn sử dụng.',
                        },
                      ]}
                    >
                      <Input.TextArea rows={4} />
                    </Form.Item>

                    <Form.Item
                      label="Điều kiện bảo quản"
                      name="storageInformation"
                      rules={[
                        {
                          required: true,
                          message: 'Vui lòng nhập thông tin điều kiện bảo quản.',
                        },
                      ]}
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </div>

                  {/* NHÓM 7: TRẠNG THÁI XUẤT BẢN & HIỂN THỊ */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Nhóm 7: Phân loại Kê đơn &amp; Cấu hình Hiển thị Nổi bật
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Form.Item
                        label="Thuốc kê đơn (Rx) / Phân loại sản phẩm"
                        name="isPrescriptionRequired"
                        rules={[{ required: true, message: 'Vui lòng chọn phân loại sản phẩm.' }]}
                      >
                        <Select
                          placeholder="Chọn phân loại"
                          options={[
                            { label: 'Thuốc không kê đơn (OTC)', value: 'OTC' },
                            { label: 'Thuốc kê đơn (Rx)', value: 'RX' },
                            { label: 'Sản phẩm này không phải là thuốc', value: 'NON_DRUG' },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item
                        label="Hiển thị đề xuất nổi bật trên Trang chủ"
                        name="isFeatured"
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="Nổi bật" unCheckedChildren="Thường" />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      icon={<SaveOutlined />}
                      loading={savingInfo}
                    >
                      Lưu cập nhật hồ sơ thuốc
                    </Button>
                  </div>
                </Form>
              ),
            },
            {
              key: 'variants',
              label: `6. Quản lý Biến thể & Thuộc tính động (${medicine.variants.length})`,
              children: (
                <div className="space-y-6 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Danh sách Biến thể (MedicineVariants)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Mỗi biến thể có mã SKU duy nhất, giá tham khảo Decimal(18,2), ảnh đại diện riêng và tập giá trị thuộc tính động.
                      </p>
                    </div>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateVariantModal}
                    >
                      Thêm biến thể SKU mới
                    </Button>
                  </div>

                  <Table
                    rowKey="id"
                    dataSource={medicine.variants}
                    pagination={false}
                    columns={[
                      {
                        title: 'Mã SKU',
                        dataIndex: 'sku',
                        key: 'sku',
                        render: (sku: string) => (
                          <span className="font-mono font-bold text-slate-800">{sku}</span>
                        ),
                      },
                      {
                        title: 'Tên quy cách biến thể',
                        dataIndex: 'name',
                        key: 'name',
                        render: (name: string) => (
                          <span className="font-semibold text-slate-900">{name}</span>
                        ),
                      },
                      {
                        title: 'Giá tham khảo',
                        key: 'price',
                        render: (_: unknown, r: VariantRecord) => (
                          <span className="font-bold text-pharma-700">
                            {formatVND(Number(r.price))}
                          </span>
                        ),
                      },
                      {
                        title: 'Thuộc tính động đã gán',
                        key: 'attrs',
                        render: (_: unknown, r: VariantRecord) => (
                          <div className="flex flex-wrap gap-1">
                            {r.attributeValues.map((av) => {
                              const valText =
                                av.option?.label ||
                                av.textValue ||
                                (av.numberValue !== null ? String(av.numberValue) : null) ||
                                (av.booleanValue !== null
                                  ? av.booleanValue
                                    ? 'Có'
                                    : 'Không'
                                  : '');
                              return (
                                <Tag key={av.id} color="blue">
                                  {av.attribute.name}: {valText}
                                </Tag>
                              );
                            })}
                          </div>
                        ),
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st: VariantRecord['status']) =>
                          st === 'ACTIVE' ? (
                            <Tag color="green">Đang hoạt động</Tag>
                          ) : (
                            <Tag>Ngừng hoạt động</Tag>
                          ),
                      },
                      {
                        title: 'Thao tác',
                        key: 'actions',
                        align: 'right',
                        render: (_: unknown, r: VariantRecord) => (
                          <Space size="small">
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<EditOutlined />}
                              onClick={() => openEditVariantModal(r)}
                            >
                              Sửa / Đổi giá
                            </Button>
                            <Popconfirm
                              title="Xóa mềm biến thể này?"
                              onConfirm={() => handleDeleteVariant(r.id)}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'images',
              label: `5. Quản lý Hình ảnh Neon Object Storage (${medicine.images.length})`,
              children: (
                <div className="space-y-6 pt-2">
                  {/* Upload Box */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Tải ảnh mới lên Neon Object Storage (S3-Compatible)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Hỗ trợ upload nhiều ảnh cùng lúc • Định dạng JPEG, PNG, WebP (Kiểm tra Magic Bytes thực tế) • Tối đa 5 MB/ảnh.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Chọn tệp hình ảnh (Có thể chọn nhiều ảnh)
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleFileSelectChange}
                          className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-pharma-600 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-pharma-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Gán riêng cho biến thể (Tùy chọn)
                        </label>
                        <Select
                          className="w-full"
                          allowClear
                          placeholder="-- Ảnh chung của thuốc --"
                          value={uploadVariantId || undefined}
                          onChange={(val) => setUploadVariantId(val || '')}
                          options={medicine.variants.map((v) => ({
                            label: `${v.sku} – ${v.name}`,
                            value: v.id,
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <Switch
                            size="small"
                            checked={uploadAsPrimary}
                            onChange={setUploadAsPrimary}
                          />
                          <span>Đặt làm ảnh đại diện</span>
                        </label>

                        <Button
                          type="primary"
                          icon={<UploadOutlined />}
                          loading={uploadingImage}
                          disabled={selectedFiles.length === 0}
                          onClick={handleUploadImages}
                        >
                          Upload lên S3 ({selectedFiles.length})
                        </Button>
                      </div>
                    </div>

                    {/* Preview Before Upload (6.7) */}
                    {selectedFiles.length > 0 && (
                      <div className="pt-3 border-t border-slate-200">
                        <span className="block text-xs font-semibold text-slate-600 mb-2">
                          Xem trước (Preview) trước khi tải lên:
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {selectedFiles.map((file, idx) => (
                            <div
                              key={`${file.name}-${idx}`}
                              className="w-28 rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm"
                            >
                              <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-100 mb-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previewUrls[idx]}
                                  alt={file.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="truncate text-[11px] font-medium text-slate-700">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current Images Gallery */}
                  {medicine.images.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {medicine.images.map((img) => {
                        const linkedVariant = medicine.variants.find(
                          (v) => v.id === img.medicineVariantId
                        );

                        return (
                          <div
                            key={img.id}
                            className={`flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-sm ${
                              img.isPrimary
                                ? 'border-pharma-500 ring-2 ring-pharma-100'
                                : 'border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 mb-3 flex items-center justify-center">
                                {img.displayUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={img.displayUrl}
                                    alt={img.fileName}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    {img.objectKey}
                                  </span>
                                )}
                                {img.isPrimary && (
                                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-pharma-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                                    <StarFilled /> Ảnh đại diện
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-slate-800 truncate">
                                  {img.fileName}
                                </div>
                                <div className="text-slate-500 flex items-center justify-between">
                                  <span>{img.mimeType}</span>
                                  <span className="font-semibold">
                                    {formatFileSize(img.fileSize)}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 truncate" title={img.objectKey}>
                                  Key: {img.objectKey}
                                </div>
                                {linkedVariant && (
                                  <Tag color="purple" className="mt-1">
                                    Biến thể: {linkedVariant.sku}
                                  </Tag>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500">Thứ tự:</span>
                                <InputNumber
                                  size="small"
                                  min={0}
                                  value={img.sortOrder}
                                  onChange={(val) => {
                                    if (typeof val === 'number') {
                                      handleUpdateImageSortOrder(img, val);
                                    }
                                  }}
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                                {!img.isPrimary && (
                                  <Button
                                    size="small"
                                    icon={<StarOutlined />}
                                    onClick={() => handleSetPrimaryImage(img)}
                                  >
                                    Đặt đại diện
                                  </Button>
                                )}

                                {/* Replace image button */}
                                <label className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                  <SwapOutlined />
                                  <span>Thay thế</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleReplaceImage(img.id, f);
                                    }}
                                  />
                                </label>

                                <Popconfirm
                                  title="Xóa ảnh khỏi Neon Object Storage & Database?"
                                  onConfirm={() => handleDeleteImage(img.id)}
                                >
                                  <Button size="small" danger icon={<DeleteOutlined />}>
                                    Xóa
                                  </Button>
                                </Popconfirm>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-400">
                      Thuốc này chưa có hình ảnh nào trên Neon Object Storage.
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Modal Tạo / Chỉnh sửa Biến thể & Gán Thuộc tính động */}
      <Modal
        title={
          editingVariant
            ? `Chỉnh sửa Biến thể (${editingVariant.sku})`
            : 'Thêm Biến thể Thuốc mới'
        }
        open={variantModalOpen}
        onCancel={() => setVariantModalOpen(false)}
        footer={null}
        width={640}
        forceRender
      >
        <Form
          form={variantForm}
          layout="vertical"
          onFinish={handleSaveVariant}
          className="mt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label="Mã định danh SKU (Duy nhất)"
              name="sku"
              rules={[
                { required: true, message: 'Vui lòng nhập mã SKU.' },
                {
                  pattern: /^[A-Za-z0-9_-]+$/,
                  message: 'SKU chỉ gồm chữ cái, số, gạch ngang (-) và gạch dưới (_).',
                },
              ]}
            >
              <Input placeholder="Ví dụ: DHG-HAP650-H100" />
            </Form.Item>

            <Form.Item
              label="Giá tham khảo (VNĐ - Decimal 18,2)"
              name="price"
              rules={[{ required: true, message: 'Vui lòng nhập giá tham khảo.' }]}
            >
              <InputNumber
                min={0}
                step={1000}
                className="w-full"
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Tên hiển thị của Biến thể / Quy cách"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên biến thể.' }]}
          >
            <Input placeholder="Ví dụ: Hapacol 650 - Hộp 10 vỉ x 10 viên nén bao phim" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item label="Trạng thái biến thể" name="status">
              <Select
                options={[
                  { label: 'Đang hoạt động (ACTIVE)', value: 'ACTIVE' },
                  { label: 'Ngừng hoạt động (INACTIVE)', value: 'INACTIVE' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Chọn ảnh đại diện riêng cho biến thể (Tùy chọn)"
              name="primaryImageId"
            >
              <Select
                allowClear
                placeholder="-- Dùng ảnh chung của thuốc --"
                options={medicine.images.map((img) => ({
                  label: `${img.fileName} (${img.isPrimary ? 'Đại diện' : 'Phụ'})`,
                  value: img.id,
                }))}
              />
            </Form.Item>
          </div>

          {/* DYNAMIC ATTRIBUTES FORM SECTION (6.5 & 6.6: Không hardcode danh sách thuộc tính) */}
          {attributes.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 mt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Gán giá trị Thuộc tính Động cho Biến thể
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributes.map((attr) => {
                  const fieldName = `attr_${attr.id}`;
                  const labelText = `${attr.name}${attr.unit ? ` (${attr.unit})` : ''}`;

                  if (attr.dataType === 'SELECT') {
                    return (
                      <Form.Item
                        key={attr.id}
                        label={labelText}
                        name={fieldName}
                        rules={
                          attr.isRequired
                            ? [{ required: true, message: `Chọn ${attr.name}` }]
                            : []
                        }
                        className="mb-1"
                      >
                        <Select
                          allowClear
                          placeholder={`-- Chọn ${attr.name} --`}
                          options={attr.options.map((o) => ({
                            label: o.label,
                            value: o.id,
                          }))}
                        />
                      </Form.Item>
                    );
                  }

                  if (attr.dataType === 'NUMBER') {
                    return (
                      <Form.Item
                        key={attr.id}
                        label={labelText}
                        name={fieldName}
                        rules={
                          attr.isRequired
                            ? [{ required: true, message: `Nhập ${attr.name}` }]
                            : []
                        }
                        className="mb-1"
                      >
                        <InputNumber className="w-full" />
                      </Form.Item>
                    );
                  }

                  if (attr.dataType === 'BOOLEAN') {
                    return (
                      <Form.Item
                        key={attr.id}
                        label={labelText}
                        name={fieldName}
                        valuePropName="checked"
                        className="mb-1"
                      >
                        <Switch checkedChildren="Có" unCheckedChildren="Không" />
                      </Form.Item>
                    );
                  }

                  return (
                    <Form.Item
                      key={attr.id}
                      label={labelText}
                      name={fieldName}
                      rules={
                        attr.isRequired
                          ? [{ required: true, message: `Nhập ${attr.name}` }]
                          : []
                      }
                      className="mb-1"
                    >
                      <Input placeholder={`Nhập ${attr.name.toLowerCase()}...`} />
                    </Form.Item>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
            <Button onClick={() => setVariantModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={savingVariant}>
              {editingVariant ? 'Lưu cập nhật biến thể' : 'Tạo biến thể'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

