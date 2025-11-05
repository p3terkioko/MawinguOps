const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service for generating dynamic farming advisories
 * Uses Google's Gemini 2.0 Flash model for intelligent, contextual advice
 */
class GeminiAdvisoryService {
    constructor() {
        this.apiKey = process.env.GOOGLE_AI_API_KEY || process.env.gemini || process.env.GEMINI_API_KEY;
        this.genAI = null;
        this.model = null;
        this.isConfigured = false;
        
        this.initialize();
    }
    
    /**
     * Initialize Gemini AI client
     */
    initialize() {
        try {
            if (!this.apiKey) {
                console.warn('[GeminiAI] No API key found in environment variables');
                return;
            }
            
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            this.isConfigured = true;
            
            console.log('[GeminiAI] Successfully initialized with Gemini 2.0 Flash');
        } catch (error) {
            console.warn('[GeminiAI] Failed to initialize:', error.message);
            this.isConfigured = false;
        }
    }
    
    /**
     * Generate farming advisory using Gemini AI
     * @param {string} crop - Crop type (Maize, Beans, Sorghum)
     * @param {string} location - Location name
     * @param {Object} weatherData - Current weather conditions with dailyForecasts
     * @param {string} recommendation - Base recommendation (PLANT NOW, WAIT, DO NOT PLANT YET)
     * @param {Object} calculatedWeather - Pre-calculated weather summary (optional)
     * @returns {Promise<string>} Generated advisory message
     */
    async generateAdvisory(crop, location, weatherData, recommendation, calculatedWeather = null) {
        if (!this.isConfigured) {
            throw new Error('Gemini AI service not properly configured');
        }
        
        try {
            const prompt = this.buildAdvisoryPrompt(crop, location, weatherData, recommendation, calculatedWeather);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const advisory = response.text();
            
            console.log(`[GeminiAI] Generated advisory for ${crop} in ${location}`);
            return this.formatAdvisoryResponse(advisory, crop, location, recommendation);
            
        } catch (error) {
            console.error('[GeminiAI] Error generating advisory:', error.message);
            throw new Error(`Failed to generate AI advisory: ${error.message}`);
        }
    }
    
    /**
     * Build comprehensive prompt for Gemini AI
     * @param {string} crop - Crop type
     * @param {string} location - Location name
     * @param {Object} weatherData - Weather conditions with dailyForecasts array
     * @param {string} recommendation - Base recommendation
     * @param {Object} calculatedWeather - Pre-calculated summary (optional)
     * @returns {string} Formatted prompt
     */
    buildAdvisoryPrompt(crop, location, weatherData, recommendation, calculatedWeather = null) {
        // Calculate weather summary from dailyForecasts if not provided
        let totalRainfall, avgTemperature, avgRainProbability;
        
        if (calculatedWeather) {
            // Use pre-calculated values if provided
            totalRainfall = calculatedWeather.totalRainfall;
            avgTemperature = calculatedWeather.avgTemperature;
            avgRainProbability = calculatedWeather.avgRainProbability;
        } else {
            // Extract from dailyForecasts array (correct structure)
            if (weatherData?.dailyForecasts && weatherData.dailyForecasts.length > 0) {
                const next5Days = weatherData.dailyForecasts.slice(0, 5);
                totalRainfall = next5Days.reduce((sum, day) => sum + day.totalRainfall, 0);
                avgTemperature = next5Days.reduce((sum, day) => sum + day.avgTemperature, 0) / next5Days.length;
                avgRainProbability = next5Days.reduce((sum, day) => sum + day.rainProbability, 0) / next5Days.length;
            } else {
                // Fallback for old structure or missing data
                totalRainfall = weatherData?.summary?.totalRainfall ?? weatherData?.totalRainfall ?? 0;
                avgTemperature = weatherData?.summary?.avgTemperature ?? weatherData?.avgTemperature ?? 20;
                avgRainProbability = weatherData?.summary?.avgRainProbability ?? weatherData?.avgRainProbability ?? 0;
            }
        }
        
        console.log('[GeminiAI] Weather data extraction:', { totalRainfall, avgTemperature, avgRainProbability });
        
        return `You are a friendly agricultural advisor helping a farmer in Kenya. Write a SHORT, simple advisory message.

CONTEXT:
- Farmer wants to plant ${crop} in ${location}, Machakos County
- Current recommendation: ${recommendation}
- Weather forecast: ${totalRainfall.toFixed(1)}mm rain expected over 5 days, ${avgTemperature.toFixed(1)}°C average temperature, ${avgRainProbability.toFixed(0)}% rain probability

EXACT FORMAT REQUIRED:
🌾 Habari mkulima!

Based on the weather forecast for your area, this is a [RECOMMENDATION] for your ${crop.toLowerCase()}! The conditions look [promising/challenging] for the next few days.

Why now is [good/not ideal]:
The weather shows ${totalRainfall.toFixed(0)}mm of rain expected over the next 5 days with temperatures around ${avgTemperature.toFixed(0)}°C - [explain if this is good or bad for the crop in simple terms]. There's a ${avgRainProbability.toFixed(0)}% chance of rain, which means [simple explanation].

IMPORTANT RULES:
- Keep it SHORT - maximum 100 words total
- Start with exactly "🌾 Habari mkulima!"
- Use simple language farmers understand
- Replace [RECOMMENDATION] with "GOOD TIME to plant" or "better to WAIT" or "NOT GOOD to plant"
- Be encouraging but honest
- No technical jargon

Write the message now:`;
    }
    
