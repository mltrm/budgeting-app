import { html } from 'htm/react';
import { useState } from 'react';

const AVATAR_COLORS = ['#f28d16', '#cb7b4f', '#d85e47', '#6c9f91', '#4d80a8', '#9676c8'];

const SUPPLIER_LOGOS = {
  'PBZ': 'https://www.pbz.hr/favicon.ico',
  'Trading 212': 'https://www.trading212.com/favicon.ico',
  'Studenac': 'https://www.studenac.hr/favicon.ico',
  'INA': 'https://www.ina.hr/favicon.ico',
  'Tisak': 'https://www.tisak.hr/favicon.ico',
  'Konzum': 'https://www.konzum.hr/favicon.ico',
  'IKEA': 'https://www.ikea.com/favicon.ico',
  'Wolt': 'https://wolt.com/favicon.ico',
  'Revolut': 'https://www.revolut.com/favicon.ico',
  'Spar': 'https://www.spar.hr/favicon.ico',
  'McDonalds': 'https://mcdonalds.hr/favicon.ico',
  'Telemach': 'https://telemach.hr/favicon.ico',
  'HEP': 'https://www.hep.hr/favicon.ico',
  'HAC': 'https://www.hac.hr/favicon.ico'
};

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export function getSupplierLogoUrl(name = '') {
  return SUPPLIER_LOGOS[name] || null;
}

export default function SupplierAvatar({ name, size = 48, showBadge = false, badgeColor = '#1976ff' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = getSupplierLogoUrl(name);
  const letter = (name || '?')[0].toUpperCase();
  const badgeSize = Math.round(size * 0.42);

  return html`
    <div className="relative flex-shrink-0" style=${{ width: `${size}px`, height: `${size}px` }}>
      ${logoUrl && !imageFailed
        ? html`
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/70 shadow-sm">
              <img
                src=${logoUrl}
                alt=${`${name} logo`}
                className="w-[72%] h-[72%] object-contain"
                onError=${() => setImageFailed(true)}
              />
            </div>
          `
        : html`
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-white font-medium select-none"
              style=${{ backgroundColor: avatarColor(name), fontSize: `${Math.round(size * 0.42)}px` }}
            >
              ${letter}
            </div>
          `
      }

      ${showBadge && html`
        <div
          className="absolute -bottom-0.5 -right-1 rounded-full border-2 border-white flex items-center justify-center shadow-sm"
          style=${{ width: `${badgeSize}px`, height: `${badgeSize}px`, backgroundColor: badgeColor }}
        >
          <svg width=${Math.round(badgeSize * 0.42)} height=${Math.round(badgeSize * 0.42)} viewBox="0 0 10 10" fill="none">
            <path d="M2 5h6M5.5 2.5L8 5 5.5 7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      `}
    </div>
  `;
}
