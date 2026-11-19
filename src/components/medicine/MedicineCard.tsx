import React from 'react';
import Link from 'next/link';
import {
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { formatVND } from '@/lib/utils';

export interface MedicineCardItem {
  id: string;
  name: string;
  slug: string;
  activeIngredient: string;
  manufacturer: string;
  registrationNumber?: string | null;
  isPrescriptionRequired: boolean;
  isFeatured?: boolean;
  primaryImageUrl?: string | null;
  referencePrice?: number | null;
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
}

export function MedicineCard({ medicine }: { medicine: MedicineCardItem }) {
  const variantCount = medicine.variants?.length ?? 0;

  return (
    <Link
      href={`/medicines/${medicine.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-pharma-300 hover:shadow-md"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
        {medicine.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={medicine.primaryImageUrl}
            alt={medicine.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <MedicineBoxOutlined className="text-4xl text-pharma-500/70 mb-2" />
            <span className="text-xs font-medium text-slate-500 line-clamp-1">
              {medicine.activeIngredient}
            </span>
          </div>
        )}

        {/* Prescription Status Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {medicine.isPrescriptionRequired ? (
            <span className="inline-flex items-center rounded-md bg-rose-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              Thuốc kê đơn (Rx)
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-emerald-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              Không kê đơn (OTC)
            </span>
          )}
        </div>

        {medicine.isFeatured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-md bg-amber-500/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              Nổi bật
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {medicine.category && (
          <span className="text-xs font-medium text-pharma-700 mb-1 line-clamp-1">
            {medicine.category.name}
          </span>
        )}

        <h3 className="text-base font-bold text-slate-900 group-hover:text-pharma-700 transition-colors line-clamp-2 min-h-[2.75rem]">
          {medicine.name}
        </h3>

        <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-start gap-1.5">
            <span className="font-semibold text-slate-700 shrink-0">Hoạt chất:</span>
            <span className="line-clamp-1 text-slate-600" title={medicine.activeIngredient}>
              {medicine.activeIngredient}
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-semibold text-slate-700 shrink-0">Nhà sản xuất:</span>
            <span className="line-clamp-1 text-slate-600" title={medicine.manufacturer}>
              {medicine.manufacturer}
            </span>
          </div>
          {medicine.registrationNumber && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <SafetyCertificateOutlined className="text-pharma-600" />
              <span>SĐK: {medicine.registrationNumber}</span>
            </div>
          )}
        </div>

        {/* Footer Price & Variant Count */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between gap-2">
          <div>
            <span className="block text-[11px] text-slate-400">Giá tham khảo</span>
            <span className="text-base font-bold text-pharma-700">
              {medicine.referencePrice !== null && medicine.referencePrice !== undefined
                ? formatVND(medicine.referencePrice)
                : 'Đang cập nhật'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-pharma-600">
            <span>{variantCount > 0 ? `${variantCount} quy cách` : 'Chi tiết'}</span>
            <RightOutlined className="text-[10px]" />
          </div>
        </div>
      </div>
    </Link>
  );
}

