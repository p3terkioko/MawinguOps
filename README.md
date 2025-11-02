# MawinguOps - Smart Farming Advisory System 🌾

## Architecture Overview

MawinguOps is an AI-powered farming advisory system that provides real-time planting recommendations to smallholder farmers in Machakos County, Kenya through SMS, USSD, and web interfaces.

## System Architecture & Scalability

```mermaid
graph TD
    %% External Traffic Sources
    subgraph Traffic[Traffic Sources]
        USSD[USSD Traffic *384*7460#]
        SMS[SMS Commands MAWINGU]
        Web[Web Browser Traffic]
        API[API Consumer Traffic]
    end
    
    %% Google Cloud Platform Infrastructure
    subgraph GCP[Google Cloud Platform Infrastructure]
        %% Edge Layer
        subgraph Edge[Global Edge Layer]
            CDN[Cloud CDN Global Distribution]
            LB[Cloud Load Balancer SSL Termination]
        end
        
        %% Compute Layer with Scaling Details
        subgraph Compute[Serverless Compute Layer]
            CloudRun[Cloud Run Service mawingu-ops]
            
            %% Scaling Configuration
            subgraph ScaleConfig[Auto-Scaling Configuration]
                Scale0[IDLE STATE 0 instances Cost 0 dollars per hour]
                Scale1[LOW TRAFFIC 1-5 instances 100-500 concurrent users]
                Scale50[MEDIUM TRAFFIC 5-50 instances 500-5000 concurrent users]
                Scale100[HIGH TRAFFIC 50-100 instances 5000-10000 concurrent users]
            end
            
            %% Instance Specifications
            subgraph InstanceSpec[Instance Specifications]
                CPU[2 vCPU per instance]
                RAM[2GB RAM per instance]
                Concurrency[100 concurrent requests per instance]
                Timeout[Request timeout 300 seconds]
            end
            
            %% Auto-Scaling Triggers
            subgraph AutoScale[Auto-Scaling Triggers]
                CPUTrigger[CPU Utilization 80 percent threshold]
                MemoryTrigger[Memory Utilization 85 percent threshold]
                ConcurrencyTrigger[Concurrent requests 90 per instance]
                ScaleUpTime[Scale up time 30 seconds]
                ScaleDownTime[Scale down time 15 minutes idle]
            end
        end
        
        %% Data Layer
        subgraph Data[Data & Storage Layer]
            Runtime[Container File System SQLite Database]
            Secrets[Secret Manager API Keys Environment Variables]
            Logs[Cloud Logging Request Response Logs]
        end
        
        %% Monitoring Layer
        subgraph Monitor[Monitoring & Observability]
            Metrics[Cloud Monitoring CPU Memory Network]
            Alerting[Cloud Alerting Error Rate Response Time]
            Tracing[Cloud Trace Request Flow Analysis]
        end
    end
    
    %% External Services
    subgraph External[External Service Dependencies]
        AT[Africas Talking USSD SMS Gateway]
        HttpSMS[HttpSMS SMS Gateway]
        OpenMeteo[Open-Meteo Weather API]
        Gemini[Google Gemini AI API]
    end
    
    %% Traffic Flow
    USSD --> AT
    SMS --> HttpSMS
    Web --> CDN
    API --> LB
    
    AT --> LB
    HttpSMS --> LB
    CDN --> LB
    LB --> CloudRun
    
    %% Auto-scaling connections
    CloudRun --> ScaleConfig
    CloudRun --> InstanceSpec
    CloudRun --> AutoScale
    
    %% Infrastructure connections
    CloudRun --> Data
    CloudRun --> Monitor
    CloudRun --> External
    
    %% Styling for different components
    classDef traffic fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef gcp fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef scaling fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#d81b60,stroke-width:2px
    classDef compute fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class Traffic,USSD,SMS,Web,API traffic
    class GCP,Edge,Compute,Data,Monitor gcp
    class ScaleConfig,InstanceSpec,AutoScale,Scale0,Scale1,Scale50,Scale100 scaling
    class External,AT,HttpSMS,OpenMeteo,Gemini external
    class CloudRun,CDN,LB compute
```

## USSD User Journey Process Flow

