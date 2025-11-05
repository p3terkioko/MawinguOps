/**
 * MawinguOps Frontend Application
 * Handles user interactions and API communications for farming advisory system
 */

class MawinguOpsApp {
    constructor() {
        this.baseURL = window.location.origin;
        this.currentAdvisory = null;
        this.locations = [];
        this.crops = [];
        
        console.log("[App] MawinguOps Frontend initialized");
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log("[App] Starting initialization...");
            
            // Set fixed values for Vota/Maize only
            this.locations = ['Vota'];
            this.crops = [{ name: 'Maize', temperatureRange: '18°C - 32°C' }];
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check API health
            await this.checkAPIHealth();
            
            console.log("[App] Initialization complete - Fixed to Vota/Maize");
            
        } catch (error) {
            console.error("[App] Initialization failed:", error);
            this.showError("Failed to initialize the application. Please refresh the page.");
        }
    }

    /**
     * Load available locations from the API
     */
    async loadLocations() {
        try {
            console.log("[App] Loading locations...");
            
            const response = await fetch(`${this.baseURL}/api/locations`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load locations');
            }
            
            this.locations = data.locations || [];
            this.populateLocationSelect();
            
            console.log(`[App] Loaded ${this.locations.length} locations`);
            
        } catch (error) {
            console.error("[App] Error loading locations:", error);
            // Use fallback locations if API fails
            this.locations = ['Vota', 'Kathiani', 'Mwala', 'Masii'];
            this.populateLocationSelect();
        }
    }

    /**
     * Load available crops from the API
     */
    async loadCrops() {
        try {
            console.log("[App] Loading crops...");
            
            const response = await fetch(`${this.baseURL}/api/crops`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load crops');
            }
            
            this.crops = data.crops || [];
            this.populateCropSelect();
            
            console.log(`[App] Loaded ${this.crops.length} crops`);
            
        } catch (error) {
            console.error("[App] Error loading crops:", error);
            // Use fallback crops if API fails
            this.crops = [
                { name: 'Maize', temperatureRange: '18°C - 32°C' },
                { name: 'Beans', temperatureRange: '15°C - 30°C' },
                { name: 'Sorghum', temperatureRange: '20°C - 35°C' }
            ];
            this.populateCropSelect();
        }
    }

    /**
     * Check API health status
     */
    async checkAPIHealth() {
        try {
            const response = await fetch(`${this.baseURL}/api/health`);
            const data = await response.json();
            
            if (response.ok) {
                console.log(`[App] API Status: ${data.status} (Uptime: ${data.uptimeFormatted})`);
            } else {
                console.warn("[App] API health check failed:", data);
            }
            
        } catch (error) {
            console.warn("[App] Could not check API health:", error.message);
        }
    }

    /**
     * Populate the location select dropdown
     */
    populateLocationSelect() {
        const locationSelect = document.getElementById('location');
        if (!locationSelect) {
            console.error("[App] Location select element not found");
            return;
        }
        
        console.log(`[App] Populating ${this.locations.length} locations`);
        
        // Clear existing options (except the first placeholder)
        locationSelect.innerHTML = '<option value="">Select your location...</option>';
        
        // Add location options
        this.locations.forEach(location => {
            const option = document.createElement('option');
            // Use just the location name as value, but display with "Sub-County"
            const locationName = typeof location === 'string' ? location : location.name;
            option.value = locationName;
            option.textContent = `${locationName} Sub-County`;
            locationSelect.appendChild(option);
            console.log(`[App] Added location option: ${option.value}`);
        });
    }

    /**
     * Populate the crop select dropdown
     */
    populateCropSelect() {
        const cropSelect = document.getElementById('crop');
        if (!cropSelect) {
            console.error("[App] Crop select element not found");
            return;
        }
        
        console.log(`[App] Populating ${this.crops.length} crops`);
        
        // Clear existing options (except the first placeholder)
        cropSelect.innerHTML = '<option value="">Select your crop...</option>';
        
        // Add crop options
        this.crops.forEach(crop => {
            const option = document.createElement('option');
            option.value = crop.name;
            option.textContent = `${crop.name} (${crop.temperatureRange || 'Temperature range not specified'})`;
            cropSelect.appendChild(option);
            console.log(`[App] Added crop option: ${crop.name}`);
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Form submission
        const weatherForm = document.getElementById('weatherForm');
        if (weatherForm) {
            weatherForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Retry button
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.handleRetry());
        }

        // Forecast toggle
        const forecastToggle = document.getElementById('forecastToggle');
        if (forecastToggle) {
            forecastToggle.addEventListener('click', () => this.toggleForecast());
        }

        // Form is always valid with fixed values
        const submitBtn = document.getElementById('getAdvisoryBtn');
        if (submitBtn) {
            submitBtn.classList.remove('disabled');
            submitBtn.disabled = false;
        }
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        console.log("[App] Form submitted for Vota/Maize");
        
        const location = 'Vota';
        const crop = 'Maize';
        
        console.log(`[App] Using fixed values - Location: "${location}", Crop: "${crop}"`);
        
        console.log(`[App] Getting advisory for ${crop} in ${location}`);
        
        try {
            // Show loading state
            this.showLoading();
            
            // Get advisory from API
            await this.getAdvisory(location, crop);
            
        } catch (error) {
            console.error("[App] Error getting advisory:", error);
            this.showError(error.message || "Failed to get farming advisory. Please try again.");
        }
    }

    /**
     * Get farming advisory from the API
     */
    async getAdvisory(location, crop) {
        try {
            console.log(`[App] Requesting advisory for ${crop} in ${location}`);
            
            // Add cache-busting timestamp
            const timestamp = new Date().getTime();
            
            const response = await fetch(`${this.baseURL}/api/advisory?t=${timestamp}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: JSON.stringify({
                    location: location,
                    crop: crop
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.details || 'Failed to get advisory');
            }
            
            console.log("[App] Fresh advisory received (timestamp: " + timestamp + "):", data);
            console.log("[App] Recommendation:", data.advisory.recommendation);
            console.log("[App] Advisory message length:", data.advisory.advisory.length);
            console.log("[App] First 200 chars:", data.advisory.advisory.substring(0, 200));
            
            // Store the advisory data
            this.currentAdvisory = data.advisory;
            
            // Display the results
            this.displayAdvisory(data);
            
        } catch (error) {
            console.error("[App] API request failed:", error);
            throw error;
        }
    }

    /**
     * Display the advisory results
     */
    displayAdvisory(data) {
        const { advisory, enhanced, geminiStatus, mlEnabled, modelStatus } = data;
        
        console.log("[App] Displaying advisory results");
        console.log(`[App] Enhanced status: ${enhanced}, Gemini status: ${geminiStatus}`);
        
        // Hide other sections
        this.hideAllSections();
        
        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
        }
        
        // Update recommendation badge
        this.updateRecommendationBadge(advisory.recommendation);
        
        // Update advisory message (will prioritize enhancedMessage)
        this.updateAdvisoryMessage(advisory);
        
        // Update weather details
        this.updateWeatherDetails(advisory.details);
        
        // Update forecast
        this.updateForecast(advisory.forecast);
        
        // Show enhanced status if available
        if (enhanced && geminiStatus === 'enhanced') {
            console.log("[App] ✅ Displaying Gemini AI-enhanced advisory");
            console.log("[App] Enhanced message:", advisory.enhancedMessage ? "Present" : "Missing");
        } else {
            console.log("[App] ⚠️ Displaying basic advisory (Gemini not used)");
        }
        
        // Show ML status if available
        if (mlEnabled) {
            console.log("[App] ML-enhanced advisory (Model status: " + modelStatus + ")");
        }
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Update recommendation badge
     */
    updateRecommendationBadge(recommendation) {
        const badge = document.getElementById('recommendationBadge');
        const icon = document.getElementById('badgeIcon');
        const text = document.getElementById('badgeText');
        
        if (!badge || !icon || !text) return;
        
        // Reset classes
        badge.className = 'badge-content';
        
        // Set content based on recommendation
        switch (recommendation) {
            case 'PLANT NOW':
                badge.classList.add('plant-now');
                icon.textContent = '🌱';
                text.textContent = 'PLANT NOW';
                break;
                
            case 'WAIT 2-3 DAYS':
                badge.classList.add('wait');
                icon.textContent = '⏳';
                text.textContent = 'WAIT 2-3 DAYS';
                break;
                
            case 'DO NOT PLANT YET':
                badge.classList.add('do-not-plant');
                icon.textContent = '❌';
                text.textContent = 'DO NOT PLANT YET';
                break;
                
            default:
                icon.textContent = '🌾';
                text.textContent = recommendation || 'ADVISORY READY';
        }
    }

    /**
     * Update advisory message
     */
    updateAdvisoryMessage(advisory) {
        const messageElement = document.getElementById('advisoryMainText');
        const reasoningElement = document.getElementById('reasoningText');
        
        if (messageElement) {
            // Clear element first
            messageElement.textContent = '';
            
            // Prioritize enhanced message from Gemini AI
            const message = advisory.enhancedMessage || advisory.advisory || advisory.message || 'No advisory message available.';
            messageElement.textContent = message;
            
            // Force repaint
            messageElement.style.opacity = '0.9';
            messageElement.style.opacity = '1';
            
            // Log which message type is being displayed
            if (advisory.enhancedMessage) {
                console.log('[App] ✅ Displaying Gemini-enhanced message');
                console.log('[App] Message preview:', message.substring(0, 100) + '...');
            } else {
                console.log('[App] ⚠️ Displaying basic advisory message');
            }
        } else {
            console.error('[App] ❌ Advisory message element not found! Looking for: advisoryMainText');
        }
        
        if (reasoningElement && advisory.reasoning) {
            reasoningElement.textContent = '';
            reasoningElement.textContent = advisory.reasoning;
        }
    }

    /**
     * Update weather details
     */
    updateWeatherDetails(details) {
        const weatherGrid = document.getElementById('weatherGrid');
        if (!weatherGrid || !details) return;
        
        console.log("[App] Updating weather details");
        
        // Clear existing content
        weatherGrid.innerHTML = '';
        
        // Create weather items
        const weatherItems = [
            {
                icon: '🌧️',
                label: 'Expected Rainfall',
                value: details.totalRainfall || 'N/A'
            },
            {
                icon: '☔',
                label: 'Rain Probability',
                value: details.rainProbability || 'N/A'
            },
            {
                icon: '🌡️',
                label: 'Average Temperature',
                value: details.avgTemperature || 'N/A'
            },
            {
                icon: '📊',
                label: 'Temperature Range',
                value: details.temperatureRange || 'N/A'
            }
        ];
        
        weatherItems.forEach(item => {
            const weatherItem = document.createElement('div');
            weatherItem.className = 'weather-item';
            weatherItem.innerHTML = `
                <div class="weather-icon">${item.icon}</div>
                <div class="weather-label">${item.label}</div>
                <div class="weather-value">${item.value}</div>
            `;
            weatherGrid.appendChild(weatherItem);
        });
        
        // Show warnings if any
        this.updateWeatherWarnings(details.warnings);
    }

    /**
     * Update weather warnings
     */
    updateWeatherWarnings(warnings) {
        const warningsSection = document.getElementById('weatherWarnings');
        const warningsList = document.getElementById('warningsList');
        
        if (!warningsSection || !warningsList) return;
        
        if (!warnings || warnings.length === 0) {
            warningsSection.classList.add('hidden');
            return;
        }
        
        console.log(`[App] Showing ${warnings.length} weather warnings`);
        
        // Clear existing warnings
        warningsList.innerHTML = '';
        
        // Add warning items
        warnings.forEach(warning => {
            const warningItem = document.createElement('div');
            warningItem.className = 'warning-item';
            warningItem.textContent = warning;
            warningsList.appendChild(warningItem);
        });
        
        // Show warnings section
        warningsSection.classList.remove('hidden');
    }

    /**
     * Update forecast data
     */
    updateForecast(forecast) {
        const forecastGrid = document.getElementById('forecastGrid');
        if (!forecastGrid || !forecast || !Array.isArray(forecast)) return;
        
        console.log(`[App] Updating forecast with ${forecast.length} days`);
        
        // Clear existing forecast
        forecastGrid.innerHTML = '';
        
        // Create forecast cards
        forecast.forEach(day => {
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            forecastCard.innerHTML = `
                <div class="forecast-date">${day.displayDate || day.dayName || day.date}</div>
                <div class="forecast-temps">
                    <span class="temp-high">${day.maxTemp}°C</span>
                    <span class="temp-low">${day.minTemp}°C</span>
                </div>
                <div class="forecast-rain">Rain: ${day.rainfall}mm</div>
                <div class="forecast-prob">${day.rainProbability}% chance</div>
            `;
            forecastGrid.appendChild(forecastCard);
        });
    }

    /**
     * Toggle forecast visibility
     */
    toggleForecast() {
        const forecastToggle = document.getElementById('forecastToggle');
        const detailedForecast = document.getElementById('detailedForecast');
        const toggleIcon = forecastToggle.querySelector('.toggle-icon');
        
        if (!detailedForecast || !toggleIcon) return;
        
        const isHidden = detailedForecast.classList.contains('hidden');
        
        if (isHidden) {
            detailedForecast.classList.remove('hidden');
            toggleIcon.textContent = '▲';
            forecastToggle.classList.add('expanded');
            forecastToggle.querySelector('span').textContent = 'Hide 5-Day Forecast';
        } else {
            detailedForecast.classList.add('hidden');
            toggleIcon.textContent = '▼';
            forecastToggle.classList.remove('expanded');
            forecastToggle.querySelector('span').textContent = 'View 5-Day Forecast';
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        console.log("[App] Showing loading state");
        this.hideAllSections();
        
        const loadingSection = document.getElementById('loadingSection');
        if (loadingSection) {
            loadingSection.classList.remove('hidden');
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        console.log("[App] Showing error:", message);
        this.hideAllSections();
        
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection) {
            errorSection.classList.remove('hidden');
        }
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }

    /**
     * Hide all sections
     */
    hideAllSections() {
        const sections = ['loadingSection', 'errorSection', 'resultsSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden');
            }
        });
    }

    /**
     * Handle retry button click
     */
    handleRetry() {
        console.log("[App] Retrying...");
        
        // Hide error section
        const errorSection = document.getElementById('errorSection');
        if (errorSection) {
            errorSection.classList.add('hidden');
        }
        
        // Re-submit the form if we have the values
        const location = document.getElementById('location').value;
        const crop = document.getElementById('crop').value;
        
        if (location && crop) {
            this.getAdvisory(location, crop).catch(error => {
                this.showError(error.message || "Failed to get farming advisory. Please try again.");
            });
        } else {
            // Scroll back to form
            const advisoryForm = document.getElementById('advisoryForm');
            if (advisoryForm) {
                advisoryForm.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    /**
     * Validate form inputs
     */
    validateForm() {
        const location = document.getElementById('location').value;
        const crop = document.getElementById('crop').value;
        const submitBtn = document.getElementById('getAdvisoryBtn');
        
        console.log(`[App] Form validation - Location: "${location}", Crop: "${crop}"`);
        
        if (submitBtn) {
            if (location && crop) {
                console.log("[App] Enabling submit button");
                submitBtn.disabled = false;
                submitBtn.classList.remove('disabled');
            } else {
                console.log("[App] Disabling submit button");
                submitBtn.disabled = true;
                submitBtn.classList.add('disabled');
            }
        } else {
            console.warn("[App] Submit button not found");
        }
    }

    /**
     * Utility method to format dates
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Log user interaction for analytics
     */
    logInteraction(action, data = {}) {
        console.log(`[Analytics] ${action}:`, data);
        
        // Here you could send analytics data to your backend
        // For now, we just log to console
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("[App] DOM loaded, initializing MawinguOps...");
    
    // Create global app instance
    window.mawinguApp = new MawinguOpsApp();
    
    // Log page load
    window.mawinguApp.logInteraction('page_load', {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
    });
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.mawinguApp) {
        window.mawinguApp.logInteraction(
            document.hidden ? 'page_hidden' : 'page_visible'
        );
    }
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('[App] Global error:', event.error);
    
    if (window.mawinguApp) {
        window.mawinguApp.logInteraction('javascript_error', {
            message: event.error?.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('[App] Unhandled promise rejection:', event.reason);
    
    if (window.mawinguApp) {
        window.mawinguApp.logInteraction('promise_rejection', {
            reason: event.reason?.message || event.reason
        });
    }
});

console.log("[App] MawinguOps Frontend script loaded successfully");
