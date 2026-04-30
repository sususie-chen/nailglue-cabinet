/**
 * 颜色提取与订单截图分析工具
 */

export interface ColorRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  confidence: number;
}

export interface OrderItem {
  thumbX: number;
  thumbY: number;
  thumbWidth: number;
  thumbHeight: number;
  itemX: number;
  itemY: number;
  itemWidth: number;
  itemHeight: number;
  color: string;
}

/**
 * 加载图片
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 压缩图片到指定尺寸
 */
export async function compressImage(
  imageSrc: string,
  maxWidth: number = 300,
  maxHeight: number = 300,
  quality: number = 0.85
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");

  // 计算缩放比例
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * 从图片提取主色调
 */
export async function extractDominantColor(imageSrc: string): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const size = 80;
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size).data;

  const pixels: Array<[number, number, number]> = [];
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    if (a < 200) continue;
    const brightness = (r + g + b) / 3;
    if (brightness > 245 || brightness < 15) continue;

    pixels.push([r, g, b]);
  }

  if (pixels.length === 0) return "#CCCCCC";

  // 使用中位数颜色而不是平均值（更准确）
  pixels.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const mid = Math.floor(pixels.length / 2);
  return rgbToHex(pixels[mid][0], pixels[mid][1], pixels[mid][2]);
}

/**
 * 从电商订单截图中提取产品条目
 * 基于左侧产品小图检测 + 条目边界分析
 */
