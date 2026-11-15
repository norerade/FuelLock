const nextConfig = {
  devIndicators: false,
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: { "/*": ["./migrations/*.sql"] },
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: { cpus: 2 },
};
export default nextConfig;
