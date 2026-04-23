import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { saveData, loadData } from './db.js';
import { syncToFile, loadFromFile, getToken, signOut as driveSignOut } from './googleDrive.js';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS } from './data/defaults.js';
import { buildSeedExpenses, buildSeedSuppliers, EXTRA_CATEGORIES } from './data/seedData.js';

function genId() { return crypto.randomUUID(); }

function makeDefaultCategories() {
  return DEFAULT_CATEGORIES.map((name, i) => ({
    id: genId(),
    name,
    is_default: true,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));
}

const initialState = {
  expenses: [],
  suppliers: [],
  categories: makeDefaultCategories(),
  loaded: false,
  view: 'home',
  drive: {
    clientId: localStorage.getItem('gdrive_client_id') || '',
    connected: false,
    syncing: false,
    lastSync: null,
    error: null
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'INIT_DATA': {
      const d = action.data;
      const categories = d.categories?.length
        ? d.categories.map((c, i) => ({
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            ...c
          }))
        : state.categories;
      return {
        ...state,
        expenses: d.expenses || [],
        suppliers: d.suppliers || [],
        categories,
        loaded: true
      };
    }
    case 'SET_LOADED':
      return { ...state, loaded: true };

    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };
    case 'EDIT_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(e => e.id === action.expense.id ? action.expense : e)
      };

    case 'ADD_SUPPLIER': {
      const name = action.name.trim();
      if (!name || state.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) return state;
      return { ...state, suppliers: [...state.suppliers, { id: genId(), name }] };
    }
    case 'DELETE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.id) };
    case 'RENAME_SUPPLIER': {
      const name = action.name.trim();
      if (!name) return state;
      const existing = state.suppliers.find((supplier) => supplier.id !== action.id && supplier.name.toLowerCase() === name.toLowerCase());
      if (existing) return state;
      const current = state.suppliers.find((supplier) => supplier.id === action.id);
      if (!current) return state;
      return {
        ...state,
        suppliers: state.suppliers.map((supplier) => supplier.id === action.id ? { ...supplier, name } : supplier),
        expenses: state.expenses.map((expense) => expense.supplier === current.name ? { ...expense, supplier: name } : expense)
      };
    }
    case 'MERGE_SUPPLIER': {
      const source = state.suppliers.find((supplier) => supplier.id === action.sourceId);
      const target = state.suppliers.find((supplier) => supplier.id === action.targetId);
      if (!source || !target || source.id === target.id) return state;
      return {
        ...state,
        suppliers: state.suppliers.filter((supplier) => supplier.id !== source.id),
        expenses: state.expenses.map((expense) => expense.supplier === source.name ? { ...expense, supplier: target.name } : expense)
      };
    }

    case 'ADD_CATEGORY': {
      const name = action.name.trim();
      if (!name || state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) return state;
      const idx = state.categories.length;
      return {
        ...state,
        categories: [
          ...state.categories,
          { id: genId(), name, is_default: false, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }
        ]
      };
    }
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.id) };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_DRIVE_CLIENT_ID':
      localStorage.setItem('gdrive_client_id', action.clientId);
      return { ...state, drive: { ...state.drive, clientId: action.clientId } };
    case 'SET_DRIVE_CONNECTED':
      return { ...state, drive: { ...state.drive, connected: action.connected, error: null } };
    case 'SET_DRIVE_SYNCING':
      return { ...state, drive: { ...state.drive, syncing: action.syncing } };
    case 'SET_DRIVE_ERROR':
      return { ...state, drive: { ...state.drive, error: action.error } };
    case 'SET_LAST_SYNC':
      return { ...state, drive: { ...state.drive, lastSync: Date.now(), error: null } };
    case 'DRIVE_DISCONNECT':
      driveSignOut();
      return { ...state, drive: { ...state.drive, connected: false, lastSync: null, error: null } };

    case 'REPLACE_DATA': {
      const d = action.data;
      const categories = d.categories?.length
        ? d.categories.map((c, i) => ({
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            ...c
          }))
        : state.categories;
      return { ...state, expenses: d.expenses || state.expenses, suppliers: d.suppliers || state.suppliers, categories };
    }

    default:
      return state;
  }
}

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const syncTimer = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadData()
      .then(data => {
        if (data && data.expenses?.length) {
          dispatch({ type: 'INIT_DATA', data });
        } else {
          // First launch — seed from CSV data
          const allCatNames = [...DEFAULT_CATEGORIES, ...EXTRA_CATEGORIES];
          const categories = allCatNames.map((name, i) => ({
            id: genId(),
            name,
            is_default: DEFAULT_CATEGORIES.includes(name),
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
          }));
          const seedData = {
            expenses: buildSeedExpenses(),
            suppliers: buildSeedSuppliers(),
            categories
          };
          saveData(seedData);
          dispatch({ type: 'INIT_DATA', data: seedData });
        }
      })
      .catch(() => dispatch({ type: 'SET_LOADED' }));
  }, []);

  const getSnapshot = useCallback(() => ({
    expenses: stateRef.current.expenses,
    suppliers: stateRef.current.suppliers,
    categories: stateRef.current.categories
  }), []);

  const driveSyncNow = useCallback(async () => {
    if (!getToken()) return;
    dispatch({ type: 'SET_DRIVE_SYNCING', syncing: true });
    try {
      await syncToFile(getSnapshot());
      dispatch({ type: 'SET_LAST_SYNC' });
    } catch (err) {
      dispatch({ type: 'SET_DRIVE_ERROR', error: err.message });
    } finally {
      dispatch({ type: 'SET_DRIVE_SYNCING', syncing: false });
    }
  }, [getSnapshot]);

  const driveLoadNow = useCallback(async () => {
    if (!getToken()) return;
    dispatch({ type: 'SET_DRIVE_SYNCING', syncing: true });
    try {
      const data = await loadFromFile();
      if (data) {
        dispatch({ type: 'REPLACE_DATA', data });
        await saveData({ expenses: data.expenses, suppliers: data.suppliers, categories: data.categories });
      }
      dispatch({ type: 'SET_LAST_SYNC' });
    } catch (err) {
      dispatch({ type: 'SET_DRIVE_ERROR', error: err.message });
    } finally {
      dispatch({ type: 'SET_DRIVE_SYNCING', syncing: false });
    }
  }, []);

  // Persist to IndexedDB and debounce Drive sync on data changes
  useEffect(() => {
    if (!state.loaded) return;
    const snapshot = { expenses: state.expenses, suppliers: state.suppliers, categories: state.categories };
    saveData(snapshot);

    if (state.drive.connected && getToken()) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(driveSyncNow, 3000);
    }
  }, [state.expenses, state.suppliers, state.categories, state.loaded]);

  return React.createElement(
    AppContext.Provider,
    { value: { state, dispatch, driveSyncNow, driveLoadNow } },
    children
  );
}

export const useApp = () => useContext(AppContext);
