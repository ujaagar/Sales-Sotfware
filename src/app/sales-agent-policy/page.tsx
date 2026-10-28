import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PolicyDocument, PolicyLangToggle } from "@/components/policy-document";
import { ThemeToggle } from "@/components/theme-toggle";
import { LinkButton } from "@/components/ui/button";
import { loadPolicy, policyLang, versionLabel } from "@/lib/policy";

export const metadata: Metadata = {
  title: "Sales Agent Policy",
  description: "The terms on which independent sales agents sell Ujaagar Digital's services and earn commission.",
};

export default async function PublicPolicyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = policyLang((await searchParams).lang);
  const policy = await loadPolicy(lang);
  const urdu = lang === "ur";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-[880px] items-center gap-2 px-4 sm:h-16">
          <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo className="h-8 sm:h-9" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <LinkButton href="/apply" size="sm" className="ml-1">
              <UserPlus /> Apply
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-4 pt-6 pb-16 sm:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-[15px] text-muted-foreground ${urdu ? "font-urdu" : ""}`} dir={urdu ? "rtl" : "ltr"}>
            {urdu ? "درخواست دینے سے پہلے یہ پالیسی پڑھیں۔ منظوری کے بعد پورٹل میں اسے قبول کرنا ہوگا۔" : "Read this before you apply. Approved agents accept it in the portal before they start."}
          </p>
          <PolicyLangToggle lang={lang} hrefFor={(l) => `/sales-agent-policy?lang=${l}`} />
        </div>
        <div className="rounded-[16px] border border-border bg-card p-5 sm:p-8">
          <PolicyDocument title={policy.title} body={policy.body} lang={lang} versionLabel={versionLabel()} />
        </div>
        <div className="mt-8 flex justify-center">
          <LinkButton href="/apply" size="lg">
            <UserPlus /> Apply as a sales agent
          </LinkButton>
        </div>
      </main>
    </div>
  );
}
