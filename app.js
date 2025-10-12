/**
 * Fuel-Finder Application
 * Main JavaScript file for the fuel price finder web application
 * Using MapLibre GL JS for mapping
 */

// Global state
let fuelData = null;
let map = null;
let selectedFuelTypes = [];
let searchCircleId = 'search-circle';
let allFuelTypes = new Set();
let markersData = []; // Store marker data for filtering

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const fuelFiltersContainer = document.getElementById('fuel-filters');
const radiusSlider = document.getElementById('radius-slider');
const radiusValue = document.getElementById('radius-value');
const resultsPanel = document.getElementById('results-panel');
const resultsList = document.getElementById('results-list');
const closeResultsBtn = document.getElementById('close-results');
const header = document.getElementById('header');
const toggleHeaderBtn = document.getElementById('toggle-header');
const priceDistributionPanel = document.getElementById('price-distribution-panel');
const closeDistributionBtn = document.getElementById('close-distribution');
const priceHistogramCanvas = document.getElementById('price-histogram');
const distributionStatsDiv = document.getElementById('distribution-stats');

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading overlay
        showLoading();
        
        // Fetch fuel data
        await loadFuelData();
        
        // Initialize the map
        initializeMap();
        
        // Create fuel filter chips
        createFuelFilters();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading overlay
        hideLoading();
        
        // Request user location and auto-search
        requestUserLocation();
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Failed to load fuel data. Please try refreshing the page.');
        hideLoading();
    }
});

/**
 * Show loading overlay
 */
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

/**
 * Load fuel data from GeoJSON file
 */
async function loadFuelData() {
    try {
        const response = await fetch('fuel_data.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        fuelData = await response.json();
        
        // Extract all unique fuel types
        fuelData.features.forEach(feature => {
            if (feature.properties.prices) {
                Object.keys(feature.properties.prices).forEach(fuelType => {
                    allFuelTypes.add(fuelType);
                });
            }
        });
        
        console.log(`Loaded ${fuelData.features.length} fuel stations`);
        console.log(`Found ${allFuelTypes.size} fuel types:`, Array.from(allFuelTypes));
    } catch (error) {
        console.error('Error loading fuel data:', error);
        throw error;
    }
}

/**
 * Initialize the MapLibre GL map
 */
function initializeMap() {
    // Create map centered on Italy using Positron style
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [12.5, 42.5], // Italy center [lng, lat]
        zoom: 6
    });
    
    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // Wait for map to load before adding click handler
    map.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add click event listener for proximity search
        map.on('click', handleMapClick);
    });
    
    console.log('Map initializing...');
}

/**
 * Create fuel filter chips dynamically
 */
function createFuelFilters() {
    fuelFiltersContainer.innerHTML = '';
    
    // Sort fuel types alphabetically
    const sortedFuelTypes = Array.from(allFuelTypes).sort();
    
    sortedFuelTypes.forEach(fuelType => {
        const chip = document.createElement('div');
        chip.className = 'fuel-chip';
        chip.textContent = fuelType;
        chip.dataset.fuelType = fuelType;
        
        chip.addEventListener('click', () => toggleFuelFilter(fuelType, chip));
        
        fuelFiltersContainer.appendChild(chip);
    });
    
    console.log('Fuel filter chips created');
}

/**
 * Get color based on price freshness (days old)
 * Green (fresh) -> Blue -> Yellow -> Orange -> Red (old)
 */
function getPriceFreshnessColor(dateString) {
    if (!dateString) return '#3B82F6'; // Default tactical blue if no date
    
    try {
        // Parse Italian date format: "DD/MM/YYYY HH:MM:SS"
        const parts = dateString.split(' ')[0].split('/');
        const priceDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const now = new Date();
        const daysOld = (now - priceDate) / (1000 * 60 * 60 * 24);
        
        if (daysOld < 1) return '#10B981';      // Fresh green (< 1 day)
        if (daysOld < 3) return '#3B82F6';      // Tactical blue (1-3 days)
        if (daysOld < 7) return '#F59E0B';      // Yellow (3-7 days)
        if (daysOld < 14) return '#D97706';     // Orange (1-2 weeks)
        return '#EF4444';                        // Red (> 2 weeks)
    } catch (e) {
        console.error('Error parsing date:', dateString, e);
        return '#3B82F6'; // Default color
    }
}

