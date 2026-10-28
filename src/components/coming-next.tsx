import { Hammer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

/** Placeholder for screens that are built in the next step. */
export function ComingNext({ title, description, items }: { title: string; description?: string; items: string[] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
            <Hammer className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-medium">This screen is next in the build.</p>
            <p className="mt-1 text-sm text-muted-foreground">It will have:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </>
  );
}
