/**
 * Fuel-Finder Application
 * Main JavaScript file - orchestrates all modules
 */

import { DataLoader } from './js/dataLoader.js';
import { MapManager } from './js/map.js';
import { MarkerManager } from './js/markers.js';
import { UIManager } from './js/ui.js';
import { SearchManager } from './js/search.js';
import { ChartManager } from './js/charts.js';
import { openDirections, showLoading, hideLoading } from './js/utils.js';

// Application state
class FuelFinderApp {
    constructor() {
        this.dataLoader = null;
        this.mapManager = null;
        this.markerManager = null;
        this.uiManager = null;
        this.searchManager = null;
        this.chartManager = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading overlay
            showLoading();
            
            // Initialize modules
            this.dataLoader = new DataLoader();
            this.mapManager = new MapManager();
            this.uiManager = new UIManager();
            this.chartManager = new ChartManager();
            
            // Load fuel data
            await this.dataLoader.loadFuelData();
            
            // Initialize the map
            this.mapManager.initializeMap();
            const map = this.mapManager.getMap();
            
            // Initialize marker and search managers (need map instance)
            this.markerManager = new MarkerManager(map);
            this.searchManager = new SearchManager(map, this.chartManager, this.uiManager);
            
            // Create fuel filter chips
            this.uiManager.createFuelFilters(
                this.dataLoader.getAllFuelTypes(),
                this.onFilterChange.bind(this)
            );
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading overlay
            hideLoading();
            
            // Request user location and auto-search
            this.requestUserLocation();
            
            console.log('Fuel Finder App initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
            alert('Failed to load fuel data. Please try refreshing the page.');
            hideLoading();
        }
    }

    /**
     * Handle filter change
     */
    onFilterChange(selectedFuelTypes) {
        this.markerManager.renderMarkers(
            this.dataLoader.getFuelData(),
            selectedFuelTypes
        );
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        const map = this.mapManager.getMap();
        
        // Map click handler for proximity search
        map.on('click', (e) => this.handleMapClick(e));
        
        // UI event listeners
        this.uiManager.setupEventListeners({
            onCloseDistribution: () => {
                this.chartManager.hide();
            },
            onCloseResults: () => {
                this.searchManager.hide();
                this.chartManager.hide();
                this.mapManager.removeSearchCircle();
                this.markerManager.resetMarkerOpacity();
            }
        });
    }

    /**
     * Handle map click for proximity search
     */
    handleMapClick(e) {
        // Ignore clicks on fuel markers
        const map = this.mapManager.getMap();
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['fuel-markers']
        });
        
        if (features.length > 0) {
            // Clicked on a marker, let the marker click handler deal with it
            return;
        }
        
        const clickedPoint = e.lngLat;
        const radius = this.uiManager.getRadius();
        
        // Create search circle
        this.mapManager.createSearchCircle(clickedPoint, radius);
        
        // Find nearby stations
        const nearbyStations = this.searchManager.findNearbyStations(
            this.dataLoader.getFuelData(),
            this.uiManager.getSelectedFuelTypes(),
            clickedPoint,
            radius
        );
        
        // Update marker opacity based on search area
        const clickedTurfPoint = turf.point([clickedPoint.lng, clickedPoint.lat]);
        this.markerManager.updateMarkerOpacity(clickedTurfPoint, radius);
        
        // Display results
        this.searchManager.displayResults(nearbyStations);
    }

    /**
     * Request user's location and auto-search
     */
    requestUserLocation() {
        this.mapManager.requestUserLocation((lng, lat) => {
            // Auto-search if fuel types are selected
            const selectedFuelTypes = this.uiManager.getSelectedFuelTypes();
            if (selectedFuelTypes.length > 0) {
                // Simulate click at user location
                const clickedPoint = { lng, lat };
                const radius = this.uiManager.getRadius();
                
                // Create search circle
                this.mapManager.createSearchCircle(clickedPoint, radius);
                
                // Find nearby stations
                const nearbyStations = this.searchManager.findNearbyStations(
                    this.dataLoader.getFuelData(),
                    selectedFuelTypes,
                    clickedPoint,
                    radius
                );
                
                // Update marker opacity
                const clickedTurfPoint = turf.point([lng, lat]);
                this.markerManager.updateMarkerOpacity(clickedTurfPoint, radius);
                
                // Display results
                this.searchManager.displayResults(nearbyStations);
            }
        });
    }
}

// Make openDirections available globally for popup buttons
window.openDirections = openDirections;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FuelFinderApp();
    await app.init();
});

console.log('App.js loaded successfully');
