const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import our modules
const database = require('./database');
const weatherService = require('./weatherService');
const advisoryEngine = require('./advisoryEngine');
const MLPredictor = require('./mlPredictor');
const smsService = require('./smsService');
const ussdService = require('./ussdService');
const africasTalkingService = require('./africasTalkingService');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize ML Predictor
const mlPredictor = new MLPredictor();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

/**
 * API ENDPOINTS
 */

// Health check endpoint
app.get('/api/health', (req, res) => {
    const uptime = process.uptime();
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        service: 'MawinguOps Weather Advisory API',
        version: '1.0.0'
    });
});

// Get all available locations
app.get('/api/locations', (req, res) => {
    try {
        const locations = weatherService.getAvailableLocations();
        res.json({
            success: true,
            count: locations.length,
            locations: locations
        });
    } catch (error) {
        console.error('[API] Error getting locations:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get locations',
            details: error.message
        });
    }
});

// Get all available crops
app.get('/api/crops', (req, res) => {
    try {
        const crops = advisoryEngine.getAvailableCrops();
        res.json({
            success: true,
            count: crops.length,
            crops: crops
        });
    } catch (error) {
        console.error('[API] Error getting crops:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get crops',
            details: error.message
        });
    }
});

// Get weather data for a location
app.get('/api/weather', async (req, res) => {
    try {
        const { location } = req.query;
        
        // Validate location parameter
        if (!location) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Location parameter is required',
                details: 'Provide location as query parameter: ?location=Vota'
            });
        }
        
        if (!weatherService.isValidLocation(location)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid location',
                details: `Location must be one of: ${Object.keys(weatherService.LOCATIONS).join(', ')}`
            });
        }
        
        // Fetch weather data
        const weatherData = await weatherService.getWeather(location);
        
        res.json({
            success: true,
            data: weatherData
        });
        
    } catch (error) {
        console.error('[API] Error getting weather:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch weather data',
            details: error.message
        });
    }
});

// Get farming advisory (GET and POST supported)
// POST is supported to accommodate the new frontend which sends JSON bodies.
app.post('/api/advisory', async (req, res) => {
    try {
        const { location, crop } = req.body || {};

        // Validate parameters
        if (!location || !crop) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Both location and crop are required in POST body',
                details: 'Send JSON: { "location": "Vota", "crop": "Maize" }'
            });
        }

        if (!weatherService.isValidLocation(location)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid location',
                details: `Location must be one of: ${Object.keys(weatherService.LOCATIONS).join(', ')}`
            });
        }

        if (!advisoryEngine.isValidCrop(crop)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid crop',
                details: `Crop must be one of: ${Object.keys(advisoryEngine.CROP_REQUIREMENTS).join(', ')}`
            });
        }

        // Get weather data
        const weatherData = await weatherService.getWeather(location);

        // Try to get ML-enhanced advisory if model is available
        let advisory;
        let mlEnabled = false;

        if (mlPredictor.isModelTrained()) {
            try {
                console.log('[ML] Using ML-enhanced advisory for', location, crop);
                advisory = await mlPredictor.getEnhancedAdvisory(location, crop, weatherData);
                mlEnabled = true;
            } catch (error) {
                console.warn('[ML] ML prediction failed, falling back to basic advisory:', error.message);
                advisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
            }
        } else {
            console.log('[ML] Model not available, using basic advisory');
            advisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
        }

        // Save advisory to database
        const saveResult = await database.saveAdvisory(
            'SYSTEM_GENERATED',
            location,
            crop,
            advisory.recommendation || advisory.advisory,
            advisory.recommendation || advisory.advisory,
            {
                weatherSummary: advisory.details || advisory.weather,
                forecast: advisory.forecast,
                mlPrediction: advisory.mlPrediction,
                generatedAt: advisory.timestamp || advisory.generatedAt,
                mlEnabled: mlEnabled
            }
        );

        if (!saveResult.success) {
            console.warn('[API] Failed to save advisory to history:', saveResult.error);
        }

        return res.json({
            success: true,
            advisory: advisory,
            mlEnabled: mlEnabled,
            modelStatus: mlPredictor.isModelTrained() ? 'available' : 'not_trained'
        });

    } catch (error) {
        console.error('[API] Error generating advisory (POST):', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate advisory',
            details: error.message
        });
    }
});

