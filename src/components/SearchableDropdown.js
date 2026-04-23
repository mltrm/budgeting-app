import { html } from 'htm/react';
import { useState, useRef, useEffect } from 'react';

export default function SearchableDropdown({
  options,      // [{ id, name, color? }]
  value,        // string (selected name) or null
  onChange,     // (name) => void
  onAddNew,     // (name) => void — if provided, shows "Add X" option
  placeholder,
  addLabel      // e.g. "Add supplier"
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = query
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const exactMatch = options.some(o => o.name.toLowerCase() === query.toLowerCase().trim());
  const showAdd = onAddNew && query.trim() && !exactMatch;

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function select(name) {
    onChange(name);
    setOpen(false);
    setQuery('');
  }

  function addNew() {
    const name = query.trim();
    if (!name) return;
    onAddNew(name);
    onChange(name);
    setOpen(false);
    setQuery('');
  }

  function onFocus() {
    setOpen(true);
    setQuery('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) { select(filtered[0].name); return; }
      if (showAdd) { addNew(); return; }
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  }

  return html`
    <div ref=${ref} className="relative">
      <input
        ref=${inputRef}
        type="text"
        autoComplete="off"
        className="w-full rounded-[22px] border border-[#dbe6e1] bg-white px-4 py-4 text-[15px] text-[#18362f] outline-none focus:border-[#5f9a8d] focus:ring-2 focus:ring-[#b9d6cf]"
        placeholder=${placeholder}
        value=${open ? query : (value || '')}
        onFocus=${onFocus}
        onInput=${e => setQuery(e.target.value)}
        onKeyDown=${onKeyDown}
      />
      ${value && !open && html`
        <button
          type="button"
          onClick=${() => { onChange(null); setQuery(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Clear"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 4.586L1.707.293.293 1.707 4.586 6 .293 10.293l1.414 1.414L6 7.414l4.293 4.293 1.414-1.414L7.414 6l4.293-4.293L10.293.293z"/>
          </svg>
        </button>
      `}
      ${open && html`
        <div className="absolute z-50 w-full mt-2 bg-white border border-[#dbe6e1] rounded-[22px] shadow-[0_18px_40px_rgba(24,54,47,0.12)] max-h-56 overflow-y-auto dropdown-scroll">
          ${filtered.length === 0 && !showAdd && html`
            <p className="px-4 py-3 text-sm text-[#7f9891]">No results found</p>
          `}
          ${filtered.map(opt => html`
            <button
              key=${opt.id || opt.name}
              type="button"
              className="w-full text-left px-4 py-3 text-sm hover:bg-[#eef6f3] hover:text-[#2f7b6c] transition-colors flex items-center gap-2"
              onMouseDown=${() => select(opt.name)}
            >
              ${opt.color && html`<span className="w-2 h-2 rounded-full flex-shrink-0" style=${{ backgroundColor: opt.color }}></span>`}
              ${opt.name}
            </button>
          `)}
          ${showAdd && html`
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-sm text-[#2f7b6c] hover:bg-[#eef6f3] font-medium border-t border-[#eef3f0] flex items-center gap-1.5"
              onMouseDown=${addNew}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              ${addLabel} "${query.trim()}"
            </button>
          `}
        </div>
      `}
    </div>
  `;
}
