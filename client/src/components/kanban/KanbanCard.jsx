import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GitCommit, AlertCircle, Clock, CheckCircle2, User } from 'lucide-react';

const PRIORITY_STYLES = {
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
};

export default function KanbanCard({ task, isOverlay = false, onTaskClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task._id,
    data: { task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  };

  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick && onTaskClick(task)}
      className={`bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
        isOverlay ? 'scale-105 shadow-2xl rotate-2 ring-2 ring-indigo-500' : ''
      }`}
    >
      {/* Top Header: Key & Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          {task.taskKey}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityStyle} capitalize`}
        >
          {task.priority}
        </span>
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mb-3 leading-snug">
        {task.title}
      </h4>

      {/* Tags / Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
            >
              #{label}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Points, Assignee & Git commits */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          {task.storyPoints !== null && task.storyPoints !== undefined && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {task.storyPoints} pts
            </span>
          )}
          {task.githubCommits && task.githubCommits.length > 0 && (
            <span className="inline-flex items-center space-x-1 text-[11px] text-slate-600 dark:text-slate-300">
              <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
              <span>{task.githubCommits.length}</span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center">
          {task.assigneeId ? (
            <div
              className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold"
              title={task.assigneeId.name}
            >
              {task.assigneeId.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400" title="Unassigned">
              <User className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
