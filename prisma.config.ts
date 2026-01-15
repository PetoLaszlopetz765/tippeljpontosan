import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    db: {
      provider: 'postgresql',
      url: "postgresql://postgres:x5&s!h2bN_xbx3R@db.jazruxvgmlrikmnhysuf.supabase.co:5432/postgres?schema=public",
    },
  },
});
