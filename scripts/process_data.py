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
        print(f"Price columns: {list(prices_df.columns)}")
        
        print("Fetching station data...")
        # Skip first row which contains extraction date
        stations_df = pd.read_csv(STATIONS_URL, sep=';', encoding='utf-8', skiprows=1, on_bad_lines='skip')
        print(f"Loaded {len(stations_df)} station records")
        print(f"Station columns: {list(stations_df.columns)}")
        
        return prices_df, stations_df
    except Exception as e:
        print(f"Error fetching data: {e}")
        sys.exit(1)

def get_column_name(df, *possible_names):
    """Find the first matching column name in the dataframe."""
    for name in possible_names:
        if name in df.columns:
            return name
    return None

def clean_and_merge_data(prices_df: pd.DataFrame, stations_df: pd.DataFrame) -> pd.DataFrame:
    """Merge and clean the data."""
    try:
        # Find the correct column names
        station_id_col = get_column_name(stations_df, 'idImpianto', 'ID Impianto', 'id_impianto', 'IdImpianto')
        price_id_col = get_column_name(prices_df, 'idImpianto', 'ID Impianto', 'id_impianto', 'IdImpianto')
        fuel_col = get_column_name(prices_df, 'descCarburante', 'Carburante', 'desccarburante', 'descrizioneCarburante')
        price_col = get_column_name(prices_df, 'prezzo', 'Prezzo', 'PREZZO')
        date_col = get_column_name(prices_df, 'dtComu', 'dtComu', 'dataComunicazione', 'Data')
        
        lat_col = get_column_name(stations_df, 'Latitudine', 'lat', 'LAT', 'latitude')
        lng_col = get_column_name(stations_df, 'Longitudine', 'lng', 'LNG', 'longitude')
        
        if not all([station_id_col, price_id_col, fuel_col, price_col, lat_col, lng_col]):
            print(f"ERROR: Could not find required columns!")
            print(f"  Station ID: {station_id_col}")
            print(f"  Price ID: {price_id_col}")
            print(f"  Fuel: {fuel_col}")
            print(f"  Price: {price_col}")
            print(f"  Lat: {lat_col}")
            print(f"  Lng: {lng_col}")
            sys.exit(1)
        
        print(f"Using column mapping:")
        print(f"  Station ID: {station_id_col} -> idImpianto")
        print(f"  Fuel: {fuel_col} -> descCarburante")
        print(f"  Price: {price_col} -> prezzo")
        print(f"  Date: {date_col} -> dtComu")
        
        # Group prices by station ID
        print("Grouping prices by station...")
        
        # Create a dictionary of prices for each station
        price_groups = {}
        price_dates = {}  # Track the date for each price
        
        for _, row in prices_df.iterrows():
            station_id = row[price_id_col]
            fuel_type = row[fuel_col]
            price = row[price_col]
            date_updated = row.get(date_col, '') if date_col else ''
            
            # Skip if any required value is missing
            if pd.isna(station_id) or pd.isna(fuel_type) or pd.isna(price):
                continue
            
            # Map to main fuel category
            main_category = get_main_fuel_category(fuel_type)
            
            if station_id not in price_groups:
                price_groups[station_id] = {}
                price_dates[station_id] = {}
            
            # Store the cheapest price for each main category
            if main_category not in price_groups[station_id]:
                price_groups[station_id][main_category] = float(price)
                price_dates[station_id][main_category] = str(date_updated)
            else:
                # Keep the minimum price for this category
                if float(price) < price_groups[station_id][main_category]:
                    price_groups[station_id][main_category] = float(price)
                    price_dates[station_id][main_category] = str(date_updated)
        
        # Add prices and dates as columns to stations dataframe
        stations_df['prices'] = stations_df[station_id_col].map(price_groups)
        stations_df['priceDates'] = stations_df[station_id_col].map(price_dates)
        
        # Remove stations without prices
        stations_df = stations_df[stations_df['prices'].notna()]
        
        # Clean latitude and longitude
        print("Cleaning coordinates...")
        stations_df[lat_col] = pd.to_numeric(stations_df[lat_col], errors='coerce')
        stations_df[lng_col] = pd.to_numeric(stations_df[lng_col], errors='coerce')
        
        # Drop stations with invalid coordinates
        initial_count = len(stations_df)
        stations_df = stations_df.dropna(subset=[lat_col, lng_col])
        removed = initial_count - len(stations_df)
        print(f"Removed {removed} stations with invalid coordinates")
        
        # Remove stations with coordinates of 0,0 or clearly invalid
        stations_df = stations_df[
            (stations_df[lat_col] != 0) & 
            (stations_df[lng_col] != 0) &
            (stations_df[lat_col].between(35, 48)) &  # Italy's latitude range
            (stations_df[lng_col].between(6, 19))    # Italy's longitude range
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
        
        # Find the correct column names
        station_id_col = get_column_name(stations_df, 'idImpianto', 'ID Impianto', 'id_impianto', 'IdImpianto')
        lat_col = get_column_name(stations_df, 'Latitudine', 'lat', 'LAT', 'latitude')
        lng_col = get_column_name(stations_df, 'Longitudine', 'lng', 'LNG', 'longitude')
        
        # Map possible column names for optional fields
        gestore_col = get_column_name(stations_df, 'Gestore', 'gestore', 'Gestore')
        bandiera_col = get_column_name(stations_df, 'Bandiera', 'bandiera', 'Bandiera')
        tipo_col = get_column_name(stations_df, 'Tipo Impianto', 'TipoImpianto', 'tipo_impianto')
        nome_col = get_column_name(stations_df, 'Nome Impianto', 'NomeImpianto', 'nome_impianto')
        indirizzo_col = get_column_name(stations_df, 'Indirizzo', 'indirizzo')
        comune_col = get_column_name(stations_df, 'Comune', 'comune')
        provincia_col = get_column_name(stations_df, 'Provincia', 'provincia')
        
        features = []
        for _, station in stations_df.iterrows():
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        float(station[lng_col]),
                        float(station[lat_col])
                    ]
                },
                "properties": {
                    "idImpianto": int(station[station_id_col]),
                    "Gestore": str(station.get(gestore_col, '')) if gestore_col else '',
                    "Bandiera": str(station.get(bandiera_col, '')) if bandiera_col else '',
                    "TipoImpianto": str(station.get(tipo_col, '')) if tipo_col else '',
                    "NomeImpianto": str(station.get(nome_col, '')) if nome_col else '',
                    "Indirizzo": str(station.get(indirizzo_col, '')) if indirizzo_col else '',
                    "Comune": str(station.get(comune_col, '')) if comune_col else '',
                    "Provincia": str(station.get(provincia_col, '')) if provincia_col else '',
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
