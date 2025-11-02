/**
 * Africa's Talking USSD Service for MawinguOps
 * Handles USSD sessions and menu navigation
 */

const weatherService = require('./weatherService');
const advisoryEngine = require('./advisoryEngine');
const database = require('./database');

class USSDService {
    constructor() {
        this.sessions = new Map(); // Store session data temporarily
        this.sessionTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Process USSD request from Africa's Talking
     * @param {Object} params - USSD parameters from AT
     * @returns {String} - USSD response string
     */
    async processUSSDRequest(params) {
        const { sessionId, serviceCode, phoneNumber, text } = params;

        console.log(`[USSD] Session ${sessionId} - Phone: ${phoneNumber} - Input: "${text}"`);

        try {
            // Get or create session
            let session = this.getSession(sessionId, phoneNumber);
            
            // Parse user input
            const input = text ? text.trim() : '';
            const levels = input ? input.split('*').filter(level => level.length > 0) : [];

            // Route to appropriate handler based on current menu level
            const response = await this.handleMenuNavigation(session, levels, phoneNumber);
            
            // Update session
            this.updateSession(sessionId, session);
            
            return response;

        } catch (error) {
            console.error(`[USSD] Error processing request for ${phoneNumber}:`, error);
            return "END Service temporarily unavailable. Please try again later.\n\n- MawinguOps";
        }
    }

    /**
     * Handle menu navigation based on user input
     */
    async handleMenuNavigation(session, levels, phoneNumber) {
        // Main menu (no input or fresh session)
        if (levels.length === 0) {
            return this.showMainMenu();
        }

        const mainChoice = levels[0];

        switch (mainChoice) {
            case '1': // Weather Advisory
                return await this.handleWeatherAdvisory(levels, phoneNumber);
            
            case '2': // Register/Update Profile
                return await this.handleRegistration(levels, phoneNumber);
            
            case '3': // My Information
                return await this.handleMyInfo(levels, phoneNumber);
            
            case '4': // Help
                return this.showHelp();
            
            default:
                return "END Invalid selection. Please dial *384*7460# again and choose a valid option.\n\n- MawinguOps";
        }
    }

    /**
     * Show main menu
     */
    showMainMenu() {
        return "CON Welcome to MawinguOps 🌾\n" +
               "Smart Farming Advisory System\n\n" +
               "1. Get Weather Advisory\n" +
               "2. Register/Update Profile\n" +
               "3. My Information\n" +
               "4. Help & Instructions";
    }

    /**
     * Handle weather advisory flow
     */
    async handleWeatherAdvisory(levels, phoneNumber) {
        // Check if user is registered first
        const farmerResult = await database.getFarmer(phoneNumber);
        
        if (levels.length === 1) {
            if (!farmerResult.success) {
                return "CON You are not registered yet!\n\n" +
                       "Please select:\n" +
                       "1. Register now\n" +
                       "2. Continue anyway\n" +
                       "0. Back to main menu";
            }
            
            // User is registered, show crop selection
            return "CON Select crop for advisory:\n\n" +
                   "1. Maize\n" +
                   "2. Beans\n" +
                   "3. Sorghum\n" +
                   "0. Back to main menu";
        }

        if (levels.length === 2) {
            const choice = levels[1];
            
            // Handle unregistered user choices
            if (!farmerResult.success) {
                if (choice === '1') {
                    return "CON Select your location:\n\n" +
                           "1. Vota Sub-County\n" +
                           "2. Kathiani Sub-County\n" +
                           "3. Mwala Sub-County\n" +
                           "0. Back";
                } else if (choice === '2') {
                    return "CON Select crop:\n\n" +
                           "1. Maize\n" +
                           "2. Beans\n" +
                           "3. Sorghum\n" +
                           "0. Back";
                } else if (choice === '0') {
                    return this.showMainMenu();
                }
                return "END Invalid choice. Please try again.\n\n- MawinguOps";
            }

            // Handle registered user crop selection
            if (['1', '2', '3'].includes(choice)) {
                const crops = ['Maize', 'Beans', 'Sorghum'];
                const selectedCrop = crops[parseInt(choice) - 1];
                const farmer = farmerResult.farmer;
                
                return await this.generateAndShowAdvisory(phoneNumber, farmer.location, selectedCrop);
            } else if (choice === '0') {
                return this.showMainMenu();
            }
        }

        // Handle unregistered user registration flow
        if (levels.length === 3 && !farmerResult.success) {
            const regChoice = levels[1];
            const locationChoice = levels[2];
            
            if (regChoice === '1' && ['1', '2', '3'].includes(locationChoice)) {
                return "CON Select your crop:\n\n" +
                       "1. Maize\n" +
                       "2. Beans\n" +
                       "3. Sorghum\n" +
                       "0. Back";
            } else if (regChoice === '2' && ['1', '2', '3'].includes(locationChoice)) {
                const crops = ['Maize', 'Beans', 'Sorghum'];
                const selectedCrop = crops[parseInt(locationChoice) - 1];
                
                return "CON Select location:\n\n" +
                       "1. Vota Sub-County\n" +
                       "2. Kathiani Sub-County\n" +
                       "3. Mwala Sub-County\n" +
                       "0. Back";
            }
        }

        if (levels.length === 4 && !farmerResult.success) {
            const regChoice = levels[1];
            const locationChoice = levels[2];
            const cropChoice = levels[3];
            
            if (regChoice === '1' && ['1', '2', '3'].includes(locationChoice) && ['1', '2', '3'].includes(cropChoice)) {
                // Register and get advisory
                const locations = ['Vota', 'Kathiani', 'Mwala'];
                const crops = ['Maize', 'Beans', 'Sorghum'];
                const location = locations[parseInt(locationChoice) - 1];
                const crop = crops[parseInt(cropChoice) - 1];
                
                // Register farmer
                await database.registerFarmer(phoneNumber, location, crop);
                
                return await this.generateAndShowAdvisory(phoneNumber, location, crop);
            } else if (regChoice === '2') {
                // Get advisory without registration
                const crops = ['Maize', 'Beans', 'Sorghum'];
                const locations = ['Vota', 'Kathiani', 'Mwala'];
                const crop = crops[parseInt(locationChoice) - 1];
                const location = locations[parseInt(cropChoice) - 1];
                
                return await this.generateAndShowAdvisory(phoneNumber, location, crop);
            }
        }

        return "END Invalid selection. Please try again.\n\n- MawinguOps";
    }

    /**
     * Handle user registration
     */
    async handleRegistration(levels, phoneNumber) {
        if (levels.length === 1) {
            return "CON Registration/Update Profile\n\n" +
                   "Select your location:\n" +
                   "1. Vota Sub-County\n" +
                   "2. Kathiani Sub-County\n" +
                   "3. Mwala Sub-County\n" +
                   "0. Back to main menu";
        }

        if (levels.length === 2) {
            const locationChoice = levels[1];
            
            if (['1', '2', '3'].includes(locationChoice)) {
                return "CON Select your primary crop:\n\n" +
                       "1. Maize\n" +
                       "2. Beans\n" +
                       "3. Sorghum\n" +
                       "0. Back";
            } else if (locationChoice === '0') {
                return this.showMainMenu();
            }
        }

        if (levels.length === 3) {
            const locationChoice = levels[1];
            const cropChoice = levels[2];
            
            if (['1', '2', '3'].includes(locationChoice) && ['1', '2', '3'].includes(cropChoice)) {
                const locations = ['Vota', 'Kathiani', 'Mwala'];
                const crops = ['Maize', 'Beans', 'Sorghum'];
                const location = locations[parseInt(locationChoice) - 1];
                const crop = crops[parseInt(cropChoice) - 1];
                
                // Register or update farmer
                const result = await database.registerFarmer(phoneNumber, location, crop);
                
                if (result.success) {
                    return `END Registration successful! ✅\n\n` +
                           `Phone: ${phoneNumber}\n` +
                           `Location: ${location} Sub-County\n` +
                           `Primary Crop: ${crop}\n\n` +
                           `You can now get instant weather advisories by dialing *384*7460# and selecting "Get Weather Advisory".\n\n` +
                           `- MawinguOps`;
                } else {
                    if (result.error.includes('already registered')) {
                        return `END Profile updated! ✅\n\n` +
                               `Phone: ${phoneNumber}\n` +
                               `Location: ${location} Sub-County\n` +
                               `Primary Crop: ${crop}\n\n` +
                               `Your profile has been updated with the new information.\n\n` +
                               `- MawinguOps`;
                    } else {
                        return "END Registration failed. Please try again later.\n\n- MawinguOps";
                    }
                }
            } else if (cropChoice === '0') {
                return this.handleRegistration([levels[0]], phoneNumber);
            }
        }

        return "END Invalid selection. Please try again.\n\n- MawinguOps";
    }

    /**
     * Handle my information display
     */
    async handleMyInfo(levels, phoneNumber) {
        const farmerResult = await database.getFarmer(phoneNumber);
        
        if (!farmerResult.success) {
            return "END You are not registered yet.\n\n" +
                   "Dial *384*7460# and select 'Register/Update Profile' to get started.\n\n" +
                   "- MawinguOps";
        }

        const farmer = farmerResult.farmer;
        const registeredDate = new Date(farmer.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        let advisoryInfo = '';
        if (farmer.last_advisory_at) {
            const lastDate = new Date(farmer.last_advisory_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            advisoryInfo = `Last Advisory: ${lastDate}`;
        } else {
            advisoryInfo = 'No advisories received yet';
        }

        return `END Your Profile Information 👤\n\n` +
               `Phone: ${farmer.phone_number}\n` +
               `Location: ${farmer.location} Sub-County\n` +
               `Primary Crop: ${farmer.crop}\n` +
               `Registered: ${registeredDate}\n` +
               `${advisoryInfo}\n\n` +
               `Dial *384*7460# anytime for weather advisories!\n\n` +
               `- MawinguOps`;
    }

    /**
     * Show help information
     */
    showHelp() {
        return "END MawinguOps Help 📖\n\n" +
               "USSD: Dial *384*7460#\n" +
               "SMS: Send 'MAWINGU [CROP] [LOCATION]'\n" +
               "Example: MAWINGU MAIZE VOTA\n\n" +
               "Available Locations:\n" +
               "• Vota Sub-County\n" +
               "• Kathiani Sub-County\n" +
               "• Mwala Sub-County\n\n" +
               "Available Crops:\n" +
               "• Maize • Beans • Sorghum\n\n" +
               "Web: mawingu-ops-109647674635.us-central1.run.app\n\n" +
               "- MawinguOps Team";
    }

    /**
     * Generate and display weather advisory
     */
    async generateAndShowAdvisory(phoneNumber, location, crop) {
        try {
            console.log(`[USSD] Generating advisory for ${phoneNumber}: ${crop} in ${location}`);
            
            // Get weather data
            const weatherData = await weatherService.getWeather(location);
            
            // Generate advisory
            const advisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
            
            // Save advisory to database
            await database.saveAdvisory(
                phoneNumber,
                location,
                crop,
                advisory.advisory,
                advisory.recommendation,
                {
                    weatherSummary: advisory.details,
                    generatedAt: advisory.generatedAt,
                    source: 'USSD'
                }
            );

            // Format response for USSD display
            const response = `END 🌾 ${crop} Advisory - ${location}\n\n` +
                           `${advisory.recommendation}\n\n` +
                           `Weather Summary:\n` +
                           `• Temp: ${advisory.details.avgTemperature}\n` +
                           `• Rainfall: ${advisory.details.totalRainfall}\n` +
                           `• Rain Chance: ${advisory.details.rainProbability}\n\n` +
                           `${advisory.advisory}\n\n` +
                           `Generated: ${new Date().toLocaleString()}\n` +
                           `- MawinguOps`;

            return response;

        } catch (error) {
            console.error('[USSD] Error generating advisory:', error);
            return "END Unable to get weather advisory right now. Please try again later.\n\n- MawinguOps";
        }
    }

    /**
     * Session management
     */
    getSession(sessionId, phoneNumber) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                phoneNumber,
                startTime: Date.now(),
                data: {}
            });
        }
        return this.sessions.get(sessionId);
    }

    updateSession(sessionId, session) {
        session.lastActivity = Date.now();
        this.sessions.set(sessionId, session);
    }

    /**
     * Clean up expired sessions
     */
    cleanupSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastActivity > this.sessionTimeout) {
                this.sessions.delete(sessionId);
                console.log(`[USSD] Cleaned up expired session: ${sessionId}`);
            }
        }
    }

    /**
     * Test endpoint for development
     */
    async testUSSD(phoneNumber, input) {
        const sessionId = `test_${Date.now()}`;
        return await this.processUSSDRequest({
            sessionId,
            serviceCode: '*384*7460#',
            phoneNumber,
            text: input
        });
    }
}

// Clean up sessions every 5 minutes
const ussdService = new USSDService();
setInterval(() => {
    ussdService.cleanupSessions();
}, 5 * 60 * 1000);

module.exports = ussdService;