import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  Alert,
  Divider,
  Chip,
  Stack,
  InputAdornment,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Payment,
  AccountBalance,
  CreditCard,
  LocalAtm,
  QrCode2,
  Receipt,
  CheckCircle
} from '@mui/icons-material';
import axios from 'axios';
import RazorpayPayment from './RazorpayPayment';

const CustomerPaymentOptions = () => {
  const [paymentType, setPaymentType] = useState('weighbridge');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedLoan, setSelectedLoan] = useState('');
  const [selectedAllocation, setSelectedAllocation] = useState('');
  const [description, setDescription] = useState('');
  const [loans, setLoans] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    fetchPaymentOptions();
  }, []);

  useEffect(() => {
    // Auto-set amounts based on payment type
    if (paymentType === 'weighbridge') {
      setAmount('100');
      setDescription('Weighbridge fee payment');
    } else if (paymentType === 'loan' && selectedLoan) {
      // Amount will be set when loan is selected
      const loan = loans.find(l => l._id === selectedLoan);
      if (loan) {
        setAmount(loan.remainingAmount?.toString() || '');
        setDescription(`Loan repayment for Loan ID: ${loan._id.slice(-8)}`);
      }
    } else if (paymentType === 'rent' && selectedAllocation) {
      const allocation = allocations.find(a => a._id === selectedAllocation);
      if (allocation) {
        setAmount(allocation.rentDetails?.dueRent?.toString() || '');
        setDescription(`Rent payment for storage allocation`);
      }
    } else {
      setAmount('');
      setDescription('');
    }
  }, [paymentType, selectedLoan, selectedAllocation, loans, allocations]);

  const fetchPaymentOptions = async () => {
    try {
      const [loansRes, allocationsRes] = await Promise.all([
        axios.get('/api/loans/my-loans'),
        axios.get('/api/warehouse/allocations/my-locations')
      ]);

      // Filter active loans with remaining amount
      const activeLoans = (loansRes.data.loans || []).filter(
        loan => loan.status === 'active' && loan.remainingAmount > 0
      );
      setLoans(activeLoans);

      // Filter allocations with due rent
      const allocationsWithDue = (allocationsRes.data.allocations || []).filter(
        allocation => allocation.rentDetails?.dueRent > 0
      );
      setAllocations(allocationsWithDue);
    } catch (err) {
      console.error('Error fetching payment options:', err);
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const finalAmount = paymentType === 'custom' ? parseFloat(customAmount) : parseFloat(amount);

      if (!finalAmount || finalAmount <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }

      if (paymentType === 'loan' && !selectedLoan) {
        setError('Please select a loan');
        setLoading(false);
        return;
      }

      if (paymentType === 'rent' && !selectedAllocation) {
        setError('Please select a storage allocation');
        setLoading(false);
        return;
      }

      // Prepare payment data
      const paymentPayload = {
        type: paymentType,
        amount: finalAmount,
        method: paymentMethod,
        description: description || `Payment for ${paymentType}`,
        loanId: selectedLoan || undefined,
        allocationId: selectedAllocation || undefined
      };

      // If Razorpay is selected, initiate Razorpay payment
      if (paymentMethod === 'razorpay') {
        setPaymentData(paymentPayload);
        setShowRazorpay(true);
        setLoading(false);
        return;
      }

      // For cash/UPI, process payment directly
      const response = await axios.post('/api/payments/customer-payment', paymentPayload);

      if (response.data.success) {
        setSuccess(response.data.message || 'Payment recorded successfully');
        
        // Reset form
        setPaymentType('weighbridge');
        setAmount('100');
        setCustomAmount('');
        setSelectedLoan('');
        setSelectedAllocation('');
        setDescription('');
        
        // Refresh payment options
        fetchPaymentOptions();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpaySuccess = async (razorpayData) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/payments/customer-payment', {
        ...paymentData,
        razorpayPaymentId: razorpayData.razorpay_payment_id,
        razorpayOrderId: razorpayData.razorpay_order_id,
        razorpaySignature: razorpayData.razorpay_signature
      });

      if (response.data.success) {
        setSuccess('Payment successful!');
        setShowRazorpay(false);
        setPaymentData(null);
        
        // Reset form
        setPaymentType('weighbridge');
        setAmount('100');
        setCustomAmount('');
        setSelectedLoan('');
        setSelectedAllocation('');
        setDescription('');
        
        fetchPaymentOptions();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayClose = () => {
    setShowRazorpay(false);
    setPaymentData(null);
    setLoading(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Payment sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight="bold">
          Payment Options
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Payment Type Selection */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Payment Type
              </Typography>
              <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                <RadioGroup
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <Paper sx={{ p: 2, mb: 2, border: paymentType === 'weighbridge' ? 2 : 1, borderColor: paymentType === 'weighbridge' ? 'primary.main' : 'divider' }}>
                    <FormControlLabel
                      value="weighbridge"
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <LocalAtm color="primary" />
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              Weighbridge Fee
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Fixed charge: ₹100
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </Paper>

                  <Paper sx={{ p: 2, mb: 2, border: paymentType === 'rent' ? 2 : 1, borderColor: paymentType === 'rent' ? 'primary.main' : 'divider' }}>
                    <FormControlLabel
                      value="rent"
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <AccountBalance color="warning" />
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              Storage Rent Payment
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Pay pending rent for your storage
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    {paymentType === 'rent' && (
                      <Box sx={{ mt: 2, ml: 4 }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedAllocation}
                            onChange={(e) => setSelectedAllocation(e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="" disabled>
                              Select storage allocation
                            </MenuItem>
                            {allocations.map((allocation) => (
                              <MenuItem key={allocation._id} value={allocation._id}>
                                Building {allocation.allocation?.building} - Block {allocation.allocation?.block} 
                                (Due: ₹{allocation.rentDetails?.dueRent})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </Paper>

                  <Paper sx={{ p: 2, mb: 2, border: paymentType === 'loan' ? 2 : 1, borderColor: paymentType === 'loan' ? 'primary.main' : 'divider' }}>
                    <FormControlLabel
                      value="loan"
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <CreditCard color="error" />
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              Loan Repayment
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Repay your active loan
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    {paymentType === 'loan' && (
                      <Box sx={{ mt: 2, ml: 4 }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedLoan}
                            onChange={(e) => setSelectedLoan(e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="" disabled>
                              Select loan to repay
                            </MenuItem>
                            {loans.map((loan) => (
                              <MenuItem key={loan._id} value={loan._id}>
                                Loan #{loan._id.slice(-8)} - Remaining: ₹{loan.remainingAmount}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </Paper>

                  <Paper sx={{ p: 2, border: paymentType === 'custom' ? 2 : 1, borderColor: paymentType === 'custom' ? 'primary.main' : 'divider' }}>
                    <FormControlLabel
                      value="custom"
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Receipt color="info" />
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              Custom Payment
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Enter custom amount
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    {paymentType === 'custom' && (
                      <Box sx={{ mt: 2, ml: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Enter Amount"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>
                          }}
                        />
                      </Box>
                    )}
                  </Paper>
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Method & Summary */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Payment Method */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Method
                </Typography>
                <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <Paper sx={{ p: 2, mb: 2, border: paymentMethod === 'cash' ? 2 : 1, borderColor: paymentMethod === 'cash' ? 'primary.main' : 'divider' }}>
                      <FormControlLabel
                        value="cash"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocalAtm />
                            <Typography>Cash</Typography>
                          </Box>
                        }
                      />
                    </Paper>
                    <Paper sx={{ p: 2, mb: 2, border: paymentMethod === 'upi' ? 2 : 1, borderColor: paymentMethod === 'upi' ? 'primary.main' : 'divider' }}>
                      <FormControlLabel
                        value="upi"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <QrCode2 />
                            <Typography>UPI</Typography>
                          </Box>
                        }
                      />
                    </Paper>
                    <Paper sx={{ p: 2, border: paymentMethod === 'razorpay' ? 2 : 1, borderColor: paymentMethod === 'razorpay' ? 'primary.main' : 'divider' }}>
                      <FormControlLabel
                        value="razorpay"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <CreditCard />
                            <Typography>Razorpay (Card/Net Banking)</Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary.main">
                  Payment Summary
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Payment Type:
                    </Typography>
                    <Chip label={paymentType} size="small" sx={{ textTransform: 'capitalize' }} />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Payment Method:
                    </Typography>
                    <Chip label={paymentMethod} size="small" color="primary" sx={{ textTransform: 'uppercase' }} />
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Total Amount:
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      ₹{paymentType === 'custom' ? (customAmount || '0') : (amount || '0')}
                    </Typography>
                  </Box>
                  
                  {description && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {description}
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handlePaymentSubmit}
                    disabled={loading || !amount && !customAmount}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                  >
                    {loading ? 'Processing...' : 'Proceed to Pay'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Razorpay Dialog */}
      {showRazorpay && paymentData && (
        <RazorpayPayment
          open={showRazorpay}
          amount={paymentData.amount}
          onSuccess={handleRazorpaySuccess}
          onClose={handleRazorpayClose}
          description={paymentData.description}
        />
      )}
    </Box>
  );
};

export default CustomerPaymentOptions;
