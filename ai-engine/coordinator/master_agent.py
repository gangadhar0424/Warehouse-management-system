from agents.chat_agent import ChatAgent
from agents.inventory_agent import InventoryAgent
from agents.email_agent import EmailAgent
from agents.duration_agent import DurationAgent
from agents.loan_risk_agent import LoanRiskAgent
from agents.pricing_agent import PricingAgent
from agents.anomaly_agent import AnomalyAgent
from tools.gemini_client import GeminiClient
from config.prompts import MASTER_AGENT_PROMPT
import asyncio
import json


class MasterAgent:
    """
    Master coordinator agent — acts as the central brain for the WMS AI system.
    Routes chat messages to the right specialist, enriches the chat response with
    real analysis data, and can run all 5 agents in parallel for full analysis.
    """

    # Metadata shown in the frontend for each agent
    AGENT_INFO = {
        'chat':          {'name': 'WMS Assistant',           'icon': '🤖', 'color': '#667eea'},
        'inventory':     {'name': 'Inventory Agent',         'icon': '📦', 'color': '#4caf50'},
        'email':         {'name': 'Email Agent',             'icon': '📧', 'color': '#00bcd4'},
        'duration':      {'name': 'Storage Duration Agent',  'icon': '📅', 'color': '#2196f3'},
        'loan_risk':     {'name': 'Loan Risk Agent',         'icon': '💰', 'color': '#9c27b0'},
        'pricing':       {'name': 'Market Pricing Agent',    'icon': '📈', 'color': '#f44336'},
        'anomaly':       {'name': 'Anomaly Detection Agent', 'icon': '🔍', 'color': '#795548'},
        'full_analysis': {'name': 'Full AI Analysis',        'icon': '🔬', 'color': '#3f51b5'},
    }

    # Default action to call when each specialist is triggered via chat
    AGENT_DEFAULT_ACTIONS = {
        'inventory':  'analyze',
        'pricing':    'predict',
        'duration':   'predict',
        'loan_risk':  'portfolio',
        'anomaly':    'detect',
        'email':      'generate',
    }

    def __init__(self):
        self.chat_agent      = ChatAgent()
        self.inventory_agent = InventoryAgent()
        self.email_agent     = EmailAgent()
        self.duration_agent  = DurationAgent()
        self.loan_risk_agent = LoanRiskAgent()
        self.pricing_agent   = PricingAgent()
        self.anomaly_agent   = AnomalyAgent()

        self.agents = {
            'chat':       self.chat_agent,
            'inventory':  self.inventory_agent,
            'email':      self.email_agent,
            'duration':   self.duration_agent,
            'loan_risk':  self.loan_risk_agent,
            'pricing':    self.pricing_agent,
            'anomaly':    self.anomaly_agent,
        }

    # ------------------------------------------------------------------ #
    #  Core routing                                                        #
    # ------------------------------------------------------------------ #

    async def route(self, agent_name: str, data: dict) -> dict:
        """Route request directly to a named specialist agent."""
        agent = self.agents.get(agent_name)
        if not agent:
            return {
                "success": False,
                "message": f"Unknown agent: {agent_name}",
                "available_agents": list(self.agents.keys()),
            }
        return await agent.process(data)

    # ------------------------------------------------------------------ #
    #  Master orchestration — the heart of WMS AI Chat                    #
    # ------------------------------------------------------------------ #

    async def auto_route(self, message: str, context: dict = None) -> dict:
        """
        WMS AI Chat master flow:
          1. Classify user intent → pick the right specialist agent
          2. Run the specialist to get real data/analysis
          3. Pass specialist results + original message to ChatAgent
             so it can answer in natural, conversational language
          4. Return enriched response with agent metadata for the frontend
        """
        ctx = context or {}
        try:
            # Step 1 — classify intent
            agent_name = await self._classify_intent(message)

            if agent_name != 'chat':
                # Step 2 — run specialist
                specialist_payload = {
                    **ctx,
                    'message': message,
                    'action': self.AGENT_DEFAULT_ACTIONS.get(agent_name, 'analyze'),
                    'grainType': ctx.get('grainType', 'all'),
                    'horizon': ctx.get('horizon', '3months'),
                }
                try:
                    specialist_result = await self.route(agent_name, specialist_payload)
                except Exception as spec_err:
                    specialist_result = {'success': False, 'message': str(spec_err)}

                # Step 3 — chat agent formats the specialist data into a natural reply
                chat_payload = {
                    **ctx,
                    'message': message,
                    'agent_results': specialist_result,
                    'agent_name': agent_name,
                }
                result = await self.chat_agent.process(chat_payload)

                # Step 4 — attach specialist raw data for frontend cards
                if specialist_result.get('data'):
                    result['specialistData'] = specialist_result['data']
            else:
                # Pure conversational query — go straight to chat agent
                result = await self.route('chat', {**ctx, 'message': message})

            # Attach agent metadata
            result['agent'] = agent_name
            result['agentInfo'] = self.AGENT_INFO.get(agent_name, self.AGENT_INFO['chat'])
            return result

        except Exception as e:
            # Hard fallback — plain chat
            result = await self.chat_agent.process({'message': message, **ctx})
            result['agent'] = 'chat'
            result['agentInfo'] = self.AGENT_INFO['chat']
            return result

    # ------------------------------------------------------------------ #
    #  Full Analysis — runs all 5 specialist agents concurrently          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _agent_reply(result: dict, max_chars: int = 500) -> str:
        """Extract the natural-language reply from an agent result dict."""
        if not result or result.get('success') is False:
            err = result.get('error', result.get('message', 'Unavailable')) if result else 'Unavailable'
            return f"Analysis unavailable: {err}"
        data = result if not isinstance(result.get('data'), dict) else result.get('data', result)
        reply = (
            data.get('reply', '')
            or data.get('summary', '')
            or data.get('message', '')
            or str(data)[:300]
        )
        return str(reply).strip()[:max_chars] if reply else 'No data returned'

    @staticmethod
    def _build_fallback_reply(breakdown: dict) -> str:
        """Build a structured text summary directly from breakdown when Gemini synthesis fails."""
        sections = {
            'inventory':  ('📦 Inventory',              ''),
            'pricing':    ('📈 Market Prices',           ''),
            'duration':   ('📅 Storage Duration',        ''),
            'loan_risk':  ('💰 Loan Portfolio',          ''),
            'anomaly':    ('🔍 Anomaly & Fraud Alerts',  ''),
        }
        lines = ['**🔬 Full Warehouse AI Analysis**\n']
        for key, (label, _) in sections.items():
            reply = MasterAgent._agent_reply(breakdown.get(key, {}), max_chars=400)
            lines.append(f'**{label}**\n{reply}\n')
        lines.append('*Analysis generated from live warehouse data.*')
        return '\n'.join(lines)

    async def full_analysis(self, context: dict = None) -> dict:
        """
        WMS Full AI Analysis workflow:
          Runs all 5 specialist agents in parallel, then synthesises a
          comprehensive management summary using Gemini on the agents'
          natural-language reply texts (not raw JSON, to stay within token limits).
        """
        ctx = context or {}

        # Run all specialists concurrently
        tasks = [
            self.route('inventory',  {**ctx, 'action': 'analyze'}),
            self.route('pricing',    {**ctx, 'action': 'predict', 'grainType': 'all', 'horizon': '3months'}),
            self.route('duration',   {**ctx, 'action': 'predict', 'grainType': 'all'}),
            self.route('loan_risk',  {**ctx, 'action': 'portfolio'}),
            self.route('anomaly',    {**ctx, 'action': 'detect'}),
        ]
        agent_keys = ['inventory', 'pricing', 'duration', 'loan_risk', 'anomaly']
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        breakdown = {}
        for key, res in zip(agent_keys, raw_results):
            if isinstance(res, Exception):
                breakdown[key] = {'success': False, 'error': str(res)}
            else:
                breakdown[key] = res.get('data') or res

        # --- Synthesise using natural-language summaries (NOT raw JSON) ---
        # This keeps the prompt small enough for any Gemini model's context window.
        agent_summaries = {
            'Inventory Health':       self._agent_reply(breakdown.get('inventory', {}),  500),
            'Market Price Outlook':   self._agent_reply(breakdown.get('pricing', {}),    500),
            'Storage Duration':       self._agent_reply(breakdown.get('duration', {}),   500),
            'Loan Portfolio Risk':    self._agent_reply(breakdown.get('loan_risk', {}),  500),
            'Anomaly / Fraud Alerts': self._agent_reply(breakdown.get('anomaly', {}),    500),
        }

        summary_lines = '\n\n'.join(
            f"[{section}]\n{text}" for section, text in agent_summaries.items()
        )

        synthesis_prompt = (
            "You are an expert Warehouse Management System AI assistant.\n"
            "Below are specialist agent summaries from a live warehouse database.\n"
            "Write a professional, well-structured management brief (400-600 words) that:\n"
            "  • Highlights the most important findings and numbers from each section\n"
            "  • Uses bullet points and bold headings for readability\n"
            "  • Ends with 3-5 prioritised action recommendations\n"
            "  • Uses ₹ for currency and Indian numbering (lakhs/crores)\n"
            "  • Addresses the warehouse owner/manager directly\n\n"
            "SPECIALIST SUMMARIES:\n"
            f"{summary_lines}\n\n"
            "Write the management brief now:"
        )

        reply = await GeminiClient.generate_text(synthesis_prompt, creative=False)

        # Safety net: if Gemini returned an error string or empty, build structured fallback
        if (
            not reply
            or reply.strip() == ''
            or 'unavailable' in reply.lower()[:60]
            or 'trouble' in reply.lower()[:60]
            or 'sorry' in reply.lower()[:60]
        ):
            reply = self._build_fallback_reply(breakdown)

        return {
            'success': True,
            'agent': 'full_analysis',
            'agentInfo': self.AGENT_INFO['full_analysis'],
            'data': {
                'reply': reply,
                'breakdown': breakdown,
            },
            'message': 'Full AI analysis complete',
        }

    # ------------------------------------------------------------------ #
    #  Intent classification                                               #
    # ------------------------------------------------------------------ #

    async def _classify_intent(self, message: str) -> str:
        """Use the LLM to pick the best specialist for this message."""
        routing_prompt = f"""You are a routing agent for a Warehouse Management System AI.
Classify the user's message and respond with ONLY one agent name from the list below.

User message: "{message}"

Agents:
- chat:       General conversation, greetings, help, customer queries, system info, anything not listed below
- inventory:  Storage slots, capacity, grain quantities, inventory health, slot availability, space optimization
- email:      Send email, draft message, write reminder, notify customer, bulk outreach, loan reminder email, payment alert email
- duration:   How long to store grain, optimal vacate timing, storage duration prediction, seasonal patterns
- loan_risk:  Loan assessment, credit scoring, default risk, loan portfolio overview, repayment likelihood
- pricing:    Current/future grain market prices, sell-or-hold advice, price trend predictions
- anomaly:    Fraud detection, suspicious activity, anomalies, security alerts, irregularities, weight discrepancies

Reply with ONLY ONE word (the agent name). No explanation."""

        try:
            raw = await GeminiClient.generate_text(routing_prompt, MASTER_AGENT_PROMPT)
            agent_name = raw.strip().lower().split()[0].replace('"', '').replace("'", '')
            return agent_name if agent_name in self.agents else 'chat'
        except Exception:
            return 'chat'

    # ------------------------------------------------------------------ #
    #  Health                                                              #
    # ------------------------------------------------------------------ #

    async def health_check(self) -> dict:
        return {
            "status": "healthy",
            "agents": {name: "ready" for name in self.agents},
            "total_agents": len(self.agents),
        }
