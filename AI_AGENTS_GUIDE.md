# AI Agent Quick Reference Guide

## 🤖 Available AI Agents

### 1. Master AI Chatbot 💬
**Purpose**: Natural language interface for business insights

**Endpoint**: `POST /api/ai/chat`

**Example Queries**:

**For Owners:**
```
- "Show me today's revenue"
- "Which customers have pending payments?"
- "How many vehicles are currently inside?"
- "List top 5 customers by storage value"
- "What's the occupancy rate of my warehouses?"
```

**For Customers:**
```
- "How much total have I spent?"
- "Show my active loans"
- "When should I sell my wheat?"
- "What's my loan eligibility?"
- "How many bags of rice do I have stored?"
```

**Request Format**:
```json
{
  "query": "Your question here"
}
```

**Response**:
```json
{
  "success": true,
  "response": "AI-generated answer with data",
  "contextUsed": ["transactionCount", "customerCount"]
}
```

---

### 2. Loan Risk & Credit Agent 💰
**Purpose**: Smart loan approval with risk assessment

**Endpoint**: `POST /api/ai/loan-risk-assessment`

**Request**:
```json
{
  "customerId": "customer_id_here",
  "loanAmount": 50000,
  "duration": 12,
  "purpose": "business expansion",
  "collateralValue": 80000
}
```

**Response Example**:
```json
{
  "success": true,
  "riskAssessment": {
    "riskScore": 35,
    "riskLevel": "LOW",
    "recommendation": "APPROVE",
    "reasoning": "Customer has excellent payment history...",
    "suggestedInterestRate": "10%",
    "approvalConfidence": "HIGH"
  },
  "customerHistory": {
    "totalTransactions": 45,
    "totalPaid": 250000,
    "pendingPayments": 0,
    "activeLoans": 1,
    "paymentDelays": 0,
    "storageDuration": 18
  }
}
```

**Interpretation**:
- **Risk Score**: 0-30 (LOW), 31-70 (MEDIUM), 71-100 (HIGH)
- **Recommendation**: APPROVE | REDUCE | REJECT
- Display this in owner's loan approval interface

---

### 3. Market Pricing & Selling Advisor Agent 📈
**Purpose**: Price prediction and selling recommendations

**Endpoint**: `POST /api/ai/market-prediction`

**Request**:
```json
{
  "grainType": "rice",
  "customerId": "optional_customer_id"
}
```

**Response Example**:
```json
{
  "success": true,
  "prediction": {
    "7dayPrediction": 1650,
    "14dayPrediction": 1620,
    "30dayPrediction": 1580,
    "trend": "DOWN",
    "recommendation": "SELL NOW",
    "expectedProfitLoss": "-3.2%",
    "reasoning": "Market analysis indicates prices dropping...",
    "alertLevel": "HIGH"
  },
  "currentMarketData": {
    "current_price": 1600,
    "market_volume": "HIGH"
  },
  "customerGrainValue": "₹245000.00"
}
```

**Use Cases**:
- Show in Predictions tab for owners
- Show in Market & Predictions for customers
- Send alerts when recommendation is "SELL NOW"
- Auto-refresh every 5 minutes

---

### 4. Inventory Intelligence Agent 📦
**Purpose**: Warehouse space optimization

**Endpoint**: `POST /api/ai/inventory-optimization`

**Request**: No body needed (analyzes current state)

**Response Example**:
```json
{
  "success": true,
  "optimization": {
    "efficiency": "85%",
    "predictions": [
      {
        "slot": "B1-A-R2C3",
        "status": "Reaching 95% in 3 days",
        "action": "Plan allocation elsewhere"
      }
    ],
    "recommendations": [
      "Slot B2-C-R1C1 is optimal for next rice allocation",
      "Building 1 utilization: 92% - Consider expanding"
    ],
    "warnings": [
      "Block A showing inefficient usage (45% fragmentation)"
    ]
  },
  "currentState": {
    "totalWarehouses": 2,
    "totalSlots": 96,
    "avgOccupancy": "78.50%"
  }
}
```

