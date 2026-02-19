import React, { useState, useRef, useEffect } from 'react';
import {
  Fab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Typography, Box, Paper, Avatar, CircularProgress, Chip, Tooltip, Badge
} from '@mui/material';
import {
  SmartToy, Send, Close, Mic, MicOff, ContentCopy, Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI Warehouse Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        message: userMessage,
        context: {
          userRole: user?.role,
          userId: user?._id,
          username: user?.username
        }
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.data?.reply || response.data.response || response.data.message || 'I received your query but couldn\'t generate a response.'
      }]);
    } catch (error) {
      console.error('AI Chat error:', error);
      // Provide fallback response when AI engine is down
      const fallbackResponse = getFallbackResponse(userMessage, user?.role);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackResponse = (query, role) => {
    const q = query.toLowerCase();
    if (role === 'owner') {
      if (q.includes('revenue') || q.includes('income')) return 'To view revenue details, go to the Analytics tab in your dashboard. You can see revenue trends, financial reports, and export them as PDF.';
      if (q.includes('customer') && q.includes('risk')) return 'Check the Loan Portfolio section for customer risk assessments. The AI Loan Risk Agent evaluates each customer\'s default probability.';
      if (q.includes('warehouse') && (q.includes('full') || q.includes('capacity'))) return 'Visit the Warehouse Layout tab to see current capacity. The AI Inventory Agent can predict overflow situations.';
      if (q.includes('vehicle')) return 'Vehicle information is available in the Vehicle Management tab. Use the Weigh Bridge for vehicle entry and weighing.';
      if (q.includes('loan')) return 'The Loan Portfolio tab shows all pending approvals, active loans, and customer loan statuses.';
      return 'I can help with warehouse analytics, customer management, vehicle tracking, loans, and predictions. The AI Engine needs to be running for advanced insights. What would you like to know?';
    } else {
      if (q.includes('loan') && q.includes('how much')) return 'Check the Loan Calculator tab to see your eligibility. It\'s based on the value of grains you have stored.';
      if (q.includes('sell') || q.includes('price')) return 'Visit the Market & Predictions tab for live market prices and AI-powered selling recommendations.';
      if (q.includes('storage') && q.includes('cost')) return 'Your storage costs are shown in the Grain Locations tab. You can see per-grain breakdowns there.';
      if (q.includes('vacate') || q.includes('leave')) return 'Go to My Requests tab and submit a "Vacate Warehouse" request with the grains you want to move.';
      return 'I can help with your grain storage, market prices, loan information, and predictions. What would you like to know?';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <Tooltip title="AI Assistant" placement="left">
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4299 100%)' },
            width: 64,
            height: 64
          }}
        >
          <SmartToy sx={{ fontSize: 32 }} />
        </Fab>
      </Tooltip>

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: 700,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy />
            <Box>
              <Typography variant="h6" fontWeight="bold">AI Assistant</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {user?.role === 'owner' ? 'Owner Mode' : 'Customer Mode'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f8f9fa' }}>
          {messages.map((msg, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 2
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, maxWidth: '85%', alignItems: 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <Avatar sx={{
                    bgcolor: '#764ba2',
                    width: 32,
                    height: 32,
                    mt: 0.5
                  }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? '#1976d2' : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    position: 'relative'
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {msg.content}
                  </Typography>
                  {msg.role === 'assistant' && (
                    <IconButton
                      size="small"
                      onClick={() => copyMessage(msg.content)}
                      sx={{ position: 'absolute', top: 2, right: 2, opacity: 0.5, '&:hover': { opacity: 1 } }}
                    >
                      <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Paper>
                {msg.role === 'user' && (
                  <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32, mt: 0.5 }}>
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                )}
              </Box>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#764ba2', width: 32, height: 32 }}>
                <SmartToy sx={{ fontSize: 18 }} />
              </Avatar>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Thinking...</Typography>
                </Box>
              </Paper>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', width: '100%', gap: 1 }}>
            <IconButton
              onClick={toggleListening}
              color={isListening ? 'error' : 'default'}
              sx={{
                animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.4)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' }
                }
              }}
            >
              {isListening ? <MicOff /> : <Mic />}
            </IconButton>
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={3}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3
                }
              }}
            />
            <IconButton
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              color="primary"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: '#e0e0e0' }
              }}
            >
              <Send />
            </IconButton>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIChat;
