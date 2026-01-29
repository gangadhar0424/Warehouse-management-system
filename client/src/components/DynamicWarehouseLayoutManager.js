import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add,
  Warehouse,
  Download,
  Visibility,
  Delete,
  GridOn
} from '@mui/icons-material';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';

const DynamicWarehouseLayoutManager = () => {
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [slotDetailsDialogOpen, setSlotDetailsDialogOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [allocationForm, setAllocationForm] = useState({
    customerId: '',
    customerName: '',
    bags: '',
    grainType: '',
    weight: '',
    notes: ''
  });
  
  const [customers, setCustomers] = useState([]);
  
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Basic Info', 'Configuration', 'Preview & Create'];
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    configuration: {
      numberOfBuildings: 2,
      blocksPerBuilding: 2,
      rowsPerBlock: 3,
      colsPerBlock: 4
    },
    pricing: {
      rentPerQuintalPerMonth: 7,
      maintenancePerMonth: 6,
      insurancePerYear: 5
    }
  });

  const { addNotification } = useSocket();

  useEffect(() => {
    fetchLayouts();
    fetchCustomers();
  }, []);
  
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/customers', {
        headers: { 'x-auth-token': token }
      });
      console.log('Customers fetched:', response.data.customers);
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers. Please try again.');
    }
  };

  const fetchLayouts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/dynamic-warehouse/layouts', {
        headers: { 'x-auth-token': token }
      });
      setLayouts(response.data.layouts || []);
    } catch (error) {
      console.error('Error fetching layouts:', error);
      setError('Failed to load warehouse layouts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLayout = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/dynamic-warehouse/layout', formData, {
        headers: { 'x-auth-token': token }
      });
      
      setSuccess(`Warehouse layout "${formData.name}" created successfully!`);
      setCreateDialogOpen(false);
      resetForm();
      fetchLayouts();
      
      addNotification({
        type: 'success',
        title: 'Layout Created',
        message: `Warehouse layout "${formData.name}" has been created with ${response.data.warehouse.totalSlots} slots`,
        timestamp: new Date()
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create warehouse layout');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = async (layoutId, layoutName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/dynamic-warehouse/layout/${layoutId}/download-json`, {
        responseType: 'blob',
        headers: { 'x-auth-token': token }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${layoutName.replace(/\s+/g, '_')}_layout.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('Layout JSON downloaded successfully!');
    } catch (error) {
      setError('Failed to download layout JSON');
    }
  };

  const handleViewLayout = async (layoutId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/dynamic-warehouse/layout/${layoutId}`, {
        headers: { 'x-auth-token': token }
      });
      setSelectedLayout(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      setError('Failed to load layout details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLayout = async (layoutId) => {
    if (window.confirm('Are you sure you want to delete this warehouse layout?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/dynamic-warehouse/layout/${layoutId}`, {
          headers: { 'x-auth-token': token }
        });
        setSuccess('Warehouse layout deleted successfully!');
        fetchLayouts();
        
        addNotification({
          type: 'info',
          title: 'Layout Deleted',
          message: 'Warehouse layout has been removed',
          timestamp: new Date()
        });
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to delete warehouse layout');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      configuration: {
        numberOfBuildings: 2,
        blocksPerBuilding: 4,
        rowsPerBlock: 4,
        colsPerBlock: 3
      },
      pricing: {
        baseRate: 100,
        ratePerDay: 50,
        ratePerKg: 2
      }
    });
    setActiveStep(0);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!formData.name.trim()) {
        setError('Warehouse name is required');
        return;
      }
    }
    
    if (activeStep === steps.length - 1) {
      handleCreateLayout();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const handleSlotClick = (slot, building, block, layoutId) => {
    // If slot has allocations (occupied or partially filled), show details
    if (slot.allocations && slot.allocations.length > 0) {
      setSelectedSlot({
        ...slot,
        building: building.building,
        block: block.block,
        layoutId
      });
      setSlotDetailsDialogOpen(true);
    } else {
      // Empty slot - open allocation dialog
      setSelectedSlot({
        ...slot,
        building: building.building,
        block: block.block,
        layoutId
      });
      setAllocateDialogOpen(true);
      setAllocationForm({
        customerId: '',
        customerName: '',
        bags: '',
        grainType: '',
        weight: '',
        notes: ''
      });
      // Refresh customer list when opening allocation dialog
      fetchCustomers();
    }
  };
  
  const handleAllocateBags = async () => {
    try {
      if (!allocationForm.customerId || !allocationForm.bags) {
        setError('Please select a customer and enter bag quantity');
        return;
      }
      
      setLoading(true);
      const selectedCustomer = customers.find(c => c._id === allocationForm.customerId);
      const token = localStorage.getItem('token');
      
      await axios.post('/api/dynamic-warehouse/allocate-bags', {
        layoutId: selectedSlot.layoutId,
        building: selectedSlot.building,
        block: selectedSlot.block,
        slotLabel: selectedSlot.slotLabel,
        customerId: allocationForm.customerId,
        customerName: selectedCustomer?.profile?.name || selectedCustomer?.username || 'Unknown Customer',
        bags: parseInt(allocationForm.bags),
        grainType: allocationForm.grainType,
        weight: parseFloat(allocationForm.weight) || 0,
        notes: allocationForm.notes
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setSuccess(`Successfully allocated ${allocationForm.bags} bags to ${selectedSlot.slotLabel}`);
      setAllocateDialogOpen(false);
      handleViewLayout(selectedSlot.layoutId);
      fetchLayouts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to allocate bags');
    } finally {
      setLoading(false);
    }
  };

  const handleDeallocateBags = async (customerId, customerName, bags) => {
    if (!window.confirm(`Are you sure you want to deallocate ${bags} bags from ${customerName}?`)) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post('/api/dynamic-warehouse/deallocate-bags', {
        layoutId: selectedSlot.layoutId,
        building: selectedSlot.building,
        block: selectedSlot.block,
        slotLabel: selectedSlot.slotLabel,
        customerId: customerId,
        bags: parseInt(bags)
      }, {
        headers: { 'x-auth-token': token }
      });

      setSuccess(`Successfully deallocated ${bags} bags from ${customerName}`);
      setSlotDetailsDialogOpen(false);
      handleViewLayout(selectedSlot.layoutId);
      fetchLayouts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to deallocate bags');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalSlots = () => {
    const { numberOfBuildings, blocksPerBuilding, rowsPerBlock, colsPerBlock } = formData.configuration;
    return numberOfBuildings * blocksPerBuilding * rowsPerBlock * colsPerBlock;
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              label="Warehouse Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Configure your warehouse structure. Each block will contain a grid of storage slots.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Buildings"
                  value={formData.configuration.numberOfBuildings}
                  onChange={(e) => setFormData({
                    ...formData,
                    configuration: {
                      ...formData.configuration,
                      numberOfBuildings: parseInt(e.target.value) || 1
                    }
                  })}
                  inputProps={{ min: 1, max: 10 }}
                  helperText="Maximum 10 buildings"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Blocks per Building"
                  value={formData.configuration.blocksPerBuilding}
                  onChange={(e) => setFormData({
                    ...formData,
                    configuration: {
                      ...formData.configuration,
                      blocksPerBuilding: parseInt(e.target.value) || 1
                    }
                  })}
                  inputProps={{ min: 1, max: 26 }}
                  helperText="Maximum 26 blocks (A-Z)"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Rows per Block"
                  value={formData.configuration.rowsPerBlock}
                  onChange={(e) => setFormData({
                    ...formData,
                    configuration: {
                      ...formData.configuration,
                      rowsPerBlock: parseInt(e.target.value) || 1
                    }
                  })}
                  inputProps={{ min: 1, max: 20 }}
                  helperText="Number of rows in each block"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Columns per Block"
                  value={formData.configuration.colsPerBlock}
                  onChange={(e) => setFormData({
                    ...formData,
                    configuration: {
                      ...formData.configuration,
                      colsPerBlock: parseInt(e.target.value) || 1
                    }
                  })}
                  inputProps={{ min: 1, max: 20 }}
                  helperText="Number of columns in each block"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Pricing Configuration
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Pricing Structure:</strong><br />
              • <strong>Monthly Rent:</strong> ₹7 per quintal per month (1 quintal = 100 kg)<br />
              • <strong>Maintenance:</strong> ₹6 per month (flat fee)<br />
              • <strong>Insurance:</strong> ₹5 per year (flat fee)
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Rent per Quintal/Month (₹)"
                  value={formData.pricing.rentPerQuintalPerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: {
                      ...formData.pricing,
                      rentPerQuintalPerMonth: parseFloat(e.target.value) || 0
                    }
                  })}
                  helperText="Per 100kg per month"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maintenance/Month (₹)"
                  value={formData.pricing.maintenancePerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: {
                      ...formData.pricing,
                      maintenancePerMonth: parseFloat(e.target.value) || 0
                    }
                  })}
                  helperText="Flat monthly charge"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Insurance/Year (₹)"
                  value={formData.pricing.insurancePerYear}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: {
                      ...formData.pricing,
                      insurancePerYear: parseFloat(e.target.value) || 0
                    }
                  })}
                  helperText="Annual flat fee"
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Example Calculation:</strong> For 500kg (5 quintals) stored for 1 year 2 months:<br />
                • Rent: ₹7 × 5 quintals × 14 months = ₹490<br />
                • Maintenance: ₹6 × 14 months = ₹84<br />
                • Insurance: ₹5 × 1 year = ₹5<br />
                • <strong>Total: ₹579</strong>
              </Typography>
            </Box>
          </Box>
        );
      
      case 2:
        const totalSlots = calculateTotalSlots();
        const slotsPerBlock = formData.configuration.rowsPerBlock * formData.configuration.colsPerBlock;
        
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Review your warehouse configuration before creating
            </Alert>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {formData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {formData.description || 'No description provided'}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Buildings
                    </Typography>
                    <Typography variant="h6">
                      {formData.configuration.numberOfBuildings}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Blocks per Building
                    </Typography>
                    <Typography variant="h6">
                      {formData.configuration.blocksPerBuilding}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Grid per Block
                    </Typography>
                    <Typography variant="h6">
                      {formData.configuration.rowsPerBlock} × {formData.configuration.colsPerBlock}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Slots per Block
                    </Typography>
                    <Typography variant="h6">
                      {slotsPerBlock}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Total Storage Slots
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {totalSlots}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pricing Structure
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Base Rate
                    </Typography>
                    <Typography variant="h6">
                      ₹{formData.pricing.baseRate}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Daily Rate
                    </Typography>
                    <Typography variant="h6">
                      ₹{formData.pricing.ratePerDay}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Per Kg Rate
                    </Typography>
                    <Typography variant="h6">
                      ₹{formData.pricing.ratePerKg}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        );
      
      default:
        return null;
    }
  };

  if (loading && layouts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            <Warehouse sx={{ mr: 1, verticalAlign: 'middle' }} />
            Dynamic Warehouse Layouts
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create New Layout
          </Button>
        </Box>

        {layouts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <GridOn sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No warehouse layouts found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first warehouse layout with custom configuration
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Layout
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {layouts.map((layout) => (
              <Grid item xs={12} md={6} lg={4} key={layout._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {layout.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {layout.description || 'No description'}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Total Slots
                        </Typography>
                        <Typography variant="h6">
                          {layout.totalSlots}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Occupancy
                        </Typography>
                        <Typography variant="h6">
                          {layout.occupancy?.occupancyRate}%
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            size="small"
                            label={`${layout.configuration.numberOfBuildings} Buildings`}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`${layout.configuration.blocksPerBuilding} Blocks/Building`}
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Grid: {layout.configuration.rowsPerBlock} × {layout.configuration.colsPerBlock}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewLayout(layout._id)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download JSON">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleDownloadJSON(layout._id, layout.name)}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Layout">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteLayout(layout._id)}
                          disabled={layout.occupiedSlots > 0}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Create Layout Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create Warehouse Layout
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {renderStepContent(activeStep)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            {activeStep === steps.length - 1 ? 'Create Layout' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Layout Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedLayout?.warehouse?.name}
        </DialogTitle>
        <DialogContent>
          {selectedLayout && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Total Slots: {selectedLayout.warehouse.totalSlots} | 
                  Occupied: {selectedLayout.warehouse.occupiedSlots} | 
                  Available: {selectedLayout.warehouse.totalSlots - selectedLayout.warehouse.occupiedSlots} | 
                  Occupancy: {selectedLayout.occupancy.occupancyRate}%
                </Typography>
              </Alert>

              {selectedLayout.warehouse.layout.map((building, bIdx) => (
                <Box key={bIdx} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ bgcolor: 'primary.light', color: 'white', p: 1, borderRadius: 1 }}>
                    {building.building}
                  </Typography>
                  
                  {building.blocks.map((block, blIdx) => (
                    <Box key={blIdx} sx={{ mb: 3 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            Block {block.block}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            {block.rows} rows × {block.cols} columns | 
                            Occupied: {block.slots.filter(s => s.isOccupied).length} / {block.slots.length}
                          </Typography>
                          
                          {/* Slot Grid */}
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: `repeat(${block.cols}, 1fr)`,
                            gap: 1,
                            mt: 2
                          }}>
                            {block.slots.map((slot, sIdx) => {
                              const fillPercentage = slot.capacity > 0 ? (slot.filledBags / slot.capacity) * 100 : 0;
                              const getSlotColor = () => {
                                if (slot.status === 'empty') return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' };
                                if (slot.status === 'partially-filled') return { bg: '#fff3e0', border: '#ff9800', text: '#e65100' };
                                if (slot.status === 'full') return { bg: '#ffebee', border: '#f44336', text: '#c62828' };
                                return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' };
                              };
                              const colors = getSlotColor();
                              
                              return (
                                <Box
                                  key={sIdx}
                                  onClick={() => handleSlotClick(slot, building, block, selectedLayout.warehouse._id)}
                                  sx={{
                                    border: 2,
                                    borderColor: colors.border,
                                    bgcolor: colors.bg,
                                    p: 1,
                                    textAlign: 'center',
                                    borderRadius: 1,
                                    minHeight: '90px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      boxShadow: 3
                                    }
                                  }}
                                >
                                  <Typography variant="body2" fontWeight="bold" color={colors.text}>
                                    {slot.slotLabel}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                    R{slot.row}C{slot.col}
                                  </Typography>
                                  
                                  <Box sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold', color: colors.text }}>
                                      {slot.filledBags || 0}/{slot.capacity || 2000}
                                    </Typography>
                                    <Box sx={{ 
                                      width: '100%', 
                                      height: 4, 
                                      bgcolor: 'grey.300', 
                                      borderRadius: 1,
                                      mt: 0.5,
                                      overflow: 'hidden'
                                    }}>
                                      <Box sx={{ 
                                        width: `${fillPercentage}%`, 
                                        height: '100%', 
                                        bgcolor: colors.border,
                                        transition: 'width 0.3s'
                                      }} />
                                    </Box>
                                  </Box>
                                  
                                  <Typography variant="caption" sx={{ fontSize: '0.58rem', color: colors.text, fontWeight: 'bold', mt: 0.5 }}>
                                    {slot.status?.toUpperCase() || 'EMPTY'}
                                  </Typography>
                                  
                                  {slot.allocations && slot.allocations.length > 0 && (
                                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', mt: 0.3 }}>
                                      {slot.allocations.length} customer{slot.allocations.length > 1 ? 's' : ''}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Slot Details Dialog - Show customers in filled slots */}
      <Dialog 
        open={slotDetailsDialogOpen} 
        onClose={() => setSlotDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Slot {selectedSlot?.slotLabel} - Customer Details
        </DialogTitle>
        <DialogContent>
          {selectedSlot && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" component="div">
                  <strong>Location:</strong> {selectedSlot.building} - {selectedSlot.block} - Row {selectedSlot.row}, Col {selectedSlot.col}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Total Capacity:</strong> {selectedSlot.capacity || 2000} bags
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Filled:</strong> {selectedSlot.filledBags || 0} bags ({((selectedSlot.filledBags || 0) / (selectedSlot.capacity || 2000) * 100).toFixed(1)}%)
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Available:</strong> {(selectedSlot.capacity || 2000) - (selectedSlot.filledBags || 0)} bags
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Status:</strong> <Chip size="small" label={selectedSlot.status?.toUpperCase() || 'EMPTY'} 
                    color={selectedSlot.status === 'full' ? 'error' : selectedSlot.status === 'partially-filled' ? 'warning' : 'success'} 
                  />
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Customers Stored in This Slot
              </Typography>

              {selectedSlot.allocations && selectedSlot.allocations.length > 0 ? (
                <Grid container spacing={2}>
                  {selectedSlot.allocations.map((allocation, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Card variant="outlined" sx={{ 
                        borderLeft: 4, 
                        borderColor: 'primary.main',
                        '&:hover': { boxShadow: 3 }
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                            <Box>
                              <Typography variant="h6" color="primary">
                                {allocation.customerName || 'Unknown Customer'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Allocated on: {allocation.entryDate ? new Date(allocation.entryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not available'}
                              </Typography>
                            </Box>
                            <Chip 
                              label={`${allocation.bags} bags`} 
                              color="primary" 
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Number of Bags:</strong>
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {allocation.bags} bags
                              </Typography>
                            </Grid>

                            {allocation.grainType && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Grain Type:</strong>
                                </Typography>
                                <Typography variant="body1">
                                  {allocation.grainType}
                                </Typography>
                              </Grid>
                            )}

                            {allocation.weight && allocation.weight > 0 && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Weight:</strong>
                                </Typography>
                                <Typography variant="body1">
                                  {allocation.weight} kg
                                </Typography>
                              </Grid>
                            )}

                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Customer ID:</strong>
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {allocation.customerId}
                              </Typography>
                            </Grid>

                            {allocation.notes && (
                              <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Notes:</strong>
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                  bgcolor: 'grey.100', 
                                  p: 1.5, 
                                  borderRadius: 1,
                                  fontStyle: 'italic'
                                }}>
                                  {allocation.notes}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>

                          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleDeallocateBags(
                                allocation.customer._id || allocation.customer, 
                                allocation.customerName, 
                                allocation.bags
                              )}
                            >
                              Deallocate All ({allocation.bags} bags)
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  No customer allocations found for this slot.
                </Alert>
              )}

              {selectedSlot.status !== 'full' && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="success">
                    <Typography variant="body2">
                      <strong>Available Space:</strong> {(selectedSlot.capacity || 2000) - (selectedSlot.filledBags || 0)} bags still available in this slot.
                    </Typography>
                  </Alert>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    sx={{ mt: 2 }}
                    onClick={() => {
                      setSlotDetailsDialogOpen(false);
                      setAllocateDialogOpen(true);
                      setAllocationForm({
                        customerId: '',
                        customerName: '',
                        bags: '',
                        grainType: '',
                        weight: '',
                        notes: ''
                      });
                      fetchCustomers();
                    }}
                  >
                    Add More Bags to This Slot
                  </Button>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotDetailsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Allocation Dialog */}
      <Dialog 
        open={allocateDialogOpen} 
        onClose={() => setAllocateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Allocate Bags to Slot {selectedSlot?.slotLabel}
        </DialogTitle>
        <DialogContent>
          {selectedSlot && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Current Capacity:</strong> {selectedSlot.filledBags || 0} / {selectedSlot.capacity || 2000} bags
              </Typography>
              <Typography variant="body2">
                <strong>Available Space:</strong> {(selectedSlot.capacity || 2000) - (selectedSlot.filledBags || 0)} bags
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {selectedSlot.status?.toUpperCase() || 'EMPTY'}
              </Typography>
              <Typography variant="body2">
                <strong>Location:</strong> {selectedSlot.building} - {selectedSlot.block} - Row {selectedSlot.row}, Col {selectedSlot.col}
              </Typography>
            </Alert>
          )}

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Customer *</InputLabel>
            <Select
              value={allocationForm.customerId}
              onChange={(e) => {
                const customer = customers.find(c => c._id === e.target.value);
                setAllocationForm({
                  ...allocationForm,
                  customerId: e.target.value,
                  customerName: customer ? customer.profile?.name || customer.username : ''
                });
              }}
              label="Select Customer *"
            >
              <MenuItem value="">
                <em>-- Select a customer --</em>
              </MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer._id} value={customer._id}>
                  {customer.profile?.name || customer.username} ({customer.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Number of Bags *"
            type="number"
            value={allocationForm.bags}
            onChange={(e) => setAllocationForm({ ...allocationForm, bags: e.target.value })}
            sx={{ mt: 2 }}
            inputProps={{ 
              min: 1, 
              max: selectedSlot ? (selectedSlot.capacity || 2000) - (selectedSlot.filledBags || 0) : 2000 
            }}
            helperText={`Maximum: ${selectedSlot ? (selectedSlot.capacity || 2000) - (selectedSlot.filledBags || 0) : 2000} bags available`}
          />

          <TextField
            fullWidth
            label="Grain Type"
            value={allocationForm.grainType}
            onChange={(e) => setAllocationForm({ ...allocationForm, grainType: e.target.value })}
            sx={{ mt: 2 }}
            placeholder="e.g., Wheat, Rice, Corn"
          />

          <TextField
            fullWidth
            label="Weight (kg)"
            type="number"
            value={allocationForm.weight}
            onChange={(e) => setAllocationForm({ ...allocationForm, weight: e.target.value })}
            sx={{ mt: 2 }}
            inputProps={{ min: 0, step: 0.01 }}
            helperText="Optional: Total weight of the bags"
          />

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={allocationForm.notes}
            onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
            sx={{ mt: 2 }}
            placeholder="Any additional information..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAllocateBags}
            disabled={!allocationForm.customerId || !allocationForm.bags || allocationForm.bags <= 0}
          >
            Allocate Bags
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DynamicWarehouseLayoutManager;
