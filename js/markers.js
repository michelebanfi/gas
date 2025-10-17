/**
 * Markers Module
 * Handles marker rendering and management on the map
 */

import { getPriceFreshnessColor, createPopupContent } from './utils.js';

export class MarkerManager {
    constructor(map) {
        this.map = map;
        this.markersData = [];
        this._clickHandlerAdded = false;
    }

    /**
     * Render markers on the map based on selected fuel filters
     */
    renderMarkers(fuelData, selectedFuelTypes) {
        // If no fuel type is selected, clear markers
        if (selectedFuelTypes.length === 0) {
            this.clearMarkers();
            return;
        }
        
        // Clear existing markers
        this.clearMarkers();
        
        // Prepare features for the markers layer
        const features = [];
        this.markersData = [];
        
        fuelData.features.forEach(feature => {
            const prices = feature.properties.prices;
            const priceDates = feature.properties.priceDates || {};
            
            // Check if station has any of the selected fuel types
            const matchingFuels = selectedFuelTypes.filter(fuelType => 
                prices && prices[fuelType] !== undefined
            );
            
            if (matchingFuels.length > 0) {
                const fuelType = matchingFuels[0];
                const price = prices[fuelType];
                const priceDate = priceDates[fuelType];
                
                // Get color based on price freshness
                const markerColor = getPriceFreshnessColor(priceDate);
                
                // Store marker data
                this.markersData.push({
                    coordinates: feature.geometry.coordinates,
                    price: price,
                    fuelType: fuelType,
                    feature: feature,
                    color: markerColor,
                    date: priceDate
                });
                
                // Create feature for GeoJSON source
                features.push({
                    type: 'Feature',
                    geometry: feature.geometry,
                    properties: {
                        price: price.toFixed(3),
                        fuelType: fuelType,
                        index: this.markersData.length - 1,
                        color: markerColor
                    }
                });
            }
        });
        
        if (features.length === 0) {
            return;
        }
        
        // Add source and layer to map
        this.map.addSource('fuel-stations', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: features
            }
        });
        
        // Add markers layer with color based on freshness
        this.map.addLayer({
            id: 'fuel-markers',
            type: 'circle',
            source: 'fuel-stations',
            paint: {
                'circle-radius': 10,
                'circle-color': ['get', 'color'],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#FFFFFF',
                'circle-opacity': ['case',
                    ['has', 'insideSearch'],
                    ['get', 'insideSearch'],
                    0.9
                ]
            }
        });
        
        // Add labels layer with neon styling
        this.map.addLayer({
            id: 'fuel-labels',
            type: 'symbol',
            source: 'fuel-stations',
            layout: {
                'text-field': '€{price}',
                'text-font': ['Noto Sans Regular'],
                'text-offset': [0, 1.8],
                'text-anchor': 'top',
                'text-size': 12
            },
            paint: {
                'text-color': '#2A2A2A',
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 2
            }
        });
        
        // Add click handler for markers (only if not already added)
        if (!this._clickHandlerAdded) {
            this.map.on('click', 'fuel-markers', (e) => {
                const coordinates = e.features[0].geometry.coordinates.slice();
                const index = e.features[0].properties.index;
                const markerData = this.markersData[index];
                
                // Create popup
                new maplibregl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(createPopupContent(markerData.feature))
                    .addTo(this.map);
            });
            
            // Change cursor on hover
            this.map.on('mouseenter', 'fuel-markers', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            
            this.map.on('mouseleave', 'fuel-markers', () => {
                this.map.getCanvas().style.cursor = '';
            });
            
            this._clickHandlerAdded = true;
        }
        
        console.log(`Rendered ${features.length} markers`);
    }

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        if (this.map.getLayer('fuel-labels')) {
            this.map.removeLayer('fuel-labels');
        }
        if (this.map.getLayer('fuel-markers')) {
            this.map.removeLayer('fuel-markers');
        }
        if (this.map.getSource('fuel-stations')) {
            this.map.removeSource('fuel-stations');
        }
        this.markersData = [];
    }

    /**
     * Update marker opacity - full opacity inside search, semi-transparent outside
     */
    updateMarkerOpacity(centerPoint, radiusKm) {
        if (!this.map.getSource('fuel-stations')) return;
        
        const source = this.map.getSource('fuel-stations');
        const data = source._data;
        
        // Update each feature's opacity based on whether it's inside the search circle
        data.features.forEach(feature => {
            const stationPoint = turf.point(feature.geometry.coordinates);
            const distance = turf.distance(centerPoint, stationPoint, { units: 'kilometers' });
            
            // Set opacity: 0.9 inside circle, 0.25 outside
            feature.properties.insideSearch = distance <= radiusKm ? 0.9 : 0.25;
        });
        
        // Update the source with modified data
        source.setData(data);
    }

    /**
     * Reset all markers to full opacity
     */
    resetMarkerOpacity() {
        if (!this.map.getSource('fuel-stations')) return;
        
        const source = this.map.getSource('fuel-stations');
        const data = source._data;
        
        data.features.forEach(feature => {
            feature.properties.insideSearch = 0.9;
        });
        
        source.setData(data);
    }
}