// Note: the GET handler below contains the full advisory generation logic. We keep both handlers to maintain backward compatibility.
app.get('/api/advisory', async (req, res) => {
    try {
        const { location, crop } = req.query;
        
        // Validate parameters
        if (!location || !crop) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Both location and crop parameters are required',
                details: 'Provide parameters: ?location=Vota&crop=Maize'
            });
        }
        
        if (!weatherService.isValidLocation(location)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid location',
                details: `Location must be one of: ${Object.keys(weatherService.LOCATIONS).join(', ')}`
            });
        }
        
        if (!advisoryEngine.isValidCrop(crop)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid crop',
                details: `Crop must be one of: ${Object.keys(advisoryEngine.CROP_REQUIREMENTS).join(', ')}`
            });
        }
        
        // Get weather data
        const weatherData = await weatherService.getWeather(location);
        
        // Try to get ML-enhanced advisory if model is available
        let advisory;
        let mlEnabled = false;
        
        if (mlPredictor.isModelTrained()) {
            try {
                console.log('[ML] Using ML-enhanced advisory for', location, crop);
                advisory = await mlPredictor.getEnhancedAdvisory(location, crop, weatherData);
                mlEnabled = true;
            } catch (error) {
                console.warn('[ML] ML prediction failed, falling back to basic advisory:', error.message);
                advisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
            }
        } else {
            console.log('[ML] Model not available, using basic advisory');
            advisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
        }
        
        // Save advisory to database (for any registered farmer or general tracking)
        const saveResult = await database.saveAdvisory(
            'SYSTEM_GENERATED', // placeholder phone number for web requests
            location,
            crop,
            advisory.recommendation || advisory.advisory,
            advisory.recommendation || advisory.advisory,
            {
                weatherSummary: advisory.details || advisory.weather,
                forecast: advisory.forecast,
                mlPrediction: advisory.mlPrediction,
                generatedAt: advisory.timestamp || advisory.generatedAt,
                mlEnabled: mlEnabled
            }
        );
        
        if (!saveResult.success) {
            console.warn('[API] Failed to save advisory to history:', saveResult.error);
        }
        
        res.json({
            success: true,
            advisory: advisory,
            mlEnabled: mlEnabled,
            modelStatus: mlPredictor.isModelTrained() ? 'available' : 'not_trained'
        });
        
    } catch (error) {
        console.error('[API] Error generating advisory:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate advisory',
            details: error.message
        });
    }
});

// Get ML model status
app.get('/api/ml-status', (req, res) => {
    try {
        const isModelTrained = mlPredictor.isModelTrained();
        res.json({
            success: true,
            modelStatus: {
                trained: isModelTrained,
                modelFile: 'maize_planting_model.pkl',
                available: isModelTrained,
                message: isModelTrained 
                    ? 'ML model is available and ready for predictions'
                    : 'ML model not found. Please train the model using the Jupyter notebook first.'
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check ML model status',
            details: error.message
        });
    }
});

// Configure SMS Gateway (HttpSMS)
app.post('/api/sms/configure', (req, res) => {
    try {
        const { apiKey, phoneNumber } = req.body;
        
        if (!apiKey || !phoneNumber) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Both apiKey and phoneNumber are required',
                details: 'Provide your HttpSMS API key and phone number'
            });
        }
        
        smsService.configure(apiKey, phoneNumber);
        
        res.json({
            success: true,
            message: 'HttpSMS Gateway configured successfully',
            configured: true,
            phoneNumber: phoneNumber
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to configure SMS gateway',
            details: error.message
        });
    }
});

// Test SMS Gateway connection
app.get('/api/sms/test', async (req, res) => {
    try {
        console.log('[API] Testing SMS Gateway connection...');
        const result = await smsService.testConnection();
        
        console.log('[API] SMS test result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                result: result
            });
        } else {
            console.error('[API] SMS test failed:', result.error);
            res.status(503).json({
                error: 'Service Unavailable',
                message: 'SMS Gateway connection failed',
                details: result.error,
                fullResult: result
            });
        }
        
    } catch (error) {
        console.error('[API] SMS test exception:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to test SMS gateway',
            details: error.message,
            stack: error.stack
        });
    }
});

// Send SMS to specific farmer
app.post('/api/sms/send', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'phoneNumber and message are required'
            });
        }
        
        const result = await smsService.sendSMS(phoneNumber, message);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'SMS sent successfully',
                result: result
            });
        } else {
            res.status(500).json({
                error: 'SMS Failed',
                message: 'Failed to send SMS',
                details: result.error
            });
        }
        
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to send SMS',
            details: error.message
        });
    }
});

// Send weather advisory via SMS
app.post('/api/sms/advisory', async (req, res) => {
    try {
        const { phoneNumber, location, crop } = req.body;
        
        if (!phoneNumber || !location || !crop) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'phoneNumber, location, and crop are required'
            });
        }
        
        // Get weather advisory
        const weatherData = await weatherService.getWeather(location);
        let advisory;
        
        if (mlPredictor.isModelTrained()) {
            advisory = await mlPredictor.getEnhancedAdvisory(location, crop, weatherData);
        } else {
            advisory = advisoryEngine.generateAdvisory(weatherData, crop, location);
        }
        
        // Send SMS
        const result = await smsService.sendWeatherAdvisory(phoneNumber, advisory);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Weather advisory sent via SMS',
                advisory: advisory,
                smsResult: result
            });
        } else {
            res.status(500).json({
                error: 'SMS Failed',
                message: 'Failed to send weather advisory',
                details: result.error
            });
        }
        
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to send weather advisory',
            details: error.message
        });
    }
});

