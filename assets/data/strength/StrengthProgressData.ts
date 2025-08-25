// Manually generated dataset for charting Strength totals.
// Shape matches the RangeChart component you already use.
export type DataPoint = { label: string; value: number };

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// --- Create ~60 daily entries (last 2 months) ---
const today = new Date();
const monthlyData: DataPoint[] = [];
for (let i = 59; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);

  // Base around 2,800–3,200 lbs with some wave + noise
  const base = 2900 + 200 * Math.sin(i / 4);
  const noise = (Math.random() - 0.5) * 220;
  const value = Math.round(clamp(base + noise, 2400, 3300));

  monthlyData.push({ label: fmt(d), value });
}

// --- Weekly “dailyData” (exact 7 points; latest week slice) ---
const dailyData: DataPoint[] = monthlyData.slice(-7);

// --- Yearly month aggregates (placeholder) ---
const yearlyData: DataPoint[] = Array.from({ length: 12 }).map((_, idx) => {
  const approx = 2900 + 100 * Math.sin(idx / 2);
  return { label: `${new Date().getFullYear()}-${String(idx + 1).padStart(2, '0')}-01`, value: Math.round(approx) };
});

const dataset = {
  dailyData,
  monthlyData, // 60 points (2 months)
  yearlyData,
};

export default dataset;
