# Fuel-Finder Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         index.html                          │
│                    (User Interface)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ loads (type="module")
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         app.js                              │
│                  (FuelFinderApp Class)                      │
│                    Main Orchestrator                        │
└───┬─────┬─────┬─────┬─────┬─────┬─────┬────────────────────┘
    │     │     │     │     │     │     │
    │     │     │     │     │     │     └─────────┐
    │     │     │     │     │     │               │
    ▼     ▼     ▼     ▼     ▼     ▼               ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Data   │ │  Map   │ │Markers │ │   UI   │ │ Search │ │ Charts │
│ Loader │ │Manager │ │Manager │ │Manager │ │Manager │ │Manager │
└────────┘ └────────┘ └───┬────┘ └────────┘ └───┬────┘ └────────┘
                          │                      │
                          │                      │
                          ▼                      ▼
                     ┌─────────────────────────────┐
                     │         utils.js            │
                     │    (Shared Utilities)       │
                     └─────────────────────────────┘
```

## Data Flow Diagram

```
User Action
    │
    ▼
┌─────────────────┐
│   UI Manager    │ ◄── User selects fuel type
└────────┬────────┘
         │ Triggers callback
         ▼
┌─────────────────┐
│     app.js      │ ◄── Orchestrates action
└────────┬────────┘
         │ Calls renderMarkers
         ▼
┌─────────────────┐
│ Marker Manager  │ ◄── Gets data from DataLoader
└────────┬────────┘     Uses utils for colors/popups
         │
         ▼
    Map Display
```

## Search Flow

```
User clicks map
    │
    ▼
┌─────────────────┐
│     app.js      │ ◄── handleMapClick
└────────┬────────┘
         │
         ├──────► Map Manager ──────► Create search circle
         │
         ├──────► Search Manager ────► Find nearby stations
         │                             (uses Turf.js)
         │                                 │
         │                                 ▼
         │                           ┌─────────────┐
         │                           │   Results   │
         │                           └──────┬──────┘
         │                                  │
         ├──────► Marker Manager ──────────┴──► Update opacity
         │
         └──────► Chart Manager ─────────────► Show distribution
```

## Module Dependency Graph

```
app.js (main)
│
├─► dataLoader.js (no dependencies)
│
├─► map.js (no dependencies)
│   └─► Uses: maplibregl, turf (external)
│
├─► ui.js (no dependencies)
│
├─► markers.js
│   └─► utils.js
│       └─► Uses: maplibregl (external)
│
├─► search.js
│   ├─► utils.js
│   └─► Uses: turf (external)
│
├─► charts.js (no dependencies)
│   └─► Uses: HTML Canvas API
│
└─► utils.js (no dependencies)
```

## Initialization Sequence

```
1. DOM Ready Event
   │
   ▼
2. Create FuelFinderApp instance
   │
   ▼
3. Show loading overlay (utils)
   │
   ▼
4. Initialize modules
   ├─► DataLoader
   ├─► MapManager
   ├─► UIManager
   └─► ChartManager
   │
   ▼
5. Load fuel data (DataLoader)
   │
   ▼
6. Initialize map (MapManager)
   │
   ▼
7. Create MarkerManager & SearchManager
   │   (need map instance)
   │
   ▼
8. Create fuel filters (UIManager)
   │
   ▼
9. Setup event listeners (UIManager)
   │
   ▼
10. Hide loading overlay (utils)
    │
    ▼
11. Request user location (MapManager)
    │
    ▼
12. Auto-search if filters selected
    │
    ▼
13. App ready for user interaction
```

## Class Relationships

```
┌────────────────────┐
│  FuelFinderApp     │
│  ──────────────    │
│  - dataLoader      │───────┐
│  - mapManager      │───┐   │
│  - markerManager   │─┐ │   │
│  - uiManager       │ │ │   │
│  - searchManager   │ │ │   │
│  - chartManager    │ │ │   │
└────────────────────┘ │ │   │
                       │ │   │
        ┌──────────────┘ │   │
        │  ┌─────────────┘   │
        │  │  ┌──────────────┘
        ▼  ▼  ▼
    ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
    │MarkerManager │  │MapManager   │  │DataLoader    │
    │              │  │             │  │              │
    │ - map        │  │ - map       │  │ - fuelData   │
    │ - markersData│  │ - searchId  │  │ - fuelTypes  │
    └──────────────┘  └─────────────┘  └──────────────┘
```

## Event Flow

```
User Interaction Events
│
├─► Filter chip clicked
│   └─► UIManager.toggleFuelFilter()
│       └─► Callback to app.js
│           └─► MarkerManager.renderMarkers()
│
├─► Map clicked
│   └─► app.handleMapClick()
│       ├─► MapManager.createSearchCircle()
│       ├─► SearchManager.findNearbyStations()
│       ├─► MarkerManager.updateMarkerOpacity()
│       └─► SearchManager.displayResults()
│           └─► ChartManager.showPriceDistribution()
│
├─► Marker clicked
│   └─► MarkerManager (internal handler)
│       └─► Show popup (utils.createPopupContent)
│
├─► Result item clicked
│   └─► SearchManager (internal handler)
│       └─► Map.flyTo() + Show popup
│
└─► Close results clicked
    └─► UIManager callback
        └─► app.js cleanup
            ├─► SearchManager.hide()
            ├─► ChartManager.hide()
            ├─► MapManager.removeSearchCircle()
            └─► MarkerManager.resetMarkerOpacity()
```

## State Management

```
┌─────────────────────────────────────┐
│         Application State           │
├─────────────────────────────────────┤
│ DataLoader:                         │
│   - fuelData (GeoJSON)              │
│   - allFuelTypes (Set)              │
├─────────────────────────────────────┤
│ MapManager:                         │
│   - map (MapLibre instance)         │
│   - searchCircleId                  │
├─────────────────────────────────────┤
│ MarkerManager:                      │
│   - markersData (Array)             │
│   - _clickHandlerAdded (Boolean)    │
├─────────────────────────────────────┤
│ UIManager:                          │
│   - selectedFuelTypes (Array)       │
│   - DOM element references          │
├─────────────────────────────────────┤
│ SearchManager:                      │
│   - DOM element references          │
├─────────────────────────────────────┤
│ ChartManager:                       │
│   - DOM element references          │
└─────────────────────────────────────┘
```

## Technology Stack

```
┌───────────────────────────────────┐
│         Frontend Stack            │
├───────────────────────────────────┤
│ HTML5 + CSS3                      │
│ JavaScript ES6+ Modules           │
├───────────────────────────────────┤
│ External Libraries:               │
│ - MapLibre GL JS (maps)           │
│ - Turf.js (geo calculations)      │
│ - HTML Canvas API (charts)        │
└───────────────────────────────────┘
```
