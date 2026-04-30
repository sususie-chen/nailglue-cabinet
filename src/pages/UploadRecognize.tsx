import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Wand2,
  Save,
  AlertCircle,
  RefreshCw,
  Camera,
  ImagePlus,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import {
  extractOrderItems,
  cropImageRegion,
  extractDominantColor,
  compressImage,
} from "@/utils/colorExtractor";
import type { RecognizedProduct } from "@db/schema";
import RecognizedProductCard from "@/components/RecognizedProductCard";

export default function UploadRecognize() {
  const navigate = useNavigate();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedProducts, setRecognizedProducts] = useState<
    RecognizedProduct[]
  >([]);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const utils = trpc.useUtils();
  const createBatch = trpc.product.createBatch.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setSaveStatus("success");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    },
    onError: (err) => {
      setSaveStatus("error");
      setErrorMsg(err.message || "保存失败");
    },
  });

  // OCR mutation
  const ocrBatch = trpc.ocr.recognizeBatch.useMutation();

  const processImage = useCallback(async (imageData: string) => {
    setIsProcessing(true);
    setRecognizedProducts([]);
    setErrorMsg("");

    try {
      const items = await extractOrderItems(imageData);

      if (items.length === 0) {
        const { extractColorRegions } = await import("@/utils/colorExtractor");
        const regions = await extractColorRegions(imageData);

        if (regions.length === 0) {
          const compressed = await compressImage(imageData, 400, 400);
          const color = await extractDominantColor(compressed);
          setRecognizedProducts([
            {
              id: `temp-${Date.now()}`,
              imageData: compressed,
              regionImage: compressed,
              brand: "",
              shadeCode: "",
              colorHex: color,
              isNailPolish: true,
            },
          ]);
        } else {
          const products: RecognizedProduct[] = [];
          for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            try {
              const cropped = await cropImageRegion(
                imageData,
                region.x,
                region.y,
                region.width,
                region.height
              );
              const compressed = await compressImage(cropped, 300, 300);
              const color = await extractDominantColor(compressed);
              products.push({
                id: `temp-${Date.now()}-${i}`,
                imageData: compressed,
                regionImage: compressed,
                brand: "",
                shadeCode: "",
                colorHex: color,
                isNailPolish: true,
              });
            } catch {
              // skip
            }
          }
          setRecognizedProducts(products);
        }
      } else {
        // Use order item detection
        const products: RecognizedProduct[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          try {
            const thumbImage = await cropImageRegion(
              imageData,
              item.thumbX,
              item.thumbY,
              item.thumbWidth,
              item.thumbHeight
            );
            const regionImage = await cropImageRegion(
              imageData,
              item.itemX,
              item.itemY,
              item.itemWidth,
              item.itemHeight
            );
            const compressedThumb = await compressImage(thumbImage, 250, 250);
            const compressedRegion = await compressImage(regionImage, 600, 400);

            products.push({
              id: `temp-${Date.now()}-${i}`,
              imageData: compressedThumb,
              regionImage: compressedRegion,
              brand: "",
              shadeCode: "",
              colorHex: item.color,
              isNailPolish: true,
            });
          } catch {
            // skip
          }
        }
        setRecognizedProducts(products);

        // Run OCR on each region image to extract text
        if (products.length > 0) {
          try {
            const ocrResults = await ocrBatch.mutateAsync({
              images: products.map((p) => p.regionImage),
            });

            setRecognizedProducts((prev) =>
              prev.map((p, idx) => {
                const ocr = ocrResults[idx];
                if (!ocr) return p;
                return {
                  ...p,
                  brand: ocr.brand || p.brand,
                  shadeCode: ocr.shadeCode || p.shadeCode,
                  shadeName: ocr.shadeName || p.shadeName,
                };
              })
            );
          } catch {
            // OCR failed silently - user can still fill manually
          }
        }
      }
    } catch (err) {
      console.error("Recognition failed:", err);
      setErrorMsg("识别过程出错，请尝试重新上传");
    } finally {
      setIsProcessing(false);
    }
  }, [ocrBatch]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset input value so same file can be selected again
      e.target.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
        await processImage(result);
      };
      reader.readAsDataURL(file);
    },
    [processImage]
  );

  const handleUpdateProduct = (updated: RecognizedProduct) => {
    setRecognizedProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleRemoveProduct = (id: string) => {
    setRecognizedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveAll = async () => {
    const validProducts = recognizedProducts.filter(
      (p) => p.isNailPolish && p.brand.trim() && p.shadeCode.trim()
    );

    if (validProducts.length === 0) {
      setErrorMsg("请至少为一个产品填写品牌和色号");
      return;
    }

    setSaveStatus("saving");
    setErrorMsg("");

    const productsToSave = validProducts.map((p) => ({
      brand: p.brand.trim(),
      shadeCode: p.shadeCode.trim(),
      shadeName: p.shadeName?.trim() || undefined,
      colorHex: p.colorHex || "#CCCCCC",
      swatchImages: [p.imageData],
      tagIds: p.tagIds || [],
    }));

    createBatch.mutate(productsToSave);
  };

  const validCount = recognizedProducts.filter(
    (p) => p.isNailPolish && p.brand.trim() && p.shadeCode.trim()
  ).length;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="text-base font-semibold text-gray-900">上传订单截图</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {["上传截图", "确认识别", "保存入库"].map((step, i) => {
            let active = false;
            if (i === 0) active = true;
            if (i === 1 && !isProcessing && recognizedProducts.length > 0) active = true;
            if (i === 2 && saveStatus === "success") active = true;
            return (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${active ? "bg-pink-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? "text-pink-600" : "text-gray-400"}`}>{step}</span>
                {i < 2 && <div className="w-6 h-px bg-gray-200 mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Upload area - dual button for camera vs gallery */}
        {!uploadedImage ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-white">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mb-3">
              <ImagePlus className="w-7 h-7 text-pink-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-4">上传订单截图</p>
            <div className="flex gap-3">
              {/* Gallery button */}
              <label className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-pink-600 active:scale-95 transition-all">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Camera className="w-4 h-4" />
                相册
              </label>
              {/* Camera button */}
              <label className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-200 active:scale-95 transition-all">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Camera className="w-4 h-4" />
                拍照
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-3">支持小红书/淘宝/京东等电商订单</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white">
              <img
                src={uploadedImage}
                alt="订单截图"
                className="w-full max-h-56 object-contain"
              />
              <button
                onClick={() => {
                  setUploadedImage(null);
                  setRecognizedProducts([]);
                  setSaveStatus("idle");
                  setErrorMsg("");
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-xs font-medium text-gray-600 hover:bg-white shadow-sm transition-colors"
              >
                重新上传
              </button>
            </div>

            {/* Processing */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-pink-400 animate-spin mb-3" />
                <p className="text-sm text-gray-600 font-medium">正在分析订单截图...</p>
                <p className="text-xs text-gray-400 mt-1">检测产品条目并提取文字信息</p>
              </div>
            )}

            {/* Results */}
            {!isProcessing && recognizedProducts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">识别结果</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      检测到 {recognizedProducts.length} 个产品，已尝试提取文字信息
                    </p>
                  </div>
                  <span className="text-xs bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full font-medium">
                    可保存 {validCount}/{recognizedProducts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {recognizedProducts.map((product) => (
                    <RecognizedProductCard
                      key={product.id}
                      product={product}
                      onUpdate={handleUpdateProduct}
                      onRemove={() => handleRemoveProduct(product.id)}
                    />
                  ))}
                </div>

                {/* Save button */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  {saveStatus === "success" && (
                    <div className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-xl">
                      <Save className="w-5 h-5" />
                      <span className="text-sm font-medium">保存成功！正在跳转...</span>
                    </div>
                  )}
                  {saveStatus === "error" && (
                    <div className="flex items-center gap-2 py-3 px-4 bg-red-50 text-red-700 rounded-xl">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{errorMsg || "保存失败，请重试"}</span>
                    </div>
                  )}
                  {errorMsg && saveStatus === "idle" && (
                    <div className="flex items-center gap-2 py-2 px-4 bg-amber-50 text-amber-700 rounded-xl">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">{errorMsg}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus !== "idle" || validCount === 0}
                    className="w-full py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {saveStatus === "saving" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        保存 {validCount} 个产品到库
                      </>
                    )}
                  </button>
                  {validCount === 0 && recognizedProducts.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">请为至少一个产品填写品牌和色号</p>
                  )}
                </div>
              </div>
            )}

            {/* No results */}
            {!isProcessing && recognizedProducts.length === 0 && uploadedImage && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">未检测到产品条目</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">未能自动识别出订单中的产品，建议上传更清晰的截图</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (uploadedImage) await processImage(uploadedImage);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-medium hover:bg-pink-100 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重新识别
                  </button>
                  <button
                    onClick={async () => {
                      if (!uploadedImage) return;
                      const compressed = await compressImage(uploadedImage, 400, 400);
                      const color = await extractDominantColor(compressed);
                      setRecognizedProducts([
                        {
                          id: `temp-${Date.now()}`,
                          imageData: compressed,
                          regionImage: compressed,
                          brand: "",
                          shadeCode: "",
                          colorHex: color,
                          isNailPolish: true,
                        },
                      ]);
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    使用整张图片
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {!uploadedImage && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              识别说明
            </h4>
            <ul className="text-xs text-blue-600 space-y-1.5 list-disc list-inside">
              <li>支持小红书、淘宝、京东等电商平台的订单截图</li>
              <li>系统会自动检测订单中的产品条目并提取文字</li>
              <li>识别后请核对每个产品的品牌和色号</li>
              <li>非甲油胶产品可以标记为"非甲油胶"或直接删除</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
