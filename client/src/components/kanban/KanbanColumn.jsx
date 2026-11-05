import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard.jsx';
import { Plus } from 'lucide-react';

const COLUMN_HEADER_COLORS = {
  backlog: 'border-slate-400 text-slate-700 dark:text-slate-300',
  to_do: 'border-indigo-500 text-indigo-700 dark:text-indigo-400',
  in_progress: 'border-amber-500 text-amber-700 dark:text-amber-400',
  review: 'border-purple-500 text-purple-700 dark:text-purple-400',
  done: 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
};

export default function KanbanColumn({ column, onNewTask, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { column }
  });

  const taskIds = column.tasks.map((t) => t._id);
  const headerColor = COLUMN_HEADER_COLORS[column.id] || 'border-slate-400 text-slate-700';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 shrink-0 bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl p-3 border transition-colors ${
        isOver
          ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1 border-b-2 mb-3 border-transparent">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full border-2 ${headerColor}`}></span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{column.title}</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {column.count}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {column.totalPoints > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
              {column.totalPoints} pts
            </span>
          )}
          {onNewTask && (
            <button
              onClick={() => onNewTask(column.id)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Add card"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards Sortable Container */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto min-h-[350px] max-h-[calc(100vh-250px)] pr-0.5 scrollbar-thin">
          {column.tasks.map((task) => (
            <KanbanCard key={task._id} task={task} onTaskClick={onTaskClick} />
          ))}

          {column.tasks.length === 0 && (
            <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center p-6 text-center text-xs text-slate-400">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
