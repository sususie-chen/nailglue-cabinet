import { useState } from "react";
import { X, Check, AlertTriangle, ImageIcon, Tag } from "lucide-react";
import { trpc } from "@/providers/trpc";
import type { RecognizedProduct } from "@db/schema";

interface Props {
  product: RecognizedProduct;
  onUpdate: (product: RecognizedProduct) => void;
  onRemove: () => void;
}

export default function RecognizedProductCard({
  product,
  onUpdate,
  onRemove,
}: Props) {
  const [brand, setBrand] = useState(product.brand);
  const [shadeCode, setShadeCode] = useState(product.shadeCode);
  const [isNailPolish, setIsNailPolish] = useState(product.isNailPolish);
  const [showRegion, setShowRegion] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const selectedTagIds = product.tagIds || [];

  const { data: allTags = [] } = trpc.tag.list.useQuery();

  const colorTags = allTags.filter((t) => t.type === "color");
  const functionTags = allTags.filter((t) => t.type === "function");

  const handleBrandChange = (value: string) => {
    setBrand(value);
    onUpdate({ ...product, brand: value });
  };

  const handleShadeCodeChange = (value: string) => {
    setShadeCode(value);
    onUpdate({ ...product, shadeCode: value });
  };

  const handleToggleNailPolish = () => {
    const next = !isNailPolish;
    setIsNailPolish(next);
    onUpdate({ ...product, isNailPolish: next });
  };

  const toggleTag = (tagId: number) => {
    const currentIds = product.tagIds || [];
    const next = currentIds.includes(tagId)
      ? currentIds.filter((id) => id !== tagId)
      : [...currentIds, tagId];
    onUpdate({ ...product, tagIds: next });
  };

  const hasContent = brand.trim() || shadeCode.trim();

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all ${
        !isNailPolish
          ? "border-red-100 bg-red-50/30"
          : hasContent
          ? "border-green-100"
          : "border-gray-100"
      }`}
    >
      <div className="p-4">
        <div className="flex gap-4">
          {/* Left thumbnail */}
          <div className="flex-shrink-0 space-y-2">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
              <img
                src={product.imageData}
                alt="产品小图"
                className="w-full h-full object-cover"
              />
            </div>
            {product.colorHex && (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
                  style={{ backgroundColor: product.colorHex }}
                />
                <span className="text-[10px] text-gray-400 font-mono">{product.colorHex}</span>
              </div>
            )}
          </div>

          {/* Right edit area */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Brand and shade code */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1 block">
                  品牌 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  placeholder="如：摩卡甲、樱禾..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1 block">
                  色号/规格 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={shadeCode}
                  onChange={(e) => handleShadeCodeChange(e.target.value)}
                  placeholder="如：有色建构底胶12..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleToggleNailPolish}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isNailPolish
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {isNailPolish ? (
                    <>
                      <Check className="w-3 h-3" />甲油胶
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" />非甲油胶
                    </>
                  )}
                </button>

                {product.regionImage && product.regionImage !== product.imageData && (
                  <button
                    onClick={() => setShowRegion(!showRegion)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      showRegion
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    {showRegion ? "隐藏原图" : "查看原图"}
                  </button>
                )}

                {(colorTags.length > 0 || functionTags.length > 0) && (
                  <button
                    onClick={() => setShowTags(!showTags)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      showTags || selectedTagIds.length > 0
                        ? "bg-pink-50 text-pink-700 border-pink-200"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {selectedTagIds.length > 0 ? `${selectedTagIds.length} 标签` : "标签"}
                  </button>
                )}
              </div>

              <button
                onClick={onRemove}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tag selector */}
            {showTags && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-3">
                {colorTags.length > 0 && (
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium mb-1.5 block">色系</span>
                    <div className="flex flex-wrap gap-1.5">
                      {colorTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
                            selectedTagIds.includes(tag.id)
                              ? "border-current shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          style={
                            selectedTagIds.includes(tag.id)
                              ? {
                                  backgroundColor: tag.colorHex ? `${tag.colorHex}22` : "#fce7f3",
                                  color: tag.colorHex || "#db2777",
                                  borderColor: tag.colorHex || "#f9a8d4",
                                }
                              : { color: tag.colorHex || "#6b7280" }
                          }
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.colorHex || "#d1d5db" }} />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {functionTags.length > 0 && (
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium mb-1.5 block">功能</span>
                    <div className="flex flex-wrap gap-1.5">
                      {functionTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2 py-1 rounded-full text-xs border transition-all ${
                            selectedTagIds.includes(tag.id)
                              ? "bg-purple-50 border-purple-300 text-purple-700"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected tags display */}
            {selectedTagIds.length > 0 && !showTags && (
              <div className="flex flex-wrap gap-1">
                {selectedTagIds.map((tagId) => {
                  const tag = allTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-pink-50 text-pink-700 border border-pink-200"
                    >
                      {tag.name}
                      <button onClick={() => toggleTag(tagId)} className="hover:text-pink-900"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Expanded region image */}
        {showRegion && product.regionImage && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 mb-2">截图中的原条目区域（供对照填写）</p>
            <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
              <img
                src={product.regionImage}
                alt="条目原图"
                className="w-full max-h-48 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      {hasContent && isNailPolish && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-100 rounded-b-xl">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-green-700">已填写: {brand.trim()} · {shadeCode.trim()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
