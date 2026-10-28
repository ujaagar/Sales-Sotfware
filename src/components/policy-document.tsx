import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { PolicyLang } from "@/lib/policy";

/** Renders the policy Markdown with brand typography. Urdu is right-to-left in Noto Sans Arabic. */
export function PolicyDocument({ title, body, lang, versionLabel }: { title: string; body: string; lang: PolicyLang; versionLabel: string }) {
  const urdu = lang === "ur";
  return (
    <article
      dir={urdu ? "rtl" : "ltr"}
      lang={urdu ? "ur" : "en"}
      className={cn("text-[15px] leading-[1.75] text-foreground sm:text-base", urdu && "font-urdu text-[16px] leading-[2.1] sm:text-[17px]")}
    >
      <header className="mb-6 border-b border-border pb-5">
        <h1 className={cn("text-[24px] leading-tight font-semibold sm:text-[30px]", urdu && "font-urdu leading-[1.6]")}>{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
          Version {versionLabel}
        </p>
      </header>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className={cn("mt-10 mb-3 scroll-mt-24 text-[19px] font-semibold sm:text-[21px]", urdu && "font-urdu leading-[1.7]")}>{children}</h2>
          ),
          h3: ({ children }) => <h3 className={cn("mt-6 mb-2 text-[17px] font-semibold", urdu && "font-urdu")}>{children}</h3>,
          p: ({ children }) => <p className="my-3">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-2 ps-6 marker:text-accent">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 ps-6 marker:font-semibold marker:text-accent">{children}</ol>,
          li: ({ children }) => <li className="ps-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ href, children }) => (
            <Link href={href ?? "#"} className="font-medium text-accent-foreground underline underline-offset-4">
              {children}
            </Link>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-[12px] border border-border">
              <table className="w-full min-w-[360px] border-collapse text-[14px] sm:text-[15px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted text-start">{children}</thead>,
          th: ({ children }) => <th className="border-b border-border px-3 py-2.5 text-start font-semibold">{children}</th>,
          td: ({ children }) => <td className="num border-b border-border px-3 py-2.5 align-top last:border-b-0">{children}</td>,
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}

/** English / اردو switch (links, so it works without JavaScript). */
export function PolicyLangToggle({ lang, hrefFor }: { lang: PolicyLang; hrefFor: (l: PolicyLang) => string }) {
  return (
    <div role="tablist" aria-label="Language" className="inline-flex rounded-[12px] border border-input bg-card p-1">
      {(
        [
          ["en", "English"],
          ["ur", "اردو"],
        ] as const
      ).map(([l, label]) => (
        <Link
          key={l}
          role="tab"
          aria-selected={lang === l}
          href={hrefFor(l)}
          scroll={false}
          className={cn(
            "inline-flex h-9 min-w-20 items-center justify-center rounded-[9px] px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            l === "ur" && "font-urdu text-[15px]",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
