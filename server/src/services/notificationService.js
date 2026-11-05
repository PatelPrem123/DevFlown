import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ProjectMembership from '../models/ProjectMembership.js';
import { getIO } from '../sockets/socketManager.js';

const safeEmit = (room, event, payload) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, payload);
    }
  } catch (err) {
    // Socket.IO uninitialized in tests
  }
};

/**
 * Creates and dispatches a single notification record
 */
export const createNotification = async ({
  recipientId,
  senderId,
  workspaceId,
  projectId = null,
  type,
  title,
  message,
  link = ''
}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      senderId,
      workspaceId,
      projectId,
      type,
      title,
      message,
      link
    });

    const populated = await Notification.findById(notification._id)
      .populate('senderId', 'name email avatar')
      .lean();

    safeEmit(`user_${recipientId}`, 'notification:new', populated);
    return populated;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Parses user @mentions in comment text and notifies mentioned team members
 */
export const parseMentionsAndNotify = async ({
  content,
  task,
  sender,
  workspaceId,
  projectId
}) => {
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const matches = [...content.matchAll(mentionRegex)].map(m => m[1]);

  if (matches.length === 0) return [];

  // Find project members whose name, githubUsername, or email matches the mention tag
  const projectMemberships = await ProjectMembership.find({ projectId }).select('userId');
  const memberUserIds = projectMemberships.map(m => m.userId);

  const matchedUsers = await User.find({
    _id: { $in: memberUserIds },
    $or: [
      { githubUsername: { $in: matches } },
      { name: { $in: matches.map(m => new RegExp(`^${m}`, 'i')) } },
      { email: { $in: matches.map(m => new RegExp(`^${m}@`, 'i')) } }
    ]
  }).select('_id name email');

  const mentionedUserIds = [];

  for (const user of matchedUsers) {
    // Do not notify self
    if (user._id.toString() === sender._id.toString()) continue;

    mentionedUserIds.push(user._id);

    await createNotification({
      recipientId: user._id,
      senderId: sender._id,
      workspaceId,
      projectId,
      type: 'mention',
      title: `${sender.name} mentioned you on ${task.taskKey}`,
      message: `${sender.name}: "${content.substring(0, 150)}${content.length > 150 ? '...' : ''}"`,
      link: `/projects/${projectId}/tasks/${task.taskKey}`
    });

    safeEmit(`user_${user._id}`, 'mention:alert', {
      taskKey: task.taskKey,
      senderName: sender.name,
      snippet: content.substring(0, 150)
    });
  }

  return mentionedUserIds;
};
