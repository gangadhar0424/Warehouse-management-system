import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tab,
  Tabs,
  Paper
} from '@mui/material';

// Import all worker dashboard components
import DailyTaskBoard from '../components/DailyTaskBoard';
import VehicleQueueManager from '../components/VehicleQueueManager';
import WeighBridgeInterface from '../components/WeighBridgeInterface';
import LoadingOperationsTracker from '../components/LoadingOperationsTracker';
import PaymentCollectionInterface from '../components/PaymentCollectionInterface';
import QualityInspectionForm from '../components/QualityInspectionForm';
import WorkerPerformanceMetrics from '../components/WorkerPerformanceMetrics';
import EquipmentManagementPanel from '../components/EquipmentManagementPanel';
import SafetyComplianceChecker from '../components/SafetyComplianceChecker';
import InventorySpotCheck from '../components/InventorySpotCheck';
import WorkerCommunicationCenter from '../components/WorkerCommunicationCenter';
import AttendancePayrollTracker from '../components/AttendancePayrollTracker';
import TrainingKnowledgeBase from '../components/TrainingKnowledgeBase';

const WorkerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Worker Dashboard
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Daily Tasks" />
            <Tab label="Vehicle Queue" />
            <Tab label="Weigh Bridge" />
            <Tab label="Loading Operations" />
            <Tab label="Payment Collection" />
            <Tab label="Quality Inspection" />
            <Tab label="Performance Metrics" />
            <Tab label="Equipment Management" />
            <Tab label="Safety Compliance" />
            <Tab label="Inventory Spot Check" />
            <Tab label="Communication" />
            <Tab label="Attendance & Payroll" />
            <Tab label="Training & Knowledge" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <DailyTaskBoard />}
          {activeTab === 1 && <VehicleQueueManager />}
          {activeTab === 2 && <WeighBridgeInterface />}
          {activeTab === 3 && <LoadingOperationsTracker />}
          {activeTab === 4 && <PaymentCollectionInterface />}
          {activeTab === 5 && <QualityInspectionForm />}
          {activeTab === 6 && <WorkerPerformanceMetrics />}
          {activeTab === 7 && <EquipmentManagementPanel />}
          {activeTab === 8 && <SafetyComplianceChecker />}
          {activeTab === 9 && <InventorySpotCheck />}
          {activeTab === 10 && <WorkerCommunicationCenter />}
          {activeTab === 11 && <AttendancePayrollTracker />}
          {activeTab === 12 && <TrainingKnowledgeBase />}
        </Box>
      </Paper>
    </Container>
  );
};

export default WorkerDashboard;
