import Notification from '../models/Notification.js';

// @desc    Get user notifications (unread first)
// @route   GET /api/v1/notifications
// @access  Authenticated
export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .populate('senderId', 'name email avatar')
      .sort({ read: 1, createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      read: false
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Authenticated
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notification
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Authenticated
export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read.`
    });
  } catch (error) {
    next(error);
  }
};
