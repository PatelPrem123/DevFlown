import { create } from 'zustand';

export const useKanbanStore = create((set) => ({
  board: null,
  activeTask: null,
  searchQuery: '',
  priorityFilter: 'all',

  setBoard: (board) => set({ board }),
  setActiveTask: (task) => set({ activeTask: task }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),

  /**
   * Optimistic Card Movement (DEC-003)
   * Updates local column arrays instantaneously during drag-and-drop
   */
  optimisticMoveCard: (taskId, sourceColId, targetColId, newIndex, newOrderIndex) => {
    set((state) => {
      if (!state.board) return state;

      const columns = state.board.columns.map((col) => ({
        ...col,
        tasks: [...col.tasks]
      }));

      const sourceCol = columns.find((c) => c.id === sourceColId);
      const targetCol = columns.find((c) => c.id === targetColId);

      if (!sourceCol || !targetCol) return state;

      const taskIndex = sourceCol.tasks.findIndex((t) => (t._id || t.id) === taskId);
      if (taskIndex === -1) return state;

      const [task] = sourceCol.tasks.splice(taskIndex, 1);
      task.status = targetColId;
      if (newOrderIndex) task.orderIndex = newOrderIndex;

      targetCol.tasks.splice(newIndex, 0, task);

      // Recompute column counts and points
      sourceCol.count = sourceCol.tasks.length;
      sourceCol.totalPoints = sourceCol.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      targetCol.count = targetCol.tasks.length;
      targetCol.totalPoints = targetCol.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        board: {
          ...state.board,
          columns
        }
      };
    });
  }
}));
