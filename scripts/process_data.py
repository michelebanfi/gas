#!/usr/bin/env python3
"""
Data processing script for Fuel-Finder
Fetches, merges, cleans, and transforms Italian fuel price data into GeoJSON format.
"""

import pandas as pd
import json
import sys
from typing import Dict, List, Any

# URLs for the source data (MIMIT - Ministero delle Imprese e del Made in Italy)
PRICE_URL = "https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv"
STATIONS_URL = "https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv"

# Fuel type mapping: map specific fuels to main categories
FUEL_CATEGORIES = {
    'Benzina': [
        'Benzina', 'Benzina speciale', 'Benzina 100 ottani', 'Benzina 102 Ottani',
        'Benzina Plus 98', 'Benzina Speciale 98 Ottani', 'Benzina Energy 98 ottani',
        'Benzina Shell V Power', 'Benzina WR 100', 'Blue Super', 'Verde speciale',
        'F-101', 'F101', 'V-Power'
    ],
    'Gasolio': [
        'Gasolio', 'Gasolio Alpino', 'Gasolio Artico', 'Gasolio speciale',
        'Gasolio Artico Igloo', 'Gasolio Ecoplus', 'Gasolio Energy D',
        'Gasolio Gelo', 'Gasolio Oro Diesel', 'Gasolio Plus', 'Gasolio Premium',
        'Gasolio Prestazionale', 'Gasolio artico', 'Blu Diesel Alpino',
        'Blue Diesel', 'Diesel Shell V Power', 'DieselMax', 'E-DIESEL',
        'Excellium Diesel', 'Excellium diesel', 'GP DIESEL', 'Hi-Q Diesel',
        'HiQ Perform+', 'S-Diesel', 'Supreme Diesel', 'V-Power Diesel'
    ],
    'Gasolio HVO': [
        'HVO', 'HVO100', 'HVOlution', 'HVOvolution', 'Diesel HVO',
        'Diesel HVO Energy', 'Gasolio Bio HVO', 'Gasolio HVO', 'HVO Future',
        'HVO eco diesel', 'REHVO', 'BCHVO'
    ],
    'GPL': ['GPL'],
    'Metano': ['Metano', 'L-GNC'],
    'GNL': ['GNL']
}

def get_main_fuel_category(fuel_name: str) -> str:
    """Map a specific fuel type to its main category."""
    for category, fuels in FUEL_CATEGORIES.items():
        if fuel_name in fuels:
            return category
    # If not found in mapping, return as-is
    return fuel_name

def fetch_data() -> tuple:
    """Fetch the two CSV files from their URLs."""
    try:
        print("Fetching price data...")
        # Skip first row which contains extraction date
        prices_df = pd.read_csv(PRICE_URL, sep=';', encoding='utf-8', skiprows=1)
        print(f"Loaded {len(prices_df)} price records")
        
        print("Fetching station data...")
        # Skip first row which contains extraction date
        stations_df = pd.read_csv(STATIONS_URL, sep=';', encoding='utf-8', skiprows=1, on_bad_lines='skip')
        print(f"Loaded {len(stations_df)} station records")
        
        return prices_df, stations_df
    except Exception as e:
        print(f"Error fetching data: {e}")
        sys.exit(1)

def clean_and_merge_data(prices_df: pd.DataFrame, stations_df: pd.DataFrame) -> pd.DataFrame:
    """Merge and clean the data."""
    try:
        # Group prices by station ID
        print("Grouping prices by station...")
        
        # Create a dictionary of prices for each station
        price_groups = {}
        price_dates = {}  # Track the date for each price
        
        for _, row in prices_df.iterrows():
            station_id = row['idImpianto']
            fuel_type = row['descCarburante']
            price = row['prezzo']
            date_updated = row.get('dtComu', '')
            
            # Map to main fuel category
            main_category = get_main_fuel_category(fuel_type)
            
            if station_id not in price_groups:
                price_groups[station_id] = {}
                price_dates[station_id] = {}
            
            # Store the cheapest price for each main category
            if main_category not in price_groups[station_id]:
                price_groups[station_id][main_category] = float(price)
                price_dates[station_id][main_category] = date_updated
            else:
                # Keep the minimum price for this category
                if float(price) < price_groups[station_id][main_category]:
                    price_groups[station_id][main_category] = float(price)
                    price_dates[station_id][main_category] = date_updated
        
        # Add prices and dates as columns to stations dataframe
        stations_df['prices'] = stations_df['idImpianto'].map(price_groups)
        stations_df['priceDates'] = stations_df['idImpianto'].map(price_dates)
        
        # Remove stations without prices
        stations_df = stations_df[stations_df['prices'].notna()]
        
        # Clean latitude and longitude
        print("Cleaning coordinates...")
        stations_df['Latitudine'] = pd.to_numeric(stations_df['Latitudine'], errors='coerce')
        stations_df['Longitudine'] = pd.to_numeric(stations_df['Longitudine'], errors='coerce')
        
        # Drop stations with invalid coordinates
        initial_count = len(stations_df)
        stations_df = stations_df.dropna(subset=['Latitudine', 'Longitudine'])
        removed = initial_count - len(stations_df)
        print(f"Removed {removed} stations with invalid coordinates")
        
        # Remove stations with coordinates of 0,0 or clearly invalid
        stations_df = stations_df[
            (stations_df['Latitudine'] != 0) & 
            (stations_df['Longitudine'] != 0) &
            (stations_df['Latitudine'].between(35, 48)) &  # Italy's latitude range
            (stations_df['Longitudine'].between(6, 19))    # Italy's longitude range
        ]
        
        print(f"Final dataset: {len(stations_df)} stations with valid data")
        return stations_df
    except Exception as e:
        print(f"Error cleaning data: {e}")
        sys.exit(1)

def create_geojson(stations_df: pd.DataFrame) -> Dict[str, Any]:
    """Convert the cleaned data into GeoJSON format."""
    try:
        print("Creating GeoJSON structure...")
        
        features = []
        for _, station in stations_df.iterrows():
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        float(station['Longitudine']),
                        float(station['Latitudine'])
                    ]
                },
                "properties": {
                    "idImpianto": int(station['idImpianto']),
                    "Gestore": str(station.get('Gestore', '')),
                    "Bandiera": str(station.get('Bandiera', '')),
                    "TipoImpianto": str(station.get('Tipo Impianto', '')),
                    "NomeImpianto": str(station.get('Nome Impianto', '')),
                    "Indirizzo": str(station.get('Indirizzo', '')),
                    "Comune": str(station.get('Comune', '')),
                    "Provincia": str(station.get('Provincia', '')),
                    "prices": station['prices'],
                    "priceDates": station.get('priceDates', {})
                }
            }
            features.append(feature)
        
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        print(f"Created GeoJSON with {len(features)} features")
        return geojson
    except Exception as e:
        print(f"Error creating GeoJSON: {e}")
        sys.exit(1)

def save_geojson(geojson: Dict[str, Any], filename: str = 'fuel_data.geojson'):
    """Save the GeoJSON to a file."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        print(f"Successfully saved {filename}")
    except Exception as e:
        print(f"Error saving GeoJSON: {e}")
        sys.exit(1)

def main():
    """Main processing pipeline."""
    print("=== Starting Fuel Data Processing ===")
    
    # Fetch data
    prices_df, stations_df = fetch_data()
    
    # Clean and merge
    merged_df = clean_and_merge_data(prices_df, stations_df)
    
    # Create GeoJSON
    geojson = create_geojson(merged_df)
    
    # Save to file
    save_geojson(geojson)
    
    print("=== Processing Complete ===")

if __name__ == "__main__":
    main()