/**
 * Toggle fuel filter selection
 */
function toggleFuelFilter(fuelType, chipElement) {
    const index = selectedFuelTypes.indexOf(fuelType);
    
    if (index === -1) {
        // Add to selection
        selectedFuelTypes.push(fuelType);
        chipElement.classList.add('active');
    } else {
        // Remove from selection
        selectedFuelTypes.splice(index, 1);
        chipElement.classList.remove('active');
    }
    
    console.log('Selected fuel types:', selectedFuelTypes);
    
    // Re-render markers with new filters
    renderMarkers();
}

/**
 * Render markers on the map based on selected fuel filters
 */
function renderMarkers() {
    // If no fuel type is selected, clear markers
    if (selectedFuelTypes.length === 0) {
        clearMarkers();
        return;
    }
    
    // Clear existing markers
    clearMarkers();
    
    // Prepare features for the markers layer
    const features = [];
    markersData = [];
    
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
            markersData.push({
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
                    index: markersData.length - 1,
                    color: markerColor
                }
            });
        }
    });
    
    if (features.length === 0) {
        return;
    }
    
    // Add source and layer to map
    map.addSource('fuel-stations', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: features
        }
    });
    
    // Add markers layer with color based on freshness
    map.addLayer({
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
    map.addLayer({
        id: 'fuel-labels',
        type: 'symbol',
        source: 'fuel-stations',
        layout: {
            'text-field': '€{price}',
            'text-font': ['Noto Sans Regular'], // Use a font that's available in the style
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
    if (!map._fuelMarkerClickHandlerAdded) {
        map.on('click', 'fuel-markers', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const index = e.features[0].properties.index;
            const markerData = markersData[index];
            
            // Create popup
            new maplibregl.Popup()
                .setLngLat(coordinates)
                .setHTML(createPopupContent(markerData.feature))
                .addTo(map);
        });
        
        // Change cursor on hover
        map.on('mouseenter', 'fuel-markers', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'fuel-markers', () => {
            map.getCanvas().style.cursor = '';
        });
        
        map._fuelMarkerClickHandlerAdded = true;
    }
    
    console.log(`Rendered ${features.length} markers`);
}

/**
 * Clear all markers from the map
 */
function clearMarkers() {
    if (map.getLayer('fuel-labels')) {
        map.removeLayer('fuel-labels');
    }
    if (map.getLayer('fuel-markers')) {
        map.removeLayer('fuel-markers');
    }
    if (map.getSource('fuel-stations')) {
        map.removeSource('fuel-stations');
    }
    markersData = [];
}

/**
 * Create popup content for a station
 */
function createPopupContent(feature) {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    
    let pricesHtml = '';
    if (props.prices) {
        Object.entries(props.prices)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([fuelType, price]) => {
                pricesHtml += `
                    <div class="popup-price-item">
                        <span class="popup-fuel-name">${fuelType}</span>
                        <span class="popup-fuel-price">€${price.toFixed(3)}</span>
                    </div>
                `;
            });
    }
    
    return `
        <div>
            <div class="popup-station-name">${props.NomeImpianto || 'Unknown Station'}</div>
            <div class="popup-flag">${props.Bandiera || ''}</div>
            <div class="popup-address">
                ${props.Indirizzo || ''}<br>
                ${props.Comune || ''} ${props.Provincia ? '(' + props.Provincia + ')' : ''}
            </div>
            <div class="popup-prices">
                ${pricesHtml}
            </div>
            <button class="directions-btn" onclick="openDirections(${coords[1]}, ${coords[0]})">
                Get Directions
            </button>
        </div>
    `;
}

/**
 * Handle map click for proximity search
 */
function handleMapClick(e) {
    // Ignore clicks on fuel markers
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['fuel-markers']
    });
    
    if (features.length > 0) {
        // Clicked on a marker, let the marker click handler deal with it
        return;
    }
    
    const clickedPoint = e.lngLat;
    const radius = parseFloat(radiusSlider.value);
    
    // Create search circle
    createSearchCircle(clickedPoint, radius);
    
    // Find nearby stations
    findNearbyStations(clickedPoint, radius);
}

