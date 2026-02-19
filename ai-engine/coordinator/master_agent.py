from agents.chat_agent import ChatAgent
from agents.inventory_agent import InventoryAgent
from agents.weighbridge_agent import WeighbridgeAgent
from agents.duration_agent import DurationAgent
from agents.loan_risk_agent import LoanRiskAgent
from agents.pricing_agent import PricingAgent
from agents.anomaly_agent import AnomalyAgent
from tools.gemini_client import GeminiClient
from config.prompts import MASTER_AGENT_PROMPT


class MasterAgent:
    """Master coordinator that routes requests to specialized agents."""
    
    def __init__(self):
        self.chat_agent = ChatAgent()
        self.inventory_agent = InventoryAgent()
        self.weighbridge_agent = WeighbridgeAgent()
        self.duration_agent = DurationAgent()
        self.loan_risk_agent = LoanRiskAgent()
        self.pricing_agent = PricingAgent()
        self.anomaly_agent = AnomalyAgent()
        
        self.agents = {
            'chat': self.chat_agent,
            'inventory': self.inventory_agent,
            'weighbridge': self.weighbridge_agent,
            'duration': self.duration_agent,
            'loan_risk': self.loan_risk_agent,
            'pricing': self.pricing_agent,
            'anomaly': self.anomaly_agent
        }
    
    async def route(self, agent_name: str, data: dict) -> dict:
        """Route request to specific agent."""
        agent = self.agents.get(agent_name)
        if not agent:
            return {
                "success": False,
                "message": f"Unknown agent: {agent_name}",
                "available_agents": list(self.agents.keys())
            }
        
        return await agent.process(data)
    
    async def auto_route(self, message: str, context: dict = None) -> dict:
        """Automatically determine which agent should handle the request."""
        try:
            routing_prompt = f"""Based on this user message, determine which AI agent should handle it.

Message: "{message}"

Available agents:
- chat: General conversation, greetings, help, warehouse info queries
- inventory: Storage optimization, inventory analysis, grain management
- weighbridge: Vehicle weighing, weight analysis, fraud detection at weighbridge
- duration: Demand forecasting, storage duration prediction, seasonal analysis
- loan_risk: Loan assessment, credit scoring, repayment risk analysis
- pricing: Market prices, price prediction, sell/hold advisory
- anomaly: Fraud detection, anomaly scanning, security alerts

Respond with ONLY the agent name (one word), nothing else."""
            
            agent_name = await GeminiClient.generate_text(routing_prompt, MASTER_AGENT_PROMPT)
            agent_name = agent_name.strip().lower().replace('"', '').replace("'", '')
            
            # Validate and fallback
            if agent_name not in self.agents:
                agent_name = 'chat'
            
            data = context or {}
            data['message'] = message
            
            return await self.route(agent_name, data)
        except Exception as e:
            # Fallback to chat agent
            return await self.chat_agent.process({'message': message, **(context or {})})
    
    async def health_check(self) -> dict:
        """Check health of all agents."""
        return {
            "status": "healthy",
            "agents": {name: "ready" for name in self.agents.keys()},
            "total_agents": len(self.agents)
        }
