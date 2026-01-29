import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff, Business, Person, Engineering } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('owner');
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  const validateEmailOrUsername = (input) => {
    // If input contains @, treat it as email and validate
    if (input.includes('@')) {
      // Check if @ is not at the beginning or end
      const atIndex = input.indexOf('@');
      if (atIndex === 0 || atIndex === input.length - 1) {
        setEmailError('Invalid email format');
        return false;
      }
    }
    // If no @, treat as username - no validation needed
    setEmailError('');
    return true;
  };

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase) {
      setPasswordError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!hasLowerCase) {
      setPasswordError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!hasNumber) {
      setPasswordError('Password must contain at least one number');
      return false;
    }
    if (!hasSpecialChar) {
      setPasswordError('Password must contain at least one special character (!@#$%^&*...)');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear errors when user types
    if (name === 'login') {
      setEmailError('');
    }
    if (name === 'password') {
      setPasswordError('');
    }
  };

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setSelectedRole(newRole);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate email or username
    if (!validateEmailOrUsername(formData.login)) {
      return;
    }

    // Validate password
    if (!validatePassword(formData.password)) {
      return;
    }

    setLoading(true);

    const result = await login(formData);
    
    if (result.success) {
      // Check if user data exists
      if (!result.user || !result.user.role) {
        setError('Login error: User data not received');
        setLoading(false);
        return;
      }
      
      // Check if user's role matches selected role
      if (result.user.role !== selectedRole) {
        setError(`Invalid credentials for ${selectedRole} login. This account is registered as a ${result.user.role}.`);
        setLoading(false);
        // Logout the user since role doesn't match
        return;
      }
      
      // Navigate to role-specific dashboard
      const roleDashboard = {
        owner: '/owner-dashboard',
        customer: '/customer-dashboard'
      };
      navigate(roleDashboard[result.user.role], { replace: true });
    } else {
      setError(result.message || 'Invalid credentials');
    }
    
    setLoading(false);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            Warehouse Management System
          </Typography>
          <Typography component="h2" variant="h5" color="primary" gutterBottom>
            Sign In
          </Typography>

          {/* Role Selection Buttons */}
          <Box sx={{ width: '100%', mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 2 }}>
              Select Login Type
            </Typography>
            <ToggleButtonGroup
              value={selectedRole}
              exclusive
              onChange={handleRoleChange}
              aria-label="login role"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="owner" aria-label="owner login">
                <Business sx={{ mr: 1 }} />
                Owner
              </ToggleButton>
              <ToggleButton value="customer" aria-label="customer login">
                <Person sx={{ mr: 1 }} />
                Customer
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider sx={{ width: '100%', mb: 2 }} />

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="login"
              label="Email or Username"
              name="login"
              autoComplete="username"
              autoFocus
              value={formData.login}
              onChange={handleChange}
              disabled={loading}
              error={!!emailError}
              helperText={emailError || 'Enter your email or username'}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              error={!!passwordError}
              helperText={passwordError || 'Must contain uppercase, lowercase, number & special character'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : `Sign In as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;