// Broadcast message to all farmers
app.post('/api/sms/broadcast', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'message is required'
            });
        }
        
        const result = await smsService.broadcastToAllFarmers(message);
        
        res.json({
            success: result.successful > 0,
            message: `Broadcast completed: ${result.successful} sent, ${result.failed} failed`,
            result: result
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to broadcast message',
            details: error.message
        });
    }
});

// SMS Webhook - Receive incoming SMS messages
app.post('/api/sms/webhook', async (req, res) => {
    try {
        const { from, content, timestamp } = req.body;
        
        console.log(`[SMS Webhook] Received message from ${from}: "${content}"`);
        console.log(`[SMS Webhook] Full webhook data:`, req.body);
        
        // Parse the message for MawinguOps commands
        const command = parseMawinguCommand(content);
        
        if (command) {
            console.log(`[SMS Webhook] Valid MawinguOps command detected:`, command);
            console.log(`[SMS Webhook] Will send response to: ${from}`);
            
            // Process the command and send advisory
            await processMawinguCommand(from, command);
            
        } else {
            console.log(`[SMS Webhook] Not a MawinguOps command, ignoring message`);
        }
        
        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ 
            success: true, 
            message: 'Message processed'
        });
        
    } catch (error) {
        console.error('[SMS Webhook] Error processing incoming message:', error.message);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message 
        });
    }
});

// Test SMS command parsing (for development)
app.post('/api/sms/test-command', async (req, res) => {
    try {
        const { message, phoneNumber } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Message is required'
            });
        }
        
        // Parse the command
        const command = parseMawinguCommand(message);
        
        if (command) {
            // If phoneNumber provided, process the command
            if (phoneNumber) {
                const result = await processMawinguCommand(phoneNumber, command);
                res.json({
                    success: true,
                    message: 'Valid MawinguOps command',
                    command: command,
                    processed: true,
                    result: result
                });
            } else {
                res.json({
                    success: true,
                    message: 'Valid MawinguOps command',
                    command: command,
                    processed: false
                });
            }
        } else {
            res.json({
                success: false,
                message: 'Not a valid MawinguOps command',
                command: null,
                suggestion: 'Try: MAWINGU MAIZE VOTA or send HELP for instructions'
            });
        }
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to test command',
            details: error.message
        });
    }
});

// Get SMS service status
app.get('/api/sms/status', (req, res) => {
    try {
        const status = smsService.getStatus();
        res.json({
            success: true,
            smsService: {
                ...status,
                message: status.ready 
                    ? 'SMS service is configured and ready'
                    : 'SMS service not configured. Please configure gateway first.'
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get SMS status',
            details: error.message
        });
    }
});

// Register a new farmer
app.post('/api/register', async (req, res) => {
    try {
        const { phoneNumber, location, crop } = req.body;
        
        // Validate required fields
        if (!phoneNumber || !location || !crop) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'All fields are required',
                details: 'Provide phoneNumber, location, and crop in request body'
            });
        }
        
        // Validate phone number format
        if (!phoneNumber.match(/^\+254[0-9]{9}$/)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid phone number format',
                details: 'Phone number must be in format +254XXXXXXXXX'
            });
        }
        
        // Validate location
        if (!weatherService.isValidLocation(location)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid location',
                details: `Location must be one of: ${Object.keys(weatherService.LOCATIONS).join(', ')}`
            });
        }
        
        // Validate crop
        if (!advisoryEngine.isValidCrop(crop)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid crop',
                details: `Crop must be one of: ${Object.keys(advisoryEngine.CROP_REQUIREMENTS).join(', ')}`
            });
        }
        
        // Register farmer
        const result = await database.registerFarmer(phoneNumber, location, crop);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Farmer registered successfully',
                farmer: result.farmer
            });
        } else {
            if (result.error.includes('already registered')) {
                res.status(409).json({
                    error: 'Conflict',
                    message: result.error
                });
            } else {
                res.status(400).json({
                    error: 'Bad Request',
                    message: result.error
                });
            }
        }
        
    } catch (error) {
        console.error('[API] Error registering farmer:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to register farmer',
            details: error.message
        });
    }
});

// Get farmer details and advisory history
app.get('/api/farmers/:phoneNumber', async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        
        // Get farmer details
        const farmerResult = await database.getFarmer(phoneNumber);
        
        if (!farmerResult.success) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Farmer not found'
            });
        }
        
        // Get recent advisories
        const advisoryResult = await database.getAdvisoryHistory(phoneNumber, 10);
        
        res.json({
            success: true,
            farmer: farmerResult.farmer,
            recentAdvisories: advisoryResult.success ? advisoryResult.advisories : []
        });
        
    } catch (error) {
        console.error('[API] Error getting farmer:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get farmer details',
            details: error.message
        });
    }
});

