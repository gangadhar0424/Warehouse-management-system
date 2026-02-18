const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not configured');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  async generateContent(prompt, context = {}) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      // Build context-aware prompt
      const fullPrompt = this.buildPrompt(prompt, context);
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  buildPrompt(userQuery, context) {
    const { role, data, systemContext } = context;
    
    let prompt = '';
    
    // System context
    if (systemContext) {
      prompt += `System Context: ${systemContext}\n\n`;
    }
    
    // Role-specific context
    if (role === 'owner') {
      prompt += `You are an AI assistant for a warehouse owner. You have access to all warehouse data including vehicles, customers, transactions, inventory, and analytics.\n\n`;
    } else if (role === 'customer') {
      prompt += `You are an AI assistant for a warehouse customer. You can only access and discuss this specific customer's data including their stored grains, loans, payments, and transactions.\n\n`;
    }
    
    // Data context
    if (data) {
      prompt += `Relevant Data:\n${JSON.stringify(data, null, 2)}\n\n`;
    }
    
    // User query
    prompt += `User Question: ${userQuery}\n\n`;
    prompt += `Please provide a helpful, accurate, and concise response based on the provided context and data.`;
    
    return prompt;
  }

  async analyzeRiskScore(loanData, customerHistory) {
    const prompt = `
Analyze the loan risk for the following customer data:

Loan Request:
- Amount: ₹${loanData.amount}
- Duration: ${loanData.duration} months
- Purpose: ${loanData.purpose}
- Collateral Value: ₹${loanData.collateralValue}

Customer History:
- Total Transactions: ${customerHistory.totalTransactions}
- Total Paid: ₹${customerHistory.totalPaid}
- Pending Payments: ₹${customerHistory.pendingPayments}
- Active Loans: ${customerHistory.activeLoans}
- Payment Delays: ${customerHistory.paymentDelays}
- Storage Duration: ${customerHistory.storageDuration} months

Provide:
1. Risk Score (0-100, where 100 is highest risk)
2. Risk Level (LOW/MEDIUM/HIGH)
3. Recommendation (APPROVE/REDUCE/REJECT)
4. Suggested loan amount if reduction recommended
5. Suggested interest rate adjustment (if any)
6. Detailed reasoning

Format as JSON.
`;

    const response = await this.generateContent(prompt);
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        riskScore: 50,
        riskLevel: 'MEDIUM',
        recommendation: 'REVIEW',
        reasoning: response
      };
    } catch (error) {
      console.error('Failed to parse risk analysis:', error);
      return {
        riskScore: 50,
        riskLevel: 'MEDIUM',
        recommendation: 'REVIEW',
        reasoning: response
      };
    }
  }

  async predictMarketTrend(grainType, historicalData) {
    const prompt = `
Analyze market trends for ${grainType} grain:

Historical Price Data:
${JSON.stringify(historicalData, null, 2)}

Provide:
1. 7-day price prediction
2. 14-day price prediction  
3. 30-day price prediction
4. Trend direction (UP/DOWN/STABLE)
5. Recommended action (SELL NOW/HOLD/WAIT)
6. Expected profit/loss percentage
7. Detailed market analysis

Format as JSON.
`;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse market prediction:', error);
    }
    
    return {
      trend: 'STABLE',
      recommendation: 'HOLD',
      analysis: response
    };
  }

  async detectAnomalies(transactionData) {
    const prompt = `
Analyze the following transactions for anomalies or potential fraud:

Transactions:
${JSON.stringify(transactionData, null, 2)}

Identify:
1. Duplicate or suspicious payments
2. Unusual transaction patterns
3. Weight-payment mismatches
4. Suspicious timing or frequency
5. Risk level for each finding

Format as JSON array of anomalies.
`;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse anomaly detection:', error);
    }
    
    return [];
  }

  async optimizeInventory(layoutData, allocationHistory) {
    const prompt = `
Optimize warehouse space allocation:

Current Layout:
${JSON.stringify(layoutData, null, 2)}

Allocation History:
${JSON.stringify(allocationHistory, null, 2)}

Provide:
1. Slot utilization efficiency analysis
2. Predicted overflow slots (next 7 days)
3. Recommended slot allocations for new grains
4. Space optimization suggestions
5. Capacity planning recommendations

Format as JSON.
`;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse inventory optimization:', error);
    }
    
    return {
      efficiency: 'MODERATE',
      suggestions: [response]
    };
  }

  async analyzeWeighbridgeData(weighingRecords) {
    const prompt = `
Analyze weighbridge data for fraud detection:

Weighing Records:
${JSON.stringify(weighingRecords, null, 2)}

Detect:
1. Abnormal weight variations
2. Suspicious tare/gross weight patterns
3. Empty weight inconsistencies for same vehicles
4. Potential manipulation indicators
5. Peak congestion times prediction

Format as JSON.
`;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse weighbridge analysis:', error);
    }
    
    return {
      anomalies: [],
      analysis: response
    };
  }

  async predictStorageDuration(customerData, grainType, marketData) {
    const prompt = `
Predict storage duration for customer:

Customer Data:
${JSON.stringify(customerData, null, 2)}

Grain Type: ${grainType}

Market Data:
${JSON.stringify(marketData, null, 2)}

Provide:
1. Predicted storage duration (in months)
2. Optimal vacate timing
3. Expected market price at that time
4. Confidence score (0-100)
5. Reasoning

Format as JSON.
`;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse storage prediction:', error);
    }
    
    return {
      predictedDuration: 3,
      confidence: 50,
      reasoning: response
    };
  }
}

module.exports = new GeminiService();
