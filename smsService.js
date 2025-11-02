const axios = require('axios');

/**
 * SMS Service using HttpSMS.com
 * Simple and clean implementation for sending human-friendly advisory messages
 */
class HttpSMSService {
    constructor() {
        this.baseUrl = 'https://api.httpsms.com';
        this.apiKey = null;
        this.phoneNumber = null;
        this.isConfigured = false;
        
        // Auto-configure from environment variables
        this.autoConfigureFromEnv();
    }

    /**
     * Auto-configure from environment variables
     */
    autoConfigureFromEnv() {
        const apiKey = process.env.HTTPSMS_API_KEY || 
                      process.env.httpsmsapikey || 
                      process.env.HttpSmsApiKey ||
                      process.env.httpsms_api_key;
                      
        const phoneNumber = process.env.HTTPSMS_PHONE_NUMBER || 
                           process.env.httpsmsphonenumber || 
                           process.env.HttpSmsPhoneNumber ||
                           process.env.httpsms_phone_number;
        
        if (apiKey && phoneNumber) {
            this.configure(apiKey, phoneNumber);
            console.log('[SMS] HttpSMS configured from environment variables');
        } else {
            console.log('[SMS] HttpSMS not configured. Add httpsmsapikey and httpsmsphonenumber to .env file');
        }
    }

    /**
     * Configure the SMS gateway
     */
    configure(apiKey, phoneNumber) {
        this.apiKey = apiKey;
        this.phoneNumber = phoneNumber;
        this.isConfigured = true;
        console.log(`[SMS] HttpSMS configured for ${phoneNumber}`);
    }

    /**
     * Check if ready to send SMS
     */
    isReady() {
        return this.isConfigured && this.apiKey && this.phoneNumber;
    }

    /**
     * Send SMS to a phone number
     */
    async sendSMS(phoneNumber, message) {
        if (!this.isReady()) {
            throw new Error('SMS Gateway not configured');
        }

        try {
            console.log(`[SMS] Sending SMS to ${phoneNumber}`);
            
            const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
            
            const payload = {
                content: message,
                from: this.phoneNumber,
                to: formattedNumber,
                encrypted: false
            };

            const response = await axios.post(
                `${this.baseUrl}/v1/messages/send`,
                payload,
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            if (response.status === 200 && response.data?.status === 'success') {
                console.log(`[SMS] ✅ SMS sent successfully to ${phoneNumber}`);
                return {
                    success: true,
                    messageId: response.data.data?.id,
                    status: response.data.data?.status || 'pending',
                    phoneNumber: phoneNumber,
                    message: message,
                    timestamp: new Date().toISOString(),
                    httpSmsResponse: response.data
                };
            } else {
                console.error(`[SMS] ❌ Failed to send SMS:`, response.data);
                return {
                    success: false,
                    error: response.data?.message || 'Unknown error',
                    phoneNumber: phoneNumber,
                    timestamp: new Date().toISOString()
                };
            }

        } catch (error) {
            console.error(`[SMS] ❌ Error sending SMS:`, error.message);
            
            let errorMessage = error.message;
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            return {
                success: false,
                error: errorMessage,
                phoneNumber: phoneNumber,
                timestamp: new Date().toISOString(),
                statusCode: error.response?.status
            };
        }
    }

    /**
     * Send weather advisory SMS - uses human-friendly message directly
     */
    async sendWeatherAdvisory(phoneNumber, advisory) {
        console.log('[SMS] Creating human-friendly advisory message');
        const message = this.createSimpleAdvisoryMessage(advisory);
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Create simple advisory message (fallback)
     */
    createSimpleAdvisoryMessage(advisory) {
        const location = advisory.location || 'your area';
        const recommendation = advisory.recommendation || 'Check weather conditions';
        const crop = advisory.crop || 'maize';
        
        let message = `Jambo mkulima! �\n\n`;
        
        if (recommendation === 'PLANT NOW') {
            message += `GOOD TIME to plant ${crop} in ${location}!\n\n`;
            message += `WHY NOW IS GOOD:\n`;
            
            if (advisory.details) {
                if (advisory.details.totalRainfall) {
                    const rainfall = parseFloat(advisory.details.totalRainfall);
                    if (rainfall >= 30) {
                        message += `• Good rains expected (${advisory.details.totalRainfall})\n`;
                    } else {
                        message += `• Some rain expected (${advisory.details.totalRainfall})\n`;
                    }
                }
                if (advisory.details.avgTemperature) {
                    const temp = parseFloat(advisory.details.avgTemperature);
                    if (temp >= 20 && temp <= 30) {
                        message += `• Perfect temperature (${advisory.details.avgTemperature})\n`;
                    } else {
                        message += `• Temperature okay (${advisory.details.avgTemperature})\n`;
                    }
                }
            }
            
            message += `\nACTION: Plant your seeds within 2 days!`;
            
        } else if (recommendation === 'DO NOT PLANT YET') {
            message += `WAIT before planting ${crop} in ${location}.\n\n`;
            message += `WHY TO WAIT:\n`;
            
            if (advisory.details) {
                if (advisory.details.totalRainfall) {
                    const rainfall = parseFloat(advisory.details.totalRainfall);
                    if (rainfall < 25) {
                        message += `• Too little rain expected (${advisory.details.totalRainfall})\n`;
                    }
                }
                if (advisory.details.avgTemperature) {
                    const temp = parseFloat(advisory.details.avgTemperature);
                    if (temp < 18) {
                        message += `• Too cold for seeds (${advisory.details.avgTemperature})\n`;
                    } else if (temp > 32) {
                        message += `• Too hot for young plants (${advisory.details.avgTemperature})\n`;
                    }
                }
            }
            
            message += `\nACTION: Wait 3-4 days, then check again.`;
            
        } else {
            message += `Consider waiting 2-3 days before planting ${crop} in ${location}.\n\n`;
            message += `CONDITIONS:\n`;
            if (advisory.details) {
                if (advisory.details.totalRainfall) {
                    message += `• Rain: ${advisory.details.totalRainfall}\n`;
                }
                if (advisory.details.avgTemperature) {
                    message += `• Temperature: ${advisory.details.avgTemperature}\n`;
                }
            }
            message += `\nACTION: Prepare seeds, wait for better conditions.`;
        }
        
        if (advisory.mlPrediction && advisory.mlPrediction.confidence) {
            const confidence = (advisory.mlPrediction.confidence * 100).toFixed(0);
            if (confidence >= 80) {
                message += `\n\n🤖 AI says: ${confidence}% confident`;
            }
        }
        
        return message;
    }

    /**
     * Test connection
     */
    async testConnection() {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'SMS Gateway not configured'
            };
        }

        try {
            const testMessage = `🧪 HttpSMS Test - ${new Date().toLocaleTimeString()}`;
            const result = await this.sendSMS(this.phoneNumber, testMessage);
            
            if (result.success) {
                return {
                    success: true,
                    message: 'HttpSMS connection successful',
                    testSmsResult: result
                };
            } else {
                return {
                    success: false,
                    error: result.error,
                    message: 'Failed to send test SMS'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to connect to HttpSMS Gateway'
            };
        }
    }
}

// Create and export SMS service instance
const httpSmsService = new HttpSMSService();
module.exports = httpSmsService;