import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Clock,
} from 'lucide-react';
import type { AccountMode, Language, TradeOrder } from '../types';

interface OrdersHistoryViewProps {
  lang: Language;
  accountMode: AccountMode;
  orders: TradeOrder[];
  onBackToTrade: () => void;
}

type OrderScope = 'active' | 'all';

export const OrdersHistoryView: React.FC<OrdersHistoryViewProps> = ({
  lang,
  accountMode,
  orders,
  onBackToTrade,
}) => {
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [scope, setScope] = useState<OrderScope>('active');

  const isVi = lang === 'vi';

  const scopedOrders = useMemo(() => {
    if (scope === 'all') return orders;
    return orders.filter((o) => o.accountMode === accountMode);
  }, [orders, scope, accountMode]);

  const openOrders = useMemo(
    () => scopedOrders.filter((o) => o.status === 'OPEN'),
    [scopedOrders]
  );

  const closedOrders = useMemo(
    () => scopedOrders.filter((o) => o.status !== 'OPEN'),
    [scopedOrders]
  );

  const visibleOrders = tab === 'OPEN' ? openOrders : closedOrders;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(isVi ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Header matching Kaizenfin IMG_0071: Back Arrow + Lịch sử Giao dịch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToTrade}
            aria-label={isVi ? 'Quay lại giao dịch' : 'Back to trade'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 transition-colors hover:bg-slate-800/70 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
            {isVi ? 'Lịch sử Giao dịch' : 'Trade History'}
          </h1>
        </div>

        {/* Account Scope Toggle (syncs with top bar Live/Demo by default, optional All) */}
        <div className="inline-flex items-center rounded-xl border border-slate-800 bg-[#0d1326] p-1 text-xs">
          <button
            type="button"
            onClick={() => setScope('active')}
            className={`rounded-lg px-3 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              scope === 'active'
                ? 'bg-[#1c2642] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {accountMode === 'live'
              ? isVi
                ? 'Tài khoản Thực'
                : 'Live Account'
              : isVi
              ? 'Tài khoản Demo'
              : 'Demo Account'}
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded-lg px-3 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              scope === 'all'
                ? 'bg-[#1c2642] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isVi ? 'Tất cả' : 'All'} ({orders.length})
          </button>
        </div>
      </div>

      {/* Two Large Rounded-Full Segmented Buttons matching IMG_0071 */}
      <div className="grid grid-cols-2 gap-3" role="tablist" aria-label={isVi ? 'Trạng thái lệnh' : 'Order status'}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'OPEN'}
          onClick={() => setTab('OPEN')}
          className={`flex h-12 sm:h-13 items-center justify-center gap-2 rounded-full px-4 text-sm sm:text-base font-bold transition-all whitespace-nowrap cursor-pointer ${
            tab === 'OPEN'
              ? 'bg-gradient-to-b from-[#2ac5f4] via-[#1396e6] to-[#1a56db] text-white shadow-[0_6px_22px_rgba(19,150,230,0.38)]'
              : 'bg-[#232a42] text-slate-300 hover:bg-[#2b3452] hover:text-white'
          }`}
        >
          <span>{isVi ? 'Lệnh đang mở' : 'Open Orders'}</span>
          {openOrders.length > 0 && (
            <span className="font-mono text-xs opacity-90">({openOrders.length})</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'CLOSED'}
          onClick={() => setTab('CLOSED')}
          className={`flex h-12 sm:h-13 items-center justify-center gap-2 rounded-full px-4 text-sm sm:text-base font-bold transition-all whitespace-nowrap cursor-pointer ${
            tab === 'CLOSED'
              ? 'bg-gradient-to-b from-[#2ac5f4] via-[#1396e6] to-[#1a56db] text-white shadow-[0_6px_22px_rgba(19,150,230,0.38)]'
              : 'bg-[#232a42] text-slate-300 hover:bg-[#2b3452] hover:text-white'
          }`}
        >
          <span>{isVi ? 'Lệnh đã khớp' : 'Closed Orders'}</span>
          {closedOrders.length > 0 && (
            <span className="font-mono text-xs opacity-90">({closedOrders.length})</span>
          )}
        </button>
      </div>

      {/* Orders List or Centered Brand-Mark Empty State */}
      <div className="mt-6">
        {visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            {/* Subtle HitechTrade Geometric Monogram Emblem matching Kaizenfin empty-state restraint */}
            <svg
              viewBox="0 0 64 64"
              className="h-16 w-16 text-slate-700/75"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 16H30V28H34V16H50L44 24H39V40H50L44 48H34V36H30V48H14L20 40H25V24H14V16Z"
                fill="currentColor"
                opacity="0.7"
              />
              <path
                d="M16 47L48 17"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="mt-5 text-base font-medium text-slate-300">
              {tab === 'OPEN'
                ? isVi
                  ? 'Bạn chưa có lệnh nào đang mở'
                  : 'You have no open orders yet'
                : isVi
                ? 'Bạn chưa có lệnh đã khớp nào'
                : 'You have no closed orders yet'}
            </p>
            <button
              type="button"
              onClick={onBackToTrade}
              className="mt-5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-5 py-2.5 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20 cursor-pointer"
            >
              {isVi ? 'Đặt lệnh BTC/USDT ngay' : 'Place a BTC/USDT order'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((ord) => {
              const isBuy = ord.direction === 'BUY';
              const isWin = ord.status === 'WON';
              const isDraw = ord.status === 'DRAW';
              const isOpen = ord.status === 'OPEN';
              const totalReturn = isWin
                ? ord.amount + ord.pnl
                : isDraw
                ? ord.amount
                : 0;

              return (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-slate-800/90 bg-[#0d1324] p-4 transition-colors hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isBuy
                            ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-white">
                            {ord.pair}
                          </span>
                          <span
                            className={`text-xs font-extrabold ${
                              isBuy ? 'text-[#00D4AA]' : 'text-rose-400'
                            }`}
                          >
                            {isBuy ? (isVi ? 'MUA' : 'BUY') : isVi ? 'BÁN' : 'SELL'}
                          </span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs font-medium text-slate-400">
                            {ord.accountMode === 'live'
                              ? isVi
                                ? 'Thực'
                                : 'Live'
                              : 'Demo'}
                          </span>
                          {ord.source === 'bot' && (
                            <>
                              <span className="text-xs text-slate-500">·</span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400">
                                <Bot className="h-3.5 w-3.5" />
                                Bot AI
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(ord.createdAt)}</span>
                          <span>·</span>
                          <span>#{ord.roundId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm font-extrabold text-white tabular-nums">
                        ${ord.amount.toFixed(2)}
                      </div>
                      {isOpen ? (
                        <div className="mt-0.5 font-mono text-xs font-semibold text-sky-400">
                          {isVi ? 'Đang mở' : 'Open'} · Entry ${ord.entryPrice.toFixed(2)}
                        </div>
                      ) : isDraw ? (
                        <div className="mt-0.5 font-mono text-xs font-bold text-slate-300 tabular-nums">
                          {isVi ? 'Hòa' : 'Draw'} · $0.00 ({isVi ? 'Hoàn' : 'Refund'} ${totalReturn.toFixed(2)})
                        </div>
                      ) : isWin ? (
                        <div className="mt-0.5 font-mono text-xs font-extrabold text-[#00D4AA] tabular-nums">
                          {isVi ? 'Thắng' : 'Won'} +${ord.pnl.toFixed(2)} ({isVi ? 'Nhận' : 'Payout'} ${totalReturn.toFixed(2)})
                        </div>
                      ) : (
                        <div className="mt-0.5 font-mono text-xs font-extrabold text-rose-400 tabular-nums">
                          {isVi ? 'Thua' : 'Lost'} -${ord.amount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isOpen && ord.closePrice !== undefined && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5 font-mono text-[11px] text-slate-400 tabular-nums">
                      <span>
                        {isVi ? 'Giá mở:' : 'Entry:'}{' '}
                        <strong className="text-slate-200">${ord.entryPrice.toFixed(2)}</strong>
                      </span>
                      <span>
                        {isVi ? 'Giá đóng:' : 'Close:'}{' '}
                        <strong className="text-slate-200">${ord.closePrice.toFixed(2)}</strong>
                      </span>
                      <span>
                        {isVi ? 'Tỉ lệ:' : 'Payout:'}{' '}
                        <strong className="text-slate-200">+{Math.round(ord.payoutRate * 100)}%</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
