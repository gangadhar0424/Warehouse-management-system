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
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  People,
  AccountBalance,
  Grain,
  Refresh,
  Download,
  Analytics as AnalyticsIcon,
  Receipt,
  AttachMoney,
  TrendingDown
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

const CombinedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      // Fetch analytics dashboard data
      const dashboardResponse = await axios.get('/api/analytics/owner/dashboard', {
        headers: { 'x-auth-token': token }
      });
      
      // Fetch financial data
      const financialResponse = await axios.get(`/api/analytics/owner/financial-summary?period=${selectedPeriod}`, {
        headers: { 'x-auth-token': token }
      });
      
      setDashboardData(dashboardResponse.data);
      setFinancialData(financialResponse.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod]);

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleExportAnalytics = async () => {
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

  const handleExportFinancial = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = format === 'pdf' ? '/api/reports/financial-pdf' : '/api/exports/financial-excel';
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      
      const response = await axios.get(`${endpoint}?period=${selectedPeriod}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export report');
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

  const revenue = dashboardData?.revenue || {};
  const customers = dashboardData?.customers || {};
  const loans = dashboardData?.loans || {};
  const inventory = dashboardData?.inventory || {};
  const workers = dashboardData?.workers || {};
  const monthlyTrends = dashboardData?.monthlyTrends || [];

  const financial = financialData || {};
  const income = financial.income || {};
  const expenses = financial.expenses || {};
  const netProfit = financial.netProfit || 0;
  const profitMargin = financial.profitMargin || 0;
  const financialTrends = financial.monthlyTrends || [];
  const incomeBreakdown = financial.incomeBreakdown || [];
  const expenseBreakdown = financial.expenseBreakdown || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AnalyticsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Analytics & Financial Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              label="Period"
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportAnalytics}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 3 }}>
        <Tab label="Revenue & Analytics" />
        <Tab label="Financial Reports" />
        <Tab label="Data Exports" />
      </Tabs>

      {/* Tab 1: Revenue & Analytics Dashboard */}
      {activeTab === 0 && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Total Revenue
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        ₹{revenue.total?.toLocaleString() || 0}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          +{revenue.growth || 0}% vs last period
                        </Typography>
                      </Box>
                    </Box>
                    <AttachMoney sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Total Customers
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        {customers.total || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        {customers.active || 0} active
                      </Typography>
                    </Box>
                    <People sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Active Loans
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        {loans.active || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        ₹{loans.totalAmount?.toLocaleString() || 0}
                      </Typography>
                    </Box>
                    <AccountBalance sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                        Grain Inventory
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                        {inventory.total || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        {inventory.utilization || 0}% utilized
                      </Typography>
                    </Box>
                    <Grain sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Monthly Revenue Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#f44336" strokeWidth={2} name="Expenses" />
                      <Line type="monotone" dataKey="profit" stroke="#4caf50" strokeWidth={2} name="Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Revenue Sources
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Storage', value: revenue.storage || 0 },
                          { name: 'Weighbridge', value: revenue.weighbridge || 0 },
                          { name: 'Loans', value: revenue.loans || 0 },
                          { name: 'Other', value: revenue.other || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Tab 2: Financial Reports */}
      {activeTab === 1 && (
        <>
          {/* Financial Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Total Income</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{income.total?.toLocaleString() || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TrendingUp sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      {income.growth || 0}% from last period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Total Expenses</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{expenses.total?.toLocaleString() || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TrendingDown sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      {expenses.growth || 0}% from last period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Net Profit</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₹{netProfit?.toLocaleString() || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <TrendingUp sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      Healthy margins
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Profit Margin</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {profitMargin?.toFixed(1) || 0}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Receipt sx={{ fontSize: 16 }} />
                    <Typography variant="caption">
                      Current period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Financial Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Income Breakdown
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="amount" fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Expense Breakdown
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="amount" fill="#f44336" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Monthly Financial Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#4caf50" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" stroke="#f44336" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#1976d2" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Export Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportFinancial('pdf')}
            >
              Export PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => handleExportFinancial('excel')}
            >
              Export Excel
            </Button>
          </Box>
        </>
      )}

      {/* Tab 3: Data Exports */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Quick Data Exports
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => window.location.href = '/api/exports/transactions'}
              >
                Transactions
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => window.location.href = '/api/exports/customers'}
              >
                Customers
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => window.location.href = '/api/exports/vehicles'}
              >
                Vehicles
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Download />}
                onClick={() => window.location.href = '/api/exports/storage-allocations'}
              >
                Storage
              </Button>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Special Reports
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                onClick={() => window.location.href = '/api/reports/daily'}
              >
                Today's Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                onClick={() => window.location.href = '/api/reports/comprehensive'}
              >
                Comprehensive Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                onClick={() => window.location.href = '/api/reports/weekly'}
              >
                Weekly Report
              </Button>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 4 }}>
            All files are stored locally. Export files are automatically cleaned after 24 hours.
          </Alert>
        </Paper>
      )}
    </Box>
  );
};

export default CombinedAnalytics;
