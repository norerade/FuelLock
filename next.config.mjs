const nextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: { "/*": ["./migrations/*.sql"] },
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: { cpus: 2 },
};
export default nextConfig;
