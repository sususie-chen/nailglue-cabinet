import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Product, Tag } from "@db/schema";
import SwatchNail from "./SwatchNail";
import { generateNailSVG, svgToDataURL } from "@/utils/colorExtractor";

interface ProductWithTags extends Product {
  tagList?: Tag[];
}

interface ProductCardProps {
  product: ProductWithTags;
  onEdit?: (product: ProductWithTags) => void;
  onDelete?: (id: number) => void;
  onClick?: (product: ProductWithTags) => void;
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onClick,
}: ProductCardProps) {
  const swatchImage = useMemo(() => {
    if (product.swatchImages) {
      try {
        const images = JSON.parse(product.swatchImages as string) as string[];
        if (images.length > 0) return images[0];
      } catch {
        // ignore
      }
    }
    return null;
  }, [product.swatchImages]);

  const colorTags = product.tagList?.filter((t) => t.type === "color") || [];
  const functionTags = product.tagList?.filter((t) => t.type === "function") || [];

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      onClick={() => onClick?.(product)}
    >
      {/* 试色展示区域 */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
        {swatchImage ? (
          <img
            src={swatchImage}
            alt={`${product.brand} ${product.shadeCode}`}
            className="w-full h-full object-contain"
            onError={(e) => {
              // 图片加载失败时显示甲片
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const svg = generateNailSVG(product.colorHex, "oval", 120);
                const nailImg = document.createElement("img");
                nailImg.src = svgToDataURL(svg);
                nailImg.className = "w-full h-full object-contain";
                nailImg.alt = `${product.brand} ${product.shadeCode}`;
                parent.appendChild(nailImg);
              }
            }}
          />
        ) : (
          <SwatchNail color={product.colorHex} size={120} />
        )}

        {/* 悬停操作按钮 */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors"
              title="编辑"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-600" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product.id);
              }}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* 产品信息 */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {product.brand}
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {product.shadeCode}
            </p>
            {product.shadeName && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {product.shadeName}
              </p>
            )}
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mt-2">
          {colorTags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border"
              style={{
                backgroundColor: tag.colorHex ? `${tag.colorHex}18` : "#f3f4f6",
                borderColor: tag.colorHex || "#e5e7eb",
                color: tag.colorHex || "#6b7280",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tag.colorHex || "#9ca3af" }}
              />
              {tag.name}
            </span>
          ))}
          {functionTags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
