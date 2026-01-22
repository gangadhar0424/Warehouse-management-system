import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  People,
  AccountBalance,
  Grain,
  Refresh,
  Download
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const COLORS = ['#1976d2', '#dc004e', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];

const OwnerAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/owner/dashboard', {
        headers: { 'x-auth-token': token }
      });
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/owner/export', {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { revenue, customers, loans, inventory, workers, monthlyTrends } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Analytics & Revenue Dashboard
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                    ₹{revenue?.total?.toLocaleString() || 0}
                  </Typography>
                  <Chip
                    label={`+${revenue?.growth || 0}% this month`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(76, 175, 80, 0.2)', 
                      color: '#4caf50',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
                <TrendingUp sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Customers Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                    Total Customers
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                    {customers?.total || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {customers?.active || 0} active
                  </Typography>
                </Box>
                <People sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Loans Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                    Active Loans
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                    ₹{loans?.totalActive?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {loans?.count || 0} loans
                  </Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Grain Inventory Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                    Grain Stored
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                    {inventory?.totalWeight?.toLocaleString() || 0} kg
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    ₹{inventory?.totalValue?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <Grain sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Revenue Trends */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Monthly Revenue Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#1976d2" 
                    strokeWidth={3}
                    dot={{ fill: '#1976d2', r: 5 }}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    dot={{ fill: '#4caf50', r: 4 }}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Breakdown */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Revenue Sources
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenue?.breakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(revenue?.breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Customer Analytics & Loan Portfolio */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top Customers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Top Customers by Revenue
              </Typography>
              {customers?.topCustomers?.length > 0 ? (
                <Box>
                  {customers.topCustomers.map((customer, index) => (
                    <Paper 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: index === 0 ? '#fff3e0' : 'transparent'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip 
                          label={`#${index + 1}`} 
                          color={index === 0 ? 'primary' : 'default'}
                          size="small"
                        />
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {customer.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {customer.grainStored} kg stored
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        ₹{customer.totalSpent?.toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No customer data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Loan Portfolio Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Loan Portfolio Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Issued
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {loans?.totalIssued || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f3e5f5' }}>
                    <Typography variant="body2" color="textSecondary">
                      Pending Approvals
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="secondary">
                      {loans?.pendingApprovals || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
                    <Typography variant="body2" color="textSecondary">
                      Interest Earned
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#4caf50' }}>
                      ₹{loans?.interestEarned?.toLocaleString() || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                    <Typography variant="body2" color="textSecondary">
                      At Risk
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#ff9800' }}>
                      {loans?.atRisk || 0}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Loan-to-Value Ratio
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' }}>
                    <Box 
                      sx={{ 
                        height: '100%', 
                        width: `${(loans?.loanToValueRatio || 0) * 100}%`,
                        backgroundColor: '#1976d2',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {((loans?.loanToValueRatio || 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Worker Performance Summary */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Worker Performance Summary
              </Typography>
              <Grid container spacing={2}>
                {workers?.performance?.map((worker, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="body1" fontWeight="bold" gutterBottom>
                        {worker.name}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          Vehicles Processed
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {worker.vehiclesProcessed}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          Accuracy
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {worker.accuracy}%
                        </Typography>
                      </Box>
                      <Chip 
                        label={worker.productivity}
                        color={worker.productivity === 'High' ? 'success' : 'default'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OwnerAnalyticsDashboard;
