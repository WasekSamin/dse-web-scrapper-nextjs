const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfmake and exceljs are used only in server route handlers.
  serverExternalPackages: ["pdfmake", "exceljs"],
  // Pin the workspace root to this project (a stray lockfile in the home dir
  // otherwise makes Next.js infer the wrong root).
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
