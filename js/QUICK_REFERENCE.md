# Quick Reference: Fuel-Finder Modules

## 🚀 Quick Start for Developers

### File Structure
```
js/
├── dataLoader.js    → Load & manage fuel data
├── map.js           → Map instance & geolocation
├── markers.js       → Render & manage markers
├── ui.js            → Filters, sliders, UI events
├── search.js        → Proximity search & results
├── charts.js        → Price charts & statistics
└── utils.js         → Shared helpers
```

## 📝 Common Tasks

### Adding a New Fuel Filter Feature
→ Edit: `js/ui.js` (UIManager class)

### Changing Marker Colors or Style
→ Edit: `js/markers.js` (MarkerManager.renderMarkers)

### Modifying Search Algorithm
→ Edit: `js/search.js` (SearchManager.findNearbyStations)

### Updating Chart Visualization
→ Edit: `js/charts.js` (ChartManager.drawHistogram)

### Changing Map Behavior
→ Edit: `js/map.js` (MapManager methods)

### Adding New Data Source
→ Edit: `js/dataLoader.js` (DataLoader.loadFuelData)

### Adding Utility Functions
→ Edit: `js/utils.js` (export new functions)

## 🔧 Module Cheat Sheet

### DataLoader
```javascript
const dataLoader = new DataLoader();
await dataLoader.loadFuelData();
const data = dataLoader.getFuelData();
const types = dataLoader.getAllFuelTypes();
```

### MapManager
```javascript
const mapManager = new MapManager();
mapManager.initializeMap();
const map = mapManager.getMap();
mapManager.createSearchCircle(point, radius);
mapManager.addUserLocationMarker(lng, lat);
```

### MarkerManager
```javascript
const markerManager = new MarkerManager(map);
markerManager.renderMarkers(fuelData, selectedTypes);
markerManager.clearMarkers();
markerManager.updateMarkerOpacity(center, radius);
```

### UIManager
```javascript
const uiManager = new UIManager();
uiManager.createFuelFilters(types, onChange);
const selected = uiManager.getSelectedFuelTypes();
const radius = uiManager.getRadius();
```

### SearchManager
```javascript
const searchManager = new SearchManager(map, chartManager);
const stations = searchManager.findNearbyStations(data, types, point, radius);
searchManager.displayResults(stations);
```

### ChartManager
```javascript
const chartManager = new ChartManager();
chartManager.showPriceDistribution(stations);
chartManager.hide();
```

### Utils
```javascript
import { getPriceFreshnessColor, createPopupContent, openDirections } from './utils.js';
const color = getPriceFreshnessColor(dateString);
const html = createPopupContent(feature);
openDirections(lat, lng);
```

## 🐛 Debugging Tips

### Module Loading Issues
- Check browser console for import errors
- Verify file paths in import statements
- Ensure `type="module"` in index.html

### Runtime Errors
- Each module has isolated scope
- Use browser DevTools to set breakpoints
- Check module exports/imports match

### State Issues
- State is managed by individual modules
- Check the correct manager instance
- Verify data flow through app.js orchestrator

## 📚 File Locations

**Need to change the UI?** → `js/ui.js`  
**Map not working?** → `js/map.js`  
**Markers wrong?** → `js/markers.js`  
**Search broken?** → `js/search.js`  
**Charts incorrect?** → `js/charts.js`  
**Data not loading?** → `js/dataLoader.js`  
**Helper function?** → `js/utils.js`  
**App initialization?** → `app.js`

## ⚡ Performance Tips

- Modules are loaded once and cached
- Each module initializes only what it needs
- Marker rendering is optimized in MarkerManager
- Search uses Turf.js for efficient geo calculations
- Chart rendering uses HTML Canvas for performance

## 🎯 Best Practices

1. **Keep modules focused**: One responsibility per module
2. **Use clear exports**: Export only what's needed
3. **Document changes**: Update README.md when adding features
4. **Test individually**: Each module can be tested independently
5. **Follow patterns**: Match existing code style in each module
