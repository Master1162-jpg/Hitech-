import React from 'react';
import type { Language } from '../types';

interface WinPopupProps {
  open: boolean;
  totalReturn: number;
  netProfit: number;
  lang: Language;
}

export const WinPopup: React.FC<WinPopupProps> = ({ open, totalReturn, netProfit, lang }) => {
  if (!open) return null;

  const isVi = lang === 'vi';

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px] animate-[fadeIn_160ms_ease-out]"
    >
      <div className="relative w-full max-w-[390px] select-none">
        {/* Top 3D Isometric Stacked Chip Pedestal + Floating Bitcoin Coins (Clean Vector, No Checkerboard) */}
        <div className="relative z-10 -mb-11 flex justify-center">
          <svg
            viewBox="0 0 220 155"
            className="h-[138px] w-[196px] drop-shadow-[0_12px_28px_rgba(0,212,170,0.35)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="winAura" cx="50%" cy="42%" r="48%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
                <stop offset="55%" stopColor="#00D4AA" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#040D33" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="coinGoldMain" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="layerBottomTop" x1="50" y1="90" x2="170" y2="145" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id="layerMidTop" x1="65" y1="78" x2="155" y2="122" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="layerUpperTop" x1="78" y1="68" x2="142" y2="106" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#00D4AA" />
              </linearGradient>
              <linearGradient id="layerCapTop" x1="90" y1="60" x2="130" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ECFEFF" />
                <stop offset="60%" stopColor="#A5F3FC" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
            </defs>

            {/* Soft luminous aura behind coins */}
            <ellipse cx="110" cy="54" rx="76" ry="52" fill="url(#winAura)" />

            {/* Left small floating Bitcoin coin */}
            <g transform="translate(65, 34) rotate(-14)">
              <circle cx="0" cy="0" r="10.5" fill="url(#coinGoldMain)" stroke="#FEF08A" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="7.5" stroke="#FFFBEB" strokeOpacity="0.45" strokeWidth="0.8" />
              <text
                x="0"
                y="3.8"
                textAnchor="middle"
                fill="#FFFBEB"
                fontSize="11"
                fontWeight="800"
                fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              >
                ₿
              </text>
            </g>

            {/* Right small floating Bitcoin coin */}
            <g transform="translate(154, 24) rotate(12)">
              <circle cx="0" cy="0" r="12" fill="url(#coinGoldMain)" stroke="#FEF08A" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="8.8" stroke="#FFFBEB" strokeOpacity="0.45" strokeWidth="0.8" />
              <text
                x="0"
                y="4.2"
                textAnchor="middle"
                fill="#FFFBEB"
                fontSize="12.5"
                fontWeight="800"
                fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              >
                ₿
              </text>
            </g>

            {/* Main center Bitcoin coin */}
            <g transform="translate(110, 44)">
              <circle cx="0" cy="2" r="21" fill="#92400E" />
              <circle cx="0" cy="0" r="21" fill="url(#coinGoldMain)" stroke="#FEF08A" strokeWidth="1.8" />
              <circle cx="0" cy="0" r="16.2" stroke="#FFFBEB" strokeOpacity="0.55" strokeWidth="1.1" />
              <text
                x="0"
                y="7.5"
                textAnchor="middle"
                fill="#FFFBEB"
                fontSize="22"
                fontWeight="800"
                fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              >
                ₿
              </text>
            </g>

            {/* Stacked Isometric Layer 1 (Base Blue) */}
            <path d="M46 116L110 148L174 116V124L110 154L46 124V116Z" fill="#1E3A8A" />
            <path d="M110 86L174 116L110 148L46 116L110 86Z" fill="url(#layerBottomTop)" stroke="#67E8F9" strokeWidth="1.3" />

            {/* Stacked Isometric Layer 2 (Emerald) */}
            <path d="M62 103L110 128L158 103V110L110 135L62 110V103Z" fill="#065F46" />
            <path d="M110 78L158 103L110 128L62 103L110 78Z" fill="url(#layerMidTop)" stroke="#6EE7B7" strokeWidth="1.2" />

            {/* Stacked Isometric Layer 3 (Mint-Cyan) */}
            <path d="M76 92L110 111L144 92V99L110 118L76 99V92Z" fill="#0F766E" />
            <path d="M110 71L144 92L110 111L76 92L110 71Z" fill="url(#layerUpperTop)" stroke="#A7F3D0" strokeWidth="1.1" />

            {/* Stacked Isometric Layer 4 (Top Glowing Core) */}
            <path d="M88 80L110 94L132 80V86L110 100L88 86V80Z" fill="#14B8A6" />
            <path d="M110 64L132 80L110 94L88 80L110 64Z" fill="url(#layerCapTop)" stroke="#FFFFFF" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Chamfered Cyber-HUD Container */}
        <div className="relative">
          <svg
            viewBox="0 0 380 184"
            className="w-full h-auto drop-shadow-[0_0_28px_rgba(14,165,233,0.38)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="hudFill" x1="190" y1="8" x2="190" y2="176" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#071549" />
                <stop offset="100%" stopColor="#030A2B" />
              </linearGradient>
              <linearGradient id="hudBorder" x1="12" y1="12" x2="368" y2="172" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#00D4AA" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>

            {/* Outer cyber tech bracket lines */}
            <path
              d="M22 10H108L122 22H258L272 10H358L372 24V58L364 66V116L372 124V158L358 174H224L212 164H168L156 174H22L8 158V108L16 100V72L8 64V24L22 10Z"
              fill="#030926"
              fillOpacity="0.92"
              stroke="#0EA5E9"
              strokeOpacity="0.55"
              strokeWidth="1.4"
            />

            {/* Main Inner Chamfered HUD Body */}
            <path
              d="M28 16H104L118 28H262L276 16H352L364 28V62L356 70V114L364 122V154L352 166H228L216 156H164L152 166H28L16 154V104L22 98V74L16 68V28L28 16Z"
              fill="url(#hudFill)"
              stroke="url(#hudBorder)"
              strokeWidth="2.2"
            />

            {/* Signature glowing cyan cyber nodes */}
            <circle cx="12" cy="104" r="3" fill="#5EEAD4" />
            <circle cx="152" cy="172" r="2.6" fill="#38BDF8" />
            <circle cx="364" cy="56" r="2.4" fill="#00D4AA" />
          </svg>

          {/* Text Overlay Centered Inside HUD */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 pt-6 pb-3 text-center">
            <h3 className="font-display text-2xl sm:text-[26px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(56,189,248,0.45)]">
              {isVi ? 'Xin chúc mừng!' : 'Congratulations!'}
            </h3>
            <div className="mt-1.5 font-mono text-3xl sm:text-[32px] font-extrabold tracking-tight text-[#00D4AA] drop-shadow-[0_0_16px_rgba(0,212,170,0.55)]">
              +${totalReturn.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-sky-200/80">
              {isVi
                ? `Lợi nhuận ròng +$${netProfit.toFixed(2)} · BTC/USDT`
                : `Net profit +$${netProfit.toFixed(2)} · BTC/USDT`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
