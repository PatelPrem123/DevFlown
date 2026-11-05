import { create } from 'zustand';
import api from '../services/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('devflow_token') || null,
  workspaces: [],
  activeWorkspace: null,
  projects: [],
  activeProject: null,
  loading: true,
  error: null,

  // Initialize auth session
  initAuth: async () => {
    const token = localStorage.getItem('devflow_token');
    if (!token) {
      set({ loading: false, user: null });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const user = res.data.data.user;
      set({ user, token, loading: false });

      // Fetch user's workspaces
      await get().fetchWorkspaces();
    } catch (err) {
      localStorage.removeItem('devflow_token');
      set({ user: null, token: null, loading: false });
    }
  },

  // Login
  login: async (email, password) => {
    try {
      set({ error: null });
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data.data;

      localStorage.setItem('devflow_token', token);
      set({ user, token, error: null });

      await get().fetchWorkspaces();
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      set({ error: message });
      return { success: false, message };
    }
  },

  // Register
  register: async (name, email, password) => {
    try {
      set({ error: null });
      const res = await api.post('/auth/register', { name, email, password });
      const { user, token } = res.data.data;

      localStorage.setItem('devflow_token', token);
      set({ user, token, error: null });

      await get().fetchWorkspaces();
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Registration failed.';
      set({ error: message });
      return { success: false, message };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('devflow_token');
    set({
      user: null,
      token: null,
      workspaces: [],
      activeWorkspace: null,
      projects: [],
      activeProject: null
    });
  },

  // Fetch Workspaces
  fetchWorkspaces: async () => {
    try {
      const res = await api.get('/workspaces');
      const workspaces = res.data.data.workspaces || [];
      const current = get().activeWorkspace;

      const activeWorkspace = workspaces.find(w => w._id === current?._id) || workspaces[0] || null;
      set({ workspaces, activeWorkspace });

      if (activeWorkspace) {
        await get().fetchProjects(activeWorkspace._id);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  },

  // Create Workspace
  createWorkspace: async (name) => {
    try {
      const res = await api.post('/workspaces', { name });
      const newWs = res.data.data.workspace;
      const workspaces = [...get().workspaces, newWs];
      set({ workspaces, activeWorkspace: newWs });
      await get().fetchProjects(newWs._id);
      return { success: true, workspace: newWs };
    } catch (err) {
      return { success: false, message: err.response?.data?.error?.message || 'Failed to create workspace' };
    }
  },

  setActiveWorkspace: async (workspace) => {
    set({ activeWorkspace: workspace, projects: [], activeProject: null });
    if (workspace) {
      await get().fetchProjects(workspace._id);
    }
  },

  // Fetch Projects in active workspace
  fetchProjects: async (workspaceId) => {
    if (!workspaceId) return;
    try {
      const res = await api.get(`/projects?workspaceId=${workspaceId}`);
      const projects = res.data.data.projects || [];
      const current = get().activeProject;

      const activeProject = projects.find(p => p._id === current?._id) || projects[0] || null;
      set({ projects, activeProject });
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  },

  // Create Project
  createProject: async (name, key, description) => {
    const ws = get().activeWorkspace;
    if (!ws) return { success: false, message: 'No active workspace selected' };

    try {
      const res = await api.post('/projects', {
        name,
        key: key.toUpperCase(),
        description: description || '',
        workspaceId: ws._id
      });
      const newProj = res.data.data.project;
      const projects = [...get().projects, newProj];
      set({ projects, activeProject: newProj });
      return { success: true, project: newProj };
    } catch (err) {
      return { success: false, message: err.response?.data?.error?.message || 'Failed to create project' };
    }
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
  }
}));
