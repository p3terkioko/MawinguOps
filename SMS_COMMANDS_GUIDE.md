# MawinguOps SMS Command System Setup Guide

## Overview
This system allows farmers to send SMS commands to your phone number and automatically receive weather advisories. Only specific command formats trigger responses, protecting your personal messages.

## Valid Commands
Farmers can send any of these formats:

### Command Formats:
- `MAWINGU [CROP] [LOCATION]`
- `WEATHER [CROP] [LOCATION]`
- `ADVISORY [CROP] [LOCATION]`
- `FARMING [CROP] [LOCATION]`
- `PLANT [CROP] [LOCATION]`
- `HELP` - Get instructions

### Examples:
- `MAWINGU MAIZE VOTA` → Gets maize advisory for Vota
- `WEATHER BEANS MASII` → Gets beans advisory for Masii
- `ADVISORY SORGHUM KANGUNDO` → Gets sorghum advisory for Kangundo
- `HELP` → Gets help instructions

### Valid Crops:
- MAIZE
- BEANS
- SORGHUM

### Valid Locations:
- VOTA
- MASII
- KANGUNDO
- TALA

## What Happens:
1. **Valid Command**: Farmer gets instant weather advisory SMS
2. **Invalid Command**: Message is ignored (no response)
3. **Personal Messages**: Completely ignored by the system

## HttpSMS App Configuration

### Step 1: Configure Webhook in HttpSMS App
1. Open HttpSMS app on your Android phone
2. Go to **Settings** → **Webhooks**
3. Enable webhooks
4. Set webhook URL to: `https://your-mawinguops-domain.com/api/sms/webhook`
5. Enable **Message Received** webhook

### Step 2: Test the System

#### Test Command Parsing (Development):
```bash
# Test if a message is a valid command
curl -X POST http://localhost:3000/api/sms/test-command \
  -H "Content-Type: application/json" \
  -d '{"message": "MAWINGU MAIZE VOTA"}'

# Test with phone number (will send actual SMS)
curl -X POST http://localhost:3000/api/sms/test-command \
  -H "Content-Type: application/json" \
  -d '{"message": "MAWINGU MAIZE VOTA", "phoneNumber": "+254703844258"}'
```

#### Test Webhook (Simulate incoming SMS):
```bash
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+254712345678",
    "content": "MAWINGU MAIZE VOTA",
    "timestamp": "2025-10-27T10:00:00Z"
  }'
```

## Security Features
- ✅ Only responds to specific command formats
- ✅ Validates crops and locations
- ✅ Ignores personal messages
- ✅ Logs all interactions for monitoring
- ✅ Error handling for invalid requests

## Monitoring
Check server logs for:
- `[SMS Webhook] Valid MawinguOps command detected` - Command processed
- `[SMS Webhook] Not a MawinguOps command` - Message ignored
- `[MawinguOps] Advisory sent` - Successfully sent response

## Troubleshooting

### No webhook calls received:
1. Check HttpSMS app webhook configuration
2. Verify your server URL is accessible from internet
3. Check if HTTPS is required (HttpSMS may require HTTPS)

### Commands not recognized:
1. Ensure exact format: `MAWINGU MAIZE VOTA`
2. Check crops and locations are valid
3. Test with `/api/sms/test-command` endpoint

### SMS not sending:
1. Check HttpSMS API key and phone number in .env
2. Verify HttpSMS app is running and connected
3. Check server logs for SMS service errors

## Going Live
1. Deploy your server to Google Cloud (or similar)
2. Get HTTPS domain name
3. Update HttpSMS webhook URL to your live domain
4. Share command formats with farmers
5. Monitor logs for usage and issues

## Example Messages Farmers Will Receive:

### Valid Command Response:
```
Jambo mkulima! 🌱

GOOD TIME to plant maize in Vota!

WHY NOW IS GOOD:
• Good rains expected (45mm)
• Perfect temperature (24°C)

ACTION: Plant your seeds within 2 days!

🤖 AI says: 95% confident
```

### Help Response:
```
🌾 MawinguOps - Farming Advisory Service

COMMANDS:
• MAWINGU [CROP] [LOCATION]
• WEATHER [CROP] [LOCATION]

CROPS: Maize, Beans, Sorghum
LOCATIONS: Vota, Masii, Kangundo, Tala

EXAMPLES:
• MAWINGU MAIZE VOTA
• WEATHER BEANS MASII

Get instant AI-powered farming advice!
```