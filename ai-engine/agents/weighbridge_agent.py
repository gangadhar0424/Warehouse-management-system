from agents.base_agent import BaseAgent
from tools.gemini_client import GeminiClient
from tools.db_connector import DBConnector
from config.prompts import WEIGHBRIDGE_AGENT_PROMPT
import json


class WeighbridgeAgent(BaseAgent):
    """AI agent for weighbridge optimization and fraud detection."""
    
    def __init__(self):
        super().__init__("WeighbridgeAgent", "Weighbridge optimization and anomaly detection")
    
    async def process(self, data: dict) -> dict:
        try:
            action = data.get('action', 'analyze')
            
            if action == 'analyze':
                return await self._analyze_weighbridge(data)
            elif action == 'detect_anomaly':
                return await self._detect_anomaly(data)
            elif action == 'optimize':
                return await self._optimize_operations(data)
            else:
                return await self._analyze_weighbridge(data)
        except Exception as e:
            return self.format_response(success=False, message=f"Weighbridge error: {str(e)}")
    
    async def _analyze_weighbridge(self, data):
        """Analyze weighbridge entry for potential issues."""
        vehicle_number = data.get('vehicleNumber', '')
        gross_weight = data.get('grossWeight', 0)
        tare_weight = data.get('tareWeight', 0)
        net_weight = data.get('netWeight', 0)
        grain_type = data.get('grainType', '')
        customer_name = data.get('customerName', '')
        
        # Get historical data for this vehicle
        vehicles = await DBConnector.get_vehicles(limit=200)
        vehicle_history = [
            v for v in vehicles 
            if v.get('vehicleNumber', '').upper() == vehicle_number.upper()
        ]
        
        history_data = [
            {
                'grossWeight': v.get('grossWeight', 0),
                'tareWeight': v.get('tareWeight', 0),
                'netWeight': v.get('netWeight', 0),
                'grainType': v.get('grainType', ''),
                'date': str(v.get('createdAt', ''))
            }
            for v in vehicle_history[:20]
        ]
        
        prompt = f"""Analyze this weighbridge entry:
Vehicle: {vehicle_number}
Gross Weight: {gross_weight} kg
Tare Weight: {tare_weight} kg
Net Weight: {net_weight} kg
Grain Type: {grain_type}
Customer: {customer_name}

Vehicle History ({len(history_data)} entries):
{json.dumps(history_data, default=str)}

Analyze for:
1. Weight consistency with vehicle history
2. Tare weight deviation (typical tare for same vehicle)
3. Unusually high/low net weight
4. Potential manipulation indicators
5. Grain type vs expected weight ratios

Respond in JSON: {{
    risk_level: "low"|"medium"|"high",
    risk_score: int (0-100),
    anomalies: [{{type: str, description: str, severity: str}}],
    recommendations: [str],
    weight_analysis: {{
        expected_tare_range: str,
        expected_net_range: str,
        deviation_percentage: float
    }},
    verdict: str
}}"""
        
        result = await GeminiClient.generate_json(prompt, WEIGHBRIDGE_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Weighbridge analysis complete")
    
    async def _detect_anomaly(self, data):
        """Detect anomalies in weighbridge operations."""
        vehicles = await DBConnector.get_vehicles(limit=100)
        
        recent_entries = [
            {
                'vehicleNumber': v.get('vehicleNumber', ''),
                'grossWeight': v.get('grossWeight', 0),
                'tareWeight': v.get('tareWeight', 0),
                'netWeight': v.get('netWeight', 0),
                'grainType': v.get('grainType', ''),
                'type': v.get('type', ''),
                'date': str(v.get('createdAt', ''))
            }
            for v in vehicles[:50]
        ]
        
        prompt = f"""Analyze these recent weighbridge entries for anomalies and fraud patterns:

{json.dumps(recent_entries, default=str)}

Look for:
1. Vehicles with inconsistent tare weights across entries
2. Unusual weight patterns (same vehicle, wildly different loads)
3. Potential weight manipulation (gradual tare weight increase)
4. Entries at unusual times
5. Statistical outliers

Respond in JSON: {{
    total_analyzed: int,
    anomalies_found: int,
    anomalies: [{{
        vehicleNumber: str,
        type: str,
        description: str,
        severity: "low"|"medium"|"high",
        evidence: str
    }}],
    overall_risk: "low"|"medium"|"high",
    summary: str
}}"""
        
        result = await GeminiClient.generate_json(prompt, WEIGHBRIDGE_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Anomaly detection complete")
    
    async def _optimize_operations(self, data):
        """Suggest weighbridge operation optimizations."""
        vehicles = await DBConnector.get_vehicles(limit=50)
        
        prompt = f"""Based on {len(vehicles)} recent weighbridge operations, suggest optimizations for:
1. Queue management
2. Peak hour scheduling
3. Maintenance scheduling
4. Process efficiency improvements

Respond in JSON: {{
    optimizations: [{{area: str, suggestion: str, impact: str}}],
    peak_hours: [str],
    maintenance_needed: bool,
    efficiency_score: int
}}"""
        
        result = await GeminiClient.generate_json(prompt, WEIGHBRIDGE_AGENT_PROMPT)
        
        return self.format_response(success=True, data=result, message="Optimization analysis complete")
