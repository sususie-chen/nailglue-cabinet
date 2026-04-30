import { useState, useCallback } from "react";
import { X, Upload, Wand2, Check } from "lucide-react";
import {
  extractDominantColor,
  generateNailSVG,
  svgToDataURL,
} from "@/utils/colorExtractor";

interface SwatchGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (dataUrl: string, colorHex: string) => void;
}

type NailShape = "oval" | "square" | "almond" | "stiletto";

const SHAPES: { value: NailShape; label: string }[] = [
  { value: "oval", label: "椭圆" },
  { value: "square", label: "方形" },
  { value: "almond", label: "杏仁" },
  { value: "stiletto", label: "尖形" },
];

const BG_OPTIONS = [
  { value: "white", label: "白色", color: "#FFFFFF" },
  { value: "black", label: "黑色", color: "#1A1A2E" },
  { value: "gray", label: "灰色", color: "#F3F4F6" },
  { value: "transparent", label: "透明", color: "transparent" },
];

export default function SwatchGenerator({
  isOpen,
  onClose,
  onGenerated,
}: SwatchGeneratorProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [extractedColor, setExtractedColor] = useState<string>("#CCCCCC");
  const [shape, setShape] = useState<NailShape>("oval");
  const [bgType, setBgType] = useState("white");
  const [brightness] = useState(100);
  const [saturation] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
        setIsProcessing(true);

        try {
          const color = await extractDominantColor(result);
          setExtractedColor(color);

          // 生成甲片预览
          const svg = generateNailSVG(color, shape);
          setGeneratedImage(svgToDataURL(svg));
        } catch (err) {
          console.error("Color extraction failed:", err);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [shape]
  );

  const regeneratePreview = useCallback(() => {
    if (!extractedColor) return;

    let adjustedColor = extractedColor;
    const rgb = hexToRgb(extractedColor);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      hsl.l = Math.max(0, Math.min(100, hsl.l * (brightness / 100)));
      hsl.s = Math.max(0, Math.min(100, hsl.s * (saturation / 100)));
      adjustedColor = hslToHex(hsl.h, hsl.s, hsl.l);
    }

    const svg = generateNailSVG(adjustedColor, shape);
    setGeneratedImage(svgToDataURL(svg));
  }, [extractedColor, shape, brightness, saturation]);

  // 参数变化时重新生成
  useState(() => {
    regeneratePreview();
  });

  const handleConfirm = () => {
    if (generatedImage) {
      let finalColor = extractedColor;
      const rgb = hexToRgb(extractedColor);
      if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.l = Math.max(0, Math.min(100, hsl.l * (brightness / 100)));
        hsl.s = Math.max(0, Math.min(100, hsl.s * (saturation / 100)));
        finalColor = hslToHex(hsl.h, hsl.s, hsl.l);
      }
      onGenerated(generatedImage, finalColor);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">生成试色图</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 上传区域 */}
          {!uploadedImage ? (
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50/30 transition-all">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">上传试色照片</span>
              <span className="text-xs text-gray-400 mt-1">
                支持 JPG、PNG 格式
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex gap-3">
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                <img
                  src={uploadedImage}
                  alt="上传的试色"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">提取的颜色</p>
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: extractedColor }}
                  />
                  <span className="text-sm font-mono text-gray-500">
                    {extractedColor}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setGeneratedImage(null);
                  }}
                  className="mt-2 text-xs text-pink-500 hover:text-pink-600"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}

          {/* 甲片形状选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              甲片形状
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setShape(s.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    shape === s.value
                      ? "bg-pink-50 border-pink-300 text-pink-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 背景选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              背景
            </label>
            <div className="flex gap-2">
              {BG_OPTIONS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setBgType(bg.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border transition-all ${
                    bgType === bg.value
                      ? "border-pink-300 bg-pink-50 text-pink-700 font-medium"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-gray-200 mr-1"
                    style={{
                      backgroundColor: bg.color === "transparent" ? "#e5e7eb" : bg.color,
                    }}
                  />
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 预览区域 */}
          {generatedImage && (
            <div
              className="flex items-center justify-center py-6 rounded-xl border border-gray-100"
              style={{
                backgroundColor:
                  BG_OPTIONS.find((b) => b.value === bgType)?.color || "#FFFFFF",
              }}
            >
              <img
                src={generatedImage}
                alt="甲片预览"
                className="w-32 h-32 object-contain drop-shadow-md"
              />
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!generatedImage}
              className="flex-1 px-4 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Wand2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  确认添加
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 颜色转换工具函数
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
