/**
 * Africa's Talking Service Configuration
 * Helper for USSD and SMS integration
 */

const AfricasTalking = require('africastalking');

class AfricasTalkingService {
    constructor() {
        this.initialized = false;
        this.client = null;
        this.init();
    }

    init() {
        try {
            const apiKey = process.env.AT_API_KEY;
            const username = process.env.AT_USERNAME;

            if (!apiKey || !username) {
                console.warn('[Africa\'s Talking] API credentials not configured');
                return;
            }

            // Initialize Africa's Talking client
            this.client = AfricasTalking({
                apiKey: apiKey,
                username: username
            });

            this.initialized = true;
            console.log(`[Africa's Talking] Initialized for username: ${username}`);
            
        } catch (error) {
            console.error('[Africa\'s Talking] Initialization failed:', error.message);
        }
    }

    /**
     * Send SMS via Africa's Talking
     */
    async sendSMS(to, message, from = null) {
        if (!this.initialized) {
            throw new Error('Africa\'s Talking service not initialized');
        }

        try {
            const sms = this.client.SMS;
            
            const options = {
                to: Array.isArray(to) ? to : [to],
                message: message
            };

            if (from) {
                options.from = from;
            }

            const result = await sms.send(options);
            
            console.log('[Africa\'s Talking SMS] Result:', result);
            
            return {
                success: true,
                result: result,
                message: 'SMS sent successfully'
            };

        } catch (error) {
            console.error('[Africa\'s Talking SMS] Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get SMS delivery reports
     */
    async getSMSDeliveryReports(messageId = null) {
        if (!this.initialized) {
            throw new Error('Africa\'s Talking service not initialized');
        }

        try {
            const sms = this.client.SMS;
            const result = await sms.fetchMessages({
                messageId: messageId
            });

            return {
                success: true,
                reports: result
            };

        } catch (error) {
            console.error('[Africa\'s Talking] Error fetching delivery reports:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            hasClient: this.client !== null,
            username: process.env.AT_USERNAME,
            shortcode: process.env.AT_SHORTCODE,
            apiConfigured: !!(process.env.AT_API_KEY && process.env.AT_USERNAME)
        };
    }

    /**
     * Test connection
     */
    async testConnection() {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Service not initialized'
            };
        }

        try {
            // Try to get account balance as a test
            const application = this.client.APPLICATION;
            const result = await application.fetchApplicationData();
            
            return {
                success: true,
                message: 'Connection successful',
                accountInfo: result
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export singleton instance
module.exports = new AfricasTalkingService();