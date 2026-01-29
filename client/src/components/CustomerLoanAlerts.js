import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Stack,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  NotificationsActive,
  Warning,
  CalendarToday,
  Payment,
  Email,
  Sms,
  CheckCircle,
  ErrorOutline,
  Info,
  Close
} from '@mui/icons-material';
import axios from 'axios';

const CustomerLoanAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  useEffect(() => {
    fetchLoanAlerts();
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchLoanAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLoanAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/loans/repayment-alerts');
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error('Error fetching loan alerts:', err);
      setError(err.response?.data?.message || 'Failed to fetch loan alerts');
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
  };

  const getAlertSeverity = (daysUntilDue) => {
    if (daysUntilDue < 0) return 'error';
    if (daysUntilDue <= 3) return 'error';
    if (daysUntilDue <= 7) return 'warning';
    if (daysUntilDue <= 14) return 'info';
    return 'success';
  };

  const getAlertIcon = (daysUntilDue) => {
    if (daysUntilDue < 0) return <ErrorOutline />;
    if (daysUntilDue <= 3) return <Warning />;
    if (daysUntilDue <= 7) return <NotificationsActive />;
    return <Info />;
  };

  const getAlertTitle = (daysUntilDue, isOverdue) => {
    if (isOverdue) return 'OVERDUE - Immediate Action Required';
    if (daysUntilDue <= 3) return 'URGENT - Payment Due Soon';
    if (daysUntilDue <= 7) return 'Reminder - Payment Due This Week';
    if (daysUntilDue <= 14) return 'Upcoming Payment';
    return 'Payment Scheduled';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || 0}`;
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.loanId));
  const urgentAlerts = visibleAlerts.filter(alert => alert.daysUntilDue <= 7);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Badge badgeContent={urgentAlerts.length} color="error">
            <NotificationsActive sx={{ fontSize: 32, color: 'primary.main' }} />
          </Badge>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Loan Repayment Alerts
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stay on top of your loan repayments
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={fetchLoanAlerts}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Alert Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
            <Typography variant="caption" color="text.secondary">
              Overdue Payments
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {visibleAlerts.filter(a => a.isOverdue).length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
            <Typography variant="caption" color="text.secondary">
              Due This Week
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {visibleAlerts.filter(a => !a.isOverdue && a.daysUntilDue <= 7).length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="caption" color="text.secondary">
              Upcoming (14 days)
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {visibleAlerts.filter(a => !a.isOverdue && a.daysUntilDue > 7 && a.daysUntilDue <= 14).length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Alert List */}
      {visibleAlerts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Pending Loan Payments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You're all caught up! No loan repayments are due at this time.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {visibleAlerts.map((alert) => {
            const severity = getAlertSeverity(alert.daysUntilDue);
            const icon = getAlertIcon(alert.daysUntilDue);
            const title = getAlertTitle(alert.daysUntilDue, alert.isOverdue);

            return (
              <Alert
                key={alert.loanId}
                severity={severity}
                icon={icon}
                action={
                  <IconButton
                    aria-label="dismiss"
                    color="inherit"
                    size="small"
                    onClick={() => dismissAlert(alert.loanId)}
                  >
                    <Close fontSize="inherit" />
                  </IconButton>
                }
              >
                <AlertTitle sx={{ fontWeight: 'bold' }}>
                  {title}
                </AlertTitle>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Loan ID:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          #{alert.loanId?.slice(-8).toUpperCase()}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Due Date:
                        </Typography>
                        <Chip
                          icon={<CalendarToday />}
                          label={formatDate(alert.dueDate)}
                          size="small"
                          color={alert.isOverdue ? 'error' : 'default'}
                        />
                      </Box>

                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Days Until Due:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={alert.isOverdue ? 'error.main' : 'text.primary'}
                        >
                          {alert.isOverdue 
                            ? `${Math.abs(alert.daysUntilDue)} days overdue` 
                            : `${alert.daysUntilDue} days`}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Amount Due:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="error.main">
                          {formatCurrency(alert.amountDue)}
                        </Typography>
                      </Box>

                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Total Remaining:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(alert.remainingAmount)}
                        </Typography>
                      </Box>

                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Monthly EMI:
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(alert.monthlyPayment)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>

                {/* Notification Status */}
                <Divider sx={{ my: 2 }} />
                <Box display="flex" gap={2} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Notifications sent:
                  </Typography>
                  {alert.emailSent && (
                    <Tooltip title="Email notification sent">
                      <Chip
                        icon={<Email />}
                        label="Email"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                  {alert.smsSent && (
                    <Tooltip title="SMS notification sent">
                      <Chip
                        icon={<Sms />}
                        label="SMS"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                  {!alert.emailSent && !alert.smsSent && (
                    <Typography variant="caption" color="text.secondary">
                      No notifications sent yet
                    </Typography>
                  )}
                </Box>

                {/* Action Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Payment />}
                    color={alert.isOverdue ? 'error' : 'primary'}
                    href={`#payment-section`} // This would navigate to payment section
                  >
                    {alert.isOverdue ? 'Pay Now' : 'Make Payment'}
                  </Button>
                </Box>
              </Alert>
            );
          })}
        </Stack>
      )}

      {/* Info Box */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
        <Typography variant="subtitle2" fontWeight="bold" color="info.main" gutterBottom>
          <Info sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
          Alert Notifications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You will receive email and SMS notifications:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CheckCircle fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="14 days before payment due date"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CheckCircle fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="7 days before payment due date"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CheckCircle fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="3 days before payment due date"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CheckCircle fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="On the payment due date"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
};

export default CustomerLoanAlerts;
