#!C:/Users/hp/Desktop/mycode/opstest/.venv/Scripts/python.exe
"""
Python script to load the trained ML model and make predictions
This script is called by the Node.js server to get ML predictions
"""

import sys
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

def load_model():
    """Load the trained ML model"""
    try:
        with open('maize_planting_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
        
        # Extract the actual model from the dictionary
        if isinstance(model_data, dict) and 'model' in model_data:
            return model_data['model']
        else:
            return model_data  # If it's already the model directly
            
    except FileNotFoundError:
        raise Exception("Model file 'maize_planting_model.pkl' not found. Please train the model first.")
    except Exception as e:
        raise Exception(f"Error loading model: {str(e)}")

def prepare_features(weather_data):
    """
    Prepare features from weather data for prediction
    Match the 14 features the model was trained on
    """
    try:
        # Get current date for temporal features
        now = datetime.now()
        day_of_year = now.timetuple().tm_yday
        
        # Calculate temporal features
        sin_day = np.sin(2 * np.pi * day_of_year / 365.25)
        cos_day = np.cos(2 * np.pi * day_of_year / 365.25)
        
        # Calculate trends (simplified - use difference from 7-day average as proxy)
        temp_trend = weather_data['temperature'] - weather_data['temp_7d_avg']
        rainfall_trend = weather_data['rainfall'] - (weather_data['rainfall_7d_sum'] / 7)
        soil_trend = weather_data['soil_moisture'] - weather_data['soil_7d_avg']
        
        # Simple planting score based on conditions (0-1 scale)
        # This is a simplified version - ideally should match training data calculation
        temp_score = 1.0 if 18 <= weather_data['temperature'] <= 30 else 0.5
        rain_score = 1.0 if 2 <= weather_data['rainfall'] <= 20 else 0.5
        soil_score = 1.0 if weather_data['soil_moisture'] > 0.2 else 0.5
        planting_score = (temp_score + rain_score + soil_score) / 3
        
        # Create feature vector matching the training data
        # Order: ['temperature', 'rainfall', 'soil_moisture', 'temp_7d_avg', 'rainfall_7d_sum', 
        #         'soil_7d_avg', 'temp_trend', 'rainfall_trend', 'soil_trend', 'month', 
        #         'day_of_year', 'sin_day', 'cos_day', 'planting_score']
        features = np.array([[
            weather_data['temperature'],
            weather_data['rainfall'], 
            weather_data['soil_moisture'],
            weather_data['temp_7d_avg'],
            weather_data['rainfall_7d_sum'],
            weather_data['soil_7d_avg'],
            temp_trend,
            rainfall_trend,
            soil_trend,
            now.month,
            day_of_year,
            sin_day,
            cos_day,
            planting_score
        ]])
        
        return features
    except KeyError as e:
        raise Exception(f"Missing required weather data field: {str(e)}")
    except Exception as e:
        raise Exception(f"Error preparing features: {str(e)}")

def make_prediction(model, features):
    """
    Make prediction using the trained model
    """
    try:
        # Get prediction (should be a continuous value for regression)
        prediction_value = model.predict(features)[0]
        
        # Convert regression output to binary decision
        # Assuming the model predicts planting suitability score (0-1 or 0-10)
        # You may need to adjust this threshold based on your model's output range
        if prediction_value >= 0.5:  # Threshold for planting decision
            should_plant = True
            confidence = min(prediction_value, 1.0)  # Cap at 1.0
        else:
            should_plant = False
            confidence = 1.0 - prediction_value
        
        # Estimate days to optimal planting (simplified heuristic)
        days_to_optimal = None
        if not should_plant:
            # If current conditions not optimal, estimate based on temperature and rainfall
            temp = features[0][0]
            rain = features[0][1]
            
            if temp < 18:  # Too cold
                days_to_optimal = max(7, int((18 - temp) * 2))
            elif temp > 30:  # Too hot
                days_to_optimal = max(7, int((temp - 30) * 1.5))
            elif rain < 2:  # Too dry
                days_to_optimal = 14  # Wait for rain season
            elif rain > 20:  # Too wet
                days_to_optimal = 7   # Wait for drainage
            else:
                days_to_optimal = 7   # General wait period
        
        return {
            'should_plant': should_plant,
            'confidence': float(confidence),
            'prediction_value': float(prediction_value),
            'prediction_probability': {
                'no_plant': float(1.0 - confidence) if should_plant else float(confidence),
                'plant': float(confidence) if should_plant else float(1.0 - confidence)
            },
            'days_to_optimal': days_to_optimal,
            'model_version': '1.0',
            'prediction_timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        raise Exception(f"Error making prediction: {str(e)}")

def main():
    """Main function called by Node.js"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            raise Exception("No input data provided via stdin")
        
        # Parse input weather data
        weather_data = json.loads(input_data)
        
        # Load the trained model
        model = load_model()
        
        # Prepare features
        features = prepare_features(weather_data)
        
        # Make prediction
        result = make_prediction(model, features)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        # Output error as JSON
        error_result = {
            'error': True,
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()