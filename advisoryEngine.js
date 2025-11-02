// Crop requirements for different crops grown in Machakos County
const CROP_REQUIREMENTS = {
    'Maize': {
        minTemp: 18,          // Minimum temperature (°C)
        maxTemp: 32,          // Maximum temperature (°C)
        minRainfall: 50,      // Minimum rainfall for planting window (mm over 5 days)
        optimalRainfall: 100, // Optimal rainfall (mm over 5 days)
        maxRainfall: 200,     // Too much rain (mm over 5 days)
        plantingWindow: 5     // Days to consider for planting decision
    },
    'Beans': {
        minTemp: 15,
        maxTemp: 30,
        minRainfall: 40,
        optimalRainfall: 80,
        maxRainfall: 150,
        plantingWindow: 5
    },
    'Sorghum': {
        minTemp: 20,
        maxTemp: 35,
        minRainfall: 30,
        optimalRainfall: 70,
        maxRainfall: 120,
        plantingWindow: 5
    }
};

/**
 * Generate farming advisory based on weather data and crop requirements
 * @param {Object} weatherData - Processed weather data from weatherService
 * @param {string} crop - Crop type (Maize, Beans, Sorghum)
 * @param {string} location - Location name
 * @returns {Object} Complete advisory object
 */
function generateAdvisory(weatherData, crop, location) {
    const timestamp = new Date().toISOString();
    console.log(`[Advisory] ${timestamp} - Generating advisory for ${crop} in ${location}`);
    
    try {
        // Validate inputs
        if (!CROP_REQUIREMENTS[crop]) {
            throw new Error(`Invalid crop type: ${crop}`);
        }
        
        if (!weatherData || !weatherData.dailyForecasts || weatherData.dailyForecasts.length < 5) {
            throw new Error('Insufficient weather data for advisory generation');
        }
        
        const cropReqs = CROP_REQUIREMENTS[crop];
        const next5Days = weatherData.dailyForecasts.slice(0, 5);
        
        // Calculate weather conditions for planting decision
        const totalRainfall = next5Days.reduce((sum, day) => sum + day.totalRainfall, 0);
        const avgTemperature = next5Days.reduce((sum, day) => sum + day.avgTemperature, 0) / next5Days.length;
        const maxTemp = Math.max(...next5Days.map(day => day.maxTemperature));
        const minTemp = Math.min(...next5Days.map(day => day.minTemperature));
        const avgRainProbability = next5Days.reduce((sum, day) => sum + day.rainProbability, 0) / next5Days.length;
        
        // Check for weather warnings
        const warnings = checkWeatherWarnings(next5Days, cropReqs);
        
        // Determine recommendation based on conditions
        const recommendation = determineRecommendation(
            totalRainfall, 
            avgTemperature, 
            maxTemp, 
            minTemp, 
            avgRainProbability, 
            next5Days, 
            cropReqs
        );
        
        // Generate advisory message
        const advisory = createAdvisoryMessage(recommendation, crop, location, {
            totalRainfall,
            avgTemperature,
            avgRainProbability,
            warnings
        });
        
        // Generate reasoning
        const reasoning = createReasoning(recommendation, crop, {
            totalRainfall,
            avgTemperature,
            avgRainProbability,
            temperatureInRange: avgTemperature >= cropReqs.minTemp && avgTemperature <= cropReqs.maxTemp,
            warnings,
            cropReqs
        });
        
        // Debug: Check for mismatch between recommendation and advisory message
        console.log(`[Advisory] VALIDATION - Recommendation: ${recommendation}`);
        console.log(`[Advisory] VALIDATION - Message contains WAIT: ${advisory.includes('WAIT') || advisory.includes('⏳')}`);
        console.log(`[Advisory] VALIDATION - Message contains PLANT: ${advisory.includes('PLANT NOW') || advisory.includes('🌱')}`);
        
        if ((recommendation === 'PLANT NOW' && (advisory.includes('WAIT') || advisory.includes('⏳'))) ||
            (recommendation === 'WAIT 2-3 DAYS' && (advisory.includes('PLANT NOW') || advisory.includes('🌱'))) ||
            (recommendation === 'DO NOT PLANT YET' && !advisory.includes('DO NOT'))) {
            console.error(`[Advisory] CRITICAL MISMATCH! Recommendation: ${recommendation}, but message says: ${advisory.substring(0, 100)}...`);
        }

        const result = {
            location: location,
            locationName: weatherData.locationName,
            crop: crop,
            recommendation: recommendation,
            advisory: advisory,
            reasoning: reasoning,
            generatedAt: timestamp,
            details: {
                totalRainfall: `${totalRainfall.toFixed(1)}mm`,
                rainProbability: `${avgRainProbability.toFixed(0)}%`,
                avgTemperature: `${avgTemperature.toFixed(1)}°C`,
                temperatureRange: `${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C`,
                warnings: warnings,
                cropRequirements: {
                    temperatureRange: `${cropReqs.minTemp}°C - ${cropReqs.maxTemp}°C`,
                    minRainfall: `${cropReqs.minRainfall}mm`,
                    optimalRainfall: `${cropReqs.optimalRainfall}mm`
                }
            },
            forecast: next5Days.map(day => ({
                date: day.date,
                displayDate: day.displayDate,
                dayName: day.dayName,
                maxTemp: day.maxTemperature,
                minTemp: day.minTemperature,
                rainfall: day.totalRainfall,
                rainProbability: day.rainProbability
            }))
        };
        
        console.log(`[Advisory] Generated recommendation: ${recommendation} for ${crop} in ${location}`);
        return result;
        
    } catch (error) {
        console.error('[Advisory] Error generating advisory:', error.message);
        throw error;
    }
}

