"use client";

import { Link2, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resendInvite, setAgentActive, type InviteResult } from "@/app/actions/agents";
import { InviteLinkPanel } from "@/components/invite-link-panel";
import { Button } from "@/components/ui/button";

export function AgentActions({ id, name, active, needsInvite }: { id: string; name: string; active: boolean; needsInvite: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [invite, setInvite] = useState<InviteResult | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {active && (
          <Button
            size="sm"
            variant={needsInvite ? "primary" : "secondary"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await resendInvite(id);
                if (res.error) return void toast.error(res.error);
                setInvite(res);
              })
            }
          >
            <Link2 /> {needsInvite ? "Get invite link" : "New password link"}
          </Button>
        )}
        <Button
          size="sm"
          variant={active ? "danger" : "secondary"}
          disabled={pending}
          onClick={() => {
            if (active && !window.confirm(`Deactivate ${name}? They won't be able to log in, and their monthly commission stops.`)) return;
            start(async () => {
              const res = await setAgentActive(id, !active);
              if (res.error) return void toast.error(res.error);
              toast.success(active ? `${name} deactivated` : `${name} is active again`);
              router.refresh();
            });
          }}
        >
          {active ? <PowerOff /> : <Power />} {active ? "Deactivate" : "Activate"}
        </Button>
      </div>
      {invite?.inviteUrl && <InviteLinkPanel url={invite.inviteUrl} name={invite.name ?? name} phone={invite.phone} expiresAt={invite.expiresAt} />}
    </div>
  );
}
