'use client';

import React, { useState, useMemo } from 'react';
import {
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  BarcodeOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { formatVND } from '@/lib/utils';

export interface MedicineImageDto {
  id: string;
  medicineVariantId: string | null;
  displayUrl: string;
  fileName: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface VariantAttributeDisplayDto {
  id: string;
  attribute: {
    id: string;
    name: string;
    code: string;
    dataType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
    unit: string | null;
  };
  option: {
    id: string;
    value: string;
    label: string;
  } | null;
  textValue: string | null;
  numberValue: string | number | null;
  booleanValue: boolean | null;
}

export interface MedicineVariantDetailDto {
  id: string;
  sku: string;
  name: string;
  numericPrice: number;
  images: MedicineImageDto[];
  attributeValues: VariantAttributeDisplayDto[];
}

interface MedicineDetailInteractiveProps {
  medicineName: string;
  activeIngredient: string;
  manufacturer: string;
  registrationNumber: string | null;
  isPrescriptionRequired?: boolean | null;
  medicineImages: MedicineImageDto[];
  variants: MedicineVariantDetailDto[];
}

export function MedicineDetailInteractive({
  medicineName,
  activeIngredient,
  manufacturer,
  registrationNumber,
  isPrescriptionRequired,
  medicineImages,
  variants,
}: MedicineDetailInteractiveProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  );

  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || variants[0] || null;
  }, [variants, selectedVariantId]);

  // Hợp nhất danh sách ảnh: Ưu tiên ảnh riêng của biến thể đang chọn lên đầu nếu có
  const galleryImages = useMemo(() => {
    const variantSpecific = selectedVariant?.images || [];
    const generalImages = medicineImages.filter(
      (img) => !img.medicineVariantId || img.medicineVariantId === selectedVariant?.id
    );

    const map = new Map<string, MedicineImageDto>();
    for (const img of variantSpecific) {
      if (img.displayUrl) map.set(img.id, img);
    }
    for (const img of generalImages) {
      if (img.displayUrl && !map.has(img.id)) map.set(img.id, img);
    }

    return Array.from(map.values());
  }, [medicineImages, selectedVariant]);

  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  const currentDisplayImage = useMemo(() => {
    if (activeImageUrl && galleryImages.some((g) => g.displayUrl === activeImageUrl)) {
      return activeImageUrl;
    }
    const variantPrimary = selectedVariant?.images?.find((i) => i.isPrimary) || selectedVariant?.images?.[0];
    if (variantPrimary?.displayUrl) {
      return variantPrimary.displayUrl;
    }
    return galleryImages[0]?.displayUrl || null;
  }, [activeImageUrl, galleryImages, selectedVariant]);

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setActiveImageUrl(null); // Reset để hiển thị ảnh riêng của biến thể nếu có
  };

  const renderAttributeValue = (av: VariantAttributeDisplayDto) => {
    const unitSuffix = av.attribute.unit ? ` ${av.attribute.unit}` : '';
    if (av.attribute.dataType === 'SELECT' && av.option) {
      return av.option.label;
    }
    if (av.attribute.dataType === 'BOOLEAN') {
      return av.booleanValue ? 'Có' : 'Không';
    }
    if (av.attribute.dataType === 'NUMBER' && av.numberValue !== null) {
      return `${Number(av.numberValue)}${unitSuffix}`;
    }
    if (av.textValue) {
      return av.textValue.endsWith(unitSuffix.trim())
        ? av.textValue
        : `${av.textValue}${unitSuffix}`;
    }
    return '—';
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: HÌNH ẢNH THUỐC & BIẾN THỂ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
            {currentDisplayImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentDisplayImage}
                alt={selectedVariant ? `${medicineName} - ${selectedVariant.name}` : medicineName}
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <MedicineBoxOutlined className="text-6xl text-pharma-500/60 mb-3" />
                <span className="text-sm font-semibold text-slate-600">
                  {medicineName}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {activeIngredient}
                </span>
              </div>
            )}

            {/* Prescription Badge */}
            <div className="absolute top-4 left-4">
              {isPrescriptionRequired === true ? (
                <span className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Thuốc kê đơn (Rx)
                </span>
              ) : isPrescriptionRequired === false ? (
                <span className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Thuốc không kê đơn (OTC)
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  Sản phẩm này không phải là thuốc
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {galleryImages.map((img) => {
                const isSelected = currentDisplayImage === img.displayUrl;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageUrl(img.displayUrl)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-pharma-600 ring-2 ring-pharma-200'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.displayUrl}
                      alt={img.fileName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: THÔNG TIN CHÍNH, CHỌN BIẾN THỂ, GIÁ THAM KHẢO & THUỘC TÍNH ĐỘNG */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                {medicineName}
              </h1>
              {selectedVariant && (
                <p className="mt-1 text-sm font-medium text-pharma-700">
                  Biến thể đang xem: {selectedVariant.name}
                </p>
              )}
            </div>

            {/* Core Metadata Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-xs">
              <div>
                <span className="block text-slate-400 font-medium">Hoạt chất chính</span>
                <span className="mt-0.5 block font-bold text-slate-800 text-sm">
                  {activeIngredient}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-medium">Nhà sản xuất</span>
                <span className="mt-0.5 block font-bold text-slate-800 text-sm">
                  {manufacturer}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-medium">Số đăng ký lưu hành</span>
                <span className="mt-0.5 inline-flex items-center gap-1 font-semibold text-pharma-700">
                  <SafetyCertificateOutlined />
                  {registrationNumber || 'Đang cập nhật'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-medium">Mã định danh biến thể (SKU)</span>
                <span className="mt-0.5 inline-flex items-center gap-1 font-mono font-semibold text-slate-800">
                  <BarcodeOutlined />
                  {selectedVariant?.sku || '—'}
                </span>
              </div>
            </div>

            {/* Reference Price Box */}
            <div className="rounded-2xl border border-pharma-200 bg-pharma-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-pharma-800">
                  Giá tham khảo niêm yết
                </span>
                <span className="mt-1 block text-2xl sm:text-3xl font-extrabold text-pharma-700">
                  {selectedVariant ? formatVND(selectedVariant.numericPrice) : 'Đang cập nhật'}
                </span>
              </div>
              <div className="text-xs text-slate-500 max-w-xs">
                Giá chỉ mang tính chất tham khảo danh mục dược phẩm, không phải giá chào bán thương mại.
              </div>
            </div>

            {/* DANH SÁCH BIẾN THỂ (5.5: Khi chọn một biến thể -> hiển thị đúng thông tin, giá, thuộc tính, ảnh riêng) */}
            {variants.length > 0 && (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chọn biến thể ({variants.length})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {variants.map((variant) => {
                    const active = variant.id === selectedVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleSelectVariant(variant.id)}
                        className={`flex items-start justify-between rounded-xl border p-3.5 text-left transition-all ${
                          active
                            ? 'border-pharma-600 bg-pharma-50/40 ring-2 ring-pharma-500/20'
                            : 'border-slate-200 bg-white hover:border-pharma-300'
                        }`}
                      >
                        <div className="pr-2">
                          <div className="text-xs font-bold text-slate-900">
                            {variant.name}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono">SKU: {variant.sku}</span>
                            <span>•</span>
                            <span className="font-semibold text-pharma-700">
                              {formatVND(variant.numericPrice)}
                            </span>
                          </div>
                        </div>
                        {active && (
                          <CheckCircleFilled className="text-pharma-600 text-base shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BẢNG THUỘC TÍNH ĐỘNG CỦA BIẾN THỂ ĐANG CHỌN */}
            {selectedVariant && selectedVariant.attributeValues.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Thông số bào chế &amp; Thuộc tính của biến thể ({selectedVariant.sku})
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedVariant.attributeValues.map((av) => (
                        <tr key={av.id} className="hover:bg-slate-50/80">
                          <th className="w-2/5 bg-slate-50/70 px-4 py-2.5 text-left font-semibold text-slate-700">
                            {av.attribute.name}
                          </th>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {renderAttributeValue(av)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Medical Notice */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
            <InfoCircleOutlined className="text-blue-600 text-sm mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Thông tin chuyên môn dưới đây được Quản trị viên nhập và xác minh từ tài liệu hướng dẫn sử dụng của nhà sản xuất. Không tự ý thay đổi liều dùng khi chưa tham khảo ý kiến bác sĩ hoặc dược sĩ chuyên môn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

