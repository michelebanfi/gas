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
        this.clusterIndex = null;
        this.searchCenter = null;
        this.searchRadius = null;
        this.htmlMarkers = new Map(); // Store HTML marker instances by index
        this.updateTimeout = null;
    }

    /**
     * Render markers on the map based on selected fuel filters with clustering
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
        
        // Initialize Supercluster
        this.clusterIndex = new Supercluster({
            radius: 80,  // Cluster radius in pixels
            maxZoom: 16, // Max zoom to cluster points on
            minZoom: 0,
            minPoints: 2 // Minimum points to form a cluster
        });
        
        // Load points into cluster
        this.clusterIndex.load(features);
        
        // Add clustered source
        this.map.addSource('fuel-stations', {
            type: 'geojson',
            data: this._getClusters(),
            cluster: false // We handle clustering manually with Supercluster
        });
        
        // Add cluster circles layer
        this.map.addLayer({
            id: 'fuel-clusters',
            type: 'circle',
            source: 'fuel-stations',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#33333349', // Blue for small clusters
                    10,
                    '#3333339a', // Yellow for medium clusters
                    30,
                    '#333'  // Pink for large clusters
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,  // Radius for small clusters
                    10,
                    30,  // Radius for medium clusters
                    30,
                    40   // Radius for large clusters
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#FFFFFF'
            }
        });
        
        // Add cluster count labels
        this.map.addLayer({
            id: 'fuel-cluster-count',
            type: 'symbol',
            source: 'fuel-stations',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Noto Sans Bold'],
                'text-size': 14
            },
            paint: {
                'text-color': '#FFFFFF'
            }
        });
        
        // Create initial HTML markers
        this._updateHTMLMarkers();
        
        // Add click handler for clusters (expand on click)
        this.map.on('click', 'fuel-clusters', (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['fuel-clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            const zoom = this.clusterIndex.getClusterExpansionZoom(clusterId);
            this.map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom
            });
        });
        
        // Update markers on map move/zoom with debouncing
        const debouncedUpdate = () => {
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
            }
            this.updateTimeout = setTimeout(() => this._updateClusters(), 50);
        };
        
        this.map.on('moveend', debouncedUpdate);
        this.map.on('zoomend', () => this._updateClusters());
        
        console.log(`Rendered ${features.length} markers with clustering`);
    }

    /**
     * Update HTML markers - only create/update markers that should be visible
     */
    _updateHTMLMarkers() {
        if (!this.clusterIndex) return;
        
        const clusters = this._getClusters();
        const visibleIndices = new Set();
        
        // Collect indices of visible individual points
        clusters.features.forEach(feature => {
            if (!feature.properties.cluster) {
                visibleIndices.add(feature.properties.index);
            }
        });
        
        // Remove markers that should no longer be visible
        const markersToRemove = [];
        this.htmlMarkers.forEach((markerObj, index) => {
            if (!visibleIndices.has(index)) {
                markerObj.marker.remove();
                markersToRemove.push(index);
            }
        });
        markersToRemove.forEach(index => this.htmlMarkers.delete(index));
        
        // Create or update markers that should be visible
        visibleIndices.forEach(index => {
            const markerData = this.markersData[index];
            
            if (!this.htmlMarkers.has(index)) {
                // Create new marker
                const el = document.createElement('div');
                el.className = 'price-chip-marker';
                el.style.borderColor = markerData.color;
                el.innerHTML = `€${markerData.price.toFixed(3)}`;
                
                // Add click handler
                el.addEventListener('click', () => {
                    new maplibregl.Popup()
                        .setLngLat(markerData.coordinates)
                        .setHTML(createPopupContent(markerData.feature))
                        .addTo(this.map);
                });
                
                // Create and store marker
                const marker = new maplibregl.Marker({
                    element: el,
                    anchor: 'center'
                })
                    .setLngLat(markerData.coordinates)
                    .addTo(this.map);
                
                this.htmlMarkers.set(index, {
                    marker: marker,
                    element: el,
                    data: markerData
                });
            }
            
            // Update opacity based on search area
            const markerObj = this.htmlMarkers.get(index);
            if (this.searchCenter && this.searchRadius) {
                const stationPoint = turf.point(markerData.coordinates);
                const distance = turf.distance(this.searchCenter, stationPoint, { units: 'kilometers' });
                markerObj.element.style.opacity = distance <= this.searchRadius ? '1' : '0.3';
            } else {
                markerObj.element.style.opacity = '1';
            }
        });
    }

    /**
     * Clear all HTML markers
     */
    _clearHTMLMarkers() {
        this.htmlMarkers.forEach(({ marker }) => {
            marker.remove();
        });
        this.htmlMarkers.clear();
    }

    /**
     * Get clusters for current map view
     */
    _getClusters() {
        if (!this.clusterIndex) {
            return { type: 'FeatureCollection', features: [] };
        }
        
        const bounds = this.map.getBounds();
        const zoom = Math.floor(this.map.getZoom());
        
        const clusters = this.clusterIndex.getClusters(
            [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
            zoom
        );
        
        // If there's an active search, separate markers inside/outside search area
        if (this.searchCenter && this.searchRadius) {
            const processedFeatures = [];
            
            clusters.forEach(cluster => {
                if (cluster.properties.cluster) {
                    // This is a cluster - check if it's inside search area
                    const clusterPoint = turf.point(cluster.geometry.coordinates);
                    const distance = turf.distance(this.searchCenter, clusterPoint, { units: 'kilometers' });
                    
                    if (distance <= this.searchRadius) {
                        // Cluster is inside search area - expand it to individual points
                        const leaves = this.clusterIndex.getLeaves(cluster.properties.cluster_id, Infinity);
                        processedFeatures.push(...leaves);
                    } else {
                        // Cluster is outside search area - keep it as cluster
                        processedFeatures.push(cluster);
                    }
                } else {
                    // Individual point - always add
                    processedFeatures.push(cluster);
                }
            });
            
            return {
                type: 'FeatureCollection',
                features: processedFeatures
            };
        }
        
        return {
            type: 'FeatureCollection',
            features: clusters
        };
    }

    /**
     * Update clusters when map moves
     */
    _updateClusters() {
        if (!this.map.getSource('fuel-stations') || !this.clusterIndex) {
            return;
        }
        
        const source = this.map.getSource('fuel-stations');
        source.setData(this._getClusters());
        
        // Update HTML markers to match clustering state
        this._updateHTMLMarkers();
    }

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        // Clear HTML markers first
        this._clearHTMLMarkers();
        
        // Remove cluster layers
        const layers = [
            'fuel-cluster-count',
            'fuel-clusters'
        ];
        
        layers.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
        });
        
        if (this.map.getSource('fuel-stations')) {
            this.map.removeSource('fuel-stations');
        }
        this.markersData = [];
        this.clusterIndex = null;
    }

    /**
     * Update marker opacity - full opacity inside search, semi-transparent outside
     * Also disables clustering within search area
     */
    updateMarkerOpacity(centerPoint, radiusKm) {
        if (!this.map.getSource('fuel-stations')) return;
        
        // Store search parameters for clustering logic
        this.searchCenter = centerPoint;
        this.searchRadius = radiusKm;
        
        // Update clusters with new search area
        this._updateClusters();
    }

    /**
     * Reset all markers to full opacity and re-enable clustering everywhere
     */
    resetMarkerOpacity() {
        if (!this.map.getSource('fuel-stations')) return;
        
        // Clear search parameters to re-enable clustering everywhere
        this.searchCenter = null;
        this.searchRadius = null;
        
        // Update clusters to restore normal clustering
        this._updateClusters();
    }
}
