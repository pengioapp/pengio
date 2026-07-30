import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

interface RepaymentChartProps {
  amount: number;
  mode: "weekly" | "monthly";
}

const RepaymentChart = ({ amount, mode }: RepaymentChartProps) => {
  // Generate mock repayment data based on mode
  const data = mode === "weekly"
    ? [
        { label: "Week 1", value: amount * 0.15 },
        { label: "Week 2", value: amount * 0.35 },
        { label: "Week 3", value: amount * 0.55 },
        { label: "Week 4", value: amount * 0.7 },
        { label: "Week 5", value: amount * 0.85 },
        { label: "Week 6", value: amount },
      ]
    : [
        { label: "1 Sep", value: amount * 0.1 },
        { label: "", value: amount * 0.25 },
        { label: "7 Sep", value: amount * 0.5 },
        { label: "", value: amount * 0.65 },
        { label: "", value: amount * 0.8 },
        { label: "14 Sep", value: amount * 0.95 },
        { label: "", value: amount },
      ];

  const ticks = [0, amount * 0.25, amount * 0.5, amount * 0.75, amount];
  const formatKr = (v: number) => `${Math.round(v).toLocaleString("nb-NO")} kr`;

  return (
    <div className="w-full h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(0 0% 62%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            ticks={ticks}
            tickFormatter={formatKr}
            tick={{ fill: "hsl(0 0% 62%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(44 100% 58%)"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RepaymentChart;
