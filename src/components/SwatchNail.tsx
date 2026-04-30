import { useMemo } from "react";
import { generateNailSVG, svgToDataURL } from "@/utils/colorExtractor";

interface SwatchNailProps {
  color: string;
  shape?: "oval" | "square" | "almond" | "stiletto";
  size?: number;
  imageUrl?: string;
  className?: string;
}

export default function SwatchNail({
  color,
  shape = "oval",
  size = 120,
  imageUrl,
  className = "",
}: SwatchNailProps) {
  const displayUrl = useMemo(() => {
    if (imageUrl) return imageUrl;
    const svg = generateNailSVG(color, shape, size);
    return svgToDataURL(svg);
  }, [color, shape, size, imageUrl]);

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={displayUrl}
        alt="甲片试色"
        className="w-full h-full object-contain"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
