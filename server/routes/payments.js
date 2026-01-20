const express = require('express');
const { body, validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Vehicle = require('../models/Vehicle');
const QRCode = require('qrcode');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const emailService = require('../utils/emailService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const router = express.Router();

// @route   POST /api/payments/create-order
// @desc    Create Razorpay payment order
// @access  Private
router.post('/create-order', auth, [
  body('amount').isNumeric(),
  body('currency').optional().isIn(['INR']),
  body('type').isIn(['weigh_bridge', 'storage', 'loading', 'unloading', 'penalty'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency = 'INR', type, vehicle, storageAllocation, description } = req.body;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user.id,
        type,
        vehicleId: vehicle || '',
        storageAllocationId: storageAllocation || '',
        description: description || ''
      }
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Razorpay error:', error);
    res.status(500).json({ message: 'Payment order creation failed', error: error.message });
  }
});

// @route   POST /api/payments/create
// @desc    Create payment transaction
// @access  Private
router.post('/create', auth, [
  body('type').isIn(['weigh_bridge', 'storage', 'loading', 'unloading', 'penalty']),
  body('amount.baseAmount').isNumeric(),
  body('payment.method').isIn(['cash', 'upi', 'card', 'bank_transfer', 'cheque'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type,
      customer,
      vehicle,
      storageAllocation,
      amount,
      payment,
      description
    } = req.body;

    const transaction = new Transaction({
      type,
      customer,
      vehicle,
      storageAllocation,
      amount,
      payment,
      description,
      processedBy: req.user.id
    });

    await transaction.save();

    // Generate invoice number
    transaction.generateInvoiceNumber();
    await transaction.save();

    // Handle different payment methods
    if (payment.method === 'upi') {
      // Generate UPI QR code for local payments
      const upiString = `upi://pay?pa=${process.env.UPI_ID || 'merchant@paytm'}&pn=Warehouse&am=${amount.totalAmount}&cu=INR&tn=Payment for ${transaction.transactionId}`;
      
      try {
        const qrCode = await QRCode.toDataURL(upiString);
        transaction.payment.upiDetails = {
          qrCode,
          vpa: process.env.UPI_ID || 'merchant@paytm',
          transactionRef: transaction.transactionId
        };
        await transaction.save();
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
      }
    } else if (payment.method === 'card') {
      // Card payments are no longer supported - only Razorpay and UPI
      return res.status(400).json({ 
        message: 'Card payments are not supported. Please use UPI or Razorpay.' 
      });
    }

    // Emit real-time update
    req.io.emit('payment_created', {
      transaction,
      message: `Payment created: ${transaction.transactionId}`
    });

    res.status(201).json({
      message: 'Payment transaction created successfully',
      transaction
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/:id/process
// @desc    Process payment
// @access  Private (Owner/Worker)
router.post('/:id/process', [auth, authorize('owner', 'worker')], async (req, res) => {
  try {
    const { gatewayTransactionId, gatewayResponse } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.payment.status === 'completed') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    // Update payment status
    transaction.payment.status = 'completed';
    transaction.payment.paidAt = new Date();
    transaction.payment.gatewayTransactionId = gatewayTransactionId;
    transaction.payment.gatewayResponse = gatewayResponse;

    await transaction.save();

    // Update related entities
    if (transaction.vehicle) {
      const vehicle = await Vehicle.findById(transaction.vehicle);
      if (vehicle) {
        vehicle.paymentStatus = 'paid';
        await vehicle.save();
      }
    }

    // Emit real-time update
    req.io.emit('payment_received', {
      transaction,
      message: `Payment received for ${transaction.transactionId}`
    });

    res.json({
      message: 'Payment processed successfully',
      transaction
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments
// @desc    Get payments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, startDate, endDate } = req.query;
    
    let query = {};

    // Filter by user role
    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }

    if (status) {
      query['payment.status'] = status;
    }

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Transaction.find(query)
      .populate('customer', 'username email profile')
      .populate('vehicle', 'vehicleNumber driverName')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'username email profile')
      .populate('vehicle', 'vehicleNumber driverName vehicleType')
      .populate('storageAllocation')
      .populate('processedBy', 'username profile');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check access permissions
    if (req.user.role === 'customer' && transaction.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(transaction);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/:id/refund
// @desc    Process refund
// @access  Private (Owner only)
router.post('/:id/refund', [auth, authorize('owner')], [
  body('amount').isNumeric(),
  body('reason').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.payment.status !== 'completed') {
      return res.status(400).json({ message: 'Can only refund completed payments' });
    }

    const totalRefunded = transaction.refunds.reduce((sum, refund) => sum + refund.amount, 0);
    
    if (totalRefunded + amount > transaction.amount.totalAmount) {
      return res.status(400).json({ message: 'Refund amount exceeds paid amount' });
    }

    transaction.addRefund(amount, reason, req.user.id);
    await transaction.save();

    res.json({
      message: 'Refund processed successfully',
      transaction
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/stats/dashboard
// @desc    Get payment statistics
// @access  Private (Owner only)
router.get('/stats/dashboard', [auth, authorize('owner')], async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const stats = await Transaction.aggregate([
      {
        $facet: {
          todayStats: [
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$amount.totalAmount" },
                totalTransactions: { $sum: 1 },
                completedPayments: {
                  $sum: { $cond: [{ $eq: ["$payment.status", "completed"] }, 1, 0] }
                }
              }
            }
          ],
          monthlyStats: [
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$amount.totalAmount" },
                totalTransactions: { $sum: 1 }
              }
            }
          ],
          paymentMethods: [
            {
              $group: {
                _id: "$payment.method",
                count: { $sum: 1 },
                amount: { $sum: "$amount.totalAmount" }
              }
            }
          ],
          pendingPayments: [
            { $match: { "payment.status": "pending" } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: "$amount.totalAmount" }
              }
            }
          ]
        }
      }
    ]);

    const result = {
      todayRevenue: stats[0].todayStats[0]?.totalAmount || 0,
      todayTransactions: stats[0].todayStats[0]?.totalTransactions || 0,
      todayCompletedPayments: stats[0].todayStats[0]?.completedPayments || 0,
      monthlyRevenue: stats[0].monthlyStats[0]?.totalAmount || 0,
      monthlyTransactions: stats[0].monthlyStats[0]?.totalTransactions || 0,
      paymentMethodBreakdown: stats[0].paymentMethods,
      pendingPayments: {
        count: stats[0].pendingPayments[0]?.count || 0,
        amount: stats[0].pendingPayments[0]?.amount || 0
      }
    };

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/verify-payment
// @desc    Verify Razorpay payment
// @access  Private
router.post('/verify-payment', auth, [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is valid
      console.log('Payment verified successfully:', razorpay_payment_id);
      
      // Update transaction status
      const transaction = await Transaction.findOne({ 
        'payment.gatewayTransactionId': razorpay_order_id 
      }).populate('customer', 'name email phone');
      
      if (transaction) {
        transaction.payment.status = 'completed';
        transaction.payment.paidAt = new Date();
        transaction.payment.razorpayPaymentId = razorpay_payment_id;
        transaction.payment.razorpaySignature = razorpay_signature;
        await transaction.save();

        // Send email receipt if customer email is available
        if (transaction.customer && transaction.customer.email) {
          try {
            const paymentData = {
              receiptNumber: transaction.receiptNumber,
              date: transaction.payment.paidAt,
              vehicleNumber: transaction.vehicle?.vehicleNumber || 'N/A',
              customerName: transaction.customer.name,
              paymentMethod: 'Razorpay (Online)',
              paymentId: razorpay_payment_id,
              amount: transaction.payment.amount
            };

            await emailService.sendPaymentReceipt(transaction.customer.email, paymentData);
            console.log('Receipt email sent successfully to:', transaction.customer.email);
          } catch (emailError) {
            console.error('Failed to send receipt email:', emailError);
            // Don't fail the payment verification if email fails
          }
        }
      }

      res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id
      });
    } else {
      console.log('Payment verification failed');
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed',
      error: error.message 
    });
  }
});

// @route   POST /api/payments/razorpay-webhook
// @desc    Handle Razorpay webhooks (Development Mode - No Signature Verification)
// @access  Public (Razorpay only)
router.post('/razorpay-webhook', require('express').json(), (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // ⚠️ DEVELOPMENT MODE: Optional signature verification
  if (secret && signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('⚠️ Webhook signature verification failed - continuing anyway (dev mode)');
        // Don't return error in development - just log warning
      } else {
        console.log('✅ Webhook signature verified successfully');
      }
    } catch (error) {
      console.warn('⚠️ Webhook signature verification error:', error.message);
    }
  } else {
    console.log('ℹ️ Webhook running without signature verification (development mode)');
  }

  const event = req.body.event;
  const payload = req.body.payload;

  // Handle the event
  switch (event) {
    case 'payment.captured':
      const payment = payload.payment.entity;
      console.log('Payment captured:', payment.id);
      
      // Update transaction status
      Transaction.findOne({ 
        'payment.gatewayTransactionId': payment.order_id 
      })
        .then(transaction => {
          if (transaction) {
            transaction.payment.status = 'completed';
            transaction.payment.paidAt = new Date();
            transaction.payment.razorpayPaymentId = payment.id;
            transaction.save();
          }
        })
        .catch(err => console.error('Error updating transaction:', err));
      
      break;
    
    case 'payment.failed':
      const failedPayment = payload.payment.entity;
      console.log('Payment failed:', failedPayment.id);
      
      // Update transaction status
      Transaction.findOne({ 
        'payment.gatewayTransactionId': failedPayment.order_id 
      })
        .then(transaction => {
          if (transaction) {
            transaction.payment.status = 'failed';
            transaction.save();
          }
        })
        .catch(err => console.error('Error updating transaction:', err));
      
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// @route   POST /api/payments/storage-rent
// @desc    Create storage rent payment transaction
// @access  Private
router.post('/storage-rent', auth, [
  body('allocationId').notEmpty().withMessage('Allocation ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('method').isIn(['cash', 'upi', 'bank_transfer', 'razorpay']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { allocationId, amount, method, reference, notes } = req.body;

    // Create transaction record for storage rent
    const transaction = new Transaction({
      transactionId: `RENT-${allocationId}-${Date.now()}`,
      type: 'grain_storage_rent',
      customer: req.user.id,
      amount: {
        baseAmount: parseFloat(amount),
        totalAmount: parseFloat(amount)
      },
      payment: {
        method,
        status: 'completed',
        reference: reference || '',
        date: new Date()
      },
      metadata: {
        allocationId,
        notes: notes || `Storage rent payment - ₹${parseFloat(amount)}`
      }
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Storage rent payment recorded successfully',
      transaction
    });

  } catch (error) {
    console.error('Error recording storage rent payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;