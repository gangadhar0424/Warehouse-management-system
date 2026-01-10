const express = require('express');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const StorageAllocation = require('../models/StorageAllocation');
const Loan = require('../models/Loan');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/analytics/owner/dashboard
// @desc    Get comprehensive analytics for owner dashboard
// @access  Private (Owner only)
router.get('/owner/dashboard', auth, authorize('owner'), async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    // Revenue breakdown
    const transactions = await Transaction.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const rentRevenue = transactions
      .filter(t => t.type === 'storage')
      .reduce((sum, t) => sum + (t.amount.finalAmount || 0), 0);

    const loanInterest = await Loan.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalInterest' } } }
    ]);

    const vehicleCharges = transactions
      .filter(t => t.type === 'weigh_bridge')
      .reduce((sum, t) => sum + (t.amount.finalAmount || 0), 0);

    const otherCharges = transactions
      .filter(t => ['loading', 'unloading', 'penalty'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount.finalAmount || 0), 0);

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount.finalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Customer analytics
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const activeCustomers = await StorageAllocation.distinct('customer', { status: 'active' });
    
    const customerLifetimeValue = await Transaction.aggregate([
      { $group: { _id: '$customer', totalSpent: { $sum: '$amount.finalAmount' } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    // Populate customer names
    const topCustomers = await Promise.all(
      customerLifetimeValue.map(async (c) => {
        const customer = await User.findById(c._id).select('profile.firstName profile.lastName');
        return {
          name: `${customer?.profile?.firstName || ''} ${customer?.profile?.lastName || ''}`,
          totalSpent: c.totalSpent,
          customerId: c._id
        };
      })
    );

    // Loan portfolio
    const loans = await Loan.find();
    const activeLoanAmount = loans
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + l.remainingAmount, 0);
    
    const pendingApprovals = loans.filter(l => l.status === 'pending').length;
    const defaultedLoans = loans.filter(l => l.status === 'defaulted').length;
    const interestEarned = loanInterest[0]?.total || 0;
    
    const healthyLoans = loans.filter(l => l.status === 'active' && !l.isOverdue()).length;
    const atRiskLoans = loans.filter(l => l.status === 'active' && l.isOverdue()).length;

    // Grain inventory
    const allocations = await StorageAllocation.find({ status: 'active' }).populate('customer', 'profile');
    
    const grainInventory = {};
    let totalGrainValue = 0;
    let totalDays = 0;
    let allocationCount = 0;
    const expiringGrains = [];

    allocations.forEach(allocation => {
      allocation.storageDetails.items.forEach(item => {
        const grainType = item.description;
        if (!grainInventory[grainType]) {
          grainInventory[grainType] = { quantity: 0, weight: 0, customers: new Set() };
        }
        grainInventory[grainType].quantity += item.quantity || 0;
        grainInventory[grainType].weight += item.weight || 0;
        grainInventory[grainType].customers.add(allocation.customer._id.toString());
      });

      totalGrainValue += allocation.storageDetails.totalValue || 0;
      const days = allocation.getDaysStored();
      totalDays += days;
      allocationCount++;

      // Check expiring grains
      const remainingDays = allocation.getRemainingDays();
      if (remainingDays !== null && remainingDays <= 7 && remainingDays >= 0) {
        expiringGrains.push({
          customer: `${allocation.customer.profile?.firstName || ''} ${allocation.customer.profile?.lastName || ''}`,
          grainType: allocation.storageDetails.items.map(i => i.description).join(', '),
          daysRemaining: remainingDays
        });
      }
    });

    // Convert Set to count for customers
    Object.keys(grainInventory).forEach(grain => {
      grainInventory[grain].customers = grainInventory[grain].customers.size;
    });

    const averageStorageDuration = allocationCount > 0 ? Math.round(totalDays / allocationCount) : 0;

    // Worker performance
    const workers = await User.find({ role: 'worker' }).select('profile');
    const workerStats = await Promise.all(
      workers.map(async (worker) => {
        const vehiclesProcessed = await Vehicle.countDocuments({ 
          weighBridge: { $exists: true },
          'weighBridge.operator': worker._id
        });

        const paymentsCollected = await Transaction.countDocuments({
          processedBy: worker._id
        });

        return {
          workerId: worker._id,
          name: `${worker.profile?.firstName || ''} ${worker.profile?.lastName || ''}`,
          vehiclesProcessed,
          paymentsCollected,
          productivity: vehiclesProcessed > 30 ? 'High' : vehiclesProcessed > 15 ? 'Medium' : 'Low'
        };
      })
    );

    res.json({
      revenue: {
        rentCollected: rentRevenue,
        loanInterest: interestEarned,
        vehicleCharges,
        otherCharges,
        total: rentRevenue + interestEarned + vehicleCharges + otherCharges
      },
      monthlyRevenue,
      customers: {
        total: totalCustomers,
        active: activeCustomers.length,
        topCustomers
      },
      loans: {
        totalIssued: loans.length,
        activeLoanAmount,
        pendingApprovals,
        defaultedLoans,
        interestEarned,
        riskMetrics: {
          healthyLoans,
          atRiskLoans
        }
      },
      grainInventory,
      totalGrainValue,
      averageStorageDuration,
      expiringGrains,
      workerStats
    });

  } catch (error) {
    console.error('Error fetching owner analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/analytics/owner/capacity
// @desc    Get warehouse capacity analytics
// @access  Private (Owner only)
router.get('/owner/capacity', auth, authorize('owner'), async (req, res) => {
  try {
    const allocations = await StorageAllocation.find({ status: 'active' });
    
    // Calculate total boxes based on warehouse layouts
    // Assuming standard configuration: buildings × blocks × wings × boxes
    const totalBoxes = 2 * 3 * 2 * 6; // 72 boxes (configurable)
    const occupiedBoxes = allocations.length;
    const availableBoxes = totalBoxes - occupiedBoxes;
    const occupancyRate = ((occupiedBoxes / totalBoxes) * 100).toFixed(2);

    // Breakdown by building
    const warehouseMap = {};
    allocations.forEach(allocation => {
      const building = `building${allocation.allocation.building}`;
      if (!warehouseMap[building]) {
        warehouseMap[building] = { occupied: 0, total: 36 }; // 3×2×6 per building
      }
      warehouseMap[building].occupied++;
    });

    res.json({
      totalBoxes,
      occupiedBoxes,
      availableBoxes,
      occupancyRate: parseFloat(occupancyRate),
      warehouseMap
    });

  } catch (error) {
    console.error('Error fetching capacity analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/analytics/owner/financial-summary
// @desc    Get financial summary with expenses
// @access  Private (Owner only)
router.get('/owner/financial-summary', auth, authorize('owner'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate;
    const endDate = new Date();

    switch(period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    const transactions = await Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const income = {
      rentCollected: transactions
        .filter(t => t.type === 'storage')
        .reduce((sum, t) => sum + (t.amount.finalAmount || 0), 0),
      loanInterest: 0, // Would need separate tracking
      vehicleCharges: transactions
        .filter(t => t.type === 'weigh_bridge')
        .reduce((sum, t) => sum + (t.amount.finalAmount || 0), 0),
      otherCharges: transactions
        .filter(t => ['loading', 'unloading', 'penalty'].includes(t.type))
        .reduce((sum, t) => sum + (t.amount.finalAmount || 0), 0)
    };

    income.total = income.rentCollected + income.loanInterest + income.vehicleCharges + income.otherCharges;

    // Expenses (mock data - would need expense tracking system)
    const expenses = {
      workerSalaries: 50000, // Mock
      maintenance: 10000,
      utilities: 8000,
      total: 68000
    };

    const netProfit = income.total - expenses.total;
    const profitMargin = income.total > 0 ? ((netProfit / income.total) * 100).toFixed(2) : 0;

    res.json({
      period,
      income,
      expenses,
      netProfit,
      profitMargin: parseFloat(profitMargin)
    });

  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/analytics/owner/alerts
// @desc    Get priority-based alerts
// @access  Private (Owner only)
router.get('/owner/alerts', auth, authorize('owner'), async (req, res) => {
  try {
    const alerts = {
      critical: [],
      warnings: [],
      info: []
    };

    // Check overdue loans
    const overdueLoans = await Loan.find({ status: 'active' }).populate('customer', 'profile');
    overdueLoans.forEach(loan => {
      if (loan.isOverdue()) {
        const daysOverdue = loan.getDaysOverdue();
        if (daysOverdue > 30) {
          alerts.critical.push(
            `Loan payment overdue by ${daysOverdue} days - ${loan.customer.profile?.firstName} ${loan.customer.profile?.lastName}`
          );
        }
      }
    });

    // Check unpaid rent
    const unpaidRent = await StorageAllocation.find({ 
      paymentStatus: { $in: ['pending', 'overdue'] } 
    }).populate('customer', 'profile');

    unpaidRent.forEach(allocation => {
      if (allocation.paymentStatus === 'overdue') {
        alerts.critical.push(
          `Storage rent unpaid - ${allocation.customer.profile?.firstName} ${allocation.customer.profile?.lastName}`
        );
      }
    });

    // Check warehouse capacity
    const allocations = await StorageAllocation.countDocuments({ status: 'active' });
    const totalBoxes = 72; // Configurable
    const occupancyRate = (allocations / totalBoxes) * 100;

    if (occupancyRate >= 90) {
      alerts.warnings.push(`Warehouse capacity at ${occupancyRate.toFixed(0)}%`);
    }

    // Check expiring grains
    const allAllocations = await StorageAllocation.find({ status: 'active' }).populate('customer', 'profile');
    allAllocations.forEach(allocation => {
      const remainingDays = allocation.getRemainingDays();
      if (remainingDays !== null && remainingDays <= 3 && remainingDays >= 0) {
        alerts.warnings.push(
          `Grain expiry in ${remainingDays} days - ${allocation.customer.profile?.firstName} ${allocation.customer.profile?.lastName}`
        );
      }
    });

    // Check pending loan approvals
    const pendingLoans = await Loan.countDocuments({ status: 'pending' });
    if (pendingLoans > 0) {
      alerts.warnings.push(`Loan approval pending - ${pendingLoans} requests`);
    }

    // Recent activities
    const recentCustomers = await User.find({ 
      role: 'customer',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (recentCustomers.length > 0) {
      alerts.info.push(`${recentCustomers.length} new customer registration(s)`);
    }

    const recentPayments = await Transaction.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      'payment.status': 'completed'
    });

    if (recentPayments.length > 0) {
      alerts.info.push(`${recentPayments.length} payment(s) received today`);
    }

    res.json(alerts);

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