// Get all farmers (admin/testing endpoint)
app.get('/api/farmers', async (req, res) => {
    try {
        const result = await database.getAllFarmers();
        
        if (result.success) {
            res.json({
                success: true,
                count: result.count,
                farmers: result.farmers
            });
        } else {
            res.status(500).json({
                error: 'Internal Server Error',
                message: result.error
            });
        }
        
    } catch (error) {
        console.error('[API] Error getting all farmers:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get farmers',
            details: error.message
        });
    }
});

// Delete farmer
app.delete('/api/farmers/:phoneNumber', async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        
        const result = await database.deleteFarmer(phoneNumber);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            if (result.error === 'Farmer not found') {
                res.status(404).json({
                    error: 'Not Found',
                    message: result.error
                });
            } else {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: result.error
                });
            }
        }
        
    } catch (error) {
        console.error('[API] Error deleting farmer:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete farmer',
            details: error.message
        });
    }
});

// Get recent advisory history
app.get('/api/advisories', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const result = await database.getAllAdvisories(limit);
        
        if (result.success) {
            res.json({
                success: true,
                count: result.count,
                advisories: result.advisories
            });
        } else {
            res.status(500).json({
                error: 'Internal Server Error',
                message: result.error
            });
        }
        
    } catch (error) {
        console.error('[API] Error getting advisories:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get advisories',
            details: error.message
        });
    }
});

/**
 * AFRICA'S TALKING USSD ENDPOINTS
 */

// Main USSD webhook endpoint for Africa's Talking
app.post('/api/ussd/webhook', async (req, res) => {
    try {
        const { sessionId, serviceCode, phoneNumber, text } = req.body;
        
        console.log(`[USSD Webhook] Received request:`, {
            sessionId,
            serviceCode, 
            phoneNumber,
            text: text || '(empty)'
        });

        // Validate required parameters from Africa's Talking
        if (!sessionId || !phoneNumber) {
            console.error('[USSD Webhook] Missing required parameters:', req.body);
            return res.status(400).send("END Invalid request parameters.\n\n- MawinguOps");
        }

        // Process the USSD request through our service
        const response = await ussdService.processUSSDRequest({
            sessionId,
            serviceCode: serviceCode || '*384*7460#',
            phoneNumber,
            text: text || ''
        });

        console.log(`[USSD Webhook] Sending response to ${phoneNumber}:`, response.substring(0, 100) + '...');
        
        // Send response back to Africa's Talking
        res.set('Content-Type', 'text/plain');
        res.send(response);

    } catch (error) {
        console.error('[USSD Webhook] Error processing request:', error);
        res.set('Content-Type', 'text/plain');
        res.send("END Service temporarily unavailable. Please try again later.\n\n- MawinguOps");
    }
});

// USSD test endpoint for development/testing
app.post('/api/ussd/test', async (req, res) => {
    try {
        const { phoneNumber, input } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                error: 'phoneNumber is required'
            });
        }

        console.log(`[USSD Test] Testing with phone: ${phoneNumber}, input: "${input || ''}"`);
        
        const response = await ussdService.testUSSD(phoneNumber, input || '');
        
        res.json({
            success: true,
            phoneNumber,
            input: input || '',
            response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[USSD Test] Error:', error);
        res.status(500).json({
            error: 'Test failed',
            details: error.message
        });
    }
});

// Get USSD service status
app.get('/api/ussd/status', (req, res) => {
    try {
        res.json({
            success: true,
            service: 'Africa\'s Talking USSD',
            shortcode: process.env.AT_SHORTCODE || 'Not configured',
            webhook_url: '/api/ussd/webhook',
            test_url: '/api/ussd/test',
            status: 'Ready',
            sessions: ussdService.sessions ? ussdService.sessions.size : 0,
            message: 'USSD service is ready to receive webhook calls from Africa\'s Talking'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get USSD status',
            details: error.message
        });
    }
});

/**
 * AFRICA'S TALKING SERVICE ENDPOINTS
 */

// Get Africa's Talking service status
app.get('/api/africastalking/status', (req, res) => {
    try {
        const status = africasTalkingService.getStatus();
        res.json({
            success: true,
            africasTalking: status,
            message: status.initialized 
                ? 'Africa\'s Talking service is configured and ready'
                : 'Africa\'s Talking service not properly configured'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get Africa\'s Talking status',
            details: error.message
        });
    }
});

