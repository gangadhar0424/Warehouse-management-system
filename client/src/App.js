import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WeighBridge from './pages/WeighBridge';
import OwnerDashboard from './pages/OwnerDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import VehicleManagement from './pages/VehicleManagement';
import TransactionManagement from './pages/TransactionManagement';
import UserProfile from './pages/UserProfile';
import WorkerBagTracking from './pages/WorkerBagTracking';
import CustomerGrainManagement from './pages/CustomerGrainManagement';
import PaymentManagement from './pages/PaymentManagement';
import './App.css';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
      light: '#42a5f5'
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Navbar />
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/weigh-bridge" element={
                  <ProtectedRoute>
                    <Navbar />
                    <WeighBridge />
                  </ProtectedRoute>
                } />
                <Route path="/owner-dashboard" element={
                  <ProtectedRoute>
                    <Navbar />
                    <OwnerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/customer-dashboard" element={
                  <ProtectedRoute>
                    <Navbar />
                    <CustomerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/worker-dashboard" element={
                  <ProtectedRoute>
                    <Navbar />
                    <WorkerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/vehicles" element={
                  <ProtectedRoute>
                    <Navbar />
                    <VehicleManagement />
                  </ProtectedRoute>
                } />
                <Route path="/transactions" element={
                  <ProtectedRoute>
                    <Navbar />
                    <TransactionManagement />
                  </ProtectedRoute>
                } />
                <Route path="/worker-tracking" element={
                  <ProtectedRoute>
                    <Navbar />
                    <WorkerBagTracking />
                  </ProtectedRoute>
                } />
                <Route path="/customer-grain" element={
                  <ProtectedRoute>
                    <Navbar />
                    <CustomerGrainManagement />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Navbar />
                    <UserProfile />
                  </ProtectedRoute>
                } />
                <Route path="/payments" element={
                  <ProtectedRoute>
                    <Navbar />
                    <PaymentManagement />
                  </ProtectedRoute>
                } />
                
                {/* Default Route - Redirect to login */}
                <Route path="/" element={<Login />} />
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