/**
 * Find stations within radius of a point
 */
function findNearbyStations(clickedPoint, radiusKm) {
    if (selectedFuelTypes.length === 0) {
        alert('Please select at least one fuel type first!');
        return;
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
    
    // Update marker opacity based on search area
    updateMarkerOpacity(clickedTurfPoint, radiusKm);
    
    // Display results
    displayResults(nearbyStations);
}

/**
 * Update marker opacity - full opacity inside search, semi-transparent outside
 */
function updateMarkerOpacity(centerPoint, radiusKm) {
    if (!map.getSource('fuel-stations')) return;
    
    const source = map.getSource('fuel-stations');
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
 * Display search results in the results panel
 */
function displayResults(stations) {
    resultsList.innerHTML = '';
    
    if (stations.length === 0) {
        resultsList.innerHTML = `
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
            const resultItem = createResultItem(station);
            resultsList.appendChild(resultItem);
        });
        
        // Show price distribution chart
        showPriceDistribution(stations);
    }
    
    // Show results panel
    resultsPanel.classList.remove('hidden');
}

/**
 * Create a result item element
 */
function createResultItem(station) {
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
        map.flyTo({
            center: coords,
            zoom: 14
        });
        
        // Create and show popup
        new maplibregl.Popup()
            .setLngLat(coords)
            .setHTML(createPopupContent(station.feature))
            .addTo(map);
    });
    
    return item;
}

/**
 * Show price distribution chart for nearby stations
 */
function showPriceDistribution(stations) {
    if (stations.length === 0) {
        priceDistributionPanel.classList.add('hidden');
        return;
    }
    
    // Extract prices
    const prices = stations.map(s => s.price).sort((a, b) => a - b);
    
    // Calculate statistics
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    
    // Create histogram bins
    const numBins = 10;
    const binWidth = (max - min) / numBins;
    const bins = Array(numBins).fill(0);
    const binLabels = [];
    
    for (let i = 0; i < numBins; i++) {
        binLabels.push((min + i * binWidth).toFixed(3));
    }
    
    prices.forEach(price => {
        const binIndex = Math.min(Math.floor((price - min) / binWidth), numBins - 1);
        bins[binIndex]++;
    });
    
    // Draw histogram
    drawHistogram(bins, binLabels, min, max);
    
    // Show statistics
    distributionStatsDiv.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Minimum</div>
            <div class="stat-value">€${min.toFixed(3)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Maximum</div>
            <div class="stat-value">€${max.toFixed(3)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Average</div>
            <div class="stat-value">€${avg.toFixed(3)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Median</div>
            <div class="stat-value">€${median.toFixed(3)}</div>
        </div>
    `;
    
    // Show panel
    priceDistributionPanel.classList.remove('hidden');
}

/**
 * Draw histogram on canvas
 */
function drawHistogram(bins, binLabels, minPrice, maxPrice) {
    const canvas = priceHistogramCanvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 30;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const barWidth = chartWidth / bins.length;
    const maxBinValue = Math.max(...bins);
    
    // Draw bars
    bins.forEach((count, i) => {
        const barHeight = (count / maxBinValue) * chartHeight;
        const x = padding + i * barWidth;
        const y = canvas.height - padding - barHeight;
        
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height - padding);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#D97706');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
        
        // Add count label on top of bar
        if (count > 0) {
            ctx.fillStyle = '#E2E8F0';
            ctx.font = '10px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(count.toString(), x + barWidth / 2, y - 5);
        }
    });
    
    // Draw axes
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`€${minPrice.toFixed(3)}`, padding, canvas.height - padding + 15);
    ctx.textAlign = 'right';
    ctx.fillText(`€${maxPrice.toFixed(3)}`, canvas.width - padding, canvas.height - padding + 15);
    ctx.textAlign = 'center';
    ctx.fillText('Price Range', canvas.width / 2, canvas.height - 5);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Radius slider
    radiusSlider.addEventListener('input', (e) => {
        radiusValue.textContent = e.target.value;
    });
    
    // Toggle header collapse
    toggleHeaderBtn.addEventListener('click', () => {
        header.classList.toggle('collapsed');
    });
    
    // Close distribution button
    closeDistributionBtn.addEventListener('click', () => {
        priceDistributionPanel.classList.add('hidden');
    });
    
    // Close results button
    closeResultsBtn.addEventListener('click', () => {
        resultsPanel.classList.add('hidden');
        priceDistributionPanel.classList.add('hidden');
        // Remove search circle
        if (map.getLayer(searchCircleId)) {
            map.removeLayer(searchCircleId);
        }
        if (map.getLayer(searchCircleId + '-outline')) {
            map.removeLayer(searchCircleId + '-outline');
        }
        if (map.getSource(searchCircleId)) {
            map.removeSource(searchCircleId);
        }
        // Reset marker opacity
        resetMarkerOpacity();
    });
}

/**
 * Reset all markers to full opacity
 */
function resetMarkerOpacity() {
    if (!map.getSource('fuel-stations')) return;
    
    const source = map.getSource('fuel-stations');
    const data = source._data;
    
    data.features.forEach(feature => {
        feature.properties.insideSearch = 0.9;
    });
    
    source.setData(data);
}

/**
 * Request user's location and auto-search nearby stations
 */
function requestUserLocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            console.log('User location:', userLat, userLng);
            
            // Center map on user location
            map.flyTo({
                center: [userLng, userLat],
                zoom: 12,
                duration: 2000
            });
            
            // Add user location marker
            addUserLocationMarker(userLng, userLat);
            
            // Auto-search if fuel types are selected
            if (selectedFuelTypes.length > 0) {
                // Simulate click at user location
                const clickedPoint = { lng: userLng, lat: userLat };
                const radius = parseFloat(radiusSlider.value);
                
                // Create search circle
                createSearchCircle(clickedPoint, radius);
                
                // Find nearby stations
                findNearbyStations(clickedPoint, radius);
            }
        },
        (error) => {
            console.log('Error getting user location:', error.message);
            // Don't alert - just fail silently as this is optional
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

/**
 * Add a marker for user's current location
 */
function addUserLocationMarker(lng, lat) {
    // Remove existing user marker if any
    if (map.getSource('user-location')) {
        map.removeLayer('user-location-marker');
        map.removeLayer('user-location-pulse');
        map.removeSource('user-location');
    }
    
    map.addSource('user-location', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            }
        }
    });
    
    // Pulsing circle
    map.addLayer({
        id: 'user-location-pulse',
        type: 'circle',
        source: 'user-location',
        paint: {
            'circle-radius': 20,
            'circle-color': '#3B82F6',
            'circle-opacity': 0.3,
            'circle-blur': 0.5
        }
    });
    
    // Center marker
    map.addLayer({
        id: 'user-location-marker',
        type: 'circle',
        source: 'user-location',
        paint: {
            'circle-radius': 8,
            'circle-color': '#3B82F6',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF'
        }
    });
}