/**
 * Determine planting recommendation based on weather conditions
 * @param {number} totalRainfall 
 * @param {number} avgTemperature 
 * @param {number} maxTemp 
 * @param {number} minTemp 
 * @param {number} avgRainProbability 
 * @param {Array} dailyForecasts 
 * @param {Object} cropReqs 
 * @returns {string} Recommendation
 */
function determineRecommendation(totalRainfall, avgTemperature, maxTemp, minTemp, avgRainProbability, dailyForecasts, cropReqs) {
    // Check for immediate disqualifying conditions
    
    // Temperature outside crop range
    if (avgTemperature < cropReqs.minTemp || avgTemperature > cropReqs.maxTemp) {
        return 'DO NOT PLANT YET';
    }
    
    // Very low rainfall expected
    if (totalRainfall < cropReqs.minRainfall / 2) {
        return 'DO NOT PLANT YET';
    }
    
    // Very low rain probability
    if (avgRainProbability < 20) {
        return 'DO NOT PLANT YET';
    }
    
    // Check for heavy rains in next 2 days that could damage seeds
    const next2Days = dailyForecasts.slice(0, 2);
    const heavyRainInNext2Days = next2Days.some(day => day.totalRainfall > 50);
    if (heavyRainInNext2Days) {
        return 'DO NOT PLANT YET';
    }
    
    // Check for optimal planting conditions
    if (totalRainfall >= cropReqs.minRainfall && 
        avgRainProbability > 40 && 
        avgTemperature >= cropReqs.minTemp && 
        avgTemperature <= cropReqs.maxTemp) {
        
        // Check if it's close to optimal conditions
        if (totalRainfall >= cropReqs.optimalRainfall * 0.8 && avgRainProbability > 60) {
            return 'PLANT NOW';
        } else {
            return 'PLANT NOW';
        }
    }
    
    // Marginal conditions - check if better conditions expected later
    if (totalRainfall >= cropReqs.minRainfall / 2 && 
        totalRainfall < cropReqs.minRainfall && 
        avgRainProbability >= 20 && avgRainProbability <= 40) {
        
        // Check if better conditions in days 3-5
        const days3to5 = dailyForecasts.slice(2, 5);
        const laterRainfall = days3to5.reduce((sum, day) => sum + day.totalRainfall, 0);
        const laterRainProb = days3to5.reduce((sum, day) => sum + day.rainProbability, 0) / days3to5.length;
        
        if (laterRainfall > totalRainfall / 2 || laterRainProb > avgRainProbability + 20) {
            return 'WAIT 2-3 DAYS';
        }
    }
    
    // Default case based on minimal acceptable conditions
    if (totalRainfall >= cropReqs.minRainfall && avgRainProbability > 30) {
        return 'PLANT NOW';
    }
    
    return 'DO NOT PLANT YET';
}

