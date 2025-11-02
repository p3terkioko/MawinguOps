# MawinguOps API Endpoints Documentation

## Complete List of Available Endpoints

### **Core System Endpoints**

#### Health & Status
- **GET** `/api/health` - System health check and uptime
- **GET** `/api/ml-status` - ML model availability status

#### Location & Crop Data
- **GET** `/api/locations` - Get all available locations (Vota, Kathiani, Mwala)
- **GET** `/api/crops` - Get all available crops (Maize, Beans, Sorghum)

#### Weather & Advisory
- **GET** `/api/weather?location={location}` - Get weather data for specific location
- **GET** `/api/advisory?location={location}&crop={crop}` - Get farming advisory (GET)
- **POST** `/api/advisory` - Get farming advisory (POST with JSON body)

### **Farmer Management Endpoints**

#### Registration & Profile
- **POST** `/api/register` - Register new farmer
- **GET** `/api/farmers` - Get all registered farmers (admin)
- **GET** `/api/farmers/{phoneNumber}` - Get specific farmer details
- **DELETE** `/api/farmers/{phoneNumber}` - Delete farmer account

#### Advisory History
- **GET** `/api/advisories?limit={limit}` - Get recent advisory history

### **USSD Integration Endpoints (Africa's Talking)**

#### Production USSD
- **POST** `/api/ussd/webhook` - **Main USSD webhook for Africa's Talking**
  - **This is the primary callback URL for production**
  - Expects: `sessionId`, `serviceCode`, `phoneNumber`, `text`
  - Returns: USSD response string (CON/END)

#### USSD Development & Testing
- **POST** `/api/ussd/test` - Test USSD flows locally
  - Body: `{"phoneNumber": "+254...", "input": "1*2*3"}`
- **GET** `/api/ussd/status` - USSD service status and configuration
- **POST** `/api/ussd/simulate` - Internal USSD simulation (development)

### **Africa's Talking Service Endpoints**

#### Service Management
- **GET** `/api/africastalking/status` - Africa's Talking service configuration status
- **GET** `/api/africastalking/test` - Test connection to Africa's Talking API

#### SMS via Africa's Talking
- **POST** `/api/africastalking/sms` - Send SMS through Africa's Talking
  - Body: `{"to": "+254...", "message": "text", "from": "optional"}`

### **SMS Integration Endpoints (HttpSMS)**

#### SMS Configuration
- **POST** `/api/sms/configure` - Configure HttpSMS gateway
- **GET** `/api/sms/status` - SMS service status
- **GET** `/api/sms/test` - Test HttpSMS connection

#### SMS Operations  
- **POST** `/api/sms/send` - Send individual SMS
- **POST** `/api/sms/advisory` - Send weather advisory via SMS
- **POST** `/api/sms/broadcast` - Broadcast message to all farmers

#### SMS Webhooks
- **POST** `/api/sms/webhook` - **Webhook for incoming SMS messages**
- **POST** `/api/sms/test-command` - Test SMS command parsing

### **Static Files & UI**
- **GET** `/` - Main web application (index.html)
- **GET** `/ussd-simulator.html` - USSD testing interface
- **GET** `/app.js` - Frontend JavaScript
- **GET** `/styles.css` - Frontend styles

## **Key Callback URLs for External Services**

### Africa's Talking USSD Callback
```
Production: https://mawingu-ops-109647674635.us-central1.run.app/api/ussd/webhook
Local/Dev:  https://your-ngrok-url.ngrok.io/api/ussd/webhook
```

### HttpSMS Webhook Callback  
```
Production: https://mawingu-ops-109647674635.us-central1.run.app/api/sms/webhook
Local/Dev:  https://your-ngrok-url.ngrok.io/api/sms/webhook
```

## **Environment Variables Required**

```bash
# HttpSMS Configuration
httpsmsapikey=your_httpsms_api_key
httpsmsphonenumber=+254703844258

# Google Gemini AI
gemini=your_gemini_api_key

# Africa's Talking Configuration
AT_API_KEY=your_at_api_key
AT_USERNAME=sandbox  # or your production username
AT_SHORTCODE=7460    # your USSD shortcode

# Server Configuration
PORT=3000            # optional, defaults to 3000
HOST=0.0.0.0         # optional, defaults to 0.0.0.0
```

## **USSD Flow Structure**

### Main Menu (`*384*7460#`)
```
1. Get Weather Advisory
2. Register/Update Profile  
3. My Information
4. Help & Instructions
```

### Service Code
- **USSD Code**: `*384*7460#`
- **Shortcode**: `7460`
- **Webhook URL**: `/api/ussd/webhook`