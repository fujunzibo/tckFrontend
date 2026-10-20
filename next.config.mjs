import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const config = {
  outputFileTracingRoot: path.resolve(root, ".."),
  poweredByHeader: false,
  async rewrites() {
    if (process.env.MOCK_API_ENABLED === "true") return [];
    const backend = (
      process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4001"
    ).replace(/\/$/, "");
    return {
      beforeFiles: [
        { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
      ],
    };
  },
};
export default config;