```mermaid
sequenceDiagram
    participant Farmer as Farmer in Field
    participant Phone as Mobile Phone
    participant AT as Africas Talking Gateway
    participant LB as Cloud Load Balancer
    participant CR as Cloud Run Instance
    participant USSD as USSD Service
    participant DB as SQLite Database
    participant Weather as Weather Service
    participant Advisory as Advisory Engine
    participant AI as Gemini AI
    participant MeteoAPI as Open-Meteo API
    
    %% Step 1: Farmer Initiates USSD
    Note over Farmer,MeteoAPI: Step 1 - Farmer Dials USSD Code
    Farmer->>Phone: Dial *384*7460#
    Phone->>+AT: USSD Request initiated
    Note over AT: Creates Session ID ATUid_12345<br/>Allocates session resources
    
    %% Step 2: Initial Webhook Call
    Note over Farmer,MeteoAPI: Step 2 - First API Call to MawinguOps
    AT->>+LB: POST /api/ussd/webhook<br/>sessionId phoneNumber text empty
    Note over LB: Routes request based on<br/>geographic location and load
    LB->>+CR: Forward to available instance
    Note over CR: SCALING EVENT<br/>0 instances → 1 instance<br/>Cold start 2-3 seconds
    
    %% Step 3: Main Menu Display
    Note over Farmer,MeteoAPI: Step 3 - Main Menu Processing
    CR->>+USSD: processUSSDRequest empty input
    USSD->>USSD: Parse session data<br/>Initialize user state
    USSD->>USSD: Generate main menu<br/>1.Get Advisory 2.Register 3.Info 4.Help
    USSD-->>-CR: CON Welcome to MawinguOps<br/>Select option 1-4
    CR-->>-LB: USSD response formatted
    LB-->>-AT: Menu text response
    AT-->>Phone: Display menu on phone
    Phone-->>Farmer: Shows menu options
    
    %% Step 4: User Selection - Get Advisory
    Note over Farmer,MeteoAPI: Step 4 - User Selects Get Advisory
    Farmer->>Phone: Press 1 for Get Advisory
    Phone->>+AT: User input 1
    AT->>+LB: POST /api/ussd/webhook<br/>sessionId phoneNumber text 1
    LB->>+CR: Route to same instance if available
    
    %% Step 5: Check Farmer Registration
    Note over Farmer,MeteoAPI: Step 5 - Check User Registration Status
    CR->>+USSD: processUSSDRequest input 1
    USSD->>+DB: SELECT farmer WHERE phone_number
    Note over DB: Database query<br/>Check if user exists
    
    alt Farmer Already Registered
        DB-->>USSD: Returns farmer profile<br/>location crop preferences
        USSD->>USSD: Generate crop selection menu<br/>based on registration
        USSD-->>CR: CON Select your crop<br/>1.Maize 2.Beans 3.Sorghum
    else Farmer Not Registered
        DB-->>USSD: No farmer record found
        USSD->>USSD: Generate registration flow<br/>location selection first
        USSD-->>CR: CON Please register first<br/>Select location 1.Vota 2.Kathiani
    end
    
    DB-->>-USSD: Database response complete
    CR-->>-LB: Crop selection or registration menu
    LB-->>-AT: Response text
    AT-->>Phone: Display options
    Phone-->>Farmer: Show crop or location menu
    
    %% Step 6: Final Selection and Advisory Generation
    Note over Farmer,MeteoAPI: Step 6 - Generate Weather Advisory
    Farmer->>Phone: Select 1 for Maize
    Phone->>+AT: User input 1*1
    AT->>+LB: POST /api/ussd/webhook<br/>sessionId phoneNumber text 1*1
    LB->>+CR: Route request
    
    CR->>+USSD: processUSSDRequest input 1*1
    USSD->>USSD: Parse selection<br/>Advisory for Maize in Vota
    
    %% Parallel Processing for Advisory
    Note over Farmer,MeteoAPI: Step 7 - Parallel Data Processing
    par Fetch Weather Data
        USSD->>+Weather: getWeather location Vota
        Weather->>+MeteoAPI: GET weather forecast API
        Note over MeteoAPI: External API call<br/>7-day forecast data<br/>temperature rainfall
        MeteoAPI-->>-Weather: Weather JSON response<br/>temperature precipitation probability
        Weather-->>-USSD: Processed weather data
    and Generate AI Advisory
        USSD->>+Advisory: generateAdvisory crop Maize weather
        Advisory->>+AI: Enhanced advisory prompt<br/>crop requirements weather conditions
        Note over AI: Google Gemini AI processing<br/>Generate farming advice<br/>Consider local conditions
        AI-->>-Advisory: AI-generated advisory text<br/>planting recommendations timing
        Advisory-->>-USSD: Complete advisory object
    and Save Session Data
        USSD->>+DB: INSERT advisory_request<br/>phone crop location timestamp
        Note over DB: Log user interaction<br/>for analytics and history
        DB-->>-USSD: Saved successfully
    end
    
    %% Step 8: Final Response
    Note over Farmer,MeteoAPI: Step 8 - Send Complete Advisory
    USSD->>USSD: Format advisory for USSD display<br/>160 character limit handling
    USSD-->>-CR: END Advisory for Maize in Vota<br/>PLANT NOW conditions favorable<br/>Expected rainfall 45mm
    CR-->>-LB: Final advisory response
    LB-->>-AT: Advisory text complete
    AT-->>Phone: Display complete advisory
    Phone-->>Farmer: Shows farming advice
    
    %% Step 9: Session Cleanup and Scaling
    Note over Farmer,MeteoAPI: Step 9 - Session Complete and Auto-Scale
    Note over AT: Session terminated<br/>Resources deallocated<br/>SessionID expires
    Note over CR: SCALING EVENT<br/>No new requests for 15 minutes<br/>Instance scales down to 0<br/>Cost optimization active
    Note over Farmer: Farmer receives complete<br/>weather-based advisory<br/>Can act on recommendations
```

