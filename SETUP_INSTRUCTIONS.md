# Warehouse Management System - Setup Instructions

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Gmail account (for email functionality)
- Google Gemini API key (for AI features)

---

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your credentials:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/warehouse-management
PORT=5000

# JWT Configuration
JWT_SECRET=your_generated_secret_key_minimum_32_characters
JWT_EXPIRE=7d

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Gemini AI API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend URL
CLIENT_URL=http://localhost:3000
```

### 3. Set Up Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security**
3. Enable **2-Step Verification** (if not already enabled)
4. Under "2-Step Verification", find **App passwords**
5. Create a new app password for "Mail"
6. Copy the generated password and paste it as `EMAIL_PASS` in your `.env` file

### 4. Get Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key and paste it as `GEMINI_API_KEY` in your `.env` file

### 5. Start MongoDB

**Windows:**
```bash
# If MongoDB installed as service
net start MongoDB

# Or run manually
mongod --dbpath="C:\data\db"
```

**macOS/Linux:**
```bash
# If installed via brew
brew services start mongodb-community

# Or run manually
mongod --dbpath=/usr/local/var/mongodb
```

### 6. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 🔐 Default Login Credentials

After first setup, you'll need to create an owner account through the register page.

**Register as Owner:**
1. Go to http://localhost:3000/register
2. Fill in details
3. Select role: "Warehouse Owner"
4. Click "Sign Up"

---

## 📦 What's New in This Update

### ✅ Completed Features:

#### 1. **Updated Owner Dashboard Metrics**
   - Total Vehicles: Now correctly shows all vehicles (weighing + loading/unloading)
   - Currently Inside: Only vehicles for loading/unloading
   - Total Entries: Completed in/out transactions
   - Currency: All amounts display in ₹ (Rupees)

#### 2. **Excel Export for Users**
   - Changed from CSV to Excel format
   - Includes join date for all users
   - Includes left date for customers who vacated warehouse
   - Shows both owners and customers

#### 3. **AI Agent Infrastructure** 
   - **Master AI Chatbot**: Natural language queries for owners & customers
   - **Loan Risk Agent**: AI-powered loan approval recommendations
   - **Market Prediction Agent**: Price predictions for grains (7, 14, 30 days)
   - **Inventory Optimization Agent**: Warehouse space optimization suggestions
   - **Fraud Detection Agent**: Anomaly detection in transactions & weighbridge
   - **Storage Duration Agent**: Predict how long customers will store grains
   - **Weighbridge Analysis Agent**: Detect weight manipulation & fraud

---

## 🛠️ Using AI Features

### Master Chatbot

**Endpoint**: `POST /api/ai/chat`

**Example Request** (using Postman or frontend):
```json
{
  "query": "Show me revenue for this month"
}
```

**Owner Queries You Can Ask:**
- "How many vehicles entered today?"
- "Which customers have pending payments?"
- "Show me total revenue this month"
- "List customers with highest loan risks"

**Customer Queries You Can Ask:**
- "How much loan can I still take?"
- "What's my total storage cost?"
- "When should I sell my rice?"
- "Show my transaction history"

### Loan Risk Assessment

**Endpoint**: `POST /api/ai/loan-risk-assessment`

**Example**:
```json
{
  "customerId": "customer_id_here",
  "loanAmount": 50000,
  "duration": 12,
  "purpose": "business expansion",
  "collateralValue": 80000
}
```

**Returns**:
- Risk Score (0-100)
- Risk Level (LOW/MEDIUM/HIGH)
- Recommendation (APPROVE/REDUCE/REJECT)
- Suggested loan adjustments

### Market Price Prediction

**Endpoint**: `POST /api/ai/market-prediction`

**Example**:
```json
{
  "grainType": "rice",
  "customerId": "optional_customer_id"
}
```

**Returns**:
- 7-day price prediction
- 14-day price prediction
- 30-day price prediction
- Recommendation: SELL NOW / HOLD / WAIT
- Expected profit/loss

### Inventory Optimization

**Endpoint**: `POST /api/ai/inventory-optimization`

**Provides**:
- Slot utilization efficiency
- Predicted overflow slots
- Best slot allocation recommendations
- Capacity planning suggestions

### Fraud Detection

**Endpoint**: `POST /api/ai/fraud-detection`

**Example**:
```json
{
  "analysisType": "transactions",
  "lookbackDays": 30
}
```

**Detects**:
- Duplicate payments
- Suspicious patterns
- Weight-payment mismatches
- Unusual timing

---

## 🧪 Testing AI Features

You can test AI endpoints using:

### Option 1: Using cURL

```bash
# Login first to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Use the token in subsequent requests
export TOKEN="your_jwt_token_here"

# Test AI Chatbot
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $TOKEN" \
  -d '{"query":"Show me total revenue"}'
```

### Option 2: Using Postman

1. Import the endpoints
2. Set `x-auth-token` header with your JWT token
3. Send requests to test each AI agent

---

## 📱 Frontend Integration (Coming Soon)

The following frontend components will be created to use these AI features:

- **AIChatbot.js** - Floating chatbot with voice input
- **AI Insight Buttons** - In Warehouse Layout, Weighbridge, Loan Portfolio
- **Market Predictions Panel** - Auto-refreshing market data
- **Risk Assessment Cards** - In customer request approvals

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Make sure MongoDB is running. Start it with:
```bash
# Windows
net start MongoDB

# macOS/Linux
brew services start mongodb-community
```

### Gemini API Error

```
Error: Gemini API not configured
```

**Solution**: Make sure you've add ed `GEMINI_API_KEY` to your `.env` file.

### Email Sending Error

```
Error: Invalid login
```

**Solution**: 
1. Make sure you're using an App Password, not your regular Gmail password
2. Ensure 2-Step Verification is enabled on your Google Account
3. Generate a new App Password and update `.env`

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**: Kill the process using that port:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

---

## 📊 Database Structure

The system uses the following main collections:

- **users** - All users (owners, customers)
- **vehicles** - Vehicle entry/exit records
- **transactions** - All financial transactions
- **loans** - Loan applications and repayments
- **dynamicwarehouselayouts** - Warehouse slot allocations
- **requests** - Customer requests (vacate, loan approval)

---

## 🔄 Development Workflow

1. **Backend changes**: Modify files in `server/` directory
2. **Frontend changes**: Modify files in `client/src/` directory
3. **Restart services** if needed (server auto-restarts with nodemon in dev mode)
4. **Test changes** in browser at http://localhost:3000

---

## 📝 Next Steps

After successful setup, consider:

1. **Create test data**: Add sample customers, vehicles, transactions
2. **Test AI agents**: Try different queries and see responses
3. **Configure email templates**: Customize email notifications
4. **Review security**: Change default JWT_SECRET for production

---

## 🆘 Need Help?

1. Check the **IMPLEMENTATION_ROADMAP.md** for feature details
2. Review API endpoints in `server/routes/` directory
3. Check backend logs for error details
4. Verify all environment variables are set correctly

---

## 📚 Additional Resources

- **MongoDB Docs**: https://docs.mongodb.com/
- **Express.js Docs**: https://expressjs.com/
- **React Docs**: https://react.dev/
- **Gemini AI Docs**: https://ai.google.dev/docs
- **Nodemailer Docs**: https://nodemailer.com/

---

**Last Updated**: February 18, 2026  
**Version**: 2.0.0  
**Status**: Development Ready ✅
