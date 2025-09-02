// assets/data/milesRanData.tsx
// Generates exactly 400 days of running data ending with today.
// Exports the full dataset as the default export for easy use in charts.

type DataPoint = { label: string; value: number };

const toYMD = (d: Date) => {
  const yr = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${yr}-${m}-${day}`;
};

// Deterministic “variation” so data looks organic but is stable
const vary = (base: number, seed: number, spread = 0.6) => {
  const s = Math.sin(seed * 12.345) * Math.cos(seed * 3.21);
  return Math.max(0, +(base + s * spread).toFixed(1));
};

const seasonalFactor = (monthIndex: number) => {
  if ([8, 9].includes(monthIndex)) return 1.1;   // Sep/Oct peaks
  if ([0, 1].includes(monthIndex)) return 0.9;   // Jan/Feb dip
  if ([6, 7].includes(monthIndex)) return 0.95;  // Jul/Aug lighter
  return 1.0;
};

const weekdayBaseline = (weekday: number) => {
  switch (weekday) {
    case 0: return 0.8; // Sunday (rest/easy)
    case 6: return 7.2; // Saturday long run
    case 3: return 5.0; // Thursday tempo
    case 2: return 4.2; // Wednesday
    case 4: return 3.5; // Friday
    case 1: return 3.0; // Monday recovery
    default: return 4.0; // Tuesday fallback
  }
};

// Generate last 400 days, ending with today
const buildDaily400 = (): DataPoint[] => {
  const out: DataPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 399; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - (399 - i));
    const label = toYMD(d);

    const w = d.getDay();
    const m = d.getMonth();

    const base = weekdayBaseline(w);
    const season = seasonalFactor(m);

    const blockWave =
      1 +
      0.05 * Math.sin((2 * Math.PI * i) / 28) + // ~4-week blocks
      0.03 * Math.sin((2 * Math.PI * i) / 7);   // weekly rhythm

    let miles = base * season * blockWave;

    // Some Sundays are rest
    const isRestSunday = w === 0 && (i % 3 === 0);
    if (isRestSunday) miles = 0;

    miles = vary(miles, i, 0.5);
    miles = miles < 0.15 ? 0 : +miles.toFixed(1);

    out.push({ label, value: miles });
  }

  return out;
};

const allDaily400: DataPoint[] = buildDaily400();

// Export full 400 days by default
export default allDaily400;
