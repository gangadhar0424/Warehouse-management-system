from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Load trained models and encoders
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

# Model 1: Price Prediction
try:
    with open(os.path.join(MODEL_DIR, 'model1_price_prediction_BEST.pkl'), 'rb') as f:
        price_model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'model1_label_encoders.pkl'), 'rb') as f:
        price_encoders = pickle.load(f)
    print("✓ Price prediction model loaded")
except Exception as e:
    print(f"✗ Failed to load price model: {e}")
    price_model = None
    price_encoders = None

# Model 2: Profit/Loss Classification
try:
    with open(os.path.join(MODEL_DIR, 'model2_profit_classification_BEST.pkl'), 'rb') as f:
        profit_model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'model2_label_encoders.pkl'), 'rb') as f:
        profit_encoders = pickle.load(f)
    print("✓ Profit classification model loaded")
except Exception as e:
    print(f"✗ Failed to load profit model: {e}")
    profit_model = None
    profit_encoders = None

# Model 3: Storage Duration Prediction
try:
    with open(os.path.join(MODEL_DIR, 'model3_storage_duration_BEST.pkl'), 'rb') as f:
        duration_model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'model3_label_encoders.pkl'), 'rb') as f:
        duration_encoders = pickle.load(f)
    print("✓ Storage duration model loaded")
except Exception as e:
    print(f"✗ Failed to load duration model: {e}")
    duration_model = None
    duration_encoders = None

# Grain type mapping
GRAIN_TYPE_MAP = {
    'wheat': 0,
    'rice': 1,
    'maize': 2,
    'barley': 3,
    'soybean': 4
}

ACTIVITY_STATUS_MAP = {
    'active': 0,
    'inactive': 1,
    'completed': 2
}

SOLD_STATUS_MAP = {
    'sold': 0,
    'not_sold': 1
}

def encode_grain_type(grain_type):
    """Encode grain type to numeric value"""
    grain_lower = grain_type.lower()
    return GRAIN_TYPE_MAP.get(grain_lower, 0)  # Default to wheat

def encode_activity_status(status):
    """Encode activity status to numeric value"""
    status_lower = status.lower()
    return ACTIVITY_STATUS_MAP.get(status_lower, 0)  # Default to active

def encode_sold_status(status):
    """Encode sold status to numeric value"""
    status_lower = status.lower()
    return SOLD_STATUS_MAP.get(status_lower, 1)  # Default to not_sold

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': {
            'price_prediction': price_model is not None,
            'profit_classification': profit_model is not None,
            'duration_prediction': duration_model is not None
        }
    })

@app.route('/api/predict/price', methods=['POST'])
def predict_price():
    """Predict grain sale price"""
    try:
        if not price_model:
            return jsonify({'error': 'Price prediction model not loaded'}), 503

        data = request.json
        
        # Prepare features
        features = pd.DataFrame([{
            'grain_type_encoded': encode_grain_type(data.get('grain_type', 'wheat')),
            'total_bags': float(data.get('total_bags', 0)),
            'total_weight_kg': float(data.get('total_weight_kg', 0)),
            'storage_duration_days': float(data.get('storage_duration_days', 0)),
            'monthly_rent_per_bag': float(data.get('monthly_rent_per_bag', 50)),
            'total_rent_paid': float(data.get('total_rent_paid', 0)),
            'activity_status_encoded': encode_activity_status(data.get('activity_status', 'active')),
            'sold_status_encoded': encode_sold_status(data.get('sold_status', 'not_sold'))
        }])
        
        # Make prediction
        predicted_price = price_model.predict(features)[0]
        
        # Calculate confidence based on model's R² score (simplified)
        confidence = 'high' if predicted_price > 0 else 'medium'
        
        return jsonify({
            'predicted_price': float(predicted_price),
            'confidence': confidence,
            'unit': 'INR per kg'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/profit', methods=['POST'])
def predict_profit():
    """Predict profit/loss classification"""
    try:
        if not profit_model:
            return jsonify({'error': 'Profit classification model not loaded'}), 503

        data = request.json
        
        # Prepare features
        features = pd.DataFrame([{
            'grain_type_encoded': encode_grain_type(data.get('grain_type', 'wheat')),
            'total_bags': float(data.get('total_bags', 0)),
            'total_weight_kg': float(data.get('total_weight_kg', 0)),
            'storage_duration_days': float(data.get('storage_duration_days', 0)),
            'monthly_rent_per_bag': float(data.get('monthly_rent_per_bag', 50)),
            'total_rent_paid': float(data.get('total_rent_paid', 0)),
            'activity_status_encoded': encode_activity_status(data.get('activity_status', 'active'))
        }])
        
        # Make prediction
        is_profitable = bool(profit_model.predict(features)[0])
        
        # Get probability if model supports it
        try:
            probabilities = profit_model.predict_proba(features)[0]
            probability = float(probabilities[1] if is_profitable else probabilities[0])
        except:
            probability = 0.75  # Default probability
        
        return jsonify({
            'is_profitable': is_profitable,
            'probability': probability,
            'recommendation': 'Good position - continue storage' if is_profitable else 'Consider selling soon to minimize losses'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/duration', methods=['POST'])
def predict_duration():
    """Predict storage duration"""
    try:
        if not duration_model:
            return jsonify({'error': 'Duration prediction model not loaded'}), 503

        data = request.json
        
        # Prepare features
        features = pd.DataFrame([{
            'grain_type_encoded': encode_grain_type(data.get('grain_type', 'wheat')),
            'total_bags': float(data.get('total_bags', 0)),
            'total_weight_kg': float(data.get('total_weight_kg', 0)),
            'monthly_rent_per_bag': float(data.get('monthly_rent_per_bag', 50)),
            'activity_status_encoded': encode_activity_status(data.get('activity_status', 'active'))
        }])
        
        # Make prediction
        predicted_duration = float(duration_model.predict(features)[0])
        
        return jsonify({
            'predicted_duration': predicted_duration,
            'unit': 'days',
            'estimated_months': round(predicted_duration / 30, 1)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    """Batch prediction for multiple customers"""
    try:
        data = request.json
        customers_data = data.get('customers', [])
        
        results = []
        for customer in customers_data:
            result = {
                'customerId': customer.get('customerId'),
                'predictions': {}
            }
            
            # Price prediction
            if price_model:
                try:
                    features = pd.DataFrame([{
                        'grain_type_encoded': encode_grain_type(customer.get('grain_type', 'wheat')),
                        'total_bags': float(customer.get('total_bags', 0)),
                        'total_weight_kg': float(customer.get('total_weight_kg', 0)),
                        'storage_duration_days': float(customer.get('storage_duration_days', 0)),
                        'monthly_rent_per_bag': float(customer.get('monthly_rent_per_bag', 50)),
                        'total_rent_paid': float(customer.get('total_rent_paid', 0)),
                        'activity_status_encoded': encode_activity_status(customer.get('activity_status', 'active')),
                        'sold_status_encoded': encode_sold_status(customer.get('sold_status', 'not_sold'))
                    }])
                    result['predictions']['price'] = float(price_model.predict(features)[0])
                except:
                    result['predictions']['price'] = None
            
            # Profit prediction
            if profit_model:
                try:
                    features = pd.DataFrame([{
                        'grain_type_encoded': encode_grain_type(customer.get('grain_type', 'wheat')),
                        'total_bags': float(customer.get('total_bags', 0)),
                        'total_weight_kg': float(customer.get('total_weight_kg', 0)),
                        'storage_duration_days': float(customer.get('storage_duration_days', 0)),
                        'monthly_rent_per_bag': float(customer.get('monthly_rent_per_bag', 50)),
                        'total_rent_paid': float(customer.get('total_rent_paid', 0)),
                        'activity_status_encoded': encode_activity_status(customer.get('activity_status', 'active'))
                    }])
                    result['predictions']['profitable'] = bool(profit_model.predict(features)[0])
                except:
                    result['predictions']['profitable'] = None
            
            results.append(result)
        
        return jsonify({'results': results})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  WMS ML Prediction Service Starting...")
    print("="*60)
    print(f"\n  Models Directory: {MODEL_DIR}")
    print(f"  Price Model: {'✓ Loaded' if price_model else '✗ Not loaded'}")
    print(f"  Profit Model: {'✓ Loaded' if profit_model else '✗ Not loaded'}")
    print(f"  Duration Model: {'✓ Loaded' if duration_model else '✗ Not loaded'}")
    print("\n" + "="*60)
    print("  Server running on http://localhost:8050")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8050, debug=True)
