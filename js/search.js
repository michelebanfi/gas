/**
 * Search Module
 * Handles proximity search and results display
 */

import { createPopupContent } from './utils.js';

export class SearchManager {
    constructor(map, chartManager, uiManager) {
        this.map = map;
        this.chartManager = chartManager;
        this.uiManager = uiManager;
        this.resultsPanel = document.getElementById('results-panel');
        this.resultsList = document.getElementById('results-list');
    }

    /**
     * Find stations within radius of a point
     */
    findNearbyStations(fuelData, selectedFuelTypes, clickedPoint, radiusKm) {
        if (selectedFuelTypes.length === 0) {
            alert('Please select at least one fuel type first!');
            return [];
        }
        
        console.log('Searching near:', clickedPoint, 'radius:', radiusKm, 'km');
        
        const clickedTurfPoint = turf.point([clickedPoint.lng, clickedPoint.lat]);
        const nearbyStations = [];
        
        fuelData.features.forEach(feature => {
            const prices = feature.properties.prices;
            
            // Check if station has any of the selected fuel types
            const matchingFuels = selectedFuelTypes.filter(fuelType => 
                prices && prices[fuelType] !== undefined
            );
            
            if (matchingFuels.length > 0) {
                const stationPoint = turf.point(feature.geometry.coordinates);
                const distance = turf.distance(clickedTurfPoint, stationPoint, { units: 'kilometers' });
                
                console.log(`Station ${feature.properties.NomeImpianto}: ${distance.toFixed(2)} km away`);
                
                if (distance <= radiusKm) {
                    nearbyStations.push({
                        feature: feature,
                        distance: distance,
                        fuelType: matchingFuels[0],
                        price: prices[matchingFuels[0]]
                    });
                }
            }
        });
        
        // Sort by distance
        nearbyStations.sort((a, b) => a.distance - b.distance);
        
        console.log(`Found ${nearbyStations.length} nearby stations`);
        
        return nearbyStations;
    }

    /**
     * Display search results in the results panel
     */
    displayResults(stations) {
        this.resultsList.innerHTML = '';
        
        if (stations.length === 0) {
            this.resultsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⛽</div>
                    <div class="empty-state-text">
                        No stations found within the selected radius.<br>
                        Try increasing the search radius or selecting different fuel types.
                    </div>
                </div>
            `;
        } else {
            stations.forEach(station => {
                const resultItem = this.createResultItem(station);
                this.resultsList.appendChild(resultItem);
            });
            
            // Show price distribution chart
            this.chartManager.showPriceDistribution(stations);
        }
        
        // Show results panel and reset to medium state
        this.resultsPanel.classList.remove('hidden');
        if (this.uiManager && this.uiManager.resetResultsPanelState) {
            this.uiManager.resetResultsPanelState();
        }
    }

    /**
     * Create a result item element
     */
    createResultItem(station) {
        const props = station.feature.properties;
        const coords = station.feature.geometry.coordinates;
        
        const item = document.createElement('div');
        item.className = 'result-item';
        
        item.innerHTML = `
            <div class="result-name">${props.NomeImpianto || 'Unknown Station'}</div>
            <div class="result-distance">${station.distance.toFixed(2)} km away</div>
            <div class="result-address">
                ${props.Indirizzo || ''}, ${props.Comune || ''}
            </div>
            <div class="result-price">
                ${station.fuelType}: €${station.price.toFixed(3)}
            </div>
        `;
        
        // Add click event to zoom to station and show popup
        item.addEventListener('click', () => {
            this.map.flyTo({
                center: coords,
                zoom: 14
            });
            
            // Create and show popup
            new maplibregl.Popup()
                .setLngLat(coords)
                .setHTML(createPopupContent(station.feature))
                .addTo(this.map);
        });
        
        return item;
    }

    /**
     * Hide results panel
     */
    hide() {
        this.resultsPanel.classList.add('hidden');
    }
}