/**
 * Create advisory message based on recommendation
 * @param {string} recommendation 
 * @param {string} crop 
 * @param {string} location 
 * @param {Object} weatherDetails 
 * @returns {string} Advisory message
 */
function createAdvisoryMessage(recommendation, crop, location, weatherDetails) {
    const cropLower = crop.toLowerCase();
    const locationName = location.includes('Sub-County') ? location : `${location} Sub-County`;
    
    const greetings = [
        'Jambo mkulima!',
        'Habari za asubuhi!',
        'Hello farmer!'
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    switch (recommendation) {
        case 'PLANT NOW':
            if (weatherDetails.totalRainfall >= 80 && weatherDetails.avgRainProbability >= 60) {
                return `${greeting} 🌱 EXCELLENT time to plant ${cropLower} in ${locationName}! 

WHY NOW IS PERFECT:
• Good rains coming (${weatherDetails.totalRainfall.toFixed(0)}mm expected)
• Perfect temperature (${weatherDetails.avgTemperature.toFixed(0)}°C - ideal for ${cropLower})
• High chance of rain (${weatherDetails.avgRainProbability.toFixed(0)}%)

ACTION: Plant your seeds within 2 days. The soil will have good moisture and your ${cropLower} will get the best start!`;
            } else {
                return `${greeting} 🌱 GOOD time to plant ${cropLower} in ${locationName}!

WHY YOU SHOULD PLANT:
• Enough rain expected (${weatherDetails.totalRainfall.toFixed(0)}mm)
• Good temperature (${weatherDetails.avgTemperature.toFixed(0)}°C)
• Decent rain chances (${weatherDetails.avgRainProbability.toFixed(0)}%)

ACTION: Prepare your seeds and plant within 2-3 days. Don't wait too long!`;
            }
            break;
            
        case 'WAIT 2-3 DAYS':
            return `${greeting} ⏳ WAIT 2-3 days before planting ${cropLower} in ${locationName}.

WHY WAIT:
• Rain expected (${weatherDetails.totalRainfall.toFixed(0)}mm) but timing could be better
• Temperature okay (${weatherDetails.avgTemperature.toFixed(0)}°C)
• Better conditions may come later this week

ACTION: Prepare your seeds, check soil moisture, but wait for better weather window.`;
            break;
            
        case 'DO NOT PLANT YET':
            if (weatherDetails.avgTemperature < 18) {
                return `${greeting} ❌ DO NOT plant ${cropLower} yet in ${locationName}.

WHY NOT TO PLANT:
• Too cold (${weatherDetails.avgTemperature.toFixed(0)}°C - ${cropLower} needs warmer weather)
• Seeds may not germinate well in cold soil
• Risk of poor growth

ACTION: Wait for warmer weather. Check again in 3-4 days.`;
            } else if (weatherDetails.avgTemperature > 32) {
                return `${greeting} ❌ DO NOT plant ${cropLower} yet in ${locationName}.

WHY NOT TO PLANT:
• Too hot (${weatherDetails.avgTemperature.toFixed(0)}°C - will stress young plants)
• Seeds may dry out before growing
• High risk of crop failure

ACTION: Wait for cooler weather. Check again in 3-4 days.`;
            } else if (weatherDetails.totalRainfall < 25) {
                return `${greeting} ❌ DO NOT plant ${cropLower} yet in ${locationName}.

WHY NOT TO PLANT:
• Very little rain expected (${weatherDetails.totalRainfall.toFixed(0)}mm - not enough)
• Soil will be too dry for seeds
• High risk of crop failure

ACTION: Wait for better rains. Check again in 3-4 days.`;
            } else {
                return `${greeting} ❌ DO NOT plant ${cropLower} yet in ${locationName}.

WHY NOT TO PLANT:
• Weather conditions not quite right
• Risk of poor germination
• Better to wait for ideal conditions

ACTION: Be patient. Check again in 3-4 days for better timing.`;
            }
            break;
            
        default:
            return `${greeting} Weather advisory for ${cropLower} in ${locationName} is currently unavailable. Please try again later.`;
    }
}

/**
 * Create reasoning explanation for the recommendation
 * @param {string} recommendation 
 * @param {string} crop 
 * @param {Object} conditions 
 * @returns {string} Reasoning explanation
 */
function createReasoning(recommendation, crop, conditions) {
    const { totalRainfall, avgTemperature, avgRainProbability, temperatureInRange, warnings, cropReqs } = conditions;
    
    let reasoning = '';
    
    switch (recommendation) {
        case 'PLANT NOW':
            reasoning = `Conditions are favorable because: `;
            const positives = [];
            
            if (totalRainfall >= cropReqs.minRainfall) {
                positives.push(`expected rainfall (${totalRainfall.toFixed(1)}mm) meets crop requirements`);
            }
            
            if (avgRainProbability > 40) {
                positives.push(`good rain probability (${avgRainProbability.toFixed(0)}%)`);
            }
            
            if (temperatureInRange) {
                positives.push(`temperatures (${avgTemperature.toFixed(1)}°C) are within ideal range for ${crop.toLowerCase()}`);
            }
            
            reasoning += positives.join(', ') + '.';
            break;
            
        case 'WAIT 2-3 DAYS':
            reasoning = `Current conditions are marginal. `;
            
            if (totalRainfall < cropReqs.minRainfall) {
                reasoning += `Expected rainfall (${totalRainfall.toFixed(1)}mm) is below optimal levels. `;
            }
            
            if (avgRainProbability < 40) {
                reasoning += `Rain probability (${avgRainProbability.toFixed(0)}%) is moderate. `;
            }
            
            reasoning += `Better conditions may develop in 2-3 days.`;
            break;
            
        case 'DO NOT PLANT YET':
            reasoning = `Conditions are not suitable because: `;
            const negatives = [];
            
            if (!temperatureInRange) {
                if (avgTemperature < cropReqs.minTemp) {
                    negatives.push(`temperatures (${avgTemperature.toFixed(1)}°C) are too low for ${crop.toLowerCase()}`);
                } else {
                    negatives.push(`temperatures (${avgTemperature.toFixed(1)}°C) are too high for ${crop.toLowerCase()}`);
                }
            }
            
            if (totalRainfall < cropReqs.minRainfall / 2) {
                negatives.push(`expected rainfall (${totalRainfall.toFixed(1)}mm) is very low`);
            }
            
            if (avgRainProbability < 20) {
                negatives.push(`rain probability (${avgRainProbability.toFixed(0)}%) is very low`);
            }
            
            reasoning += negatives.join(', ') + '.';
            break;
    }
    
    // Add warnings if any
    if (warnings.length > 0) {
        reasoning += ` Additional concerns: ${warnings.join(', ')}.`;
    }
    
    return reasoning;
}

/**
 * Check for weather warnings that could affect planting
 * @param {Array} dailyForecasts - 5-day forecast
 * @param {Object} cropRequirements - Crop requirements object
 * @returns {Array} Array of warning messages
 */
function checkWeatherWarnings(dailyForecasts, cropRequirements) {
    const warnings = [];
    
    // Check for heavy rainfall that could damage seeds
    const heavyRainDays = dailyForecasts.filter(day => day.totalRainfall > 50);
    if (heavyRainDays.length > 0) {
        warnings.push(`Heavy rains expected on ${heavyRainDays.map(day => day.dayName).join(', ')} (may damage seeds)`);
    }
    
    // Check for extreme temperatures
    const hotDays = dailyForecasts.filter(day => day.maxTemperature > cropRequirements.maxTemp + 3);
    if (hotDays.length > 0) {
        warnings.push(`Very high temperatures expected on ${hotDays.map(day => day.dayName).join(', ')}`);
    }
    
    const coldDays = dailyForecasts.filter(day => day.minTemperature < cropRequirements.minTemp - 3);
    if (coldDays.length > 0) {
        warnings.push(`Very low temperatures expected on ${coldDays.map(day => day.dayName).join(', ')}`);
    }
    
    // Check for extended dry periods
    const consecutiveDryDays = getConsecutiveDryDays(dailyForecasts);
    if (consecutiveDryDays >= 4) {
        warnings.push(`${consecutiveDryDays} consecutive days with little to no rain expected`);
    }
    
    // Check for sudden temperature changes
    const tempChanges = checkTemperatureChanges(dailyForecasts);
    if (tempChanges.length > 0) {
        warnings.push(...tempChanges);
    }
    
    return warnings;
}

/**
 * Count consecutive dry days (< 1mm rain and < 30% probability)
 * @param {Array} dailyForecasts 
 * @returns {number} Number of consecutive dry days
 */
function getConsecutiveDryDays(dailyForecasts) {
    let consecutiveDry = 0;
    let maxConsecutive = 0;
    
    for (const day of dailyForecasts) {
        if (day.totalRainfall < 1 && day.rainProbability < 30) {
            consecutiveDry++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveDry);
        } else {
            consecutiveDry = 0;
        }
    }
    
    return maxConsecutive;
}

