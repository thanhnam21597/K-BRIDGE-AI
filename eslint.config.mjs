import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals.js";
import nextTs from "eslint-config-next/typescript.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = defineConfig([
  ...compat.config(nextVitals),
  ...compat.config(nextTs),
  {
    ignores: [
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ],
  },
]);

export default eslintConfig;
