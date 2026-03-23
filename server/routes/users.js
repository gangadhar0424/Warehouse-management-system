const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const StorageAllocation = require('../models/StorageAllocation');
const DynamicWarehouseLayout = require('../models/DynamicWarehouseLayout');
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

    // Build customer stats used by UserManagementPanel (active storage + total spent)
    const customerIds = usersByRole.customers.map(c => c._id);
    const totalSpentMap = new Map();
    const activeStorageMap = new Map();

    if (customerIds.length > 0) {
      // Total spent from transactions
      const spentAgg = await Transaction.aggregate([
        { $match: { customer: { $in: customerIds } } },
        {
          $group: {
            _id: '$customer',
            totalSpent: { $sum: { $ifNull: ['$amount.totalAmount', 0] } }
          }
        }
      ]);

      spentAgg.forEach(row => {
        totalSpentMap.set(String(row._id), row.totalSpent || 0);
      });

      // Active allocations from classic StorageAllocation model
      const activeAllocAgg = await StorageAllocation.aggregate([
        { $match: { customer: { $in: customerIds }, status: 'active' } },
        { $group: { _id: '$customer', count: { $sum: 1 } } }
      ]);

      activeAllocAgg.forEach(row => {
        activeStorageMap.set(String(row._id), (activeStorageMap.get(String(row._id)) || 0) + (row.count || 0));
      });

      // Active allocations from dynamic warehouse slots
      const layouts = await DynamicWarehouseLayout.find({ isActive: true }).select('layout').lean();
      layouts.forEach(layout => {
        (layout.layout || []).forEach(building => {
          (building.blocks || []).forEach(block => {
            (block.slots || []).forEach(slot => {
              (slot.allocations || []).forEach(allocation => {
                const customerId = allocation?.customer ? String(allocation.customer) : null;
                if (customerId) {
                  activeStorageMap.set(customerId, (activeStorageMap.get(customerId) || 0) + 1);
                }
              });
            });
          });
        });
      });
    }

    const attachStats = (user) => {
      if (user.role !== 'customer') return user;
      const id = String(user._id);
      return {
        ...user.toObject(),
        stats: {
          activeAllocations: activeStorageMap.get(id) || 0,
          totalSpent: totalSpentMap.get(id) || 0
        }
      };
    };

    usersByRole.owners = usersByRole.owners.map(attachStats);
    usersByRole.customers = usersByRole.customers.map(attachStats);
    usersByRole.all = usersByRole.all.map(attachStats);

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

// @route   PUT /api/users/update-language
// @desc    Update user's language preference
// @access  Authenticated users (owner, customer)
router.put('/update-language', auth, async (req, res) => {
  try {
    const { language } = req.body;
    
    if (!language || !['en', 'te'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Must be "en" or "te"'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.preferredLanguage = language;
    await user.save();

    res.json({
      success: true,
      message: 'Language preference updated successfully',
      language: user.preferredLanguage
    });
  } catch (error) {
    console.error('Error updating language preference:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating language preference'
    });
  }
});

module.exports = router;