## System Components

### 🚀 **Deployment Platform**
- **Google Cloud Run**: Serverless container platform
- **Region**: us-central1 (Always Free Tier)
- **Resources**: 512MB RAM, 1 vCPU, Auto-scaling 0-5 instances
- **Cost**: $0.00/month within free tier limits

### 📱 **User Interfaces**

#### SMS Interface
- **Gateway**: HttpSMS.com
- **Command**: `MAWINGU [CROP] [LOCATION]`
- **Example**: `MAWINGU MAIZE VOTA`
- **Response**: Detailed farming advisory via SMS

#### USSD Interface
- **Gateway**: Africa's Talking
- **Code**: `*384*7460#`
- **Features**: Interactive menu navigation, offline access
- **Flow**: Main Menu → Crop Selection → Advisory Result

#### Web Interface
- **URL**: `https://mawingu-ops-109647674635.us-central1.run.app`
- **Features**: Interactive form, real-time weather data
- **Technologies**: HTML5, CSS3, Vanilla JavaScript

### 🌐 **External Services**

#### Weather Data
- **Provider**: Open-Meteo API (Free)
- **Coverage**: Vota, Kathiani, Mwala Sub-Counties
- **Data**: Temperature, rainfall, probability forecasts
- **Update Frequency**: Real-time API calls

#### Machine Learning
- **Model**: Scikit-learn Random Forest
- **File**: `maize_planting_model.pkl`
- **Purpose**: Enhance advisory accuracy
- **Fallback**: Rule-based advisory engine

### 🗄️ **Data Layer**

#### SQLite Database
```sql
-- Core Tables
farmers (id, phone_number, name, location, created_at)
advisory_requests (id, farmer_id, crop, location, recommendation, weather_data, request_time)
sms_logs (id, phone_number, message_content, direction, timestamp, status)
weather_cache (id, location, weather_data, fetched_at, expires_at)
```

#### Crop Support
- **Maize**: 18°C-32°C, 40mm+ rainfall
- **Beans**: 16°C-30°C, 35mm+ rainfall  
- **Sorghum**: 20°C-35°C, 30mm+ rainfall

### 🔌 **API Endpoints**

#### Core APIs
```
GET  /api/health          - Health check
GET  /api/locations       - Available locations
POST /api/advisory        - Get farming advisory
POST /api/sms/webhook     - SMS webhook handler
POST /api/ussd/webhook    - USSD webhook handler
```

#### Development APIs
```
POST /api/ussd/test       - Test USSD flows
GET  /ussd-simulator.html - USSD development interface
```

## Request Flow Examples

### SMS Advisory Request
```
1. Farmer sends: "MAWINGU MAIZE VOTA"
2. HttpSMS webhook → MawinguOps server
3. Parse command → Get weather data → Generate advisory
4. ML enhancement (if available) → Save to database
5. Send detailed SMS response to farmer
```

### USSD Session Flow
```
1. Farmer dials: *384*7460#
2. Africa's Talking → USSD webhook
3. Display main menu (CON response)
4. User selects crop → Generate advisory
5. Return final advisory (END response)
```

### Web Advisory Request
```
1. User visits web interface
2. Select crop/location → AJAX POST to /api/advisory
3. Server processes → Returns JSON advisory
4. Frontend displays formatted advisory
```

## Technical Features

### 🛡️ **Reliability**
- Error handling with graceful fallbacks
- ML model availability detection
- Weather API timeout handling
- Database connection retry logic

### 📊 **Performance**
- Request logging and analytics
- Weather data caching
- Lightweight SQLite database
- Efficient message generation

### 🔐 **Security**
- Environment variable configuration
- Input validation and sanitization
- Rate limiting considerations
- Secure webhook handling

### 🌍 **Scalability**
- Serverless auto-scaling
- Stateless application design
- External service integration
- Multi-channel support

## Getting Started

### Local Development
```bash
git clone <repository-url>
cd mawinguops
npm install
cp .env.example .env  # Add your API keys
npm start
```

### Deployment
```bash
./deploy-simple.ps1  # Deploys to Google Cloud Run
```

### Testing USSD
```bash
# Local testing
curl -X POST http://localhost:3000/api/ussd/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+254703844258","text":""}'
```

---

