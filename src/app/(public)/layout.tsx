import React from 'react';
import { PublicHeader, type NavCategoryItem } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { isDatabaseConfigured } from '@/config/env';
import { categoryService } from '@/modules/category/category.service';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let navCategories: NavCategoryItem[] = [];

  if (isDatabaseConfigured()) {
    try {
      const categories = await categoryService.listCategories({
        includeInactive: false,
        includeDeleted: false,
      });
      navCategories = categories
        .filter((c) => !c.parentId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }));
    } catch {
      navCategories = [];
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader categories={navCategories} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

