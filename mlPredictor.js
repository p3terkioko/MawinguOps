const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MLPredictor {
    constructor() {
        this.modelPath = path.join(__dirname, 'maize_planting_model.pkl');
        this.pythonScript = path.join(__dirname, 'predict.py');
    }

    /**
     * Check if the trained model exists
     */
    isModelTrained() {
        // In production, gracefully handle missing Python/model
        try {
            return fs.existsSync(this.modelPath);
        } catch (error) {
            console.log('[MLPredictor] Model check failed, running without ML:', error.message);
            return false;
        }
    }

    /**
     * Make planting prediction using the trained ML model
     * @param {Object} weatherData - Current weather conditions
     * @returns {Promise<Object>} Prediction results
     */
    async predictPlantingWindow(weatherData) {
        if (!this.isModelTrained()) {
            throw new Error('ML model not found. Please train the model first by running the Jupyter notebook.');
        }

        return new Promise((resolve, reject) => {
            // Prepare weather data for Python script
            const inputData = {
                temperature: weatherData.current?.temperature || 25,
                rainfall: weatherData.current?.precipitation || 0,
                soil_moisture: 0.3, // Default value - you might add soil sensors later
                soil_temperature: (weatherData.current?.temperature || 25) - 2,
                temp_7d_avg: this.calculateAverage(weatherData.dailyForecasts, 'avgTemperature', 25),
                rainfall_7d_sum: this.calculateSum(weatherData.dailyForecasts, 'precipitation'),
                soil_7d_avg: 0.3, // Default - could be estimated from rainfall patterns
                soil_temp_7d_avg: this.calculateAverage(weatherData.dailyForecasts, 'avgTemperature', 25) - 2
            };

            // Call Python script with weather data
            const jsonData = JSON.stringify(inputData);
            const pythonProcess = spawn('C:/Users/hp/Desktop/mycode/opstest/.venv/Scripts/python.exe', [this.pythonScript], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            // Send data via stdin instead of command line argument
            pythonProcess.stdin.write(jsonData);
            pythonProcess.stdin.end();
            
            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (error) {
                        reject(new Error(`Failed to parse ML prediction: ${error.message}`));
                    }
                } else {
                    reject(new Error(`ML prediction failed: ${errorOutput}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    /**
     * Calculate average from forecast array
     */
    calculateAverage(forecasts, field, defaultValue = 0) {
        if (!forecasts || forecasts.length === 0) return defaultValue;
        
        const values = forecasts.slice(0, 7).map(day => day[field] || defaultValue);
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate sum from forecast array
     */
    calculateSum(forecasts, field) {
        if (!forecasts || forecasts.length === 0) return 0;
        
        return forecasts.slice(0, 7).reduce((sum, day) => sum + (day[field] || 0), 0);
    }

    /**
     * Get enhanced advisory with ML predictions
     */
    async getEnhancedAdvisory(location, crop, weatherData) {
        try {
            const prediction = await this.predictPlantingWindow(weatherData);
            
            // Get the human-friendly advisory from the advisory engine
            const advisoryEngine = require('./advisoryEngine');
            const basicAdvisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
            
            // Debug: Check what we're getting from basic advisory
            console.log(`[ML] Basic advisory recommendation: ${basicAdvisory.recommendation}`);
            console.log(`[ML] ML prediction should_plant: ${prediction.should_plant}`);
            console.log(`[ML] ML confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
            
            // Keep the human-friendly advisory message and just add ML confidence
            let enhancedAdvisory = basicAdvisory.advisory;
            
            // Add ML confidence to the human-friendly message if high confidence
            if (prediction.confidence >= 0.8) {
                enhancedAdvisory += `\n\n🤖 AI Analysis: ${(prediction.confidence * 100).toFixed(0)}% confidence`;
            }
            
            // CRITICAL FIX: Use the basic advisory's recommendation, don't override it!
            const finalRecommendation = basicAdvisory.recommendation;
            
            console.log(`[ML] Final result recommendation: ${finalRecommendation}`);
            console.log(`[ML] Final result message starts with: ${enhancedAdvisory.substring(0, 50)}...`);
            
            // Debug: Check for mismatch in final result
            if ((finalRecommendation === 'PLANT NOW' && (enhancedAdvisory.includes('WAIT') || enhancedAdvisory.includes('⏳'))) ||
                (finalRecommendation === 'WAIT 2-3 DAYS' && (enhancedAdvisory.includes('PLANT NOW') || enhancedAdvisory.includes('🌱')))) {
                console.error(`[ML] CRITICAL MISMATCH IN FINAL RESULT! Rec: ${finalRecommendation}, Msg: ${enhancedAdvisory.substring(0, 100)}...`);
            }
            
            return {
                ...basicAdvisory, // Keep all the original structure including human-friendly advisory
                mlPrediction: prediction,
                advisory: enhancedAdvisory, // Use the human-friendly message with ML enhancement
                reasoning: `ML-Enhanced Analysis (Confidence: ${(prediction.confidence * 100).toFixed(1)}%): ${basicAdvisory.reasoning}`,
                recommendation: finalRecommendation, // Use basic advisory's recommendation!
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            // Fallback to basic advisory if ML fails
            console.error('ML prediction failed, using basic advisory:', error.message);
            const advisoryEngine = require('./advisoryEngine');
            const basicAdvisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
            
            return {
                ...basicAdvisory,
                mlPrediction: null,
                note: 'Using basic weather analysis (ML model unavailable)'
            };
        }
    }

    /**
     * Generate recommendation based on ML prediction
     */
    generateRecommendation(prediction, weatherData) {
        const messages = [];

        if (prediction.should_plant) {
            messages.push(`🌱 OPTIMAL PLANTING WINDOW: Now is a good time to plant maize!`);
            messages.push(`📊 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
        } else {
            messages.push(`⏳ WAIT: Current conditions not optimal for planting.`);
            if (prediction.days_to_optimal) {
                messages.push(`⏰ Recommended to wait ${prediction.days_to_optimal} more days.`);
            }
        }

        // Add weather context
        const temp = weatherData.current?.temperature;
        const rain = weatherData.current?.precipitation;
        
        if (temp) {
            if (temp < 18) messages.push(`🌡️ Temperature too low (${temp}°C). Maize needs 18-30°C.`);
            else if (temp > 30) messages.push(`🌡️ Temperature quite high (${temp}°C). Monitor soil moisture.`);
        }

        if (rain > 20) {
            messages.push(`🌧️ Heavy rainfall expected (${rain}mm). Ensure good drainage.`);
        } else if (rain < 2) {
            messages.push(`☀️ Low rainfall (${rain}mm). Consider irrigation if planting.`);
        }

        return messages.join('\n');
    }

    /**
     * Fallback basic recommendation
     */
    generateBasicRecommendation(weatherData) {
        const messages = [`🌾 Basic weather analysis for maize planting:`];
        
        const temp = weatherData.current?.temperature;
        const rain = weatherData.current?.precipitation;
        
        if (temp >= 18 && temp <= 30 && rain >= 2 && rain <= 20) {
            messages.push(`✅ Weather conditions appear favorable for planting.`);
        } else {
            messages.push(`⚠️ Weather conditions may not be optimal. Consider waiting.`);
        }

        return messages.join('\n');
    }
}

module.exports = MLPredictor;