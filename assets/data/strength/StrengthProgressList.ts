// 15 manually generated strength sessions.
// The UI shows the 5 most recent (sorted by date desc).

export type StrengthSession = {
  id: string;
  title: string;          // e.g., "Monday Evening Push"
  date: string;           // ISO date (YYYY-MM-DD)
  exercisesCount: number; // number of exercises in the session
  durationLabel: string;  // e.g., "45:45m"
  volumeLbs: number;      // total session volume
};

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const sessions: StrengthSession[] = [
  { id: 's15', title: 'Monday Evening Pull',  date: isoDaysAgo(0),  exercisesCount: 6, durationLabel: '46:12m', volumeLbs: 10200 },
  { id: 's14', title: 'Monday Evening Push',  date: isoDaysAgo(2),  exercisesCount: 5, durationLabel: '45:45m', volumeLbs: 9800 },
  { id: 's13', title: 'Full Body Power',      date: isoDaysAgo(4),  exercisesCount: 7, durationLabel: '58:03m', volumeLbs: 11850 },
  { id: 's12', title: 'Leg Day',              date: isoDaysAgo(6),  exercisesCount: 5, durationLabel: '52:30m', volumeLbs: 12500 },
  { id: 's11', title: 'Upper Hypertrophy',    date: isoDaysAgo(8),  exercisesCount: 6, durationLabel: '55:10m', volumeLbs: 11100 },
  { id: 's10', title: 'Push Session',         date: isoDaysAgo(10), exercisesCount: 5, durationLabel: '47:20m', volumeLbs: 9700 },
  { id: 's09', title: 'Pull Session',         date: isoDaysAgo(12), exercisesCount: 5, durationLabel: '50:05m', volumeLbs: 10150 },
  { id: 's08', title: 'Lower Strength',       date: isoDaysAgo(14), exercisesCount: 5, durationLabel: '49:18m', volumeLbs: 12200 },
  { id: 's07', title: 'Upper Strength',       date: isoDaysAgo(16), exercisesCount: 6, durationLabel: '56:12m', volumeLbs: 10900 },
  { id: 's06', title: 'Push/Pull Mix',        date: isoDaysAgo(18), exercisesCount: 6, durationLabel: '59:00m', volumeLbs: 11250 },
  { id: 's05', title: 'Posterior Chain',      date: isoDaysAgo(20), exercisesCount: 5, durationLabel: '48:52m', volumeLbs: 10420 },
  { id: 's04', title: 'Leg Volume Day',       date: isoDaysAgo(22), exercisesCount: 5, durationLabel: '51:10m', volumeLbs: 12780 },
  { id: 's03', title: 'Upper Volume Day',     date: isoDaysAgo(24), exercisesCount: 6, durationLabel: '54:04m', volumeLbs: 11560 },
  { id: 's02', title: 'Accessory Work',       date: isoDaysAgo(26), exercisesCount: 5, durationLabel: '43:40m', volumeLbs: 8650 },
  { id: 's01', title: 'Technique & Tempo',    date: isoDaysAgo(28), exercisesCount: 5, durationLabel: '41:35m', volumeLbs: 8400 },
];

export default sessions;
