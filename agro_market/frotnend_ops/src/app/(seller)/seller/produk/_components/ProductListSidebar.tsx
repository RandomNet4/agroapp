"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Package, ChevronRight, Loader2 } from "lucide-react";

import { productsApi, storesApi, formatRupiah } from "@/lib/ecommerce-api";
import { extractArray } from "@/lib/api-helpers";

interface Product {
  id: string;
  nama: string;
  namaEtalase?: string;
  gambarUrl?: string;
  harga: number;
  stok: number;
  status: string;
}

interface ProductListSidebarProps {
  currentProductId: string;
}

export default function ProductListSidebar({
  currentProductId,
}: ProductListSidebarProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch store first
        const storeRes = await storesApi.getMyStore();
        const storeData =
          extractArray(storeRes)[0] || storeRes?.data?.data || storeRes?.data;

        if (!storeData?.id) {
          console.warn("[ProductListSidebar] No store found");
          setLoading(false);
          return;
        }

        // Fetch all products from store
        const prodRes = await productsApi.getAllByStore(storeData.id, {
          limit: 100,
        });
        const dataArray = extractArray<Product>(prodRes);

        // Filter out current product and DRAFT status
        const filtered = dataArray.filter(
          (p: Product) => p.id !== currentProductId && p.status !== "DRAFT",
        );

        setProducts(filtered);
      } catch (error) {
        console.error("[ProductListSidebar] Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentProductId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Belum ada produk lain</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => router.push(`/seller/produk/${product.id}`)}
          className="w-full bg-white border border-gray-100 rounded-xl p-3 hover:border-emerald-200 hover:shadow-md transition-all group text-left"
        >
          <div className="flex gap-3">
            {/* Product Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
              {product.gambarUrl ? (
                <Image
                  src={product.gambarUrl}
                  alt={product.nama}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  📦
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                {product.namaEtalase || product.nama}
              </h3>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                {formatRupiah(product.harga)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    product.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.status}
                </span>
                <span className="text-[10px] text-gray-400">
                  Stok: {product.stok}
                </span>
              </div>
            </div>

            {/* Arrow Icon */}
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all self-center" />
          </div>
        </button>
      ))}
    </div>
  );
}
