import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  RightOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { isDatabaseConfigured } from '@/config/env';
import { medicineService } from '@/modules/medicine/medicine.service';
import { MedicineDetailInteractive } from '@/components/medicine/MedicineDetailInteractive';
import { MedicineCard } from '@/components/medicine/MedicineCard';
import { getBaseUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const appUrl = getBaseUrl();

  if (!isDatabaseConfigured()) {
    return { title: 'Chi tiết thuốc' };
  }

  try {
    const medicine = await medicineService.getMedicineDetail(slug, false);
    const canonicalUrl = `${appUrl}/medicines/${medicine.slug}`;
    const shortDesc =
      medicine.description?.slice(0, 160) ||
      `Tra cứu thông tin thuốc ${medicine.name} (${medicine.activeIngredient}) do ${medicine.manufacturer} sản xuất.`;

    return {
      title: `${medicine.name} (${medicine.activeIngredient}) – Thông tin & Giá tham khảo`,
      description: shortDesc,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        type: 'article',
        url: canonicalUrl,
        title: `${medicine.name} | PharmaCatalog VN`,
        description: shortDesc,
        ...(medicine.primaryImageUrl
          ? { images: [{ url: medicine.primaryImageUrl, alt: medicine.name }] }
          : {}),
      },
    };
  } catch {
    return { title: 'Không tìm thấy thông tin thuốc' };
  }
}

