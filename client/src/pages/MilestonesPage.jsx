import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Target, Plus, CheckCircle2, Calendar, Flag, AlertCircle } from 'lucide-react';

export default function MilestonesPage({ projectId }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchMilestones = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/milestones`);
      setMilestones(res.data.data.milestones || []);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    try {
      await api.post(`/projects/${projectId}/milestones`, {
        title: title.trim(),
        description: description.trim(),
        dueDate
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setShowModal(false);
      fetchMilestones();
    } catch (err) {
      console.error('Failed to create milestone:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            <span>Project Milestones & Roadmaps</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            High-level delivery gates tied directly to sprint and task completion.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Milestone</span>
        </button>
      </div>

      {milestones.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Flag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">No Milestones Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create milestone gates like "MVP Alpha Release" or "SOC-2 Compliance Audit" to group tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((m) => (
            <div
              key={m._id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{m.title}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {m.status?.toUpperCase() || 'OPEN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{m.description || 'No description'}</p>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Target: {new Date(m.dueDate).toLocaleDateString()}</span>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">{m.linkedTaskIds?.length || 0} tasks linked</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-4">New Project Milestone</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="v1.0 Production Launch"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Release criteria and key features..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
