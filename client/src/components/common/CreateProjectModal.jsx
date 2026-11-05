import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { X, FolderPlus } from 'lucide-react';

export default function CreateProjectModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { createProject } = useAuthStore();

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate project key
    if (!key || key.length <= 4) {
      const generated = val.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      if (generated) setKey(generated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const res = await createProject(name.trim(), key.trim(), description.trim());
    if (res.success) {
      setName('');
      setKey('');
      setDescription('');
      onClose();
    } else {
      setError(res.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Create New Project</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Core Engine Infrastructure"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Key (Prefix for tasks, e.g. CORE-101) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={10}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="CORE"
              required
              className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the project goals..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
