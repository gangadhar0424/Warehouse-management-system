const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── data.gov.in Agmarknet API config ────────────────────────────────────────
// Resource: "Current Daily Price of Various Commodities at Various Markets (Mandi)"
// Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
// Get your free API key at: https://data.gov.in → Login → My Account → API Keys
// Add to server/.env:  DATAGOV_API_KEY=your_key_here
const DATAGOV_API_KEY = process.env.DATAGOV_API_KEY || null;
const DATAGOV_RESOURCE_ID = 'current-daily-price-various-commodities-various-markets-mandi';
const DATAGOV_STATE = process.env.DATAGOV_STATE || 'Telangana'; // change to your state

// Maps data.gov.in commodity names → our grain names
const COMMODITY_MAP = {
  'Wheat':              'Wheat',
  'Rice':               'Rice',
  'Paddy(Desi)(Orissa)':'Rice',
  'Paddy':              'Rice',
  'Maize':              'Corn',
  'Jowar(Sorghum)':     'Sorghum',
  'Jowar':              'Sorghum',
  'Bajra(Pearl Millet)':'Millet',
  'Bajra':              'Millet',
  'Barley':             'Barley',
};

// Fallback seed prices (used when API key is absent or API is down)
const FALLBACK_PRICES = {
  'Wheat':   2500, 'Rice': 3200, 'Corn': 1800,
  'Barley':  2200, 'Sorghum': 2000, 'Millet': 1900
};

let marketPricesCache = {};   // { GrainName: { price, change, trend, market, source, lastUpdated } }
let previousPricesCache = {}; // { GrainName: previousModalPrice }
let lastFetchTime = null;
let dataSource = 'simulated'; // 'agmarknet' | 'simulated'
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes (API data changes once/day)

// ─── Fetch real prices from data.gov.in Agmarknet ────────────────────────────
const fetchAgmarknetPrices = async () => {
  if (!DATAGOV_API_KEY) {
    throw new Error('DATAGOV_API_KEY not set in .env');
  }

  const url = `https://api.data.gov.in/resource/${DATAGOV_RESOURCE_ID}`;
  const response = await axios.get(url, {
    params: {
      'api-key': DATAGOV_API_KEY,
      format:    'json',
      limit:     200,
      'filters[State]': DATAGOV_STATE,
    },
    timeout: 10000,
  });

  const records = response.data?.records || [];
  if (!records.length) throw new Error('No records returned from Agmarknet API');

  // Aggregate: for each grain, collect modal prices from all markets, take average
  const priceAccum = {}; // { GrainName: { total, count, markets: [] } }

  records.forEach(rec => {
    const rawCommodity = rec.commodity || rec.Commodity || '';
    const grainName = COMMODITY_MAP[rawCommodity];
    if (!grainName) return; // skip unmapped commodities

    const modal = parseFloat(rec.modal_price || rec['Modal Price'] || 0);
    if (!modal || isNaN(modal)) return;

    if (!priceAccum[grainName]) {
      priceAccum[grainName] = { total: 0, count: 0, markets: [] };
    }
    priceAccum[grainName].total  += modal;
    priceAccum[grainName].count  += 1;
    priceAccum[grainName].markets.push(rec.market || rec.Market || '');
  });

  // Build new cache from aggregated data
  const newPrices = {};
  Object.keys(FALLBACK_PRICES).forEach(grain => {
    const accum = priceAccum[grain];

    // Save previous price before updating
    const prevPrice = marketPricesCache[grain]?.price || FALLBACK_PRICES[grain];
    previousPricesCache[grain] = prevPrice;

    if (accum && accum.count > 0) {
      const avgPrice = Math.round(accum.total / accum.count);
      const change   = avgPrice - prevPrice;
      newPrices[grain] = {
        price:       avgPrice,
        change:      change,
        trend:       change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        market:      `${DATAGOV_STATE} Mandis (${accum.count} markets)`,
        source:      'agmarknet',
        lastUpdated: new Date(),
      };
    } else {
      // Grain not found in today's Agmarknet data — keep last known or fallback
      newPrices[grain] = marketPricesCache[grain]
        ? { ...marketPricesCache[grain], source: 'cached' }
        : { price: FALLBACK_PRICES[grain], change: 0, trend: 'stable',
            market: 'Fallback', source: 'fallback', lastUpdated: new Date() };
    }
  });

  return newPrices;
};