**Display Location**: 
- Add "AI Insights" button in Warehouse Layout tab
- Show predictions as cards with color-coded alerts

---

### 5. Weighbridge Optimization Agent ⚖️
**Purpose**: Fraud detection and operational efficiency

**Endpoint**: `POST /api/ai/weighbridge-analysis`

**Request**: No body needed

**Response Example**:
```json
{
  "success": true,
  "analysis": {
    "anomalies": [
      {
        "vehicleNumber": "AP31XX9876",
        "issue": "Empty weight variance 15%",
        "severity": "HIGH",
        "description": "Possible manipulation detected",
        "recommendation": "Manual verification required"
      }
    ],
    "peakTimes": ["09:00-11:00", "14:00-16:00"],
    "averageProcessingTime": "12 minutes",
    "efficiency": "GOOD"
  },
  "stats": {
    "totalWeighings": 45,
    "completedWeighings": 42,
    "partialWeighings": 3
  }
}
```

**Display Location**:
- Add "AI Analysis" button in Weighbridge module
- Show fraud alerts in red
- Display peak times for planning

---

### 6. Anomaly & Fraud Detection Agent 🚨
**Purpose**: System-wide security and fraud prevention

**Endpoint**: `POST /api/ai/fraud-detection`

**Request**:
```json
{
  "analysisType": "transactions",
  "lookbackDays": 30
}
```

**Response Example**:
```json
{
  "success": true,
  "anomalies": [
    {
      "type": "DUPLICATE_PAYMENT",
      "severity": "HIGH",
      "description": "Payment ₹25,000 appears twice from same customer",
      "affectedTransactions": ["txn_123", "txn_124"],
      "recommendation": "Verify with customer immediately"
    },
    {
      "type": "UNUSUAL_TIMING",
      "severity": "MEDIUM",
      "description": "3 large transactions at 2 AM",
      "recommendation": "Review authorization logs"
    }
  ],
  "analysis": {
    "transactionsAnalyzed": 156,
    "period": "Last 30 days",
    "anomaliesFound": 2
  }
}
```

**Display Location**:
- Alerts Center in owner dashboard
- Auto-send email alerts for HIGH severity
- Show anomaly count badge on alerts icon

---

### 7. Demand & Storage Duration Prediction Agent ⏳
**Purpose**: Customer behavior prediction and capacity planning

**Endpoint**: `POST /api/ai/storage-duration-prediction`

**Request**:
```json
{
  "customerId": "customer_id_here",
  "grainType": "wheat"
}
```

**Response Example**:
```json
{
  "success": true,
  "prediction": {
    "predictedDuration": 5.2,
    "unit": "months",
    "optimalVacateDate": "2026-07-20",
    "marketPriceAtThatTime": 1750,
    "expectedProfit": "₹85000",
    "confidence": 78,
    "reasoning": "Based on past 6 storage cycles, typically stores wheat until harvest season..."
  },
  "historicalData": {
    "previousStorages": 6,
    "avgDuration": "5.2 months"
  }
}
```

**Use Cases**:
- Show in Analytics section for owners
- Help customers decide when to vacate
- Capacity planning for owners

---

## 🎯 Integration Examples

