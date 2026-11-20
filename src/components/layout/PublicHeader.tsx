'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  SearchOutlined,
  MedicineBoxOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';

export interface NavCategoryItem {
  id: string;
  name: string;
  slug: string;
}

export function PublicHeader({ categories = [] }: { categories?: NavCategoryItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [keyword, setKeyword] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed) {
      router.push(`/medicines?search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/medicines');
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      {/* Top Info Banner */}
      <div className="bg-pharma-800 text-white text-xs py-2 px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-pharma-300" />
            <span>
              Cổng thông tin tra cứu dữ liệu dược phẩm và danh mục thuốc
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-pharma-100">
            <Link href="/categories" className="hover:text-white transition-colors">
              Hệ thống Danh mục
            </Link>
            <span>•</span>
            <Link href="/admin" className="hover:text-white transition-colors">
              Cổng Quản trị Dược điển
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pharma-600 text-white shadow-sm group-hover:bg-pharma-700 transition-colors">
              <MedicineBoxOutlined className="text-2xl" />
            </div>
            <div>
              <span className="block text-lg font-bold tracking-tight text-slate-900">
                Dược sĩ <span className="text-pharma-600">Khánh</span>
              </span>
              <span className="block text-xs text-slate-500">
                Hệ thống tra cứu Dược
              </span>
            </div>
          </Link>

          {/* Search Bar (Desktop & Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl mx-4"
          >
            <div className="relative flex w-full items-center">
              <SearchOutlined className="absolute left-3.5 text-slate-400 text-base pointer-events-none" />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tra cứu theo tên thuốc, hoạt chất (Paracetamol...), nhà sản xuất, mã SKU..."
                className="w-full rounded-l-xl border border-r-0 border-slate-300 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pharma-600 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-r-xl bg-pharma-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-pharma-700 transition-colors shrink-0"
              >
                Tìm thuốc
              </button>
            </div>
          </form>

          {/* Primary Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className={`transition-colors ${pathname === '/'
                  ? 'text-pharma-700 font-semibold'
                  : 'text-slate-600 hover:text-pharma-600'
                }`}
            >
              Trang chủ
            </Link>
            <Link
              href="/medicines"
              className={`transition-colors ${pathname.startsWith('/medicines')
                  ? 'text-pharma-700 font-semibold'
                  : 'text-slate-600 hover:text-pharma-600'
                }`}
            >
              Danh sách thuốc
            </Link>
            <Link
              href="/categories"
              className={`flex items-center gap-1.5 transition-colors ${pathname.startsWith('/categories')
                  ? 'text-pharma-700 font-semibold'
                  : 'text-slate-600 hover:text-pharma-600'
                }`}
            >
              <AppstoreOutlined />
              Danh mục
            </Link>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Mở menu điều hướng"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>

        {/* Category Quick Strip (Desktop) */}
        {categories.length > 0 && (
          <div className="hidden md:flex items-center gap-2 border-t border-slate-100 py-2.5 text-xs overflow-x-auto no-scrollbar">
            <span className="font-semibold text-slate-500 shrink-0 mr-1">
              Nhóm dược lý:
            </span>
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-pharma-50 hover:text-pharma-700 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href="/categories"
              className="shrink-0 text-pharma-600 hover:text-pharma-700 font-medium ml-auto"
            >
              Xem tất cả danh mục →
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pt-3 pb-5 lg:hidden space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex w-full">
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên thuốc, hoạt chất, SKU..."
              className="w-full rounded-l-lg border border-r-0 border-slate-300 px-3.5 py-2 text-sm focus:border-pharma-600 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-r-lg bg-pharma-600 px-4 py-2 text-sm font-medium text-white"
            >
              Tìm
            </button>
          </form>

          <div className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname === '/'
                  ? 'text-pharma-700 bg-pharma-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              href="/medicines"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname.startsWith('/medicines')
                  ? 'text-pharma-700 bg-pharma-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Tra cứu danh sách thuốc
            </Link>
            <Link
              href="/categories"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname.startsWith('/categories')
                  ? 'text-pharma-700 bg-pharma-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Danh mục dược phẩm
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname.startsWith('/admin')
                  ? 'text-pharma-700 bg-pharma-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Khu vực quản trị (Admin)
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

