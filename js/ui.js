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
        this.resultsHeader = document.getElementById('results-header');
        this.closeResultsBtn = document.getElementById('close-results');
        this.priceDistributionPanel = document.getElementById('price-distribution-panel');
        this.closeDistributionBtn = document.getElementById('close-distribution');
        this.resultsPanelState = 'medium'; // 'minimized', 'medium', 'expanded'
    }

    /**
     * Create fuel filter chips dynamically
     */
    createFuelFilters(allFuelTypes, onFilterChange) {
        this.fuelFiltersContainer.innerHTML = '';
        
        // Sort fuel types alphabetically
        const sortedFuelTypes = allFuelTypes.sort();
        
        sortedFuelTypes.forEach(fuelType => {
            const chip = document.createElement('button');
            chip.className = 'fuel-chip';
            chip.textContent = fuelType;
            chip.dataset.fuelType = fuelType;
            chip.type = 'button';
            
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFuelFilter(fuelType, chip);
                if (onFilterChange) {
                    onFilterChange(this.selectedFuelTypes);
                }
            });
            
            this.fuelFiltersContainer.appendChild(chip);
        });
        
        // Auto-select "Benzina" by default
        const benzinaChip = this.fuelFiltersContainer.querySelector('[data-fuel-type="Benzina"]');
        if (benzinaChip) {
            this.toggleFuelFilter('Benzina', benzinaChip);
            if (onFilterChange) {
                onFilterChange(this.selectedFuelTypes);
            }
        }
        
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
        // Prevent clicks on header from propagating to map
        this.header.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        this.header.addEventListener('touchend', (e) => {
            e.stopPropagation();
        });
        
        // Radius slider
        this.radiusSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            this.radiusValue.textContent = e.target.value;
        });
        
        this.radiusSlider.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Slider label
        const sliderLabel = this.radiusSlider.previousElementSibling;
        if (sliderLabel) {
            sliderLabel.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Toggle header collapse
        this.toggleHeaderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.header.classList.toggle('collapsed');
            
            // Update icon based on state
            const icon = this.toggleHeaderBtn.querySelector('.toggle-icon');
            if (this.header.classList.contains('collapsed')) {
                icon.textContent = '\u25BC';
            } else {
                icon.textContent = '\u25B2';
            }
        });
        
        // Toggle results panel state (three states)
        this.resultsHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking the close button
            if (e.target.id === 'close-results' || e.target.closest('#close-results')) {
                return;
            }
            this.toggleResultsPanelState();
        });
        
        // Close distribution button (check if element exists)
        if (this.closeDistributionBtn) {
            this.closeDistributionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (callbacks.onCloseDistribution) {
                    callbacks.onCloseDistribution();
                }
            });
        }
        
        // Close results button
        this.closeResultsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent header click event
            if (callbacks.onCloseResults) {
                callbacks.onCloseResults();
            }
        });
    }
    
    /**
     * Toggle results panel between three states: minimized -> medium -> expanded -> minimized
     */
    toggleResultsPanelState() {
        this.resultsPanel.classList.remove('minimized', 'expanded');
        
        if (this.resultsPanelState === 'medium') {
            this.resultsPanelState = 'expanded';
            this.resultsPanel.classList.add('expanded');
        } else if (this.resultsPanelState === 'expanded') {
            this.resultsPanelState = 'minimized';
            this.resultsPanel.classList.add('minimized');
        } else {
            this.resultsPanelState = 'medium';
        }
        
        console.log('Results panel state:', this.resultsPanelState);
    }
    
    /**
     * Reset results panel to medium state
     */
    resetResultsPanelState() {
        this.resultsPanelState = 'medium';
        this.resultsPanel.classList.remove('minimized', 'expanded');
    }
}
