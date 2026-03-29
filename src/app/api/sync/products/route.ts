import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bling from '@/lib/bling-client';
import * as suri from '@/lib/suri-client';
import type { BlingProduct, SuriProduct } from '@/lib/types';

function mapBlingToSuri(product: BlingProduct): SuriProduct {
  const categoryId = process.env.SURI_CATEGORY_ID || '131087930';
  const sku = product.codigo || String(product.id);
  const price = typeof product.preco === 'string'
    ? parseFloat(String(product.preco).replace(',', '.'))
    : product.preco || 0;

  let stock = 0;
  if (product.estoques?.length) {
    stock = product.estoques.reduce((sum, e) => sum + (e.saldoVirtualTotal || 0), 0);
  }

  const images = (product.imagens || [])
    .filter((img) => img.link)
    .map((img) => ({ providerId: null, url: img.link, description: null }));

  const weight = (product.pesoLiquido || product.pesoBruto || 0) * 1000;

  return {
    id: sku,
    sku,
    categoryId,
    subcategoryId: null,
    brand: null,
    sellerId: 'all',
    sellerName: null,
    isActive: true,
    name: product.descricao || '',
    description: product.descricaoComplementar || product.descricao || '',
    url: null,
    price,
    promotionalPrice: 0,
    hasShippingRestriction: false,
    images,
    attributes: [],
    dimensions: [
      {
        sku,
        dimensions: {},
        image: null,
        measurements: {
          weightInGrams: weight > 0 ? Math.round(weight) : 100,
          heightInCm: 10,
          widthInCm: 10,
          lengthInCm: 10,
          unitsPerPackage: 1,
        },
        price,
        priceTables: {},
        stocks: {},
      },
    ],
    weightInGrams: weight > 0 ? Math.round(weight) : 0,
  };
}

export async function POST() {
  const startTime = Date.now();
  let created = 0, updated = 0, errors = 0, skipped = 0;

  try {
    const products = await bling.fetchAllProducts();

    for (const blingProduct of products) {
      const sku = blingProduct.codigo || String(blingProduct.id);
      const name = blingProduct.descricao || '';
      if (!sku || !name) { skipped++; continue; }

      try {
        const suriProduct = mapBlingToSuri(blingProduct);
        const price = suriProduct.price;
        const imageUrl = suriProduct.images[0]?.url || null;

        // Check DB for existing product
        const existing = await prisma.product.findUnique({ where: { sku } });

        let result;
        if (existing?.suriId) {
          result = await suri.updateProduct(existing.suriId, suriProduct);
          if (result.ok) updated++;
          else if (result.status === 404) {
            // Product deleted from Suri, recreate
            result = await suri.createProduct(suriProduct);
            if (result.ok) created++;
            else errors++;
          } else {
            errors++;
          }
        } else {
          result = await suri.createProduct(suriProduct);
          if (result.ok) created++;
          else errors++;
        }

        // Update DB
        const suriId = result.data?.id || result.data?.providerId || existing?.suriId;
        const stock = blingProduct.estoques?.reduce((s, e) => s + (e.saldoVirtualTotal || 0), 0) || 0;

        await prisma.product.upsert({
          where: { sku },
          update: {
            blingId: String(blingProduct.id),
            suriId: suriId ? String(suriId) : undefined,
            name: name.slice(0, 200),
            price,
            stock: Math.floor(stock),
            imageUrl,
            syncedAt: new Date(),
          },
          create: {
            sku,
            blingId: String(blingProduct.id),
            suriId: suriId ? String(suriId) : null,
            name: name.slice(0, 200),
            price,
            stock: Math.floor(stock),
            imageUrl,
          },
        });

        // Rate limit between Suri calls
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    await prisma.syncLog.create({
      data: {
        type: 'product',
        action: 'sync',
        result: errors === 0 ? 'success' : 'error',
        message: `Created: ${created}, Updated: ${updated}, Errors: ${errors}, Skipped: ${skipped}`,
        details: `Duration: ${duration}s, Total: ${products.length}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: { total: products.length, created, updated, errors, skipped, duration: `${duration}s` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    await prisma.syncLog.create({
      data: { type: 'product', action: 'sync', result: 'error', message },
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
