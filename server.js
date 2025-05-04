require('dotenv').config();
const express = require('express');
const { body, validationResult } = require('express-validator');
const PVGIS = require('./src/index');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8000;

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create PVGIS instance
const pvgis = new PVGIS();

// Cache for API responses
const cache = {
    carbonIntensity: new Map(),
    energyPrices: new Map()
};

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Helper function to check if cache is valid
function isCacheValid(timestamp) {
    return timestamp && (Date.now() - timestamp < CACHE_TTL);
}

// Grid mix data by region (gCO2eq/kWh)
const GRID_MIX = {
    // North America
    'CA': 30,     // Canada (mostly hydro)
    'US': 380,    // US average
    'MX': 450,    // Mexico
    
    // Europe
    'EU': 230,    // EU average
    'UK': 225,    // United Kingdom
    'DE': 350,    // Germany
    'FR': 50,     // France (nuclear)
    'ES': 180,    // Spain
    'IT': 280,    // Italy
    'SE': 15,     // Sweden (hydro/nuclear)
    'NO': 20,     // Norway (hydro)
    'DK': 180,    // Denmark
    
    // Asia
    'CN': 550,    // China
    'IN': 650,    // India
    'JP': 450,    // Japan
    'KR': 420,    // South Korea
    'AU': 450,    // Australia
    'NZ': 80,     // New Zealand
    
    // South America
    'BR': 100,    // Brazil (hydro)
    'AR': 350,    // Argentina
    'CL': 300,    // Chile
    
    // Africa
    'ZA': 800,    // South Africa (coal)
    'EG': 400,    // Egypt
    'MA': 600,    // Morocco
    
    // Middle East
    'AE': 450,    // UAE
    'SA': 550,    // Saudi Arabia
    'IL': 500,    // Israel
    
    'default': 380 // Default to US average
};

// Energy prices by region ($/kWh)
const ENERGY_PRICES = {
    // North America
    'CA': 0.12,   // Canada average
    'US': 0.14,   // US average
    'MX': 0.08,   // Mexico
    
    // Europe
    'EU': 0.22,   // EU average
    'UK': 0.25,   // United Kingdom
    'DE': 0.35,   // Germany
    'FR': 0.18,   // France
    'ES': 0.20,   // Spain
    'IT': 0.28,   // Italy
    'SE': 0.15,   // Sweden
    'NO': 0.12,   // Norway
    'DK': 0.30,   // Denmark
    
    // Asia
    'CN': 0.08,   // China
    'IN': 0.07,   // India
    'JP': 0.20,   // Japan
    'KR': 0.10,   // South Korea
    'AU': 0.18,   // Australia
    'NZ': 0.16,   // New Zealand
    
    // South America
    'BR': 0.10,   // Brazil
    'AR': 0.05,   // Argentina
    'CL': 0.15,   // Chile
    
    // Africa
    'ZA': 0.08,   // South Africa
    'EG': 0.05,   // Egypt
    'MA': 0.12,   // Morocco
    
    // Middle East
    'AE': 0.08,   // UAE
    'SA': 0.05,   // Saudi Arabia
    'IL': 0.15,   // Israel
    
    'default': 0.14 // Default to US average
};

// Helper function to get region from coordinates
function getRegionFromCoordinates(lat, lng) {
    // North America
    if (lat >= 48.0 && lat <= 60.0 && lng >= -140.0 && lng <= -50.0) return 'CA'; // Canada
    if (lat >= 24.0 && lat <= 50.0 && lng >= -125.0 && lng <= -65.0) return 'US'; // US
    if (lat >= 14.0 && lat <= 33.0 && lng >= -118.0 && lng <= -86.0) return 'MX'; // Mexico
    
    // Europe
    if (lat >= 35.0 && lat <= 60.0 && lng >= -10.0 && lng <= 40.0) {
        if (lat >= 49.0 && lat <= 60.0 && lng >= -8.0 && lng <= 2.0) return 'UK';
        if (lat >= 47.0 && lat <= 55.0 && lng >= 6.0 && lng <= 15.0) return 'DE';
        if (lat >= 42.0 && lat <= 51.0 && lng >= -5.0 && lng <= 8.0) return 'FR';
        if (lat >= 36.0 && lat <= 44.0 && lng >= -10.0 && lng <= 4.0) return 'ES';
        if (lat >= 36.0 && lat <= 47.0 && lng >= 6.0 && lng <= 18.0) return 'IT';
        if (lat >= 55.0 && lat <= 70.0 && lng >= 11.0 && lng <= 24.0) return 'SE';
        if (lat >= 58.0 && lat <= 71.0 && lng >= 4.0 && lng <= 31.0) return 'NO';
        if (lat >= 54.0 && lat <= 58.0 && lng >= 8.0 && lng <= 15.0) return 'DK';
        return 'EU';
    }
    
    // Asia
    if (lat >= 18.0 && lat <= 53.0 && lng >= 73.0 && lng <= 135.0) return 'CN'; // China
    if (lat >= 8.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0) return 'IN'; // India
    if (lat >= 31.0 && lat <= 46.0 && lng >= 129.0 && lng <= 146.0) return 'JP'; // Japan
    if (lat >= 33.0 && lat <= 39.0 && lng >= 124.0 && lng <= 132.0) return 'KR'; // South Korea
    if (lat >= -43.0 && lat <= -10.0 && lng >= 113.0 && lng <= 154.0) return 'AU'; // Australia
    if (lat >= -47.0 && lat <= -34.0 && lng >= 166.0 && lng <= 179.0) return 'NZ'; // New Zealand
    
    // South America
    if (lat >= -33.0 && lat <= 5.0 && lng >= -74.0 && lng <= -34.0) return 'BR'; // Brazil
    if (lat >= -55.0 && lat <= -21.0 && lng >= -74.0 && lng <= -53.0) return 'AR'; // Argentina
    if (lat >= -56.0 && lat <= -17.0 && lng >= -75.0 && lng <= -66.0) return 'CL'; // Chile
    
    // Africa
    if (lat >= -35.0 && lat <= -22.0 && lng >= 16.0 && lng <= 33.0) return 'ZA'; // South Africa
    if (lat >= 22.0 && lat <= 32.0 && lng >= 25.0 && lng <= 35.0) return 'EG'; // Egypt
    if (lat >= 27.0 && lat <= 36.0 && lng >= -13.0 && lng <= -1.0) return 'MA'; // Morocco
    
    // Middle East
    if (lat >= 22.0 && lat <= 26.0 && lng >= 51.0 && lng <= 56.0) return 'AE'; // UAE
    if (lat >= 16.0 && lat <= 32.0 && lng >= 34.0 && lng <= 55.0) return 'SA'; // Saudi Arabia
    if (lat >= 29.0 && lat <= 33.0 && lng >= 34.0 && lng <= 36.0) return 'IL'; // Israel
    
    return 'default';
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/reference', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reference.html'));
});

