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
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
  TrendingDown,
  LocationOn,
  Timeline,
  Inventory,
  Business
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
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';

const COLORS = ['#1976d2', '#dc004e', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#3f51b5'];

const CombinedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);
  
  // New analytics states
  const [grainAnalytics, setGrainAnalytics] = useState(null);
  const [storageDurationData, setStorageDurationData] = useState(null);
  const [customerAnalytics, setCustomerAnalytics] = useState(null);
  const [warehouseCapacity, setWarehouseCapacity] = useState(null);

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
      
      // Fetch new analytics data
      const [grainRes, storageRes, customerRes, capacityRes] = await Promise.all([
        axios.get('/api/analytics/owner/grain-analytics', { headers: { 'x-auth-token': token } }),
        axios.get('/api/analytics/owner/storage-duration-analytics', { headers: { 'x-auth-token': token } }),
        axios.get('/api/analytics/owner/customer-analytics', { headers: { 'x-auth-token': token } }),
        axios.get('/api/analytics/owner/warehouse-capacity-viz', { headers: { 'x-auth-token': token } })
      ]);
      
      setDashboardData(dashboardResponse.data);
      setFinancialData(financialResponse.data);
      setGrainAnalytics(grainRes.data);
      setStorageDurationData(storageRes.data);
      setCustomerAnalytics(customerRes.data);
      setWarehouseCapacity(capacityRes.data);
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
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        <Tab label="Revenue & Analytics" />
        <Tab label="Financial Reports" />
        <Tab label="Data Exports" />
        <Tab icon={<Grain />} label="Grain Analytics" />
        <Tab icon={<Timeline />} label="Storage Duration" />
        <Tab icon={<People />} label="Customer Analytics" />
        <Tab icon={<Business />} label="Warehouse Capacity" />
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

      {/* Tab 3: Grain Analytics */}
      {activeTab === 3 && grainAnalytics && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Grain-Based Analytics - Current Inventory
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Total Grain Types: {grainAnalytics.totalGrainTypes}
            </Alert>
          </Grid>

          {/* Grain Distribution Chart */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Grain Weight Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={grainAnalytics.grainAnalytics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grainType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `${value.toLocaleString()} kg`} />
                    <Legend />
                    <Bar dataKey="totalWeight" fill="#4caf50" name="Weight (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grain Value Chart */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Grain Value Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={grainAnalytics.grainAnalytics || []}
                      dataKey="totalValue"
                      nameKey="grainType"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ grainType, percent }) => `${grainType}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {(grainAnalytics.grainAnalytics || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grain Details Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Grain Inventory Details
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Grain Type</strong></TableCell>
                        <TableCell align="right"><strong>Weight (kg)</strong></TableCell>
                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                        <TableCell align="right"><strong>Value (₹)</strong></TableCell>
                        <TableCell align="right"><strong>Customers</strong></TableCell>
                        <TableCell align="right"><strong>Blocks</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(grainAnalytics.grainAnalytics || []).map((grain, index) => (
                        <TableRow key={index}>
                          <TableCell>{grain.grainType}</TableCell>
                          <TableCell align="right">{grain.totalWeight.toLocaleString()}</TableCell>
                          <TableCell align="right">{grain.totalQuantity.toLocaleString()}</TableCell>
                          <TableCell align="right">₹{grain.totalValue.toLocaleString()}</TableCell>
                          <TableCell align="right">{grain.customerCount}</TableCell>
                          <TableCell align="right">{grain.blockCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Storage Duration Analytics */}
      {activeTab === 4 && storageDurationData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Storage Duration Analytics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                  <Typography variant="body2" color="textSecondary">Currently Storing</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {storageDurationData.stats.activeCount}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                  <Typography variant="body2" color="textSecondary">Previously Stored</Typography>
                  <Typography variant="h4" fontWeight="bold" color="secondary">
                    {storageDurationData.stats.completedCount}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="body2" color="textSecondary">Avg. Duration</Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>
                    {storageDurationData.stats.averageDuration} days
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Duration Distribution */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Storage Duration Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.keys(storageDurationData.durationRanges).map(range => ({
                    range,
                    count: storageDurationData.durationRanges[range]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#1976d2" name="Number of Storages" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Currently Storing Table */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Currently Storing (Top 10)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Customer</strong></TableCell>
                        <TableCell align="right"><strong>Days Stored</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(storageDurationData.currentlyStoring || []).slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={item.daysStored} 
                              size="small" 
                              color={item.daysStored > 90 ? "warning" : "primary"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 5: Customer Analytics */}
      {activeTab === 5 && customerAnalytics && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Customer Analytics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="body2" color="textSecondary">Current Customers</Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#4caf50' }}>
                    {customerAnalytics.currentCustomers.count}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="body2" color="textSecondary">Previous Customers</Typography>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#ff9800' }}>
                    {customerAnalytics.previousCustomers.count}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Customer In/Out Flow Line Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Customer In/Out Flow (Last 12 Months)
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={customerAnalytics.customerFlow || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="in" stroke="#4caf50" strokeWidth={2} name="Customers IN" />
                    <Line type="monotone" dataKey="out" stroke="#f44336" strokeWidth={2} name="Customers OUT" />
                    <Line type="monotone" dataKey="net" stroke="#1976d2" strokeWidth={2} strokeDasharray="5 5" name="Net Change" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Segmentation Bubble Chart */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Customer Segmentation (Bubble Chart)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      dataKey="transactionCount" 
                      name="Transactions" 
                      label={{ value: 'Number of Transactions', position: 'bottom' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="totalSpent" 
                      name="Total Spent" 
                      label={{ value: 'Total Spent (₹)', angle: -90, position: 'left' }}
                    />
                    <ZAxis 
                      type="number" 
                      dataKey="avgTransactionValue" 
                      range={[50, 400]} 
                      name="Avg Value"
                    />
                    <RechartsTooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value, name) => {
                        if (name === 'Total Spent' || name === 'Avg Value') return `₹${value.toLocaleString()}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Scatter 
                      name="Active Customers" 
                      data={(customerAnalytics.segmentation || []).filter(c => c.status === 'active')} 
                      fill="#4caf50"
                    />
                    <Scatter 
                      name="Inactive Customers" 
                      data={(customerAnalytics.segmentation || []).filter(c => c.status === 'inactive')} 
                      fill="#ff9800"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Lifetime Value Bar Chart */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Top 10 Customer Lifetime Value
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={(customerAnalytics.customerLifetimeValue || []).slice(0, 10)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="totalSpent" fill="#1976d2" name="Total Spent (₹)">
                      {(customerAnalytics.customerLifetimeValue || []).slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.status === 'active' ? '#4caf50' : '#ff9800'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Location Map */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Customer Locations
                </Typography>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Customer Name</strong></TableCell>
                        <TableCell><strong>Location</strong></TableCell>
                        <TableCell align="right"><strong>Total Spent (₹)</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(customerAnalytics.customerLifetimeValue || []).map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn fontSize="small" color="action" />
                              {customer.location}
                            </Box>
                          </TableCell>
                          <TableCell align="right">₹{customer.totalSpent.toLocaleString()}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={customer.status} 
                              size="small" 
                              color={customer.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 6: Warehouse Capacity */}
      {activeTab === 6 && warehouseCapacity && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Warehouse Capacity Visualization - Block-wise Grain Storage
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Total Blocks: {warehouseCapacity.summary.totalBlocks} | 
              Average Occupancy: {warehouseCapacity.summary.averageOccupancy}%
            </Alert>
          </Grid>

          {/* Block Occupancy Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Block-wise Occupancy Rate
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={warehouseCapacity.capacityData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="blockName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="occupiedBoxes" stackId="a" fill="#4caf50" name="Occupied Boxes" />
                    <Bar dataKey="availableBoxes" stackId="a" fill="#e0e0e0" name="Available Boxes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Block Capacity Grid */}
          {(warehouseCapacity.capacityData || []).map((block, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <Card sx={{ height: '100%', border: `2px solid ${parseFloat(block.occupancyRate) > 80 ? '#f44336' : '#4caf50'}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {block.blockName}
                    </Typography>
                    <Chip 
                      label={`${block.occupancyRate}%`} 
                      color={parseFloat(block.occupancyRate) > 80 ? 'error' : parseFloat(block.occupancyRate) > 50 ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="textSecondary">Occupied:</Typography>
                      <Typography variant="body2" fontWeight="bold">{block.occupiedBoxes}/{block.totalBoxes} boxes</Typography>
                    </Box>
                    <Box sx={{ height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          height: '100%', 
                          width: `${block.occupancyRate}%`,
                          backgroundColor: parseFloat(block.occupancyRate) > 80 ? '#f44336' : '#4caf50',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Total Weight: <strong>{block.totalWeight.toLocaleString()} kg</strong>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Customers: <strong>{block.customerCount}</strong>
                    </Typography>
                  </Box>

                  {block.grains.length > 0 && (
                    <>
                      <Typography variant="body2" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
                        Stored Grains:
                      </Typography>
                      {block.grains.map((grain, gIndex) => (
                        <Chip 
                          key={gIndex}
                          label={`${grain.type}: ${grain.weight.toLocaleString()}kg`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CombinedAnalytics;
