import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/password-reset-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/forgot-password?link=expired");
  return (
    <AuthShell eyebrow="Account" title="Choose a new password." intro="After this you'll log in again with the new password.">
      <h1 className="text-[26px] font-semibold">New password</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted-foreground">{data.user.email}</p>
      <ResetForm />
    </AuthShell>
  );
}
