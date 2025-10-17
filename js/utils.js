/**
 * Utility Functions
 * Helper functions for color calculation, popup creation, etc.
 */

/**
 * Get color based on price freshness (days old)
 * Green (fresh) -> Blue -> Yellow -> Orange -> Red (old)
 */
export function getPriceFreshnessColor(dateString) {
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
 * Create popup content for a station
 */
export function createPopupContent(feature) {
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
 * Open Google Maps directions
 */
export function openDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

/**
 * Show loading overlay
 */
export function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('hidden');
}
