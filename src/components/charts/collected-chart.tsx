"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth, formatPKR } from "@/lib/format";

type Point = { month: string; amount: number };

function compact(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

function TooltipBox({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-[10px] border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{formatMonth(p.month)}</p>
      <p className="num font-semibold">{formatPKR(p.amount)}</p>
    </div>
  );
}

/** Verified payments collected per month (single series). */
export function CollectedChart({ data }: { data: Point[] }) {
  const last = data.length - 1;
  return (
    <figure>
      <div className="h-[220px] w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string) => formatMonth(m, true).split(" ")[0]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickFormatter={compact}
              tickLine={false}
              axisLine={false}
              width={40}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              <LabelList
                dataKey="amount"
                position="top"
                content={({ x, y, width, value, index }) =>
                  index === last ? (
                    <text
                      x={Number(x) + Number(width) / 2}
                      y={Number(y) - 8}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--foreground)"
                    >
                      {compact(Number(value))}
                    </text>
                  ) : null
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Verified payments collected per month</caption>
        <tbody>
          {data.map((p) => (
            <tr key={p.month}>
              <th scope="row">{formatMonth(p.month)}</th>
              <td>{formatPKR(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
