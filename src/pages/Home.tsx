import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Upload,
  Tag,
  LogOut,
  Dices,
  Sparkles,
  ChevronRight,
  LogIn,
  Loader2,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import ProductCard from "@/components/ProductCard";
import FilterBar from "@/components/FilterBar";
import ProductModal from "@/components/ProductModal";
import TagManagerModal from "@/components/TagManagerModal";
import SwatchGenerator from "@/components/SwatchGenerator";

// 产品类型（包含标签）
interface ProductWithTags {
  id: number;
  userId: number;
  brand: string;
  shadeCode: string;
  shadeName: string | null;
  colorHex: string;
  note: string | null;
  swatchImages: string | null;
  createdAt: Date;
  updatedAt: Date;
  tagList?: Array<{
    id: number;
    userId: number;
    name: string;
    type: "color" | "function";
    colorHex: string | null;
    createdAt: Date;
  }>;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColorTagIds, setSelectedColorTagIds] = useState<number[]>([]);
  const [selectedFunctionTagIds, setSelectedFunctionTagIds] = useState<number[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithTags | undefined>(undefined);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showSwatchGenerator, setShowSwatchGenerator] = useState(false);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [randomProduct, setRandomProduct] = useState<ProductWithTags | null>(null);

  const utils = trpc.useUtils();
  const { data: rawProducts = [], isLoading: productsLoading } = trpc.product.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: allTags = [] } = trpc.tag.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const deleteProduct = trpc.product.delete.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
    },
  });

  // 类型转换
  const products = rawProducts as unknown as ProductWithTags[];

  // 筛选逻辑
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.brand.toLowerCase().includes(query) ||
          p.shadeCode.toLowerCase().includes(query) ||
          (p.shadeName && p.shadeName.toLowerCase().includes(query))
      );
    }

    if (selectedColorTagIds.length > 0) {
      result = result.filter((p) =>
        p.tagList?.some((t: { id: number }) => selectedColorTagIds.includes(t.id))
      );
    }

    if (selectedFunctionTagIds.length > 0) {
      result = result.filter((p) =>
        p.tagList?.some((t: { id: number }) => selectedFunctionTagIds.includes(t.id))
      );
    }

    return result;
  }, [products, searchQuery, selectedColorTagIds, selectedFunctionTagIds]);

  // 已登录状态继续下方...

  const handleDeleteProduct = (id: number) => {
    if (confirm("确定要删除这个产品吗？")) {
      deleteProduct.mutate({ id });
    }
  };

  const handleRandomPick = () => {
    if (filteredProducts.length === 0) return;
    const random =
      filteredProducts[Math.floor(Math.random() * filteredProducts.length)];
    setRandomProduct(random);
    setShowRandomPicker(true);
  };

  // ===== 未登录状态 =====
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* 导航栏 */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  甲油胶仓库
                </h1>
                <p className="text-[11px] text-gray-400 leading-tight">
                  你的色彩收藏夹
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              登录
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-pink-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              管理你的甲油胶收藏
            </h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              上传订单截图自动识别产品，<br />
              再也不怕深色瓶子忘记颜色了
            </p>

            <div className="grid grid-cols-3 gap-4 w-full mb-8">
              {[
                { icon: Upload, label: "订单识别", desc: "截图自动提取" },
                { icon: Tag, label: "色系统计", desc: "一目了然" },
                { icon: Dices, label: "随机选色", desc: "告别选择困难" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white rounded-2xl border border-gray-100 p-4 text-center"
                >
                  <item.icon className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-8 py-3 bg-pink-500 text-white rounded-2xl text-base font-medium hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200"
            >
              <LogIn className="w-5 h-5" />
              立即登录使用
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ===== 认证中 =====
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // ===== 已登录状态 =====
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* 导航栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                甲油胶仓库
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight">
                你的色彩收藏夹
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.name || ""}
                    className="w-7 h-7 rounded-full border border-gray-200"
                  />
                )}
                <span className="text-sm text-gray-600">{user.name}</span>
              </div>
            )}
            <button
              onClick={() => setShowTagManager(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Tag className="w-4 h-4" />
              标签
            </button>
            <button
              onClick={handleRandomPick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Dices className="w-4 h-4" />
              随机
            </button>
            <button
              onClick={() => navigate("/upload")}
              className="flex items-center gap-1.5 px-3 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-medium hover:bg-pink-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">上传订单</span>
            </button>
            <button
              onClick={() => {
                setEditingProduct(undefined);
                setShowProductModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">添加</span>
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              title="退出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 筛选栏 */}
        <FilterBar
          tags={allTags}
          onSearch={setSearchQuery}
          onFilterByColor={setSelectedColorTagIds}
          onFilterByFunction={setSelectedFunctionTagIds}
          totalCount={filteredProducts.length}
        />

        {/* 产品网格 */}
        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={(p) => {
                  setEditingProduct(p as ProductWithTags);
                  setShowProductModal(true);
                }}
                onDelete={handleDeleteProduct}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-pink-50 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-pink-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {products.length === 0
                ? "还没有甲油胶"
                : "没有找到匹配的产品"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              {products.length === 0
                ? "上传订单截图或手动添加你的第一瓶甲油胶吧"
                : "尝试调整筛选条件或搜索关键词"}
            </p>
            {products.length === 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/upload")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  上传订单截图
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(undefined);
                    setShowProductModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  手动添加
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部移动端快捷操作 */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 flex gap-2 z-40">
        <button
          onClick={() => setShowTagManager(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-white text-gray-700 rounded-xl text-sm font-medium border border-gray-200 shadow-lg"
        >
          <Tag className="w-4 h-4" />
          标签
        </button>
        <button
          onClick={() => navigate("/upload")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-pink-50 text-pink-600 rounded-xl text-sm font-medium border border-pink-200 shadow-lg shadow-pink-100"
        >
          <Upload className="w-4 h-4" />
          上传
        </button>
        <button
          onClick={() => {
            setEditingProduct(undefined);
            setShowProductModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-pink-200"
        >
          <Plus className="w-4 h-4" />
          添加
        </button>
      </div>

      {/* 产品编辑弹窗 */}
      <ProductModal
        product={editingProduct || null}
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(undefined);
        }}
        onSave={() => {}}
      />

      {/* 标签管理弹窗 */}
      <TagManagerModal
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
      />

      {/* 试色图生成弹窗 */}
      <SwatchGenerator
        isOpen={showSwatchGenerator}
        onClose={() => setShowSwatchGenerator(false)}
        onGenerated={(_dataUrl, _colorHex) => {
          console.log("Generated:", _colorHex);
        }}
      />

      {/* 随机选色弹窗 */}
      {showRandomPicker && randomProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Dices className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                今天试试这个颜色！
              </h3>
              <div className="mt-4 mb-4">
                <div
                  className="w-24 h-24 rounded-2xl mx-auto border-2 border-gray-100 shadow-inner"
                  style={{
                    backgroundColor: randomProduct.colorHex,
                    boxShadow: `0 8px 32px ${randomProduct.colorHex}44`,
                  }}
                />
              </div>
              <p className="font-semibold text-gray-900">
                {randomProduct.brand}
              </p>
              <p className="text-sm text-gray-500 font-mono">
                {randomProduct.shadeCode}
              </p>
              {randomProduct.shadeName && (
                <p className="text-xs text-gray-400 mt-1">
                  {randomProduct.shadeName}
                </p>
              )}
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={handleRandomPick}
                className="flex-1 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
              >
                换一个
              </button>
              <button
                onClick={() => setShowRandomPicker(false)}
                className="flex-1 py-3 text-sm font-medium text-pink-600 hover:bg-pink-50 transition-colors flex items-center justify-center gap-1"
              >
                好的
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
