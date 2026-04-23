import { html } from 'htm/react';
import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../context.js';
import SearchableDropdown from './SearchableDropdown.js';
import { today } from '../utils.js';

function Field({ label, note, children }) {
  return html`
    <label className="block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-black">${label}</span>
        ${note && html`<span className="text-xs text-[#999999]">${note}</span>`}
      </div>
      ${children}
    </label>
  `;
}

export default function ExpenseForm({ editExpense, draftExpense, onDone }) {
  const { state, dispatch } = useApp();
  const editing = !!editExpense;
  const baseExpense = editExpense || draftExpense;

  const [date, setDate] = useState(baseExpense?.date || today());
  const [amount, setAmount] = useState(baseExpense?.amount?.toString() || '');
  const [supplier, setSupplier] = useState(baseExpense?.supplier || null);
  const [category, setCategory] = useState(baseExpense?.category || null);
  const [description, setDescription] = useState(baseExpense?.description || '');
  const [error, setError] = useState('');

  useEffect(() => {
    const next = editExpense || draftExpense;
    setDate(next?.date || today());
    setAmount(next?.amount?.toString() || '');
    setSupplier(next?.supplier || null);
    setCategory(next?.category || null);
    setDescription(next?.description || '');
    setError('');
  }, [editExpense, draftExpense]);

  const handleAddSupplier = useCallback((name) => {
    dispatch({ type: 'ADD_SUPPLIER', name });
  }, [dispatch]);

  const handleAddCategory = useCallback((name) => {
    dispatch({ type: 'ADD_CATEGORY', name });
  }, [dispatch]);

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!supplier) {
      setError('Select or create a supplier.');
      return;
    }
    if (!category) {
      setError('Select or create a category.');
      return;
    }

    const expense = {
      id: editExpense?.id || crypto.randomUUID(),
      date,
      amount: parsedAmount,
      supplier,
      category,
      description: description.trim(),
      created_at: editExpense?.created_at || Date.now()
    };

    dispatch({ type: editing ? 'EDIT_EXPENSE' : 'ADD_EXPENSE', expense });
    onDone?.();
  }

  const inputClass = 'w-full rounded-[16px] border border-[#eef2ef] bg-white px-4 py-4 text-[15px] text-black outline-none';

  return html`
    <div className="px-5 pb-5">
      ${error && html`
        <div className="mb-4 rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-sm text-[#999999]">
          ${error}
        </div>
      `}

      <form onSubmit=${handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <${Field} label="Date">
            <input type="date" value=${date} onInput=${(event) => setDate(event.target.value)} required className=${inputClass} />
          <//>
          <${Field} label="Amount" note="EUR">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value=${amount}
              onInput=${(event) => setAmount(event.target.value)}
              placeholder="0.00"
              required
              className=${inputClass}
            />
          <//>
        </div>

        <${Field} label="Supplier">
          <${SearchableDropdown}
            options=${state.suppliers}
            value=${supplier}
            onChange=${setSupplier}
            onAddNew=${handleAddSupplier}
            placeholder="Search or create supplier"
            addLabel="Add supplier"
          />
        <//>

        <${Field} label="Category">
          <${SearchableDropdown}
            options=${state.categories}
            value=${category}
            onChange=${setCategory}
            onAddNew=${handleAddCategory}
            placeholder="Search or create category"
            addLabel="Add category"
          />
        <//>

        <${Field} label="Description" note="Optional">
          <input
            type="text"
            value=${description}
            onInput=${(event) => setDescription(event.target.value)}
            placeholder="What was this for?"
            className=${inputClass}
          />
        <//>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick=${onDone}
            className="rounded-[16px] border border-[#e5e5e5] bg-white px-4 py-4 text-sm font-semibold text-black"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-[16px] bg-black px-4 py-4 text-sm font-semibold text-white"
          >
            ${editing ? 'Save Changes' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  `;
}
