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
import { Search, Filter, RefreshCw, CheckCircle2, Plus } from 'lucide-react';

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

  return (
    <div className="flex flex-col h-full">
      {/* Board Controls: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter tasks (e.g. FLOW-101 or keyword)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['all', 'urgent', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  priorityFilter === p
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Board Progress Stats & Add Task */}
        <div className="flex items-center space-x-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Tasks: <strong>{board.summary.totalTasks}</strong>
          </span>
          <span>
            Story Points: <strong>{board.summary.totalPoints}</strong>
          </span>
          <span className="flex items-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {board.summary.completionPercentage}% Done
          </span>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* DndContext & Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-thin flex-1">
          {filteredColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
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
