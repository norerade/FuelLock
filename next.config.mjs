const nextConfig = {
  devIndicators: false,
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/*": ["./migrations/*.sql", "./public/images/demo-receipt.png"],
  },
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: { cpus: 2 },
};
export default nextConfig;
