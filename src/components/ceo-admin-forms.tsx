"use client";

import { Ban, CheckCircle2, Lock, Plus, Save, Trash2, Undo2, UserRoundCog, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addService,
  cancelDeal,
  completeDeal,
  lockMonth,
  reassignClient,
  recordPayout,
  recordRefund,
  renameService,
  saveRates,
  setEndMonth,
  setRecurringStops,
  setServiceActive,
  setTarget,
} from "@/app/actions/ceo-admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { formatMonth, formatPKR, karachiDate } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/validation";

type R = { ok?: boolean; error?: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<R>, ok: string, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) return setError(res.error);
      toast.success(ok);
      after?.();
      router.refresh();
    });
  return { pending, error, run };
}

function Err({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
      {error}
    </p>
  ) : null;
}

// ---------- Payouts ----------

export function PayoutForm({ agents }: { agents: { id: string; name: string; pending: number }[] }) {
  const { pending, error, run } = useAction();
  const [agentId, setAgentId] = useState(agents.find((a) => a.pending > 0)?.id ?? agents[0]?.id ?? "");
  const agent = agents.find((a) => a.id === agentId);
  const [amount, setAmount] = useState(agent && agent.pending > 0 ? String(agent.pending) : "");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = agent?.name ?? "agent";
        run(
          () => recordPayout({ agentId, amount, paidOn: fd.get("paidOn"), method: fd.get("method"), reference: fd.get("reference"), note: fd.get("note") }),
          `Payout recorded for ${name}. They've been notified.`,
          () => setAmount(""),
        );
      }}
    >
      <Field label="Agent" htmlFor="po-agent" required>
        <Select
          id="po-agent"
          value={agentId}
          onChange={(e) => {
            setAgentId(e.target.value);
            const a = agents.find((x) => x.id === e.target.value);
            setAmount(a && a.pending > 0 ? String(a.pending) : "");
          }}
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · pending {formatPKR(a.pending)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (Rs)" htmlFor="po-amount" required>
          <Input id="po-amount" inputMode="numeric" className="num" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Paid on" htmlFor="po-date" required>
          <Input id="po-date" name="paidOn" type="date" defaultValue={karachiDate()} max={karachiDate()} />
        </Field>
        <Field label="Method" htmlFor="po-method" required>
          <Select id="po-method" name="method" defaultValue="bank_transfer">
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference" htmlFor="po-ref" hint="Transaction ID, cheque no.">
          <Input id="po-ref" name="reference" />
        </Field>
      </div>
      <Field label="Note" htmlFor="po-note">
        <Input id="po-note" name="note" />
      </Field>
      <Err error={error} />
      <Button type="submit" disabled={pending || !agentId}>
        <Wallet /> {pending ? "Saving…" : "Record payout"}
      </Button>
    </form>
  );
}

// ---------- Month locking ----------

export function LockButton({ month, agentId, label, confirmText }: { month: string; agentId?: string; label: string; confirmText: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant={agentId ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => {
          if (window.confirm(confirmText)) run(() => lockMonth(month, agentId), "Locked. The commission is now final.");
        }}
      >
        <Lock /> {pending ? "Locking…" : label}
      </Button>
      <Err error={error} />
    </div>
  );
}

// ---------- Rates ----------

type Slab = { min: number; max: number | null; rate: number };

