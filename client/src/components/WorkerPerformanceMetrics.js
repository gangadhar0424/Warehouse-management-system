import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Badge
} from '@mui/material';
import {
  TrendingUp,
  Star,
  EmojiEvents
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const WorkerPerformanceMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/workers/my-performance', {
          headers: { 'x-auth-token': token }
        });
        setPerformance(response.data);
      } catch (err) {
        console.error('Failed to fetch performance');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
        My Performance
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Vehicles Processed</Typography>
              <Typography variant="h4" fontWeight="bold">{performance?.vehiclesProcessed || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Accuracy Score</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">{performance?.accuracyScore || 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Rating</Typography>
              <Typography variant="h4" fontWeight="bold">
                {performance?.rating || 0} <Star sx={{ color: 'gold', verticalAlign: 'middle' }} />
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Achievements</Typography>
              <Typography variant="h4" fontWeight="bold">
                <Badge badgeContent={performance?.achievements?.length || 0} color="primary">
                  <EmojiEvents sx={{ fontSize: 32, color: 'gold' }} />
                </Badge>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">Weekly Performance</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performance?.weeklyData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="vehicles" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {performance?.achievements && performance.achievements.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">Achievements</Typography>
            <Grid container spacing={2}>
              {performance.achievements.map((achievement, index) => (
                <Grid item key={index}>
                  <Chip
                    label={achievement}
                    icon={<EmojiEvents />}
                    color="primary"
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default WorkerPerformanceMetrics;