/**
 * Check for sudden temperature changes
 * @param {Array} dailyForecasts 
 * @returns {Array} Array of temperature change warnings
 */
function checkTemperatureChanges(dailyForecasts) {
    const warnings = [];
    
    for (let i = 1; i < dailyForecasts.length; i++) {
        const prevDay = dailyForecasts[i - 1];
        const currentDay = dailyForecasts[i];
        
        const tempDrop = prevDay.minTemperature - currentDay.minTemperature;
        const tempRise = currentDay.maxTemperature - prevDay.maxTemperature;
        
        if (tempDrop > 8) {
            warnings.push(`Sudden temperature drop expected from ${prevDay.dayName} to ${currentDay.dayName}`);
        }
        
        if (tempRise > 10) {
            warnings.push(`Sudden temperature rise expected from ${prevDay.dayName} to ${currentDay.dayName}`);
        }
    }
    
    return warnings;
}

/**
 * Get all available crops with their requirements
 * @returns {Array} Array of crop objects
 */
function getAvailableCrops() {
    return Object.entries(CROP_REQUIREMENTS).map(([name, requirements]) => ({
        name: name,
        temperatureRange: `${requirements.minTemp}°C - ${requirements.maxTemp}°C`,
        minRainfall: `${requirements.minRainfall}mm`,
        optimalRainfall: `${requirements.optimalRainfall}mm`,
        plantingWindow: `${requirements.plantingWindow} days`
    }));
}

/**
 * Validate crop name
 * @param {string} crop 
 * @returns {boolean} True if crop is valid
 */
function isValidCrop(crop) {
    return Object.keys(CROP_REQUIREMENTS).includes(crop);
}

// Export functions
module.exports = {
    generateAdvisory,
    createAdvisoryMessage,
    checkWeatherWarnings,
    getAvailableCrops,
    isValidCrop,
    CROP_REQUIREMENTS
};