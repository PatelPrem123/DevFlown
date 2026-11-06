import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore.js';
import AuthPage from './pages/AuthPage.jsx';
import KanbanBoard from './components/kanban/KanbanBoard.jsx';
import SprintsPage from './pages/SprintsPage.jsx';
import MilestonesPage from './pages/MilestonesPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import GitHubPage from './pages/GitHubPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import CreateProjectModal from './components/common/CreateProjectModal.jsx';
import CreateWorkspaceModal from './components/common/CreateWorkspaceModal.jsx';
import CreateTaskModal from './components/tasks/CreateTaskModal.jsx';

import {
  Layers,
  Kanban,
  Zap,
  Target,
  BarChart3,
  GitBranch,
  Settings,
  Plus,
  LogOut,
  Building2,
  FolderKanban,
  Radio,
  ChevronDown,
  User,
  Sparkles,
  LayoutGrid
} from 'lucide-react';

export default function App() {
  const {
    user,
    token,
    loading,
    workspaces,
    activeWorkspace,
    projects,
    activeProject,
    initAuth,
    setActiveWorkspace,
    setActiveProject,
    logout
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState('kanban');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  // Show loading spinner during session verification
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse mb-4 shadow-lg shadow-indigo-500/20">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">Connecting to DevFlow...</p>
      </div>
    );
  }

  // If not logged in, render the full Auth Experience
  if (!user || !token) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* 1. Global SaaS Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 h-14 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          {/* Brand */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm shadow-indigo-600/20">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-extrabold tracking-tight">DevFlow</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                v1.0.0
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          {/* Workspace Switcher */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs shrink-0">
            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <select
              value={activeWorkspace?._id || activeWorkspace?.id || ''}
              onChange={(e) => {
                const ws = workspaces.find((w) => (w._id || w.id) === e.target.value);
                if (ws) setActiveWorkspace(ws);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[110px] md:max-w-[160px] truncate pr-1"
            >
              {workspaces.map((w) => (
                <option key={w._id || w.id} value={w._id || w.id} className="dark:bg-slate-900">
                  {w.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewWorkspaceModal(true)}
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition"
              title="Create new workspace"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <span className="text-slate-300 dark:text-slate-700 font-light hidden sm:inline">/</span>

          {/* Project Switcher */}
          {activeWorkspace && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs shrink-0">
              <FolderKanban className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <select
                value={activeProject?._id || activeProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find((proj) => (proj._id || proj.id) === e.target.value);
                  if (p) setActiveProject(p);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[130px] md:max-w-[200px] truncate pr-1"
              >
                {projects.length === 0 ? (
                  <option value="">No projects</option>
                ) : (
                  projects.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id} className="dark:bg-slate-900">
                      {p.name} ({p.key})
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition"
                title="Create new project"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Real-time Socket Indicator */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Mesh
          </span>

          {activeProject && (
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden md:block">
              <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">{user.name}</span>
              <span className="block text-[10px] text-slate-400">{user.email}</span>
            </div>

            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main App Body (Sidebar + Content View) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 block">
                Agile Modules
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('kanban')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'kanban'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Kanban className="w-4 h-4" />
                  <span>Interactive Kanban</span>
                </button>

                <button
                  onClick={() => setActiveTab('sprints')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'sprints'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Sprints & Backlog</span>
                </button>

                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'milestones'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Milestone Gates</span>
                </button>
              </nav>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 block">
                Engineering & Ops
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'analytics'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Burndown & Reports</span>
                </button>

                <button
                  onClick={() => setActiveTab('github')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'github'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  <span>GitHub Ingress Sync</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings & RBAC</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Quick Context Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Active Architecture</span>
            <p>Lexorank $O(1)$ • 14 MongoDB Collections • AES-256-GCM Tokens</p>
          </div>
        </aside>

        {/* Viewport Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full">
          {!activeProject ? (
            <div className="flex flex-col items-center justify-center p-16 text-center max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm mt-12">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-4">
                <FolderKanban className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Create your first Project</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Workspaces hold multiple projects. Set up your first project to unlock the Kanban board, sprints, and GitHub synchronization.
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project Now</span>
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'kanban' && <KanbanBoard projectId={activeProject._id || activeProject.id} />}
              {activeTab === 'sprints' && <SprintsPage projectId={activeProject._id || activeProject.id} />}
              {activeTab === 'milestones' && <MilestonesPage projectId={activeProject._id || activeProject.id} />}
              {activeTab === 'analytics' && <AnalyticsPage projectId={activeProject._id || activeProject.id} />}
              {activeTab === 'github' && (
                <GitHubPage projectId={activeProject._id || activeProject.id} workspaceId={activeWorkspace?._id || activeWorkspace?.id} />
              )}
              {activeTab === 'settings' && <SettingsPage workspaceId={activeWorkspace?._id || activeWorkspace?.id} />}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CreateProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />

      <CreateWorkspaceModal
        isOpen={showNewWorkspaceModal}
        onClose={() => setShowNewWorkspaceModal(false)}
      />

      <CreateTaskModal
        projectId={activeProject?._id || activeProject?.id}
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
      />
    </div>
  );
}
