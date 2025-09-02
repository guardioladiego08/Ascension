// assets/data/weightLiftedData.tsx
// Generates exactly 400 days of "weight lifted" data ending with today.
// Exports the full dataset as the default export for easy use in charts.

type DataPoint = { label: string; value: number };

const toYMD = (d: Date) => {
  const yr = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${yr}-${m}-${day}`;
};

// Deterministic variation (so numbers look natural but consistent)
const vary = (base: number, seed: number, spread = 1500) => {
  const s = Math.sin(seed * 11.11) * Math.cos(seed * 4.17);
  return Math.max(0, Math.round(base + s * spread));
};

// Weekday baseline (simulate heavier lifts on Mon/Wed/Fri, lighter on weekends)
const weekdayBaseline = (weekday: number) => {
  switch (weekday) {
    case 1: return 13000; // Monday heavy push
    case 3: return 14000; // Wednesday pull
    case 5: return 14500; // Friday big lifts
    case 6: return 12000; // Saturday
    case 0: return 11000; // Sunday light or rest
    default: return 12500; // Tue/Thu moderate
  }
};

// Generate 400 daily points ending with today
const buildDaily400 = (): DataPoint[] => {
  const out: DataPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 399; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - (399 - i));
    const label = toYMD(d);

    const w = d.getDay();
    const base = weekdayBaseline(w);

    // Training block waves (~monthly)
    const blockWave =
      1 +
      0.08 * Math.sin((2 * Math.PI * i) / 28) +
      0.04 * Math.sin((2 * Math.PI * i) / 7);

    let lifted = base * blockWave;

    // Some Sundays → full rest
    const isRestSunday = w === 0 && i % 4 === 0;
    if (isRestSunday) lifted = 0;

    // Apply variation
    lifted = vary(lifted, i, 1200);

    out.push({ label, value: lifted });
  }

  return out;
};

const allDaily400: DataPoint[] = buildDaily400();

// Export full dataset for charts
export default allDaily400;