// Test Africa's Talking connection
app.get('/api/africastalking/test', async (req, res) => {
    try {
        const result = await africasTalkingService.testConnection();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Africa\'s Talking connection successful',
                result: result
            });
        } else {
            res.status(503).json({
                success: false,
                message: 'Africa\'s Talking connection failed',
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Test failed',
            details: error.message
        });
    }
});

// Send SMS via Africa's Talking (alternative to HttpSMS)
app.post('/api/africastalking/sms', async (req, res) => {
    try {
        const { to, message, from } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({
                error: 'Both "to" and "message" are required'
            });
        }
        
        const result = await africasTalkingService.sendSMS(to, message, from);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'SMS sent via Africa\'s Talking',
                result: result.result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to send SMS',
            details: error.message
        });
    }
});

// USSD simulation endpoint (for development/testing)
app.post('/api/ussd/simulate', async (req, res) => {
    try {
        const { phoneNumber, sessionId, text } = req.body;
        
        // Validate required fields
        if (!phoneNumber || !sessionId) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'phoneNumber and sessionId are required'
            });
        }
        
        // Process USSD session
        const ussdResponse = await processUSSDSession(phoneNumber, sessionId, text || '');
        
        res.json(ussdResponse);
        
    } catch (error) {
        console.error('[API] Error processing USSD:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process USSD request',
            details: error.message
        });
    }
});

/**
 * USSD SIMULATION LOGIC
 */
async function processUSSDSession(phoneNumber, sessionId, text) {
    console.log(`[USSD] Processing session ${sessionId} for ${phoneNumber}: "${text}"`);
    
    try {
        // Parse input levels (e.g., "1*2*1" -> ["1", "2", "1"])
        const levels = text ? text.split('*').filter(level => level.length > 0) : [];
        
        // Main menu (initial screen)
        if (levels.length === 0) {
            return {
                response: "CON Welcome to MawinguOps 🌾\n" +
                         "Weather Advisory for Farmers\n\n" +
                         "1. Register\n" +
                         "2. Get Advice\n" +
                         "3. My Info",
                continueSession: true
            };
        }
        
        const mainChoice = levels[0];
        
        // Handle Registration flow
        if (mainChoice === '1') {
            return await handleRegistrationFlow(phoneNumber, levels);
        }
        
        // Handle Get Advice flow
        if (mainChoice === '2') {
            return await handleGetAdviceFlow(phoneNumber, levels);
        }
        
        // Handle My Info flow
        if (mainChoice === '3') {
            return await handleMyInfoFlow(phoneNumber, levels);
        }
        
        // Invalid main choice
        return {
            response: "END Invalid selection. Please dial again and choose a valid option.",
            continueSession: false
        };
        
    } catch (error) {
        console.error('[USSD] Error processing session:', error);
        return {
            response: "END Service temporarily unavailable. Please try again later.",
            continueSession: false
        };
    }
}

async function handleRegistrationFlow(phoneNumber, levels) {
    // Level 1: Location selection
    if (levels.length === 1) {
        return {
            response: "CON Select your location:\n\n" +
                     "1. Vota Sub-County\n" +
                     "2. Kathiani Sub-County\n" +
                     "3. Mwala Sub-County",
            continueSession: true
        };
    }
    
    // Level 2: Crop selection
    if (levels.length === 2) {
        const locationChoice = levels[1];
        if (!['1', '2', '3'].includes(locationChoice)) {
            return {
                response: "END Invalid location selection. Please dial again.",
                continueSession: false
            };
        }
        
        return {
            response: "CON Select your crop:\n\n" +
                     "1. Maize\n" +
                     "2. Beans\n" +
                     "3. Sorghum",
            continueSession: true
        };
    }
    
    // Level 3: Confirmation and registration
    if (levels.length === 3) {
        const locationChoice = levels[1];
        const cropChoice = levels[2];
        
        // Validate choices
        if (!['1', '2', '3'].includes(locationChoice) || !['1', '2', '3'].includes(cropChoice)) {
            return {
                response: "END Invalid selection. Please dial again.",
                continueSession: false
            };
        }
        
        // Map choices to values
        const locations = ['Vota', 'Kathiani', 'Mwala'];
        const crops = ['Maize', 'Beans', 'Sorghum'];
        
        const location = locations[parseInt(locationChoice) - 1];
        const crop = crops[parseInt(cropChoice) - 1];
        
        // Register farmer
        const result = await database.registerFarmer(phoneNumber, location, crop);
        
        if (result.success) {
            return {
                response: `END Registration successful! ✅\n\n` +
                         `Location: ${location} Sub-County\n` +
                         `Crop: ${crop}\n` +
                         `Phone: ${phoneNumber}\n\n` +
                         `You can now dial again and select "Get Advice" to receive your planting advisory.\n\n` +
                         `- MawinguOps`,
                continueSession: false
            };
        } else {
            if (result.error.includes('already registered')) {
                return {
                    response: "END You are already registered with MawinguOps. Dial again and select 'Get Advice' or 'My Info'.",
                    continueSession: false
                };
            } else {
                return {
                    response: "END Registration failed. Please try again later.",
                    continueSession: false
                };
            }
        }
    }
    
    return {
        response: "END Invalid request. Please dial again.",
        continueSession: false
    };
}