// ─── Simulate fluctuation (fallback when no API key) ─────────────────────────
const simulatePriceUpdate = () => {
  const base = Object.keys(marketPricesCache).length
    ? null  // already have prices, fluctuate from them
    : FALLBACK_PRICES;

  Object.keys(FALLBACK_PRICES).forEach(grain => {
    const currentPrice = marketPricesCache[grain]?.price || FALLBACK_PRICES[grain];
    previousPricesCache[grain] = currentPrice;
    const fluctuation = currentPrice * (Math.random() * 0.04 - 0.02);
    const newPrice = Math.round(currentPrice + fluctuation);
    const change   = newPrice - currentPrice;
    marketPricesCache[grain] = {
      price:       newPrice,
      change:      change,
      trend:       change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      market:      'Simulated (set DATAGOV_API_KEY for real prices)',
      source:      'simulated',
      lastUpdated: new Date(),
    };
  });
};

// ─── Master refresh function ─────────────────────────────────────────────────
const refreshPrices = async () => {
  try {
    if (DATAGOV_API_KEY) {
      const realPrices = await fetchAgmarknetPrices();
      marketPricesCache = realPrices;
      dataSource = 'agmarknet';
      lastFetchTime = new Date();
      console.log(`[Market] Prices updated from Agmarknet (${DATAGOV_STATE}) — ${Object.keys(realPrices).length} grains`);
    } else {
      simulatePriceUpdate();
      dataSource = 'simulated';
      lastFetchTime = new Date();
      console.log('[Market] Prices updated (simulated) — set DATAGOV_API_KEY in .env for real prices');
    }
  } catch (err) {
    console.error('[Market] Failed to fetch real prices, falling back to simulated:', err.message);
    simulatePriceUpdate();
    dataSource = 'simulated_fallback';
    lastFetchTime = new Date();
  }
};

// Initial fetch + scheduled refresh
refreshPrices();
setInterval(refreshPrices, REFRESH_INTERVAL);

// Helper to get current market prices
const getMarketPrices = () => marketPricesCache;
const getPreviousPrices = () => previousPricesCache;

// @route   GET /api/market/live-prices
// @desc    Get live market prices (real Agmarknet data or simulated fallback)
// @access  Private
router.get('/live-prices', auth, (req, res) => {
  try {
    const marketPrices = getMarketPrices();
    const previousPrices = getPreviousPrices();
    const prices = Object.keys(marketPrices).map(grainType => ({
      grainType,
      currentPrice:  marketPrices[grainType].price,
      previousPrice: previousPrices[grainType] || marketPrices[grainType].price,
      change:        marketPrices[grainType].change,
      trend:         marketPrices[grainType].trend,
      market:        marketPrices[grainType].market,
      source:        marketPrices[grainType].source,
      lastUpdated:   marketPrices[grainType].lastUpdated,
    }));

    res.json({ 
      success: true,
      prices,
      dataSource,          // 'agmarknet' | 'simulated' | 'simulated_fallback'
      isRealData: dataSource === 'agmarknet',
      lastUpdated:     lastFetchTime || new Date(),
      refreshInterval: REFRESH_INTERVAL / 1000,
      apiConfigured:   !!DATAGOV_API_KEY,
    });
  } catch (error) {
    console.error('Error fetching live market prices:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/market/prices
// @desc    Get current market prices for all grains
// @access  Public
router.get('/prices', (req, res) => {
  try {
    res.json({ prices: getMarketPrices(), lastUpdated: lastFetchTime || new Date() });
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
    const marketPrices = getMarketPrices();
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
    const marketPrices = getMarketPrices();
    
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
