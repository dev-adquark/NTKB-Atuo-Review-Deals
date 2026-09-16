import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// The CLI (migrate/generate/studio) connects directly (non-pooled) to avoid
// pgbouncer prepared-statement issues during schema changes. The running
// application uses DATABASE_URL (pooled) via the driver adapter in lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
