/**
 * Map Module
 * Handles map initialization and core map operations
 */

export class MapManager {
    constructor() {
        this.map = null;
        this.searchCircleId = 'search-circle';
    }

    /**
     * Initialize the MapLibre GL map
     */
    initializeMap() {
        // Create map centered on Italy using Positron style
        this.map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/positron',
            center: [12.5, 42.5], // Italy center [lng, lat]
            zoom: 6
        });
        
        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Wait for map to load
        this.map.on('load', () => {
            console.log('Map loaded successfully');
        });
        
        console.log('Map initializing...');
        
        return this.map;
    }

    /**
     * Get the map instance
     */
    getMap() {
        return this.map;
    }

    /**
     * Add a marker for user's current location
     */
    addUserLocationMarker(lng, lat) {
        // Remove existing user marker if any
        if (this.map.getSource('user-location')) {
            this.map.removeLayer('user-location-marker');
            this.map.removeLayer('user-location-pulse');
            this.map.removeSource('user-location');
        }
        
        this.map.addSource('user-location', {
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
        this.map.addLayer({
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
        this.map.addLayer({
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
     * Create search circle on the map
     */
    createSearchCircle(clickedPoint, radius) {
        // Remove previous search circle
        if (this.map.getLayer(this.searchCircleId)) {
            this.map.removeLayer(this.searchCircleId);
        }
        if (this.map.getLayer(this.searchCircleId + '-outline')) {
            this.map.removeLayer(this.searchCircleId + '-outline');
        }
        if (this.map.getSource(this.searchCircleId)) {
            this.map.removeSource(this.searchCircleId);
        }
        
        // Create circle using Turf.js
        const center = turf.point([clickedPoint.lng, clickedPoint.lat]);
        const radiusInKm = radius;
        const options = { steps: 64, units: 'kilometers' };
        const circle = turf.circle(center, radiusInKm, options);
        
        // Add circle to map
        this.map.addSource(this.searchCircleId, {
            type: 'geojson',
            data: circle
        });
        
        this.map.addLayer({
            id: this.searchCircleId,
            type: 'fill',
            source: this.searchCircleId,
            paint: {
                'fill-color': '#D97706',
                'fill-opacity': 0.15
            }
        });
        
        this.map.addLayer({
            id: this.searchCircleId + '-outline',
            type: 'line',
            source: this.searchCircleId,
            paint: {
                'line-color': '#D97706',
                'line-width': 3,
                'line-dasharray': [3, 3]
            }
        });
    }

    /**
     * Remove search circle from map
     */
    removeSearchCircle() {
        if (this.map.getLayer(this.searchCircleId)) {
            this.map.removeLayer(this.searchCircleId);
        }
        if (this.map.getLayer(this.searchCircleId + '-outline')) {
            this.map.removeLayer(this.searchCircleId + '-outline');
        }
        if (this.map.getSource(this.searchCircleId)) {
            this.map.removeSource(this.searchCircleId);
        }
    }

    /**
     * Request user's location
     */
    requestUserLocation(callback) {
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
                this.map.flyTo({
                    center: [userLng, userLat],
                    zoom: 12,
                    duration: 2000
                });
                
                // Add user location marker
                this.addUserLocationMarker(userLng, userLat);
                
                // Call callback with location
                if (callback) {
                    callback(userLng, userLat);
                }
            },
            (error) => {
                console.log('Error getting user location:', error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}
