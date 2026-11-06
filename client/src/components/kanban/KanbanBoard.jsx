import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import axios from 'axios';
import { io } from 'socket.io-client';
import KanbanColumn from './KanbanColumn.jsx';
import KanbanCard from './KanbanCard.jsx';
import TaskDetailModal from '../tasks/TaskDetailModal.jsx';
import CreateTaskModal from '../tasks/CreateTaskModal.jsx';
import { useKanbanStore } from '../../store/useKanbanStore.js';
import { Search, Filter, RefreshCw, CheckCircle2, Plus, List, Kanban as KanbanIcon } from 'lucide-react';

const COLUMN_HEADER_COLORS = {
  backlog: 'border-slate-400 text-slate-700 dark:text-slate-300',
  to_do: 'border-indigo-500 text-indigo-700 dark:text-indigo-400',
  in_progress: 'border-amber-500 text-amber-700 dark:text-amber-400',
  review: 'border-purple-500 text-purple-700 dark:text-purple-400',
  done: 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
};

const PRIORITY_STYLES = {
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
};

export default function KanbanBoard({ projectId }) {
  const {
    board,
    activeTask,
    searchQuery,
    priorityFilter,
    setBoard,
    setActiveTask,
    setSearchQuery,
    setPriorityFilter,
    optimisticMoveCard
  } = useKanbanStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'

  // Setup sensors with 5px distance constraint to differentiate clicks from drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // 1. Fetch Board Data
  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/projects/${projectId}/board`);
      setBoard(res.data.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchBoard();
    }
  }, [projectId]);

  // 2. Real-Time Socket.IO Mesh Synchronization (DEC-009)
  useEffect(() => {
    if (!projectId) return;

    const socket = io('/', {
      withCredentials: true
    });

    socket.emit('join:project', projectId);

    socket.on('task:moved', (payload) => {
      // Re-fetch board or sync card position
      fetchBoard();
    });

    socket.on('task:created', () => {
      fetchBoard();
    });

    socket.on('task:updated', () => {
      fetchBoard();
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  // Drag Handlers
  const handleDragStart = (event) => {
    const { active } = event;
    const task = active.data.current?.task;
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !board) return;

    const activeTaskId = active.id;
    const draggedTask = active.data.current?.task;
    if (!draggedTask) return;

    // Determine target column and target position
    let targetColumnId = null;
    let targetIndex = 0;

    // Dropped over a column directly
    if (over.data.current?.column) {
      targetColumnId = over.data.current.column.id;
      const targetColumn = board.columns.find((c) => c.id === targetColumnId);
      targetIndex = targetColumn ? targetColumn.tasks.length : 0;
    }
    // Dropped over another task
    else if (over.data.current?.task) {
      const overTask = over.data.current.task;
      targetColumnId = overTask.status;
      const targetColumn = board.columns.find((c) => c.id === targetColumnId);
      targetIndex = targetColumn ? targetColumn.tasks.findIndex((t) => t._id === overTask._id) : 0;
    }

    if (!targetColumnId) return;

    const sourceColumnId = draggedTask.status;
    const targetColumn = board.columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    // Filter cards in target column (excluding currently dragged card if moving within same column)
    const columnTasks = targetColumn.tasks.filter((t) => t._id !== activeTaskId);

    // Calculate prevOrderIndex and nextOrderIndex for Fractional Indexing (DEC-003)
    let prevOrderIndex = null;
    let nextOrderIndex = null;

    if (columnTasks.length === 0) {
      prevOrderIndex = null;
      nextOrderIndex = null;
    } else if (targetIndex <= 0) {
      // Dropped at top of column
      prevOrderIndex = null;
      nextOrderIndex = columnTasks[0].orderIndex;
    } else if (targetIndex >= columnTasks.length) {
      // Dropped at bottom of column
      prevOrderIndex = columnTasks[columnTasks.length - 1].orderIndex;
      nextOrderIndex = null;
    } else {
      // Dropped between two cards
      prevOrderIndex = columnTasks[targetIndex - 1].orderIndex;
      nextOrderIndex = columnTasks[targetIndex].orderIndex;
    }

    // Apply Optimistic Update in Zustand store for instant 60fps UX
    optimisticMoveCard(activeTaskId, sourceColumnId, targetColumnId, targetIndex);

    // Persist single-document O(1) update to API
    try {
      await axios.patch(`/api/v1/tasks/${activeTaskId}/move`, {
        columnId: targetColumnId,
        prevOrderIndex,
        nextOrderIndex
      });
    } catch (err) {
      console.error('Failed to persist task move:', err);
      // Revert on failure
      fetchBoard();
    }
  };

  if (loading && !board) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-3 text-indigo-500" />
        Loading Kanban Board...
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="p-8 text-center text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchBoard}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate priority task counts
  const allTasks = board ? board.columns.flatMap((c) => c.tasks) : [];
  const priorityCounts = {
    all: allTasks.length,
    urgent: allTasks.filter((t) => t.priority === 'urgent').length,
    high: allTasks.filter((t) => t.priority === 'high').length,
    medium: allTasks.filter((t) => t.priority === 'medium').length,
    low: allTasks.filter((t) => t.priority === 'low').length
  };

  const hasActiveFilter = priorityFilter !== 'all' || searchQuery.trim().length > 0;

  // Apply filters
  const filteredColumns = board.columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter((task) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.taskKey.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    })
  }));

  // When filtering is active, ONLY display columns that have matching tasks!
  // Prevents empty placeholder columns (Image 4 issue resolved)
  const visibleColumns = hasActiveFilter
    ? filteredColumns.filter((col) => col.tasks.length > 0)
    : filteredColumns;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Board Controls: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter tasks (e.g. FLOW-101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Priority Filters with Live Counts */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['all', 'urgent', 'high', 'medium', 'low'].map((p) => {
              const count = priorityCounts[p] ?? 0;
              const isActive = priorityFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2 py-1 text-xs font-semibold rounded-lg capitalize transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{p}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher: Board vs Vertical List */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Columns Board View"
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vertical List Feed (Scroll downwards)"
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>

        {/* Board Progress Stats & Add Task */}
        <div className="flex items-center space-x-3 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="hidden md:inline">
            Tasks: <strong>{board.summary.totalTasks}</strong>
          </span>
          <span className="hidden md:inline">
            Story Points: <strong>{board.summary.totalPoints}</strong>
          </span>
          <span className="flex items-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {board.summary.completionPercentage}% Done
          </span>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* When filtering produces 0 results */}
      {hasActiveFilter && visibleColumns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center my-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            No {priorityFilter !== 'all' ? `"${priorityFilter}"` : ''} tasks found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            There are currently no tasks matching your filter criteria in this project.
          </p>
          <button
            onClick={() => {
              setPriorityFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-600/20 active:scale-95"
          >
            Show All Tasks ({allTasks.length})
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* Vertical List Feed Mode: Scroll downwards */
        <div className="flex flex-col space-y-4 pb-8 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full border-2 ${
                      COLUMN_HEADER_COLORS[column.id] || 'border-slate-400'
                    }`}
                  ></span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {column.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {column.tasks.length}
                  </span>
                </div>
                {column.totalPoints > 0 && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {column.totalPoints} pts
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {column.tasks.map((task) => (
                  <div
                    key={task._id || task.id}
                    onClick={() => setSelectedTask(task)}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {task.taskKey}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                        {task.title}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                      {task.labels && task.labels.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1">
                          {task.labels.slice(0, 2).map((l) => (
                            <span
                              key={l}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                              #{l}
                            </span>
                          ))}
                        </div>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          PRIORITY_STYLES[task.priority] || ''
                        } capitalize`}
                      >
                        {task.priority}
                      </span>
                      {task.storyPoints !== null && task.storyPoints !== undefined && (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">
                          {task.storyPoints} pts
                        </span>
                      )}
                      {task.assigneeId ? (
                        <div
                          className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold"
                          title={task.assigneeId.name}
                        >
                          {task.assigneeId.name.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]"
                          title="Unassigned"
                        >
                          -
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Board Columns Mode: Fit horizontally across width without horizontal scrollbar */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-wrap lg:flex-nowrap gap-3.5 pb-4 flex-1 w-full">
            {visibleColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                isFiltered={hasActiveFilter}
                onNewTask={() => setShowCreateTaskModal(true)}
                onTaskClick={(task) => setSelectedTask(task)}
              />
            ))}
          </div>

          {/* Floating Drag Overlay */}
          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      <CreateTaskModal
        projectId={projectId}
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onTaskCreated={() => fetchBoard()}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={() => fetchBoard()}
      />
    </div>
  );
}
