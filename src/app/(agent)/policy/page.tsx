import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PolicyDocument, PolicyLangToggle } from "@/components/policy-document";
import { Card } from "@/components/ui/card";
import { requireAgent } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getMyAcceptance, loadPolicy, policyLang, versionLabel } from "@/lib/policy";

export const metadata: Metadata = { title: "Sales Agent Policy" };

export default async function AgentPolicyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const me = await requireAgent();
  const lang = policyLang((await searchParams).lang);
  const [policy, acceptance] = await Promise.all([loadPolicy(lang), getMyAcceptance(me.id)]);

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {acceptance && (
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--status-good-bg)] px-3 py-1.5 text-sm font-medium text-[var(--status-good-fg)]">
            <ShieldCheck className="size-4" aria-hidden /> You accepted this policy on {formatDateTime(acceptance.acceptedAt)}
          </p>
        )}
        <PolicyLangToggle lang={lang} hrefFor={(l) => `/policy?lang=${l}`} />
      </div>
      <Card className="p-5 sm:p-8">
        <PolicyDocument title={policy.title} body={policy.body} lang={lang} versionLabel={versionLabel()} />
      </Card>
    </div>
  );
}
