// Preview mode: the app shows sample data until the database is wired in and configured.
// APP_PREVIEW=1 in .env.local forces it on.
export const isPreview =
  process.env.APP_PREVIEW === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
