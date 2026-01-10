const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/workers
// @desc    Get all workers
// @access  Private (Owner only)
router.get('/', [auth, authorize('owner')], async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    let query = { role: 'worker', isActive: true };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      workers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/workers
// @desc    Add new worker
// @access  Private (Owner only)
router.post('/', [auth, authorize('owner')], async (req, res) => {
  try {
    const { username, email, password, profile } = req.body;

    // Check if worker already exists
    const existingWorker = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingWorker) {
      return res.status(400).json({
        message: 'Worker with this email or username already exists'
      });
    }

    const worker = new User({
      username,
      email,
      password,
      role: 'worker',
      profile,
      isVerified: true // Workers are pre-verified by owners
    });

    await worker.save();

    res.status(201).json({
      message: 'Worker added successfully',
      worker: {
        id: worker._id,
        username: worker.username,
        email: worker.email,
        profile: worker.profile,
        role: worker.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/workers/:id
// @desc    Update worker details
// @access  Private (Owner only)
router.put('/:id', [auth, authorize('owner')], async (req, res) => {
  try {
    const worker = await User.findById(req.params.id);

    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const { profile, isActive } = req.body;

    if (profile) {
      worker.profile = { ...worker.profile, ...profile };
    }

    if (typeof isActive === 'boolean') {
      worker.isActive = isActive;
    }

    await worker.save();

    res.json({
      message: 'Worker updated successfully',
      worker
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/workers/:id
// @desc    Deactivate worker
// @access  Private (Owner only)
router.delete('/:id', [auth, authorize('owner')], async (req, res) => {
  try {
    const worker = await User.findById(req.params.id);

    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    worker.isActive = false;
    await worker.save();

    res.json({ message: 'Worker deactivated successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/workers/:id/bag-work
// @desc    Record bag work for a worker
// @access  Private (Owner only)
router.post('/:id/bag-work', [auth, authorize('owner')], async (req, res) => {
  try {
    const { bagsCarried, workType, customerId, grainType, notes } = req.body;

    const worker = await User.findById(req.params.id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Initialize worker details if not exists
    if (!worker.workerDetails) {
      worker.workerDetails = {
        paymentPerBag: 5,
        totalBagsCarried: 0,
        totalEarnings: 0,
        workHistory: []
      };
    }

    const paymentAmount = bagsCarried * worker.workerDetails.paymentPerBag;

    // Update worker stats
    worker.workerDetails.totalBagsCarried += bagsCarried;
    worker.workerDetails.totalEarnings += paymentAmount;
    worker.workerDetails.lastWorkDate = new Date();

    // Add work history entry
    worker.workerDetails.workHistory.push({
      bagsCarried,
      paymentAmount,
      workType: workType || 'loading',
      customer: customerId,
      grainType,
      notes
    });

    await worker.save();

    res.json({
      message: 'Bag work recorded successfully',
      workRecord: {
        bagsCarried,
        paymentAmount,
        totalBagsCarried: worker.workerDetails.totalBagsCarried,
        totalEarnings: worker.workerDetails.totalEarnings
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/workers/:id/payment-rate
// @desc    Update worker payment rate per bag
// @access  Private (Owner only)
router.put('/:id/payment-rate', [auth, authorize('owner')], async (req, res) => {
  try {
    const { paymentPerBag } = req.body;

    const worker = await User.findById(req.params.id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Initialize worker details if not exists
    if (!worker.workerDetails) {
      worker.workerDetails = {
        totalBagsCarried: 0,
        totalEarnings: 0,
        workHistory: []
      };
    }

    worker.workerDetails.paymentPerBag = paymentPerBag;
    await worker.save();

    res.json({
      message: 'Payment rate updated successfully',
      paymentPerBag: worker.workerDetails.paymentPerBag
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/workers/:id/work-history
// @desc    Get worker work history
// @access  Private (Owner, or Worker for own data)
router.get('/:id/work-history', auth, async (req, res) => {
  try {
    const worker = await User.findById(req.params.id)
      .populate('workerDetails.workHistory.customer', 'username profile.firstName profile.lastName');

    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Check authorization
    if (req.user.role !== 'owner' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const workHistory = worker.workerDetails?.workHistory || [];
    const stats = {
      totalBagsCarried: worker.workerDetails?.totalBagsCarried || 0,
      totalEarnings: worker.workerDetails?.totalEarnings || 0,
      paymentPerBag: worker.workerDetails?.paymentPerBag || 5,
      lastWorkDate: worker.workerDetails?.lastWorkDate
    };

    res.json({
      worker: {
        id: worker._id,
        username: worker.username,
        profile: worker.profile
      },
      stats,
      workHistory: workHistory.slice(-50) // Last 50 records
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/workers/stats
// @desc    Get current worker's statistics
// @access  Private (Worker only for own stats)
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Access denied. Workers only.' });
    }

    const worker = await User.findById(req.user.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const workerDetails = worker.workerDetails || {};
    const workHistory = workerDetails.workHistory || [];
    
    // Calculate work days (unique dates)
    const workDates = workHistory.map(entry => 
      new Date(entry.date).toDateString()
    );
    const uniqueWorkDates = [...new Set(workDates)];

    const stats = {
      totalBags: workerDetails.totalBagsCarried || 0,
      totalEarnings: workerDetails.totalEarnings || 0,
      workDays: uniqueWorkDates.length,
      paymentPerBag: workerDetails.paymentPerBag || 5,
      lastWorkDate: workerDetails.lastWorkDate,
      recentWork: workHistory.slice(-10) // Last 10 work entries
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching worker stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;