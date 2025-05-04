# PVGIS API Wrapper

A Node.js wrapper for the PVGIS (Photovoltaic Geographical Information System) API to get solar radiation data.

## Installation

```bash
npm install pvgis-api
```

## Usage

```javascript
const PVGIS = require('pvgis-api');

// Create a new instance
const pvgis = new PVGIS();

// Example: Get monthly radiation data for a location
async function getMonthlyData() {
    try {
        // Get data for New York City (40.7128° N, 74.0060° W)
        const data = await pvgis.getMonthlyRadiation(40.7128, -74.0060, {
            horirrad: true,    // Get horizontal plane irradiation
            optrad: true,      // Get optimal angle irradiation
            avtemp: true       // Get average temperatures
        });
        
        console.log(data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example: Get daily radiation data for a specific month
async function getDailyData() {
    try {
        // Get data for January (month=1)
        const data = await pvgis.getDailyRadiation(40.7128, -74.0060, 1, {
            global: true,          // Get global irradiance
            showtemperatures: true // Include temperature data
        });
        
        console.log(data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example: Get hourly radiation data
async function getHourlyData() {
    try {
        const data = await pvgis.getHourlyRadiation(40.7128, -74.0060, {
            pvcalculation: true,   // Include PV production estimation
            peakpower: 1,          // 1 kW system
            loss: 14               // 14% system losses
        });
        
        console.log(data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

## API Methods

### getMonthlyRadiation(lat, lon, options)
Get monthly radiation data for a specific location.

Parameters:
- `lat`: Latitude in decimal degrees (south is negative)
- `lon`: Longitude in decimal degrees (west is negative)
- `options`: Additional options (see documentation)

### getDailyRadiation(lat, lon, month, options)
Get daily radiation data for a specific location and month.

Parameters:
- `lat`: Latitude in decimal degrees (south is negative)
- `lon`: Longitude in decimal degrees (west is negative)
- `month`: Month number (1-12, or 0 for all months)
- `options`: Additional options (see documentation)

### getHourlyRadiation(lat, lon, options)
Get hourly radiation data for a specific location.

Parameters:
- `lat`: Latitude in decimal degrees (south is negative)
- `lon`: Longitude in decimal degrees (west is negative)
- `options`: Additional options (see documentation)

## Rate Limiting

The PVGIS API has a rate limit of 30 calls per second per IP address. The wrapper does not implement rate limiting, so please be mindful of this limit in your application.

## Error Handling

All methods return promises that will reject with an error if the API call fails. The error message will include details about what went wrong.

## License

MIT 