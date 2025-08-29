// assets/data/cardioActivities.ts
// Dataset (25 items) used by both screens + types
// Fields: id, name, type (indoor|outdoor), distance (mi), time (mm:ss), pace (min/mi), location, date (YYYY-MM-DD)

export type CardioType = 'indoor' | 'outdoor';

export type CardioActivity = {
  id: string;
  name: string;
  type: CardioType;
  distance: number; // miles
  time: string; // "45:45"
  pace: string; // "8:06"
  location: string; // "New York, NY"
  date: string; // ISO date "2025-06-16"
};

const activities: CardioActivity[] = [
  { id: 'a01', name: 'Monday Evening Run', type: 'outdoor', distance: 5.65, time: '45:45', pace: '8:06', location: 'New York, NY', date: '2025-06-16' },
  { id: 'a02', name: 'Sunrise Treadmill', type: 'indoor', distance: 3.10, time: '26:05', pace: '8:24', location: 'Equinox SoHo', date: '2025-06-15' },
  { id: 'a03', name: 'Hudson River Easy', type: 'outdoor', distance: 4.50, time: '39:58', pace: '8:53', location: 'New York, NY', date: '2025-06-14' },
  { id: 'a04', name: 'Intervals (TM)', type: 'indoor', distance: 2.80, time: '22:10', pace: '7:55', location: 'Home Gym', date: '2025-06-13' },
  { id: 'a05', name: 'Prospect Park Loop', type: 'outdoor', distance: 3.70, time: '30:50', pace: '8:20', location: 'Brooklyn, NY', date: '2025-06-12' },
  { id: 'a06', name: 'Rainy Day Jog', type: 'outdoor', distance: 2.90, time: '26:40', pace: '9:11', location: 'New York, NY', date: '2025-06-11' },
  { id: 'a07', name: 'Tempo Treadmill', type: 'indoor', distance: 4.00, time: '31:55', pace: '7:59', location: 'Crunch Union Sq', date: '2025-06-10' },
  { id: 'a08', name: 'Brooklyn Bridge Cruise', type: 'outdoor', distance: 5.20, time: '44:08', pace: '8:29', location: 'Brooklyn, NY', date: '2025-06-09' },
  { id: 'a09', name: 'Recovery Walk/Run', type: 'outdoor', distance: 2.40, time: '24:55', pace: '10:22', location: 'New York, NY', date: '2025-06-08' },
  { id: 'a10', name: 'Treadmill Hill Repeats', type: 'indoor', distance: 3.30, time: '28:48', pace: '8:43', location: 'Home Gym', date: '2025-06-07' },
  { id: 'a11', name: 'Central Park North', type: 'outdoor', distance: 6.20, time: '52:40', pace: '8:30', location: 'New York, NY', date: '2025-06-06' },
  { id: 'a12', name: 'Evening TM Flush', type: 'indoor', distance: 2.00, time: '18:05', pace: '9:02', location: 'Equinox SoHo', date: '2025-06-05' },
  { id: 'a13', name: 'Queensboro Quickie', type: 'outdoor', distance: 3.40, time: '28:00', pace: '8:14', location: 'Long Island City, NY', date: '2025-06-04' },
  { id: 'a14', name: 'Treadmill Progression', type: 'indoor', distance: 3.60, time: '29:40', pace: '8:14', location: 'Home Gym', date: '2025-06-03' },
  { id: 'a15', name: 'Battery Park Breezy', type: 'outdoor', distance: 4.90, time: '41:10', pace: '8:24', location: 'New York, NY', date: '2025-06-02' },
  { id: 'a16', name: 'Morning TM Easy', type: 'indoor', distance: 2.70, time: '24:18', pace: '9:00', location: 'Home Gym', date: '2025-06-01' },
  { id: 'a17', name: 'Williamsburg Sunset', type: 'outdoor', distance: 5.00, time: '42:35', pace: '8:31', location: 'Brooklyn, NY', date: '2025-05-31' },
  { id: 'a18', name: 'Gym Intervals', type: 'indoor', distance: 3.10, time: '24:40', pace: '7:57', location: 'Crunch Union Sq', date: '2025-05-30' },
  { id: 'a19', name: 'Pier 26 Laps', type: 'outdoor', distance: 3.80, time: '32:10', pace: '8:28', location: 'New York, NY', date: '2025-05-29' },
  { id: 'a20', name: 'TM Late Night', type: 'indoor', distance: 2.50, time: '22:40', pace: '9:04', location: 'Home Gym', date: '2025-05-28' },
  { id: 'a21', name: 'Harlem Hills', type: 'outdoor', distance: 4.30, time: '39:35', pace: '9:12', location: 'New York, NY', date: '2025-05-27' },
  { id: 'a22', name: 'Treadmill Fartlek', type: 'indoor', distance: 3.90, time: '30:52', pace: '7:55', location: 'Equinox SoHo', date: '2025-05-26' },
  { id: 'a23', name: 'Coney Boardwalk', type: 'outdoor', distance: 6.80, time: '58:55', pace: '8:40', location: 'Brooklyn, NY', date: '2025-05-25' },
  { id: 'a24', name: 'Warmup + Strides (TM)', type: 'indoor', distance: 2.20, time: '18:35', pace: '8:27', location: 'Home Gym', date: '2025-05-24' },
  { id: 'a25', name: 'Queens Track Loops', type: 'outdoor', distance: 4.00, time: '33:05', pace: '8:16', location: 'Queens, NY', date: '2025-05-23' },
];

export default activities;
