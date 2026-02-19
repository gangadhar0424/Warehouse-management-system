import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Alert, Button, CircularProgress, Grid, Chip } from '@mui/material';
import { Psychology, Inventory, TrendingUp } from '@mui/icons-material';
import axios from 'axios';

const AIStorageOptimization = ({ grainData, customerId }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchPredictions();
    }
  }, [customerId]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai/demand/predict', {
        customer_id: customerId,
        grain_data: grainData
      });
      setPrediction(response.data);
    } catch (err) {
      console.log('AI Storage optimization unavailable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading AI storage predictions...</Typography>
      </Box>
    );
  }

  if (!prediction) return null;

  return (
    <Paper sx={{ p: 2, mt: 2, border: '1px solid', borderColor: 'info.light', bgcolor: 'info.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Psychology color="info" />
        <Typography variant="subtitle1" fontWeight="bold">AI Storage Optimization</Typography>
      </Box>
      {prediction.predictions && prediction.predictions.map((pred, idx) => (
        <Alert key={idx} severity="info" sx={{ mb: 1 }} icon={<TrendingUp />}>
          <Typography variant="body2">
            <strong>{pred.grain_type}:</strong> {pred.recommendation || `Expected storage duration: ${pred.predicted_duration || 'N/A'} months`}
          </Typography>
        </Alert>
      ))}
      {prediction.optimal_vacate_time && (
        <Chip label={`Optimal vacate: ${prediction.optimal_vacate_time}`} color="info" sx={{ mt: 1 }} />
      )}
    </Paper>
  );
};

export default AIStorageOptimization;