export default async function MedicineDetailPage({ params }: PageProps) {
  const { slug } = await params;

  if (!isDatabaseConfigured()) {
    notFound();
  }

  let medicine;
  try {
    // 5.5: Không hiển thị những dữ liệu chưa được xuất bản (includeUnpublished = false)
    medicine = await medicineService.getMedicineDetail(slug, false);
  } catch {
    notFound();
  }

  const relatedMedicines = await medicineService.getRelatedMedicines(
    medicine.id,
    medicine.categoryId,
    4
  );

  const appUrl = getBaseUrl();

  // 5.6. SEO Structured Data phù hợp với website tra cứu y dược (Drug / MedicalWebPage)
  // Tuyệt đối không đánh dấu Offer thương mại hay cửa hàng bán hàng
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: `${medicine.name} – Thông tin tra cứu dược phẩm`,
    url: `${appUrl}/medicines/${medicine.slug}`,
    description:
      medicine.description ||
      `Thông tin tra cứu hoạt chất ${medicine.activeIngredient} của thuốc ${medicine.name}.`,
    mainEntity: {
      '@type': 'Drug',
      name: medicine.name,
      activeIngredient: medicine.activeIngredient,
      nonProprietaryName: medicine.activeIngredient,
      prescriptionStatus:
        medicine.isPrescriptionRequired === true
          ? 'https://schema.org/PrescriptionOnly'
          : medicine.isPrescriptionRequired === false
            ? 'https://schema.org/OTC'
            : 'https://schema.org/DietarySupplement',
      manufacturer: {
        '@type': 'Organization',
        name: medicine.manufacturer,
      },
      ...(medicine.registrationNumber
        ? {
            code: {
              '@type': 'MedicalCode',
              codeValue: medicine.registrationNumber,
              codingSystem: 'Cục Quản lý Dược - Bộ Y tế Việt Nam',
            },
          }
        : {}),
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-pharma-600">
          Trang chủ
        </Link>
        <RightOutlined className="text-[10px]" />
        <Link href="/medicines" className="hover:text-pharma-600">
          Danh mục Thuốc
        </Link>
        {medicine.category?.parent && (
          <>
            <RightOutlined className="text-[10px]" />
            <Link
              href={`/categories/${medicine.category.parent.slug}`}
              className="hover:text-pharma-600"
            >
              {medicine.category.parent.name}
            </Link>
          </>
        )}
        {medicine.category && (
          <>
            <RightOutlined className="text-[10px]" />
            <Link
              href={`/categories/${medicine.category.slug}`}
              className="hover:text-pharma-600"
            >
              {medicine.category.name}
            </Link>
          </>
        )}
        <RightOutlined className="text-[10px]" />
        <span className="font-medium text-slate-800">{medicine.name}</span>
      </nav>

      {/* Main Interactive Gallery & Variant Selector */}
      <MedicineDetailInteractive
        medicineName={medicine.name}
        activeIngredient={medicine.activeIngredient}
        manufacturer={medicine.manufacturer}
        registrationNumber={medicine.registrationNumber}
        isPrescriptionRequired={medicine.isPrescriptionRequired}
        medicineImages={medicine.images}
        variants={medicine.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          numericPrice: v.numericPrice,
          images: v.images,
          attributeValues: v.attributeValues.map((av) => ({
            id: av.id,
            attribute: {
              id: av.attribute.id,
              name: av.attribute.name,
              code: av.attribute.code,
              dataType: av.attribute.dataType,
              unit: av.attribute.unit,
            },
            option: av.option
              ? {
                  id: av.option.id,
                  value: av.option.value,
                  label: av.option.label,
                }
              : null,
            textValue: av.textValue,
            numberValue: av.numberValue ? av.numberValue.toString() : null,
            booleanValue: av.booleanValue,
          })),
        }))}
      />

      {/* Detailed Verified Information Sections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Mô tả thuốc */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-pharma-700 font-bold text-lg">
              <FileTextOutlined />
              <h2>Mô tả thông tin chế phẩm</h2>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
              {medicine.description || 'Thông tin mô tả chi tiết đang được cập nhật từ tờ hướng dẫn sử dụng.'}
            </div>
          </section>

          {/* 2. Thông tin sử dụng do Admin cung cấp */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-pharma-700 font-bold text-lg">
              <ExperimentOutlined />
              <h2>Thông tin hướng dẫn sử dụng</h2>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
              {medicine.usageInformation ||
                'Vui lòng đọc kỹ tờ hướng dẫn sử dụng đi kèm hộp thuốc hoặc tham khảo ý kiến bác sĩ/dược sĩ.'}
            </div>
          </section>

          {/* 3. Thông tin bảo quản */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-pharma-700 font-bold text-lg">
              <SafetyCertificateOutlined />
              <h2>Điều kiện bảo quản tiêu chuẩn</h2>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
              {medicine.storageInformation ||
                'Bảo quản nơi khô mát, nhiệt độ dưới 30°C, tránh ánh sáng trực tiếp và để xa tầm tay trẻ em.'}
            </div>
          </section>
        </div>

        {/* Right Summary & Medical Compliance Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {medicine.isPrescriptionRequired !== true && medicine.isPrescriptionRequired !== false && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3 shadow-sm">
              <span className="font-bold text-blue-700 shrink-0">⚠️ Lưu ý:</span>
              <span>Sản phẩm này không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Hồ sơ Dược điển tóm tắt
            </h3>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Phân loại:</dt>
                <dd className="font-semibold text-right">
                  {medicine.isPrescriptionRequired === true ? (
                    <span className="text-rose-600">Thuốc kê đơn (Rx)</span>
                  ) : medicine.isPrescriptionRequired === false ? (
                    <span className="text-emerald-600">Không kê đơn (OTC)</span>
                  ) : (
                    <span className="text-blue-600">Không phải là thuốc</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Phân nhóm:</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {medicine.category?.name || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Hoạt chất:</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {medicine.activeIngredient}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Nhà sản xuất:</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {medicine.manufacturer}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Số đăng ký:</dt>
                <dd className="font-semibold text-pharma-700 text-right">
                  {medicine.registrationNumber || 'Đang cập nhật'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Số lượng biến thể:</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {medicine.variants.length} quy cách
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {/* Related Medicines Section (5.5: Thuốc liên quan) */}
      {relatedMedicines.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pharma-600">
                Cùng danh mục dược lý
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Thuốc liên quan trong nhóm {medicine.category?.name}
              </h2>
            </div>
            {medicine.category && (
              <Link
                href={`/categories/${medicine.category.slug}`}
                className="text-xs font-semibold text-pharma-600 hover:text-pharma-700"
              >
                Xem toàn bộ nhóm →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedMedicines.map((rel) => (
              <MedicineCard key={rel.id} medicine={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

