from agents.base_agent import BaseAgent
from tools.gemini_client import GeminiClient
from tools.db_connector import DBConnector
from config.prompts import LOAN_RISK_AGENT_PROMPT
import json


class LoanRiskAgent(BaseAgent):
    """AI agent for loan risk assessment and credit scoring."""
    
    def __init__(self):
        super().__init__("LoanRiskAgent", "Loan risk assessment and credit scoring")
    
    async def process(self, data: dict) -> dict:
        try:
            action = data.get('action', 'assess')
            
            if action == 'assess':
                return await self._assess_loan_risk(data)
            elif action == 'score':
                return await self._credit_score(data)
            elif action == 'portfolio':
                return await self._portfolio_analysis()
            else:
                return await self._assess_loan_risk(data)
        except Exception as e:
            return self.format_response(success=False, message=f"Loan risk error: {str(e)}")
    
    async def _assess_loan_risk(self, data):
        """Assess loan risk for a specific customer or request."""
        customer_id = data.get('customerId')
        loan_amount = data.get('loanAmount', 0)
        grain_type = data.get('grainType', '')
        grain_quantity = data.get('grainQuantity', 0)
        
        # Gather customer data
        customer = None
        customer_loans = []
        customer_transactions = []
        customer_allocations = []
        
        if customer_id:
            customer = await DBConnector.get_user_by_id(customer_id)
            customer_loans = await DBConnector.get_loans(customer_id=customer_id)
            customer_transactions = await DBConnector.get_transactions(customer_id=customer_id)
            customer_allocations = await DBConnector.get_storage_allocations(customer_id=customer_id)
        
        market_prices = await DBConnector.get_market_prices()
        
        customer_profile = {
            "name": customer.get('name', 'Unknown') if customer else 'Unknown',
            "join_date": str(customer.get('createdAt', '')) if customer else '',
            "grain_type": customer.get('grainType', grain_type) if customer else grain_type,
            "total_loans": len(customer_loans),
            "active_loans": len([l for l in customer_loans if l.get('status') == 'active']),
            "completed_loans": len([l for l in customer_loans if l.get('status') == 'completed']),
            "defaulted_loans": len([l for l in customer_loans if l.get('status') == 'defaulted']),
            "total_transactions": len(customer_transactions),
            "stored_quantity": sum(a.get('quantity', 0) for a in customer_allocations),
            "storage_units": len(customer_allocations)
        }
        
        loan_details = [
            {
                "amount": l.get('amount', 0),
                "status": l.get('status', ''),
                "interestRate": l.get('interestRate', 0),
                "date": str(l.get('createdAt', ''))
            }
            for l in customer_loans[:10]
        ]
        
        prompt = f"""Assess loan risk for this customer:

Customer Profile: {json.dumps(customer_profile, default=str)}
Requested Loan Amount: ₹{loan_amount}
Grain as Collateral: {grain_quantity} quintals of {grain_type}
Loan History: {json.dumps(loan_details, default=str)}
Current Market Prices: {json.dumps(market_prices, default=str)}

Evaluate:
1. Customer creditworthiness based on history
2. Collateral adequacy (grain value vs loan amount)
3. Repayment likelihood
4. Risk factors
5. Recommendation (approve/reject/conditional)

Respond in JSON: {{
    risk_level: "low"|"medium"|"high"|"critical",
    risk_score: int (0-100, higher = riskier),
    credit_score: int (300-900),
    collateral_coverage: float,
    recommendation: "approve"|"reject"|"conditional",
    max_recommended_amount: int,
    suggested_interest_rate: float,
    conditions: [str],
    risk_factors: [{{factor: str, severity: str, description: str}}],
    strengths: [str],
    reasoning: str
}}"""
        
        result = await GeminiClient.generate_json(prompt, LOAN_RISK_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Loan risk assessment complete")
    
    async def _credit_score(self, data):
        """Calculate credit score for a customer."""
        customer_id = data.get('customerId')
        
        if not customer_id:
            return self.format_response(success=False, message="Customer ID required")
        
        customer = await DBConnector.get_user_by_id(customer_id)
        loans = await DBConnector.get_loans(customer_id=customer_id)
        transactions = await DBConnector.get_transactions(customer_id=customer_id)
        
        prompt = f"""Calculate a credit score (300-900) for this warehouse customer:

Name: {customer.get('name', 'Unknown') if customer else 'Unknown'}
Total Loans: {len(loans)}
Active: {len([l for l in loans if l.get('status') == 'active'])}
Completed: {len([l for l in loans if l.get('status') == 'completed'])}
Defaulted: {len([l for l in loans if l.get('status') == 'defaulted'])}
Total Transactions: {len(transactions)}
Member Since: {str(customer.get('createdAt', '')) if customer else 'Unknown'}

Respond in JSON: {{
    credit_score: int,
    rating: "Excellent"|"Good"|"Fair"|"Poor",
    factors: [{{name: str, impact: "positive"|"negative", weight: int}}],
    improvement_tips: [str]
}}"""
        
        result = await GeminiClient.generate_json(prompt, LOAN_RISK_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Credit score calculated")
    
    async def _portfolio_analysis(self):
        """Analyze the overall loan portfolio."""
        all_loans = await DBConnector.get_loans(limit=200)
        
        portfolio = {
            "total": len(all_loans),
            "active": len([l for l in all_loans if l.get('status') == 'active']),
            "pending": len([l for l in all_loans if l.get('status') == 'pending']),
            "completed": len([l for l in all_loans if l.get('status') == 'completed']),
            "defaulted": len([l for l in all_loans if l.get('status') == 'defaulted']),
            "total_amount": sum(l.get('amount', 0) for l in all_loans),
            "active_amount": sum(l.get('amount', 0) for l in all_loans if l.get('status') == 'active')
        }
        
        prompt = f"""Analyze this loan portfolio:
{json.dumps(portfolio, default=str)}

Provide:
1. Portfolio health assessment
2. Risk distribution
3. Collection efficiency estimate
4. Recommendations

Respond in JSON: {{
    health_score: int,
    risk_distribution: {{low: int, medium: int, high: int}},
    collection_rate: float,
    at_risk_amount: int,
    recommendations: [str],
    summary: str
}}"""
        
        result = await GeminiClient.generate_json(prompt, LOAN_RISK_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Portfolio analysis complete")