export async function extractOrderItems(
  imageSrc: string
): Promise<OrderItem[]> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // 缩小到处理友好的尺寸
  const processWidth = 600;
  const scale = processWidth / img.width;
  const processHeight = Math.round(img.height * scale);

  canvas.width = processWidth;
  canvas.height = processHeight;
  ctx.drawImage(img, 0, 0, processWidth, processHeight);

  const imageData = ctx.getImageData(0, 0, processWidth, processHeight).data;

  // 计算背景色（取图片顶部10%区域的平均颜色）
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  const topRegionHeight = Math.floor(processHeight * 0.1);
  for (let y = 0; y < topRegionHeight; y++) {
    for (let x = 0; x < processWidth; x++) {
      const idx = (y * processWidth + x) * 4;
      bgR += imageData[idx];
      bgG += imageData[idx + 1];
      bgB += imageData[idx + 2];
      bgCount++;
    }
  }
  bgR = Math.round(bgR / bgCount);
  bgG = Math.round(bgG / bgCount);
  bgB = Math.round(bgB / bgCount);

  // 判断像素是否为背景
  const isBackground = (r: number, g: number, b: number) => {
    const dr = Math.abs(r - bgR);
    const dg = Math.abs(g - bgG);
    const db = Math.abs(b - bgB);
    return dr < 25 && dg < 25 && db < 25;
  };

  // 步骤1: 检测左侧的产品小图区域
  // 从上到下扫描，找左侧有明显内容的连续行
  const leftScanWidth = Math.floor(processWidth * 0.35); // 扫描左35%区域
  const minThumbSize = 40;
  const thumbRows: Array<{ y: number; contentCount: number; startX: number; endX: number }> = [];

  for (let y = 0; y < processHeight; y++) {
    let contentCount = 0;
    let startX = -1;
    let endX = -1;

    for (let x = 0; x < leftScanWidth; x++) {
      const idx = (y * processWidth + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      if (!isBackground(r, g, b)) {
        contentCount++;
        if (startX === -1) startX = x;
        endX = x;
      }
    }

    if (contentCount > minThumbSize) {
      thumbRows.push({ y, contentCount, startX, endX });
    }
  }

  if (thumbRows.length === 0) return [];

  // 步骤2: 将连续的行分组为产品小图
  const thumbs: Array<{ x: number; y: number; w: number; h: number }> = [];
  let currentGroup: typeof thumbRows = [];

  for (let i = 0; i < thumbRows.length; i++) {
    if (i === 0 || thumbRows[i].y - thumbRows[i - 1].y <= 3) {
      currentGroup.push(thumbRows[i]);
    } else {
      // 结束当前组
      if (currentGroup.length >= minThumbSize) {
        const minY = currentGroup[0].y;
        const maxY = currentGroup[currentGroup.length - 1].y;
        const minStartX = Math.min(...currentGroup.map(r => r.startX));
        const maxEndX = Math.max(...currentGroup.map(r => r.endX));
        thumbs.push({
          x: Math.max(0, minStartX - 2),
          y: Math.max(0, minY - 2),
          w: maxEndX - minStartX + 4,
          h: maxY - minY + 4,
        });
      }
      currentGroup = [thumbRows[i]];
    }
  }
  // 处理最后一组
  if (currentGroup.length >= minThumbSize) {
    const minY = currentGroup[0].y;
    const maxY = currentGroup[currentGroup.length - 1].y;
    const minStartX = Math.min(...currentGroup.map(r => r.startX));
    const maxEndX = Math.max(...currentGroup.map(r => r.endX));
    thumbs.push({
      x: Math.max(0, minStartX - 2),
      y: Math.max(0, minY - 2),
      w: maxEndX - minStartX + 4,
      h: maxY - minY + 4,
    });
  }

  // 步骤3: 合并过近的小图（同一产品的多个检测）
  const mergedThumbs: typeof thumbs = [];
  for (const thumb of thumbs) {
    let merged = false;
    for (const existing of mergedThumbs) {
      const yOverlap = Math.abs(thumb.y - existing.y) < Math.max(thumb.h, existing.h);
      const xOverlap = Math.abs(thumb.x - existing.x) < Math.max(thumb.w, existing.w);
      if (yOverlap && xOverlap) {
        existing.x = Math.min(existing.x, thumb.x);
        existing.y = Math.min(existing.y, thumb.y);
        existing.w = Math.max(existing.x + existing.w, thumb.x + thumb.w) - existing.x;
        existing.h = Math.max(existing.y + existing.h, thumb.y + thumb.h) - existing.y;
        merged = true;
        break;
      }
    }
    if (!merged) mergedThumbs.push({ ...thumb });
  }

  // 步骤4: 对每个小图，扩展为完整的产品条目区域
  const items: OrderItem[] = [];
  for (const thumb of mergedThumbs) {
    // 过滤掉太小的（可能是按钮、头像等）
    if (thumb.w < 50 || thumb.h < 50) continue;
    if (thumb.w > processWidth * 0.5 || thumb.h > processHeight * 0.3) continue;

    // 查找条目的上下边界（找空白行）
    let itemTop = thumb.y;
    let itemBottom = thumb.y + thumb.h;

    // 向上找空白行
    for (let y = thumb.y - 1; y >= 0; y--) {
      let rowContent = 0;
      for (let x = 0; x < leftScanWidth; x++) {
        const idx = (y * processWidth + x) * 4;
        if (!isBackground(imageData[idx], imageData[idx + 1], imageData[idx + 2])) {
          rowContent++;
        }
      }
      if (rowContent < 5) {
        itemTop = y + 1;
        break;
      }
      itemTop = y;
    }

    // 向下找空白行
    for (let y = thumb.y + thumb.h; y < processHeight; y++) {
      let rowContent = 0;
      for (let x = 0; x < leftScanWidth; x++) {
        const idx = (y * processWidth + x) * 4;
        if (!isBackground(imageData[idx], imageData[idx + 1], imageData[idx + 2])) {
          rowContent++;
        }
      }
      if (rowContent < 5) {
        itemBottom = y;
        break;
      }
      itemBottom = y;
      if (itemBottom - itemTop > processHeight * 0.25) break; // 最大高度限制
    }

    const itemHeight = itemBottom - itemTop;
    if (itemHeight < 60) continue;

    // 提取小图区域的颜色
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumb.w;
    thumbCanvas.height = thumb.h;
    const thumbCtx = thumbCanvas.getContext("2d")!;
    thumbCtx.drawImage(
      canvas,
      thumb.x, thumb.y, thumb.w, thumb.h,
      0, 0, thumb.w, thumb.h
    );
    const color = await extractDominantColor(thumbCanvas.toDataURL("image/jpeg", 0.8));

    // 转换回原始图片坐标
    const origScale = 1 / scale;
    items.push({
      thumbX: Math.round(thumb.x * origScale),
      thumbY: Math.round(thumb.y * origScale),
      thumbWidth: Math.round(thumb.w * origScale),
      thumbHeight: Math.round(thumb.h * origScale),
      itemX: 0,
      itemY: Math.round(itemTop * origScale),
      itemWidth: img.width,
      itemHeight: Math.round(itemHeight * origScale),
      color,
    });
  }

  return items;
}

