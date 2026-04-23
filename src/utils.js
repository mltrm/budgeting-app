export function today() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
}

export function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

export function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function filterByPeriod(expenses, period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), day = now.getDate();

  let start;
  switch (period) {
    case 'day':
      start = new Date(y, m, day);
      break;
    case 'week': {
      const dow = now.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      start = new Date(y, m, day + diff);
      break;
    }
    case 'month':
      start = new Date(y, m, 1);
      break;
    case 'quarter':
      start = new Date(y, Math.floor(m / 3) * 3, 1);
      break;
    case 'year':
      start = new Date(y, 0, 1);
      break;
    default:
      return expenses;
  }
  return expenses.filter(e => new Date(e.date + 'T00:00:00') >= start);
}

export function buildMonthlyChartData(expenses, categories, hiddenCategories) {
  const visibleCats = categories.filter(c => !hiddenCategories.has(c.name));
  const monthMap = {};

  expenses.forEach(e => {
    if (hiddenCategories.has(e.category)) return;
    const key = getMonthKey(e.date);
    if (!monthMap[key]) monthMap[key] = { month: getMonthLabel(key), _key: key };
    monthMap[key][e.category] = (monthMap[key][e.category] || 0) + e.amount;
  });

  const sorted = Object.values(monthMap).sort((a, b) => a._key.localeCompare(b._key));
  // Keep last 24 months max
  return sorted.slice(-24);
}

export function buildTimelineData(expenses, period) {
  const filtered = filterByPeriod(expenses, period);

  let groupFn;
  let labelFn;

  if (period === 'day') {
    groupFn = e => e.date + 'T' + (e.hour || '12');
    labelFn = k => k;
  } else if (period === 'week' || period === 'month') {
    groupFn = e => e.date;
    labelFn = k => formatShortDate(k);
  } else {
    groupFn = e => getMonthKey(e.date);
    labelFn = k => getMonthLabel(k);
  }

  const map = {};
  filtered.forEach(e => {
    const k = groupFn(e);
    if (!map[k]) map[k] = { label: labelFn(k), _key: k, total: 0 };
    map[k].total += e.amount;
  });

  return Object.values(map).sort((a, b) => a._key.localeCompare(b._key));
}
