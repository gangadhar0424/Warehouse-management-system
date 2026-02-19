import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Alert, Chip, CircularProgress, Button, Grid } from '@mui/material';
import { Psychology, TrendingUp, TrendingDown, Warning } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AILoanRecommendations = ({ customerId }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (customerId || user?._id) {
      fetchRecommendations();
    }
  }, [customerId, user]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai/loan-risk/assess', {
        customer_id: customerId || user?._id
      });
      setRecommendations(response.data);
    } catch (err) {
      // Silent fail - AI features are optional
      console.log('AI Loan recommendations unavailable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Loading AI recommendations...</Typography>
      </Paper>
    );
  }

  if (!recommendations) return null;

  return (
    <Paper sx={{ p: 2, border: '1px solid', borderColor: 'primary.light', bgcolor: 'primary.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Psychology color="primary" />
        <Typography variant="subtitle1" fontWeight="bold">AI Loan Insights</Typography>
      </Box>
      <Grid container spacing={2}>
        {recommendations.risk_score !== undefined && (
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Risk Score</Typography>
              <Typography variant="h5" fontWeight="bold"
                color={recommendations.risk_score > 70 ? 'error.main' : recommendations.risk_score > 40 ? 'warning.main' : 'success.main'}>
                {recommendations.risk_score}/100
              </Typography>
            </Box>
          </Grid>
        )}
        {recommendations.max_loan_recommended && (
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Max Recommended Loan</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                ₹{recommendations.max_loan_recommended.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        )}
        {recommendations.recommendation && (
          <Grid item xs={12}>
            <Alert severity={recommendations.risk_score > 70 ? 'warning' : 'info'} icon={<Psychology />}>
              {recommendations.recommendation}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default AILoanRecommendations;
