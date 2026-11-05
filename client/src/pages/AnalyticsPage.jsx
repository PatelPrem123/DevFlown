import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import BurndownChart from '../components/charts/BurndownChart.jsx';
import VelocityChart from '../components/charts/VelocityChart.jsx';
import { BarChart3, Download, FileSpreadsheet, FileText, CheckCircle2, ListTodo, PlayCircle, Layers } from 'lucide-react';

export default function AnalyticsPage({ projectId }) {
  const [activeSprint, setActiveSprint] = useState(null);
  const [burndownData, setBurndownData] = useState(null);
  const [velocityData, setVelocityData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Fetch project tasks for metric cards
        const tasksRes = await api.get(`/projects/${projectId}/tasks`);
        const fetchedTasks = tasksRes.data.data.tasks || [];
        setTasks(fetchedTasks);

        // 2. Fetch project sprints to find active sprint
        const sprintsRes = await api.get(`/projects/${projectId}/sprints`);
        const sprints = sprintsRes.data.data.sprints || [];
        const currentActive = sprints.find(s => s.status === 'active') || sprints[0];
        setActiveSprint(currentActive);

        // 3. Fetch burndown if active sprint exists
        if (currentActive) {
          try {
            const burnRes = await api.get(`/analytics/burndown/${currentActive._id}`);
            setBurndownData(burnRes.data.data);
          } catch (e) {
            console.warn('No burndown data:', e);
          }
        }

        // 4. Fetch velocity
        try {
          const velRes = await api.get(`/analytics/velocity/${projectId}`);
          setVelocityData(velRes.data.data?.velocityData || []);
        } catch (e) {
          console.warn('No velocity data:', e);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  // Export handlers
  const handleExport = (format) => {
    const token = localStorage.getItem('devflow_token');
    window.open(`/api/v1/projects/${projectId}/export?format=${format}&token=${token}`, '_blank');
  };

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const todoCount = tasks.filter(t => t.status === 'to_do' || t.status === 'backlog').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <span>Reports & Velocity Telemetry</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sprint burndown curves, completion metrics, and streaming CSV/Excel data exports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleExport('excel')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* High-Level Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tasks.length}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Across all columns</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{doneCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}% completion rate
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <PlayCircle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{inProgressCount + reviewCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Active development</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
            <ListTodo className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{todoCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">To Do & Backlog</span>
        </div>
      </div>

      {/* Burndown Chart Card */}
      <div>
        <BurndownChart
          burndownData={burndownData}
          sprintName={activeSprint?.name || 'Current Sprint'}
        />
      </div>

      {/* Velocity Chart Card */}
      {velocityData.length > 0 && (
        <div>
          <VelocityChart velocityData={velocityData} />
        </div>
      )}
    </div>
  );
}
