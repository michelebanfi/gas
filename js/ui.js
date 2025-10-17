/**
 * UI Module
 * Handles user interface components, filters, and event listeners
 */

export class UIManager {
    constructor() {
        this.selectedFuelTypes = [];
        this.fuelFiltersContainer = document.getElementById('fuel-filters');
        this.radiusSlider = document.getElementById('radius-slider');
        this.radiusValue = document.getElementById('radius-value');
        this.header = document.getElementById('header');
        this.toggleHeaderBtn = document.getElementById('toggle-header');
        this.resultsPanel = document.getElementById('results-panel');
        this.closeResultsBtn = document.getElementById('close-results');
        this.priceDistributionPanel = document.getElementById('price-distribution-panel');
        this.closeDistributionBtn = document.getElementById('close-distribution');
    }

    /**
     * Create fuel filter chips dynamically
     */
    createFuelFilters(allFuelTypes, onFilterChange) {
        this.fuelFiltersContainer.innerHTML = '';
        
        // Sort fuel types alphabetically
        const sortedFuelTypes = allFuelTypes.sort();
        
        sortedFuelTypes.forEach(fuelType => {
            const chip = document.createElement('div');
            chip.className = 'fuel-chip';
            chip.textContent = fuelType;
            chip.dataset.fuelType = fuelType;
            
            chip.addEventListener('click', () => {
                this.toggleFuelFilter(fuelType, chip);
                if (onFilterChange) {
                    onFilterChange(this.selectedFuelTypes);
                }
            });
            
            this.fuelFiltersContainer.appendChild(chip);
        });
        
        console.log('Fuel filter chips created');
    }

    /**
     * Toggle fuel filter selection
     */
    toggleFuelFilter(fuelType, chipElement) {
        const index = this.selectedFuelTypes.indexOf(fuelType);
        
        if (index === -1) {
            // Add to selection
            this.selectedFuelTypes.push(fuelType);
            chipElement.classList.add('active');
        } else {
            // Remove from selection
            this.selectedFuelTypes.splice(index, 1);
            chipElement.classList.remove('active');
        }
        
        console.log('Selected fuel types:', this.selectedFuelTypes);
    }

    /**
     * Get currently selected fuel types
     */
    getSelectedFuelTypes() {
        return this.selectedFuelTypes;
    }

    /**
     * Get current radius value
     */
    getRadius() {
        return parseFloat(this.radiusSlider.value);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners(callbacks) {
        // Radius slider
        this.radiusSlider.addEventListener('input', (e) => {
            this.radiusValue.textContent = e.target.value;
        });
        
        // Toggle header collapse
        this.toggleHeaderBtn.addEventListener('click', () => {
            this.header.classList.toggle('collapsed');
        });
        
        // Close distribution button
        this.closeDistributionBtn.addEventListener('click', () => {
            if (callbacks.onCloseDistribution) {
                callbacks.onCloseDistribution();
            }
        });
        
        // Close results button
        this.closeResultsBtn.addEventListener('click', () => {
            if (callbacks.onCloseResults) {
                callbacks.onCloseResults();
            }
        });
    }
}
