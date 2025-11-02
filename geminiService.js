const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service for generating dynamic farming advisories
 * Uses Google's Gemini 2.0 Flash model for intelligent, contextual advice
 */
class GeminiAdvisoryService {
    constructor() {
        this.apiKey = process.env.gemini || process.env.GEMINI_API_KEY;
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
     * @param {Object} weatherData - Current weather conditions
     * @param {string} recommendation - Base recommendation (PLANT NOW, WAIT, DO NOT PLANT YET)
     * @returns {Promise<string>} Generated advisory message
     */
    async generateAdvisory(crop, location, weatherData, recommendation) {
        if (!this.isConfigured) {
            throw new Error('Gemini AI service not properly configured');
        }
        
        try {
            const prompt = this.buildAdvisoryPrompt(crop, location, weatherData, recommendation);
            
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
     * @param {Object} weatherData - Weather conditions
     * @param {string} recommendation - Base recommendation
     * @returns {string} Formatted prompt
     */
    buildAdvisoryPrompt(crop, location, weatherData, recommendation) {
        // Safely extract weather data from the correct structure
        const totalRainfall = weatherData?.summary?.totalRainfall ?? weatherData?.totalRainfall ?? 0;
        const avgTemperature = weatherData?.summary?.avgTemperature ?? weatherData?.avgTemperature ?? 20;
        const avgRainProbability = weatherData?.summary?.avgRainProbability ?? weatherData?.avgRainProbability ?? 0;
        
        console.log('[GeminiAI] Weather data extraction:', { totalRainfall, avgTemperature, avgRainProbability });
        console.log('[GeminiAI] Raw weather summary:', weatherData?.summary);
        
        return `You are an expert agricultural advisor helping a smallholder farmer in Kenya. Write a natural, conversational farming advisory message.

CONTEXT:
- Farmer wants to plant ${crop} in ${location}, Machakos County
- Current recommendation: ${recommendation}
- Weather forecast: ${totalRainfall.toFixed(1)}mm rain expected over 5 days, ${avgTemperature.toFixed(1)}°C average temperature, ${avgRainProbability.toFixed(0)}% rain probability

Write a complete advisory message that includes:

1. A warm greeting in Swahili/English mix
2. Clear planting recommendation with appropriate emoji
3. Weather analysis explaining current conditions
4. Scientific explanation of why this recommendation makes sense
5. What will happen if they plant now vs wait
6. Specific actions they should take
7. Encouraging closing message

IMPORTANT RULES:
- Write in natural, flowing paragraphs - NO section headers or numbering
- Use simple language that farmers understand
- Include emojis naturally throughout the text
- Be warm, encouraging, and supportive
- Give specific, practical advice
- Mention local Machakos County context
- Keep it conversational, not technical

Write the complete advisory message now (just the message content, no structure markers):`;
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