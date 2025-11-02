# 🌾 MawinguOps - Weather Advisory System

**Real-time weather advisory system for smallholder farmers in Machakos County, Kenya**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![API Status](https://img.shields.io/badge/API-Open--Meteo-blue)](https://open-meteo.com/)

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Testing Guide](#-testing-guide)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Project Overview

MawinguOps is a comprehensive weather advisory system designed to help smallholder farmers in Machakos County, Kenya make informed planting decisions. The system fetches real-time weather data from the Open-Meteo API, processes it using agricultural rules, and delivers actionable planting advisories through both web and simulated USSD interfaces.

### Purpose
Help farmers optimize their planting schedules based on weather forecasts, potentially improving crop yields and reducing weather-related losses.

### Target Users
- Smallholder maize, beans, and sorghum farmers
- Located in Vota, Kathiani, and Mwala sub-counties of Machakos County
- Both tech-savvy users (web interface) and basic phone users (USSD simulation)

### Geographic Coverage
- **Vota Sub-County**: -1.3667°, 37.6333°
- **Kathiani Sub-County**: -1.3833°, 37.2500°
- **Mwala Sub-County**: -1.4833°, 37.5167°

---

## ✨ Features

### Core Functionality
- 🌤️ **Real-time Weather Data**: Fetches 7-day forecasts from Open-Meteo API
- 🌱 **Crop-Specific Advisories**: Tailored recommendations for Maize, Beans, and Sorghum
- 📱 **Dual Interface**: Web app and USSD simulator
- 💾 **Farmer Registration**: SQLite database for user management
- 📊 **Advisory History**: Track past recommendations and outcomes
- ⚠️ **Weather Warnings**: Alerts for extreme conditions

### Weather Advisory Logic
- **PLANT NOW**: Optimal conditions detected
- **WAIT 2-3 DAYS**: Marginal conditions, better weather expected
- **DO NOT PLANT YET**: Poor conditions, wait for improvement

### Advisory Criteria
Each crop has specific requirements for:
- Temperature range (min/max)
- Rainfall amounts (minimum/optimal/maximum)
- Rain probability thresholds
- Heavy rain warnings

---

## 🛠️ Technology Stack

### Backend
- **Node.js** (≥14.0.0) - Server runtime
- **Express.js** (^4.18.0) - Web framework
- **SQLite** (better-sqlite3 ^9.0.0) - Local database
- **Axios** (^1.6.0) - HTTP client for API calls

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern responsive design
- **Vanilla JavaScript** - No frameworks, pure JS
- **Mobile-first Design** - Progressive enhancement

### External APIs
- **Open-Meteo API** - Free weather data (no API key required)
- **Base URL**: https://api.open-meteo.com/v1/forecast

### Development Tools
- **CORS** (^2.8.5) - Cross-origin resource sharing
- **Nodemon** (optional) - Development auto-restart

---

## 📋 Prerequisites

Before installing MawinguOps, ensure you have:

1. **Node.js** (version 14.0.0 or higher)
   ```bash
   node --version  # Should show v14.0.0 or higher
   ```

2. **npm** (comes with Node.js)
   ```bash
   npm --version
   ```

3. **Internet Connection** (for weather API access)

4. **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

### System Requirements
- **RAM**: 512MB minimum, 1GB recommended
- **Disk Space**: 100MB for application and database
- **Network**: Stable internet for weather data

---

## 🚀 Installation

### Step 1: Clone or Create Project
Navigate to your project directory and follow these steps:

```bash
# If you have the source code, extract it
# The project should be in the 'mawinguops' folder
cd mawinguops

# Verify project structure
ls -la
# Should show: package.json, server.js, database.js, etc.
```

### Step 2: Install Dependencies
```bash
# Install all required packages
npm install

# This will install:
# - express: Web server framework
# - better-sqlite3: SQLite database driver
# - axios: HTTP client for API calls
# - cors: Cross-origin resource sharing
```

### Step 3: Verify Installation
```bash
# Check if all dependencies are installed
npm list

# Verify Node.js modules
ls node_modules/
```

---

## 🏃‍♂️ Running the Application

### Start the Server
```bash
# Production mode
npm start

# OR development mode (if nodemon is installed)
npm run dev
```

### Expected Output
```
=============================================================
🌾 MawinguOps Weather Advisory System
=============================================================
[Server] Started on port 3000
[Server] Web interface: http://localhost:3000
[Server] USSD simulator: http://localhost:3000/ussd-simulator.html

Available API Endpoints:
- GET  /api/health          - Health check
- GET  /api/locations       - Available locations
- GET  /api/crops           - Available crops
- GET  /api/weather         - Weather data
- GET  /api/advisory        - Farming advisory
- POST /api/register        - Register farmer
- GET  /api/farmers         - Get all farmers
- GET  /api/farmers/:phone  - Get specific farmer
- DEL  /api/farmers/:phone  - Delete farmer
- GET  /api/advisories      - Advisory history
- POST /api/ussd/simulate   - USSD simulation

[Server] System ready for testing! 🚀
=============================================================
```

### Access the Application
- **Main Web Interface**: http://localhost:3000
- **USSD Simulator**: http://localhost:3000/ussd-simulator.html
- **API Health Check**: http://localhost:3000/api/health

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
No authentication required for this local development version.

### Endpoints

#### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "uptime": 3600,
  "service": "MawinguOps Weather Advisory API",
  "version": "1.0.0"
}
```

#### Get Locations
```http
GET /api/locations
```
**Response:**
```json
{
  "success": true,
  "count": 3,
  "locations": [
    {
      "code": "Vota",
      "name": "Vota Sub-County",
      "latitude": -1.3667,
      "longitude": 37.6333
    }
  ]
}
```

#### Get Crops
```http
GET /api/crops
```
**Response:**
```json
{
  "success": true,
  "count": 3,
  "crops": [
    {
      "name": "Maize",
      "temperatureRange": "18°C - 32°C",
      "minRainfall": "50mm",
      "optimalRainfall": "100mm",
      "plantingWindow": "5 days"
    }
  ]
}
```

#### Get Weather Data
```http
GET /api/weather?location=Vota
```
**Parameters:**
- `location` (required): Vota, Kathiani, or Mwala

**Response:**
```json
{
  "success": true,
  "data": {
    "location": "Vota",
    "locationName": "Vota Sub-County",
    "coordinates": {
      "latitude": -1.3667,
      "longitude": 37.6333
    },
    "timezone": "Africa/Nairobi",
    "fetchedAt": "2025-01-15T14:30:00.000Z",
    "dailyForecasts": [
      {
        "date": "2025-01-15",
        "displayDate": "Tuesday, Jan 15",
        "avgTemperature": 24.5,
        "maxTemperature": 28.0,
        "minTemperature": 18.0,
        "totalRainfall": 5.2,
        "rainProbability": 65
      }
    ]
  }
}
```

#### Get Farming Advisory
```http
GET /api/advisory?location=Vota&crop=Maize
```
**Parameters:**
- `location` (required): Vota, Kathiani, or Mwala
- `crop` (required): Maize, Beans, or Sorghum

**Response:**
```json
{
  "success": true,
  "advisory": {
    "location": "Vota",
    "locationName": "Vota Sub-County",
    "crop": "Maize",
    "recommendation": "PLANT NOW",
    "advisory": "Good morning! The weather is favorable for planting maize this week in Vota.",
    "reasoning": "Conditions are favorable because: expected rainfall (75.5mm) meets crop requirements, good rain probability (65%), temperatures (24.5°C) are within ideal range for maize.",
    "generatedAt": "2025-01-15T14:30:00.000Z",
    "details": {
      "totalRainfall": "75.5mm",
      "rainProbability": "65%",
      "avgTemperature": "24.5°C",
      "temperatureRange": "18.0°C - 28.0°C",
      "warnings": [],
      "cropRequirements": {
        "temperatureRange": "18°C - 32°C",
        "minRainfall": "50mm",
        "optimalRainfall": "100mm"
      }
    },
    "forecast": [
      {
        "date": "2025-01-15",
        "displayDate": "Tuesday, Jan 15",
        "dayName": "Tuesday",
        "maxTemp": 28.0,
        "minTemp": 18.0,
        "rainfall": 5.2,
        "rainProbability": 65
      }
    ]
  }
}
```

#### Register Farmer
```http
POST /api/register
Content-Type: application/json

{
  "phoneNumber": "+254712345678",
  "location": "Vota",
  "crop": "Maize"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Farmer registered successfully",
  "farmer": {
    "id": 1,
    "phone_number": "+254712345678",
    "location": "Vota",
    "crop": "Maize",
    "created_at": "2025-01-15T14:30:00.000Z",
    "last_advisory_at": null
  }
}
```

#### Get Farmer Details
```http
GET /api/farmers/+254712345678
```
**Response:**
```json
{
  "success": true,
  "farmer": {
    "id": 1,
    "phone_number": "+254712345678",
    "location": "Vota",
    "crop": "Maize",
    "created_at": "2025-01-15T14:30:00.000Z",
    "last_advisory_at": "2025-01-15T15:00:00.000Z"
  },
  "recentAdvisories": [
    {
      "id": 1,
      "advisory_text": "Good morning! The weather is favorable...",
      "recommendation": "PLANT NOW",
      "created_at": "2025-01-15T15:00:00.000Z"
    }
  ]
}
```

#### USSD Simulation
```http
POST /api/ussd/simulate
Content-Type: application/json

{
  "phoneNumber": "+254712345678",
  "sessionId": "USSD_1642251000_abc123",
  "text": ""
}
```
**Response:**
```json
{
  "response": "CON Welcome to MawinguOps 🌾\nWeather Advisory for Farmers\n\n1. Register\n2. Get Advice\n3. My Info",
  "continueSession": true
}
```

### Error Responses
All endpoints return errors in this format:
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created (farmer registration)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate registration)
- `500` - Internal Server Error

---

## 🗄️ Database Schema

### Farmers Table
```sql
CREATE TABLE farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    location TEXT NOT NULL CHECK (location IN ('Vota', 'Kathiani', 'Mwala')),
    crop TEXT NOT NULL CHECK (crop IN ('Maize', 'Beans', 'Sorghum')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_advisory_at DATETIME
);

-- Indexes
CREATE INDEX idx_farmers_phone ON farmers(phone_number);
CREATE INDEX idx_farmers_location ON farmers(location);
```

### Advisory History Table
```sql
CREATE TABLE advisory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    location TEXT NOT NULL,
    crop TEXT NOT NULL,
    advisory_text TEXT NOT NULL,
    recommendation TEXT NOT NULL CHECK (recommendation IN ('PLANT NOW', 'WAIT 2-3 DAYS', 'DO NOT PLANT YET')),
    weather_data TEXT,  -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_advisory_phone ON advisory_history(phone_number);
CREATE INDEX idx_advisory_created ON advisory_history(created_at);
```

### Database File Location
- **Development**: `./mawinguops.db`
- **Backup**: Database auto-creates on first run
- **Reset**: Delete `.db` file to reset (will lose all data)

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### 1. Server Startup
- [ ] Server starts without errors
- [ ] All endpoints are listed in startup output
- [ ] Database initializes correctly
- [ ] Port 3000 is accessible

#### 2. Web Interface Testing
- [ ] Main page loads at http://localhost:3000
- [ ] Location dropdown populated
- [ ] Crop dropdown populated
- [ ] Form validation works
- [ ] Submit button state changes appropriately

#### 3. Weather Advisory Testing
```bash
# Test different scenarios:
curl "http://localhost:3000/api/advisory?location=Vota&crop=Maize"
curl "http://localhost:3000/api/advisory?location=Kathiani&crop=Beans"
curl "http://localhost:3000/api/advisory?location=Mwala&crop=Sorghum"
```

#### 4. Farmer Registration Testing
```bash
# Register test farmers
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+254712345678","location":"Vota","crop":"Maize"}'

curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+254723456789","location":"Kathiani","crop":"Beans"}'
```

#### 5. USSD Simulator Testing
- [ ] USSD simulator loads at /ussd-simulator.html
- [ ] Phone number validation works
- [ ] Session starts successfully
- [ ] Menu navigation functions
- [ ] Registration flow completes
- [ ] Advisory retrieval works
- [ ] Session termination works

#### 6. Mobile Responsiveness
- [ ] Test on mobile device or browser dev tools
- [ ] All text is readable (minimum 16px)
- [ ] Buttons are touchable (minimum 44px)
- [ ] Forms work on mobile
- [ ] USSD simulator works on mobile

#### 7. Error Handling
- [ ] Invalid location/crop parameters
- [ ] Network errors (disconnect internet briefly)
- [ ] Malformed requests
- [ ] Database errors (corrupt database file)

### Sample Test Data

#### Test Farmers
```json
[
  {
    "phoneNumber": "+254712345678",
    "location": "Vota",
    "crop": "Maize"
  },
  {
    "phoneNumber": "+254723456789",
    "location": "Kathiani",
    "crop": "Beans"
  },
  {
    "phoneNumber": "+254734567890",
    "location": "Mwala",
    "crop": "Sorghum"
  }
]
```

#### Expected Weather Scenarios
Test the system with different weather conditions:
- **Good conditions**: Sufficient rain, good temperature
- **Marginal conditions**: Low rain, acceptable temperature
- **Poor conditions**: No rain or extreme temperature
- **Warning conditions**: Heavy rain or temperature extremes

### Performance Testing
```bash
# Test API response times
time curl "http://localhost:3000/api/advisory?location=Vota&crop=Maize"

# Test concurrent requests (if ab is installed)
ab -n 100 -c 10 "http://localhost:3000/api/health"
```

---

## 📁 Project Structure

```
mawinguops/
├── package.json              # Dependencies and scripts
├── .gitignore                # Git ignore rules
├── server.js                 # Main Express server
├── database.js               # SQLite database functions
├── weatherService.js         # Open-Meteo API integration
├── advisoryEngine.js         # Advisory generation logic
├── mawinguops.db            # SQLite database file (auto-generated)
├── public/                   # Static web files
│   ├── index.html           # Main web interface
│   ├── ussd-simulator.html  # USSD menu simulator
│   ├── styles.css           # Shared styles
│   ├── app.js              # Main page JavaScript
│   └── ussd.js             # USSD simulator JavaScript
└── README.md               # This documentation
```

### Key Files Description

#### Backend Files
- **server.js**: Express server with all API endpoints
- **database.js**: SQLite operations and schema
- **weatherService.js**: Weather data fetching and processing
- **advisoryEngine.js**: Crop-specific advisory logic

#### Frontend Files
- **index.html**: Main application interface
- **ussd-simulator.html**: USSD testing interface
- **styles.css**: Responsive CSS with design system
- **app.js**: Main app logic and API integration
- **ussd.js**: USSD simulation and state management

---

## ⚙️ Configuration

### Environment Variables
Create a `.env` file (optional) for configuration:
```bash
# Server configuration
PORT=3000
NODE_ENV=development

# Database configuration
DATABASE_PATH=./mawinguops.db

# API configuration
WEATHER_API_TIMEOUT=30000
```

### Crop Requirements Configuration
Edit `advisoryEngine.js` to modify crop requirements:
```javascript
const CROP_REQUIREMENTS = {
  'Maize': {
    minTemp: 18,          // Minimum temperature (°C)
    maxTemp: 32,          // Maximum temperature (°C)
    minRainfall: 50,      // Minimum rainfall (mm over 5 days)
    optimalRainfall: 100, // Optimal rainfall (mm over 5 days)
    maxRainfall: 200,     // Too much rain (mm over 5 days)
    plantingWindow: 5     // Days to consider
  }
};
```

### Location Coordinates
Edit `weatherService.js` to modify or add locations:
```javascript
const LOCATIONS = {
  'Vota': { lat: -1.3667, lon: 37.6333, name: 'Vota Sub-County' },
  'Kathiani': { lat: -1.3833, lon: 37.2500, name: 'Kathiani Sub-County' },
  'Mwala': { lat: -1.4833, lon: 37.5167, name: 'Mwala Sub-County' }
};
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot connect to weather service"
**Symptoms**: Weather API calls fail
**Solutions**:
- Check internet connection
- Verify Open-Meteo API is accessible: https://api.open-meteo.com/v1/forecast
- Check firewall settings
- Restart the server

#### 2. "Database error"
**Symptoms**: Farmer registration fails
**Solutions**:
```bash
# Check database file permissions
ls -la mawinguops.db

# Delete and recreate database
rm mawinguops.db
npm start  # Will recreate database
```

#### 3. "Port 3000 already in use"
**Symptoms**: Server won't start
**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000
# OR on Windows
netstat -ano | findstr :3000

# Kill the process or use different port
PORT=3001 npm start
```

#### 4. "Module not found" errors
**Symptoms**: Import errors on startup
**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify Node.js version
node --version  # Should be >= 14.0.0
```

#### 5. Web interface not loading
**Symptoms**: Blank page or 404 errors
**Solutions**:
- Verify server is running
- Check browser console for JavaScript errors
- Clear browser cache
- Try different browser
- Check if static files are served correctly

#### 6. USSD simulator not working
**Symptoms**: USSD interactions fail
**Solutions**:
- Check browser JavaScript console
- Verify API endpoints are responding
- Test with simple phone number format
- Clear browser storage/cookies

### Debug Mode
Enable detailed logging:
```bash
# Set debug environment
DEBUG=* npm start

# Or check specific components
DEBUG=mawinguops:* npm start
```

