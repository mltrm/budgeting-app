import { html } from 'htm/react';
import { useMemo, useState } from 'react';
import { useApp } from './context.js';
import Navigation from './components/Navigation.js';
import ExpenseList from './components/ExpenseList.js';
import Charts from './components/Charts.js';
import Settings from './components/Settings.js';
import Home from './components/Home.js';
import ExpenseForm from './components/ExpenseForm.js';
import ExpenseDetail from './components/ExpenseDetail.js';

const VIEWS = {
  home: Home,
  list: ExpenseList,
  charts: Charts,
  settings: Settings
};

export default function App() {
  const { state } = useApp();
  const [entryOpen, setEntryOpen] = useState(false);
  const [detailExpenseId, setDetailExpenseId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [entryDraft, setEntryDraft] = useState(null);

  const editingExpense = useMemo(
    () => state.expenses.find((expense) => expense.id === editingExpenseId) || null,
    [state.expenses, editingExpenseId]
  );

  if (!state.loaded) {
    return html`
      <div className="min-h-screen flex items-center justify-center bg-[#f3f1ed]">
        <div className="flex flex-col items-center gap-3 text-[#5c7d74]">
          <div className="w-10 h-10 border-2 border-white/70 border-t-[#2d7b6a] rounded-full animate-spin"></div>
          <p className="text-sm font-medium tracking-[0.2em] uppercase">Loading</p>
        </div>
      </div>
    `;
  }

  const View = VIEWS[state.view] || Home;

  function closeEntry() {
    setEntryOpen(false);
    setEditingExpenseId(null);
    setEntryDraft(null);
  }

  function closeDetail() {
    setDetailExpenseId(null);
  }

  function openCreateEntry() {
    setDetailExpenseId(null);
    setEditingExpenseId(null);
    setEntryDraft(null);
    setEntryOpen(true);
  }

  function openEditEntry(id) {
    setDetailExpenseId(null);
    setEditingExpenseId(id);
    setEntryDraft(null);
    setEntryOpen(true);
  }

  function openDraftEntry(draft) {
    setDetailExpenseId(null);
    setEditingExpenseId(null);
    setEntryDraft(draft);
    setEntryOpen(true);
  }

  const showingDetail = !!detailExpenseId && !entryOpen;

  return html`
    <div className="h-[100dvh] overflow-hidden bg-[#f5f5f5] text-slate-900 relative">
      ${state.drive.syncing && html`
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/40 z-[70] overflow-hidden">
          <div className="h-full bg-[#2d7b6a] animate-pulse w-full"></div>
        </div>
      `}

      <div
        className=${`h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          entryOpen ? 'scale-[0.97] -translate-y-4 opacity-0 pointer-events-none blur-[1px]' : 'scale-100 translate-y-0 opacity-100'
        }`}
      >
        <main className="flex-1 min-h-0 pb-32 overflow-y-auto overscroll-contain">
          ${showingDetail
            ? html`
                <${ExpenseDetail}
                  expenseId=${detailExpenseId}
                  onBack=${() => setDetailExpenseId(null)}
                  onEdit=${openEditEntry}
                  onSelectExpense=${setDetailExpenseId}
                  onDuplicate=${openDraftEntry}
                />
              `
            : html`
                <${View}
                  onExpenseClick=${setDetailExpenseId}
                  onEditExpense=${openEditEntry}
                  onCreateExpense=${openCreateEntry}
                  onQuickAdd=${openDraftEntry}
                />
              `}
        </main>
      </div>

      <${Navigation}
        entryOpen=${entryOpen}
        onToggleEntry=${() => (entryOpen ? closeEntry() : openCreateEntry())}
        onNavigate=${() => {
          closeEntry();
          closeDetail();
        }}
      />

      <div
        className=${`modal-overlay fixed inset-0 z-50 bg-[#0e1a17]/45 backdrop-blur-sm ${entryOpen ? 'open' : 'closed'}`}
        onClick=${closeEntry}
      ></div>

      <div
        className=${`modal-sheet fixed inset-x-0 bottom-0 z-[60] px-4 pb-5 ${entryOpen ? 'open' : 'closed'}`}
        aria-hidden=${entryOpen ? 'false' : 'true'}
      >
        <div className="mx-auto max-w-2xl rounded-[20px] bg-white shadow-[0_-24px_80px_rgba(16,32,28,0.18)] border border-[#eef2ef] overflow-hidden">
          <div className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">${editingExpense ? 'Update expense' : 'Quick add'}</p>
              <h2 className="text-[28px] leading-[1.1] font-bold text-black mt-1">${editingExpense ? 'Edit expense' : 'New expense'}</h2>
            </div>
            <button
              onClick=${closeEntry}
              className="w-11 h-11 rounded-full bg-white text-black border border-[#eef2ef] flex items-center justify-center"
              aria-label="Close expense form"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto px-1 pb-1">
            <${ExpenseForm}
              editExpense=${editingExpense}
              draftExpense=${entryDraft}
              onDone=${closeEntry}
            />
          </div>
        </div>
      </div>
    </div>
  `;
}
