import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { GitBranch, GitPullRequest, GitCommit, ShieldCheck, CheckCircle2, Plus, ExternalLink, RefreshCw } from 'lucide-react';

export default function GitHubPage({ projectId, workspaceId }) {
  const [status, setStatus] = useState(null);
  const [repoFullName, setRepoFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchStatus = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await api.get(`/github/status?workspaceId=${workspaceId}`);
      setStatus(res.data.data);
    } catch (err) {
      console.error('Failed to load GitHub status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [workspaceId]);

  const handleConnectRepo = async (e) => {
    e.preventDefault();
    if (!repoFullName.trim() || !projectId) return;

    try {
      setIsSubmitting(true);
      setMessage(null);
      await api.post(`/github/projects/${projectId}/connect-repo`, {
        fullName: repoFullName.trim()
      });
      setMessage({ type: 'success', text: `Repository ${repoFullName} connected successfully!` });
      setRepoFullName('');
      fetchStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to connect repository' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-500" />
          <span>GitHub Activity & Webhook Sync</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sync commits, pull requests, and branch activity directly into DevFlow tasks using task keys.
        </p>
      </div>

      {/* Integration Status Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center border border-slate-800">
              <GitBranch className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {status?.connected ? `Connected as @${status.githubUsername}` : 'GitHub OAuth Disconnected'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  status?.connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {status?.connected ? 'AUTHENTICATED' : 'NOT CONNECTED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                OAuth token encrypted via AES-256-GCM cipher with zero frontend credential exposure.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              <span>Timing-Safe HMAC Ingress</span>
            </span>
          </div>
        </div>
      </div>

      {/* Connect Repository Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Connect Repository to Current Project</h3>
        <p className="text-xs text-slate-400 mb-4">
          Specify your GitHub repository (`organization/repo` or `user/repo`) to listen for commits and pull requests.
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleConnectRepo} className="flex gap-3 max-w-lg">
          <input
            type="text"
            value={repoFullName}
            onChange={(e) => setRepoFullName(e.target.value)}
            placeholder="e.g. devflow-org/core-engine"
            required
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repo</span>
          </button>
        </form>
      </div>

      {/* Syntax Guide */}
      <div className="p-6 rounded-3xl bg-slate-900 text-slate-100 border border-slate-800">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <span>Automatic Task Linking Convention</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="font-semibold text-indigo-400 block mb-1">Git Commits</span>
            <code className="text-slate-300 font-mono block bg-slate-900 p-2 rounded border border-slate-800">
              git commit -m "feat(auth): add PKCE token validation [FLOW-101]"
            </code>
            <p className="text-slate-400 mt-2 text-[11px]">
              DevFlow parses the task key, records an activity log entry, and broadcasts a live socket event.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="font-semibold text-purple-400 block mb-1">Pull Requests</span>
            <code className="text-slate-300 font-mono block bg-slate-900 p-2 rounded border border-slate-800">
              PR: "fix(kanban): fractional orderIndex bound precision (FLOW-102)"
            </code>
            <p className="text-slate-400 mt-2 text-[11px]">
              When opened, reviewed, or merged, DevFlow associates PR status directly with the target task card.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