/**
 * Create search circle (extracted for reuse)
 */
function createSearchCircle(clickedPoint, radius) {
    // Remove previous search circle
    if (map.getLayer(searchCircleId)) {
        map.removeLayer(searchCircleId);
    }
    if (map.getLayer(searchCircleId + '-outline')) {
        map.removeLayer(searchCircleId + '-outline');
    }
    if (map.getSource(searchCircleId)) {
        map.removeSource(searchCircleId);
    }
    
    // Create circle using Turf.js
    const center = turf.point([clickedPoint.lng, clickedPoint.lat]);
    const radiusInKm = radius;
    const options = { steps: 64, units: 'kilometers' };
    const circle = turf.circle(center, radiusInKm, options);
    
    // Add circle to map
    map.addSource(searchCircleId, {
        type: 'geojson',
        data: circle
    });
    
    map.addLayer({
        id: searchCircleId,
        type: 'fill',
        source: searchCircleId,
        paint: {
            'fill-color': '#D97706',
            'fill-opacity': 0.15
        }
    });
    
    map.addLayer({
        id: searchCircleId + '-outline',
        type: 'line',
        source: searchCircleId,
        paint: {
            'line-color': '#D97706',
            'line-width': 3,
            'line-dasharray': [3, 3]
        }
    });
}

/**
 * Open Google Maps directions (global function for popup button)
 */
function openDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

// Make openDirections available globally for popup buttons
window.openDirections = openDirections;

console.log('App.js loaded successfully');
