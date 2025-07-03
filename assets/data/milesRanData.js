import moment from 'moment';

const generateDailyData = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    label: moment().subtract(6 - i, 'days').format('ddd'), // e.g., Mon, Tue
    value: parseFloat((Math.random() * 5 + 1).toFixed(2)), // 1–6 miles
  }));
};

const generateMonthlyData = () => {
  return Array.from({ length: 90 }, (_, i) => ({
    label: moment().subtract(89 - i, 'days').format('YYYY-MM-DD'),
    value: parseFloat((Math.random() * 5 + 1).toFixed(2)),
  }));
};

const generateYearlyData = () => {
  return Array.from({ length: 12 }, (_, i) => {
    const values = Array.from({ length: 30 }, () => Math.random() * 5 + 1);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      label: moment().month(i).format('MMM'),
      value: parseFloat(avg.toFixed(2)),
    };
  });
};

const milesRanData = {
  dailyData: generateDailyData(),
  monthlyData: generateMonthlyData(),
  yearlyData: generateYearlyData(),
};

export default milesRanData;
