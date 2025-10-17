# Fuel-Finder JavaScript Modules

This directory contains the modular JavaScript code for the Fuel-Finder application. The application has been refactored from a monolithic 891-line file into separate, focused modules for better maintainability and organization.

## Module Structure

### 📊 **dataLoader.js**
- **Purpose**: Handles loading and processing of fuel data from GeoJSON
- **Key Features**:
  - Fetches fuel station data
  - Extracts unique fuel types
  - Provides data access methods
- **Exports**: `DataLoader` class

### 🗺️ **map.js**
- **Purpose**: Map initialization and core map operations
- **Key Features**:
  - Initializes MapLibre GL map
  - Manages user location marker
  - Creates and removes search circles
  - Handles geolocation requests
- **Exports**: `MapManager` class

### 📍 **markers.js**
- **Purpose**: Marker rendering and management on the map
- **Key Features**:
  - Renders fuel station markers based on filters
  - Color-codes markers by price freshness
  - Handles marker click events and popups
  - Manages marker opacity for search results
- **Exports**: `MarkerManager` class
- **Dependencies**: `utils.js`

### 🎨 **ui.js**
- **Purpose**: User interface components and interactions
- **Key Features**:
  - Creates fuel filter chips
  - Manages filter selection state
  - Handles UI event listeners (header toggle, sliders, etc.)
  - Provides access to UI state (selected filters, radius)
- **Exports**: `UIManager` class

### 🔍 **search.js**
- **Purpose**: Proximity search and results display
- **Key Features**:
  - Finds nearby stations within radius
  - Displays search results in panel
  - Creates interactive result items
  - Integrates with chart visualization
- **Exports**: `SearchManager` class
- **Dependencies**: `utils.js`

### 📈 **charts.js**
- **Purpose**: Price distribution visualization
- **Key Features**:
  - Generates price histograms
  - Calculates price statistics (min, max, avg, median)
  - Renders canvas-based charts
  - Manages distribution panel visibility
- **Exports**: `ChartManager` class

### 🛠️ **utils.js**
- **Purpose**: Shared utility functions
- **Key Features**:
  - Price freshness color calculation
  - Popup content generation
  - Loading overlay management
  - Google Maps directions integration
- **Exports**: Multiple utility functions

## Architecture

```
app.js (Main Orchestrator)
├── DataLoader (data management)
├── MapManager (map instance)
├── MarkerManager (map visualization)
│   └── uses: utils.js
├── UIManager (user interface)
├── SearchManager (search functionality)
│   └── uses: utils.js
└── ChartManager (analytics)
```

## Data Flow

1. **Initialization** (`app.js`)
   - Creates all module instances
   - Loads fuel data via `DataLoader`
   - Initializes map via `MapManager`
   - Sets up UI components via `UIManager`

2. **User Interaction**
   - User selects fuel types → `UIManager` → triggers `MarkerManager` to render
   - User clicks map → `app.js` → `SearchManager` finds stations → `ChartManager` displays stats
   - User clicks marker → `MarkerManager` → displays popup from `utils.js`

3. **State Management**
   - Fuel data: `DataLoader`
   - Map instance: `MapManager`
   - UI state: `UIManager`
   - Marker data: `MarkerManager`

## Benefits of Modular Structure

✅ **Maintainability**: Each module has a single responsibility  
✅ **Testability**: Modules can be tested independently  
✅ **Reusability**: Modules can be reused across different features  
✅ **Collaboration**: Multiple developers can work on different modules  
✅ **Performance**: Better code organization enables optimization  
✅ **Debugging**: Easier to locate and fix issues in specific modules  

## Usage

All modules are imported as ES6 modules in `app.js`:

```javascript
import { DataLoader } from './js/dataLoader.js';
import { MapManager } from './js/map.js';
// ... etc
```

The main `app.js` file orchestrates all modules through the `FuelFinderApp` class.
