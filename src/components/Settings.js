import { html } from 'htm/react';
import { useRef, useState } from 'react';
import { useApp } from '../context.js';
import { initAndSignIn } from '../googleDrive.js';
import { GOOGLE_CLIENT_ID } from '../config.js';
import { formatCurrency } from '../utils.js';

export default function Settings() {
  const { state, dispatch, driveSyncNow, driveLoadNow } = useApp();
  const [connecting, setConnecting] = useState(false);
  const [tab, setTab] = useState('categories');
  const [newCat, setNewCat] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [editingSupplierName, setEditingSupplierName] = useState('');
  const [importError, setImportError] = useState('');
  const importInputRef = useRef(null);

  async function connectDrive() {
    setConnecting(true);
    try {
      await initAndSignIn(GOOGLE_CLIENT_ID);
      dispatch({ type: 'SET_DRIVE_CONNECTED', connected: true });
      await driveLoadNow();
    } catch (err) {
      dispatch({ type: 'SET_DRIVE_ERROR', error: err.message });
    } finally {
      setConnecting(false);
    }
  }

  function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    dispatch({ type: 'ADD_CATEGORY', name });
    setNewCat('');
  }

  function addSupplier() {
    const name = newSupplier.trim();
    if (!name) return;
    dispatch({ type: 'ADD_SUPPLIER', name });
    setNewSupplier('');
  }

  function exportData() {
    const payload = JSON.stringify({
      expenses: state.expenses,
      suppliers: state.suppliers,
      categories: state.categories,
      exported_at: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const [file] = event.target.files || [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.expenses) || !Array.isArray(parsed.suppliers) || !Array.isArray(parsed.categories)) {
          throw new Error('Invalid import format.');
        }
        dispatch({ type: 'REPLACE_DATA', data: parsed });
        setImportError('');
      } catch (error) {
        setImportError(error.message || 'Import failed.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);

  return html`
    <div className="min-h-screen px-4 pt-12 pb-28 bg-[#f5f5f5]">
      <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="mb-1 text-[12px] leading-[18px] font-semibold text-[#999999]">App controls</p>
        <h1 className="text-[34px] leading-[1.1] font-bold text-black">Settings</h1>
      </div>

      <!-- Stats summary -->
      <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4 mb-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[24px] leading-[1.1] font-bold text-black">${state.expenses.length}</p>
            <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">Expenses</p>
          </div>
          <div>
            <p className="text-[24px] leading-[1.1] font-bold text-black">${state.suppliers.length}</p>
            <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">Suppliers</p>
          </div>
          <div>
            <p className="text-[20px] leading-[1.1] font-bold text-black truncate">${formatCurrency(totalExpenses)}</p>
            <p className="text-[12px] leading-[18px] font-semibold text-[#999999]">Total</p>
          </div>
        </div>
      </div>

      <!-- Account -->
      ${state.user && html`
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4 mb-5 flex items-center gap-3">
          ${state.user.picture
            ? html`<img src=${state.user.picture} className="w-10 h-10 rounded-full flex-shrink-0" alt="avatar" />`
            : html`<div className="w-10 h-10 rounded-full bg-[#1B5E52] flex items-center justify-center text-white font-semibold flex-shrink-0">${(state.user.name || state.user.email || '?')[0].toUpperCase()}</div>`
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-black truncate">${state.user.name || 'Google User'}</p>
            <p className="text-xs text-[#999999] truncate">${state.user.email || ''}</p>
          </div>
          <button
            onClick=${() => dispatch({ type: 'SIGN_OUT' })}
            className="text-xs font-semibold text-red-500 px-3 py-1.5 rounded-xl border border-red-100 hover:bg-red-50 flex-shrink-0"
          >
            Sign out
          </button>
        </div>
      `}

      <!-- Google Drive sync -->
      <section className="mb-5">
        <h2 className="text-[16px] leading-6 font-semibold text-black mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
          </svg>
          Google Drive Sync
        </h2>

        ${state.drive.connected
          ? html`
            <div className="bg-white border border-[#eef2ef] rounded-[16px] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-black">Connected</span>
                </div>
                ${state.drive.syncing && html`<span className="text-xs text-[#999999] animate-pulse">Syncing…</span>`}
              </div>
              ${state.drive.lastSync && html`
                <p className="text-xs text-[#999999] mb-3">Last synced: ${new Date(state.drive.lastSync).toLocaleString()}</p>
              `}
              <div className="flex gap-2">
                <button onClick=${driveSyncNow} disabled=${state.drive.syncing}
                  className="flex-1 py-2 text-xs font-medium bg-black text-white rounded-[16px] disabled:opacity-50">
                  Sync Now
                </button>
                <button onClick=${driveLoadNow} disabled=${state.drive.syncing}
                  className="flex-1 py-2 text-xs font-medium border border-[#e5e5e5] text-black rounded-[16px] disabled:opacity-50">
                  Load from Drive
                </button>
                <button onClick=${() => dispatch({ type: 'DRIVE_DISCONNECT' })}
                  className="py-2 px-3 text-xs font-medium border border-[#e5e5e5] text-[#999999] rounded-[16px]">
                  Disconnect
                </button>
              </div>
            </div>
          `
          : html`
            <div className="bg-white border border-[#eef2ef] rounded-[16px] p-4">
              <p className="text-xs text-[#999999] mb-4">
                Back up and sync your data across devices via Google Drive.
              </p>
              <button onClick=${connectDrive} disabled=${connecting}
                className="w-full py-3 bg-black text-white text-sm font-semibold rounded-[16px] disabled:opacity-50">
                ${connecting ? 'Connecting…' : 'Connect Google Drive'}
              </button>
            </div>
          `
        }
        ${state.drive.error && html`
          <div className="mt-2 p-3 bg-white border border-[#eef2ef] rounded-[16px] text-xs text-[#999999]">${state.drive.error}</div>
        `}
      </section>

      <section className="mb-5">
        <h2 className="text-[16px] leading-6 font-semibold text-black mb-3">Backup</h2>
        <div className="bg-white rounded-[16px] border border-[#eef2ef] p-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick=${exportData} className="rounded-[16px] bg-black px-4 py-3 text-sm font-semibold text-white">
              Export JSON
            </button>
            <button
              onClick=${() => importInputRef.current?.click()}
              className="rounded-[16px] border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              Import JSON
            </button>
          </div>
          <input ref=${importInputRef} type="file" accept="application/json" className="hidden" onChange=${importData} />
          ${importError && html`<p className="mt-3 text-sm text-[#999999]">${importError}</p>`}
        </div>
      </section>

      <!-- Tabs -->
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
        <button
          onClick=${() => setTab('categories')}
          className=${`h-8 shrink-0 rounded-full px-4 text-[12px] font-semibold transition-colors ${tab === 'categories' ? 'bg-black text-white' : 'bg-white text-black'}`}
        >
          Categories (${state.categories.length})
        </button>
        <button
          onClick=${() => setTab('suppliers')}
          className=${`h-8 shrink-0 rounded-full px-4 text-[12px] font-semibold transition-colors ${tab === 'suppliers' ? 'bg-black text-white' : 'bg-white text-black'}`}
        >
          Suppliers (${state.suppliers.length})
        </button>
      </div>

      <!-- Categories tab -->
      ${tab === 'categories' && html`
        <div className="rounded-[16px] border border-[#eef2ef] bg-white p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value=${newCat}
              onInput=${e => setNewCat(e.target.value)}
              onKeyDown=${e => e.key === 'Enter' && addCategory()}
              placeholder="New category name..."
              className="flex-1 rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-sm text-black focus:outline-none"
            />
            <button
              onClick=${addCategory}
              disabled=${!newCat.trim()}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-[16px] disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="space-y-1.5">
            ${state.categories.map(cat => html`
              <div key=${cat.id} className="flex items-center gap-3 bg-white rounded-[16px] border border-[#eef2ef] px-3 py-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style=${{ backgroundColor: cat.color }}></span>
                <span className="text-sm text-black flex-1">${cat.name}</span>
                ${cat.is_default
                  ? html`<span className="text-xs text-[#999999]">default</span>`
                  : html`
                    <button
                      onClick=${() => setDeleteConfirm({ id: cat.id, name: cat.name, type: 'category' })}
                      className="text-[#999999] transition-colors p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  `
                }
              </div>
            `)}
          </div>
        </div>
      `}

      <!-- Suppliers tab -->
      ${tab === 'suppliers' && html`
        <div className="rounded-[16px] border border-[#eef2ef] bg-white p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value=${newSupplier}
              onInput=${e => setNewSupplier(e.target.value)}
              onKeyDown=${e => e.key === 'Enter' && addSupplier()}
              placeholder="New supplier name..."
              className="flex-1 rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-sm text-black focus:outline-none"
            />
            <button
              onClick=${addSupplier}
              disabled=${!newSupplier.trim()}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-[16px] disabled:opacity-50"
            >
              Add
            </button>
          </div>
          ${state.suppliers.length === 0
            ? html`<p className="text-sm text-[#999999] py-4 text-center">No suppliers yet. Add one here or while logging an expense.</p>`
            : html`
              <div className="space-y-1.5">
                ${[...state.suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => html`
                  <div key=${s.id} className="flex items-center gap-3 bg-white rounded-[16px] border border-[#eef2ef] px-3 py-3">
                    ${editingSupplierId === s.id
                      ? html`
                          <input
                            type="text"
                            value=${editingSupplierName}
                            onInput=${e => setEditingSupplierName(e.target.value)}
                            className="flex-1 rounded-[16px] border border-[#eef2ef] bg-white px-4 py-3 text-sm text-black focus:outline-none"
                          />
                        `
                      : html`<span className="text-sm text-black flex-1">${s.name}</span>`
                    }
                    <select
                      value=""
                      onChange=${e => {
                        if (!e.target.value) return;
                        dispatch({ type: 'MERGE_SUPPLIER', sourceId: s.id, targetId: e.target.value });
                      }}
                      className="px-2 py-2 border border-[#eef2ef] rounded-[16px] text-xs bg-white text-[#999999]"
                    >
                      <option value="">Merge into…</option>
                      ${state.suppliers.filter((target) => target.id !== s.id).map((target) => html`
                        <option key=${target.id} value=${target.id}>${target.name}</option>
                      `)}
                    </select>
                    ${editingSupplierId === s.id
                      ? html`
                          <button
                            onClick=${() => {
                              dispatch({ type: 'RENAME_SUPPLIER', id: s.id, name: editingSupplierName });
                              setEditingSupplierId(null);
                              setEditingSupplierName('');
                            }}
                            className="text-black text-xs font-semibold px-2"
                          >
                            Save
                          </button>
                          <button
                            onClick=${() => {
                              setEditingSupplierId(null);
                              setEditingSupplierName('');
                            }}
                            className="text-[#999999] text-xs font-semibold px-2"
                          >
                            Cancel
                          </button>
                        `
                      : html`
                          <button
                            onClick=${() => {
                              setEditingSupplierId(s.id);
                              setEditingSupplierName(s.name);
                            }}
                            className="text-black text-xs font-semibold px-2"
                          >
                            Rename
                          </button>
                        `
                    }
                    <button
                      onClick=${() => {
                        setDeleteConfirm({ id: s.id, name: s.name, type: 'supplier' });
                      }}
                      className="text-[#999999] transition-colors p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                `)}
              </div>
            `
          }
        </div>
      `}

      <!-- Delete confirm modal -->
      ${deleteConfirm && html`
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Delete "${deleteConfirm.name}"?</h3>
            <p className="text-sm text-gray-500 mb-5">
              ${deleteConfirm.type === 'category'
                ? 'Existing expenses will keep the name but this category will be removed from the list.'
                : 'This supplier will be removed from the autocomplete list.'}
            </p>
            <div className="flex gap-3">
              <button onClick=${() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick=${() => {
                  if (deleteConfirm.type === 'category') dispatch({ type: 'DELETE_CATEGORY', id: deleteConfirm.id });
                  else dispatch({ type: 'DELETE_SUPPLIER', id: deleteConfirm.id });
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      `}
      </div>
    </div>
  `;
}
