import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Button,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemButton,
  Grid
} from '@mui/material';
import {
  Refresh,
  Notifications,
  Error as ErrorIcon,
  Warning,
  Info,
  CheckCircle,
  FilterList,
  MarkEmailRead,
  Delete,
  Sms,
  Send,
  Phone
} from '@mui/icons-material';
import axios from 'axios';

const AlertsCenter = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [smsData, setSmsData] = useState({
    alertType: 'info',
    message: ''
  });
  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  const fetchAlerts = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      // Fetch both regular alerts and prediction alerts
      const [alertsResponse, predictionsResponse] = await Promise.all([
        axios.get('/api/analytics/owner/alerts', {
          headers: { 'x-auth-token': token }
        }),
        axios.get('/api/predictions/dashboard-predictions', {
          headers: { 'x-auth-token': token }
        }).catch(() => ({ data: { alerts: [] } })) // Fallback if predictions service is down
      ]);
      
      // Merge alerts from both sources
      const combinedAlerts = {
        ...alertsResponse.data,
        predictiveAlerts: predictionsResponse.data.alerts || [],
        marketAlerts: []
      };
      
      // Fetch market alerts
      try {
        const marketResponse = await axios.get('/api/predictions/market-alerts', {
          headers: { 'x-auth-token': token }
        });
        combinedAlerts.marketAlerts = marketResponse.data.alerts || [];
      } catch (err) {
        console.log('Market alerts unavailable');
      }
      
      setAlerts(combinedAlerts);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCustomersList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/owner/customers-list', {
        headers: { 'x-auth-token': token }
      });
      setCustomersList(response.data.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleOpenSMSDialog = () => {
    fetchCustomersList();
    setSmsDialogOpen(true);
    setSmsResult(null);
  };

  const handleCloseSMSDialog = () => {
    setSmsDialogOpen(false);
    setSelectedCustomers([]);
    setSmsData({ alertType: 'info', message: '' });
    setSmsResult(null);
  };

  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customersList.filter(c => c.hasPhone).length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customersList.filter(c => c.hasPhone).map(c => c.id));
    }
  };

  const handleSendSMS = async () => {
    if (!smsData.message.trim()) {
      alert('Please enter a message');
      return;
    }

    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    try {
      setSendingSMS(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('/api/analytics/owner/send-alert-sms', {
        customerIds: selectedCustomers,
        alertType: smsData.alertType,
        message: smsData.message
      }, {
        headers: { 'x-auth-token': token }
      });

      setSmsResult(response.data);
      
      // Auto-close after 3 seconds if all successful
      if (response.data.results.successful === response.data.results.total) {
        setTimeout(() => {
          handleCloseSMSDialog();
        }, 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send SMS');
    } finally {
      setSendingSMS(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleRefresh = () => {
    fetchAlerts();
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/analytics/owner/alerts/${alertId}/read`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/analytics/owner/alerts/${alertId}`, {
        headers: { 'x-auth-token': token }
      });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        '/api/analytics/owner/alerts/mark-all-read',
        {},
        { headers: { 'x-auth-token': token } }
      );
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getAlertIcon = (priority) => {
    switch (priority) {
      case 'critical':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ff9800' }} />;
      case 'info':
        return <Info sx={{ color: '#2196f3' }} />;
      default:
        return <CheckCircle sx={{ color: '#4caf50' }} />;
    }
  };

  const getAlertColor = (priority) => {
    switch (priority) {
      case 'critical':
        return '#ffebee';
      case 'warning':
        return '#fff3e0';
      case 'info':
        return '#e3f2fd';
      default:
        return '#f5f5f5';
    }
  };

  const getAlertBorderColor = (priority) => {
    switch (priority) {
      case 'critical':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  const filterAlerts = (alertList, filter) => {
    if (!alertList) return [];
    if (filter === 'all') return alertList;
    return alertList.filter(alert => alert.priority === filter);
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

  if (!alerts) {
    return null;
  }

  const allAlerts = [...(alerts.critical || []), ...(alerts.warnings || []), ...(alerts.info || [])];
  const filteredAlerts = filterAlerts(allAlerts, activeTab);
  const unreadCount = allAlerts.filter(a => !a.read).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={unreadCount} color="error">
            <Notifications sx={{ fontSize: 32, color: 'primary.main' }} />
          </Badge>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Alerts & Notifications Center
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Send SMS Alert to Customers">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Sms />}
              onClick={handleOpenSMSDialog}
            >
              Send SMS
            </Button>
          </Tooltip>
          <Tooltip title="Mark all as read">
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkEmailRead />}
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Alert Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: '#ffebee', borderLeft: '4px solid #f44336' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ErrorIcon sx={{ fontSize: 32, color: '#f44336' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#f44336' }}>
                {alerts.critical?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Critical Alerts
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Warning sx={{ fontSize: 32, color: '#ff9800' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#ff9800' }}>
                {alerts.warnings?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Warnings
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Info sx={{ fontSize: 32, color: '#2196f3' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#2196f3' }}>
                {alerts.info?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Information
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 200, backgroundColor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Warning sx={{ fontSize: 32, color: '#9c27b0' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                {(alerts.predictiveAlerts?.length || 0) + (alerts.marketAlerts?.length || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ML Predictions
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Prediction & Market Alerts Section */}
      {((alerts.predictiveAlerts && alerts.predictiveAlerts.length > 0) || 
        (alerts.marketAlerts && alerts.marketAlerts.length > 0)) && (
        <Card sx={{ mb: 3, bgcolor: '#f3e5f5' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#9c27b0' }}>
              <Warning /> AI-Powered Predictions & Market Alerts
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            {/* Market Alerts */}
            {alerts.marketAlerts && alerts.marketAlerts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Market Trends
                </Typography>
                {alerts.marketAlerts.map((alert, index) => (
                  <Alert 
                    key={index} 
                    severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {alert.title}
                    </Typography>
                    <Typography variant="body2">
                      {alert.message}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            )}

            {/* Predictive Alerts */}
            {alerts.predictiveAlerts && alerts.predictiveAlerts.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Customer Risk Predictions
                </Typography>
                {alerts.predictiveAlerts.slice(0, 5).map((alert, index) => (
                  <Alert 
                    key={index} 
                    severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {alert.title}
                    </Typography>
                    <Typography variant="body2">
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Customer: {alert.customerName}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}


      {/* Tabs for filtering */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab 
            label={
              <Badge badgeContent={allAlerts.length} color="primary">
                All Alerts
              </Badge>
            } 
            value="all" 
          />
          <Tab 
            label={
              <Badge badgeContent={alerts.critical?.length || 0} color="error">
                Critical
              </Badge>
            } 
            value="critical" 
          />
          <Tab 
            label={
              <Badge badgeContent={alerts.warnings?.length || 0} color="warning">
                Warnings
              </Badge>
            } 
            value="warning" 
          />
          <Tab 
            label={
              <Badge badgeContent={alerts.info?.length || 0} color="info">
                Info
              </Badge>
            } 
            value="info" 
          />
        </Tabs>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardContent>
          {filteredAlerts.length > 0 ? (
            <List>
              {filteredAlerts.map((alert, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    sx={{
                      backgroundColor: getAlertColor(alert.priority),
                      borderLeft: '4px solid',
                      borderLeftColor: getAlertBorderColor(alert.priority),
                      mb: 2,
                      borderRadius: 1,
                      opacity: alert.read ? 0.6 : 1
                    }}
                    secondaryAction={
                      <Box>
                        {!alert.read && (
                          <Tooltip title="Mark as read">
                            <IconButton 
                              edge="end" 
                              size="small"
                              onClick={() => handleMarkAsRead(alert._id)}
                              sx={{ mr: 1 }}
                            >
                              <MarkEmailRead />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleDeleteAlert(alert._id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      {getAlertIcon(alert.priority)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={alert.read ? 'normal' : 'bold'} component="div">
                            {alert.message}
                          </Typography>
                          {!alert.read && (
                            <Chip label="New" color="error" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="textSecondary" component="span">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Just now'}
                          </Typography>
                          {alert.category && (
                            <Chip 
                              label={alert.category}
                              size="small"
                              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Alert severity="success">
              <Typography variant="body1">
                🎉 No {activeTab === 'all' ? '' : activeTab} alerts at this time. Everything is running smoothly!
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* SMS Alert Dialog */}
      <Dialog open={smsDialogOpen} onClose={handleCloseSMSDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sms color="primary" />
            <Typography variant="h6">Send SMS Alert to Customers</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {smsResult ? (
            <Alert 
              severity={smsResult.results.failed === 0 ? 'success' : 'warning'}
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" fontWeight="bold">
                {smsResult.message}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Successful: {smsResult.results.successful} | Failed: {smsResult.results.failed}
              </Typography>
              {smsResult.results.failed > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight="bold">Failed Recipients:</Typography>
                  <List dense>
                    {smsResult.results.details
                      .filter(d => !d.success)
                      .map((detail, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={detail.customerName}
                            secondary={`${detail.phone} - ${detail.message}`}
                          />
                        </ListItem>
                      ))}
                  </List>
                </Box>
              )}
            </Alert>
          ) : (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Alert Type</InputLabel>
                    <Select
                      value={smsData.alertType}
                      onChange={(e) => setSmsData(prev => ({ ...prev, alertType: e.target.value }))}
                      label="Alert Type"
                    >
                      <MenuItem value="critical">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ErrorIcon sx={{ color: '#f44336' }} />
                          Critical
                        </Box>
                      </MenuItem>
                      <MenuItem value="warning">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Warning sx={{ color: '#ff9800' }} />
                          Warning
                        </Box>
                      </MenuItem>
                      <MenuItem value="info">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Info sx={{ color: '#2196f3' }} />
                          Information
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                    <Typography variant="caption" color="text.secondary">Selected</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedCustomers.length} of {customersList.filter(c => c.hasPhone).length} customers
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="SMS Message"
                placeholder="Enter your alert message here..."
                value={smsData.message}
                onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
                sx={{ mb: 3 }}
                helperText={`${smsData.message.length}/160 characters`}
              />

              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Select Customers</Typography>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  startIcon={<CheckCircle />}
                >
                  {selectedCustomers.length === customersList.filter(c => c.hasPhone).length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </Button>
              </Box>

              <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List>
                  {customersList.map((customer) => (
                    <ListItemButton
                      key={customer.id}
                      onClick={() => customer.hasPhone && handleCustomerToggle(customer.id)}
                      disabled={!customer.hasPhone}
                    >
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        disabled={!customer.hasPhone}
                      />
                      <ListItemIcon>
                        <Phone color={customer.hasPhone ? 'primary' : 'disabled'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={customer.name || customer.username}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {customer.email}
                            </Typography>
                            <Typography variant="caption" color={customer.hasPhone ? 'success.main' : 'error'}>
                              {customer.phone}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
                {customersList.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No customers found
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSMSDialog}>
            {smsResult ? 'Close' : 'Cancel'}
          </Button>
          {!smsResult && (
            <Button
              variant="contained"
              onClick={handleSendSMS}
              disabled={sendingSMS || selectedCustomers.length === 0 || !smsData.message.trim()}
              startIcon={sendingSMS ? <CircularProgress size={20} /> : <Send />}
            >
              {sendingSMS ? 'Sending...' : `Send to ${selectedCustomers.length} Customer(s)`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertsCenter;
