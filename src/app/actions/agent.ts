"use server";

import { emailSoon } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { requireSeller } from "@/lib/auth";
import { isPreview } from "@/lib/env";
import { karachiDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { paymentSchema } from "@/lib/validation";

export type Result = { ok?: boolean; preview?: boolean; error?: string };

const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};
const MAX_PROOF = 5 * 1024 * 1024;

export async function recordPayment(fd: FormData): Promise<Result> {
  const me = await requireSeller();
  const parsed = paymentSchema.safeParse({
    dealId: fd.get("dealId"),
    amount: fd.get("amount"),
    paidOn: fd.get("paidOn"),
    method: fd.get("method"),
    note: fd.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (parsed.data.paidOn > karachiDate()) return { error: "The payment date can't be in the future." };

  const proof = fd.get("proof");
  if (!(proof instanceof File) || proof.size === 0) return { error: "Add a photo or PDF of the receipt." };
  if (proof.size > MAX_PROOF) return { error: "The receipt must be under 5 MB." };
  const ext = PROOF_TYPES[proof.type];
  if (!ext) return { error: "The receipt must be a photo (JPG, PNG, WEBP, HEIC) or a PDF." };

  if (isPreview) return { preview: true };

  const supabase = await createClient();
  const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from("payment-proofs").upload(path, proof, { contentType: proof.type });
  if (upload.error) return { error: `Could not upload the receipt: ${upload.error.message}` };

  const billingMonth = fd.get("billingMonth");
  const { error } = await supabase.from("client_payments").insert({
    deal_id: parsed.data.dealId,
    agent_id: me.id,
    amount_pkr: parsed.data.amount,
    paid_on: parsed.data.paidOn,
    billing_month: typeof billingMonth === "string" && /^\d{4}-\d{2}-01$/.test(billingMonth) ? billingMonth : null,
    method: parsed.data.method,
    note: parsed.data.note ?? null,
    proof_file_path: path,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  emailSoon();
  return { ok: true };
}
