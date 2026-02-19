from agents.base_agent import BaseAgent
from tools.gemini_client import GeminiClient
from tools.db_connector import DBConnector
from config.prompts import CHAT_AGENT_PROMPT
import json


class ChatAgent(BaseAgent):
    """Chatbot agent for general warehouse management queries."""
    
    def __init__(self):
        super().__init__("ChatAgent", "General warehouse management chatbot")
    
    async def process(self, data: dict) -> dict:
        try:
            message = data.get('message', '')
            role = data.get('role', 'owner')
            history = data.get('history', [])
            user_id = data.get('userId')
            
            # Build context with real data
            context = await self._build_context(role, user_id)
            
            system_prompt = CHAT_AGENT_PROMPT + f"\n\nCurrent Context:\n{json.dumps(context, default=str)}"
            system_prompt += f"\nUser Role: {role}"
            
            messages = history + [{'role': 'user', 'content': message}]
            
            response = await GeminiClient.chat(messages, system_prompt)
            
            return self.format_response(
                success=True,
                data={"reply": response, "context": context},
                message="Chat response generated"
            )
        except Exception as e:
            return self.format_response(
                success=False,
                message=f"Chat error: {str(e)}"
            )
    
    async def _build_context(self, role, user_id=None):
        """Build context data from database for better responses."""
        try:
            context = {}
            
            if role == 'owner':
                summary = await DBConnector.get_analytics_summary()
                context['analytics'] = summary
                
                pending_requests = await DBConnector.get_requests(status='pending')
                context['pending_requests'] = len(pending_requests)
                
                vehicles = await DBConnector.get_vehicles(limit=5)
                context['recent_vehicles'] = len(vehicles)
                
                # Warehouse layout summary
                warehouse_summary = await DBConnector.get_warehouse_summary()
                context['warehouse'] = warehouse_summary
                
                # Customer list for reference
                customers = await DBConnector.get_users(role='customer')
                context['customers'] = [
                    {'name': c.get('name', ''), 'phone': c.get('phone', ''), 'grainType': c.get('grainType', '')}
                    for c in customers
                ]
                
                # Transactions summary
                transactions = await DBConnector.get_transactions(limit=20)
                context['recent_transactions'] = len(transactions)
                
                # Loans overview
                loans = await DBConnector.get_loans()
                context['loans'] = {
                    'total': len(loans),
                    'active': len([l for l in loans if l.get('status') == 'active']),
                    'pending': len([l for l in loans if l.get('status') == 'pending']),
                    'completed': len([l for l in loans if l.get('status') == 'completed'])
                }
            
            elif role == 'customer' and user_id:
                user = await DBConnector.get_user_by_id(user_id)
                if user:
                    context['user_name'] = user.get('name', 'Customer')
                    context['grain_type'] = user.get('grainType', 'Unknown')
                
                loans = await DBConnector.get_loans(customer_id=user_id)
                context['active_loans'] = len([l for l in loans if l.get('status') == 'active'])
                
                allocations = await DBConnector.get_storage_allocations(customer_id=user_id)
                context['storage_units'] = len(allocations)
            
            return context
        except Exception as e:
            print(f"Context build error: {e}")
            return {}
