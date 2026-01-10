import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Work,
  MonetizationOn,
  Assessment,
  History,
  Add,
  Payment,
  Grain,
  Timer,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`worker-tabpanel-${index}`}
      aria-labelledby={`worker-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const WorkerBagTracking = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workDialog, setWorkDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [workForm, setWorkForm] = useState({
    workerId: '',
    bagsCarried: '',
    workType: 'loading',
    grainType: '',
    customerId: '',
    notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    workerId: '',
    newRate: ''
  });
  const [customers, setCustomers] = useState([]);
  const [workerStats, setWorkerStats] = useState({});
  const [workHistory, setWorkHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const grainTypes = ['Rice', 'Wheat', 'Maize', 'Barley', 'Oats', 'Millet'];
  const workTypes = ['loading', 'unloading', 'sorting', 'cleaning', 'transportation'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [workersRes, customersRes] = await Promise.all([
        axios.get('/api/workers', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/customers', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setWorkers(workersRes.data.workers || []);
      setCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerDetails = async (workerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/workers/${workerId}/work-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWorkerStats(response.data.stats);
      setWorkHistory(response.data.workHistory || []);
      setSelectedWorker(response.data.worker);
    } catch (error) {
      console.error('Error loading worker details:', error);
      setError('Failed to load worker details');
    }
  };

  const handleRecordWork = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/workers/${workForm.workerId}/bag-work`, workForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Work recorded successfully');
      setWorkDialog(false);
      setWorkForm({
        workerId: '',
        bagsCarried: '',
        workType: 'loading',
        grainType: '',
        customerId: '',
        notes: ''
      });
      
      if (selectedWorker && selectedWorker.id === workForm.workerId) {
        loadWorkerDetails(workForm.workerId);
      }
      loadData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error recording work:', error);
      setError(error.response?.data?.message || 'Failed to record work');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdatePaymentRate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/workers/${paymentForm.workerId}/payment-rate`, {
        paymentPerBag: parseInt(paymentForm.newRate)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Payment rate updated successfully');
      setPaymentDialog(false);
      setPaymentForm({ workerId: '', newRate: '' });
      
      if (selectedWorker && selectedWorker.id === paymentForm.workerId) {
        loadWorkerDetails(paymentForm.workerId);
      }
      loadData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating payment rate:', error);
      setError(error.response?.data?.message || 'Failed to update payment rate');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getWorkTypeColor = (type) => {
    const colors = {
      loading: 'primary',
      unloading: 'secondary',
      sorting: 'success',
      cleaning: 'warning',
      transportation: 'info'
    };
    return colors[type] || 'default';
  };

  if (user?.role !== 'owner') {
    return (
      <Container>
        <Alert severity="error">Access denied. Owner access required.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" gutterBottom>
            Worker Bag Tracking
          </Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setWorkDialog(true)}
              sx={{ mr: 2 }}
            >
              Record Work
            </Button>
            <Button
              variant="outlined"
              startIcon={<Payment />}
              onClick={() => setPaymentDialog(true)}
            >
              Update Rates
            </Button>
          </Box>
        </Box>

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Workers Overview" />
          <Tab label="Worker Details" />
        </Tabs>

        {/* Workers Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Worker Name</TableCell>
                  <TableCell>Total Bags</TableCell>
                  <TableCell>Total Earnings</TableCell>
                  <TableCell>Rate per Bag</TableCell>
                  <TableCell>Last Work</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {worker.profile?.firstName} {worker.profile?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {worker.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Work />}
                        label={worker.workerDetails?.totalBagsCarried || 0}
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(worker.workerDetails?.totalEarnings || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        ₹{worker.workerDetails?.paymentPerBag || 5}/bag
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {worker.workerDetails?.lastWorkDate 
                          ? new Date(worker.workerDetails.lastWorkDate).toLocaleDateString()
                          : 'No work recorded'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          loadWorkerDetails(worker._id);
                          setTabValue(1);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Worker Details Tab */}
        <TabPanel value={tabValue} index={1}>
          {selectedWorker ? (
            <Grid container spacing={3}>
              {/* Worker Stats Cards */}
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Work sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          {workerStats.totalBagsCarried || 0}
                        </Typography>
                        <Typography color="text.secondary">
                          Total Bags
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <MonetizationOn sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          {formatCurrency(workerStats.totalEarnings || 0)}
                        </Typography>
                        <Typography color="text.secondary">
                          Total Earnings
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Assessment sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          ₹{workerStats.paymentPerBag || 5}
                        </Typography>
                        <Typography color="text.secondary">
                          Rate per Bag
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Timer sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          {workerStats.lastWorkDate 
                            ? new Date(workerStats.lastWorkDate).toLocaleDateString()
                            : 'N/A'
                          }
                        </Typography>
                        <Typography color="text.secondary">
                          Last Work
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Work History */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Work History
                    </Typography>
                    <List>
                      {workHistory.slice(0, 10).map((work, index) => (
                        <ListItem key={index} divider>
                          <ListItemIcon>
                            <Grain color={getWorkTypeColor(work.workType)} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle2">
                                  {work.bagsCarried} bags - {work.workType}
                                </Typography>
                                <Chip 
                                  size="small" 
                                  label={work.grainType} 
                                  color="primary"
                                  variant="outlined"
                                />
                                <Typography variant="body2" color="success.main">
                                  {formatCurrency(work.paymentAmount)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(work.date).toLocaleDateString()} - {work.notes}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              Select a worker from the overview tab to view detailed information.
            </Alert>
          )}
        </TabPanel>
      </Paper>

      {/* Record Work Dialog */}
      <Dialog open={workDialog} onClose={() => setWorkDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record Worker Bag Work</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Worker</InputLabel>
                <Select
                  value={workForm.workerId}
                  onChange={(e) => setWorkForm({ ...workForm, workerId: e.target.value })}
                >
                  {workers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {worker.profile?.firstName} {worker.profile?.lastName} ({worker.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bags Carried"
                type="number"
                value={workForm.bagsCarried}
                onChange={(e) => setWorkForm({ ...workForm, bagsCarried: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Work Type</InputLabel>
                <Select
                  value={workForm.workType}
                  onChange={(e) => setWorkForm({ ...workForm, workType: e.target.value })}
                >
                  {workTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Grain Type</InputLabel>
                <Select
                  value={workForm.grainType}
                  onChange={(e) => setWorkForm({ ...workForm, grainType: e.target.value })}
                >
                  {grainTypes.map((grain) => (
                    <MenuItem key={grain} value={grain}>
                      {grain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Customer (Optional)</InputLabel>
                <Select
                  value={workForm.customerId}
                  onChange={(e) => setWorkForm({ ...workForm, customerId: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer._id} value={customer._id}>
                      {customer.profile?.firstName} {customer.profile?.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={workForm.notes}
                onChange={(e) => setWorkForm({ ...workForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRecordWork} 
            variant="contained"
            disabled={!workForm.workerId || !workForm.bagsCarried}
          >
            Record Work
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Payment Rate Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Payment Rate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Worker</InputLabel>
                <Select
                  value={paymentForm.workerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, workerId: e.target.value })}
                >
                  {workers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      {worker.profile?.firstName} {worker.profile?.lastName} - 
                      Current: ₹{worker.workerDetails?.paymentPerBag || 5}/bag
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Rate per Bag (₹)"
                type="number"
                value={paymentForm.newRate}
                onChange={(e) => setPaymentForm({ ...paymentForm, newRate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdatePaymentRate} 
            variant="contained"
            disabled={!paymentForm.workerId || !paymentForm.newRate}
          >
            Update Rate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkerBagTracking;