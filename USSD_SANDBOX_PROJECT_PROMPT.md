# USSD Sandbox Testing Project - Creation Prompt

## Project Overview
Create a standalone Node.js application to test and simulate Africa's Talking USSD integration for the MawinguOps farming advisory system. This project will act as a development sandbox to test USSD flows before deploying to production.

## Project Requirements

### **1. Project Structure**
```
ussd-sandbox/
├── package.json
├── .env
├── server.js
├── public/
│   ├── index.html
│   ├── simulator.css
│   └── simulator.js
├── routes/
│   ├── ussd.js
│   └── webhook.js
├── services/
│   ├── africasTalking.js
│   └── sessionManager.js
└── README.md
```

### **2. Core Dependencies**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "africastalking": "^0.7.7",
    "axios": "^1.6.0",
    "body-parser": "^1.20.0",
    "uuid": "^9.0.0"
  }
}
```

### **3. Environment Configuration**
```bash
# Africa's Talking Sandbox Credentials
AT_API_KEY=atsk_d2ab90d2093d625de1b02b8e94c0175537d030452c7e759fbf8ceb15df0d08ee42101625
AT_USERNAME=sandbox
AT_SHORTCODE=7460

# MawinguOps Production API
MAWINGU_API_BASE=https://mawingu-ops-109647674635.us-central1.run.app
MAWINGU_LOCAL_API=http://localhost:3000

# Server Configuration
PORT=4000
NODE_ENV=development

# Ngrok/Localtunnel Configuration (for exposing to AT sandbox)
PUBLIC_URL=https://your-ngrok-url.ngrok.io
```

## **4. Key Features to Implement**

### **USSD Simulator Web Interface**
- **URL**: `http://localhost:4000`
- Interactive web form to simulate USSD sessions
- Input fields: Phone Number, USSD Code, User Input
- Real-time display of USSD responses (CON/END)
- Session history and flow visualization
- Copy-paste functionality for testing different scenarios

### **Webhook Endpoints**
- **POST** `/webhook/ussd` - Receives Africa's Talking USSD callbacks
- **POST** `/webhook/test` - Internal testing webhook
- **GET** `/webhook/status` - Webhook status and configuration

### **API Integration Endpoints**
- **POST** `/api/proxy/advisory` - Proxy requests to MawinguOps API
- **POST** `/api/proxy/register` - Proxy farmer registration
- **GET** `/api/proxy/farmers/:phone` - Get farmer details
- **GET** `/api/test/connection` - Test connection to MawinguOps API

### **Session Management**
- Store USSD sessions in memory with timeout
- Track user flows and input history  
- Debug logging for each session step
- Session cleanup after timeout (5 minutes)

## **5. USSD Flow Integration**

### **Target MawinguOps USSD Flows**
```
Main Menu (*384*7460#):
1. Get Weather Advisory
   ├── Select Crop (if registered)
   ├── Registration flow (if not registered)
   └── Display advisory with weather data
   
2. Register/Update Profile
   ├── Select Location (Vota/Kathiani/Mwala)
   ├── Select Crop (Maize/Beans/Sorghum)
   └── Confirmation message
   
3. My Information
   └── Display registered farmer details
   
4. Help & Instructions
   └── Show help text and usage guide
```

### **Integration Points**
- **Primary API**: `https://mawingu-ops-109647674635.us-central1.run.app`
- **Webhook URL**: `https://mawingu-ops-109647674635.us-central1.run.app/api/ussd/webhook`
- **Test Endpoint**: `https://mawingu-ops-109647674635.us-central1.run.app/api/ussd/test`
- **Status Check**: `https://mawingu-ops-109647674635.us-central1.run.app/api/ussd/status`

## **6. Africa's Talking Sandbox Setup**

### **Sandbox Configuration Steps**
1. **Login**: https://account.africastalking.com/auth/login
2. **Navigate**: Apps → Sandbox → USSD
3. **Create USSD Channel**:
   - **Service Code**: `*384*7460#`
   - **Callback URL**: `https://your-ngrok-url.ngrok.io/webhook/ussd`
   - **Description**: MawinguOps Farming Advisory Testing
