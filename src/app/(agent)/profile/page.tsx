import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm, ProfileForm } from "@/components/account-views";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requireAgent();
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("phone, whatsapp, city, created_at").eq("id", me.id).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Profile" />
      <Card className="flex items-center gap-3 p-4 sm:p-5">
        <Avatar name={me.name} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-semibold">{me.name}</p>
          <p className="truncate text-sm text-muted-foreground">{me.email} · Sales Partner, Ujaagar Digital</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="Contact details" description="Your name and email can only be changed by the CEO." />
        <CardBody>
          <ProfileForm initial={{ phone: p?.phone ?? "", whatsapp: p?.whatsapp ?? "", city: p?.city ?? "" }} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Password" description="If your password leaks, change it and tell the CEO straight away." />
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>
      <Card className="p-4 text-sm text-muted-foreground sm:p-5">
        Read the <Link href="/policy" className="font-medium text-accent-foreground underline-offset-4 hover:underline">Sales Agent Policy</Link> any time.
      </Card>
      <Card>
        <LogoutButton />
      </Card>
    </div>
  );
}
