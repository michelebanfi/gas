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
                    '#51bbd6', // Blue for small clusters
                    10,
                    '#f1f075', // Yellow for medium clusters
                    30,
                    '#f28cb1'  // Pink for large clusters
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
        
        // Add unclustered markers layer with color based on freshness
        this.map.addLayer({
            id: 'fuel-markers',
            type: 'circle',
            source: 'fuel-stations',
            filter: ['!', ['has', 'point_count']],
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
        
        // Add labels layer for unclustered markers
        this.map.addLayer({
            id: 'fuel-labels',
            type: 'symbol',
            source: 'fuel-stations',
            filter: ['!', ['has', 'point_count']],
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
        
        // Add click handler for individual markers (only if not already added)
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
            
            // Change cursor on hover for clusters
            this.map.on('mouseenter', 'fuel-clusters', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            
            this.map.on('mouseleave', 'fuel-clusters', () => {
                this.map.getCanvas().style.cursor = '';
            });
            
            // Change cursor on hover for markers
            this.map.on('mouseenter', 'fuel-markers', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            
            this.map.on('mouseleave', 'fuel-markers', () => {
                this.map.getCanvas().style.cursor = '';
            });
            
            this._clickHandlerAdded = true;
        }
        
        // Update clusters on zoom/move
        this.map.on('moveend', () => this._updateClusters());
        this.map.on('zoomend', () => this._updateClusters());
        
        console.log(`Rendered ${features.length} markers with clustering`);
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
        if (this.map.getLayer('fuel-cluster-count')) {
            this.map.removeLayer('fuel-cluster-count');
        }
        if (this.map.getLayer('fuel-clusters')) {
            this.map.removeLayer('fuel-clusters');
        }
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
        
        const source = this.map.getSource('fuel-stations');
        const data = source._data;
        
        // Update each feature's opacity based on whether it's inside the search circle
        data.features.forEach(feature => {
            // Skip cluster features
            if (feature.properties.cluster) return;
            
            const stationPoint = turf.point(feature.geometry.coordinates);
            const distance = turf.distance(centerPoint, stationPoint, { units: 'kilometers' });
            
            // Set opacity: 0.9 inside circle, 0.25 outside
            feature.properties.insideSearch = distance <= radiusKm ? 0.9 : 0.25;
        });
        
        // Update the source with modified data
        source.setData(data);
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
        
        const source = this.map.getSource('fuel-stations');
        const data = source._data;
        
        data.features.forEach(feature => {
            // Skip cluster features
            if (feature.properties.cluster) return;
            
            feature.properties.insideSearch = 0.9;
        });
        
        source.setData(data);
    }
}
