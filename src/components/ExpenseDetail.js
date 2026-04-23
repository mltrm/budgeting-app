import { html } from 'htm/react';
import { useState } from 'react';
import { useApp } from '../context.js';
import { formatCurrency, formatDate } from '../utils.js';
import SupplierAvatar from './SupplierAvatar.js';

function Row({ icon, label, value }) {
  if (!value) return null;
  return html`
    <div className="flex items-center gap-4 py-4 border-b border-[#f0f0f0] last:border-0">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#f3f3f3] text-black">
        ${icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-[18px] text-[#999999] font-semibold mb-0.5">${label}</p>
        <p className="text-[14px] font-semibold text-black truncate">${value}</p>
      </div>
    </div>
  `;
}

export default function ExpenseDetail({ expenseId, onBack, onEdit, onSelectExpense, onDuplicate }) {
  const { state, dispatch } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const orderedExpenses = [...state.expenses].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.created_at || 0) - (a.created_at || 0);
  });
  const expense = state.expenses.find(e => e.id === expenseId);
  const category = state.categories.find(c => c.name === expense?.category);
  const expenseIndex = orderedExpenses.findIndex((entry) => entry.id === expenseId);
  const previousExpense = expenseIndex >= 0 ? orderedExpenses[expenseIndex + 1] : null;
  const nextExpense = expenseIndex > 0 ? orderedExpenses[expenseIndex - 1] : null;

  if (!expense) {
    return html`
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Expense not found.</p>
      </div>
    `;
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_EXPENSE', id: expense.id });
    onBack();
  }

  return html`
    <div className="min-h-screen bg-[#f5f5f5] slide-in">
      <div className="px-4 pt-12 pb-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick=${onBack} className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-black border border-[#eef2ef]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="text-base font-semibold text-black">Expense details</h1>
            <button
              onClick=${() => onEdit(expense.id)}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-black border border-[#eef2ef]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          </div>

          <div className="rounded-[20px] overflow-hidden border border-[#eef2ef] bg-white">
            <div className="px-6 pt-7 pb-6 flex flex-col items-center">
              <div className="relative mb-5">
                <${SupplierAvatar} name=${expense.supplier} size=${88} />
              </div>

              <p className="text-[34px] leading-[1.1] font-bold text-black">${formatCurrency(expense.amount)}</p>
              <p className="text-[16px] text-[#243532] mt-2 font-semibold">${expense.supplier || '—'}</p>

              ${category && html`
                <div className="mt-3 text-[12px] leading-[18px] font-semibold" style=${{ color: category.color }}>
                  ${category.name}
                </div>
              `}
            </div>

            <div className="bg-white px-4 py-4">
              <div className="rounded-[16px] px-5 border border-[#eef2ef]">
                <div className="grid grid-cols-2 gap-3 py-4 border-b border-[#f0f0f0]">
                  <button
                    onClick=${() => onDuplicate?.({
                      supplier: expense.supplier,
                      category: expense.category,
                      amount: expense.amount,
                      description: expense.description,
                      date: new Date().toISOString().slice(0, 10)
                    })}
                    className="rounded-[16px] bg-black px-4 py-3 text-sm font-semibold text-white"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick=${() => onEdit(expense.id)}
                    className="rounded-[16px] border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-semibold text-black"
                  >
                    Edit expense
                  </button>
                </div>
                <${Row}
                  icon=${html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`}
                  label="Date"
                  value=${formatDate(expense.date)}
                />
                <${Row}
                  icon=${html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>`}
                  label="Category"
                  value=${expense.category}
                />
                ${expense.description && html`
                  <${Row}
                    icon=${html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`}
                    label="Note"
                    value=${expense.description}
                  />
                `}
                ${expense.receipt && html`
                  <div className="py-4">
                    <p className="text-[12px] leading-[18px] text-[#999999] font-semibold mb-3">Receipt</p>
                    <div className="rounded-[16px] border border-[#eef2ef] bg-[#fafafa] p-4">
                      ${expense.receipt.type?.startsWith('image/') && html`
                        <img
                          src=${expense.receipt.dataUrl}
                          alt=${expense.receipt.name || 'Receipt'}
                          className="mb-4 w-full rounded-[12px] border border-[#eef2ef] object-cover"
                        />
                      `}
                      ${!expense.receipt.type?.startsWith('image/') && html`
                        <div className="mb-4 flex items-center gap-3 rounded-[12px] border border-[#eef2ef] bg-white p-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#f3f3f3] text-black">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6"/>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-black">${expense.receipt.name || 'Receipt.pdf'}</p>
                            <p className="mt-1 text-xs text-[#999999]">PDF receipt</p>
                          </div>
                        </div>
                      `}
                      <a
                        href=${expense.receipt.dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download=${expense.receipt.name || 'receipt'}
                        className="inline-flex rounded-full bg-black px-4 py-2.5 text-[12px] font-semibold text-white"
                      >
                        Open receipt
                      </a>
                    </div>
                  </div>
                `}
              </div>
            </div>

            <div className="bg-white px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick=${() => previousExpense && onSelectExpense?.(previousExpense.id)}
                  disabled=${!previousExpense}
                  className="rounded-[16px] bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick=${() => nextExpense && onSelectExpense?.(nextExpense.id)}
                  disabled=${!nextExpense}
                  className="rounded-[16px] border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="bg-white px-4 pb-4">
              <button
                onClick=${() => setConfirmDelete(true)}
                className="w-full py-4 rounded-[16px] text-sm font-semibold text-white bg-black transition-colors"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      </div>

      ${confirmDelete && html`
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4" style=${{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-[20px] p-6 w-full max-w-sm shadow-2xl slide-up">
            <h3 className="font-bold text-black text-lg mb-1">Delete this expense?</h3>
            <p className="text-sm text-[#999999] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick=${() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-[16px] border border-[#e5e5e5] text-sm font-semibold text-black">
                Cancel
              </button>
              <button onClick=${handleDelete}
                className="flex-1 py-3 rounded-[16px] bg-black text-sm font-semibold text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
