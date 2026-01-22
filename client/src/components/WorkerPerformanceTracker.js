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
  IconButton,
  Tooltip,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating
} from '@mui/material';
import {
  Refresh,
  WorkOutline,
  TrendingUp,
  Star,
  Speed,
  CheckCircle,
  Timeline
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import axios from 'axios';

const WorkerPerformanceTracker = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerformanceData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/owner/worker-performance', {
        headers: { 'x-auth-token': token }
      });
      setPerformanceData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch worker performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const handleRefresh = () => {
    fetchPerformanceData();
  };

  const getProductivityColor = (productivity) => {
    if (productivity === 'High') return 'success';
    if (productivity === 'Medium') return 'warning';
    return 'error';
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

  if (!performanceData) {
    return null;
  }

  const { workers, overallStats, recentActivity } = performanceData;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WorkOutline sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Worker Performance Tracker
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WorkOutline sx={{ fontSize: 40, color: '#1976d2' }} />
                <Typography variant="h6">Total Workers</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="primary">
                {overallStats?.totalWorkers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#e8f5e9' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
                <Typography variant="h6">Avg Accuracy</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#4caf50' }}>
                {overallStats?.avgAccuracy || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Speed sx={{ fontSize: 40, color: '#ff9800' }} />
                <Typography variant="h6">Vehicles Today</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#ff9800' }}>
                {overallStats?.vehiclesToday || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', backgroundColor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: '#9c27b0' }} />
                <Typography variant="h6">Avg Processing</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                {overallStats?.avgProcessingTime || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                minutes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Worker Performance Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Individual Worker Performance
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Worker</TableCell>
                  <TableCell align="right">Vehicles Processed</TableCell>
                  <TableCell align="right">Avg Time</TableCell>
                  <TableCell align="right">Accuracy</TableCell>
                  <TableCell align="right">Shifts Worked</TableCell>
                  <TableCell>Productivity</TableCell>
                  <TableCell align="center">Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workers?.map((worker, index) => (
                  <TableRow 
                    key={index}
                    sx={{ 
                      backgroundColor: worker.productivity === 'High' ? '#f1f8e9' : 'transparent',
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: worker.accuracy >= 95 ? '#4caf50' : '#ff9800' }}>
                          {worker.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {worker.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {worker.role || 'Warehouse Worker'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="bold">
                        {worker.vehiclesProcessed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {worker.avgProcessingTime} mins
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          color={worker.accuracy >= 95 ? 'success.main' : 'warning.main'}
                        >
                          {worker.accuracy}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={worker.accuracy} 
                          color={worker.accuracy >= 95 ? 'success' : 'warning'}
                          sx={{ height: 6, borderRadius: 3, width: 80 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {worker.shiftsWorked}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={worker.productivity}
                        color={getProductivityColor(worker.productivity)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Rating 
                        value={worker.rating || 4} 
                        precision={0.5} 
                        readOnly 
                        size="small"
                      />
                      <Typography variant="caption" display="block" color="textSecondary">
                        {worker.rating || 4.0}/5.0
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Vehicles Processed Comparison */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Vehicles Processed Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workers || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="vehiclesProcessed" fill="#1976d2" name="Vehicles" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Worker Skills Radar */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Top Performer Skills Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={workers?.[0] ? [
                  { skill: 'Speed', value: Math.min((workers[0].vehiclesProcessed / 50) * 100, 100) },
                  { skill: 'Accuracy', value: workers[0].accuracy },
                  { skill: 'Consistency', value: workers[0].shiftsWorked > 20 ? 95 : 75 },
                  { skill: 'Quality', value: workers[0].rating * 20 },
                  { skill: 'Productivity', value: workers[0].productivity === 'High' ? 100 : 70 }
                ] : []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Performance" dataKey="value" stroke="#1976d2" fill="#1976d2" fillOpacity={0.6} />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity Timeline */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Recent Activity
          </Typography>
          <Box>
            {recentActivity?.map((activity, index) => (
              <Paper 
                key={index} 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  borderLeft: '4px solid',
                  borderLeftColor: activity.type === 'vehicle_entry' ? '#1976d2' : 
                                   activity.type === 'grain_loading' ? '#4caf50' : 
                                   activity.type === 'payment' ? '#ff9800' : '#9c27b0'
                }}
              >
                <Timeline sx={{ fontSize: 32, color: 'text.secondary' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {activity.description}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {activity.worker} • {new Date(activity.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Chip 
                  label={activity.status}
                  color={activity.status === 'Completed' ? 'success' : 'info'}
                  size="small"
                />
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkerPerformanceTracker;
