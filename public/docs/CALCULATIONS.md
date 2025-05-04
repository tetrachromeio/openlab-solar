# Solar Energy Simulation Calculations

This document outlines the mathematical calculations and methodology used in the solar energy simulation application.

## Core Calculations

### 1. Panel Capacity Calculation
```javascript
// Calculate maximum number of panels that can fit
const panelWidth = Math.sqrt(panelArea);
const effectivePanelArea = Math.pow(panelWidth + spacing, 2);
const maxPanels = Math.floor(totalArea / effectivePanelArea);

// Calculate system capacity
const totalArea = maxPanels * panelArea;
const peakPower = totalArea * 1000 * efficiency * (1 - systemLosses);
```

### 2. Monthly Energy Production
```javascript
// For each month:
const tempFactor = 1 - (0.004 * (avgTemperature - 25)); // Temperature coefficient
const monthlyEfficiency = baseEfficiency * tempFactor * (1 - systemLosses);
const monthlyEnergy = totalArea * avgIrradiation * monthlyEfficiency;

// Convert to daily peak sun hours
const daysInMonth = new Date(2000, month, 0).getDate();
const dailyPeakSunHours = avgIrradiation / daysInMonth;
```

### 3. Efficiency Calculations
```javascript
// System efficiency factors
const baseEfficiency = panelEfficiency / 100;
const tempFactor = 1 - (0.004 * (temperature - 25)); // -0.4% per °C
const systemLosses = systemLossesPercentage / 100;
const monthlyEfficiency = baseEfficiency * tempFactor * (1 - systemLosses);

// Overall system efficiency
const theoreticalMax = totalArea * 1000 * avgPeakSunHours * 365 * baseEfficiency;
const efficiencyFactor = (annualEnergy / theoreticalMax) * 100;
```

### 4. Financial Calculations
```javascript
// Initial investment
const costPerWatt = 2.50; // $2.50 per watt (2024 average)
const systemSize = panelCount * panelArea * 1000;
const initialCost = systemSize * costPerWatt;

// Annual savings
const annualSavings = annualEnergy * energyPrice;

// Payback period
const paybackPeriod = initialCost / annualSavings;

// ROI calculation
const lifetimeSavings = annualSavings * 25; // 25-year system lifetime
const roi = ((lifetimeSavings - initialCost) / initialCost) * 100;
```

### 5. Environmental Impact
```javascript
// Carbon offset
const carbonOffset = annualEnergy * carbonIntensity;

// Equivalent metrics
const treesEquivalent = carbonOffset / 22; // Each tree absorbs ~22 kg CO2/year
const carsOffset = carbonOffset / 4600; // Average car emits 4.6 metric tons CO2/year
```

## Data Processing

### 1. Monthly Data Averaging
```javascript
// Group data by month
const monthlyAverages = {};
radiationData.outputs.monthly.forEach(data => {
    if (!monthlyAverages[data.month]) {
        monthlyAverages[data.month] = {
            H_i_m: [], // Selected angle irradiation
            H_i_opt_m: [], // Optimal angle irradiation
            H_h_m: [], // Horizontal irradiation
            T2m: [] // Temperature
        };
    }
    
    // Add data points
    if (data['H(i)_m']) monthlyAverages[data.month].H_i_m.push(data['H(i)_m']);
    if (data['H(i_opt)_m']) monthlyAverages[data.month].H_i_opt_m.push(data['H(i_opt)_m']);
    if (data['H(h)_m']) monthlyAverages[data.month].H_h_m.push(data['H(h)_m']);
    if (data.T2m) monthlyAverages[data.month].T2m.push(data.T2m);
});

// Calculate averages
const avgIrradiation = data.H_i_m.length > 0 ? 
    data.H_i_m.reduce((a, b) => a + b, 0) / data.H_i_m.length :
    (data.H_i_opt_m.length > 0 ? 
        data.H_i_opt_m.reduce((a, b) => a + b, 0) / data.H_i_opt_m.length :
        data.H_h_m.reduce((a, b) => a + b, 0) / data.H_h_m.length);
```

## Constants and Assumptions

### System Parameters
- Panel spacing: 0.5 meters
- Temperature coefficient: -0.4% per °C
- System lifetime: 25 years
- Standard Test Conditions (STC):
  - Irradiance: 1000 W/m²
  - Temperature: 25°C
  - Air mass: 1.5

### Financial Parameters
- Cost per watt: $2.50 (2024 average)
- Net metering rate: 70% of retail rate
- Peak rate: 120% of retail rate
- Off-peak rate: 80% of retail rate

### Environmental Parameters
- Tree absorption: 22 kg CO2/year
- Car emissions: 4.6 metric tons CO2/year
- Average household consumption: 9000 kWh/year

## Data Sources

For detailed information about data sources, please refer to [DATA_SOURCES.md](./DATA_SOURCES.md).

## Contributing

This is an open-source project, and we welcome contributions to improve the calculations and methodology. If you find any issues or have suggestions for improvement, please:

1. Open an issue describing the problem or suggestion
2. Provide references to support your proposed changes
3. If possible, include example calculations

## Validation

The calculations have been validated against:
- PVGIS API results
- Industry standard solar calculators
- Real-world solar installation data

However, as with any simulation, results should be considered estimates and may vary based on:
- Local weather conditions
- Installation quality
- System degradation
- Market fluctuations
- Government policies

## License

This documentation is part of the TetraLabs Solar Energy Simulation project and is released under the same license as the main project. 