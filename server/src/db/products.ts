import { PrismaClient } from '@prisma/client';

/**
 * Get all active products with category info (tenant-scoped)
 */
export async function getAllProducts(db: PrismaClient) {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: {
        select: {
          name: true,
          icon: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.categoryId,
    category_id: p.categoryId,
    category_name: p.category.name,
    category_icon: p.category.icon,
    image: p.image,
    description: p.description,
    is_active: p.isActive,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));
}

/**
 * Get product by ID (tenant-scoped)
 */
export async function getProductById(db: PrismaClient, id: number) {
  return await db.product.findUnique({
    where: { id },
  });
}

/**
 * Create product (tenant-scoped)
 */
export async function createProduct(db: PrismaClient, product: any) {
  return await db.product.create({
    data: {
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      image: product.image,
      description: product.description,
    },
  });
}

/**
 * Update product (tenant-scoped)
 */
export async function updateProduct(db: PrismaClient, id: number, product: any) {
  return await db.product.update({
    where: { id },
    data: {
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      image: product.image,
      description: product.description,
    },
  });
}

/**
 * Delete product (soft delete - tenant-scoped)
 */
export async function deleteProduct(db: PrismaClient, id: number) {
  await db.product.update({
    where: { id },
    data: { isActive: false },
  });
}
