'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  InboxOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Pagination, Select, Spin, Alert, Button, Drawer } from 'antd';
import { useDebounce } from '@/hooks/useDebounce';
import { MedicineCard, type MedicineCardItem } from '@/components/medicine/MedicineCard';

export interface FilterCategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface FilterAttributeOption {
  id: string;
  name: string;
  code: string;
  dataType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
  unit: string | null;
  options: Array<{
    id: string;
    value: string;
    label: string;
  }>;
}

interface MedicineCatalogBrowserProps {
  initialItems: MedicineCardItem[];
  initialMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: FilterCategoryOption[];
  filterableAttributes: FilterAttributeOption[];
}

export function MedicineCatalogBrowser({
  initialItems,
  initialMeta,
  categories,
  filterableAttributes,
}: MedicineCatalogBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<MedicineCardItem[]>(initialItems);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter states initialized from URL searchParams
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 400);

  const [categorySlug, setCategorySlug] = useState(searchParams.get('categorySlug') || '');
  const [prescriptionFilter, setPrescriptionFilter] = useState(
    searchParams.get('isPrescriptionRequired') || ''
  );
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));

  // Dynamic Attribute Filters: { [attributeCode]: value }
  const [attrValues, setAttrValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const attr of filterableAttributes) {
      const val = searchParams.get(`attr_${attr.code}`);
      if (val) {
        initial[attr.code] = val;
      }
    }
    return initial;
  });

  // Đếm số lượng tiêu chí lọc đang áp dụng để hiển thị trên nút Bộ lọc ở Mobile
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categorySlug) count++;
    if (
      prescriptionFilter === 'true' ||
      prescriptionFilter === 'false' ||
      prescriptionFilter === 'null'
    )
      count++;
    if (minPrice.trim() !== '' || maxPrice.trim() !== '') count++;
    for (const val of Object.values(attrValues)) {
      if (val && val.trim()) count++;
    }
    return count;
  }, [categorySlug, prescriptionFilter, minPrice, maxPrice, attrValues]);

  const fetchMedicines = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', '12');

        if (debouncedSearch.trim()) {
          params.set('search', debouncedSearch.trim());
        }
        if (categorySlug) {
          params.set('categorySlug', categorySlug);
        }
        if (
          prescriptionFilter === 'true' ||
          prescriptionFilter === 'false' ||
          prescriptionFilter === 'null'
        ) {
          params.set('isPrescriptionRequired', prescriptionFilter);
        }
        if (minPrice.trim() !== '') {
          params.set('minPrice', minPrice.trim());
        }
        if (maxPrice.trim() !== '') {
          params.set('maxPrice', maxPrice.trim());
        }
        if (sortBy) {
          params.set('sortBy', sortBy);
        }

        for (const [code, val] of Object.entries(attrValues)) {
          if (val && val.trim()) {
            params.set(`attr_${code}`, val.trim());
          }
        }

        // Update URL cleanly without full page reload
        router.replace(`/medicines?${params.toString()}`, { scroll: false });

        const response = await fetch(`/api/v1/medicines?${params.toString()}`);
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error?.message || 'Không thể tải danh sách thuốc.');
        }

        setItems(json.data || []);
        if (json.meta) {
          setMeta(json.meta);
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Đã xảy ra lỗi khi truy vấn danh mục thuốc.'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      debouncedSearch,
      categorySlug,
      prescriptionFilter,
      minPrice,
      maxPrice,
      sortBy,
      attrValues,
      router,
    ]
  );

  // Trigger query when filters change
  useEffect(() => {
    setPage(1);
    fetchMedicines(1);
  }, [
    debouncedSearch,
    categorySlug,
    prescriptionFilter,
    minPrice,
    maxPrice,
    sortBy,
    attrValues,
    fetchMedicines,
  ]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    fetchMedicines(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setCategorySlug('');
    setPrescriptionFilter('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setAttrValues({});
    setPage(1);
  };

  const filterFormControls = (
    <div className="space-y-5">
      {/* 1. Lọc theo Danh mục */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Nhóm danh mục thuốc
        </label>
        <Select
          className="w-full"
          placeholder="Tất cả danh mục"
          allowClear
          value={categorySlug || undefined}
          onChange={(val) => setCategorySlug(val || '')}
          options={[
            { label: 'Tất cả danh mục', value: '' },
            ...categories.map((cat) => ({
              label: cat.parentId ? `↳ ${cat.name}` : cat.name,
              value: cat.slug,
            })),
          ]}
        />
      </div>

      {/* 2. Lọc theo Phân loại kê đơn (Rx / OTC) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Phân loại kê đơn
        </label>
        <Select
          className="w-full"
          value={prescriptionFilter}
          onChange={(val) => setPrescriptionFilter(val)}
          options={[
            { label: 'Tất cả phân loại', value: '' },
            { label: 'Thuốc không kê đơn (OTC)', value: 'false' },
            { label: 'Thuốc kê đơn (Rx)', value: 'true' },
            { label: 'Sản phẩm này không phải là thuốc', value: 'null' },
          ]}
        />
      </div>

      {/* 3. Lọc theo Khoảng giá tham khảo */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Khoảng giá tham khảo (VNĐ)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Từ (đ)"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-pharma-600 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Đến (đ)"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-pharma-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { label: '< 50k', min: '0', max: '50000' },
            { label: '50k - 150k', min: '50000', max: '150000' },
            { label: '> 150k', min: '150000', max: '' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setMinPrice(preset.min);
                setMaxPrice(preset.max);
              }}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-pharma-50 hover:text-pharma-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Lọc theo các Thuộc tính động được cấu hình (isFilterable = true) */}
      {filterableAttributes.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-4">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Thuộc tính bào chế &amp; Quy cách
          </span>

          {filterableAttributes.map((attr) => (
            <div key={attr.id} className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {attr.name} {attr.unit ? `(${attr.unit})` : ''}
              </label>

              {attr.dataType === 'SELECT' ? (
                <Select
                  className="w-full"
                  placeholder={`Tất cả ${attr.name.toLowerCase()}`}
                  allowClear
                  value={attrValues[attr.code] || undefined}
                  onChange={(val) =>
                    setAttrValues((prev) => ({
                      ...prev,
                      [attr.code]: val || '',
                    }))
                  }
                  options={attr.options.map((opt) => ({
                    label: opt.label,
                    value: opt.value,
                  }))}
                />
              ) : attr.dataType === 'BOOLEAN' ? (
                <Select
                  className="w-full"
                  placeholder="Tất cả"
                  allowClear
                  value={attrValues[attr.code] || undefined}
                  onChange={(val) =>
                    setAttrValues((prev) => ({
                      ...prev,
                      [attr.code]: val || '',
                    }))
                  }
                  options={[
                    { label: 'Có', value: 'true' },
                    { label: 'Không', value: 'false' },
                  ]}
                />
              ) : (
                <input
                  type="text"
                  value={attrValues[attr.code] || ''}
                  onChange={(e) =>
                    setAttrValues((prev) => ({
                      ...prev,
                      [attr.code]: e.target.value,
                    }))
                  }
                  placeholder={`Nhập ${attr.name.toLowerCase()}...`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-pharma-600 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* LEFT SIDEBAR (DESKTOP ONLY): Ẩn trên điện thoại/tablet (< lg), hiển thị cố định trên Desktop */}
      <aside className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <FilterOutlined className="text-pharma-600" />
              <span>Bộ lọc Tra cứu</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-pharma-600 hover:text-pharma-700"
            >
              <ReloadOutlined className="text-[11px]" />
              <span>Đặt lại</span>
            </button>
          </div>

          {filterFormControls}
        </div>
      </aside>

      {/* MOBILE / TABLET FILTER DRAWER: Chỉ mở ra khi người dùng bấm nút "Bộ lọc" */}
      <Drawer
        title={
          <div className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FilterOutlined className="text-pharma-600" />
              <span>Bộ lọc Tra cứu Thuốc</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-pharma-100 px-2 py-0.5 text-xs font-semibold text-pharma-700">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-pharma-600 hover:text-pharma-700"
            >
              <ReloadOutlined className="text-[11px]" />
              <span>Đặt lại</span>
            </button>
          </div>
        }
        placement="left"
        width={320}
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        closeIcon={<CloseOutlined />}
        footer={
          <div className="flex items-center gap-2 py-1">
            <Button onClick={handleResetFilters} className="flex-1">
              Xóa lọc
            </Button>
            <Button
              type="primary"
              onClick={() => setMobileFilterOpen(false)}
              className="flex-1"
            >
              Xem kết quả ({meta.total})
            </Button>
          </div>
        }
      >
        {filterFormControls}
      </Drawer>

      {/* RIGHT CONTENT: THANH TÌM KIẾM DEBOUNCE, NÚT MỞ BỘ LỌC MOBILE, SẮP XẾP & DANH SÁCH THUỐC */}
      <div className="lg:col-span-9 space-y-6">
        {/* Top Toolbar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <SearchOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên thuốc, hoạt chất, nhà sản xuất, số đăng ký hoặc mã SKU..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-pharma-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0">
            {/* Nút bấm mở Bộ lọc trên Điện thoại / Tablet (< lg) */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex lg:hidden items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-pharma-500 hover:text-pharma-700 transition-colors"
            >
              <FilterOutlined className="text-pharma-600" />
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pharma-600 px-1.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 ml-auto md:ml-0">
              <span className="hidden sm:inline text-xs font-medium text-slate-500">
                Sắp xếp:
              </span>
              <Select
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                className="w-44 sm:w-48"
                options={[
                  { label: 'Mới cập nhật', value: 'newest' },
                  { label: 'Tên thuốc (A → Z)', value: 'name_asc' },
                  { label: 'Tên thuốc (Z → A)', value: 'name_desc' },
                  { label: 'Giá tham khảo (Thấp → Cao)', value: 'price_asc' },
                  { label: 'Giá tham khảo (Cao → Thấp)', value: 'price_desc' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Result Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
          <span>
            Hiển thị <strong>{items.length}</strong> trên tổng số{' '}
            <strong>{meta.total}</strong> thuốc đã xuất bản
          </span>
          {debouncedSearch && (
            <span>
              Từ khóa tìm kiếm:{' '}
              <strong className="text-pharma-700">&ldquo;{debouncedSearch}&rdquo;</strong>
            </span>
          )}
        </div>

        {/* Error State */}
        {errorMsg && (
          <Alert
            type="error"
            showIcon
            message="Không thể tải dữ liệu thuốc"
            description={errorMsg}
            action={
              <Button size="small" onClick={() => fetchMedicines(page)}>
                Thử lại
              </Button>
            }
          />
        )}

        {/* Loading / Results / Empty State */}
        <Spin spinning={loading} tip="Đang tra cứu dữ liệu thuốc...">
          {items.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((med) => (
                  <MedicineCard key={med.id} medicine={med} />
                ))}
              </div>

              {meta.total > meta.limit && (
                <div className="flex justify-center pt-4">
                  <Pagination
                    current={meta.page}
                    pageSize={meta.limit}
                    total={meta.total}
                    showSizeChanger={false}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
              <InboxOutlined className="text-4xl text-slate-400" />
              <h3 className="text-base font-bold text-slate-800">
                Không tìm thấy thuốc phù hợp với bộ lọc hiện tại
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Vui lòng thử tìm kiếm bằng tên hoạt chất gốc (ví dụ: Paracetamol, Esomeprazole) hoặc đặt lại các tiêu chí lọc.
              </p>
              <div className="pt-2">
                <Button type="primary" onClick={handleResetFilters}>
                  Xóa toàn bộ bộ lọc
                </Button>
              </div>
            </div>
          )}
        </Spin>
      </div>
    </div>
  );
}
