import { html } from 'htm/react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context.js';
import { formatDate, formatCurrency } from '../utils.js';
import SupplierAvatar from './SupplierAvatar.js';

export default function ExpenseList({ onExpenseClick, onEditExpense, onCreateExpense, filterPreset, onFilterPresetApplied }) {
  const { state, dispatch } = useApp();
  const [deleteId, setDeleteId] = useState(null);
  const [swipedId, setSwipedId] = useState(null);
  const swipeStartX = useRef(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (!filterPreset) return;

    setSearch(filterPreset.search || '');
    setFilterCat(filterPreset.category || '');
    setMinAmount(filterPreset.minAmount != null ? String(filterPreset.minAmount) : '');
    setMaxAmount(filterPreset.maxAmount != null ? String(filterPreset.maxAmount) : '');
    setDateFrom(filterPreset.dateFrom || '');
    setDateTo(filterPreset.dateTo || '');
    setSortBy(filterPreset.sortBy || 'recent');
    onFilterPresetApplied?.();
  }, [filterPreset, onFilterPresetApplied]);

  const categoryMap = useMemo(() => {
    const map = {};
    state.categories.forEach((category) => {
      map[category.name] = category;
    });
    return map;
  }, [state.categories]);

  const filtered = useMemo(() => {
    let list = [...state.expenses].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.created_at || 0) - (a.created_at || 0);
    });

    if (search) {
      const query = search.toLowerCase();
      list = list.filter((expense) =>
        expense.supplier?.toLowerCase().includes(query) ||
        expense.category?.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query)
      );
    }

    if (filterCat) list = list.filter((expense) => expense.category === filterCat);
    if (minAmount) list = list.filter((expense) => expense.amount >= Number(minAmount));
    if (maxAmount) list = list.filter((expense) => expense.amount <= Number(maxAmount));
    if (dateFrom) list = list.filter((expense) => expense.date >= dateFrom);
    if (dateTo) list = list.filter((expense) => expense.date <= dateTo);
    if (sortBy === 'oldest') {
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.created_at || 0) - (b.created_at || 0);
      });
    } else if (sortBy === 'highest') {
      list.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => a.amount - b.amount || b.date.localeCompare(a.date));
    }

    return list;
  }, [state.expenses, search, filterCat, minAmount, maxAmount, dateFrom, dateTo, sortBy]);

  const total = useMemo(() => filtered.reduce((sum, expense) => sum + expense.amount, 0), [filtered]);

  return html`
    <div className="min-h-screen px-4 pt-12 pb-28 bg-[#f5f5f5]">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Saved expenses</p>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-[34px] leading-[1.1] font-bold text-black">Expenses</h1>
            <span className="text-[12px] leading-[18px] font-semibold text-[#999999]">${state.expenses.length} total</span>
          </div>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search supplier, category or note"
            value=${search}
            onInput=${(event) => setSearch(event.target.value)}
            className="w-full rounded-[16px] border border-[#eef2ef] bg-white px-4 py-4 text-[15px] text-[#243532] outline-none focus:border-[#d9d9d9]"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Min amount"
              value=${minAmount}
              onInput=${(event) => setMinAmount(event.target.value)}
              className="w-full rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-[13px] font-medium text-[#243532] outline-none"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Max amount"
              value=${maxAmount}
              onInput=${(event) => setMaxAmount(event.target.value)}
              className="w-full rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-[13px] font-medium text-[#243532] outline-none"
            />
            <input
              type="date"
              value=${dateFrom}
              onInput=${(event) => setDateFrom(event.target.value)}
              className="w-full rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-[13px] font-medium text-[#243532] outline-none"
            />
            <input
              type="date"
              value=${dateTo}
              onInput=${(event) => setDateTo(event.target.value)}
              className="w-full rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-[13px] font-medium text-[#243532] outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick=${() => setFilterCat('')}
              className=${`h-8 rounded-full px-4 text-[12px] font-semibold whitespace-nowrap transition-colors ${filterCat === '' ? 'bg-black text-white' : 'bg-white text-black'}`}
            >
              All
            </button>
            ${state.categories.map((category) => html`
              <button
                key=${category.id}
                onClick=${() => setFilterCat(category.name)}
                className="h-8 rounded-full px-4 text-[12px] font-semibold whitespace-nowrap transition-colors"
                style=${filterCat === category.name ? { backgroundColor: '#000000', color: '#ffffff' } : { backgroundColor: '#ffffff', color: '#000000' }}
              >
                ${category.name}
              </button>
            `)}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            ${[
              { key: 'recent', label: 'Recent' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'highest', label: 'Highest' },
              { key: 'lowest', label: 'Lowest' }
            ].map((option) => html`
              <button
                key=${option.key}
                onClick=${() => setSortBy(option.key)}
                className=${`h-8 rounded-full px-4 text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  sortBy === option.key ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                ${option.label}
              </button>
            `)}
          </div>

          ${filtered.length > 0 && html`
            <div className="rounded-[16px] border border-[#eef2ef] bg-white px-4 py-4 flex items-center justify-between">
              <div>
                <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">Visible total</p>
                <p className="text-[28px] leading-[1.1] font-bold text-black">${formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">${filtered.length} expense${filtered.length !== 1 ? 's' : ''}</p>
                <p className="text-[11px] leading-[16px] text-[#999999] capitalize">${sortBy}</p>
              </div>
            </div>
          `}

          ${swipedId && html`
            <div className="fixed inset-0 z-10" onClick=${() => setSwipedId(null)}></div>
          `}

          ${filtered.length === 0 ? html`
            <div className="rounded-[16px] border border-[#eef2ef] bg-white py-16 text-center text-[#999999]">
              <p className="text-base">${state.expenses.length === 0 ? 'No expenses yet.' : 'No expenses match this filter.'}</p>
              ${state.expenses.length === 0
                ? html`
                    <button
                      onClick=${() => onCreateExpense?.()}
                      className="mt-5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                    >
                      Add first expense
                    </button>
                  `
                : html`
                    <button
                      onClick=${() => {
                        setSearch('');
                        setFilterCat('');
                        setMinAmount('');
                        setMaxAmount('');
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="mt-5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                    >
                      Clear filters
                    </button>
                  `
              }
            </div>
          ` : html`
            <div className="space-y-3">
              ${filtered.map((expense) => {
                const category = categoryMap[expense.category];
                const swiped = swipedId === expense.id;
                return html`
                  <div
                    key=${expense.id}
                    className="relative rounded-[16px] overflow-hidden"
                    onTouchStart=${(e) => { swipeStartX.current = e.touches[0].clientX; }}
                    onTouchEnd=${(e) => {
                      if (swipeStartX.current === null) return;
                      const dx = e.changedTouches[0].clientX - swipeStartX.current;
                      if (dx < -55) setSwipedId(expense.id);
                      else if (dx > 20) setSwipedId(null);
                      swipeStartX.current = null;
                    }}
                  >
                    <!-- Red delete zone revealed on swipe -->
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center rounded-r-[16px]">
                      <button
                        onClick=${() => { dispatch({ type: 'DELETE_EXPENSE', id: expense.id }); setSwipedId(null); }}
                        className="flex flex-col items-center gap-1 text-white"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                        </svg>
                        <span className="text-[10px] font-semibold">Delete</span>
                      </button>
                    </div>

                    <!-- Row content (slides left on swipe) -->
                    <div
                      className="bg-white border border-[#eef2ef] rounded-[16px] px-[15px] py-[15px] transition-transform duration-200"
                      style=${{ transform: swiped ? 'translateX(-80px)' : 'translateX(0)' }}
                    >
                      <div className="flex items-start gap-3">
                        <button onClick=${() => { setSwipedId(null); onExpenseClick(expense.id); }} className="flex-1 text-left flex items-start gap-3">
                          <${SupplierAvatar} name=${expense.supplier} size=${44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[16px] leading-6 font-semibold text-[#243532]">${expense.supplier || 'Unknown supplier'}</p>
                                <p className="mt-1 text-[12px] leading-[18px] font-semibold text-[#999999]">${formatDate(expense.date)}</p>
                              </div>
                              <span className="whitespace-nowrap text-[16px] leading-6 font-semibold text-[#243532]">${formatCurrency(expense.amount)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3 flex-wrap">
                              <span className="text-[12px] leading-[18px] font-semibold" style=${{ color: category?.color || '#999999' }}>
                                ${expense.category || 'Uncategorized'}
                              </span>
                              ${expense.description && html`<span className="truncate text-[12px] leading-[18px] font-medium text-[#999999]">${expense.description}</span>`}
                            </div>
                          </div>
                        </button>
                        <button onClick=${() => onEditExpense(expense.id)} className="w-9 h-9 rounded-full bg-[#f3f3f3] text-black flex items-center justify-center flex-shrink-0" aria-label="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              })}
            </div>
          `}
        </div>
      </div>

      ${deleteId && html`
        <div className="fixed inset-0 z-[70] bg-[#10211d]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-[0_24px_60px_rgba(16,33,29,0.22)]">
            <h3 className="mb-2 text-xl font-semibold text-black">Delete expense?</h3>
            <p className="mb-5 text-sm text-[#999999]">This removes the transaction permanently.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick=${() => setDeleteId(null)} className="rounded-[16px] border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-semibold text-black">
                Cancel
              </button>
              <button
                onClick=${() => {
                  dispatch({ type: 'DELETE_EXPENSE', id: deleteId });
                  setDeleteId(null);
                }}
                className="rounded-[16px] bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
