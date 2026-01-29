import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  Work,
  MonetizationOn,
  Assessment,
  Grain
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    position: ''
  });
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [ownerDashboard, setOwnerDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        company: user.company || '',
        position: user.position || ''
      });
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (user.role === 'customer') {
        const response = await axios.get('/api/transactions/my-transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomerTransactions(response.data);
      } else if (user.role === 'owner') {
        const response = await axios.get('/api/warehouse/owner-dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOwnerDashboard(response.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/auth/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      updateUser(response.data);
      setEditMode(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'completed': return 'success';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  if (!user) {
    return (
      <Container>
        <Alert severity="error">Please log in to view your profile</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Profile Header */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={3}>
              <Avatar
                sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
              >
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {user.name}
                </Typography>
                <Chip 
                  label={user.role.toUpperCase()} 
                  color="primary" 
                  size="large"
                />
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {user.email}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                {editMode ? (
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveProfile}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Tabs */}
          <Grid item xs={12}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Personal Info" />
              {user.role === 'customer' && <Tab label="Transactions" />}
              {user.role === 'owner' && <Tab label="Dashboard" />}
              {user.role === 'owner' && <Tab label="Settings" />}
            </Tabs>
          </Grid>
        </Grid>

        {/* Personal Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  multiline
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!editMode}
                />
              </Grid>
              {user.role === 'customer' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    disabled={!editMode}
                  />
                </Grid>
              )}
            </Grid>
          </TabPanel>

        {/* Customer Transactions Tab */}
        {user.role === 'customer' && (
            <TabPanel value={tabValue} index={1}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerTransactions.map((transaction) => (
                      <TableRow key={transaction._id}>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip label={transaction.type} size="small" />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.status} 
                            color={getStatusColor(transaction.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          )}

        {/* Owner Dashboard Tab */}
        {user.role === 'owner' && (
            <TabPanel value={tabValue} index={1}>
              {ownerDashboard ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Total Revenue
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(ownerDashboard.totalRevenue || 0)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Total Customers
                        </Typography>
                        <Typography variant="h4" color="info.main">
                          {ownerDashboard.totalCustomers || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Typography>Loading dashboard data...</Typography>
              )}
            </TabPanel>
          )}

        {/* Owner Settings Tab */}
        {user.role === 'owner' && (
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Payment Gateway Settings
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Razorpay Configuration
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <TextField
                          fullWidth
                          label="Razorpay Key ID"
                          type="password"
                          defaultValue="rzp_test_..."
                          sx={{ mb: 2 }}
                        />
                        <TextField
                          fullWidth
                          label="Razorpay Secret Key"
                          type="password"
                          defaultValue="..."
                          sx={{ mb: 2 }}
                        />
                        <Button variant="contained" color="primary">
                          Update Razorpay Keys
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Payment Settings
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Transaction Fee (%)"
                            type="number"
                            defaultValue="2.5"
                            inputProps={{ step: 0.1, min: 0, max: 10 }}
                            sx={{ mb: 2 }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Minimum Payment Amount"
                            type="number"
                            defaultValue="1"
                            inputProps={{ min: 1 }}
                            sx={{ mb: 2 }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Currency"
                            defaultValue="INR"
                            disabled
                            sx={{ mb: 2 }}
                          />
                        </Grid>
                      </Grid>
                      <Button variant="contained" color="primary">
                        Save Payment Settings
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Payment Methods Status
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="h6">Cash</Typography>
                            <Chip label="Active" color="success" />
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="h6">UPI</Typography>
                            <Chip label="Active" color="success" />
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="h6">Razorpay</Typography>
                            <Chip label="Active" color="success" />
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="h6">Bank Transfer</Typography>
                            <Chip label="Active" color="success" />
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          )}
      </Paper>
    </Container>
  );
};

export default UserProfile;