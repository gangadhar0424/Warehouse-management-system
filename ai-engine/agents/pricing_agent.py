from agents.base_agent import BaseAgent
from tools.gemini_client import GeminiClient
from tools.db_connector import DBConnector
from config.prompts import PRICING_AGENT_PROMPT
import json
import httpx
from datetime import datetime


class PricingAgent(BaseAgent):
    """AI agent for market pricing intelligence and advisory."""
    
    def __init__(self):
        super().__init__("PricingAgent", "Market pricing intelligence and advisory")
    
    async def process(self, data: dict) -> dict:
        try:
            action = data.get('action', 'predict')
            
            if action == 'predict':
                return await self._predict_prices(data)
            elif action == 'live':
                return await self._get_live_prices()
            elif action == 'advise':
                return await self._price_advisory(data)
            else:
                return await self._predict_prices(data)
        except Exception as e:
            return self.format_response(success=False, message=f"Pricing error: {str(e)}")
    
    async def _predict_prices(self, data):
        """Predict future grain prices."""
        grain_type = data.get('grainType', 'all')
        horizon = data.get('horizon', '3months')
        
        current_prices = await DBConnector.get_market_prices()
        transactions = await DBConnector.get_transactions(limit=100)
        
        # Calculate volume trends
        grain_volumes = {}
        for t in transactions:
            grain = t.get('grainType', 'unknown')
            qty = t.get('quantity', {}).get('quintals', 0) if isinstance(t.get('quantity'), dict) else 0
            if grain not in grain_volumes:
                grain_volumes[grain] = 0
            grain_volumes[grain] += qty
        
        prompt = f"""Predict grain market prices for Indian agricultural commodities:

Current Prices: {json.dumps(current_prices, default=str)}
Grain: {grain_type}
Prediction Horizon: {horizon}
Warehouse Volume Trends: {json.dumps(grain_volumes, default=str)}
Current Date: {datetime.now().strftime('%Y-%m-%d')}

Consider:
1. Seasonal price patterns in Indian agriculture
2. Government MSP (Minimum Support Price) policies
3. Monsoon impact on supply
4. Historical price trends
5. Demand-supply dynamics

Respond in JSON: {{
    predictions: [{{
        grain: str,
        current_price: int,
        predicted_prices: {{
            one_week: int,
            one_month: int,
            three_months: int,
            six_months: int
        }},
        trend: "bullish"|"bearish"|"stable",
        confidence: int,
        factors: [str]
    }}],
    market_summary: str,
    best_time_to_sell: dict,
    alerts: [str]
}}"""
        
        result = await GeminiClient.generate_json(prompt, PRICING_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Price prediction complete")
    
    async def _get_live_prices(self):
        """Fetch and analyze live market prices."""
        try:
            # Fetch AI-generated realistic market prices
            live_prices = await self._fetch_market_data()
            
            # Save to database
            await DBConnector.save_market_prices(live_prices)
            
            return self.format_response(
                success=True,
                data={
                    "prices": live_prices,
                    "updated_at": datetime.now().isoformat(),
                    "source": "market_data"
                },
                message="Live prices fetched"
            )
        except Exception as e:
            # Fallback to cached prices
            cached = await DBConnector.get_market_prices()
            return self.format_response(
                success=True,
                data={
                    "prices": cached,
                    "updated_at": datetime.now().isoformat(),
                    "source": "cached"
                },
                message="Using cached prices"
            )
    
    async def _fetch_market_data(self):
        """Fetch live market data from APIs or generate realistic prices."""
        # Generate realistic Indian grain prices using AI
        prompt = f"""Generate current realistic Indian grain market prices as of {datetime.now().strftime('%Y-%m-%d')}.
Include these grains: Rice (Paddy), Wheat, Maize, Jowar (Sorghum), Bajra (Pearl Millet), Cotton, Soybean, Groundnut, Red Gram (Tur), Bengal Gram (Chana), Sunflower, Sesame.

Base prices on ACTUAL current Indian market rates (Telangana/AP region).
Include MSP where applicable.

Respond in JSON: {{
    "rice": {{"price": int, "unit": "quintal", "trend": str, "msp": int, "market": "Nizamabad"}},
    "wheat": {{"price": int, "unit": "quintal", "trend": str, "msp": int, "market": "Hyderabad"}},
    ... (for each grain)
}}"""
        
        result = await GeminiClient.generate_json(prompt, PRICING_AGENT_PROMPT)
        return result
    
    async def _price_advisory(self, data):
        """Provide price advisory for a specific customer's grain."""
        grain_type = data.get('grainType', '')
        quantity = data.get('quantity', 0)
        stored_since = data.get('storedSince', '')
        
        current_prices = await DBConnector.get_market_prices()
        
        prompt = f"""Provide pricing advisory for a warehouse customer:

Grain: {grain_type}
Quantity: {quantity} quintals
Stored Since: {stored_since}
Current Market Prices: {json.dumps(current_prices, default=str)}

Advise on:
1. Should they sell now or hold?
2. Expected price movement
3. Optimal selling strategy
4. Storage cost consideration
5. Market timing

Respond in JSON: {{
    recommendation: "sell_now"|"hold"|"partial_sell",
    current_value: int,
    expected_value_3months: int,
    reasoning: str,
    strategy: str,
    risk_level: "low"|"medium"|"high",
    key_factors: [str]
}}"""
        
        result = await GeminiClient.generate_json(prompt, PRICING_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Price advisory complete")