4. **Add Test Phone Numbers** in Sandbox settings
5. **Test with Simulator** in AT dashboard

### **Required Callback Format**
Africa's Talking sends POST requests with:
```javascript
{
  "sessionId": "ATUid_abc123",
  "serviceCode": "*384*7460#", 
  "phoneNumber": "+254701234567",
  "text": "1*2*3"  // User input sequence
}
```

Response format (plain text):
```
CON Welcome to MawinguOps
Select option:
1. Get Advisory

// OR

END Thank you for using MawinguOps
Your advisory: Plant maize now...
```

## **7. Testing Features**

### **Manual Testing Interface**
- Phone number input (+254 format validation)
- USSD code selector (*384*7460#)
- Step-by-step input simulation (1, 1*2, 1*2*3, etc.)
- Response display with CON/END detection
- Session reset functionality

### **Automated Testing Suite**  
- Predefined test scenarios (registration, advisory, help)
- Bulk testing with multiple phone numbers
- Response validation and flow verification
- Performance testing (session handling)

### **Debug & Logging**
- Console logging for all USSD interactions
- Session state tracking and visualization
- Error handling and recovery testing
- Integration status monitoring

## **8. Deployment & Exposure**

### **Local Development**
```bash
# Terminal 1: Start MawinguOps main app
cd mawinguops && node server.js  # Port 3000

# Terminal 2: Start USSD Sandbox
cd ussd-sandbox && npm start     # Port 4000

# Terminal 3: Expose to internet
npx localtunnel --port 4000 --subdomain mawingu-ussd-test
# OR
ngrok http 4000
```

### **Public URL Setup**
- Use ngrok or localtunnel to expose port 4000
- Configure Africa's Talking webhook with public URL
- Test end-to-end flow from AT Sandbox

## **9. Expected File Contents**

### **server.js** (Main Express App)
- Express server setup with CORS and body parsing
- Route mounting for webhooks and API endpoints
- Session management middleware
- Error handling and logging
- Africa's Talking client initialization

### **public/index.html** (USSD Simulator UI)
- Clean, responsive interface for USSD testing
- Form inputs for phone, service code, user input
- Real-time response display area
- Session history panel
- Connection status indicator

### **routes/ussd.js** (USSD Logic)
- USSD session processing logic
- Menu navigation handling
- Integration with MawinguOps API
- Response formatting (CON/END)

### **services/africasTalking.js** (AT Integration)
- Africa's Talking SDK setup
- Connection testing
- SMS sending capabilities (optional)
- Error handling for AT API calls

## **10. Success Criteria**

### **Testing Milestones**
1. ✅ USSD simulator loads and accepts input
2. ✅ Webhook receives and processes AT callbacks  
3. ✅ Integration with MawinguOps API works
4. ✅ Complete USSD flows work end-to-end
5. ✅ Africa's Talking Sandbox successfully calls webhook
6. ✅ All menu options and flows tested
7. ✅ Error handling works for invalid inputs
8. ✅ Session management handles timeouts

### **Final Deliverables**
- Working USSD sandbox application
- Web-based testing interface
- Documentation for setup and usage
- Test scenarios and validation results
- Ready-to-deploy webhook for AT integration

## **Usage Instructions**

### **Quick Start Commands**
```bash
# Create new project
mkdir ussd-sandbox && cd ussd-sandbox
npm init -y

# Install dependencies  
npm install express cors dotenv africastalking axios body-parser uuid

# Create project structure
mkdir public routes services
touch server.js .env README.md

# Start development
npm start

# Expose to internet (separate terminal)
npx localtunnel --port 4000 --subdomain mawingu-ussd-test
```

### **Testing Workflow**
1. Start MawinguOps main application (port 3000)
2. Start USSD sandbox application (port 4000)
3. Expose sandbox with ngrok/localtunnel
4. Configure AT Sandbox with public webhook URL
5. Test using web interface and AT Sandbox simulator
6. Validate all USSD flows work correctly
7. Deploy MawinguOps to production with working USSD

This comprehensive setup will provide a complete testing environment for the MawinguOps USSD integration before deploying to production.