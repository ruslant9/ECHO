'use client';

import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Tooltip from '@/components/Tooltip';

const GET_CONVERSATION_STATS = gql`
  query ConversationStats($conversationId: Int!) {
    conversationStats(conversationId: $conversationId) {
      totalMessages
      sentCount
      receivedCount
      totalReactions
      sentReactions
      receivedReactions
      pinnedMessagesCount
      firstMessageAt
      lastMessageAt
      daily {
        date
        total
        sent
        received
      }
    }
  }
`;

const CHART_PAD = { top: 12, right: 16, bottom: 28, left: 8 };
const CHART_HEIGHT = 140;

function LineChartGraph({
  daily,
  maxTotal,
  isDarkMode,
}: {
  daily: { date: string; total: number; sent?: number; received?: number }[];
  maxTotal: number;
  isDarkMode: boolean;
}) {
  const n = daily.length;
  const width = 100; // percentage-based; actual size from container
  const w = 400;
  const h = CHART_HEIGHT;
  const innerW = w - CHART_PAD.left - CHART_PAD.right;
  const innerH = h - CHART_PAD.top - CHART_PAD.bottom;

  const getX = (i: number) =>
    n <= 1 ? CHART_PAD.left + innerW / 2 : CHART_PAD.left + (i / (n - 1)) * innerW;
  const getY = (total: number) =>
    CHART_PAD.top + innerH - (maxTotal > 0 ? (total / maxTotal) * innerH : 0);

  const points = daily.map((d, i) => ({ x: getX(i), y: getY(d.total), ...d }));
  const linePath =
    points.length === 0
      ? ''
      : points.length === 1
        ? `M ${CHART_PAD.left} ${points[0].y} L ${w - CHART_PAD.right} ${points[0].y}`
        : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath =
    linePath &&
    ` ${linePath} L ${w - CHART_PAD.right} ${CHART_PAD.top + innerH} L ${CHART_PAD.left} ${CHART_PAD.top + innerH} Z`;

  return (
    <div
      className={`relative rounded-xl overflow-hidden border ${
        isDarkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-100/80 border-zinc-200'
      }`}
    >
      <div className="relative w-full h-44 min-h-44">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lineChartFill" x1="0" x2="0" y1="1" y2="0">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Горизонтальные линии сетки */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = CHART_PAD.top + (i / 4) * innerH;
            return (
              <line
                key={i}
                x1={CHART_PAD.left}
                y1={y}
                x2={w - CHART_PAD.right}
                y2={y}
                stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth="1"
              />
            );
          })}
          {/* Заливка под линией */}
          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#lineChartFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
          {/* Линия графика */}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
          {/* Точки по дням (только отрисовка, без title) */}
          {points.map((p, i) => (
            <motion.circle
              key={p.date}
              r="4"
              cx={p.x}
              cy={p.y}
              fill="rgb(34, 197, 94)"
              stroke={isDarkMode ? 'rgb(24,24,27)' : 'white'}
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.03, duration: 0.2 }}
              className="pointer-events-none"
            />
          ))}
        </svg>
        {/* Слой с кастомным тултипом поверх точек */}
        {points.map((p) => (
          <Tooltip
            key={p.date}
            content={
              <div className="text-xs space-y-0.5">
                <div className="font-semibold border-b border-white/20 pb-1 mb-1">{p.date}</div>
                <div>Всего: <strong>{p.total}</strong></div>
                <div className="text-blue-300">Вы: {p.sent ?? 0}</div>
                <div className="text-emerald-300">Собеседник: {p.received ?? 0}</div>
              </div>
            }
            delay={200}
            position="top"
          >
            <div
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 cursor-default"
              style={{
                left: `${(p.x / w) * 100}%`,
                top: `${(p.y / h) * 100}%`,
              }}
            />
          </Tooltip>
        ))}
      </div>
      {/* Подписи дат снизу */}
      <div className="flex justify-between px-3 pb-2 pt-0 text-[10px] text-zinc-500 tabular-nums">
        {daily.map((d) => (
          <span key={d.date}>{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

interface ConversationStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number | null;
  hasLeft?: boolean;
}

export default function ConversationStatsModal({
  isOpen,
  onClose,
  conversationId,
  hasLeft = false,
}: ConversationStatsModalProps) {
  const { isDarkMode } = useTheme();

  const { data, loading } = useQuery(GET_CONVERSATION_STATS, {
    variables: { conversationId: conversationId ?? 0 },
    skip: !isOpen || !conversationId || hasLeft,
    fetchPolicy: 'network-only',
  });

  const stats = data?.conversationStats;
  const daily = stats?.daily ?? [];
  const dailySorted = [...daily].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const maxTotal = daily.reduce((max: number, d: any) => Math.max(max, d.total), 0) || 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] ${
            isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'
          }`}
        >
          <div
            className={`flex items-center justify-between px-5 py-4 border-b ${
              isDarkMode ? 'border-zinc-800' : 'border-zinc-200'
            }`}
          >
            <h2 className="text-lg font-bold">Статистика диалога</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
            {loading && <div className="text-sm opacity-60">Загрузка...</div>}

            {stats && !loading && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Всего сообщений</div>
                    <div className="text-xl font-bold">{stats.totalMessages}</div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Отправлено вами</div>
                    <div className="text-xl font-bold text-blue-500">
                      {stats.sentCount}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Получено</div>
                    <div className="text-xl font-bold text-emerald-500">
                      {stats.receivedCount}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Сообщения в день (ср.)</div>
                    <div className="text-xl font-bold">
                      {daily.length
                        ? Math.round((stats.totalMessages / daily.length) * 10) / 10
                        : 0}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="opacity-70 mb-1">Самое первое сообщение</div>
                    <div className="font-medium">
                      {stats.firstMessageAt
                        ? new Date(stats.firstMessageAt).toLocaleString()
                        : '—'}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="opacity-70 mb-1">Последнее сообщение</div>
                    <div className="font-medium">
                      {stats.lastMessageAt
                        ? new Date(stats.lastMessageAt).toLocaleString()
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Реакции и закреплённые */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Всего реакций</div>
                    <div className="text-xl font-bold">{stats.totalReactions}</div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Ваших реакций</div>
                    <div className="text-xl font-bold text-blue-500">
                      {stats.sentReactions}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Реакций собеседника</div>
                    <div className="text-xl font-bold text-emerald-500">
                      {stats.receivedReactions}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${
                      isDarkMode ? 'bg-zinc-800' : 'bg-zinc-50'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">Закреплённых сообщений</div>
                    <div className="text-xl font-bold">
                      {stats.pinnedMessagesCount}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 text-xs opacity-80">
                    <span className="font-medium">График общения по дням</span>
                    {daily.length > 0 && (
                      <span className="tabular-nums">
                        Период: {daily[0].date} — {daily[daily.length - 1].date}
                      </span>
                    )}
                  </div>
                  {daily.length === 0 ? (
                    <div className="text-xs opacity-60 py-8 text-center rounded-xl border border-dashed bg-zinc-500/5">
                      Для этого диалога пока нет статистики.
                    </div>
                  ) : (
                    <LineChartGraph
                      daily={dailySorted}
                      maxTotal={maxTotal}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

