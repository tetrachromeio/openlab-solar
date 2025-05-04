// Utility functions for statistical calculations
function calculateStats(values) {
    if (!values || values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / values.length,
        median: sorted.length % 2 === 0 
            ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2
            : sorted[Math.floor(sorted.length/2)]
    };
}

// Initialize the map
let map;
let marker;
let userLocationMarker;
let drawControl;
let drawnItems;
let monthlyChart;

// Disable source map loading for Chart.js
Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#161616';
Chart.defaults.plugins.tooltip.bodyColor = '#525252';
Chart.defaults.plugins.tooltip.borderColor = '#e0e0e0';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.boxPadding = 6;
Chart.defaults.plugins.tooltip.usePointStyle = true;

// Area conversion functions
const areaConversions = {
    m2: 1,
    km2: 0.000001,
    ha: 0.0001
};

// Solar panel configuration
const panelConfig = {
    spacing: 0.5, // meters between panels
    tiltAngle: 30, // degrees
    azimuthAngle: 180, // degrees (south-facing)
    efficiency: 0.20, // 20% efficiency
    systemLosses: 0.14 // 14% system losses
};

function convertArea(area, fromUnit, toUnit) {
    return area * areaConversions[fromUnit] / areaConversions[toUnit];
}

function updateAreaDisplay(area) {
    const areaInput = document.getElementById('area');
    const areaUnit = document.getElementById('areaUnit').value;
    const convertedArea = convertArea(area, 'm2', areaUnit);
    areaInput.value = convertedArea.toFixed(2);
    console.log('Area updated:', { original: area, converted: convertedArea, unit: areaUnit });
}

function calculatePanelCapacity(area) {
    console.log('Calculating panel capacity for area:', area);
    
    const panelArea = parseFloat(document.getElementById('panelArea').value);
    console.log('Panel area:', panelArea);
    
    // Calculate effective area needed per panel (including spacing)
    const panelWidth = Math.sqrt(panelArea);
    const effectivePanelArea = Math.pow(panelWidth + panelConfig.spacing, 2);
    console.log('Effective panel area (with spacing):', effectivePanelArea);
    
    // Calculate maximum number of panels that can fit
    const maxPanels = Math.floor(area / effectivePanelArea);
    console.log('Maximum panels that can fit:', maxPanels);
    
    // Update the panel count input
    const panelCountInput = document.getElementById('panelCount');
    
    // Always set to maximum panels
    panelCountInput.value = maxPanels;
    panelCountInput.max = maxPanels;
    
    // Calculate total system capacity
    const totalArea = maxPanels * panelArea;
    const efficiency = parseFloat(document.getElementById('panelEfficiency').value) / 100;
    const systemLosses = parseFloat(document.getElementById('systemLosses').value) / 100;
    
    console.log('System parameters:', {
        totalArea,
        efficiency,
        systemLosses,
        maxPanels
    });
    
    // Update the peak power display
    const peakPower = totalArea * 1000 * efficiency * (1 - systemLosses); // Assuming 1000 W/m² peak sun
    document.getElementById('peakPower').textContent = `${(peakPower / 1000).toFixed(2)} kW`;
    
    return maxPanels;
}

// Constants for calculations
const CARBON_FACTORS = {
    SOLAR: 0.045,    // Solar PV lifecycle emissions
    COAL: 0.820,     // Coal power
    NATURAL_GAS: 0.490, // Natural gas
    NUCLEAR: 0.012   // Nuclear
};

const ENVIRONMENTAL_METRICS = {
    TREES_PER_TON_CO2: 45, // Number of trees needed to absorb 1 ton of CO2 per year
    CARS_OFFSET_PER_MWH: 0.15, // Cars taken off the road per MWh of solar
    HOMES_POWERED_PER_MW: 164 // Average homes powered per MW of solar
};

// API endpoints
const API_ENDPOINTS = {
    CARBON_INTENSITY: '/api/carbon-intensity',
    ENERGY_PRICES: '/api/energy-prices'
};

async function fetchCarbonIntensity(latitude, longitude) {
    try {
        const response = await fetch(`${API_ENDPOINTS.CARBON_INTENSITY}?lat=${latitude}&lon=${longitude}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch carbon intensity data');
        }
        
        const data = await response.json();
        return data.carbonIntensity; // gCO2eq/kWh
    } catch (error) {
        console.error('Error fetching carbon intensity:', error);
        // Fallback to average grid mix if API fails
        return 233; // gCO2eq/kWh (average grid mix)
    }
}

async function fetchEnergyPrices(region) {
    try {
        const response = await fetch(`${API_ENDPOINTS.ENERGY_PRICES}?region=${region}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch energy price data');
        }
        
        const data = await response.json();
        return data.price; // $/kWh
    } catch (error) {
        console.error('Error fetching energy prices:', error);
        // Fallback to average residential rate if API fails
        return 0.12; // $/kWh (average residential rate)
    }
}

function calculateFinancialImpact(annualEnergy, pricePerKWh) {
    const annualSavings = annualEnergy * pricePerKWh;
    const monthlySavings = annualSavings / 12;
    const lifetimeSavings = annualSavings * 25; // Assuming 25-year system lifetime
    
    return {
        annualSavings,
        monthlySavings,
        lifetimeSavings
    };
}

function createFinancialImpactCard(impact) {
    // Ensure all required values exist with defaults
    const safeImpact = {
        initialCost: impact?.initialCost || 0,
        annualSavings: impact?.annualSavings || 0,
        monthlySavings: impact?.monthlySavings || 0,
        paybackPeriod: impact?.paybackPeriod || 0,
        roi: impact?.roi || 0,
        netSavings: impact?.netSavings || 0,
        householdsPowered: impact?.householdsPowered || 0,
        powerBalance: impact?.powerBalance || '0%'
    };

    return `
        <div class="analysis-highlight-card analysis-cost-card">
            <div class="card-header"><span class="icon" aria-hidden="true">💰</span> Financial Analysis</div>
            <div class="impact-grid">
                <div class="impact-item" data-tooltip="Total system cost including installation">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M16 8v8l6 3.5"/>
                    </svg>
                    <div class="impact-value" id="initialCost">$${formatNumber(safeImpact.initialCost)}</div>
                    <div class="impact-label">Initial Investment</div>
                </div>
                <div class="impact-item" data-tooltip="Annual savings from solar generation">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M16 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                    <div class="impact-value" id="annualSavings">$${formatNumber(safeImpact.annualSavings)}</div>
                    <div class="impact-label">Annual Savings</div>
                </div>
                <div class="impact-item" data-tooltip="Monthly savings from solar generation">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M28 12h-2V8c0-1.1-.9-2-2-2h-4V4c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v2H8c-1.1 0-2 .9-2 2v4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V14c0-1.1-.9-2-2-2zM10 4h12v2H10V4zm16 22H6V14h20v12z"/>
                    </svg>
                    <div class="impact-value" id="monthlySavings">$${formatNumber(safeImpact.monthlySavings)}</div>
                    <div class="impact-label">Monthly Savings</div>
                </div>
                <div class="impact-item" data-tooltip="Time to recover initial investment">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M16 8v8l6 3.5"/>
                    </svg>
                    <div class="impact-value" id="paybackPeriod">${safeImpact.paybackPeriod.toFixed(1)}</div>
                    <div class="impact-label">Years to Payback</div>
                </div>
                <div class="impact-item" data-tooltip="Return on investment over 25 years">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M16 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                    <div class="impact-value" id="roi">${safeImpact.roi.toFixed(1)}%</div>
                    <div class="impact-label">25-Year ROI</div>
                </div>
                <div class="impact-item" data-tooltip="Total savings minus initial investment">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M16 8v8l6 3.5"/>
                    </svg>
                    <div class="impact-value" id="netSavings">$${formatNumber(safeImpact.netSavings)}</div>
                    <div class="impact-label">Net Savings (25 Years)</div>
                </div>
            </div>
            <div class="household-power">
                <h4 class="bx--type-productive-heading-01">Power Generation</h4>
                <div class="impact-grid">
                    <div class="impact-item" data-tooltip="Current system capacity in terms of households">
                        <svg class="impact-icon" viewBox="0 0 32 32">
                            <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                            <path d="M16 8v8l6 3.5"/>
                        </svg>
                        <div class="impact-value" id="householdsPowered">${safeImpact.householdsPowered}</div>
                        <div class="impact-label">System Capacity (Households)</div>
                    </div>
                    <div class="impact-item" data-tooltip="Additional grid power needed or excess power available">
                        <svg class="impact-icon" viewBox="0 0 32 32">
                            <path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                            <path d="M8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                            <path d="M16 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        </svg>
                        <div class="impact-value" id="powerBalance">${safeImpact.powerBalance}</div>
                        <div class="impact-label">Power Balance</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2
    }).format(num);
}

function createMonthlyChart(monthlyData) {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) {
        console.error('Chart canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2d context');
        return;
    }
    
    // Destroy existing chart if it exists
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Prepare data for the chart
    const months = monthlyData.map(d => new Date(2000, d.month - 1).toLocaleString('default', { month: 'short' }));
    const energy = monthlyData.map(d => d.energy);
    const carbonOffset = monthlyData.map(d => d.carbonOffset);
    
    // Create new chart with IBM Carbon styling
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Energy Production (kWh)',
                data: energy,
                backgroundColor: 'rgba(15, 98, 254, 0.5)',
                borderColor: 'rgba(15, 98, 254, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Carbon Offset (kg CO₂)',
                data: carbonOffset,
                type: 'line',
                borderColor: 'rgba(36, 161, 72, 1)',
                backgroundColor: 'rgba(36, 161, 72, 0.1)',
                fill: true,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Energy (kWh)',
                        color: '#525252'
                    },
                    grid: {
                        color: '#e0e0e0'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Carbon Offset (kg CO₂)',
                        color: '#525252'
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        color: '#e0e0e0'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Energy Production and Carbon Offset',
                    color: '#161616',
                    font: {
                        size: 16,
                        family: "'IBM Plex Sans', sans-serif"
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#161616',
                    bodyColor: '#525252',
                    borderColor: '#e0e0e0',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                label += formatNumber(context.raw) + ' kWh';
                            } else {
                                label += formatNumber(context.raw) + ' kg CO₂';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function createMonthlyTable(monthlyData) {
    const container = document.getElementById('dataAnalysis');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'monthly-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Month', 'Energy (kWh)', 'Peak Sun Hours', 'Efficiency'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    monthlyData.forEach(data => {
        const row = document.createElement('tr');
        
        // Month
        const monthCell = document.createElement('td');
        monthCell.textContent = new Date(2000, data.month - 1).toLocaleString('default', { month: 'long' });
        row.appendChild(monthCell);
        
        // Energy
        const energyCell = document.createElement('td');
        energyCell.textContent = data.energy.toFixed(2);
        row.appendChild(energyCell);
        
        // Peak Sun Hours
        const sunHoursCell = document.createElement('td');
        sunHoursCell.textContent = data.peakSunHours.toFixed(1);
        row.appendChild(sunHoursCell);
        
        // Efficiency
        const efficiencyCell = document.createElement('td');
        efficiencyCell.textContent = `${(data.efficiency).toFixed(1)}%`;
        row.appendChild(efficiencyCell);
        
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

function getEquivalentHouseholds(annualEnergy) {
    // Average annual household consumption in Ontario (kWh)
    const avgHouseholdConsumption = 9000; // kWh per year
    
    const households = annualEnergy / avgHouseholdConsumption;
    
    if (households < 1) {
        return `${households.toFixed(1)} households`;
    } else if (households < 10) {
        return `${Math.round(households)} households`;
    } else if (households < 10000) {
        return `${Math.round(households).toLocaleString()} households`;
    } else if (households < 100000) {
        return `a small town (${Math.round(households).toLocaleString()} households)`;
    } else if (households < 1000000) {
        return `a small city (${Math.round(households).toLocaleString()} households)`;
    } else {
        return `a major city (${Math.round(households).toLocaleString()} households)`;
    }
}

function calculateEnvironmentalImpact(annualEnergy, carbonIntensity) {
    // Calculate carbon offset (kg CO2)
    const carbonOffset = annualEnergy * carbonIntensity;
    
    // Calculate equivalent trees (assuming each tree absorbs 22 kg CO2 per year)
    const treesEquivalent = carbonOffset / 22;
    
    // Calculate cars offset (assuming average car emits 4.6 metric tons CO2 per year)
    const carsOffset = carbonOffset / 4600;
    
    return {
        carbonOffset,
        treesEquivalent,
        carsOffset
    };
}

function createEnvironmentalImpactCard(impact) {
    return `
        <div class="analysis-highlight-card analysis-carbon-card">
            <div class="card-header"><span class="icon" aria-hidden="true">🌱</span> Environmental Impact</div>
            <div class="impact-grid">
                <div class="impact-item" data-tooltip="Based on local grid carbon intensity">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M16 8v8l6 3.5"/>
                    </svg>
                    <div class="impact-value">${formatNumber(impact.carbonOffset)}</div>
                    <div class="impact-label">kg CO₂ offset annually</div>
                </div>
                <div class="impact-item" data-tooltip="Equivalent number of trees needed to absorb the same amount of CO₂">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M16 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                    <div class="impact-value">${formatNumber(impact.treesEquivalent)}</div>
                    <div class="impact-label">trees equivalent</div>
                </div>
                <div class="impact-item" data-tooltip="Equivalent number of cars taken off the road">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M28 12h-2V8c0-1.1-.9-2-2-2h-4V4c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v2H8c-1.1 0-2 .9-2 2v4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V14c0-1.1-.9-2-2-2zM10 4h12v2H10V4zm16 22H6V14h20v12z"/>
                    </svg>
                    <div class="impact-value">${formatNumber(impact.carsOffset)}</div>
                    <div class="impact-label">cars taken off the road</div>
                </div>
            </div>
        </div>
    `;
}

function calculateCostVsReward(annualEnergy, energyPrice, panelCount, panelArea) {
    // Average cost per watt for solar panels (2024 prices)
    const costPerWatt = 2.50; // $2.50 per watt
    
    // Calculate system size in watts
    const systemSize = panelCount * panelArea * 1000; // Convert m² to watts (assuming 1000 W/m²)
    
    // Calculate initial investment
    const initialCost = systemSize * costPerWatt;
    
    // Calculate annual savings
    const annualSavings = annualEnergy * energyPrice;
    
    // Calculate payback period (in years)
    const paybackPeriod = initialCost / annualSavings;
    
    // Calculate ROI over 25 years
    const lifetimeSavings = annualSavings * 25;
    const roi = ((lifetimeSavings - initialCost) / initialCost) * 100;
    
    // Calculate net savings over system lifetime
    const netSavings = lifetimeSavings - initialCost;
    
    // Calculate households powered
    const avgHouseholdConsumption = 9000; // kWh per year
    const maxHouseholds = Math.round(annualEnergy / avgHouseholdConsumption);
    
    // Calculate power balance (assuming 1 household target)
    const requiredEnergy = avgHouseholdConsumption;
    const powerBalance = annualEnergy - requiredEnergy;
    const powerBalancePercentage = (powerBalance / requiredEnergy) * 100;

    return {
        initialCost,
        annualSavings,
        paybackPeriod,
        roi,
        netSavings,
        systemSize,
        householdsPowered: maxHouseholds,
        powerBalance: powerBalance >= 0 ? `+${powerBalancePercentage.toFixed(1)}%` : `${powerBalancePercentage.toFixed(1)}%`
    };
}

function createCostVsRewardCard(analysis) {
    return `
        <div class="bx--tile cost-reward-analysis">
            <h3 class="bx--type-productive-heading-02">Cost vs. Reward Analysis</h3>
            
            <div class="cost-adjustment">
                <div class="bx--form-item">
                    <label for="costPerWatt" class="bx--label">Cost per Watt ($)</label>
                    <div class="cost-slider-container">
                        <input type="range" 
                               id="costPerWatt" 
                               class="bx--slider" 
                               min="1" 
                               max="5" 
                               step="0.1" 
                               value="${(analysis.initialCost / analysis.systemSize).toFixed(1)}"
                        >
                        <div class="cost-value">$${formatNumber(analysis.initialCost / analysis.systemSize)}/W</div>
                    </div>
                </div>

                <div class="bx--form-item">
                    <label for="targetHouseholds" class="bx--label">Target Households</label>
                    <div class="household-input-container">
                        <input type="number" 
                               id="targetHouseholds" 
                               class="bx--text-input" 
                               min="1" 
                               max="10" 
                               value="1"
                        >
                        <div class="bx--form__helper-text">Number of households to power</div>
                    </div>
                </div>

                <div class="bx--form-item">
                    <div class="bx--toggle">
                        <input type="checkbox" id="netMeteringAnalysis" class="bx--toggle__input">
                        <label for="netMeteringAnalysis" class="bx--toggle__label">
                            <span class="bx--toggle__text--left">Net Metering</span>
                            <span class="bx--toggle__appearance"></span>
                            <span class="bx--toggle__text--right">Enabled</span>
                        </label>
                    </div>
                    <div class="bx--form__helper-text">Enable to calculate savings including excess power sold back to the grid</div>
                </div>
            </div>

            <div class="impact-grid">
                <div class="impact-item" data-tooltip="Total system cost including installation">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M16 8v8l6 3.5"/>
                    </svg>
                    <div class="impact-value" id="initialCost">$${formatNumber(analysis.initialCost)}</div>
                    <div class="impact-label">Initial Investment</div>
                </div>
                <div class="impact-item" data-tooltip="Time to recover initial investment">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        <path d="M16 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                    <div class="impact-value" id="paybackPeriod">${analysis.paybackPeriod.toFixed(1)}</div>
                    <div class="impact-label">Years to Payback</div>
                </div>
                <div class="impact-item" data-tooltip="Return on investment over 25 years">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M28 12h-2V8c0-1.1-.9-2-2-2h-4V4c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v2H8c-1.1 0-2 .9-2 2v4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V14c0-1.1-.9-2-2-2zM10 4h12v2H10V4zm16 22H6V14h20v12z"/>
                    </svg>
                    <div class="impact-value" id="roi">${analysis.roi.toFixed(1)}%</div>
                    <div class="impact-label">25-Year ROI</div>
                </div>
                <div class="impact-item" data-tooltip="Total savings minus initial investment">
                    <svg class="impact-icon" viewBox="0 0 32 32">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M16 8v8l6 3.5"/>
                    </svg>
                    <div class="impact-value" id="netSavings">$${formatNumber(analysis.netSavings)}</div>
                    <div class="impact-label">Net Savings (25 Years)</div>
                </div>
            </div>

            <div class="household-power">
                <h4 class="bx--type-productive-heading-01">Power Generation</h4>
                <div class="impact-grid">
                    <div class="impact-item" data-tooltip="Current system capacity in terms of households">
                        <svg class="impact-icon" viewBox="0 0 32 32">
                            <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                            <path d="M16 8v8l6 3.5"/>
                        </svg>
                        <div class="impact-value" id="householdsPowered">${analysis.householdsPowered}</div>
                        <div class="impact-label">System Capacity (Households)</div>
                    </div>
                    <div class="impact-item" data-tooltip="Additional grid power needed or excess power available">
                        <svg class="impact-icon" viewBox="0 0 32 32">
                            <path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                            <path d="M8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                            <path d="M16 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        </svg>
                        <div class="impact-value" id="powerBalance">${analysis.powerBalance}</div>
                        <div class="impact-label">Power Balance</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initializeCostSlider(annualEnergy, energyPrice, systemSize) {
    const slider = document.getElementById('costPerWatt');
    // Use the config panel's net metering toggle for calculations
    const netMeteringToggle = document.getElementById('netMetering');
    const analysisToggle = document.getElementById('netMeteringAnalysis');
    const targetHouseholdsInput = document.getElementById('targetHouseholds');
    if (!slider || !netMeteringToggle || !analysisToggle || !targetHouseholdsInput) return;

    // Remove any existing event listeners
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    const newTargetHouseholds = targetHouseholdsInput.cloneNode(true);
    targetHouseholdsInput.parentNode.replaceChild(newTargetHouseholds, targetHouseholdsInput);

    // Average annual household consumption in Ontario (kWh)
    const avgHouseholdConsumption = 9000;
    const maxHouseholds = Math.round(annualEnergy / avgHouseholdConsumption);
    
    // Set max value for target households
    newTargetHouseholds.max = maxHouseholds;

    // Energy rates (Ontario 2024)
    const rates = {
        retail: energyPrice, // Retail rate for buying from grid
        feedIn: energyPrice * 0.7, // Feed-in tariff rate (70% of retail)
        peak: energyPrice * 1.2, // Peak rate (20% higher than retail)
        offPeak: energyPrice * 0.8 // Off-peak rate (20% lower than retail)
    };

    function updateCalculations() {
        try {
            const costPerWatt = parseFloat(newSlider.value);
            const targetHouseholds = parseInt(newTargetHouseholds.value);
            
            // Get panel configuration
            const panelCount = parseInt(document.getElementById('panelCount').value) || 0;
            const panelArea = parseFloat(document.getElementById('panelArea').value) || 0;
            const panelEfficiency = (parseFloat(document.getElementById('panelEfficiency').value) || 0) / 100;
            
            // Calculate system size in watts
            const systemSizeWatts = panelCount * panelArea * 1000 * panelEfficiency;
            const initialCost = systemSizeWatts * costPerWatt;
            
            // Calculate power balance
            const requiredEnergy = targetHouseholds * avgHouseholdConsumption;
            const powerBalance = annualEnergy - requiredEnergy;
            const powerBalancePercentage = (powerBalance / requiredEnergy) * 100;
            
            // Calculate annual savings and revenue
            let annualSavings = 0;
            let annualRevenue = 0;
            let gridPowerCost = 0;
            
            if (powerBalance >= 0) {
                // We have excess power
                annualSavings = requiredEnergy * rates.retail;
                
                if (netMeteringToggle.checked) {
                    const peakExcess = powerBalance * 0.6;
                    const offPeakExcess = powerBalance * 0.4;
                    annualRevenue = (peakExcess * rates.peak) + (offPeakExcess * rates.offPeak);
                }
            } else {
                // We need additional power
                annualSavings = annualEnergy * rates.retail;
                const peakDeficit = Math.abs(powerBalance) * 0.4;
                const offPeakDeficit = Math.abs(powerBalance) * 0.6;
                gridPowerCost = (peakDeficit * rates.peak) + (offPeakDeficit * rates.offPeak);
                netMeteringToggle.checked = false;
                analysisToggle.checked = false;
            }
            
            // Calculate total annual benefit
            const totalAnnualBenefit = annualSavings + annualRevenue - gridPowerCost;
            const monthlySavings = totalAnnualBenefit / 12;
            
            // Update financial metrics
            const paybackPeriod = totalAnnualBenefit > 0 ? initialCost / totalAnnualBenefit : 0;
            const lifetimeBenefit = totalAnnualBenefit * 25; // 25-year system lifetime
            const roi = initialCost > 0 ? ((lifetimeBenefit - initialCost) / initialCost) * 100 : 0;
            const netSavings = lifetimeBenefit - initialCost;

            // Update the financial metrics in the DOM
            document.getElementById('initialCost').textContent = `$${formatNumber(initialCost)}`;
            document.getElementById('annualSavings').textContent = `$${formatNumber(totalAnnualBenefit)}`;
            document.getElementById('monthlySavings').textContent = `$${formatNumber(monthlySavings)}`;
            document.getElementById('paybackPeriod').textContent = `${paybackPeriod.toFixed(1)}`;
            document.getElementById('roi').textContent = `${roi.toFixed(1)}%`;
            document.getElementById('netSavings').textContent = `$${formatNumber(netSavings)}`;
            document.getElementById('powerBalance').textContent = powerBalance >= 0 ? `+${powerBalancePercentage.toFixed(1)}%` : `${powerBalancePercentage.toFixed(1)}%`;

            // Update cost value display
            const costValue = document.querySelector('.cost-value');
            if (costValue) {
                costValue.textContent = `$${costPerWatt.toFixed(1)}/W`;
            }

            // Add animation class
            ['initialCost', 'annualSavings', 'monthlySavings', 'paybackPeriod', 'roi', 'netSavings', 'powerBalance'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('updated');
                    setTimeout(() => element.classList.remove('updated'), 300);
                }
            });
        } catch (error) {
            console.error('Error updating calculations:', error);
            const errorDiv = document.getElementById('error');
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = `
                    <div class="bx--inline-notification__text-wrapper">
                        <p class="bx--inline-notification__title">Calculation Error</p>
                        <p class="bx--inline-notification__subtitle">${error.message}</p>
                    </div>
                `;
            }
        }
    }

    // Add event listeners to the new elements
    newSlider.addEventListener('input', updateCalculations);
    newTargetHouseholds.addEventListener('change', updateCalculations);

    // Sync toggles
    syncNetMeteringToggles(updateCalculations);

    // Initial calculation
    updateCalculations();
}

function syncNetMeteringToggles(updateCalculations) {
    const configToggle = document.getElementById('netMetering');
    const analysisToggle = document.getElementById('netMeteringAnalysis');
    if (!configToggle || !analysisToggle) return;
    // Set the analysis toggle to match the config toggle on render
    analysisToggle.checked = configToggle.checked;
    // When either is changed, update the other and recalculate
    analysisToggle.addEventListener('change', () => {
        configToggle.checked = analysisToggle.checked;
        if (typeof updateCalculations === 'function') updateCalculations();
    });
    configToggle.addEventListener('change', () => {
        analysisToggle.checked = configToggle.checked;
        if (typeof updateCalculations === 'function') updateCalculations();
    });
}

function clearResults() {
    // Clear all result displays
    document.getElementById('annualEnergy').textContent = '-';
    document.getElementById('peakPower').textContent = '-';
    document.getElementById('efficiencyFactor').textContent = '-';
    document.getElementById('carbonOffset').textContent = '-';
    
    // Remove all result cards
    const resultsSection = document.getElementById('resultsSection');
    const cards = resultsSection.querySelectorAll('.bx--tile:not(.results-summary)');
    cards.forEach(card => card.remove());
    
    // Clear the monthly chart
    if (monthlyChart) {
        monthlyChart.destroy();
        monthlyChart = null;
    }
    
    // Clear the data analysis section
    const dataAnalysis = document.getElementById('dataAnalysis');
    if (dataAnalysis) {
        dataAnalysis.innerHTML = '';
    }
}

function showResults(annualEnergy, peakPower, efficiencyFactor, impact, financialImpact, costAnalysis) {
    // Update summary metrics
    document.getElementById('annualEnergy').textContent = `${formatNumber(annualEnergy)} kWh`;
    document.getElementById('peakPower').textContent = `${(peakPower / 1000).toFixed(2)} kW`;
    document.getElementById('efficiencyFactor').textContent = `${efficiencyFactor.toFixed(1)}%`;
    document.getElementById('carbonOffset').textContent = `${formatNumber(impact.carbonOffset)} kg CO₂`;

    // Add environmental impact card to analysis section
    const impactCard = createEnvironmentalImpactCard(impact);
    const analysisCarbon = document.getElementById('analysisCarbon');
    if (analysisCarbon) {
        analysisCarbon.innerHTML = impactCard;
    }

    // Add financial impact card to analysis section
    const financialCard = createFinancialImpactCard(financialImpact);
    const analysisCost = document.getElementById('analysisCost');
    if (analysisCost) {
        analysisCost.innerHTML = financialCard;
    }

    // Initialize cost slider
    initializeCostSlider(annualEnergy, financialImpact.energyPrice, costAnalysis.systemSize);

    // Add equivalent households powered
    const householdsPowered = getEquivalentHouseholds(annualEnergy);
    const summaryItem = document.createElement('div');
    summaryItem.className = 'summary-item';
    summaryItem.innerHTML = `
        <span class="label">Equivalent Power</span>
        <span class="value">Could power ${householdsPowered}</span>
    `;
    const simSummaryHeader = document.querySelector('.sim-summary-header');
    if (simSummaryHeader) simSummaryHeader.appendChild(summaryItem);
}

async function simulateEnergyProduction() {
    const layers = drawnItems.getLayers();
    if (layers.length === 0) {
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <div class="bx--inline-notification__text-wrapper">
                <p class="bx--inline-notification__title">No Area Selected</p>
                <p class="bx--inline-notification__subtitle">Please draw an area on the map first to calculate solar potential.</p>
            </div>
        `;
        return;
    }

    // Clear previous results
    clearResults();

    // Show loading state
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    try {
        // Get coordinates
        const bounds = layers[0].getBounds();
        const center = bounds.getCenter();
        const { lat, lng } = center;

        // Fetch all required data
        const [radiationData, carbonIntensity, energyPrice] = await Promise.all([
            fetch('/api/radiation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            }).then(res => res.json()),
            fetchCarbonIntensity(lat, lng),
            fetchEnergyPrices(getRegionFromCoordinates(lat, lng))
        ]);

        // Log raw API response
        console.log('Raw PVGIS API Response:', radiationData);
        console.log('Carbon Intensity:', carbonIntensity);
        console.log('Energy Price:', energyPrice);

        if (!radiationData.outputs || !radiationData.outputs.monthly) {
            throw new Error('Invalid radiation data received from API');
        }

        const area = L.GeometryUtil.geodesicArea(layers[0].getLatLngs()[0]);
        const panelCount = parseInt(document.getElementById('panelCount').value);
        const panelArea = parseFloat(document.getElementById('panelArea').value);
        const baseEfficiency = parseFloat(document.getElementById('panelEfficiency').value) / 100;
        const systemLosses = parseFloat(document.getElementById('systemLosses').value) / 100;
        
        // Calculate total system area
        const totalArea = panelCount * panelArea;
        
        // Group monthly data by month to calculate averages
        const monthlyAverages = {};
        radiationData.outputs.monthly.forEach(data => {
            if (!monthlyAverages[data.month]) {
                monthlyAverages[data.month] = {
                    H_i_m: [], // Selected angle irradiation
                    H_i_opt_m: [], // Optimal angle irradiation
                    H_h_m: [], // Horizontal irradiation
                    T2m: []
                };
            }
            
            // Add data points for averaging
            if (data['H(i)_m']) monthlyAverages[data.month].H_i_m.push(data['H(i)_m']);
            if (data['H(i_opt)_m']) monthlyAverages[data.month].H_i_opt_m.push(data['H(i_opt)_m']);
            if (data['H(h)_m']) monthlyAverages[data.month].H_h_m.push(data['H(h)_m']);
            if (data.T2m) monthlyAverages[data.month].T2m.push(data.T2m);
        });

        // Log the grouped data
        console.log('Grouped Monthly Data:', monthlyAverages);
        
        // Calculate averages for each month
        const monthlyData = Object.entries(monthlyAverages).map(([month, data]) => {
            // Calculate averages for each metric
            const avgIrradiation = data.H_i_m.length > 0 ? 
                data.H_i_m.reduce((a, b) => a + b, 0) / data.H_i_m.length :
                (data.H_i_opt_m.length > 0 ? 
                    data.H_i_opt_m.reduce((a, b) => a + b, 0) / data.H_i_opt_m.length :
                    data.H_h_m.reduce((a, b) => a + b, 0) / data.H_h_m.length);
            
            const avgTemperature = data.T2m.reduce((a, b) => a + b, 0) / data.T2m.length;
            
            // Calculate monthly efficiency factor considering temperature effects
            const tempFactor = 1 - (0.004 * (avgTemperature - 25)); // Temperature coefficient of -0.4% per °C
            const monthlyEfficiency = baseEfficiency * tempFactor * (1 - systemLosses);
            
            // Calculate monthly energy production
            const monthlyEnergy = totalArea * avgIrradiation * monthlyEfficiency;
            
            // Convert monthly irradiation to daily average peak sun hours
            const daysInMonth = new Date(2000, parseInt(month), 0).getDate();
            const dailyPeakSunHours = avgIrradiation / daysInMonth;
            
            return {
                month: parseInt(month),
                energy: monthlyEnergy,
                peakSunHours: dailyPeakSunHours, // Now in hours per day
                efficiency: monthlyEfficiency * 100, // Convert to percentage
                temperature: avgTemperature,
                irradiation: avgIrradiation
            };
        }).sort((a, b) => a.month - b.month); // Sort by month

        // Log the final calculated monthly data
        console.log('Final Monthly Averages:', monthlyData);
        
        // Calculate peak power using average efficiency
        const avgEfficiency = monthlyData.reduce((sum, month) => sum + month.efficiency, 0) / 12 / 100;
        const peakPower = totalArea * 1000 * avgEfficiency; // W/m² * m² * efficiency
        
        // Create chart and table
        createMonthlyChart(monthlyData);
        createMonthlyTable(monthlyData);
        
        // Calculate and display annual total
        const annualEnergy = monthlyData.reduce((sum, month) => sum + month.energy, 0);
        
        // Calculate and display efficiency factor
        const avgIrradiation = monthlyData.reduce((sum, month) => sum + month.irradiation, 0) / 12;
        const avgPeakSunHours = monthlyData.reduce((sum, month) => sum + month.peakSunHours, 0) / 12;
        
        // Calculate theoretical maximum based on actual peak sun hours
        const stcIrradiance = 1000; // W/m²
        const stcEfficiency = baseEfficiency;
        const theoreticalMax = totalArea * stcIrradiance * avgPeakSunHours * 365 * stcEfficiency;
        const efficiencyFactor = (annualEnergy / theoreticalMax) * 100;

        // Log final calculations
        console.log('Final Calculations:', {
            annualEnergy,
            peakPower,
            efficiencyFactor,
            avgEfficiency,
            avgIrradiation,
            theoreticalMax,
            avgPeakSunHours,
            stcEfficiency: stcEfficiency * 100,
            monthlyEfficiencies: monthlyData.map(m => ({
                month: m.month,
                efficiency: m.efficiency,
                peakSunHours: m.peakSunHours
            }))
        });

        // Calculate environmental impact with real-time carbon intensity
        // Ontario's grid is ~94% carbon-free, with emissions of ~30-40 g CO₂/kWh
        const ontarioCarbonIntensity = 0.04; // kg CO₂/kWh
        const impact = calculateEnvironmentalImpact(annualEnergy, ontarioCarbonIntensity);
        
        // Calculate financial impact with real-time energy prices
        const financialImpact = calculateFinancialImpact(annualEnergy, energyPrice);
        
        // Calculate cost analysis
        const costAnalysis = calculateCostVsReward(annualEnergy, energyPrice, panelCount, panelArea);
        
        // Show results
        showResults(annualEnergy, peakPower, efficiencyFactor, impact, financialImpact, costAnalysis);
        
        // Hide loading state
        loading.style.display = 'none';
    } catch (error) {
        console.error('Simulation error:', error);
        loading.style.display = 'none';
        
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <div class="bx--inline-notification__text-wrapper">
                <p class="bx--inline-notification__title">Simulation Error</p>
                <p class="bx--inline-notification__subtitle">${error.message}</p>
            </div>
        `;
    }
}

function initMap() {
    // Create the map centered on a default location (e.g., center of Europe)
    map = L.map('map', {
        center: [48.8566, 2.3522],
        zoom: 4,
        zoomControl: true
    });

    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize the FeatureGroup to store editable layers
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e4e8',
                    message: '<strong>Error:</strong> polygon edges cannot intersect!'
                },
                shapeOptions: {
                    color: '#2c3e50'
                }
            },
            circle: false,
            rectangle: false,
            polyline: false,
            circlemarker: false,
            marker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    map.addControl(drawControl);

    // Show loading state
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    // Try to get user's location automatically
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const { latitude, longitude } = position.coords;
                
                // Update form fields
                document.getElementById('latitude').value = latitude.toFixed(6);
                document.getElementById('longitude').value = longitude.toFixed(6);
                
                // Update or create user location marker
                if (userLocationMarker) {
                    userLocationMarker.setLatLng([latitude, longitude]);
                } else {
                    userLocationMarker = L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '📍',
                            iconSize: [24, 24]
                        })
                    }).addTo(map);
                }
                
                // Center map on user location with a smooth animation
                map.setView([latitude, longitude], 13, {
                    animate: true,
                    duration: 1
                });
                
                // Hide loading state
                loading.style.display = 'none';
            },
            function(error) {
                console.error('Error getting location:', error);
                // Hide loading state
                loading.style.display = 'none';
                // Show error notification
                const errorDiv = document.getElementById('error');
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = `
                    <div class="bx--inline-notification__text-wrapper">
                        <p class="bx--inline-notification__title">Location Error</p>
                        <p class="bx--inline-notification__subtitle">Unable to get your location. Please check your browser settings or use the map to select a location manually.</p>
                    </div>
                `;
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        // Hide loading state
        loading.style.display = 'none';
        // Show error notification
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <div class="bx--inline-notification__text-wrapper">
                <p class="bx--inline-notification__title">Location Not Supported</p>
                <p class="bx--inline-notification__subtitle">Geolocation is not supported by your browser. Please use the map to select a location manually.</p>
            </div>
        `;
    }

    // Handle draw events
    map.on('draw:created', function(e) {
        console.log('Draw event triggered');
        const layer = e.layer;
        
        // Clear any existing layers
        drawnItems.clearLayers();
        
        // Add the new layer
        drawnItems.addLayer(layer);
        
        // Get the bounds of the drawn polygon
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        
        // Calculate area in square meters
        const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        console.log('Drawn area:', area);
        
        // Update the form fields with the center coordinates and area
        document.getElementById('latitude').value = center.lat.toFixed(6);
        document.getElementById('longitude').value = center.lng.toFixed(6);
        updateAreaDisplay(area);
        
        // Calculate and update panel capacity
        calculatePanelCapacity(area);
        
        // Update or create marker at the center
        if (marker) {
            marker.setLatLng(center);
        } else {
            marker = L.marker(center).addTo(map);
        }
    });

    // Handle panel configuration changes
    ['panelArea', 'panelEfficiency', 'systemLosses'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            console.log('Panel configuration changed:', id);
            const layers = drawnItems.getLayers();
            if (layers.length > 0) {
                const area = L.GeometryUtil.geodesicArea(layers[0].getLatLngs()[0]);
                calculatePanelCapacity(area);
            }
        });
    });

    // Handle area unit changes
    document.getElementById('areaUnit').addEventListener('change', function() {
        console.log('Area unit changed');
        const layers = drawnItems.getLayers();
        if (layers.length > 0) {
            const area = L.GeometryUtil.geodesicArea(layers[0].getLatLngs()[0]);
            updateAreaDisplay(area);
            calculatePanelCapacity(area);
        }
    });

 

    // Add event listener for panel count changes
    document.getElementById('panelCount').addEventListener('change', function() {
        const layers = drawnItems.getLayers();
        if (layers.length > 0) {
            const area = L.GeometryUtil.geodesicArea(layers[0].getLatLngs()[0]);
            calculatePanelCapacity(area);
        }
    });

    // Add click handler to the map
    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        
        // Update the form fields
        document.getElementById('latitude').value = lat.toFixed(6);
        document.getElementById('longitude').value = lng.toFixed(6);
        
        // Update or create marker
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }
    });

    // Handle map resize
    function resizeMap() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.height = '600px';
            map.invalidateSize();
        }
    }

    // Initial resize
    resizeMap();

    // Resize on window resize
    window.addEventListener('resize', resizeMap);

    // Add simulate button handler
    document.getElementById('simulateButton').addEventListener('click', function() {
        // Show loader
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';

        // Switch to simulation data view
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        const simSection = document.getElementById('simulationDataSection');
        if (simSection) simSection.classList.add('active');
        document.querySelectorAll('.nav-link').forEach(navLink => {
            navLink.classList.remove('active');
        });
        const simNav = document.querySelector('.nav-link[href="#simulationDataSection"]');
        if (simNav) simNav.classList.add('active');

        // Run simulation (async)
        simulateEnergyProduction();
    });
}

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Ensure mapConfigSection is visible
    const mapSection = document.getElementById('mapConfigSection');
    if (mapSection && !mapSection.classList.contains('active')) {
        mapSection.classList.add('active');
        console.log('Added active class to #mapConfigSection');
    }

    // Wait for Leaflet to be loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded');
        return;
    }
    
    // Initialize the map
    console.log('Initializing map...');
    initMap();
    
    // Add event listeners for navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            // Show target section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                // If showing the map section, invalidate map size
                if (targetId === 'mapConfigSection' && window.map && typeof window.map.invalidateSize === 'function') {
                    setTimeout(() => {
                        window.map.invalidateSize();
                        console.log('Called map.invalidateSize() after showing map section');
                    }, 100);
                }
            }
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Add coordinates form event listener
    const coordinatesForm = document.getElementById('coordinatesForm');
    if (coordinatesForm) {
        coordinatesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const latitude = document.getElementById('latitude').value;
            const longitude = document.getElementById('longitude').value;
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const dataAnalysis = document.getElementById('dataAnalysis');

            // Clear previous results and errors
            error.textContent = '';
            error.className = 'error';
            dataAnalysis.innerHTML = '';
            loading.style.display = 'block';

            try {
                const response = await fetch('/api/radiation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ latitude, longitude })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch radiation data');
                }

                if (data.outputs && data.outputs.monthly) {
                    const analysis = analyzeMonthlyData(data.outputs.monthly);
                    createAnalysisTables(analysis);
                } else {
                    throw new Error('No monthly data available in the response');
                }
            } catch (err) {
                console.error('Error details:', err);
                error.innerHTML = `
                    <strong>Error:</strong> ${err.message}
                    ${err.details ? `<div class="error-details">${JSON.stringify(err.details)}</div>` : ''}
                `;
            } finally {
                loading.style.display = 'none';
            }
        });
    }

    // Add export button handler
    const exportButton = document.getElementById('exportData');
    if (exportButton) {
        exportButton.addEventListener('click', exportTablesToCSV);
    }

    // Add export button to the simulation data section
    addExportButton();
});

// Group data by month and calculate statistics
function analyzeMonthlyData(monthlyData) {
    const months = {};
    
    // Initialize month objects
    for (let i = 1; i <= 12; i++) {
        months[i] = {
            'H(h)_m': [],
            'H(i_opt)_m': [],
            'H(i)_m': [],
            'H_d': [],
            'Kd': [],
            'T2m': []
        };
    }
    
    // Group data by month
    monthlyData.forEach(entry => {
        const month = entry.month;
        Object.keys(months[month]).forEach(key => {
            if (entry[key] !== undefined) {
                months[month][key].push(entry[key]);
            }
        });
    });
    
    // Calculate statistics for each month and metric
    const analysis = {};
    Object.keys(months).forEach(month => {
        analysis[month] = {};
        Object.keys(months[month]).forEach(metric => {
            const stats = calculateStats(months[month][metric]);
            if (stats) {
                analysis[month][metric] = stats;
            }
        });
    });
    
    return analysis;
}

// Create HTML for the analysis tables
function createAnalysisTables(analysis) {
    const container = document.getElementById('dataAnalysis');
    container.innerHTML = '';
    
    const metrics = {
        'H(h)_m': 'Horizontal Irradiation (kWh/m²)',
        'H(i_opt)_m': 'Optimal Angle Irradiation (kWh/m²)',
        'H(i)_m': 'Selected Angle Irradiation (kWh/m²)',
        'H_d': 'Direct Normal Irradiation (kWh/m²)',
        'Kd': 'Diffuse to Global Ratio',
        'T2m': 'Average Temperature (°C)'
    };
    
    Object.keys(analysis).sort((a, b) => a - b).forEach(month => {
        const monthData = analysis[month];
        const monthName = new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
        
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-section';
        
        const header = document.createElement('h2');
        header.className = 'month-header';
        header.textContent = monthName;
        monthDiv.appendChild(header);
        
        const table = document.createElement('table');
        table.className = 'month-table';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Metric', 'Minimum', 'Maximum', 'Average', 'Median'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        Object.keys(metrics).forEach(metric => {
            if (monthData[metric]) {
                const row = document.createElement('tr');
                
                // Metric name
                const metricCell = document.createElement('td');
                metricCell.textContent = metrics[metric];
                row.appendChild(metricCell);
                
                // Statistics
                ['min', 'max', 'avg', 'median'].forEach(stat => {
                    const cell = document.createElement('td');
                    const value = monthData[metric][stat];
                    cell.innerHTML = `
                        <span class="stat-value">${value.toFixed(2)}</span>
                        <span class="stat-label">${stat}</span>
                    `;
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            }
        });
        table.appendChild(tbody);
        monthDiv.appendChild(table);
        container.appendChild(monthDiv);
    });
}

// Example coordinates click handler
function setCoordinates(lat, lon) {
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lon;
}

function getRegionFromCoordinates(lat, lng) {
    // This is a simplified version - you might want to use a proper geocoding service
    // or a more sophisticated region mapping
    const regions = {
        'CA': { lat: [48.0, 60.0], lng: [-140.0, -50.0] },
        'US': { lat: [24.0, 50.0], lng: [-125.0, -65.0] },
        'EU': { lat: [35.0, 60.0], lng: [-10.0, 40.0] }
    };

    for (const [region, bounds] of Object.entries(regions)) {
        if (lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
            lng >= bounds.lng[0] && lng <= bounds.lng[1]) {
            return region;
        }
    }

    return 'US'; // Default to US if no region matches
}

function exportTablesToCSV() {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <div class="bx--inline-notification__text-wrapper">
                <p class="bx--inline-notification__title">Export Error</p>
                <p class="bx--inline-notification__subtitle">JSZip library not loaded. Please refresh the page and try again.</p>
            </div>
        `;
        return;
    }

    try {
        // Create a zip file containing all CSV files
        const zip = new JSZip();

        // Export location data
        const locationData = {
            'Latitude': document.getElementById('latitude').value,
            'Longitude': document.getElementById('longitude').value,
            'Area': document.getElementById('area').value + ' ' + document.getElementById('areaUnit').value
        };
        const locationCSV = Object.entries(locationData)
            .map(([key, value]) => `${key},${value}`)
            .join('\n');
        zip.file('Location.csv', locationCSV);

        // Export panel configuration
        const panelConfig = {
            'Panel Efficiency (%)': document.getElementById('panelEfficiency').value,
            'Panel Area (m²)': document.getElementById('panelArea').value,
            'Number of Panels': document.getElementById('panelCount').value,
            'Tilt Angle (degrees)': document.getElementById('tiltAngle').value,
            'Azimuth Angle (degrees)': document.getElementById('azimuthAngle').value,
            'System Losses (%)': document.getElementById('systemLosses').value
        };
        const panelConfigCSV = Object.entries(panelConfig)
            .map(([key, value]) => `${key},${value}`)
            .join('\n');
        zip.file('Panel_Configuration.csv', panelConfigCSV);

        // Export summary metrics
        const summaryData = {
            'Annual Energy Production': document.getElementById('annualEnergy').textContent,
            'Peak Power': document.getElementById('peakPower').textContent,
            'Efficiency Factor': document.getElementById('efficiencyFactor').textContent,
            'Carbon Offset': document.getElementById('carbonOffset').textContent
        };
        const summaryCSV = Object.entries(summaryData)
            .map(([key, value]) => `${key},${value}`)
            .join('\n');
        zip.file('Summary_Metrics.csv', summaryCSV);

        // Export financial analysis
        const financialData = {
            'Initial Cost': document.getElementById('initialCost').textContent,
            'Annual Savings': document.getElementById('annualSavings').textContent,
            'Monthly Savings': document.getElementById('monthlySavings').textContent,
            'Payback Period (years)': document.getElementById('paybackPeriod').textContent,
            '25-Year ROI': document.getElementById('roi').textContent,
            'Net Savings (25 Years)': document.getElementById('netSavings').textContent,
            'System Capacity (Households)': document.getElementById('householdsPowered').textContent,
            'Power Balance': document.getElementById('powerBalance').textContent,
            'Cost per Watt': document.querySelector('.cost-value').textContent,
            'Net Metering': document.getElementById('netMeteringAnalysis').checked ? 'Enabled' : 'Disabled',
            'Target Households': document.getElementById('targetHouseholds').value
        };
        const financialCSV = Object.entries(financialData)
            .map(([key, value]) => `${key},${value}`)
            .join('\n');
        zip.file('Financial_Analysis.csv', financialCSV);

        // Export monthly data tables
        const tables = document.querySelectorAll('.data-analysis table');
        tables.forEach((table, index) => {
            const monthName = table.closest('.month-section')?.querySelector('.month-header')?.textContent || `Table_${index + 1}`;
            const csvContent = tableToCSV(table);
            zip.file(`Monthly_Data_${monthName}.csv`, csvContent);
        });

        // Add a README file with export information
        const readmeContent = `Solar Energy Simulation Export
Generated on: ${new Date().toLocaleString()}

This export contains the following files:
1. Location.csv - Location coordinates and area
2. Panel_Configuration.csv - Solar panel setup details
3. Summary_Metrics.csv - Key performance metrics
4. Financial_Analysis.csv - Financial calculations and projections
5. Monthly_Data_*.csv - Detailed monthly performance data

Note: All financial calculations are based on current energy rates and assume a 25-year system lifetime.`;
        zip.file('README.txt', readmeContent);

        // Generate and download the zip file
        zip.generateAsync({type: 'blob'})
            .then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'solar_simulation_export.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(function(error) {
                console.error('Error generating zip file:', error);
                const errorDiv = document.getElementById('error');
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = `
                    <div class="bx--inline-notification__text-wrapper">
                        <p class="bx--inline-notification__title">Export Error</p>
                        <p class="bx--inline-notification__subtitle">Failed to generate zip file. Please try again.</p>
                    </div>
                `;
            });
    } catch (error) {
        console.error('Error in export:', error);
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <div class="bx--inline-notification__text-wrapper">
                <p class="bx--inline-notification__title">Export Error</p>
                <p class="bx--inline-notification__subtitle">${error.message}</p>
            </div>
        `;
    }
}

function tableToCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
            // Get the text content, handling nested elements
            const text = cell.textContent.trim();
            // Escape quotes and wrap in quotes if contains comma or quote
            return text.includes(',') || text.includes('"') 
                ? `"${text.replace(/"/g, '""')}"` 
                : text;
        }).join(',');
    }).join('\n');
}

function exportAllDataToCSV() {
    try {
        // Get configuration data
        const configData = {
            'Location': {
                'Latitude': document.getElementById('latitude').value,
                'Longitude': document.getElementById('longitude').value,
                'Area': document.getElementById('area').value + ' ' + document.getElementById('areaUnit').value
            },
            'Panel Configuration': {
                'Panel Efficiency (%)': document.getElementById('panelEfficiency').value,
                'Panel Area (m²)': document.getElementById('panelArea').value,
                'Number of Panels': document.getElementById('panelCount').value,
                'Tilt Angle (degrees)': document.getElementById('tiltAngle').value,
                'Azimuth Angle (degrees)': document.getElementById('azimuthAngle').value,
                'System Losses (%)': document.getElementById('systemLosses').value,
                'Net Metering': document.getElementById('netMetering').checked ? 'Enabled' : 'Disabled'
            }
        };

        // Get summary metrics
        const summaryData = {
            'Annual Energy (kWh)': document.getElementById('annualEnergy').textContent,
            'Peak Power (kW)': document.getElementById('peakPower').textContent,
            'Efficiency Factor (%)': document.getElementById('efficiencyFactor').textContent,
            'Carbon Offset (kg CO₂)': document.getElementById('carbonOffset').textContent
        };

        // Get financial data from all financial cards
        const financialData = {};
        
        // Get data from financial impact card
        const financialImpactCard = document.querySelector('.analysis-cost-card');
        if (financialImpactCard) {
            const impactItems = financialImpactCard.querySelectorAll('.impact-item');
            impactItems.forEach(item => {
                const label = item.querySelector('.impact-label').textContent.trim();
                const value = item.querySelector('.impact-value').textContent.trim();
                financialData[label] = value;
            });
        }

        // Get data from cost vs reward analysis
        const costRewardCard = document.querySelector('.cost-reward-analysis');
        if (costRewardCard) {
            const impactItems = costRewardCard.querySelectorAll('.impact-item');
            impactItems.forEach(item => {
                const label = item.querySelector('.impact-label').textContent.trim();
                const value = item.querySelector('.impact-value').textContent.trim();
                financialData[label] = value;
            });
        }

        // Get additional financial settings
        const costPerWatt = document.querySelector('.cost-value')?.textContent.trim();
        if (costPerWatt) {
            financialData['Cost per Watt'] = costPerWatt;
        }
        
        const targetHouseholds = document.getElementById('targetHouseholds')?.value;
        if (targetHouseholds) {
            financialData['Target Households'] = targetHouseholds;
        }

        const netMeteringAnalysis = document.getElementById('netMeteringAnalysis')?.checked;
        if (netMeteringAnalysis !== undefined) {
            financialData['Net Metering Analysis'] = netMeteringAnalysis ? 'Enabled' : 'Disabled';
        }

        // Get monthly data from the table
        const monthlyTable = document.querySelector('.monthly-table');
        const monthlyData = [];
        if (monthlyTable) {
            const rows = monthlyTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                monthlyData.push({
                    'Month': cells[0].textContent,
                    'Energy (kWh)': cells[1].textContent,
                    'Peak Sun Hours': cells[2].textContent,
                    'Efficiency (%)': cells[3].textContent
                });
            });
        }

        // Combine all data into sections
        const allData = [
            ['Configuration Data'],
            ['Category', 'Parameter', 'Value'],
            ...Object.entries(configData).flatMap(([category, data]) => 
                Object.entries(data).map(([param, value]) => [category, param, value])
            ),
            [],
            ['Summary Metrics'],
            ['Parameter', 'Value'],
            ...Object.entries(summaryData).map(([param, value]) => [param, value]),
            [],
            ['Financial Analysis'],
            ['Parameter', 'Value'],
            ...Object.entries(financialData).map(([param, value]) => [param, value]),
            [],
            ['Monthly Performance Data'],
            ['Month', 'Energy (kWh)', 'Peak Sun Hours', 'Efficiency (%)'],
            ...monthlyData.map(data => [
                data['Month'],
                data['Energy (kWh)'],
                data['Peak Sun Hours'],
                data['Efficiency (%)']
            ])
        ];

        // Convert to CSV
        const csvContent = allData.map(row => row.map(cell => 
            cell.includes(',') ? `"${cell}"` : cell
        ).join(',')).join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'solar_simulation_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting data:', error);
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <div class="bx--inline-notification__text-wrapper">
                <p class="bx--inline-notification__title">Export Error</p>
                <p class="bx--inline-notification__subtitle">${error.message}</p>
            </div>
        `;
    }
}

// Add export button to the simulation data section
function addExportButton() {
    const simSection = document.getElementById('simulationDataSection');
    if (!simSection) return;

    const exportButton = document.createElement('button');
    exportButton.className = 'btn btn-secondary';
    exportButton.innerHTML = `
        <svg class="btn-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm.5-9H7v4l3.2 1.9.8-1.3-2.5-1.5V5z"/>
        </svg>
        Export Data
    `;
    exportButton.addEventListener('click', exportAllDataToCSV);

    // Add button to the top of the simulation data section
    const firstCard = simSection.querySelector('.sim-card');
    if (firstCard) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'export-button-container';
        buttonContainer.appendChild(exportButton);
        firstCard.insertBefore(buttonContainer, firstCard.firstChild);
    }
}