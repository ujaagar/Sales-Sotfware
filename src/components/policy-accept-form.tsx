"use client";

import { CheckCircle2, ChevronsDown, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { acceptPolicy, declinePolicy } from "@/app/actions/policy";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import type { PolicyLang } from "@/lib/policy";

const TEXT = {
  en: {
    readFirst: "Scroll to the end of the policy to continue.",
    heading: "Your acceptance",
    lead: "This works as your signature. It is saved with today's date and this policy version.",
    name: "Your full name",
    nameHint: (n: string) => `Type it exactly as on your account: ${n}`,
    cnic: "CNIC",
    agree: "I have read and understood the Ujaagar Digital Sales Agent Policy, and I agree to work under it.",
    accept: "I accept the policy",
    saving: "Saving…",
    decline: "I do not accept (log out)",
    confirmDecline: "If you don't accept the policy you can't use the portal. Log out now?",
  },
  ur: {
    readFirst: "آگے بڑھنے کے لیے پالیسی آخر تک پڑھیں۔",
    heading: "آپ کا اقرار",
    lead: "یہ آپ کے دستخط کے طور پر کام کرے گا۔ یہ آج کی تاریخ اور اس پالیسی ورژن کے ساتھ محفوظ ہوگا۔",
    name: "آپ کا پورا نام",
    nameHint: (n: string) => `بالکل ویسے لکھیں جیسے اکاؤنٹ میں ہے: ${n}`,
    cnic: "شناختی کارڈ نمبر (CNIC)",
    agree: "میں نے اجاگر ڈیجیٹل سیلز ایجنٹ پالیسی پڑھ اور سمجھ لی ہے، اور میں اسی کے تحت کام کرنے پر رضامند ہوں۔",
    accept: "میں پالیسی قبول کرتا / کرتی ہوں",
    saving: "محفوظ ہو رہا ہے…",
    decline: "میں قبول نہیں کرتا (لاگ آؤٹ)",
    confirmDecline: "پالیسی قبول کیے بغیر آپ پورٹل استعمال نہیں کر سکتے۔ کیا لاگ آؤٹ کریں؟",
  },
};

/** Wraps the policy text; the form unlocks only after the reader reaches the end. */
export function PolicyAcceptForm({
  children,
  lang,
  version,
  accountName,
  defaultCnic,
}: {
  children: React.ReactNode;
  lang: PolicyLang;
  version: string;
  accountName: string;
  defaultCnic: string;
}) {
  const t = TEXT[lang];
  const urdu = lang === "ur";
  const end = useRef<HTMLDivElement>(null);
  const [readToEnd, setReadToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState(defaultCnic);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setReadToEnd(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {children}
      <div ref={end} aria-hidden className="h-px" />

      {!readToEnd && (
        <div className="sticky bottom-4 z-10 mt-6 flex justify-center print:hidden">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg" dir={urdu ? "rtl" : "ltr"}>
            <ChevronsDown className="size-4" aria-hidden /> {t.readFirst}
          </p>
        </div>
      )}

      <section
        dir={urdu ? "rtl" : "ltr"}
        aria-labelledby="accept-heading"
        className={`mt-10 rounded-[16px] border-2 border-primary/15 bg-card p-5 sm:p-6 ${urdu ? "font-urdu" : ""}`}
      >
        <h2 id="accept-heading" className="flex items-center gap-2 text-[19px] font-semibold">
          <ShieldCheck className="size-5 text-accent" aria-hidden /> {t.heading}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.lead}</p>

        <fieldset disabled={!readToEnd || pending} className="mt-5 space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t.name} htmlFor="typedName" required hint={t.nameHint(accountName)}>
              <Input id="typedName" dir="ltr" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t.cnic} htmlFor="cnic" required hint="12345-1234567-1">
              <Input id="cnic" dir="ltr" inputMode="numeric" value={cnic} onChange={(e) => setCnic(e.target.value)} className="num" />
            </Field>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-input p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/50">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--ujaagar-blue)]" />
            <span className="text-[15px] leading-relaxed">{t.agree}</span>
          </label>
          {error && (
            <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              disabled={!agreed || !name.trim() || !cnic.trim()}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await acceptPolicy({ version, language: lang, typedName: name, cnic, agreed });
                  if (res?.error) setError(res.error);
                });
              }}
            >
              <CheckCircle2 /> {pending ? t.saving : t.accept}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                if (window.confirm(t.confirmDecline)) start(() => declinePolicy());
              }}
            >
              <LogOut /> {t.decline}
            </Button>
          </div>
        </fieldset>
      </section>
    </>
  );
}
