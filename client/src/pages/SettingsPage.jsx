import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Settings, Users, UserPlus, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage({ workspaceId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMembers = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(res.data.data.members || []);
    } catch (err) {
      console.error('Failed to load workspace members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsSubmitting(true);
      setMessage(null);
      await api.post(`/workspaces/${workspaceId}/invitations`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail} with role '${inviteRole}'!` });
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to send invitation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          <span>Workspace Settings & Two-Tier RBAC</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage organization team members, invitations, and hierarchical permissions.
        </p>
      </div>

      {/* Invite Member Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-500" />
          <span>Invite Team Member</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Add developers, project managers, or stakeholders to collaborate on this workspace.
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

        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3 max-w-xl">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
          >
            <option value="member">Workspace Member</option>
            <option value="admin">Workspace Admin</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <span>Send Invite</span>
          </button>
        </form>
      </div>

      {/* Members Directory */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <span>Active Organization Members ({members.length})</span>
        </h3>

        {members.length === 0 ? (
          <p className="text-xs text-slate-400">Loading members...</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <div key={m._id} className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {m.userId?.name || 'Workspace Member'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {m.role?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{m.userId?.email}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400">Joined {new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
