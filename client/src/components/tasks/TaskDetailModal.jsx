import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, MessageSquare, Clock, Tag, User, CheckCircle2, Trash2, Send } from 'lucide-react';

export default function TaskDetailModal({ task, isOpen, onClose, onTaskUpdated }) {
  if (!isOpen || !task) return null;

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [status, setStatus] = useState(task.status || 'to_do');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [loadingComments, setLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await api.get(`/tasks/${task._id}/comments`);
      setComments(res.data.data.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (task?._id) {
      fetchComments();
      setStatus(task.status);
      setPriority(task.priority);
    }
  }, [task?._id]);

  // Update status or priority
  const handleUpdate = async (field, value) => {
    try {
      const res = await api.patch(`/tasks/${task._id}`, { [field]: value });
      if (onTaskUpdated) onTaskUpdated(res.data.data.task);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmittingComment(true);
      const res = await api.post(`/tasks/${task._id}/comments`, { content: newComment.trim() });
      setComments([...comments, res.data.data.comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(comments.filter(c => c._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
              {task.taskKey}
            </span>
            <span className="text-xs text-slate-400">Created {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{task.title}</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
              {task.description || 'No detailed description provided.'}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleUpdate('status', e.target.value);
                }}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
              >
                <option value="backlog">Backlog</option>
                <option value="to_do">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleUpdate('priority', e.target.value);
                }}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Story Points</label>
              <div className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                {task.storyPoints || 0} pts
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Discussion & Activity ({comments.length})
              </h4>
            </div>

            <div className="space-y-3 mb-4">
              {loadingComments ? (
                <p className="text-xs text-slate-400">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation!</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment._id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between group"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {comment.authorId?.name || 'Team Member'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{comment.content}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment or mention @team..."
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
