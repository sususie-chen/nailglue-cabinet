import { useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import type { Tag } from "@db/schema";

interface FilterBarProps {
  tags: Tag[];
  onSearch: (query: string) => void;
  onFilterByColor: (tagIds: number[]) => void;
  onFilterByFunction: (tagIds: number[]) => void;
  totalCount: number;
}

export default function FilterBar({
  tags,
  onSearch,
  onFilterByColor,
  onFilterByFunction,
  totalCount,
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColorTags, setSelectedColorTags] = useState<Set<number>>(new Set());
  const [selectedFunctionTags, setSelectedFunctionTags] = useState<Set<number>>(new Set());

  const colorTags = tags.filter((t) => t.type === "color");
  const functionTags = tags.filter((t) => t.type === "function");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const toggleColorTag = (tagId: number) => {
    const next = new Set(selectedColorTags);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedColorTags(next);
    onFilterByColor(Array.from(next));
  };

  const toggleFunctionTag = (tagId: number) => {
    const next = new Set(selectedFunctionTags);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedFunctionTags(next);
    onFilterByFunction(Array.from(next));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedColorTags(new Set());
    setSelectedFunctionTags(new Set());
    onSearch("");
    onFilterByColor([]);
    onFilterByFunction([]);
  };

  const hasActiveFilters =
    searchQuery || selectedColorTags.size > 0 || selectedFunctionTags.size > 0;

  return (
    <div className="space-y-3">
      {/* 搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索品牌、色号..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            showFilters || hasActiveFilters
              ? "bg-pink-50 border-pink-200 text-pink-600"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          筛选
          {hasActiveFilters && (
            <span className="ml-0.5 w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">
              {(selectedColorTags.size + selectedFunctionTags.size + (searchQuery ? 1 : 0))}
            </span>
          )}
          {showFilters ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
          {/* 色系筛选 */}
          {colorTags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                色系
              </h4>
              <div className="flex flex-wrap gap-2">
                {colorTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleColorTag(tag.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                      selectedColorTags.has(tag.id)
                        ? "border-current shadow-sm scale-105"
                        : "border-transparent bg-gray-50 hover:bg-gray-100"
                    }`}
                    style={
                      selectedColorTags.has(tag.id)
                        ? {
                            backgroundColor: tag.colorHex
                              ? `${tag.colorHex}22`
                              : "#fce7f3",
                            color: tag.colorHex || "#db2777",
                          }
                        : { color: tag.colorHex || "#6b7280" }
                    }
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-gray-200"
                      style={{ backgroundColor: tag.colorHex || "#d1d5db" }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 功能筛选 */}
          {functionTags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                功能
              </h4>
              <div className="flex flex-wrap gap-2">
                {functionTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleFunctionTag(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedFunctionTags.has(tag.id)
                        ? "bg-purple-50 border-purple-300 text-purple-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colorTags.length === 0 && functionTags.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              还没有标签，先去标签管理页创建一些吧
            </p>
          )}
        </div>
      )}

      {/* 结果统计 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          共 <span className="font-semibold text-gray-900">{totalCount}</span> 瓶甲油胶
        </p>
      </div>
    </div>
  );
}
