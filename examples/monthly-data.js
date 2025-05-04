const PVGIS = require('../src/index');

async function main() {
    const pvgis = new PVGIS();

    // Example coordinates (New York City)
    const lat = 40.7128;
    const lon = -74.0060;

    try {
        // Get monthly radiation data with all available options
        const data = await pvgis.getMonthlyRadiation(lat, lon, {
            horirrad: true,    // Get horizontal plane irradiation
            optrad: true,      // Get optimal angle irradiation
            selectrad: true,   // Get selected angle irradiation
            angle: 30,         // 30 degrees inclination
            mr_dni: true,      // Get direct normal irradiation
            d2g: true,         // Get diffuse to global ratio
            avtemp: true       // Get average temperatures
        });

        // Print the results in a formatted way
        console.log('Monthly Radiation Data for New York City:');
        console.log('=========================================');
        
        if (data.outputs && data.outputs.monthly) {
            data.outputs.monthly.forEach(month => {
                console.log(`\nMonth: ${month.month}`);
                console.log('----------------------------------------');
                
                if (month.H_h) {
                    console.log(`Horizontal irradiation: ${month.H_h.toFixed(2)} kWh/m²`);
                }
                if (month.H_i_opt) {
                    console.log(`Optimal angle irradiation: ${month.H_i_opt.toFixed(2)} kWh/m²`);
                }
                if (month.H_i_sel) {
                    console.log(`Selected angle irradiation: ${month.H_i_sel.toFixed(2)} kWh/m²`);
                }
                if (month.H_d) {
                    console.log(`Direct normal irradiation: ${month.H_d.toFixed(2)} kWh/m²`);
                }
                if (month.Kd) {
                    console.log(`Diffuse to global ratio: ${month.Kd.toFixed(2)}`);
                }
                if (month.T2m) {
                    console.log(`Average temperature: ${month.T2m.toFixed(1)}°C`);
                }
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main(); 