const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Authorize middleware function
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// @route   GET /api/users/all
// @desc    Get all users (owners, customers)
// @access  Owner only
router.get('/all', auth, authorize('owner'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 });

    // Group users by role
    const usersByRole = {
      owners: users.filter(u => u.role === 'owner'),
      customers: users.filter(u => u.role === 'customer'),
      all: users
    };

    // Get statistics
    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        owners: usersByRole.owners.length,
        customers: usersByRole.customers.length
      }
    };

    res.json({
      success: true,
      users: usersByRole,
      stats
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user details
// @access  Owner only
router.get('/:id', auth, authorize('owner'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   PUT /api/users/:id/toggle-status
// @desc    Activate/Deactivate user
// @access  Owner only
router.put('/:id/toggle-status', auth, authorize('owner'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

module.exports = router;
