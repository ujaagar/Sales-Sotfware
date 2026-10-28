import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";
import { PolicyAcceptForm } from "@/components/policy-accept-form";
import { PolicyDocument, PolicyLangToggle } from "@/components/policy-document";
import { PreviewBanner } from "@/components/preview-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAgent } from "@/lib/auth";
import { isPreview } from "@/lib/env";
import { CURRENT_POLICY_VERSION, getMyAcceptance, loadPolicy, policyLang, versionLabel } from "@/lib/policy";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sales Agent Policy" };

export default async function WelcomePolicyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const me = await requireAgent({ skipPolicy: true });
  if (!isPreview && (await getMyAcceptance(me.id))) redirect("/dashboard");
  const lang = policyLang((await searchParams).lang);
  const policy = await loadPolicy(lang);

  // Prefill CNIC from the agent's own application, if they gave one.
  let cnic = "";
  if (!isPreview) {
    const { data } = await createAdminClient().from("agent_applications").select("cnic").eq("profile_id", me.id).maybeSingle();
    cnic = data?.cnic ?? "";
  }

  const urdu = lang === "ur";
  return (
    <div className="min-h-dvh">
      <PreviewBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-[880px] items-center gap-2 px-4 sm:h-16">
          <Logo className="h-8 sm:h-9" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton variant="icon" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pt-6 pb-16 sm:pt-10">
        <div className={`mb-6 rounded-[16px] bg-midnight p-5 text-white sm:p-6 ${urdu ? "font-urdu" : ""}`} dir={urdu ? "rtl" : "ltr"}>
          <p className="text-sm text-[#c9d3e6]">{urdu ? `خوش آمدید، ${me.name}` : `Welcome, ${me.name}`}</p>
          <p className="mt-1 font-display text-[20px] font-semibold sm:text-[24px]">
            {urdu ? "پورٹل استعمال کرنے سے پہلے یہ پالیسی پڑھیں اور قبول کریں۔" : "Before you use the portal, please read and accept this policy."}
          </p>
          <p className="mt-2 text-sm text-[#c9d3e6]">
            {urdu
              ? "یہ آپ اور اجاگر ڈیجیٹل کے درمیان کام کی شرائط ہیں: کمیشن، کلائنٹ کی ادائیگیاں اور ضابطہ اخلاق۔"
              : "These are the terms you work under with Ujaagar Digital: commission, client payments and conduct."}
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <PolicyLangToggle lang={lang} hrefFor={(l) => `/welcome/policy?lang=${l}`} />
        </div>

        <div className="rounded-[16px] border border-border bg-card p-5 sm:p-8">
          <PolicyAcceptForm lang={lang} version={CURRENT_POLICY_VERSION} accountName={me.name} defaultCnic={cnic}>
            <PolicyDocument title={policy.title} body={policy.body} lang={lang} versionLabel={versionLabel()} />
          </PolicyAcceptForm>
        </div>
      </main>
    </div>
  );
}
