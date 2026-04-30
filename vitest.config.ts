import { defineConfig } from 'vitest/config';
import babel from "@rollup/plugin-babel";

export default defineConfig({
  plugins: [
    babel({
      plugins: [
        ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
      ],
      extensions: [".ts", ".js", ".tsx", ".jsx"],
      babelHelpers: 'bundled'
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
