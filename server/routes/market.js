const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Mock market data - In production, this would come from external API or database
const marketPrices = {
  'Wheat': { price: 2500, change: +50, trend: 'up', lastUpdated: new Date() },
  'Rice': { price: 3200, change: -30, trend: 'down', lastUpdated: new Date() },
  'Corn': { price: 1800, change: 0, trend: 'stable', lastUpdated: new Date() },
  'Barley': { price: 2200, change: +20, trend: 'up', lastUpdated: new Date() },
  'Sorghum': { price: 2000, change: -10, trend: 'down', lastUpdated: new Date() },
  'Millet': { price: 1900, change: +15, trend: 'up', lastUpdated: new Date() }
};

// @route   GET /api/market/prices
// @desc    Get current market prices for all grains
// @access  Public
router.get('/prices', (req, res) => {
  try {
    res.json({ prices: marketPrices, lastUpdated: new Date() });
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/market/prices/:grainType
// @desc    Get market price for specific grain
// @access  Public
router.get('/prices/:grainType', (req, res) => {
  try {
    const { grainType } = req.params;
    const price = marketPrices[grainType];

    if (!price) {
      return res.status(404).json({ message: 'Grain type not found' });
    }

    res.json({ grainType, ...price });
  } catch (error) {
    console.error('Error fetching grain price:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/market/my-grain-value
// @desc    Calculate customer's grain value at current market prices
// @access  Private (Customer)
router.get('/my-grain-value', auth, async (req, res) => {
  try {
    const StorageAllocation = require('../models/StorageAllocation');
    
    const allocations = await StorageAllocation.find({
      customer: req.user.id,
      status: 'active'
    });

    const grainValueBreakdown = {};
    let totalCurrentValue = 0;
    let totalPurchaseValue = 0;

    allocations.forEach(allocation => {
      allocation.storageDetails.items.forEach(item => {
        const grainType = item.description;
        const marketPrice = marketPrices[grainType];

        if (marketPrice) {
          const currentValue = (item.weight || 0) * (marketPrice.price / 100); // price per kg
          const purchaseValue = item.value || 0;

          if (!grainValueBreakdown[grainType]) {
            grainValueBreakdown[grainType] = {
              quantity: 0,
              weight: 0,
              currentValue: 0,
              purchaseValue: 0,
              profit: 0
            };
          }

          grainValueBreakdown[grainType].quantity += item.quantity || 0;
          grainValueBreakdown[grainType].weight += item.weight || 0;
          grainValueBreakdown[grainType].currentValue += currentValue;
          grainValueBreakdown[grainType].purchaseValue += purchaseValue;
          grainValueBreakdown[grainType].profit += currentValue - purchaseValue;

          totalCurrentValue += currentValue;
          totalPurchaseValue += purchaseValue;
        }
      });
    });

    const totalProfit = totalCurrentValue - totalPurchaseValue;
    const profitPercentage = totalPurchaseValue > 0 ? ((totalProfit / totalPurchaseValue) * 100).toFixed(2) : 0;

    res.json({
      grainValueBreakdown,
      totalCurrentValue,
      totalPurchaseValue,
      totalProfit,
      profitPercentage: parseFloat(profitPercentage)
    });

  } catch (error) {
    console.error('Error calculating grain value:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/market/price-alert
// @desc    Set price alert for specific grain
// @access  Private (Customer)
router.post('/price-alert', auth, async (req, res) => {
  try {
    const { grainType, alertPrice, alertType } = req.body;

    // In production, this would be stored in database
    // For now, return success
    res.json({
      message: 'Price alert set successfully',
      alert: {
        grainType,
        alertPrice,
        alertType, // 'buy' or 'sell'
        customer: req.user.id,
        active: true
      }
    });

  } catch (error) {
    console.error('Error setting price alert:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/market/recommendations
// @desc    Get smart storage and selling recommendations
// @access  Private (Customer)
router.get('/recommendations', auth, async (req, res) => {
  try {
    const StorageAllocation = require('../models/StorageAllocation');
    const Loan = require('../models/Loan');

    const allocations = await StorageAllocation.find({
      customer: req.user.id,
      status: 'active'
    });

    const recommendations = [];

    // Calculate total boxes used
    const boxesUsed = allocations.length;
    if (boxesUsed > 3) {
      const potentialSavings = (boxesUsed - 2) * 1000; // Estimate
      recommendations.push({
        type: 'Cost Saving',
        suggestion: 'Consolidate grains to reduce boxes',
        potentialSavings,
        effort: 'Low',
        priority: 'Medium'
      });
    }

    // Check for grains nearing expiry
    allocations.forEach(allocation => {
      const remainingDays = allocation.getRemainingDays();
      if (remainingDays !== null && remainingDays <= 14 && remainingDays > 0) {
        recommendations.push({
          type: 'Action Required',
          suggestion: `Grain expiring in ${remainingDays} days - Consider extending storage or removing`,
          grainType: allocation.storageDetails.items.map(i => i.description).join(', '),
          effort: 'Medium',
          priority: 'High'
        });
      }
    });

    // Check loan opportunity
    const totalGrainValue = allocations.reduce((sum, a) => sum + (a.storageDetails.totalValue || 0), 0);
    const maxLoanAmount = totalGrainValue * 0.70;
    
    const activeLoans = await Loan.find({
      customer: req.user.id,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    const currentLoanAmount = activeLoans.reduce((sum, l) => sum + l.amount, 0);
    const availableLoanAmount = maxLoanAmount - currentLoanAmount;

    if (availableLoanAmount > 50000) {
      recommendations.push({
        type: 'Loan Opportunity',
        suggestion: `You can request an additional loan of up to ₹${availableLoanAmount.toFixed(0)}`,
        benefit: `Access to ₹${availableLoanAmount.toFixed(0)} at competitive interest rates`,
        effort: 'Low',
        priority: 'Low'
      });
    }

    // Storage type recommendations
    allocations.forEach(allocation => {
      if (allocation.storageDetails.type === 'dry') {
        const grainTypes = allocation.storageDetails.items.map(i => i.description);
        if (grainTypes.some(g => ['Rice', 'Wheat'].includes(g))) {
          const daysStored = allocation.getDaysStored();
          if (daysStored > 90) {
            recommendations.push({
              type: 'Better Storage',
              suggestion: `Consider cold storage for ${grainTypes.join(', ')} to extend shelf life`,
              benefit: 'Extend shelf life by 3-6 months',
              additionalCost: 500,
              effort: 'Medium',
              priority: 'Low'
            });
          }
        }
      }
    });

    res.json({ recommendations });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
