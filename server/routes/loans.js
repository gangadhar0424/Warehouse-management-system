const express = require('express');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Loan = require('../models/Loan');
const StorageAllocation = require('../models/StorageAllocation');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/loans/eligibility
// @desc    Calculate loan eligibility based on stored grain value
// @access  Private (Customer)
router.get('/eligibility', auth, async (req, res) => {
  try {
    const customerId = req.user.id;

    // Get all active grain storage allocations
    const allocations = await StorageAllocation.find({
      customer: customerId,
      status: 'active'
    });

    // Calculate total grain value
    const totalGrainValue = allocations.reduce((sum, allocation) => {
      return sum + (allocation.storageDetails.totalValue || 0);
    }, 0);

    // Maximum loan = 70% of grain value
    const maxLoanAmount = totalGrainValue * 0.70;

    // Get existing active loans
    const activeLoans = await Loan.find({
      customer: customerId,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    const totalActiveLoanAmount = activeLoans.reduce((sum, loan) => {
      return sum + loan.amount;
    }, 0);

    const availableLoanAmount = Math.max(0, maxLoanAmount - totalActiveLoanAmount);

    // Grain details
    const grainDetails = allocations.map(a => ({
      allocationId: a._id,
      grainType: a.storageDetails.items.map(i => i.description).join(', '),
      weight: a.storageDetails.totalWeight,
      value: a.storageDetails.totalValue,
      location: `B${a.allocation.building}-BL${a.allocation.block}-${a.allocation.wing}-B${a.allocation.box}`
    }));

    res.json({
      totalGrainValue,
      maxLoanAmount,
      totalActiveLoanAmount,
      availableLoanAmount,
      grainDetails,
      loanToValueRatio: 0.70,
      eligibilityStatus: availableLoanAmount > 0 ? 'eligible' : 'not_eligible',
      message: availableLoanAmount > 0 
        ? `You can request a loan up to ₹${availableLoanAmount.toFixed(2)}`
        : 'You have reached your maximum loan limit based on stored grain value'
    });

  } catch (error) {
    console.error('Error calculating loan eligibility:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/loans/request
// @desc    Request a new loan
// @access  Private (Customer)
router.post('/request', auth, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('duration').isInt({ min: 1, max: 120 }).withMessage('Duration must be between 1-120 months'),
  body('purpose').trim().notEmpty().withMessage('Purpose is required'),
  body('interestRate').isNumeric().withMessage('Interest rate must be a number'),
  body('collateral').trim().notEmpty().withMessage('Collateral information is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, duration, purpose, interestRate, collateral } = req.body;
    const customerId = req.user.id;

    // Check eligibility
    const allocations = await StorageAllocation.find({
      customer: customerId,
      status: 'active'
    });

    const totalGrainValue = allocations.reduce((sum, a) => sum + (a.storageDetails.totalValue || 0), 0);
    const maxLoanAmount = totalGrainValue * 0.70;

    if (parseFloat(amount) > maxLoanAmount) {
      return res.status(400).json({
        message: `Loan amount exceeds 70% of grain collateral value. Maximum allowed: ₹${maxLoanAmount.toFixed(2)}`
      });
    }

    // Create loan
    const loan = new Loan({
      customer: customerId,
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      duration: parseInt(duration),
      purpose,
      collateral,
      status: 'pending',
      createdBy: customerId
    });

    await loan.save();

    // Emit real-time notification
    if (req.io) {
      req.io.emit('loan_request', {
        customerId,
        loanId: loan._id,
        amount: loan.amount,
        status: 'pending'
      });
    }

    res.status(201).json({
      message: 'Loan request submitted successfully',
      loan
    });

  } catch (error) {
    console.error('Error creating loan request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/loans/my-loans
// @desc    Get customer's loans with payment history
// @access  Private (Customer)
router.get('/my-loans', auth, async (req, res) => {
  try {
    const loans = await Loan.find({ customer: req.user.id })
      .sort({ createdAt: -1 })
      .populate('approvedBy', 'profile.firstName profile.lastName');

    const loansWithDetails = loans.map(loan => ({
      ...loan.toObject(),
      remainingBalance: loan.getRemainingBalance(),
      isOverdue: loan.isOverdue(),
      nextPaymentDate: loan.getNextPaymentDate(),
      daysOverdue: loan.getDaysOverdue(),
      paymentHistory: loan.payments.slice(-5) // Last 5 payments
    }));

    res.json({ loans: loansWithDetails });

  } catch (error) {
    console.error('Error fetching customer loans:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/loans/:id/approve
// @desc    Approve a loan (Owner only)
// @access  Private (Owner)
router.put('/:id/approve', auth, authorize('owner'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending loans can be approved' });
    }

    loan.status = 'approved';
    loan.approvedBy = req.user.id;
    loan.approvedDate = new Date();
    loan.disbursementDate = new Date();
    loan.dueDate = new Date();
    loan.dueDate.setMonth(loan.dueDate.getMonth() + loan.duration);

    await loan.save();

    // Emit real-time notification
    if (req.io) {
      req.io.to(`customer_${loan.customer}`).emit('loan_approved', {
        loanId: loan._id,
        amount: loan.amount,
        monthlyPayment: loan.monthlyPayment
      });
    }

    res.json({
      message: 'Loan approved successfully',
      loan
    });

  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/loans/:id/payment
// @desc    Make a loan payment
// @access  Private (Customer)
router.post('/:id/payment', auth, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('method').isIn(['cash', 'upi', 'bank_transfer', 'card']).withMessage('Invalid payment method'),
  body('reference').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, method, reference, notes } = req.body;
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (loan.status !== 'active' && loan.status !== 'approved') {
      return res.status(400).json({ message: 'Loan is not active' });
    }

    // Add payment
    loan.payments.push({
      date: new Date(),
      amount: parseFloat(amount),
      type: 'principal', // Could be calculated based on interest/principal split
      method,
      reference: reference || '',
      notes: notes || ''
    });

    loan.paidAmount += parseFloat(amount);
    loan.remainingAmount = loan.totalAmount - loan.paidAmount;

    // Update status if fully paid
    if (loan.remainingAmount <= 0) {
      loan.status = 'completed';
    } else if (loan.status === 'approved') {
      loan.status = 'active';
    }

    await loan.save();

    // Emit real-time notification
    if (req.io) {
      req.io.emit('payment_received', {
        type: 'loan',
        loanId: loan._id,
        amount: parseFloat(amount),
        customerId: loan.customer
      });
    }

    res.json({
      message: 'Payment recorded successfully',
      loan: {
        ...loan.toObject(),
        remainingBalance: loan.getRemainingBalance()
      }
    });

  } catch (error) {
    console.error('Error recording loan payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/loans/pending-approvals
// @desc    Get all pending loan approvals (Owner only)
// @access  Private (Owner)
router.get('/pending-approvals', auth, authorize('owner'), async (req, res) => {
  try {
    const pendingLoans = await Loan.find({ status: 'pending' })
      .populate('customer', 'profile email')
      .sort({ createdAt: -1 });

    // Get grain value for each customer
    const loansWithGrainValue = await Promise.all(
      pendingLoans.map(async (loan) => {
        const allocations = await StorageAllocation.find({
          customer: loan.customer._id,
          status: 'active'
        });

        const totalGrainValue = allocations.reduce((sum, a) => sum + (a.storageDetails.totalValue || 0), 0);
        const maxLoanAmount = totalGrainValue * 0.70;

        return {
          ...loan.toObject(),
          grainValue: totalGrainValue,
          maxLoanAmount,
          loanToValueRatio: totalGrainValue > 0 ? (loan.amount / totalGrainValue) : 0
        };
      })
    );

    res.json({ loans: loansWithGrainValue });

  } catch (error) {
    console.error('Error fetching pending loans:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
