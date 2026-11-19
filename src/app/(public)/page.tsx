import React from 'react';
import Link from 'next/link';
import {
  SearchOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { isDatabaseConfigured } from '@/config/env';
import { categoryService } from '@/modules/category/category.service';
import { medicineService } from '@/modules/medicine/medicine.service';
import { MedicineCard, type MedicineCardItem } from '@/components/medicine/MedicineCard';
import { DatabaseStatusNotice } from '@/components/ui/DatabaseStatusNotice';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const dbReady = isDatabaseConfigured();
  let categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    children: Array<{ id: string; name: string; slug: string }>;
    _count: { medicines: number };
  }> = [];
  let featuredMedicines: MedicineCardItem[] = [];
  let latestMedicines: MedicineCardItem[] = [];
  let dbErrorMessage: string | undefined;

  if (dbReady) {
    try {
      const [allCats, featuredRes, latestRes] = await Promise.all([
        categoryService.listCategories({ includeInactive: false, includeDeleted: false }),
        medicineService.listMedicines({
          isFeatured: true,
          limit: 8,
          includeUnpublished: false,
        }),
        medicineService.listMedicines({
          sortBy: 'newest',
          limit: 8,
          includeUnpublished: false,
        }),
      ]);

      categories = allCats.filter((c) => !c.parentId);
      featuredMedicines = featuredRes.items;
      latestMedicines = latestRes.items;
    } catch (error) {
      dbErrorMessage =
        error instanceof Error
          ? error.message
          : 'Không thể truy vấn dữ liệu từ Neon PostgreSQL.';
    }
  }

  return (
    <div className="space-y-14 pb-16">
      {/* 1. HERO BANNER GIỚI THIỆU & THANH TÌM KIẾM TRUNG TÂM */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pharma-900 via-pharma-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-pharma-700/60 border border-pharma-500/40 px-3.5 py-1.5 text-xs font-medium text-pharma-100">
                <SafetyCertificateOutlined className="text-pharma-300" />
                <span>Cơ sở dữ liệu Dược điển chuẩn hóa</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
                Hệ thống Tra cứu &amp; Quản lý{' '}
                <span className="text-pharma-300">Danh mục Thuốc</span>
              </h1>

              <p className="text-base sm:text-lg text-pharma-100/90 max-w-2xl leading-relaxed">
                Tra cứu chính xác thông tin hoạt chất, hàm lượng, dạng bào chế, quy cách đóng gói, số đăng ký lưu hành, hướng dẫn bảo quản và giá tham khảo của các chế phẩm dược phẩm.
              </p>

              {/* Main Hero Search Form */}
              <form
                action="/medicines"
                method="GET"
                className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl"
              >
                <div className="relative flex-1">
                  <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                  <input
                    type="search"
                    name="search"
                    placeholder="Nhập tên thuốc, hoạt chất (Paracetamol, Esomeprazole...), nhà sản xuất hoặc SKU..."
                    className="w-full rounded-xl bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-pharma-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-pharma-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-pharma-400 transition-colors shrink-0"
                >
                  <SearchOutlined />
                  <span>Tra cứu ngay</span>
                </button>
              </form>

              {/* Popular Quick Queries */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-pharma-200 pt-1">
                <span className="font-medium text-pharma-300">Tra cứu phổ biến:</span>
                {['Paracetamol', 'Esomeprazole', 'Fexofenadine', 'Acetylcysteine', 'Vitamin C'].map(
                  (term) => (
                    <Link
                      key={term}
                      href={`/medicines?search=${encodeURIComponent(term)}`}
                      className="rounded-lg bg-white/10 px-2.5 py-1 hover:bg-white/20 text-white transition-colors"
                    >
                      {term}
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* Right Trust Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 space-y-2">
                <ExperimentOutlined className="text-2xl text-pharma-300" />
                <h3 className="font-bold text-base text-white">Hoạt chất &amp; Hàm lượng</h3>
                <p className="text-xs text-pharma-100/80 leading-relaxed">
                  Phân loại chi tiết theo hoạt chất gốc, nồng độ, hàm lượng và dạng bào chế động.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 space-y-2">
                <FileProtectOutlined className="text-2xl text-pharma-300" />
                <h3 className="font-bold text-base text-white">Số đăng ký Bộ Y tế</h3>
                <p className="text-xs text-pharma-100/80 leading-relaxed">
                  Minh bạch thông tin nhà sản xuất, số đăng ký lưu hành và phân loại thuốc kê đơn (Rx/OTC).
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-pharma-300 font-semibold text-sm">
                  <CheckCircleOutlined />
                  <span>Nguyên tắc thông tin y tế chuẩn mực</span>
                </div>
                <p className="text-xs text-pharma-100/80 leading-relaxed">
                  Mọi dữ liệu chuyên ngành đều do Quản trị viên nhập và xác minh từ tờ hướng dẫn sử dụng được phê duyệt. Không chứa nội dung quảng cáo hoặc tự động chẩn đoán điều trị.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
        {(!dbReady || dbErrorMessage) && (
          <DatabaseStatusNotice message={dbErrorMessage} />
        )}

        {/* 2. DANH MỤC THUỐC NỔI BẬT (5.1) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pharma-600">
                Phân loại Dược lý
              </span>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Danh mục Thuốc Nổi bật
              </h2>
            </div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-pharma-700 hover:text-pharma-800"
            >
              <span>Xem toàn bộ danh mục</span>
              <ArrowRightOutlined className="text-xs" />
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-pharma-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pharma-50 text-pharma-600 shrink-0">
                        <AppstoreOutlined className="text-lg" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {cat._count.medicines} thuốc
                      </span>
                    </div>

                    <Link
                      href={`/categories/${cat.slug}`}
                      className="mt-4 block text-base font-bold text-slate-900 hover:text-pharma-700"
                    >
                      {cat.name}
                    </Link>

                    {cat.description && (
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    )}

                    {cat.children && cat.children.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cat.children.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/categories/${sub.slug}`}
                            className="rounded-md bg-slate-50 border border-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-pharma-300 hover:text-pharma-700"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-pharma-600 hover:text-pharma-700"
                    >
                      <span>Tra cứu nhóm thuốc này</span>
                      <ArrowRightOutlined className="text-[10px]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Chưa có danh mục thuốc nào được kích hoạt.
            </div>
          )}
        </section>

        {/* 3. THUỐC ĐƯỢC ĐỀ XUẤT HIỂN THỊ (isFeatured) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pharma-600">
                Danh mục tiêu biểu
              </span>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Thuốc được đề xuất hiển thị
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Các chế phẩm thông dụng được Quản trị viên lựa chọn hiển thị nổi bật để tra cứu nhanh
              </p>
            </div>
            <Link
              href="/medicines?isFeatured=true"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-pharma-700 hover:text-pharma-800"
            >
              <span>Xem tất cả thuốc nổi bật</span>
              <ArrowRightOutlined className="text-xs" />
            </Link>
          </div>

          {featuredMedicines.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredMedicines.map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Chưa có thuốc nổi bật nào được xuất bản.
            </div>
          )}
        </section>

        {/* 4. THUỐC MỚI CẬP NHẬT */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pharma-600">
                Dữ liệu mới xuất bản
              </span>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Thuốc mới cập nhật
              </h2>
            </div>
            <Link
              href="/medicines?sortBy=newest"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-pharma-700 hover:text-pharma-800"
            >
              <span>Duyệt toàn bộ danh mục thuốc</span>
              <ArrowRightOutlined className="text-xs" />
            </Link>
          </div>

          {latestMedicines.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {latestMedicines.map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Chưa có dữ liệu thuốc xuất bản.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

