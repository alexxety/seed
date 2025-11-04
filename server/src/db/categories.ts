import { PrismaClient } from '@prisma/client';

/**
 * Get all categories (tenant-scoped)
 */
export async function getAllCategories(db: PrismaClient) {
  return await db.category.findMany({
    orderBy: { id: 'asc' },
  });
}

/**
 * Create category (tenant-scoped)
 */
export async function createCategory(db: PrismaClient, name: string, icon: string) {
  return await db.category.create({
    data: { name, icon },
  });
}

/**
 * Update category (tenant-scoped)
 */
export async function updateCategory(db: PrismaClient, id: number, name: string, icon: string) {
  return await db.category.update({
    where: { id },
    data: { name, icon },
  });
}

/**
 * Delete category (tenant-scoped)
 */
export async function deleteCategory(db: PrismaClient, id: number) {
  const productsCount = await db.product.count({
    where: {
      categoryId: id,
      isActive: true,
    },
  });

  if (productsCount > 0) {
    throw new Error(
      `Cannot delete category with ${productsCount} products. Please move or delete products first.`
    );
  }

  await db.category.delete({
    where: { id },
  });
}