/**
 * 从图片提取多个颜色区域（通用场景）
 */
export async function extractColorRegions(
  imageSrc: string,
  minRegionSize: number = 60
): Promise<ColorRegion[]> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

  // 降采样
  const scale = Math.max(1, Math.floor(Math.max(img.width, img.height) / 400));
  const w = Math.floor(img.width / scale);
  const h = Math.floor(img.height / scale);

  const grid: Array<Array<{ r: number; g: number; b: number; a: number } | null>> = [];
  for (let y = 0; y < h; y++) {
    grid[y] = [];
    for (let x = 0; x < w; x++) {
      const sx = x * scale;
      const sy = y * scale;
      const idx = (sy * img.width + sx) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const a = imageData[idx + 3];

      if (a < 200) {
        grid[y][x] = null;
      } else {
        const brightness = (r + g + b) / 3;
        if (brightness > 248 || brightness < 7) {
          grid[y][x] = null;
        } else {
          grid[y][x] = { r, g, b, a };
        }
      }
    }
  }

  // 找连续颜色区域
  const visited = new Set<string>();
  const regions: Array<{
    pixels: Array<{ x: number; y: number; color: { r: number; g: number; b: number } }>;
  }> = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = `${x},${y}`;
      if (visited.has(key) || !grid[y][x]) continue;

      const pixel = grid[y][x]!;
      const regionPixels: Array<{
        x: number;
        y: number;
        color: { r: number; g: number; b: number };
      }> = [];
      const stack = [{ x, y, color: pixel }];

      while (stack.length > 0) {
        const current = stack.pop()!;
        const cKey = `${current.x},${current.y}`;
        if (visited.has(cKey)) continue;
        visited.add(cKey);

        regionPixels.push(current);

        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const n of neighbors) {
          if (n.x < 0 || n.x >= w || n.y < 0 || n.y >= h) continue;
          const nKey = `${n.x},${n.y}`;
          if (visited.has(nKey)) continue;
          const np = grid[n.y][n.x];
          if (!np) continue;

          const dr = Math.abs(pixel.r - np.r);
          const dg = Math.abs(pixel.g - np.g);
          const db = Math.abs(pixel.b - np.b);
          if (dr + dg + db < 80) {
            stack.push({ x: n.x, y: n.y, color: np });
          }
        }
      }

      if (regionPixels.length >= minRegionSize) {
        regions.push({ pixels: regionPixels });
      }
    }
  }

  // 合并重叠区域
  const mergedRegions: ColorRegion[] = [];
  const usedRegions = new Set<number>();

  for (let i = 0; i < regions.length; i++) {
    if (usedRegions.has(i)) continue;

    let minX = w, maxX = 0, minY = h, maxY = 0;
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    const pixels = regions[i].pixels;
    for (const p of pixels) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      totalR += p.color.r;
      totalG += p.color.g;
      totalB += p.color.b;
      count++;
    }

    for (let j = i + 1; j < regions.length; j++) {
      if (usedRegions.has(j)) continue;

      const otherPixels = regions[j].pixels;
      let overlap = false;
      for (const p of otherPixels) {
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
          overlap = true;
          break;
        }
      }

      if (overlap) {
        for (const p of otherPixels) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
          totalR += p.color.r;
          totalG += p.color.g;
          totalB += p.color.b;
          count++;
        }
        usedRegions.add(j);
      }
    }

    const margin = 4;
    const rx = Math.max(0, (minX - margin) * scale);
    const ry = Math.max(0, (minY - margin) * scale);
    const rWidth = Math.min(img.width - rx, (maxX - minX + margin * 2) * scale);
    const rHeight = Math.min(img.height - ry, (maxY - minY + margin * 2) * scale);

    if (rWidth > 30 && rHeight > 30) {
      mergedRegions.push({
        x: rx,
        y: ry,
        width: rWidth,
        height: rHeight,
        color: rgbToHex(
          Math.round(totalR / count),
          Math.round(totalG / count),
          Math.round(totalB / count)
        ),
        confidence: Math.min(1, count / 1000),
      });
    }
  }

  return mergedRegions
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 15);
}

