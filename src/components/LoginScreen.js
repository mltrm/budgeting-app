import { html } from 'htm/react';
import { useState } from 'react';
import { initAndSignIn, fetchUserInfo } from '../googleDrive.js';
import { useApp } from '../context.js';
import { GOOGLE_CLIENT_ID } from '../config.js';

export default function LoginScreen() {
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    setLoading(true);
    setError('');
    try {
      dispatch({ type: 'SET_DRIVE_CLIENT_ID', clientId: GOOGLE_CLIENT_ID });
      await initAndSignIn(GOOGLE_CLIENT_ID);
      const user = await fetchUserInfo();
      dispatch({ type: 'SET_USER', user });
    } catch (err) {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return html`
    <div className="h-[100dvh] flex flex-col" style=${{ background: '#1B5E52' }}>

      <!-- Top illustration area -->
      <div className="flex-1 flex flex-col items-center justify-end pb-12 px-8">
        <!-- Stacked cards illustration -->
        <div className="relative mb-10 w-52 h-36">
          <!-- Back card -->
          <div className="absolute inset-x-4 top-4 h-full rounded-[24px] bg-white/10 rotate-[-6deg]"></div>
          <!-- Mid card -->
          <div className="absolute inset-x-2 top-2 h-full rounded-[24px] bg-white/20 rotate-[-2deg]"></div>
          <!-- Front card -->
          <div className="absolute inset-0 rounded-[24px] bg-white shadow-2xl flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#1B5E52]/20"></div>
                <div className="w-2 h-2 rounded-full bg-[#1B5E52]/20"></div>
              </div>
              <div className="w-8 h-5 rounded-md bg-[#F5A44A]/30"></div>
            </div>
            <div>
              <div className="h-1.5 w-20 rounded-full bg-gray-100 mb-2"></div>
              <div className="h-2.5 w-28 rounded-full bg-[#1B5E52]/15"></div>
            </div>
          </div>
        </div>

        <!-- Heading -->
        <h1 className="text-[34px] font-bold text-white text-center leading-tight mb-3">
          Your finances,<br/>your control.
        </h1>
        <p className="text-white/60 text-center text-[15px] leading-relaxed max-w-xs">
          Track every expense, understand your spending, stay on top of your budget.
        </p>
      </div>

      <!-- Bottom sheet -->
      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 flex flex-col gap-4 shadow-2xl">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Continue with
        </p>

        <!-- Google button -->
        <button
          onClick=${handleSignIn}
          disabled=${loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-[18px] border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
        >
          ${loading
            ? html`<div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin"></div>
                   <span className="text-sm font-semibold text-gray-700">Signing in…</span>`
            : html`
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="text-[15px] font-semibold text-gray-800">Sign in with Google</span>
            `}
        </button>

        ${error && html`
          <p className="text-center text-xs text-red-500">${error}</p>
        `}

        <p className="text-center text-[11px] text-gray-300 leading-relaxed mt-1">
          Your data stays private and is only accessible to you.
        </p>
      </div>
    </div>
  `;
}
