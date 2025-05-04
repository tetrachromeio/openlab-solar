const axios = require('axios');

class PVGIS {
    constructor() {
        this.baseUrl = 'https://re.jrc.ec.europa.eu/api/v5_3';
    }

    /**
     * Get monthly radiation data for a specific location
     * @param {number} lat - Latitude in decimal degrees (south is negative)
     * @param {number} lon - Longitude in decimal degrees (west is negative)
     * @param {Object} options - Additional options
     * @param {boolean} [options.horirrad=true] - Output horizontal plane irradiation
     * @param {boolean} [options.optrad=false] - Output annual optimal angle plane irradiation
     * @param {boolean} [options.selectrad=false] - Output irradiation on plane of selected inclination
     * @param {number} [options.angle=0] - Inclination angle for selected inclination irradiation
     * @param {boolean} [options.mr_dni=false] - Output direct normal irradiation
     * @param {boolean} [options.d2g=false] - Output monthly values of diffuse to global radiation ratio
     * @param {boolean} [options.avtemp=false] - Output monthly average values of daily temperature
     * @returns {Promise<Object>} Monthly radiation data
     */
    async getMonthlyRadiation(lat, lon, options = {}) {
        const defaultOptions = {
            horirrad: 1,
            optrad: 0,
            selectrad: 0,
            angle: 0,
            mr_dni: 0,
            d2g: 0,
            avtemp: 0,
            outputformat: 'json'
        };

        // Convert boolean options to integers (0 or 1) as required by the API
        const params = {
            lat: lat.toString(),
            lon: lon.toString(),
            ...Object.fromEntries(
                Object.entries({
                    ...defaultOptions,
                    ...options
                }).map(([key, value]) => [
                    key,
                    typeof value === 'boolean' ? (value ? 1 : 0) : value
                ])
            )
        };

        try {
            console.log('Making request to PVGIS with params:', params);
            const response = await axios.get(`${this.baseUrl}/MRcalc`, { params });
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error('PVGIS API Error Response:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
            throw new Error(`PVGIS API Error: ${error.message}`);
        }
    }

    /**
     * Get daily radiation data for a specific location and month
     * @param {number} lat - Latitude in decimal degrees (south is negative)
     * @param {number} lon - Longitude in decimal degrees (west is negative)
     * @param {number} month - Month number (1-12, or 0 for all months)
     * @param {Object} options - Additional options
     * @param {boolean} [options.global=true] - Output global, direct and diffuse in-plane irradiances
     * @param {boolean} [options.glob_2axis=false] - Output two-axis tracking irradiances
     * @param {boolean} [options.clearsky=false] - Output clear-sky irradiance
     * @param {boolean} [options.clearsky_2axis=false] - Output clear-sky two-axis tracking irradiance
     * @param {boolean} [options.showtemperatures=false] - Output daily temperature profile
     * @returns {Promise<Object>} Daily radiation data
     */
    async getDailyRadiation(lat, lon, month, options = {}) {
        const defaultOptions = {
            global: 1,
            glob_2axis: 0,
            clearsky: 0,
            clearsky_2axis: 0,
            showtemperatures: 0,
            outputformat: 'json'
        };

        const params = {
            lat: lat.toString(),
            lon: lon.toString(),
            month: month.toString(),
            ...Object.fromEntries(
                Object.entries({
                    ...defaultOptions,
                    ...options
                }).map(([key, value]) => [
                    key,
                    typeof value === 'boolean' ? (value ? 1 : 0) : value
                ])
            )
        };

        try {
            const response = await axios.get(`${this.baseUrl}/DRcalc`, { params });
            return response.data;
        } catch (error) {
            throw new Error(`PVGIS API Error: ${error.message}`);
        }
    }

    /**
     * Get hourly radiation data for a specific location
     * @param {number} lat - Latitude in decimal degrees (south is negative)
     * @param {number} lon - Longitude in decimal degrees (west is negative)
     * @param {Object} options - Additional options
     * @param {boolean} [options.pvcalculation=false] - Include PV production estimation
     * @param {number} [options.peakpower] - Nominal power of PV system in kW (required if pvcalculation=true)
     * @param {number} [options.loss] - System losses in percent (required if pvcalculation=true)
     * @returns {Promise<Object>} Hourly radiation data
     */
    async getHourlyRadiation(lat, lon, options = {}) {
        const defaultOptions = {
            pvcalculation: 0,
            outputformat: 'json'
        };

        const params = {
            lat: lat.toString(),
            lon: lon.toString(),
            ...Object.fromEntries(
                Object.entries({
                    ...defaultOptions,
                    ...options
                }).map(([key, value]) => [
                    key,
                    typeof value === 'boolean' ? (value ? 1 : 0) : value
                ])
            )
        };

        try {
            const response = await axios.get(`${this.baseUrl}/seriescalc`, { params });
            return response.data;
        } catch (error) {
            throw new Error(`PVGIS API Error: ${error.message}`);
        }
    }
}

module.exports = PVGIS; 