### Log Files
Check console output for detailed error messages:
- Database operations: `[DB]` prefix
- Weather service: `[Weather]` prefix
- Advisory engine: `[Advisory]` prefix
- API requests: `[API]` prefix
- USSD simulator: `[USSD]` prefix

### Getting Help
1. Check this README for common solutions
2. Review console logs for specific error messages
3. Test individual API endpoints with curl
4. Verify system requirements are met
5. Check Open-Meteo API status

---

## 🚀 Future Enhancements

### Phase 2: Production Deployment
- [ ] **Cloud Hosting**: Deploy on AWS Lambda or Heroku
- [ ] **Database Migration**: Move to PostgreSQL or MongoDB
- [ ] **Authentication**: Add user authentication and API keys
- [ ] **Caching**: Implement Redis for weather data caching
- [ ] **Load Balancing**: Handle multiple concurrent users

### Phase 3: SMS/USSD Integration
- [ ] **Africa's Talking Integration**: Real SMS and USSD
- [ ] **Bulk SMS**: Send advisories to registered farmers
- [ ] **USSD Gateway**: Connect to telecom USSD codes
- [ ] **Payment Integration**: Premium advisory services

### Phase 4: Advanced Features
- [ ] **Machine Learning**: Improve advisory accuracy
- [ ] **Soil Data**: Integrate soil moisture sensors
- [ ] **Satellite Data**: Add satellite imagery analysis
- [ ] **Market Prices**: Include crop price forecasts
- [ ] **Multi-language**: Support Swahili and local languages

### Phase 5: Mobile Apps
- [ ] **Android App**: Native mobile application
- [ ] **iOS App**: iOS application
- [ ] **Offline Mode**: Work without internet
- [ ] **Push Notifications**: Real-time alerts

### Phase 6: Expansion
- [ ] **More Counties**: Expand beyond Machakos
- [ ] **More Crops**: Add vegetables, fruits, livestock
- [ ] **Irrigation Advice**: Water management recommendations
- [ ] **Pest Alerts**: Disease and pest warnings

### Technical Improvements
- [ ] **API Rate Limiting**: Prevent abuse
- [ ] **Data Validation**: Stronger input validation
- [ ] **Error Monitoring**: Automated error tracking
- [ ] **Performance Monitoring**: Response time tracking
- [ ] **Automated Testing**: Unit and integration tests
- [ ] **CI/CD Pipeline**: Automated deployment

---

## 🤝 Contributing

We welcome contributions to MawinguOps! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Contribution Guidelines
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test on different browsers and devices
- Include error handling

### Areas Needing Help
- [ ] **Frontend UX**: Improve user interface design
- [ ] **Mobile Optimization**: Better mobile experience
- [ ] **Accessibility**: WCAG compliance
- [ ] **Testing**: Automated test coverage
- [ ] **Documentation**: API documentation improvements
- [ ] **Localization**: Swahili translations

### Bug Reports
Please include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/device information
- Console error messages
- Screenshots if applicable

### Feature Requests
Please describe:
- Use case and problem being solved
- Proposed solution
- Alternative approaches considered
- Priority level

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty

---

## 🙏 Acknowledgments

### Weather Data
- **Open-Meteo**: Free weather API service
- **ECMWF**: European Centre for Medium-Range Weather Forecasts

### Technology Partners
- **Node.js Foundation**: JavaScript runtime
- **SQLite**: Embedded database engine
- **Express.js**: Web application framework

### Agricultural Guidance
- **Kenya Agricultural and Livestock Research Organization (KALRO)**
- **World Food Programme**: Agricultural best practices
- **Local farmers in Machakos County**: Real-world insights

### Design Inspiration
- **Material Design**: UI/UX principles
- **Progressive Web Apps**: Mobile-first approach

---

## 📞 Support & Contact

### Technical Support
- **Documentation**: This README file
- **API Reference**: See API Documentation section
- **Error Codes**: Check Troubleshooting section

### Project Information
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Compatibility**: Node.js 14+, Modern browsers
- **License**: MIT

### Quick Links
- **Live Demo**: http://localhost:3000 (when running)
- **USSD Simulator**: http://localhost:3000/ussd-simulator.html
- **Health Check**: http://localhost:3000/api/health
- **API Documentation**: See sections above

---

**Built with ❤️ for smallholder farmers in Kenya**

*MawinguOps - Empowering farmers with weather intelligence*#   M a w i n g u O p s  
 #   M a w i n g u O p s  
 