async function handleGetAdviceFlow(phoneNumber, levels) {
    // Check if farmer is registered
    const farmerResult = await database.getFarmer(phoneNumber);
    
    if (!farmerResult.success) {
        return {
            response: "END You are not registered yet. Please dial again and select 'Register' first.",
            continueSession: false
        };
    }
    
    const farmer = farmerResult.farmer;
    
    try {
        // Get weather data and generate advisory
        const weatherData = await weatherService.getWeather(farmer.location);
        const advisory = advisoryEngine.generateAdvisory(weatherData, farmer.crop, farmer.location);
        
        // Save advisory to history
        await database.saveAdvisory(
            phoneNumber,
            farmer.location,
            farmer.crop,
            advisory.advisory,
            advisory.recommendation,
            {
                weatherSummary: advisory.details,
                forecast: advisory.forecast,
                generatedAt: advisory.generatedAt
            }
        );
        
        // Format response
        const response = `END Your Planting Advisory 🌾\n\n` +
                        `${advisory.recommendation}\n\n` +
                        `${advisory.advisory}\n\n` +
                        `Expected Rainfall: ${advisory.details.totalRainfall}\n` +
                        `Temperature: ${advisory.details.avgTemperature}\n` +
                        `Rain Probability: ${advisory.details.rainProbability}\n\n` +
                        `- MawinguOps`;
        
        return {
            response: response,
            continueSession: false
        };
        
    } catch (error) {
        console.error('[USSD] Error getting advisory:', error);
        return {
            response: "END Unable to get weather advisory right now. Please try again later.",
            continueSession: false
        };
    }
}

