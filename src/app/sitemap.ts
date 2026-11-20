import type { MetadataRoute } from 'next';
import { isDatabaseConfigured } from '@/config/env';
import { prisma } from '@/infrastructure/database/prisma';
import { getBaseUrl } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/medicines`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  if (!isDatabaseConfigured()) {
    return staticRoutes;
  }

  try {
    const [categories, medicines] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      prisma.medicine.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
      url: `${baseUrl}/categories/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const medicineUrls: MetadataRoute.Sitemap = medicines.map((med) => ({
      url: `${baseUrl}/medicines/${med.slug}`,
      lastModified: med.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.85,
    }));

    return [...staticRoutes, ...categoryUrls, ...medicineUrls];
  } catch {
    return staticRoutes;
  }
}

