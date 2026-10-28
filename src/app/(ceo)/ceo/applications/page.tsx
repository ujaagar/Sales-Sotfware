import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { ApplicationCard } from "@/components/application-card";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Agent applications" };

export default async function ApplicationsPage() {
  await requireCeo();
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_applications")
    .select("id, full_name, email, phone, whatsapp, city, cnic, note, status, source, rejection_reason, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const all = data ?? [];
  const pending = all.filter((a) => a.status === "pending");
  const handled = all.filter((a) => a.status !== "pending" && a.source === "form").slice(0, 20);

  return (
    <>
      <PageHeader
        title="Agent applications"
        description="People who applied at /apply. Approving creates their account and a 7-day link to set a password."
      />
      {pending.length === 0 ? (
        <Card>
          <EmptyState icon={UserPlus} title="No new applications">
            Share the apply link with people who want to sell for you: <span className="font-medium text-foreground">/apply</span>
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pending.map((a) => (
            <ApplicationCard
              key={a.id}
              app={{
                id: a.id,
                fullName: a.full_name,
                email: a.email,
                phone: a.phone,
                whatsapp: a.whatsapp,
                city: a.city,
                cnic: a.cnic,
                note: a.note,
                createdAt: a.created_at,
              }}
            />
          ))}
        </div>
      )}

      {handled.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-[17px] font-semibold">Recently handled</h2>
          <Card>
            <ul className="divide-y divide-border">
              {handled.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.city} · {formatDate(a.reviewed_at)}
                      {a.rejection_reason && ` · ${a.rejection_reason}`}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </>
  );
}
