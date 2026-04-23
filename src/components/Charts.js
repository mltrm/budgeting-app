import { html } from 'htm/react';
import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context.js';
import { buildMonthlyChartData, formatCurrency, getMonthKey, getMonthLabel, formatShortDate } from '../utils.js';

const PERIODS = [
  { key: 'week',    label: 'Week' },
  { key: 'month',   label: 'Month' },
  { key: 'quarter', label: 'Last 3 months' },
  { key: 'year',    label: 'Year' },
  { key: 'all',     label: 'All time' }
];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPeriodRange(period, offset) {
  const now = new Date();
  const today = startOfDay(now);

  switch (period) {
    case 'week': {
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const baseStart = addDays(today, diffToMonday);
      const start = addDays(baseStart, -7 * offset);
      const end = endOfDay(addDays(start, 6));
      return { start, end };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const end = endOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0));
      return { start, end };
    }
    case 'quarter': {
      const endMonthStart = new Date(today.getFullYear(), today.getMonth() - (offset * 3), 1);
      const start = new Date(endMonthStart.getFullYear(), endMonthStart.getMonth() - 2, 1);
      const end = endOfDay(new Date(endMonthStart.getFullYear(), endMonthStart.getMonth() + 1, 0));
      return { start, end };
    }
    case 'year': {
      const start = new Date(today.getFullYear() - offset, 0, 1);
      const end = endOfDay(new Date(start.getFullYear(), 11, 31));
      return { start, end };
    }
    default:
      return null;
  }
}

function filterExpensesForRange(expenses, range) {
  if (!range) return expenses;
  return expenses.filter((expense) => {
    const date = new Date(expense.date + 'T00:00:00');
    return date >= range.start && date <= range.end;
  });
}

function getRangeLabel(period, range) {
  if (!range) return 'All time';

  if (period === 'week') {
    return `${formatShortDate(range.start.toISOString().slice(0, 10))} - ${formatShortDate(range.end.toISOString().slice(0, 10))}`;
  }
  if (period === 'month') {
    return range.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (period === 'quarter') {
    const startLabel = range.start.toLocaleDateString('en-US', { month: 'short' });
    const endLabel = range.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  }
  if (period === 'year') {
    return String(range.start.getFullYear());
  }
  return 'All time';
}

function buildTimelineDataForRange(expenses, period, range) {
  if (!range) {
    const monthMap = {};
    expenses.forEach((expense) => {
      const key = getMonthKey(expense.date);
      if (!monthMap[key]) monthMap[key] = { label: getMonthLabel(key), _key: key, total: 0 };
      monthMap[key].total += expense.amount;
    });
    return Object.values(monthMap).sort((a, b) => a._key.localeCompare(b._key));
  }

  if (period === 'week' || period === 'month') {
    const rows = [];
    for (let date = new Date(range.start); date <= range.end; date = addDays(date, 1)) {
      const key = date.toISOString().slice(0, 10);
      rows.push({ label: formatShortDate(key), _key: key, total: 0 });
    }
    const rowMap = Object.fromEntries(rows.map((row) => [row._key, row]));
    expenses.forEach((expense) => {
      if (rowMap[expense.date]) rowMap[expense.date].total += expense.amount;
    });
    return rows;
  }

  const rows = [];
  for (
    let date = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    date <= range.end;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  ) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    rows.push({ label: getMonthLabel(key), _key: key, total: 0 });
  }
  const rowMap = Object.fromEntries(rows.map((row) => [row._key, row]));
  expenses.forEach((expense) => {
    const key = getMonthKey(expense.date);
    if (rowMap[key]) rowMap[key].total += expense.amount;
  });
  return rows;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return html`
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">${label}</p>
      ${payload.map(p => html`
        <div key=${p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style=${{ backgroundColor: p.color }}></span>
          <span className="text-gray-600">${p.name}:</span>
          <span className="font-medium text-gray-900">${formatCurrency(p.value)}</span>
        </div>
      `)}
      ${payload.length > 1 && html`
        <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between">
          <span className="text-gray-500">Total:</span>
          <span className="font-semibold">${formatCurrency(payload.reduce((s, p) => s + (p.value || 0), 0))}</span>
        </div>
      `}
    </div>
  `;
}

function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return html`
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">${label}</p>
      <p className="font-semibold text-indigo-600">${formatCurrency(payload[0]?.value || 0)}</p>
    </div>
  `;
}