/**
 * RGB 转 HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, x)).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * HEX 转 RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 判断颜色明暗
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
}

/**
 * 生成甲片 SVG
 */
export function generateNailSVG(
  color: string,
  shape: "oval" | "square" | "almond" | "stiletto" = "oval",
  size: number = 200
): string {
  const paths: Record<string, string> = {
    oval: `M ${size * 0.5} 10 C ${size * 0.85} 10, ${size * 0.9} ${size * 0.25}, ${size * 0.9} ${size * 0.5} C ${size * 0.9} ${size * 0.75}, ${size * 0.85} ${size - 10}, ${size * 0.5} ${size - 10} C ${size * 0.15} ${size - 10}, ${size * 0.1} ${size * 0.75}, ${size * 0.1} ${size * 0.5} C ${size * 0.1} ${size * 0.25}, ${size * 0.15} 10, ${size * 0.5} 10 Z`,
    square: `M ${size * 0.1} 10 L ${size * 0.9} 10 L ${size * 0.9} ${size - 20} C ${size * 0.9} ${size - 5}, ${size * 0.1} ${size - 5}, ${size * 0.1} ${size - 20} Z`,
    almond: `M ${size * 0.5} 5 C ${size * 0.9} ${size * 0.15}, ${size * 0.88} ${size * 0.45}, ${size * 0.5} ${size - 5} C ${size * 0.12} ${size * 0.45}, ${size * 0.1} ${size * 0.15}, ${size * 0.5} 5 Z`,
    stiletto: `M ${size * 0.5} 5 C ${size * 0.8} ${size * 0.3}, ${size * 0.7} ${size * 0.6}, ${size * 0.5} ${size - 5} C ${size * 0.3} ${size * 0.6}, ${size * 0.2} ${size * 0.3}, ${size * 0.5} 5 Z`,
  };

  const path = paths[shape] || paths.oval;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="nailShine" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:white;stop-opacity:0.4" /><stop offset="40%" style="stop-color:white;stop-opacity:0.05" /><stop offset="100%" style="stop-color:black;stop-opacity:0.1" /></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter></defs><path d="${path}" fill="${color}" filter="url(#shadow)" /><path d="${path}" fill="url(#nailShine)" /><ellipse cx="${size * 0.35}" cy="${size * 0.25}" rx="${size * 0.1}" ry="${size * 0.05}" fill="white" fill-opacity="0.25" transform="rotate(-20, ${size * 0.35}, ${size * 0.25})" /></svg>`;
}

/**
 * 将 SVG 转为 DataURL
 */
export function svgToDataURL(svg: string): string {
  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}

/**
 * 裁切图片区域
 */
export async function cropImageRegion(
  imageSrc: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}