### Example 1: Chatbot Widget (React Component)

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function AIChatbot() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/ai/chat', 
        { query },
        { headers: { 'x-auth-token': token } }
      );
      setResponse(res.data.response);
    } catch (error) {
      console.error(error);
      setResponse('Error processing query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chatbot">
      <form onSubmit={handleSubmit}>
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask me anything..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
      {response && (
        <div className="ai-response">{response}</div>
      )}
    </div>
  );
}
```

### Example 2: Loan Risk Assessment in Approval Flow

```jsx
async function evaluateLoanRequest(loanRequest) {
  const token = localStorage.getItem('token');
  
  const response = await axios.post('/api/ai/loan-risk-assessment', {
    customerId: loanRequest.customerId,
    loanAmount: loanRequest.amount,
    duration: loanRequest.duration,
    purpose: loanRequest.purpose,
    collateralValue: loanRequest.collateralValue
  }, {
    headers: { 'x-auth-token': token }
  });

  const { riskAssessment } = response.data;
  
  // Display risk score with color coding
  const riskColor = 
    riskAssessment.riskLevel === 'LOW' ? 'green' :
    riskAssessment.riskLevel === 'MEDIUM' ? 'orange' : 'red';
  
  return (
    <div className="risk-assessment">
      <h3>AI Risk Assessment</h3>
      <div className={`risk-score ${riskColor}`}>
        Risk Score: {riskAssessment.riskScore}/100
      </div>
      <p>Recommendation: {riskAssessment.recommendation}</p>
      <p>{riskAssessment.reasoning}</p>
    </div>
  );
}
```

### Example 3: Voice Input for Chatbot

```jsx
function VoiceChatbot() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognition = new (window.SpeechRecognition || window.webkitSpeechecognition)();
  recognition.continuous = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    setTranscript(text);
    // Auto-submit the query
    submitQuery(text);
  };

  const startListening = () => {
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    recognition.stop();
  };

  return (
    <div>
      <button onClick={isListening ? stopListening : startListening}>
        {isListening ? '🎤 Listening...' : '🎤 Speak'}
      </button>
      <p>{transcript}</p>
    </div>
  );
}
```

---

## 🔔 Alert Triggers

### When to Call Each Agent:

| Agent | Trigger | Frequency |
|-------|---------|-----------|
| Chatbot | User clicks chat icon | On demand |
| Loan Risk | Loan approval review | Per request |
| Market Prediction | Page load + auto-refresh | Every 5 minutes |
| Inventory Optimization | Warehouse layout view | Daily + on demand |
| Weighbridge Analysis | Weighing completion | Per weighing |
| Fraud Detection | New transaction entry | Daily scan |
| Storage Duration | Customer allocation | Per allocation |

---

## 🎨 UI/UX Recommendations

### 1. Chatbot Placement
- Floating button (bottom-right corner)
- Icon: 🤖 or custom AI assistant icon
- Badge for unread AI suggestions

### 2. Risk Assessment Display
- Traffic light colors (🟢🟡🔴)
- Large, bold risk score
- Expandable reasoning section

### 3. Market Predictions
- Line chart showing predictions
- Color-coded recommendations
  - SELL NOW: Red with urgency indicator
  - HOLD: Yellow  
  - WAIT: Green
- Auto-update indicator

### 4. Fraud Alerts
- Toast notifications for HIGH severity
- Dedicated alerts panel
- Action buttons (Verify/Dismiss)

---

## 🔐 Security Considerations

1. **Role-Based Access**: Always check `req.user.role` before providing data
2. **Data Isolation**: Customers only see their own data
3. **Rate Limiting**: Implement rate limits on AI endpoints to prevent abuse
4. **API Key Security**: Never expose GEMINI_API_KEY in frontend

---

## 📊 Performance Tips

1. **Cache Predictions**: Store market predictions for 5 minutes to reduce API calls
2. **Batch Requests**: If asking multiple questions, batch them
3. **Lazy Load**: Load AI insights only when users click "AI Analysis" buttons
4. **Background Processing**: Run fraud detection as a cron job, not on every request

---

## 🧪 Testing AI Agents

### Test Chatbot:
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{"query":"Show me total revenue"}'
```

### Test Loan Risk:
```bash
curl -X POST http://localhost:5000/api/ai/loan-risk-assessment \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "loanAmount": 50000,
    "duration": 12,
    "purpose": "business",
    "collateralValue": 80000
  }'
```

---

**Note**: All AI responses are generated by Google's Gemini AI. Response quality depends on:
- Quality of input data
- Prompt engineering
- Historical data availability
- API rate limits

For best results, ensure your database has sufficient historical data for accurate predictions.

---

Last Updated: February 18, 2026