export default function Charts({ onCreateExpense }) {
  const { state } = useApp();
  const [period, setPeriod] = useState('month');
  const [offset, setOffset] = useState(0);
  const [hiddenCats, setHiddenCats] = useState(new Set());

  function toggleCat(name) {
    setHiddenCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function showAllCategories() {
    setHiddenCats(new Set());
  }

  function hideAllCategories() {
    setHiddenCats(new Set(state.categories.map((category) => category.name)));
  }

  const range = useMemo(() => getPeriodRange(period, offset), [period, offset]);

  const filteredExpenses = useMemo(() => {
    return filterExpensesForRange(state.expenses, range);
  }, [state.expenses, range]);

  const previousRange = useMemo(
    () => (period === 'all' ? null : getPeriodRange(period, offset + 1)),
    [period, offset]
  );
  const previousFilteredExpenses = useMemo(
    () => filterExpensesForRange(state.expenses, previousRange),
    [state.expenses, previousRange]
  );

  const monthlyData = useMemo(() => {
    return buildMonthlyChartData(filteredExpenses, state.categories, hiddenCats);
  }, [filteredExpenses, state.categories, hiddenCats]);

  const timelineData = useMemo(() => {
    return buildTimelineDataForRange(filteredExpenses, period, range);
  }, [filteredExpenses, period, range]);

  const totalSpend = useMemo(() =>
    filteredExpenses.filter(e => !hiddenCats.has(e.category)).reduce((s, e) => s + e.amount, 0),
    [filteredExpenses, hiddenCats]
  );
  const previousSpend = useMemo(() =>
    previousFilteredExpenses.filter(e => !hiddenCats.has(e.category)).reduce((s, e) => s + e.amount, 0),
    [previousFilteredExpenses, hiddenCats]
  );
  const comparisonAmount = totalSpend - previousSpend;
  const comparisonCount = filteredExpenses.filter(e => !hiddenCats.has(e.category)).length -
    previousFilteredExpenses.filter(e => !hiddenCats.has(e.category)).length;

  const topCategories = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      if (hiddenCats.has(e.category)) return;
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total, cat: state.categories.find(c => c.name === name) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredExpenses, hiddenCats, state.categories]);

  const activeCatsInData = useMemo(() => {
    const names = new Set();
    monthlyData.forEach(row => {
      Object.keys(row).forEach(k => { if (k !== 'month' && k !== '_key') names.add(k); });
    });
    return state.categories.filter(c => names.has(c.name) && !hiddenCats.has(c.name));
  }, [monthlyData, state.categories, hiddenCats]);

  const rangeLabel = useMemo(() => getRangeLabel(period, range), [period, range]);

  if (state.expenses.length === 0) {
    return html`
      <div className="min-h-screen px-4 pt-12 pb-28 bg-[#f5f5f5]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Spending insights</p>
            <h1 className="text-[34px] leading-[1.1] font-bold text-black">Analytics</h1>
          </div>
          <div className="rounded-[16px] border border-[#eef2ef] bg-white py-20 text-center text-[#999999]">
            <svg className="mx-auto mb-3 opacity-40" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Add some expenses first to see charts.</p>
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div className="min-h-screen px-4 pt-12 pb-28 bg-[#f5f5f5]">
      <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Spending insights</p>
        <h1 className="text-[34px] leading-[1.1] font-bold text-black">Analytics</h1>
      </div>

      <!-- Period filter -->
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
        ${PERIODS.map(p => html`
          <button
            key=${p.key}
            onClick=${() => {
              setPeriod(p.key);
              setOffset(0);
            }}
            className=${`h-8 shrink-0 rounded-full px-4 text-[12px] font-semibold transition-colors ${
              period === p.key
                ? 'bg-black text-white'
                : 'bg-white text-black'
            }`}
          >
            ${p.label}
          </button>
        `)}
      </div>

      ${period !== 'all' && html`
        <div className="bg-white rounded-[16px] border border-[#eef2ef] px-4 py-3 mb-5 flex items-center justify-between">
          <button
            onClick=${() => setOffset((value) => value + 1)}
            className="w-10 h-10 rounded-full bg-[#f3f3f3] text-black flex items-center justify-center"
            aria-label="Previous period"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">Selected range</p>
            <p className="text-[16px] leading-6 font-semibold text-black mt-1">${rangeLabel}</p>
          </div>
          <button
            onClick=${() => setOffset((value) => Math.max(0, value - 1))}
            disabled=${offset === 0}
            className="w-10 h-10 rounded-full bg-[#f3f3f3] text-black flex items-center justify-center disabled:opacity-40"
            aria-label="Next period"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      `}

      <!-- Summary stats -->
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4">
          <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Total spent</p>
          <p className="text-[24px] leading-[1.1] font-bold text-black">${formatCurrency(totalSpend)}</p>
        </div>
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4">
          <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Transactions</p>
          <p className="text-[24px] leading-[1.1] font-bold text-black">${filteredExpenses.filter(e => !hiddenCats.has(e.category)).length}</p>
        </div>
      </div>

      ${period !== 'all' && html`
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4">
            <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Vs previous period</p>
            <p className="text-[24px] leading-[1.1] font-bold text-black">
              ${comparisonAmount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(comparisonAmount))}
            </p>
          </div>
          <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4">
            <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Transaction change</p>
            <p className="text-[24px] leading-[1.1] font-bold text-black">
              ${comparisonCount >= 0 ? '+' : ''}${comparisonCount}
            </p>
          </div>
        </div>
      `}

      <!-- Category toggles -->
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">Categories</p>
          <div className="flex items-center gap-2">
            <button
              onClick=${showAllCategories}
              className="text-[12px] font-semibold text-black"
            >
              Select all
            </button>
            <button
              onClick=${hideAllCategories}
              className="text-[12px] font-semibold text-[#999999]"
            >
              Deselect all
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          ${state.categories.map(c => html`
            <button
              key=${c.id}
              onClick=${() => toggleCat(c.name)}
              className=${`h-8 rounded-full px-4 text-[12px] font-semibold transition-all ${
                hiddenCats.has(c.name)
                  ? 'bg-white text-[#999999]'
                  : 'bg-black text-white'
              }`}
            >
              ${c.name}
            </button>
          `)}
        </div>
      </div>

      <!-- Top categories for period -->
      ${filteredExpenses.length === 0 && html`
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-8 mb-5 text-center">
          <p className="text-lg font-semibold text-black mb-2">No spending in this range</p>
          <p className="text-sm text-[#999999]">Move to a previous period or add an expense for ${rangeLabel}.</p>
          <button
            onClick=${() => onCreateExpense?.()}
            className="mt-5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            Add expense
          </button>
        </div>
      `}

      ${topCategories.length > 0 && html`
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4 mb-5">
          <p className="text-[16px] leading-6 font-semibold text-black mb-4">Breakdown by category</p>
          <div className="flex items-center gap-4">
            <${ResponsiveContainer} width=${160} height=${160}>
              <${PieChart}>
                <${Pie}
                  data=${topCategories}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius=${48}
                  outerRadius=${72}
                  strokeWidth=${0}
                >
                  ${topCategories.map(({ name, cat }) => html`
                    <${Cell} key=${name} fill=${cat?.color || '#9ca3af'} />
                  `)}
                <//>
              <//>
            <//>
            <div className="flex-1 space-y-2 min-w-0">
              ${topCategories.map(({ name, total, cat }) => html`
                <div key=${name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style=${{ backgroundColor: cat?.color || '#9ca3af' }}></span>
                  <span className="text-[13px] text-[#243532] flex-1 min-w-0 truncate">${name}</span>
                  <span className="text-[12px] font-semibold text-[#999999]">${totalSpend > 0 ? Math.round(total / totalSpend * 100) : 0}%</span>
                </div>
              `)}
            </div>
          </div>
        </div>
      `}

      <!-- Spending over time (area chart) -->
      ${timelineData.length > 0 && html`
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4 mb-5">
          <p className="text-[16px] leading-6 font-semibold text-black mb-3">Spending over time</p>
          <${ResponsiveContainer} width="100%" height=${200}>
            <${AreaChart} data=${timelineData} margin=${{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity=${0.16}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity=${0}/>
                </linearGradient>
              </defs>
              <${CartesianGrid} strokeDasharray="3 3" stroke="#f3f4f6" />
              <${XAxis} dataKey="label" tick=${{ fontSize: 10, fill: '#9ca3af' }} axisLine=${false} tickLine=${false} />
              <${YAxis} tick=${{ fontSize: 10, fill: '#9ca3af' }} axisLine=${false} tickLine=${false} tickFormatter=${v => '€' + (v >= 1000 ? Math.round(v/1000) + 'k' : v)} />
              <${Tooltip} content=${AreaTooltip} />
              <${Area} type="monotone" dataKey="total" stroke="#000000" strokeWidth=${2.5} fill="url(#colorTotal)" />
            <//>
          <//>
        </div>
      `}

      <!-- Monthly stacked bar chart -->
      ${monthlyData.length > 0 && html`
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4 mb-5">
          <p className="text-[16px] leading-6 font-semibold text-black mb-3">Monthly totals by category</p>
          <${ResponsiveContainer} width="100%" height=${250}>
            <${BarChart} data=${monthlyData} margin=${{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <${CartesianGrid} strokeDasharray="3 3" stroke="#f3f4f6" />
              <${XAxis} dataKey="month" tick=${{ fontSize: 10, fill: '#9ca3af' }} axisLine=${false} tickLine=${false} />
              <${YAxis} tick=${{ fontSize: 10, fill: '#9ca3af' }} axisLine=${false} tickLine=${false} tickFormatter=${v => '€' + (v >= 1000 ? Math.round(v/1000) + 'k' : v)} />
              <${Tooltip} content=${CustomTooltip} />
              ${activeCatsInData.map(c => html`
                <${Bar} key=${c.name} dataKey=${c.name} stackId="a" fill=${c.color} radius=${[0,0,0,0]} />
              `)}
            <//>
          <//>
        </div>
      `}
    </div>
    </div>
  `;
}
