import type { NextConfig } from "next";


  // Standalone output for Azure App Service ZIP-based redeployments by MS 1/05/26
  // Allows redeploying without rebuilding from GitHub Actionsby MS 1/05/26


const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
