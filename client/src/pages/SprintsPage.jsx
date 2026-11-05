import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Zap, Play, CheckCircle2, Plus, Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react';

export default function SprintsPage({ projectId }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionError, setActionError] = useState(null);

  const fetchSprints = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/sprints`);
      setSprints(res.data.data.sprints || []);
    } catch (err) {
      console.error('Failed to load sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprints();
  }, [projectId]);

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!sprintName.trim()) return;

    try {
      await api.post(`/projects/${projectId}/sprints`, {
        name: sprintName.trim(),
        goal: goal.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setSprintName('');
      setGoal('');
      setStartDate('');
      setEndDate('');
      setShowCreateModal(false);
      fetchSprints();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to create sprint');
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      setActionError(null);
      await api.patch(`/sprints/${sprintId}/start`);
      fetchSprints();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      setActionError(null);
      await api.patch(`/sprints/${sprintId}/complete`, { rolloverOption: 'backlog' });
      fetchSprints();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to complete sprint');
    }
  };

  const activeSprint = sprints.find(s => s.status === 'active');
  const plannedSprints = sprints.filter(s => s.status === 'planned');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Agile Sprint Orchestration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforces strict single-active sprint invariant with automated incomplete task rollover.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Sprint</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Active Sprint Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Active Sprint</h3>
        {activeSprint ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-lg shadow-indigo-500/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeSprint.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    IN PROGRESS
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeSprint.goal || 'No sprint goal specified.'}</p>
              </div>

              <button
                onClick={() => handleCompleteSprint(activeSprint._id)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Sprint</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Duration</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeSprint.startDate ? new Date(activeSprint.startDate).toLocaleDateString() : 'Now'} —{' '}
                  {activeSprint.endDate ? new Date(activeSprint.endDate).toLocaleDateString() : 'Ongoing'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tasks Allocated</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeSprint.taskIds?.length || 0} tasks</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400">No active sprint running right now. Choose a planned sprint below to start.</p>
          </div>
        )}
      </div>

      {/* Planned Sprints */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Planned Sprints ({plannedSprints.length})
        </h3>
        {plannedSprints.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            No planned sprints in queue.
          </div>
        ) : (
          <div className="space-y-3">
            {plannedSprints.map((s) => (
              <div
                key={s._id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.goal || 'Goal not configured'}</p>
                </div>

                <button
                  onClick={() => handleStartSprint(s._id)}
                  disabled={!!activeSprint}
                  title={activeSprint ? 'Complete active sprint first' : 'Start this sprint'}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Sprint</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-4">Plan New Sprint</h3>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sprint Name</label>
                <input
                  type="text"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="Sprint 1 - Core Services"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sprint Goal</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Deliver auth and project management APIs"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
