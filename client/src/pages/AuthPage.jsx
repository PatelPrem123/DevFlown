import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { Layers, ShieldCheck, Zap, GitBranch, ArrowRight, Sparkles, User, Mail, Lock, ArrowLeft } from 'lucide-react';

export default function AuthPage({ onBackToLanding, defaultIsLogin = true }) {
  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { login, register } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    if (isLogin) {
      const result = await login(email, password);
      if (!result.success) {
        setLocalError(result.message);
      }
    } else {
      if (!name.trim()) {
        setLocalError('Please enter your full name');
        setIsSubmitting(false);
        return;
      }
      const result = await register(name, email, password);
      if (!result.success) {
        setLocalError(result.message);
      }
    }
    setIsSubmitting(false);
  };

  // Quick 1-Click Demo Login handler
  const handleQuickDemo = async () => {
    setIsSubmitting(true);
    setLocalError(null);
    const demoEmail = 'alex.lead@devflow.io';
    const demoPass = 'DevFlow2026!';

    // Try login first
    let res = await login(demoEmail, demoPass);
    if (!res.success) {
      // If user doesn't exist, create demo account
      res = await register('Alex Mercer (Lead Architect)', demoEmail, demoPass);
      if (!res.success) {
        setLocalError(res.message);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Left Hero / Brand Feature Panel */}
      <div className="md:w-1/2 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-600/30">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                DevFlow <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">v1.0.0</span>
              </span>
              <p className="text-xs text-slate-400 font-medium">Developer Project Management & Agile Mesh</p>
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Where agile planning meets real developer code.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-lg">
            DevFlow integrates $O(1)$ fractional drag-and-drop Kanban, sprint burndown telemetry, automated GitHub commit/PR sync, and real-time Socket.IO collaboration into one secure platform.
          </p>

          <div className="space-y-4 max-w-md">
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <Zap className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Fractional Lexorank Kanban</h4>
                <p className="text-xs text-slate-400">Zero re-indexing on drag and drop. Pure $O(1)$ database updates.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <GitBranch className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Deep GitHub Integration</h4>
                <p className="text-xs text-slate-400">Auto-link commits and PRs using task keys with timing-safe HMAC webhooks.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Two-Tier RBAC & OWASP Hardened</h4>
                <p className="text-xs text-slate-400">BOLA/IDOR protection, DOMPurify stored XSS defense, AES-256-GCM cipher.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-xs text-slate-500 flex items-center justify-between">
          <span>Enterprise SaaS Edition</span>
          <span>MongoDB 7.x • Node.js v24 • React 18</span>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="md:w-1/2 p-8 md:p-16 flex items-center justify-center bg-slate-950">
        <div className="max-w-md w-full">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview & Pricing</span>
            </button>
          )}
          {/* Quick Demo Access Bar */}
          <div className="mb-8 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Explorer Mode</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Test the full platform in 1 click without typing</p>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              <span>1-Click Launch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-950 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setLocalError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  isLogin ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setLocalError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  !isLogin ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">
                {isLogin ? 'Welcome back to DevFlow' : 'Create your workspace account'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isLogin
                  ? 'Enter your credentials to access your workspaces and boards.'
                  : 'New accounts automatically provision a default workspace with full Admin role.'}
              </p>
            </div>

            {localError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {localError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                {!isLogin && (
                  <p className="text-[11px] text-slate-500 mt-1">Must be at least 8 characters long</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Authenticating...' : isLogin ? 'Sign In to Workspace' : 'Create Account & Workspace'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
