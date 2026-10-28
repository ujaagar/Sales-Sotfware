import "server-only";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Ledger, LedgerMonth } from "@/lib/data/ledger";
import { KIND_LABEL, METHOD_LABEL } from "@/lib/data/ledger";
import { formatDate, formatMonth, formatRate } from "@/lib/format";

// Monthly commission statement (PDF). Built-in Helvetica keeps it light; amounts use plain "Rs" text.

const MIDNIGHT = "#0E1C33";
const SLATE = "#475569";
const LINE = "#E2E7F0";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, color: MIDNIGHT, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  logo: { width: 120 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  sub: { color: SLATE, marginTop: 3 },
  pill: { marginTop: 6, alignSelf: "flex-end", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, fontSize: 8.5 },
  info: { flexDirection: "row", gap: 24, borderTop: `1 solid ${LINE}`, borderBottom: `1 solid ${LINE}`, paddingVertical: 10, marginBottom: 14 },
  label: { color: SLATE, fontSize: 8 },
  value: { fontFamily: "Helvetica-Bold", marginTop: 2 },
  th: { flexDirection: "row", backgroundColor: "#F5F7FB", paddingVertical: 6, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottom: `1 solid ${LINE}` },
  cDate: { width: "13%" },
  cDesc: { width: "39%" },
  cKind: { width: "13%" },
  cBase: { width: "13%", textAlign: "right" },
  cRate: { width: "9%", textAlign: "right" },
  cAmt: { width: "13%", textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTop: `1 solid ${MIDNIGHT}`, marginTop: 3, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  note: { color: SLATE, fontSize: 8, marginTop: 2 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, color: SLATE, fontSize: 7.5, borderTop: `1 solid ${LINE}`, paddingTop: 6 },
});

const rs = (n: number) => `${n < 0 ? "-" : ""}Rs ${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function Statement({ ledger, month }: { ledger: Ledger; month: LedgerMonth }) {
  const paidThisMonth = ledger.payouts.filter((p) => p.paidOn.slice(0, 7) === month.month.slice(0, 7));
  const final = month.status === "locked";
  return (
    <Document title={`Commission statement ${formatMonth(month.month)} - ${ledger.agent.name}`} author="Ujaagar Digital">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={path.join(process.cwd(), "public", "brand", "logo-on-light.png")} style={s.logo} />
          <View>
            <Text style={s.title}>Commission statement</Text>
            <Text style={[s.sub, { textAlign: "right" }]}>{formatMonth(month.month)}</Text>
            <Text style={[s.pill, { backgroundColor: final ? "#E6EBF5" : "#FFF4E0", color: final ? MIDNIGHT : "#8A4B00" }]}>
              {final ? `Final (locked ${formatDate(month.lockedAt)})` : "Estimated (month not locked yet)"}
            </Text>
          </View>
        </View>

        <View style={s.info}>
          <View>
            <Text style={s.label}>Agent</Text>
            <Text style={s.value}>{ledger.agent.name}</Text>
          </View>
          <View>
            <Text style={s.label}>Email</Text>
            <Text style={s.value}>{ledger.agent.email}</Text>
          </View>
          <View>
            <Text style={s.label}>CNIC</Text>
            <Text style={s.value}>{ledger.agent.cnic ?? "—"}</Text>
          </View>
          <View>
            <Text style={s.label}>Verified payments collected</Text>
            <Text style={s.value}>{rs(month.collected)}</Text>
          </View>
        </View>

        <View style={s.th}>
          <Text style={s.cDate}>Date</Text>
          <Text style={s.cDesc}>Client · service</Text>
          <Text style={s.cKind}>Type</Text>
          <Text style={s.cBase}>Payment</Text>
          <Text style={s.cRate}>Rate</Text>
          <Text style={s.cAmt}>Commission</Text>
        </View>
        {month.entries.length === 0 && (
          <View style={s.tr}>
            <Text>No commission this month.</Text>
          </View>
        )}
        {month.entries.map((e) => (
          <View key={e.id} style={s.tr} wrap={false}>
            <Text style={s.cDate}>{formatDate(e.createdAt)}</Text>
            <View style={s.cDesc}>
              <Text>{e.description}</Text>
              {e.note && <Text style={s.note}>{e.note}</Text>}
            </View>
            <Text style={s.cKind}>{KIND_LABEL[e.kind]}</Text>
            <Text style={s.cBase}>{rs(e.base)}</Text>
            <Text style={s.cRate}>{formatRate(e.rate)}</Text>
            <Text style={s.cAmt}>{rs(e.amount)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Commission this month</Text>
            <Text>{rs(month.commission)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Paid to you this month</Text>
            <Text>{rs(paidThisMonth.reduce((t, p) => t + p.amount, 0))}</Text>
          </View>
          <View style={s.grand}>
            <Text>Balance still due (all months)</Text>
            <Text>{rs(ledger.balance.pending)}</Text>
          </View>
        </View>

        {paidThisMonth.length > 0 && (
          <>
            <Text style={s.h2}>Payouts this month</Text>
            {paidThisMonth.map((p) => (
              <View key={p.id} style={s.tr}>
                <Text style={{ width: "25%" }}>{formatDate(p.paidOn)}</Text>
                <Text style={{ width: "25%" }}>{METHOD_LABEL[p.method] ?? p.method}</Text>
                <Text style={{ width: "30%" }}>{p.reference ?? ""}</Text>
                <Text style={{ width: "20%", textAlign: "right" }}>{rs(p.amount)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.footer} fixed>
          Ujaagar Digital · Commission is earned only on payments verified by the CEO, at the rate locked when the deal was approved. Report
          any error within 10 days of the payout. Generated {formatDate(new Date())}.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderStatement(ledger: Ledger, month: LedgerMonth): Promise<Buffer> {
  return renderToBuffer(<Statement ledger={ledger} month={month} />);
}
