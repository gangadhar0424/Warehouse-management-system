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
  ListItemIcon
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
  Delete
} from '@mui/icons-material';
import axios from 'axios';

const AlertsCenter = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);

  const fetchAlerts = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/owner/alerts', {
        headers: { 'x-auth-token': token }
      });
      setAlerts(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      </Box>

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
                          <Typography variant="body1" fontWeight={alert.read ? 'normal' : 'bold'}>
                            {alert.message}
                          </Typography>
                          {!alert.read && (
                            <Chip label="New" color="error" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="textSecondary">
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
    </Box>
  );
};

export default AlertsCenter;
