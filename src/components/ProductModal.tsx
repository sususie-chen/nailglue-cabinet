import { useState, useEffect } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import type { Product } from "@db/schema";
import SwatchNail from "./SwatchNail";
import { trpc } from "@/providers/trpc";

interface ProductModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductModal({
  product,
  isOpen,
  onClose,
  onSave,
}: ProductModalProps) {
  const [brand, setBrand] = useState("");
  const [shadeCode, setShadeCode] = useState("");
  const [shadeName, setShadeName] = useState("");
  const [colorHex, setColorHex] = useState("#CCCCCC");
  const [note, setNote] = useState("");
  const [swatchImages, setSwatchImages] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);

  const utils = trpc.useUtils();
  const { data: allTags = [] } = trpc.tag.list.useQuery();
  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      onSave();
      onClose();
    },
  });
  const updateProduct = trpc.product.update.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      onSave();
      onClose();
    },
  });

  useEffect(() => {
    if (product) {
      setBrand(product.brand);
      setShadeCode(product.shadeCode);
      setShadeName(product.shadeName || "");
      setColorHex(product.colorHex);
      setNote(product.note || "");
      try {
        const imgs = JSON.parse((product.swatchImages as string) || "[]") as string[];
        setSwatchImages(imgs);
      } catch {
        setSwatchImages([]);
      }
      // Load existing tag IDs from product.tagList
      const existingTagIds = (product as { tagList?: Array<{ id: number }> }).tagList?.map((t) => t.id) || [];
      setSelectedTagIds(existingTagIds);
    } else {
      setBrand("");
      setShadeCode("");
      setShadeName("");
      setColorHex("#CCCCCC");
      setNote("");
      setSwatchImages([]);
      setSelectedTagIds([]);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const colorTags = allTags.filter((t) => t.type === "color");
  const functionTags = allTags.filter((t) => t.type === "function");

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !shadeCode.trim()) return;

    const data = {
      brand: brand.trim(),
      shadeCode: shadeCode.trim(),
      shadeName: shadeName.trim() || undefined,
      colorHex,
      note: note.trim() || undefined,
      swatchImages,
      tagIds: selectedTagIds,
    };

    if (product) {
      updateProduct.mutate({ id: product.id, ...data });
    } else {
      createProduct.mutate(data);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setSwatchImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSwatchImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {product ? "编辑产品" : "添加产品"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 试色预览 */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
              <SwatchNail
                color={colorHex}
                size={72}
                imageUrl={swatchImages[0] || undefined}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                颜色
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
          </div>

          {/* 品牌 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              品牌 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="如：OPI、CND、樱禾..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* 色号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              色号 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={shadeCode}
              onChange={(e) => setShadeCode(e.target.value)}
              placeholder="如：N25、G001..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* 颜色名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              颜色名称
            </label>
            <input
              type="text"
              value={shadeName}
              onChange={(e) => setShadeName(e.target.value)}
              placeholder="如：裸粉色、宝石红..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
            />
          </div>

          {/* 标签选择 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                标签
              </label>
              <button
                type="button"
                onClick={() => setShowTagSelector(!showTagSelector)}
                className="text-xs text-pink-500 hover:text-pink-600 flex items-center gap-1"
              >
                <TagIcon className="w-3 h-3" />
                {showTagSelector ? "收起" : "选择"}
              </button>
            </div>

            {showTagSelector && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
                {colorTags.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 mb-1.5 block">色系</span>
                    <div className="flex flex-wrap gap-1.5">
                      {colorTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                            selectedTagIds.includes(tag.id)
                              ? "border-current shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                          style={
                            selectedTagIds.includes(tag.id)
                              ? {
                                  backgroundColor: tag.colorHex
                                    ? `${tag.colorHex}22`
                                    : "#fce7f3",
                                  color: tag.colorHex || "#db2777",
                                  borderColor: tag.colorHex || "#f9a8d4",
                                }
                              : { color: tag.colorHex || "#6b7280" }
                          }
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: tag.colorHex || "#d1d5db",
                            }}
                          />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {functionTags.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 mb-1.5 block">功能</span>
                    <div className="flex flex-wrap gap-1.5">
                      {functionTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
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

            {selectedTagIds.length > 0 && !showTagSelector && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTagIds.map((tagId) => {
                  const tag = allTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-pink-50 text-pink-700 border border-pink-200"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => toggleTag(tagId)}
                        className="hover:text-pink-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 试色图上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              试色图
            </label>
            <div className="flex flex-wrap gap-2">
              {swatchImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group"
                >
                  <img
                    src={img}
                    alt={`试色 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 transition-colors">
                <Plus className="w-5 h-5 text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录一些备注信息..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!brand.trim() || !shadeCode.trim() || createProduct.isPending || updateProduct.isPending}
              className="flex-1 px-4 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createProduct.isPending || updateProduct.isPending
                ? "保存中..."
                : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
