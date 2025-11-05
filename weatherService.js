const axios = require('axios');

// Location coordinates for Machakos County sub-counties
const LOCATIONS = {
    'Vota': { lat: -1.3667, lon: 37.6333, name: 'Vota Sub-County' },
    'Kathiani': { lat: -1.3833, lon: 37.2500, name: 'Kathiani Sub-County' },
    'Mwala': { lat: -1.4833, lon: 37.5167, name: 'Mwala Sub-County' }
};

// Open-Meteo API configuration
const API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch raw weather data from Open-Meteo API
 * @param {string} location - Location name (Vota, Kathiani, Mwala)
 * @returns {Promise<Object>} Raw API response
 */
async function fetchWeatherData(location) {
    const timestamp = new Date().toISOString();
    console.log(`[Weather] ${timestamp} - Fetching weather data for ${location}`);
    
    try {
        // Validate location
        if (!LOCATIONS[location]) {
            throw new Error(`Invalid location: ${location}. Must be one of: ${Object.keys(LOCATIONS).join(', ')}`);
        }
        
        const coords = LOCATIONS[location];
        
        // Build API request parameters
        const params = {
            latitude: coords.lat,
            longitude: coords.lon,
            hourly: 'temperature_2m,precipitation,precipitation_probability',
            forecast_days: 7,
            timezone: 'Africa/Nairobi',
            // Add cache-busting parameter
            t: new Date().getTime()
        };
        
        // Make API request with cache headers
        const response = await axios.get(API_BASE_URL, {
            params: params,
            timeout: REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'MawinguOps/1.0.0',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        // Validate response
        if (!response.data || !response.data.hourly) {
            throw new Error('Invalid API response format');
        }
        
        console.log(`[Weather] Successfully fetched FRESH data for ${location} (${coords.lat}, ${coords.lon})`);
        console.log(`[Weather] Data timestamp: ${new Date().toISOString()}`);
        return response.data;
        
    } catch (error) {
        console.error(`[Weather] Error fetching weather data for ${location}:`, error.message);
        
        if (error.code === 'ECONNABORTED') {
            throw new Error('Weather service timeout. Please try again.');
        } else if (error.response) {
            throw new Error(`Weather API error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            throw new Error('Unable to connect to weather service. Check your internet connection.');
        } else {
            throw error;
        }
    }
}

/**
 * Process hourly weather data into daily summaries
 * @param {Object} rawData - Raw Open-Meteo API response
 * @returns {Array} Array of daily weather summaries
 */
function processWeatherData(rawData) {
    try {
        const { time, temperature_2m, precipitation, precipitation_probability } = rawData.hourly;
        
        if (!time || !temperature_2m || !precipitation || !precipitation_probability) {
            throw new Error('Missing required weather data fields');
        }
        
        // Group hourly data by day
        const dailyData = {};
        
        for (let i = 0; i < time.length; i++) {
            const date = time[i].split('T')[0]; // Extract date (YYYY-MM-DD)
            const hour = parseInt(time[i].split('T')[1].split(':')[0]); // Extract hour
            
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: date,
                    temperatures: [],
                    precipitation: [],
                    precipitationProbability: []
                };
            }
            
            // Add data if values are not null
            if (temperature_2m[i] !== null) {
                dailyData[date].temperatures.push(temperature_2m[i]);
            }
            
            if (precipitation[i] !== null) {
                dailyData[date].precipitation.push(precipitation[i]);
            }
            
            if (precipitation_probability[i] !== null) {
                dailyData[date].precipitationProbability.push(precipitation_probability[i]);
            }
        }
        
        // Calculate daily summaries
        const dailySummaries = [];
        
        for (const [date, data] of Object.entries(dailyData)) {
            if (data.temperatures.length === 0) continue; // Skip days with no data
            
            // Calculate temperature statistics
            const temps = data.temperatures;
            const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
            const maxTemp = Math.max(...temps);
            const minTemp = Math.min(...temps);
            
            // Calculate precipitation total
            const totalRainfall = data.precipitation.reduce((sum, rain) => sum + rain, 0);
            
            // Calculate rain probability (percentage of hours with >50% probability)
            const highProbHours = data.precipitationProbability.filter(prob => prob > 50).length;
            const rainProbability = data.precipitationProbability.length > 0 
                ? (highProbHours / data.precipitationProbability.length) * 100 
                : 0;
            
            // Format date for display
            const dateObj = new Date(date + 'T00:00:00Z');
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            dailySummaries.push({
                date: date,
                displayDate: `${dayName}, ${formattedDate}`,
                dayName: dayName,
                avgTemperature: Math.round(avgTemp * 10) / 10,
                maxTemperature: Math.round(maxTemp * 10) / 10,
                minTemperature: Math.round(minTemp * 10) / 10,
                totalRainfall: Math.round(totalRainfall * 10) / 10,
                rainProbability: Math.round(rainProbability),
                dataPoints: {
                    temperatureCount: temps.length,
                    precipitationCount: data.precipitation.length,
                    probabilityCount: data.precipitationProbability.length
                }
            });
        }
        
        // Sort by date and return first 7 days
        dailySummaries.sort((a, b) => a.date.localeCompare(b.date));
        
        console.log(`[Weather] Processed ${dailySummaries.length} days of weather data`);
        return dailySummaries.slice(0, 7);
        
    } catch (error) {
        console.error('[Weather] Error processing weather data:', error.message);
        throw new Error('Failed to process weather data');
    }
}

/**
 * Get processed weather data for a specific location
 * @param {string} location - Location name
 * @returns {Promise<Array>} Array of daily weather summaries
 */
async function getWeather(location) {
    try {
        console.log(`[Weather] Getting weather for ${location}`);
        
        // Fetch raw data from API
        const rawData = await fetchWeatherData(location);
        
        // Process into daily summaries
        const processedData = processWeatherData(rawData);
        
        // Add location metadata
        const locationInfo = LOCATIONS[location];
        const result = {
            location: location,
            locationName: locationInfo.name,
            coordinates: {
                latitude: locationInfo.lat,
                longitude: locationInfo.lon
            },
            timezone: rawData.timezone || 'Africa/Nairobi',
            fetchedAt: new Date().toISOString(),
            dailyForecasts: processedData
        };
        
        console.log(`[Weather] Successfully processed weather for ${location} - ${processedData.length} days`);
        return result;
        
    } catch (error) {
        console.error(`[Weather] Error getting weather for ${location}:`, error.message);
        throw error;
    }
}

/**
 * Get all available locations with their coordinates
 * @returns {Array} Array of location objects
 */
function getAvailableLocations() {
    return Object.entries(LOCATIONS).map(([key, value]) => ({
        code: key,
        name: value.name,
        latitude: value.lat,
        longitude: value.lon
    }));
}

/**
 * Validate location name
 * @param {string} location 
 * @returns {boolean} True if location is valid
 */
function isValidLocation(location) {
    return Object.keys(LOCATIONS).includes(location);
}

/**
 * Get weather summary for planting decision (next 5 days)
 * @param {string} location - Location name
 * @returns {Promise<Object>} Weather summary for planting decision
 */
async function getPlantingWeatherSummary(location) {
    try {
        const weatherData = await getWeather(location);
        const next5Days = weatherData.dailyForecasts.slice(0, 5);
        
        // Calculate totals for planting decision
        const totalRainfall = next5Days.reduce((sum, day) => sum + day.totalRainfall, 0);
        const avgTemperature = next5Days.reduce((sum, day) => sum + day.avgTemperature, 0) / next5Days.length;
        const maxTemp = Math.max(...next5Days.map(day => day.maxTemperature));
        const minTemp = Math.min(...next5Days.map(day => day.minTemperature));
        
        // Calculate overall rain probability
        const avgRainProbability = next5Days.reduce((sum, day) => sum + day.rainProbability, 0) / next5Days.length;
        
        // Check for heavy rain days (>50mm in single day)
        const heavyRainDays = next5Days.filter(day => day.totalRainfall > 50);
        
        return {
            location: location,
            locationName: weatherData.locationName,
            period: '5-day forecast',
            summary: {
                totalRainfall: Math.round(totalRainfall * 10) / 10,
                avgTemperature: Math.round(avgTemperature * 10) / 10,
                maxTemperature: Math.round(maxTemp * 10) / 10,
                minTemperature: Math.round(minTemp * 10) / 10,
                avgRainProbability: Math.round(avgRainProbability),
                heavyRainDays: heavyRainDays.length,
                heavyRainDates: heavyRainDays.map(day => day.displayDate)
            },
            dailyForecasts: next5Days,
            fetchedAt: weatherData.fetchedAt
        };
    } catch (error) {
        console.error(`[Weather] Error getting planting summary for ${location}:`, error.message);
        throw error;
    }
}

// Export functions
module.exports = {
    fetchWeatherData,
    processWeatherData,
    getWeather,
    getAvailableLocations,
    isValidLocation,
    getPlantingWeatherSummary,
    LOCATIONS
};