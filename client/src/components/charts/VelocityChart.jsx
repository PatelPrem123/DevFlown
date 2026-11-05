import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Zap, Activity } from 'lucide-react';

export default function VelocityChart({ velocityData }) {
  if (!velocityData || !velocityData.velocityHistory || velocityData.velocityHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
        <Activity className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
        <p className="text-sm font-medium">No completed sprints recorded yet. Complete a sprint to track velocity.</p>
      </div>
    );
  }

  const { averageVelocity, totalCompletedSprints, velocityHistory } = velocityData;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-slate-100">Team Velocity & Sprint Output</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical committed vs delivered story points across completed sprints
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-xs text-amber-400">Average Velocity</span>
            <span className="text-sm font-bold text-amber-300">{averageVelocity} pts/sprint</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-center">
            <span className="block text-xs text-slate-400">Completed Sprints</span>
            <span className="text-sm font-bold text-slate-200">{totalCompletedSprints}</span>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={velocityHistory} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
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
                name === 'committedPoints' ? 'Committed Points' : 'Completed Points'
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              formatter={(value) => (value === 'committedPoints' ? 'Committed Points' : 'Delivered Points')}
            />
            <Bar dataKey="committedPoints" name="committedPoints" fill="#64748b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completedPoints" name="completedPoints" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
