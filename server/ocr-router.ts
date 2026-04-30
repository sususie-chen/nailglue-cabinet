import { z } from "zod";
import { createRouter, authedQuery, authedMutation } from "./middleware";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

const TESSDATA_DIR = path.resolve(process.cwd(), "tessdata");

function base64ToBuffer(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid base64 data URL");
  }
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  return { buffer, ext };
}

function cleanupTempFile(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

async function runOCR(imagePath: string): Promise<string> {
  const env = { ...process.env, TESSDATA_PREFIX: TESSDATA_DIR };

  try {
    const { stdout } = await execAsync(
      `tesseract "${imagePath}" stdout -l chi_sim+eng --psm 6 2>/dev/null`,
      { timeout: 15000, env }
    );
    return stdout;
  } catch {
    try {
      const { stdout } = await execAsync(
        `tesseract "${imagePath}" stdout -l eng --psm 6 2>/dev/null`,
        { timeout: 15000, env }
      );
      return stdout;
    } catch {
      return "";
    }
  }
}

function extractProductInfo(text: string): {
  brand?: string;
  shadeCode?: string;
  shadeName?: string;
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 80);

  let brand: string | undefined;
  let shadeCode: string | undefined;
  let shadeName: string | undefined;

  const brandPattern = /\b([A-Z]{2,}[A-Z0-9]*(?:\s+[A-Z]{2,}[A-Z0-9]*)*)\b/;
  const numberPattern = /\b(\d{1,4}[A-Z]{0,4})\b/;
  const sepPattern = /^(.+?)\s*[-\u00B7\u2014,.:]\s*(.+)$/;

  for (const line of lines) {
    if (/^\d{1,2}$/.test(line)) continue;

    const sepMatch = line.match(sepPattern);
    if (sepMatch) {
      const left = sepMatch[1].trim();
      const right = sepMatch[2].trim();
      if (!brand && left.length > 1 && left.length < 30) brand = left;
      if (!shadeCode && right.length > 0 && right.length < 20) shadeCode = right;
    }

    const brandMatch = line.match(brandPattern);
    if (brandMatch && !brand && brandMatch[1].length > 1 && brandMatch[1].length < 25) {
      brand = brandMatch[1];
    }

    const numMatch = line.match(numberPattern);
    if (numMatch && !shadeCode && numMatch[1].length > 0 && numMatch[1].length < 10) {
      shadeCode = numMatch[1];
    }
  }

  if (brand && !shadeCode) {
    for (const line of lines) {
      const num = line.match(/\b(\d{1,4}[A-Z]{0,4})\b/);
      if (num) {
        shadeCode = num[1];
        break;
      }
    }
  }

  return { brand, shadeCode, shadeName };
}

export const ocrRouter = createRouter({
  recognize: authedQuery
    .input(z.object({ imageData: z.string() }))
    .query(async ({ input }) => {
      const { buffer, ext } = base64ToBuffer(input.imageData);
      const tmpFile = path.join(os.tmpdir(), `ocr-${Date.now()}.${ext}`);
      try {
        fs.writeFileSync(tmpFile, buffer);
        const text = await runOCR(tmpFile);
        const info = extractProductInfo(text);
        return { rawText: text, ...info };
      } finally {
        cleanupTempFile(tmpFile);
      }
    }),

  recognizeBatch: authedMutation
    .input(z.object({ images: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const results = [];
      for (const imageData of input.images) {
        const { buffer, ext } = base64ToBuffer(imageData);
        const tmpFile = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
        try {
          fs.writeFileSync(tmpFile, buffer);
          const text = await runOCR(tmpFile);
          const info = extractProductInfo(text);
          results.push({ rawText: text, ...info });
        } finally {
          cleanupTempFile(tmpFile);
        }
      }
      return results;
    }),
});
