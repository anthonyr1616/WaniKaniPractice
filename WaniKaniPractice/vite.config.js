import { defineConfig } from "vite";
import { brotliDecompressSync } from "zlib";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from "fs";
import { resolve, join } from "path";

export default defineConfig({
  base: "/WaniKaniPractice/",
  plugins: [
    {
      name: "decompress-dict",
      closeBundle() {
        const dictDir = resolve("dist/dict");
        if (!existsSync(dictDir)) return;
        for (const file of readdirSync(dictDir)) {
          if (!file.endsWith(".dat.br")) continue;
          const brPath = join(dictDir, file);
          const rawPath = join(dictDir, file.replace(/\.dat\.br$/, ".dat.raw"));
          const decompressed = brotliDecompressSync(readFileSync(brPath));
          writeFileSync(rawPath, decompressed);
          unlinkSync(brPath);
        }
      },
    },
  ],
});