async function handleMyInfoFlow(phoneNumber, levels) {
    // Get farmer information
    const farmerResult = await database.getFarmer(phoneNumber);
    
    if (!farmerResult.success) {
        return {
            response: "END You are not registered yet. Please dial again and select 'Register' first.",
            continueSession: false
        };
    }
    
    const farmer = farmerResult.farmer;
    const registeredDate = new Date(farmer.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    let lastAdvisory = '';
    if (farmer.last_advisory_at) {
        const lastDate = new Date(farmer.last_advisory_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        lastAdvisory = `\n\nLast advisory received:\n${lastDate}`;
    } else {
        lastAdvisory = '\n\nNo advisory received yet.\nDial again and select "Get Advice".';
    }
    
    const response = `END Your Information 👤\n\n` +
                    `Phone: ${farmer.phone_number}\n` +
                    `Location: ${farmer.location} Sub-County\n` +
                    `Crop: ${farmer.crop}\n` +
                    `Registered: ${registeredDate}` +
                    lastAdvisory +
                    `\n\n- MawinguOps`;
    
    return {
        response: response,
        continueSession: false
    };
}

/**
 * UTILITY FUNCTIONS
 */
function formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * MAWINGUOPS SMS COMMAND PROCESSING FUNCTIONS
 */
function parseMawinguCommand(message) {
    if (!message || typeof message !== 'string') return null;
    
    // Clean up the message - remove extra spaces, convert to uppercase
    const cleanMsg = message.trim().replace(/\s+/g, ' ').toUpperCase();
    
    // Check for help commands first (very flexible)
    const helpPatterns = [
        /^HELP$/i,
        /^MAWINGU\s*HELP$/i,
        /^MAWINGU$/i,
        /^WEATHER\s*HELP$/i,
        /^ADVISORY\s*HELP$/i,
        /^HOW$/i,
        /^GUIDE$/i
    ];
    
    for (const pattern of helpPatterns) {
        if (pattern.test(cleanMsg)) {
            return {
                command: 'HELP',
                crop: null,
                location: null,
                originalMessage: message
            };
        }
    }
    
    // Define flexible command patterns (case insensitive, flexible spacing)
    const commandPatterns = [
        // Standard format: COMMAND CROP LOCATION
        /^(MAWINGU|WEATHER|ADVISORY|FARMING|PLANT)\s+(\w+)\s+(\w+)$/i,
        
        // With punctuation: MAWINGU, MAIZE, VOTA
        /^(MAWINGU|WEATHER|ADVISORY|FARMING|PLANT)[,\s]+(\w+)[,\s]+(\w+)$/i,
        
        // Natural language: "mawingu for maize in vota"
        /^(MAWINGU|WEATHER|ADVISORY|FARMING|PLANT)\s+(?:FOR\s+)?(\w+)\s+(?:IN\s+)?(\w+)$/i,
        
        // Short format: "maize vota" (assumes mawingu)
        /^(\w+)\s+(\w+)$/i,
        
        // With "at" or "@": "maize at vota"
        /^(\w+)\s+(?:AT|@)\s+(\w+)$/i,
        
        // Reverse order: "vota maize"
        /^(\w+)\s+(\w+)$/i
    ];
    
    // Check each pattern
    for (let i = 0; i < commandPatterns.length; i++) {
        const pattern = commandPatterns[i];
        const match = cleanMsg.match(pattern);
        
        if (match) {
            let command, crop, location;
            
            if (i === 3 || i === 4) {
                // Short format patterns - no explicit command
                command = 'MAWINGU';
                crop = match[1];
                location = match[2];
            } else if (i === 5) {
                // Reverse order - try both ways
                const option1 = { crop: match[1], location: match[2] };
                const option2 = { crop: match[2], location: match[1] };
                
                // Check which combination is valid
                if (isValidCrop(option1.crop) && isValidLocation(option1.location)) {
                    command = 'MAWINGU';
                    crop = option1.crop;
                    location = option1.location;
                } else if (isValidCrop(option2.crop) && isValidLocation(option2.location)) {
                    command = 'MAWINGU';
                    crop = option2.crop;
                    location = option2.location;
                } else {
                    continue; // Neither combination valid, try next pattern
                }
            } else {
                // Standard patterns with explicit command
                command = match[1];
                crop = match[2];
                location = match[3];
            }
            
            // Validate crop and location
            if (isValidCrop(crop) && isValidLocation(location)) {
                return {
                    command: command,
                    crop: crop.toUpperCase(),
                    location: location.toUpperCase(),
                    originalMessage: message
                };
            }
        }
    }
    
    return null; // Not a valid MawinguOps command
}

function isValidCrop(crop) {
    const cropAliases = {
        // Maize variations
        'MAIZE': 'MAIZE',
        'MAZE': 'MAIZE',
        'CORN': 'MAIZE',
        'MAHINDI': 'MAIZE',
        
        // Beans variations  
        'BEANS': 'BEANS',
        'BEAN': 'BEANS',
        'MAHARAGE': 'BEANS',
        'NJUGU': 'BEANS',
        
        // Sorghum variations
        'SORGHUM': 'SORGHUM',
        'MTAMA': 'SORGHUM',
        'MILLET': 'SORGHUM'
    };
    
    return cropAliases.hasOwnProperty(crop.toUpperCase());
}

function isValidLocation(location) {
    const locationAliases = {
        // Vota variations
        'VOTA': 'VOTA',
        'VOTTA': 'VOTA',
        
        // Masii variations
        'MASII': 'MASII',
        'MASI': 'MASII',
        'MASIII': 'MASII',
        
        // Kangundo variations
        'KANGUNDO': 'KANGUNDO',
        'KANGUNDO': 'KANGUNDO',
        'KANGUNDO': 'KANGUNDO',
        
        // Tala variations
        'TALA': 'TALA',
        'TALLA': 'TALA'
    };
    
    return locationAliases.hasOwnProperty(location.toUpperCase());
}

function normalizeLocation(location) {
    const locationMap = {
        // Vota variations
        'VOTA': 'Vota', 'VOTTA': 'Vota',
        
        // Masii variations  
        'MASII': 'Masii', 'MASI': 'Masii', 'MASIII': 'Masii',
        
        // Kangundo variations
        'KANGUNDO': 'Kangundo',
        
        // Tala variations
        'TALA': 'Tala', 'TALLA': 'Tala'
    };
    return locationMap[location.toUpperCase()] || location;
}

function normalizeCrop(crop) {
    const cropMap = {
        // Maize variations
        'MAIZE': 'Maize', 'MAZE': 'Maize', 'CORN': 'Maize', 'MAHINDI': 'Maize',
        
        // Beans variations
        'BEANS': 'Beans', 'BEAN': 'Beans', 'MAHARAGE': 'Beans', 'NJUGU': 'Beans',
        
        // Sorghum variations
        'SORGHUM': 'Sorghum', 'MTAMA': 'Sorghum', 'MILLET': 'Sorghum'
    };
    return cropMap[crop.toUpperCase()] || crop;
}

async function processMawinguCommand(phoneNumber, command) {
    try {
        console.log(`[MawinguOps] Processing command for ${phoneNumber}:`, command);
        
        // Handle help command
        if (command.command === 'HELP') {
            const helpMessage = `🌾 MawinguOps - Farming Advisory Service

COMMANDS:
• MAWINGU [CROP] [LOCATION]
• WEATHER [CROP] [LOCATION]
• ADVISORY [CROP] [LOCATION]

CROPS: Maize, Beans, Sorghum
LOCATIONS: Vota, Masii, Kangundo, Tala

EXAMPLES:
• MAWINGU MAIZE VOTA
• WEATHER BEANS MASII
• ADVISORY SORGHUM KANGUNDO

Get instant AI-powered farming advice based on current weather conditions!`;
            
            const result = await smsService.sendSMS(phoneNumber, helpMessage);
            console.log(`[MawinguOps] Help message sent to ${phoneNumber}`);
            return result;
        }
        
        // Get weather advisory (normalize location and crop for API)
        const normalizedLocation = normalizeLocation(command.location);
        const normalizedCrop = normalizeCrop(command.crop);
        const weatherData = await weatherService.getWeather(normalizedLocation);
        let advisory;
        
        if (mlPredictor.isModelTrained()) {
            advisory = await mlPredictor.getEnhancedAdvisory(normalizedLocation, normalizedCrop, weatherData);
        } else {
            advisory = advisoryEngine.generateAdvisory(weatherData, normalizedCrop, normalizedLocation);
        }
        
        // Send SMS response
        const result = await smsService.sendWeatherAdvisory(phoneNumber, advisory);
        
        if (result.success) {
            console.log(`[MawinguOps] ✅ Advisory sent to ${phoneNumber}`);
            
            // Save to database for tracking
            try {
                await database.saveAdvisoryHistory({
                    phoneNumber: phoneNumber,
                    location: command.location,
                    crop: command.crop,
                    recommendation: advisory.recommendation,
                    advisory: advisory.advisory,
                    timestamp: new Date().toISOString(),
                    source: 'SMS_COMMAND'
                });
            } catch (dbError) {
                console.warn('[MawinguOps] Warning: Could not save to database:', dbError.message);
            }
            
        } else {
            console.error(`[MawinguOps] ❌ Failed to send advisory to ${phoneNumber}:`, result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error(`[MawinguOps] Error processing command:`, error.message);
        
        // Send error message to user
        try {
            await smsService.sendSMS(phoneNumber, 
                `🌾 MawinguOps Error\n\nSorry, we couldn't process your request right now. Please try again later.\n\nFor help, send: MAWINGU [CROP] [LOCATION]\nExample: MAWINGU MAIZE VOTA`
            );
        } catch (smsError) {
            console.error('[MawinguOps] Could not send error SMS:', smsError.message);
        }
        
        return { success: false, error: error.message };
    }
}

/**
 * ERROR HANDLING MIDDLEWARE
 */
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 404 for API routes
app.all('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'API endpoint not found',
        details: `${req.method} ${req.path} is not a valid endpoint`
    });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * START SERVER
 */
async function startServer() {
    try {
        // Initialize database
        console.log('[Server] Initializing MawinguOps system...');
        
        // Start HTTP server
        const HOST = process.env.HOST || '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log('='.repeat(60));
            console.log('🌾 MawinguOps Weather Advisory System');
            console.log('='.repeat(60));
            console.log(`[Server] Started on ${HOST}:${PORT}`);
            console.log(`[Server] Web interface: http://localhost:${PORT}`);
            console.log(`[Server] USSD simulator: http://localhost:${PORT}/ussd-simulator.html`);
            console.log('');
            console.log('Available API Endpoints:');
            console.log('- GET  /api/health              - Health check');
            console.log('- GET  /api/locations           - Available locations');
            console.log('- GET  /api/crops               - Available crops');
            console.log('- GET  /api/weather             - Weather data');
            console.log('- GET  /api/advisory            - Farming advisory');
            console.log('- POST /api/register            - Register farmer');
            console.log('- GET  /api/farmers             - Get all farmers');
            console.log('- GET  /api/farmers/:phone      - Get specific farmer');
            console.log('- DEL  /api/farmers/:phone      - Delete farmer');
            console.log('- GET  /api/advisories          - Advisory history');
            console.log('');
            console.log('USSD Endpoints (Africa\'s Talking):');
            console.log('- POST /api/ussd/webhook        - USSD webhook (production)');
            console.log('- POST /api/ussd/test           - USSD testing endpoint');
            console.log('- GET  /api/ussd/status         - USSD service status');
            console.log('- POST /api/ussd/simulate       - USSD simulation (dev)');
            console.log('');
            console.log('Africa\'s Talking Integration:');
            console.log('- GET  /api/africastalking/status - AT service status');
            console.log('- GET  /api/africastalking/test   - Test AT connection');
            console.log('- POST /api/africastalking/sms    - Send SMS via AT');
            console.log('');
            console.log('SMS Endpoints (HttpSMS):');
            console.log('- POST /api/sms/webhook         - SMS webhook (incoming)');
            console.log('- POST /api/sms/test-command    - Test SMS command parsing');
            console.log('');
            console.log('[Server] System ready for testing! 🚀');
            console.log('='.repeat(60));
        });
        
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down gracefully...');
    database.closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Shutting down gracefully...');
    database.closeDatabase();
    process.exit(0);
});

// Start the server
startServer();