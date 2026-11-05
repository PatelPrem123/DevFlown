import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingDown, Flame, CheckCircle, Clock } from 'lucide-react';

export default function BurndownChart({ burndownData, sprintName }) {
  if (!burndownData || !burndownData.burnData || burndownData.burnData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
        <Flame className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
        <p className="text-sm font-medium">No burndown telemetry available for this sprint.</p>
      </div>
    );
  }

  const { sprint, burnData } = burndownData;
  const currentActual = burnData.filter((d) => d.actual !== null).slice(-1)[0]?.actual ?? sprint.totalStoryPoints;
  const remainingPoints = Math.max(0, currentActual);
  const burnProgress = sprint.totalStoryPoints > 0
    ? Math.round(((sprint.totalStoryPoints - remainingPoints) / sprint.totalStoryPoints) * 100)
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Header & Metrics Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-slate-100">Sprint Burndown Telemetry</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {sprintName || sprint?.name || 'Active Sprint'} — Tracking committed vs remaining story points
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-xs text-slate-400">Total Points</span>
            <span className="text-sm font-bold text-slate-200">{sprint.totalStoryPoints}</span>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-xs text-emerald-400">Completed</span>
            <span className="text-sm font-bold text-emerald-300">
              {Math.max(0, sprint.totalStoryPoints - remainingPoints)}
            </span>
          </div>
          <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-xs text-indigo-400">Remaining</span>
            <span className="text-sm font-bold text-indigo-300">{remainingPoints}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-xs text-slate-400">Progress</span>
            <span className="text-sm font-bold text-slate-200">{burnProgress}%</span>
          </div>
        </div>
      </div>

      {/* Recharts Responsive Visualization */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={burnData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 'dataMax + 2']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                fontSize: '12px',
                color: '#f8fafc'
              }}
              formatter={(value, name) => [
                `${value} pts`,
                name === 'ideal' ? 'Ideal Burn' : 'Actual Remaining'
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => (value === 'ideal' ? 'Ideal Trajectory (Linear)' : 'Actual Remaining Points')}
            />
            <Line
              type="monotone"
              dataKey="ideal"
              name="ideal"
              stroke="#6366f1"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