    /**
     * Format and enhance the AI-generated response
     * @param {string} advisory - Raw AI response
     * @param {string} crop - Crop type
     * @param {string} location - Location
     * @param {string} recommendation - Recommendation type
     * @returns {string} Formatted advisory
     */
    formatAdvisoryResponse(advisory, crop, location, recommendation) {
        // Add footer with service info
        const footer = `\n\n---\n🤖 Generated by MawinguOps AI Advisory System\n📅 ${new Date().toLocaleDateString('en-KE')}\n📍 Weather data for ${location}, Machakos County`;
        
        // Ensure proper line breaks for readability
        let formattedAdvisory = advisory
            .replace(/\n\n\n+/g, '\n\n') // Remove excessive line breaks
            .replace(/([.!?])\s*([A-Z🌤️🧬📊🎯❌⏳✅])/g, '$1\n\n$2') // Add breaks after sentences before sections
            .trim();
        
        return formattedAdvisory + footer;
    }
    
    /**
     * Generate weather summary for frontend display
     * @param {Object} weatherData - Weather conditions
     * @param {string} location - Location name
     * @returns {Promise<string>} Weather summary
     */
    async generateWeatherSummary(weatherData, location) {
        if (!this.isConfigured) {
            const totalRainfall = weatherData?.summary?.totalRainfall ?? weatherData?.totalRainfall ?? 0;
            const avgTemperature = weatherData?.summary?.avgTemperature ?? weatherData?.avgTemperature ?? 20;
            return `Weather Summary for ${location}: ${totalRainfall.toFixed(1)}mm rain expected, ${avgTemperature.toFixed(1)}°C average temperature.`;
        }
        
        try {
            // Safely extract weather data from the correct structure
            const totalRainfall = weatherData?.summary?.totalRainfall ?? weatherData?.totalRainfall ?? 0;
            const avgTemperature = weatherData?.summary?.avgTemperature ?? weatherData?.avgTemperature ?? 20;
            const avgRainProbability = weatherData?.summary?.avgRainProbability ?? weatherData?.avgRainProbability ?? 0;
            
            const prompt = `Generate a concise, farmer-friendly weather summary for ${location}, Machakos County, Kenya.

Weather Data:
- Rainfall: ${totalRainfall.toFixed(1)}mm over 5 days
- Temperature: ${avgTemperature.toFixed(1)}°C average
- Rain Probability: ${avgRainProbability.toFixed(0)}%

Requirements:
- Maximum 2-3 sentences
- Use simple, clear language
- Include emoji weather icons
- Mention what this means for farming activities
- Be encouraging and positive

Generate the summary:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
            
        } catch (error) {
            console.error('[GeminiAI] Error generating weather summary:', error.message);
            const totalRainfall = weatherData?.summary?.totalRainfall ?? weatherData?.totalRainfall ?? 0;
            const avgTemperature = weatherData?.summary?.avgTemperature ?? weatherData?.avgTemperature ?? 20;
            return `Weather Summary for ${location}: ${totalRainfall.toFixed(1)}mm rain expected, ${avgTemperature.toFixed(1)}°C average temperature.`;
        }
    }
    
    /**
     * Check if service is available
     * @returns {boolean} Service availability
     */
    isAvailable() {
        return this.isConfigured;
    }
    
    /**
     * Get service status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            configured: this.isConfigured,
            model: this.isConfigured ? 'gemini-2.0-flash-exp' : null,
            apiKeyPresent: !!this.apiKey
        };
    }
}

module.exports = GeminiAdvisoryService;