function SlabTable({ title, rows, onChange, unit }: { title: string; rows: Slab[]; onChange: (r: Slab[]) => void; unit: string }) {
  const set = (i: number, patch: Partial<Slab>) => {
    const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
    // keep the next slab starting right after this one's max
    for (let k = 1; k < next.length; k++) next[k] = { ...next[k], min: (next[k - 1].max ?? next[k - 1].min) + 1 };
    onChange(next);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 font-display text-[16px] font-semibold">{title}</legend>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_4.5rem_2.5rem] gap-2 text-xs font-medium text-muted-foreground">
        <span>From (Rs)</span>
        <span>Up to (Rs)</span>
        <span>Rate %</span>
        <span />
      </div>
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_4.5rem_2.5rem] items-center gap-2">
            <span className="num truncate text-[15px] text-muted-foreground" aria-label={`${unit} slab ${i + 1} from`}>{r.min.toLocaleString("en-US")}</span>
            <Input
              inputMode="numeric"
              className="num px-2.5"
              placeholder={last ? "No limit" : ""}
              value={last ? "" : r.max ?? ""}
              disabled={last}
              aria-label={`${unit} slab ${i + 1} up to`}
              onChange={(e) => set(i, { max: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })}
            />
            <Input
              inputMode="decimal"
              className="num px-2.5"
              value={r.rate}
              aria-label={`${unit} slab ${i + 1} rate`}
              onChange={(e) => set(i, { rate: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${unit} slab ${i + 1}`}
              disabled={rows.length <= 1}
              onClick={() => {
                const next = rows.filter((_, j) => j !== i);
                next[next.length - 1] = { ...next[next.length - 1], max: null };
                for (let k = 1; k < next.length; k++) next[k] = { ...next[k], min: (next[k - 1].max ?? next[k - 1].min) + 1 };
                if (next[0]) next[0] = { ...next[0], min: 0 };
                onChange(next);
              }}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          const prev = rows[rows.length - 1];
          const bump = prev.min + 100000;
          const next = [...rows.slice(0, -1), { ...prev, max: bump - 1 }, { min: bump, max: null, rate: prev.rate }];
          onChange(next);
        }}
      >
        <Plus /> Add slab
      </Button>
    </fieldset>
  );
}

export function RatesEditor({ newSale, recurring }: { newSale: Slab[]; recurring: Slab[] }) {
  const { pending, error, run } = useAction();
  const [ns, setNs] = useState(newSale);
  const [rec, setRec] = useState(recurring);
  const [from, setFrom] = useState(karachiDate());
  return (
    <div className="space-y-6">
      <SlabTable title="New sale" rows={ns} onChange={setNs} unit="New sale" />
      <SlabTable title="Monthly (recurring)" rows={rec} onChange={setRec} unit="Monthly" />
      <Field label="New rates start on" htmlFor="eff" hint="Only deals approved on or after this date get the new rates. Existing deals keep theirs.">
        <Input id="eff" type="date" min={karachiDate()} value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-56" />
      </Field>
      <Err error={error} />
      <Button
        disabled={pending}
        onClick={() => {
          if (window.confirm("Save these as the new commission rates? Already approved deals keep their old rates."))
            run(() => saveRates({ newSale: ns, recurring: rec, effectiveFrom: from }), "New rates saved.");
        }}
      >
        <Save /> {pending ? "Saving…" : "Save new rates"}
      </Button>
    </div>
  );
}

export function TargetForm({ agentId, month, current }: { agentId: string; month: string; current: number | null }) {
  const { pending, error, run } = useAction();
  const [v, setV] = useState(current ? String(current) : "");
  return (
    <form
      className="flex flex-wrap items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setTarget(agentId, month, Number(v.replace(/[,\s]/g, ""))), "Target saved.");
      }}
    >
      <Input aria-label="Monthly target in rupees" inputMode="numeric" className="num w-40" placeholder="50,000" value={v} onChange={(e) => setV(e.target.value)} />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        <Save /> Save
      </Button>
      <div className="basis-full">
        <Err error={error} />
      </div>
    </form>
  );
}

// ---------- Services & settings ----------

export function AddServiceForm() {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addService(name), "Service added.", () => setName(""));
      }}
    >
      <div className="flex gap-2">
        <Input aria-label="New service name" placeholder="e.g. TikTok Ads" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={pending || name.trim().length < 2}>
          <Plus /> Add
        </Button>
      </div>
      <Err error={error} />
    </form>
  );
}

export function ServiceRowActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(name);
  return (
    <div className="space-y-2">
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameService(id, v), "Renamed.", () => setEditing(false));
          }}
        >
          <Input aria-label="Service name" value={v} onChange={(e) => setV(e.target.value)} />
          <Button type="submit" size="md" disabled={pending}>
            <Save /> Save
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Rename
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setServiceActive(id, !active), active ? "Turned off." : "Turned on.")}>
            {active ? "Turn off" : "Turn on"}
          </Button>
        </div>
      )}
      <Err error={error} />
    </div>
  );
}

export function RecurringToggle({ on }: { on: boolean }) {
  const { pending, run } = useAction();
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 size-5 accent-[var(--ujaagar-blue)]"
        checked={on}
        disabled={pending}
        onChange={(e) => run(() => setRecurringStops(e.target.checked), "Setting saved.")}
      />
      <span>
        <span className="block font-medium">Stop monthly commission when an agent is deactivated</span>
        <span className="block text-sm text-muted-foreground">Policy Section 9: recurring commission stops from the deactivation date. One-time deal instalments are still paid.</span>
      </span>
    </label>
  );
}

// ---------- Deals ----------

export function DealAdminActions({
  dealId,
  type,
  status,
  endMonth,
  months,
}: {
  dealId: string;
  type: "one_time" | "monthly";
  status: string;
  endMonth: string | null;
  months: string[];
}) {
  const { pending, error, run } = useAction();
  const [end, setEnd] = useState(endMonth ?? "");
  const [reason, setReason] = useState("");
  if (status !== "approved") return null;
  return (
    <div className="space-y-5">
      {type === "monthly" ? (
        <div className="space-y-2">
          <Field label="Last month of the package" htmlFor="end" hint="No payments are accepted after this month.">
            <Select id="end" value={end} onChange={(e) => setEnd(e.target.value)}>
              <option value="">No end month (ongoing)</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => setEndMonth(dealId, end || null), "End month saved.")}>
            <Save /> Save end month
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Mark this deal completed? Do this once all payments are in and the work is delivered."))
              run(() => completeDeal(dealId), "Deal marked completed.");
          }}
        >
          <CheckCircle2 /> Mark completed
        </Button>
      )}
      <div className="space-y-2 border-t border-border pt-4">
        <Field label="Cancel this deal" htmlFor="cancel-reason" hint="Verified payments and their commission stay. Use a refund to return money.">
          <Textarea id="cancel-reason" rows={2} placeholder="Reason (shown to the agent)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Cancel this deal? No more payments can be recorded on it.")) run(() => cancelDeal(dealId, reason), "Deal cancelled.");
          }}
        >
          <Ban /> Cancel deal
        </Button>
      </div>
      <Err error={error} />
    </div>
  );
}

export function ReassignForm({ clientId, agents, ownerId }: { clientId: string; agents: { id: string; name: string }[]; ownerId: string }) {
  const { pending, error, run } = useAction();
  const [to, setTo] = useState(agents.find((a) => a.id !== ownerId)?.id ?? "");
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select aria-label="New owner" value={to} onChange={(e) => setTo(e.target.value)}>
          {agents
            .filter((a) => a.id !== ownerId)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </Select>
        <Button
          variant="secondary"
          disabled={pending || !to}
          onClick={() => {
            if (window.confirm("Move this client and its open deals to the new agent? Commission already earned stays with the old agent."))
              run(() => reassignClient(clientId, to), "Client reassigned.");
          }}
        >
          <UserRoundCog /> Reassign
        </Button>
      </div>
      <Err error={error} />
    </div>
  );
}

export function RefundForm({ paymentId, max }: { paymentId: string; max: number }) {
  const { pending, error, run } = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!window.confirm("Record this refund? The commission on it is taken back from the agent.")) return;
        run(
          () =>
            recordRefund(paymentId, {
              amount: String(fd.get("amount") ?? ""),
              paidOn: String(fd.get("paidOn") ?? ""),
              method: String(fd.get("method") ?? ""),
              note: String(fd.get("note") ?? ""),
            }),
          "Refund recorded and commission adjusted.",
        );
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Refund (Rs)" htmlFor="rf-amt" hint={`Up to ${formatPKR(max)}`}>
          <Input id="rf-amt" name="amount" inputMode="numeric" className="num" />
        </Field>
        <Field label="Date" htmlFor="rf-date">
          <Input id="rf-date" name="paidOn" type="date" defaultValue={karachiDate()} max={karachiDate()} />
        </Field>
        <Field label="Method" htmlFor="rf-method">
          <Select id="rf-method" name="method" defaultValue="bank_transfer">
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Reason" htmlFor="rf-note">
        <Input id="rf-note" name="note" />
      </Field>
      <Err error={error} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        <Undo2 /> {pending ? "Saving…" : "Record refund"}
      </Button>
    </form>
  );
}
