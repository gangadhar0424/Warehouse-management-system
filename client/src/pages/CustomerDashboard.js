import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Warehouse,
  Schedule,
  Payment,
  LocalShipping,
  Warning,
  CheckCircle,
  AccountBalance,
  Receipt,
  Refresh,
  ExtensionOutlined,
  ContactSupport,
  Lock,
  LocationOn,
  ShowChart,
  NotificationsActive,
  Calculate
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import CustomerContactForm from '../components/CustomerContactForm';
import axios from 'axios';

// Import existing customer dashboard components
import MyGrainsOverview from '../components/MyGrainsOverview';
import LoanManagementCenter from '../components/LoanManagementCenter';
import PaymentTimeline from '../components/PaymentTimeline';
import StorageCostCalculator from '../components/StorageCostCalculator';
import GrainMarketPrices from '../components/GrainMarketPrices';
import DocumentVault from '../components/DocumentVault';
import CustomerNotificationsPanel from '../components/CustomerNotificationsPanel';
import PaymentModule from '../components/PaymentModule';

// Import new enhanced customer components
import CustomerGrainLocationView from '../components/CustomerGrainLocationView';
import CustomerPaymentOptions from '../components/CustomerPaymentOptions';
import CustomerMarketPricesAndPredictions from '../components/CustomerMarketPricesAndPredictions';
import CustomerLoanAlerts from '../components/CustomerLoanAlerts';
import CustomerLoanCalculatorAndRequest from '../components/CustomerLoanCalculatorAndRequest';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [allocations, setAllocations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialogs
  const [extendDialog, setExtendDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [extensionDate, setExtensionDate] = useState('');
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { user } = useAuth();
  const { addNotification } = useSocket();

  useEffect(() => {
    fetchCustomerData();
    
    // Check if user needs to change password
    if (user?.needsPasswordChange) {
      setPasswordDialog(true);
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, allocationsRes, transactionsRes] = await Promise.all([
        axios.get('/api/customers/stats/dashboard'),
        axios.get('/api/warehouse/allocations'),
        axios.get('/api/payments')
      ]);

      setStats(statsRes.data);
      setAllocations(allocationsRes.data.allocations);
      setTransactions(transactionsRes.data.transactions);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendStorage = async () => {
    if (!selectedAllocation || !extensionDate) {
      setError('Please select a date for extension');
      return;
    }

    try {
      await axios.put(`/api/warehouse/allocation/${selectedAllocation._id}/extend`, {
        newEndDate: extensionDate
      });

      setSuccess('Storage period extended successfully!');
      setExtendDialog(false);
      setSelectedAllocation(null);
      setExtensionDate('');
      fetchCustomerData();
      
      addNotification({
        type: 'success',
        title: 'Storage Extended',
        message: `Storage period extended until ${new Date(extensionDate).toLocaleDateString()}`,
        timestamp: new Date()
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to extend storage');
    }
  };

  const handlePayment = (allocation) => {
    setSelectedAllocation(allocation);
    setPaymentDialog(true);
  };

  const handlePaymentSuccess = (paymentIntent) => {
    setSuccess('Payment processed successfully!');
    setPaymentDialog(false);
    fetchCustomerData();
    
    addNotification({
      type: 'success',
      title: 'Payment Successful',
      message: `Payment of ₹${selectedAllocation?.pricing?.finalAmount} completed`,
      timestamp: new Date()
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'terminated': return 'warning';
      default: return 'default';
    }
  };
  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await axios.post('/api/auth/change-password', {
        currentPassword: user?.needsPasswordChange ? undefined : passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setSuccess('Password changed successfully!');
      setPasswordDialog(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Refresh user data
      await fetchCustomerData();
      
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getRemainingDaysColor = (days) => {
    if (days <= 0) return 'error';
    if (days <= 7) return 'warning';
    return 'success';
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Warehouse color="primary" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Active Storage
                </Typography>
                <Typography variant="h4">
                  {stats?.activeStorage || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountBalance color="success" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Spent
                </Typography>
                <Typography variant="h4">
                  ₹{stats?.totalSpent || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalShipping color="info" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Vehicles
                </Typography>
                <Typography variant="h4">
                  {stats?.totalVehicles || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Payment color="warning" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Pending Payments
                </Typography>
                <Typography variant="h4">
                  ₹{stats?.pendingPayments || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const StorageAllocations = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        My Storage Allocations
      </Typography>
      
      <Grid container spacing={3}>
        {allocations.map((allocation) => (
          <Grid item xs={12} md={6} lg={4} key={allocation._id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {allocation.warehouse?.name || 'Warehouse'}
                  </Typography>
                  <Chip 
                    label={allocation.status} 
                    color={getStatusColor(allocation.status)}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Location: Building {allocation.allocation.building}, Block {allocation.allocation.block}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Wing: {allocation.allocation.wing}, Box: {allocation.allocation.box}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Storage Period Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.max(0, Math.min(100, 
                      ((new Date() - new Date(allocation.duration.startDate)) / 
                       (new Date(allocation.duration.endDate) - new Date(allocation.duration.startDate))) * 100
                    ))}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption">
                      Start: {new Date(allocation.duration.startDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption">
                      End: {new Date(allocation.duration.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {allocation.status === 'active' && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<Schedule />}
                      label={`${Math.max(0, Math.ceil((new Date(allocation.duration.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days remaining`}
                      color={getRemainingDaysColor(Math.ceil((new Date(allocation.duration.endDate) - new Date()) / (1000 * 60 * 60 * 24)))}
                      size="small"
                    />
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">
                    Total Cost: ₹{allocation.pricing?.finalAmount || 0}
                  </Typography>
                  <Chip 
                    label={allocation.paymentStatus} 
                    color={getPaymentStatusColor(allocation.paymentStatus)}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {allocation.status === 'active' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ExtensionOutlined />}
                      onClick={() => {
                        setSelectedAllocation(allocation);
                        setExtendDialog(true);
                      }}
                    >
                      Extend
                    </Button>
                  )}
                  
                  {allocation.paymentStatus !== 'paid' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Payment />}
                      onClick={() => handlePayment(allocation)}
                    >
                      Pay Now
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {allocations.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Warehouse sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No storage allocations found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact the warehouse owner to allocate storage space
          </Typography>
        </Box>
      )}
    </Paper>
  );

  const TransactionHistory = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Payment History
      </Typography>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {transaction.transactionId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={transaction.type.replace('_', ' ')} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>₹{transaction.amount.totalAmount}</TableCell>
                <TableCell>
                  {transaction.payment.method.toUpperCase()}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={transaction.payment.status}
                    color={getPaymentStatusColor(transaction.payment.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Receipt />}>
                    Receipt
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {transactions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Receipt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No transactions found
          </Typography>
        </Box>
      )}
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Customer Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Lock />}
            onClick={() => setPasswordDialog(true)}
          >
            Change Password
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ContactSupport />}
            onClick={() => setContactDialog(true)}
          >
            Contact Us
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchCustomerData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <StatsCards />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
          <Tab label="Storage Allocations" />
          <Tab label="Transaction History" />
          <Tab label="Payments" />
          <Tab label="My Grains Overview" />
          <Tab label="Loan Management" />
          <Tab label="Payment Timeline" />
          <Tab label="Storage Cost Calculator" />
          <Tab label="Market Prices" />
          <Tab label="Documents" />
          <Tab label="Notifications" />
          <Tab icon={<LocationOn />} label="Grain Locations" />
          <Tab icon={<Payment />} label="Payment Options" />
          <Tab icon={<ShowChart />} label="Market & Predictions" />
          <Tab icon={<NotificationsActive />} label="Loan Alerts" />
          <Tab icon={<Calculate />} label="Loan Calculator" />
        </Tabs>
      </Box>

      {activeTab === 0 && <StorageAllocations />}
      {activeTab === 1 && <TransactionHistory />}
      {activeTab === 2 && <PaymentModule userRole="customer" />}
      {activeTab === 3 && <MyGrainsOverview />}
      {activeTab === 4 && <LoanManagementCenter />}
      {activeTab === 5 && <PaymentTimeline />}
      {activeTab === 6 && <StorageCostCalculator />}
      {activeTab === 7 && <GrainMarketPrices />}
      {activeTab === 8 && <DocumentVault />}
      {activeTab === 9 && <CustomerNotificationsPanel />}
      {activeTab === 10 && <CustomerGrainLocationView />}
      {activeTab === 11 && <CustomerPaymentOptions />}
      {activeTab === 12 && <CustomerMarketPricesAndPredictions />}
      {activeTab === 13 && <CustomerLoanAlerts />}
      {activeTab === 14 && <CustomerLoanCalculatorAndRequest />}

      {/* Extension Dialog */}
      <Dialog open={extendDialog} onClose={() => setExtendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Extend Storage Period</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Current End Date: {selectedAllocation && new Date(selectedAllocation.duration.endDate).toLocaleDateString()}
            </Typography>
            <TextField
              fullWidth
              type="date"
              label="New End Date"
              value={extensionDate}
              onChange={(e) => setExtensionDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: selectedAllocation && selectedAllocation.duration.endDate.split('T')[0]
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Extension will incur additional charges based on the storage duration and rates.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialog(false)}>Cancel</Button>
          <Button onClick={handleExtendStorage} variant="contained">
            Extend Storage
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment - Storage Charges</DialogTitle>
        <DialogContent>
          {selectedAllocation && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Amount: ₹{selectedAllocation.pricing?.finalAmount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Please use Razorpay for payments. Stripe integration has been removed.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => {
                  setPaymentDialog(false);
                  setError('Please contact the warehouse owner for payment options.');
                }}
              >
                Contact for Payment
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Contact Form */}
      <CustomerContactForm 
        open={contactDialog} 
        onClose={() => setContactDialog(false)} 
      />

      {/* Password Change Dialog */}
      <Dialog 
        open={passwordDialog} 
        onClose={() => !user?.needsPasswordChange && setPasswordDialog(false)}
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown={user?.needsPasswordChange}
      >
        <DialogTitle>
          {user?.needsPasswordChange ? 'Set Your Password' : 'Change Password'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {user?.needsPasswordChange ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Welcome! Please create your own password to secure your account.
              </Alert>
            ) : (
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                sx={{ mb: 2 }}
              />
            )}
            
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helperText="Minimum 6 characters"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
              helperText={
                passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''
                  ? 'Passwords do not match'
                  : ''
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {!user?.needsPasswordChange && (
            <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          )}
          <Button 
            onClick={handlePasswordChange} 
            variant="contained"
            disabled={loading || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomerDashboard;