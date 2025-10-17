/**
 * Data Loader Module
 * Handles loading and processing of fuel data
 */

export class DataLoader {
    constructor() {
        this.fuelData = null;
        this.allFuelTypes = new Set();
    }

    /**
     * Load fuel data from GeoJSON file
     */
    async loadFuelData() {
        try {
            const response = await fetch('fuel_data.geojson');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.fuelData = await response.json();
            
            // Extract all unique fuel types
            this.fuelData.features.forEach(feature => {
                if (feature.properties.prices) {
                    Object.keys(feature.properties.prices).forEach(fuelType => {
                        this.allFuelTypes.add(fuelType);
                    });
                }
            });
            
            console.log(`Loaded ${this.fuelData.features.length} fuel stations`);
            console.log(`Found ${this.allFuelTypes.size} fuel types:`, Array.from(this.allFuelTypes));
            
            return this.fuelData;
        } catch (error) {
            console.error('Error loading fuel data:', error);
            throw error;
        }
    }

    /**
     * Get all fuel data
     */
    getFuelData() {
        return this.fuelData;
    }

    /**
     * Get all unique fuel types
     */
    getAllFuelTypes() {
        return Array.from(this.allFuelTypes);
    }
}
