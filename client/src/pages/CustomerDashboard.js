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
  AccountBalance,
  Receipt,
  Refresh,
  ExtensionOutlined,
  ContactSupport,
  Lock,
  LocationOn,
  ShowChart,
  NotificationsActive,
  Calculate,
  Send
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import CustomerContactForm from '../components/CustomerContactForm';
import axios from 'axios';

// Import enhanced customer components
import CustomerGrainLocationView from '../components/CustomerGrainLocationView';
import CustomerPaymentOptions from '../components/CustomerPaymentOptions';
import CustomerMarketPricesAndPredictions from '../components/CustomerMarketPricesAndPredictions';
import CustomerLoanAlerts from '../components/CustomerLoanAlerts';
import CustomerLoanCalculatorAndRequest from '../components/CustomerLoanCalculatorAndRequest';
import CustomerRequestForm from '../components/CustomerRequestForm';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialogs
  const [contactDialog, setContactDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  
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
      
      const statsRes = await axios.get('/api/customers/stats/dashboard');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
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
          <Tab icon={<LocationOn />} label="Grain Locations" />
          <Tab icon={<Payment />} label="Payment Options" />
          <Tab icon={<ShowChart />} label="Market & Predictions" />
          <Tab icon={<NotificationsActive />} label="Loan Alerts" />
          <Tab icon={<Calculate />} label="Loan Calculator" />
          <Tab icon={<Send />} label="My Requests" />
        </Tabs>
      </Box>

      {activeTab === 0 && <CustomerGrainLocationView />}
      {activeTab === 1 && <CustomerPaymentOptions />}
      {activeTab === 2 && <CustomerMarketPricesAndPredictions />}
      {activeTab === 3 && <CustomerLoanAlerts />}
      {activeTab === 4 && <CustomerLoanCalculatorAndRequest />}
      {activeTab === 5 && <CustomerRequestForm />}

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