import { html } from 'htm/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useApp } from '../context.js';
import { formatCurrency, formatDate } from '../utils.js';
import SupplierAvatar from './SupplierAvatar.js';

function getMonthKey(date) {
  return date?.slice(0, 7) || '';
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

function getMonthTitle(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildMonthDays(expenses, monthKey) {
  if (!monthKey) return [];

  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const totals = new Map();

  expenses.forEach((expense) => {
    if (getMonthKey(expense.date) !== monthKey) return;
    const day = Number(expense.date.split('-')[2]);
    totals.set(day, (totals.get(day) || 0) + expense.amount);
  });

  return Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    total: totals.get(index + 1) || 0
  }));
}

export default function Home({ onExpenseClick }) {
  const { state } = useApp();
  const [activeMonth, setActiveMonth] = useState('');
  const [loadedMonths, setLoadedMonths] = useState([]);
  const chipRefs = useRef({});
  const loadMoreRef = useRef(null);

  const categoryMap = useMemo(() => {
    const map = {};
    state.categories.forEach((category) => {
      map[category.name] = category;
    });
    return map;
  }, [state.categories]);

  const monthKeys = useMemo(() => {
    const keys = [...new Set(state.expenses.map((expense) => getMonthKey(expense.date)).filter(Boolean))];
    return keys.sort();
  }, [state.expenses]);

  const monthKeysDesc = useMemo(() => [...monthKeys].reverse(), [monthKeys]);
  const latestMonth = monthKeysDesc[0] || '';

  const expensesByMonth = useMemo(() => {
    const groups = {};

    state.expenses.forEach((expense) => {
      const monthKey = getMonthKey(expense.date);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(expense);
    });

    Object.values(groups).forEach((group) => {
      group.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.created_at || 0) - (a.created_at || 0);
      });
    });

    return groups;
  }, [state.expenses]);

  useEffect(() => {
    if (!latestMonth) {
      setActiveMonth('');
      setLoadedMonths([]);
      return;
    }

    setActiveMonth((current) => current || latestMonth);
    setLoadedMonths((current) => (current.length ? current : [latestMonth]));
  }, [latestMonth]);

  useEffect(() => {
    if (!activeMonth) return;
    chipRefs.current[activeMonth]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }, [activeMonth]);

  useEffect(() => {
    if (!loadMoreRef.current || !activeMonth) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        const currentIndex = monthKeysDesc.indexOf(activeMonth);
        const previousMonth = currentIndex >= 0 ? monthKeysDesc[currentIndex + 1] : null;
        if (!previousMonth) return;

        setLoadedMonths((current) => (current.includes(previousMonth) ? current : [...current, previousMonth]));
        setActiveMonth(previousMonth);
      },
      { rootMargin: '0px 0px 120px 0px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [activeMonth, monthKeysDesc]);

  const activeExpenses = useMemo(() => expensesByMonth[activeMonth] || [], [activeMonth, expensesByMonth]);
  const graphData = useMemo(() => buildMonthDays(state.expenses, activeMonth), [activeMonth, state.expenses]);
  const monthTotal = useMemo(() => activeExpenses.reduce((sum, expense) => sum + expense.amount, 0), [activeExpenses]);

  const budgetRows = useMemo(() => {
    return state.categories
      .filter(c => c.budget > 0)
      .map(c => {
        const spent = activeExpenses
          .filter(e => e.category === c.name)
          .reduce((s, e) => s + e.amount, 0);
        return { ...c, spent, pct: Math.min(100, Math.round((spent / c.budget) * 100)) };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [state.categories, activeExpenses]);

  const feedSections = useMemo(() => {
    return loadedMonths
      .map((monthKey) => ({
        monthKey,
        title: getMonthTitle(monthKey),
        expenses: expensesByMonth[monthKey] || []
      }))
      .filter((section) => section.expenses.length > 0);
  }, [expensesByMonth, loadedMonths]);

  function handleMonthSelect(monthKey) {
    setActiveMonth(monthKey);
    setLoadedMonths([monthKey]);
  }

  return html`
    <div className="min-h-full bg-[#f5f5f5] px-4 pt-12 pb-28">
      <div className="max-w-2xl mx-auto">
        <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Total spent</p>
        <h1 className="text-[34px] leading-[1.1] font-bold text-black">${formatCurrency(monthTotal)}</h1>

        <div className="mt-8 h-[170px] -mx-4">
          ${graphData.length > 1 && html`
            <${ResponsiveContainer} width="100%" height="100%">
              <${LineChart} data=${graphData} margin=${{ top: 20, right: 24, left: 24, bottom: 8 }}>
                <${Line}
                  type="monotone"
                  dataKey="total"
                  stroke="#000000"
                  strokeWidth=${5}
                  dot=${false}
                  activeDot=${false}
                  isAnimationActive=${true}
                />
              <//>
            <//>
          `}
        </div>
      </div>

      ${monthKeys.length > 0 && html`
        <div className="sticky top-0 z-20 -mx-4 mt-4 bg-[#f5f5f5]/95 px-4 py-3 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              ${monthKeysDesc.map((monthKey) => {
                const active = monthKey === activeMonth;
                return html`
                  <button
                    key=${monthKey}
                    ref=${(node) => { chipRefs.current[monthKey] = node; }}
                    onClick=${() => handleMonthSelect(monthKey)}
                    className=${`h-8 shrink-0 rounded-full px-4 text-[12px] font-semibold transition-colors ${
                      active ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                  >
                    ${getMonthLabel(monthKey)}
                  </button>
                `;
              })}
            </div>
          </div>
        </div>
      `}

      ${budgetRows.length > 0 && html`
        <div className="max-w-2xl mx-auto mt-3 mb-3">
          <h2 className="text-[16px] leading-6 font-semibold text-black mb-3">Budgets</h2>
          <div className="bg-white rounded-[20px] border border-[#eef2ef] px-4 py-3 space-y-3">
            ${budgetRows.map(row => html`
              <div key=${row.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style=${{ backgroundColor: row.color }}></span>
                    <span className="text-[13px] font-semibold text-black">${row.name}</span>
                  </div>
                  <span className="text-[12px] font-medium" style=${{ color: row.pct >= 100 ? '#ef4444' : row.pct >= 80 ? '#f59e0b' : '#999999' }}>
                    ${formatCurrency(row.spent)} / ${formatCurrency(row.budget)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style=${{
                      width: `${row.pct}%`,
                      backgroundColor: row.pct >= 100 ? '#ef4444' : row.pct >= 80 ? '#f59e0b' : row.color
                    }}
                  ></div>
                </div>
              </div>
            `)}
          </div>
        </div>
      `}

      <div className="max-w-2xl mx-auto mt-3">
        <div className="mb-4">
          <h2 className="text-[16px] leading-6 font-semibold text-black">Expenses</h2>
        </div>

        ${feedSections.length === 0 ? html`
          <div className="rounded-[16px] border border-[#eef2ef] bg-white px-5 py-8 text-center text-[#999999]">
            No expenses for ${activeMonth ? getMonthTitle(activeMonth) : 'this month'}.
          </div>
        ` : html`
          <div className="space-y-6">
            ${feedSections.map((section) => html`
              <section key=${section.monthKey}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] leading-[18px] font-semibold uppercase tracking-[0.12em] text-[#999999]">
                    ${section.title}
                  </h3>
                  <span className="text-[12px] leading-[18px] font-semibold text-[#999999]">
                    ${formatCurrency(section.expenses.reduce((sum, expense) => sum + expense.amount, 0))}
                  </span>
                </div>

                <div className="space-y-3">
                  ${section.expenses.map((expense) => {
                    const category = categoryMap[expense.category];
                    return html`
                      <button
                        key=${expense.id}
                        onClick=${() => onExpenseClick?.(expense.id)}
                        className="w-full rounded-[16px] border border-[#eef2ef] bg-white px-[15px] py-[15px] text-left"
                      >
                        <div className="flex items-start gap-3">
                          <${SupplierAvatar} name=${expense.supplier} size=${44} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] leading-6 font-semibold text-[#243532]">${expense.supplier || 'Unknown supplier'}</p>
                            <p className="truncate text-[12px] leading-[18px] font-semibold text-[#999999]">${formatDate(expense.date)}</p>
                          </div>
                          <div className="pl-3 text-right">
                            <p className="whitespace-nowrap text-[16px] leading-6 font-semibold text-[#243532]">${formatCurrency(expense.amount)}</p>
                            <p className="whitespace-nowrap text-[12px] leading-[18px] font-semibold" style=${{ color: category?.color || '#999999' }}>
                              ${expense.category || 'Uncategorized'}
                            </p>
                          </div>
                        </div>
                      </button>
                    `;
                  })}
                </div>
              </section>
            `)}

            <div ref=${loadMoreRef} className="h-4"></div>
          </div>
        `}
      </div>
    </div>
  `;
}
