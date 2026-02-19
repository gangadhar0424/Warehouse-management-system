from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn

from coordinator.master_agent import MasterAgent
from config.settings import AI_ENGINE_PORT

app = FastAPI(
    title="WMS AI Engine",
    description="AI-powered analytics engine for Warehouse Management System",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize master agent
master = MasterAgent()

# ==================== Request Models ====================

class ChatRequest(BaseModel):
    message: str
    role: str = "owner"
    userId: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []

class InventoryRequest(BaseModel):
    action: str = "analyze"
    grainType: Optional[str] = None
    quantity: Optional[float] = None

class WeighbridgeRequest(BaseModel):
    action: str = "analyze"
    vehicleNumber: Optional[str] = None
    grossWeight: Optional[float] = None
    tareWeight: Optional[float] = None
    netWeight: Optional[float] = None
    grainType: Optional[str] = None
    customerName: Optional[str] = None

class LoanRiskRequest(BaseModel):
    action: str = "assess"
    customerId: Optional[str] = None
    loanAmount: Optional[float] = None
    grainType: Optional[str] = None
    grainQuantity: Optional[float] = None

class MarketRequest(BaseModel):
    action: str = "predict"
    grainType: Optional[str] = "all"
    horizon: Optional[str] = "3months"
    quantity: Optional[float] = None
    storedSince: Optional[str] = None

class DemandRequest(BaseModel):
    action: str = "predict"
    grainType: Optional[str] = "all"
    quantity: Optional[float] = None
    customerId: Optional[str] = None

class PredictDurationRequest(BaseModel):
    grain_type: str = "rice"
    total_bags: int = 100
    total_weight_kg: float = 5000
    monthly_rent_per_bag: float = 50

class AnomalyRequest(BaseModel):
    action: str = "detect"
    entityType: Optional[str] = None
    entityId: Optional[str] = None

class AutoRouteRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

# ==================== Endpoints ====================

@app.get("/")
async def root():
    return {"message": "WMS AI Engine v2.0", "status": "running"}

@app.get("/health")
async def health():
    result = await master.health_check()
    return result

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        result = await master.route('chat', {
            'message': request.message,
            'role': request.role,
            'userId': request.userId,
            'history': request.history or []
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/inventory/analyze")
async def inventory_analyze(request: InventoryRequest):
    try:
        result = await master.route('inventory', {
            'action': request.action,
            'grainType': request.grainType,
            'quantity': request.quantity
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/weighbridge/analyze")
async def weighbridge_analyze(request: WeighbridgeRequest):
    try:
        result = await master.route('weighbridge', {
            'action': request.action,
            'vehicleNumber': request.vehicleNumber,
            'grossWeight': request.grossWeight,
            'tareWeight': request.tareWeight,
            'netWeight': request.netWeight,
            'grainType': request.grainType,
            'customerName': request.customerName
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/loan-risk/assess")
async def loan_risk_assess(request: LoanRiskRequest):
    try:
        result = await master.route('loan_risk', {
            'action': request.action,
            'customerId': request.customerId,
            'loanAmount': request.loanAmount,
            'grainType': request.grainType,
            'grainQuantity': request.grainQuantity
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/market/predict")
async def market_predict(request: MarketRequest):
    try:
        result = await master.route('pricing', {
            'action': request.action,
            'grainType': request.grainType,
            'horizon': request.horizon,
            'quantity': request.quantity,
            'storedSince': request.storedSince
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market/live")
async def market_live():
    try:
        result = await master.route('pricing', {'action': 'live'})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/demand/predict")
async def demand_predict(request: DemandRequest):
    try:
        result = await master.route('duration', {
            'action': request.action,
            'grainType': request.grainType,
            'quantity': request.quantity,
            'customerId': request.customerId
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-duration")
async def predict_duration(request: PredictDurationRequest):
    """Predict optimal storage duration for specific grain allocation."""
    try:
        result = await master.route('duration', {
            'action': 'predict_duration',
            'grainType': request.grain_type,
            'totalBags': request.total_bags,
            'totalWeightKg': request.total_weight_kg,
            'monthlyRentPerBag': request.monthly_rent_per_bag
        })
        # Wrap in expected format for frontend
        prediction = result.get('data', result) if isinstance(result, dict) else result
        return {'success': True, 'prediction': prediction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anomaly/detect")
async def anomaly_detect(request: AnomalyRequest):
    try:
        result = await master.route('anomaly', {
            'action': request.action,
            'entityType': request.entityType,
            'entityId': request.entityId
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/anomaly/alerts")
async def anomaly_alerts():
    try:
        result = await master.route('anomaly', {'action': 'alerts'})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auto")
async def auto_route(request: AutoRouteRequest):
    """Automatically route to the best agent."""
    try:
        result = await master.auto_route(request.message, request.context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=AI_ENGINE_PORT, reload=True)
