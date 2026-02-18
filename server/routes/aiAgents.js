const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');
const Vehicle = require('../models/Vehicle');
const DynamicWarehouseLayout = require('../models/DynamicWarehouseLayout');

// @route   POST /api/ai/chat
// @desc    Master AI chatbot for natural language queries
// @access  Private
router.post('/chat', auth, async (req, res) => {
  try {
    const { query } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Fetch relevant data based on user role
    let contextData = {};
    
    if (userRole === 'owner') {
      // Owner has access to all data
      const [transactions, customers, vehicles, loans, layouts] = await Promise.all([
        Transaction.find().limit(100).lean(),
        User.find({ role: 'customer' }).limit(50).lean(),
        Vehicle.find().limit(50).lean(),
        Loan.find().limit(50).lean(),
        DynamicWarehouseLayout.find().lean()
      ]);
      
      contextData = {
        transactionCount: transactions.length,
        customerCount: customers.length,
        vehicleCount: vehicles.length,
        activeLoans: loans.filter(l => l.status === 'active').length,
        totalRevenue: transactions.reduce((sum, t) => sum + (t.amount?.totalAmount || 0), 0),
        recentTransactions: transactions.slice(0, 10)
      };
    } else if (userRole === 'customer') {
      // Customer only sees their own data
      const [transactions, loans, allocations] = await Promise.all([
        Transaction.find({ customer: userId }).lean(),
        Loan.find({ customer: userId }).lean(),
        DynamicWarehouseLayout.find({
          'layout.blocks.slots.allocations.customer': userId
        }).lean()
      ]);
      
      const totalSpent = transactions.reduce((sum, t) => sum + (t.amount?.totalAmount || 0), 0);
      const activeLoans = loans.filter(l => l.status === 'active');
      const totalLoanAmount = activeLoans.reduce((sum, l) => sum + l.outstandingAmount, 0);
      
      contextData = {
        totalSpent,
        transactionCount: transactions.length,
        activeLoans: activeLoans.length,
        totalLoanAmount,
        storedGrains: allocations.length,
        recentTransactions: transactions.slice(0, 5)
      };
    }

    // Generate AI response
    const response = await geminiService.generateContent(query, {
      role: userRole,
      data: contextData,
      systemContext: `You are helping a ${userRole} in a warehouse management system.`
    });

    res.json({
      success: true,
      response,
      contextUsed: Object.keys(contextData)
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process AI query',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/loan-risk-assessment
// @desc    Loan Risk & Credit Agent - Assess loan application risk
// @access  Private (Owner only)
router.post('/loan-risk-assessment', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { customerId, loanAmount, duration, purpose, collateralValue } = req.body;

    // Get customer history
    const [transactions, loans, paymentHistory] = await Promise.all([
      Transaction.find({ customer: customerId }),
      Loan.find({ customer: customerId }),
      Transaction.find({ 
        customer: customerId,
        type: 'loan_repayment'
      }).sort({ createdAt: -1 })
    ]);

    const totalPaid = transactions
      .filter(t => t.payment?.status === 'completed')
      .reduce((sum, t) => sum + (t.amount?.totalAmount || 0), 0);
    
    const pendingPayments = transactions
      .filter(t => t.payment?.status === 'pending')
      .reduce((sum, t) => sum + (t.amount?.totalAmount || 0), 0);

    const activeLoans = loans.filter(l => ['active', 'pending'].includes(l.status)).length;
    
    // Calculate payment delays
    const paymentDelays = paymentHistory.filter(p => {
      if (!p.payment?.dueDate) return false;
      return new Date(p.payment.date) > new Date(p.payment.dueDate);
    }).length;

    // Get customer's storage duration
    const customer = await User.findById(customerId);
    const storageDuration = customer && customer.createdAt 
      ? Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    const customerHistory = {
      totalTransactions: transactions.length,
      totalPaid,
      pendingPayments,
      activeLoans,
      paymentDelays,
      storageDuration
    };

    const loanData = {
      amount: loanAmount,
      duration,
      purpose,
      collateralValue
    };

    // Get AI risk assessment
    const riskAssessment = await geminiService.analyzeRiskScore(loanData, customerHistory);

    res.json({
      success: true,
      riskAssessment,
      customerHistory
    });

  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to assess loan risk',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/market-prediction
// @desc    Market Pricing & Selling Advisor Agent
// @access  Private
router.post('/market-prediction', auth, async (req, res) => {
  try {
    const { grainType, customerId } = req.body;

    // Get historical price data (mock for now - replace with actual market API)
    const historicalData = {
      prices_last_30_days: [
        { date: '2026-01-18', price: 1500 },
        { date: '2026-01-25', price: 1520 },
        { date: '2026-02-01', price: 1480 },
        { date: '2026-02-08', price: 1550 },
        { date: '2026-02-15', price: 1600 }
      ],
      current_price: 1600,
      market_volume: 'HIGH',
      season: 'HARVEST'
    };

    // Get customer's grain value if customerId provided
    let customerGrainValue = 0;
    if (customerId) {
      const layouts = await DynamicWarehouseLayout.find({
        'layout.blocks.slots.allocations.customer': customerId
      });
      
      for (const layout of layouts) {
        for (const building of layout.layout) {
          for (const block of building.blocks) {
            for (const slot of block.slots) {
              const customerAllocs = slot.allocations.filter(
                a => a.customer && a.customer.toString() === customerId &&
                     a.grainType.toLowerCase() === grainType.toLowerCase()
              );
              customerAllocs.forEach(alloc => {
                customerGrainValue += (alloc.weight || 0) * (historicalData.current_price / 100);
              });
            }
          }
        }
      }
    }

    // Get AI prediction
    const prediction = await geminiService.predictMarketTrend(grainType, historicalData);

    res.json({
      success: true,
      prediction,
      currentMarketData: historicalData,
      customerGrainValue: customerGrainValue ? `₹${customerGrainValue.toFixed(2)}` : null
    });

  } catch (error) {
    console.error('Market prediction error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate market prediction',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/inventory-optimization
// @desc    Inventory Intelligence Agent - Warehouse space optimization
// @access  Private (Owner only)
router.post('/inventory-optimization', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const layouts = await DynamicWarehouseLayout.find({ isActive: true });

    const layoutData = layouts.map(layout => {
      const slotsAnalysis = [];
      
      layout.layout.forEach(building => {
        building.blocks.forEach(block => {
          block.slots.forEach(slot => {
            const fillPercentage = (slot.filledBags / slot.capacity) * 100;
            slotsAnalysis.push({
              slotLabel: slot.slotLabel,
              capacity: slot.capacity,
              filled: slot.filledBags,
              fillPercentage: fillPercentage.toFixed(2),
              status: slot.status,
              allocations: slot.allocations.length
            });
          });
        });
      });

      return {
        warehouseName: layout.name,
        totalSlots: layout.totalSlots,
        occupancyRate: layout.occupancyRate,
        slots: slotsAnalysis
      };
    });

    // Get allocation history
    const allocationHistory = layouts.flatMap(layout =>
      layout.layout.flatMap(building =>
        building.blocks.flatMap(block =>
          block.slots.flatMap(slot =>
            slot.allocations.map(alloc => ({
              timestamp: alloc.timestamp,
              bags: alloc.bags,
              grainType: alloc.grainType,
              slotLabel: slot.slotLabel
            }))
          )
        )
      )
    );

    // Get AI optimization suggestions
    const optimization = await geminiService.optimizeInventory(layoutData, allocationHistory);

    res.json({
      success: true,
      optimization,
      currentState: {
        totalWarehouses: layouts.length,
        totalSlots: layouts.reduce((sum, l) => sum + l.totalSlots, 0),
        avgOccupancy: (layouts.reduce((sum, l) => sum + l.occupancyRate, 0) / layouts.length).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Inventory optimization error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to optimize inventory',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/fraud-detection
// @desc    Anomaly & Fraud Detection Agent
// @access  Private (Owner only)
router.post('/fraud-detection', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { analysisType = 'transactions', lookbackDays = 30 } = req.body;

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    if (analysisType === 'transactions') {
      const transactions = await Transaction.find({
        createdAt: { $gte: lookbackDate }
      }).populate('customer', 'username email')
        .populate('vehicle', 'vehicleNumber');

      const transactionData = transactions.map(t => ({
        id: t._id,
        type: t.type,
        amount: t.amount?.totalAmount || 0,
        customer: t.customer?.username,
        date: t.createdAt,
        paymentStatus: t.payment?.status,
        paymentMethod: t.payment?.method
      }));

      const anomalies = await geminiService.detectAnomalies(transactionData);

      res.json({
        success: true,
        anomalies,
        analysis: {
          transactionsAnalyzed: transactions.length,
          period: `Last ${lookbackDays} days`,
          anomaliesFound: anomalies.length
        }
      });

    } else if (analysisType === 'weighbridge') {
      const vehicles = await Vehicle.find({
        entryTime: { $gte: lookbackDate }
      });

      const weighingData = vehicles.filter(v => v.weighBridgeData).map(v => ({
        vehicleNumber: v.vehicleNumber,
        tareWeight: v.weighBridgeData.tareWeight,
        grossWeight: v.weighBridgeData.grossWeight,
        netWeight: v.weighBridgeData.netWeight,
        entryTime: v.entryTime,
        weighingStatus: v.weighingStatus
      }));

      const analysis = await geminiService.analyzeWeighbridgeData(weighingData);

      res.json({
        success: true,
        analysis,
        weighingRecords: weighingData.length
      });
    }

  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to detect anomalies',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/storage-duration-prediction
// @desc    Demand & Storage Duration Prediction Agent
// @access  Private
router.post('/storage-duration-prediction', auth, async (req, res) => {
  try {
    const { customerId, grainType } = req.body;

    // Get customer storage history
    const layouts = await DynamicWarehouseLayout.find({
      'layout.blocks.slots.allocations.customer': customerId
    });

    const customerData = {
      previousStorages: [],
      avgStorageDuration: 0,
      preferredGrains: []
    };

    layouts.forEach(layout => {
      layout.layout.forEach(building => {
        building.blocks.forEach(block => {
          block.slots.forEach(slot => {
            const customerAllocs = slot.allocations.filter(
              a => a.customer && a.customer.toString() === customerId
            );
            customerAllocs.forEach(alloc => {
              customerData.previousStorages.push({
                grainType: alloc.grainType,
                timestamp: alloc.timestamp,
                bags: alloc.bags
              });
            });
          });
        });
      });
    });

    // Calculate average storage duration from previous storages
    if (customerData.previousStorages.length > 1) {
      const durations = customerData.previousStorages
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .reduce((acc, storage, i, arr) => {
          if (i < arr.length - 1) {
            const duration = (new Date(arr[i + 1].timestamp) - new Date(storage.timestamp)) / (1000 * 60 * 60 * 24 * 30);
            acc.push(duration);
          }
          return acc;
        }, []);
      
      customerData.avgStorageDuration = durations.length > 0 
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
        : 3;
    } else {
      customerData.avgStorageDuration = 3; // Default 3 months
    }

    // Mock market data (replace with actual live market API)
    const marketData = {
      currentPrice: 1600,
      priceHistory: [1500, 1520, 1480, 1550, 1600],
      trend: 'RISING',
      volatility: 'MODERATE'
    };

    // Get AI prediction
    const prediction = await geminiService.predictStorageDuration(
      customerData,
      grainType,
      marketData
    );

    res.json({
      success: true,
      prediction,
      historicalData: {
        previousStorages: customerData.previousStorages.length,
        avgDuration: `${customerData.avgStorageDuration.toFixed(1)} months`
      }
    });

  } catch (error) {
    console.error('Storage prediction error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to predict storage duration',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/weighbridge-analysis
// @desc    Weighbridge Optimization Agent - Real-time analysis
// @access  Private (Owner only)
router.post('/weighbridge-analysis', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get recent weighing records (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const vehicles = await Vehicle.find({
      entryTime: { $gte: sevenDaysAgo },
      weighBridgeData: { $exists: true }
    });

    const weighingRecords = vehicles.map(v => ({
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      tareWeight: v.weighBridgeData?.tareWeight,
      grossWeight: v.weighBridgeData?.grossWeight,
      netWeight: v.weighBridgeData?.netWeight,
      firstWeighTime: v.weighBridgeData?.firstWeighTime,
      secondWeighTime: v.weighBridgeData?.secondWeighTime,
      weighingStatus: v.weighingStatus,
      visitPurpose: v.visitPurpose
    }));

    // Get AI analysis
    const analysis = await geminiService.analyzeWeighbridgeData(weighingRecords);

    res.json({
      success: true,
      analysis,
      stats: {
        totalWeighings: weighingRecords.length,
        completedWeighings: vehicles.filter(v => v.weighingStatus === 'completed').length,
        partialWeighings: vehicles.filter(v => v.weighingStatus === 'partial').length
      }
    });

  } catch (error) {
    console.error('Weighbridge analysis error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to analyze weighbridge data',
      error: error.message 
    });
  }
});

module.exports = router;
