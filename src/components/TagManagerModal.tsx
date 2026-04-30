import { useState } from "react";
import { X, Plus, Trash2, Palette, Wrench, Hash } from "lucide-react";
import { trpc } from "@/providers/trpc";

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  // Reds
  "#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#F87171", "#FCA5A5", "#FECACA", "#FFE4E6",
  // Oranges
  "#F97316", "#EA580C", "#C2410C", "#9A3412", "#FB923C", "#FDBA74", "#FED7AA",
  // Yellows
  "#F59E0B", "#D97706", "#B45309", "#FBBF24", "#FCD34D", "#FDE68A", "#FEF3C7",
  // Greens
  "#22C55E", "#16A34A", "#15803D", "#166534", "#4ADE80", "#86EFAC", "#BBF7D0",
  // Teals
  "#14B8A6", "#0D9488", "#0F766E", "#115E59", "#2DD4BF", "#5EEAD4",
  // Blues
  "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE",
  // Purples
  "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#A78BFA", "#C4B5FD", "#DDD6FE",
  // Pinks
  "#EC4899", "#DB2777", "#BE185D", "#9D174D", "#F472B6", "#F9A8D4", "#FBCFE8",
  // Browns / Nudes
  "#92400E", "#B45309", "#D97706", "#78350F", "#451A03",
  // Grays / Blacks / Whites
  "#18181B", "#27272A", "#3F3F46", "#52525B", "#71717A", "#A1A1AA", "#D4D4D8", "#E4E4E7", "#F4F4F5", "#FAFAFA", "#FFFFFF",
];

const PRESET_FUNCTIONS = [
  "建构", "纯色", "猫眼", "闪粉", "极光",
  "温变", "夜光", "磨砂", "透色", "亮片",
  "珠光", "哑光", "拉丝", "晕染", "彩绘",
  "法式", "渐变", "魔镜粉", "贝壳", "玻璃",
];

export default function TagManagerModal({ isOpen, onClose }: TagManagerModalProps) {
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#EF4444");
  const [customHexInput, setCustomHexInput] = useState("#EF4444");
  const [newFunctionName, setNewFunctionName] = useState("");
  const [activeTab, setActiveTab] = useState<"color" | "function">("color");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const utils = trpc.useUtils();
  const { data: tags = [] } = trpc.tag.list.useQuery();
  const createTag = trpc.tag.create.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.product.list.invalidate();
    },
  });
  const deleteTag = trpc.tag.delete.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.product.list.invalidate();
    },
  });

  if (!isOpen) return null;

  const colorTags = tags.filter((t) => t.type === "color");
  const functionTags = tags.filter((t) => t.type === "function");

  const handleAddColorTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim()) return;
    createTag.mutate({
      name: newColorName.trim(),
      type: "color",
      colorHex: newColorHex,
    });
    setNewColorName("");
  };

  const handleAddFunctionTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunctionName.trim()) return;
    createTag.mutate({
      name: newFunctionName.trim(),
      type: "function",
    });
    setNewFunctionName("");
  };

  const addPresetFunction = (name: string) => {
    if (functionTags.some((t) => t.name === name)) return;
    createTag.mutate({ name, type: "function" });
  };

  const handleCustomHexChange = (value: string) => {
    setCustomHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setNewColorHex(value);
    }
  };

  const handleColorPickerChange = (value: string) => {
    setNewColorHex(value);
    setCustomHexInput(value);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">标签管理</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("color")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "color"
                ? "border-pink-400 text-pink-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Palette className="w-4 h-4" />
            色系
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {colorTags.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("function")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "function"
                ? "border-purple-400 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Wrench className="w-4 h-4" />
            功能
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {functionTags.length}
            </span>
          </button>
        </div>

        <div className="p-5">
          {activeTab === "color" ? (
            <div className="space-y-4">
              {/* 添加色系标签 */}
              <form onSubmit={handleAddColorTag} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm"
                      style={{ backgroundColor: newColorHex }}
                    />
                    {showColorPicker && (
                      <div className="absolute top-12 left-0 z-10 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-72">
                        {/* 预设颜色网格 */}
                        <div className="grid grid-cols-8 gap-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                handleColorPickerChange(color);
                              }}
                              className={`w-7 h-7 rounded-md border transition-all hover:scale-110 ${
                                newColorHex === color
                                  ? "border-gray-900 scale-110 ring-2 ring-gray-900 ring-offset-1"
                                  : "border-gray-200"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {/* 自定义颜色输入 */}
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={newColorHex}
                              onChange={(e) => handleColorPickerChange(e.target.value)}
                              className="w-10 h-10 rounded cursor-pointer border border-gray-200 flex-shrink-0"
                            />
                            <div className="flex-1 flex items-center gap-2">
                              <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <input
                                type="text"
                                value={customHexInput}
                                onChange={(e) => handleCustomHexChange(e.target.value)}
                                placeholder="#FF6B9D"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                                maxLength={7}
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            输入 HEX 色值如 #FF6B9D，或点击色块选择
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="输入色系名称（如：正红、裸色...）"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <button
                    type="submit"
                    disabled={!newColorName.trim() || createTag.isPending}
                    className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {/* 当前选中颜色预览 */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: newColorHex }}
                  />
                  <span className="text-xs text-gray-500 font-mono">{newColorHex}</span>
                  <span className="text-xs text-gray-400">- 将要创建的颜色</span>
                </div>
              </form>

              {/* 色系标签列表 */}
              <div className="space-y-2 max-h-72 overflow-auto">
                {colorTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                        style={{ backgroundColor: tag.colorHex || "#ccc" }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {tag.name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {tag.colorHex || ""}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTag.mutate({ id: tag.id })}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {colorTags.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    还没有色系标签，添加一个吧
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 添加功能标签 */}
              <form onSubmit={handleAddFunctionTag} className="flex gap-2">
                <input
                  type="text"
                  value={newFunctionName}
                  onChange={(e) => setNewFunctionName(e.target.value)}
                  placeholder="输入功能名称（如：猫眼、温变...）"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <button
                  type="submit"
                  disabled={!newFunctionName.trim() || createTag.isPending}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* 预设功能标签 */}
              <div>
                <span className="text-xs text-gray-500 mb-2 block">快速添加</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_FUNCTIONS.map((name) => {
                    const exists = functionTags.some((t) => t.name === name);
                    return (
                      <button
                        key={name}
                        onClick={() => addPresetFunction(name)}
                        disabled={exists}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                          exists
                            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600"
                        }`}
                      >
                        {exists ? "✓ " : "+ "}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 功能标签列表 */}
              <div className="space-y-2 max-h-60 overflow-auto">
                {functionTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {tag.name}
                    </span>
                    <button
                      onClick={() => deleteTag.mutate({ id: tag.id })}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {functionTags.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    还没有功能标签，添加一个吧
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