// Validation middleware
const validateCoordinates = [
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90 degrees'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180 degrees')
];

// API endpoint for getting radiation data
app.post('/api/radiation', validateCoordinates, async (req, res) => {

    console.log('Received radiation request:', req.body);
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude } = req.body;

    try {
        // Log the request parameters
        console.log('Requesting PVGIS data for:', { latitude, longitude });

        const data = await pvgis.getMonthlyRadiation(parseFloat(latitude), parseFloat(longitude), {
            horirrad: 1,    // Get horizontal plane irradiation
            optrad: 1,      // Get optimal angle irradiation
            selectrad: 1,   // Get selected angle irradiation
            angle: 30,      // 30 degrees inclination
            mr_dni: 1,      // Get direct normal irradiation
            d2g: 1,         // Get diffuse to global ratio
            avtemp: 1       // Get average temperatures
        });

        // Log successful response
        console.log('Successfully received data from PVGIS');
        res.json(data);
    } catch (error) {
        console.error('PVGIS API Error:', error);
        
        // Extract more detailed error information
        let errorMessage = 'Failed to fetch radiation data';
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            errorMessage = `PVGIS API Error: ${error.response.status} - ${error.response.statusText}`;
            if (error.response.data) {
                errorMessage += ` - ${JSON.stringify(error.response.data)}`;
            }
        } else if (error.request) {
            // The request was made but no response was received
            errorMessage = 'No response received from PVGIS API';
        } else {
            // Something happened in setting up the request that triggered an Error
            errorMessage = error.message;
        }

        res.status(500).json({ 
            error: errorMessage,
            details: error.response?.data || error.message
        });
    }
});

// Carbon intensity endpoint
app.get('/api/carbon-intensity', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const cacheKey = `${lat},${lon}`;
        
        // Check cache
        const cachedData = cache.carbonIntensity.get(cacheKey);
        if (cachedData && isCacheValid(cachedData.timestamp)) {
            return res.json({ carbonIntensity: cachedData.value });
        }

        // Get region and corresponding grid mix
        const region = getRegionFromCoordinates(parseFloat(lat), parseFloat(lon));
        const carbonIntensity = GRID_MIX[region] || GRID_MIX.default;
        
        // Update cache
        cache.carbonIntensity.set(cacheKey, {
            value: carbonIntensity,
            timestamp: Date.now()
        });

        res.json({ carbonIntensity });
    } catch (error) {
        console.error('Error calculating carbon intensity:', error);
        res.status(500).json({ error: 'Failed to calculate carbon intensity' });
    }
});

// Energy prices endpoint
app.get('/api/energy-prices', async (req, res) => {
    try {
        const { region } = req.query;
        
        // Check cache
        const cachedData = cache.energyPrices.get(region);
        if (cachedData && isCacheValid(cachedData.timestamp)) {
            return res.json({ price: cachedData.value });
        }

        // Get price for region
        const price = ENERGY_PRICES[region] || ENERGY_PRICES.default;
        
        // Update cache
        cache.energyPrices.set(region, {
            value: price,
            timestamp: Date.now()
        });

        res.json({ price });
    } catch (error) {
        console.error('Error getting energy prices:', error);
        res.status(500).json({ error: 'Failed to get energy prices' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 