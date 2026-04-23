import { html } from 'htm/react';
import { useApp } from '../context.js';

function HomeIcon() {
  return html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11.5L12 5l8 6.5"/>
    <path d="M6.5 10.5V19h11v-8.5"/>
  </svg>`;
}

function ExpensesIcon() {
  return html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 6.5h10"/>
    <path d="M7 12h10"/>
    <path d="M7 17.5h6"/>
    <circle cx="5" cy="6.5" r="1"/>
    <circle cx="5" cy="12" r="1"/>
    <circle cx="5" cy="17.5" r="1"/>
  </svg>`;
}

function AnalyticsIcon() {
  return html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 18.5h14"/>
    <path d="M7 16l3.5-4 3 2.5 3.5-6"/>
    <path d="M17 8.5h2v2"/>
  </svg>`;
}

function SettingsIcon() {
  return html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z"/>
    <path d="M19.4 15a1 1 0 00.2 1.1l.05.05a1.75 1.75 0 01-2.48 2.48l-.05-.05a1 1 0 00-1.1-.2 1 1 0 00-.62.92V19.5a1.75 1.75 0 01-3.5 0v-.08a1 1 0 00-.67-.94 1 1 0 00-1.05.22l-.05.05a1.75 1.75 0 11-2.48-2.48l.05-.05a1 1 0 00.22-1.05 1 1 0 00-.94-.67H4.5a1.75 1.75 0 010-3.5h.08a1 1 0 00.94-.67 1 1 0 00-.22-1.05l-.05-.05a1.75 1.75 0 112.48-2.48l.05.05a1 1 0 001.05.22 1 1 0 00.67-.94V4.5a1.75 1.75 0 013.5 0v.08a1 1 0 00.67.94 1 1 0 001.05-.22l.05-.05a1.75 1.75 0 112.48 2.48l-.05.05a1 1 0 00-.22 1.05 1 1 0 00.94.67h.08a1.75 1.75 0 010 3.5h-.08a1 1 0 00-.92.62z"/>
  </svg>`;
}

export default function Navigation({ entryOpen, onToggleEntry, onNavigate }) {
  const { state, dispatch } = useApp();
  const go = (view) => {
    onNavigate?.();
    dispatch({ type: 'SET_VIEW', view });
  };

  const tabClass = (view) =>
    `flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full px-2 transition-all ${
      state.view === view ? 'bg-[#ededed] text-black' : 'text-[#999999] hover:text-[#666666]'
    }`;

  return html`
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-4">
      <div className="max-w-2xl mx-auto relative">
        <div className="rounded-[30px] border border-white/70 bg-white/88 px-2 py-2 backdrop-blur-[18px] shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-5 items-center gap-1">
            <button onClick=${() => go('home')} className=${tabClass('home')}>
              <${HomeIcon} />
              <span className=${`text-[10px] leading-3 ${state.view === 'home' ? 'font-semibold' : 'font-medium'}`}>Home</span>
            </button>

            <button onClick=${() => go('list')} className=${tabClass('list')}>
              <${ExpensesIcon} />
              <span className=${`text-[10px] leading-3 ${state.view === 'list' ? 'font-semibold' : 'font-medium'}`}>Expenses</span>
            </button>

            <div className="flex items-center justify-center">
              <button
                onClick=${onToggleEntry}
                className=${`h-10 w-[74px] rounded-full flex items-center justify-center text-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  entryOpen ? 'bg-[#161616] scale-[0.97]' : 'bg-black hover:bg-[#111111]'
                }`}
                aria-label=${entryOpen ? 'Close expense form' : 'Add expense'}
              >
                <span className=${`fab-icon ${entryOpen ? 'rotated' : ''}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </span>
              </button>
            </div>

            <button onClick=${() => go('charts')} className=${tabClass('charts')}>
              <${AnalyticsIcon} />
              <span className=${`text-[10px] leading-3 ${state.view === 'charts' ? 'font-semibold' : 'font-medium'}`}>Analytics</span>
            </button>

            <button onClick=${() => go('settings')} className=${tabClass('settings')}>
              <${SettingsIcon} />
              <span className=${`text-[10px] leading-3 ${state.view === 'settings' ? 'font-semibold' : 'font-medium'}`}>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  `;
}
