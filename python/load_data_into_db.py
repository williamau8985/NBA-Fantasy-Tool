#!/usr/bin/env python3
"""
NBA Fantasy Tool - CSV to Database Import Script
Loads draft_rank.csv into the SQLite database
"""

import sqlite3
import pandas as pd
import os
import sys
from pathlib import Path

def create_database_schema(cursor):
    """Create the players table if it doesn't exist"""
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        PLAYER_NAME TEXT NOT NULL UNIQUE,
        GP INTEGER NOT NULL,
        availability_rate REAL NOT NULL,
        FT_PCT REAL,
        total_score REAL NOT NULL,
        z_pts REAL NOT NULL,
        z_ast REAL NOT NULL,
        z_reb REAL NOT NULL,
        z_stl REAL NOT NULL,
        z_blk REAL NOT NULL,
        z_fg_pct REAL NOT NULL,
        z_ft_pct REAL NOT NULL,
        z_fg3m REAL NOT NULL,
        z_tov REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """
    cursor.execute(create_table_sql)
    print("✅ Database schema created/verified")

def load_csv_data(csv_path):
    """Load and process CSV data"""
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)
        print(f"✅ CSV loaded: {len(df)} rows")
        
        # Display CSV columns for verification
        print(f"📋 CSV Columns: {list(df.columns)}")
        
        # Check required columns
        required_columns = [
            'PLAYER_NAME', 'GP', 'availability_rate', 'total_score',
            'z_pts', 'z_ast', 'z_reb', 'z_stl', 'z_blk', 
            'z_fg_pct', 'z_ft_pct', 'z_fg3m', 'z_tov'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"❌ Missing required columns: {missing_columns}")
            return None
        
        # Handle optional FT_PCT column
        if 'FT_PCT' not in df.columns:
            df['FT_PCT'] = None
            print("⚠️  FT_PCT column not found, setting to NULL")
        
        # Clean data
        df = df.dropna(subset=['PLAYER_NAME'])  # Remove rows without player names
        df = df.fillna(0)  # Fill other NaN values with 0
        
        print(f"✅ Data cleaned: {len(df)} rows after cleaning")
        return df
        
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return None

def insert_data_to_db(df, cursor):
    """Insert DataFrame data into SQLite database"""
    try:
        # Clear existing data
        cursor.execute("DELETE FROM players")
        print("🗑️  Existing data cleared")
        
        # Prepare insert statement
        insert_sql = """
        INSERT INTO players (
            PLAYER_NAME, GP, availability_rate, FT_PCT, total_score,
            z_pts, z_ast, z_reb, z_stl, z_blk, z_fg_pct, z_ft_pct, z_fg3m, z_tov
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Insert data row by row
        inserted_count = 0
        for _, row in df.iterrows():
            try:
                cursor.execute(insert_sql, (
                    row['PLAYER_NAME'],
                    int(row['GP']),
                    float(row['availability_rate']),
                    float(row['FT_PCT']) if pd.notna(row['FT_PCT']) else None,
                    float(row['total_score']),
                    float(row['z_pts']),
                    float(row['z_ast']),
                    float(row['z_reb']),
                    float(row['z_stl']),
                    float(row['z_blk']),
                    float(row['z_fg_pct']),
                    float(row['z_ft_pct']),
                    float(row['z_fg3m']),
                    float(row['z_tov'])
                ))
                inserted_count += 1
            except Exception as e:
                print(f"⚠️  Error inserting {row['PLAYER_NAME']}: {e}")
        
        print(f"✅ Inserted {inserted_count} players into database")
        return inserted_count
        
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
        return 0

def verify_data(cursor):
    """Verify the data was inserted correctly"""
    try:
        # Count total players
        cursor.execute("SELECT COUNT(*) FROM players")
        total_players = cursor.fetchone()[0]
        print(f"📊 Total players in database: {total_players}")
        
        # Show top 5 players by total_score
        cursor.execute("""
            SELECT PLAYER_NAME, total_score, GP, availability_rate 
            FROM players 
            ORDER BY total_score DESC 
            LIMIT 5
        """)
        top_players = cursor.fetchall()
        
        print("\n🏆 Top 5 Players by Score:")
        print("-" * 60)
        for i, (name, score, gp, avail) in enumerate(top_players, 1):
            print(f"{i}. {name:<25} Score: {score:>6.2f} GP: {gp:>2} Avail: {avail:>5.1%}")
        
        # Show database statistics
        cursor.execute("""
            SELECT 
                AVG(total_score) as avg_score,
                MIN(total_score) as min_score,
                MAX(total_score) as max_score,
                AVG(GP) as avg_games,
                AVG(availability_rate) as avg_availability
            FROM players
        """)
        stats = cursor.fetchone()
        
        print(f"\n📈 Database Statistics:")
        print("-" * 40)
        print(f"Average Score: {stats[0]:.2f}")
        print(f"Score Range: {stats[1]:.2f} to {stats[2]:.2f}")
        print(f"Average Games: {stats[3]:.1f}")
        print(f"Average Availability: {stats[4]:.1%}")
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")

def main():
    """Main function to execute the import process"""
    print("🏀 NBA Fantasy Tool - CSV to Database Import")
    print("=" * 50)
    
    # Define paths
    script_dir = Path(__file__).parent
    csv_path = script_dir / "draft_rank.csv"
    db_path = Path("/Users/williamau/Library/CloudStorage/OneDrive-ConcordiaUniversity-Canada/Projects/NBA Fantasy Tool/NBA Fantasy Tool/NBA-Fantasy-Tool/database/nba-draft.db")
    
    # Verify CSV file exists
    if not csv_path.exists():
        print(f"❌ CSV file not found: {csv_path}")
        print(f"📁 Looking in: {script_dir}")
        print("📋 Available files:")
        for file in script_dir.glob("*.csv"):
            print(f"   - {file.name}")
        return 1
    
    # Verify database directory exists
    if not db_path.parent.exists():
        print(f"❌ Database directory not found: {db_path.parent}")
        print("Creating database directory...")
        db_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"📄 CSV file: {csv_path}")
    print(f"🗃️  Database: {db_path}")
    
    # Load CSV data
    df = load_csv_data(csv_path)
    if df is None:
        return 1
    
    # Connect to database
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        print("✅ Connected to database")
        
        # Create schema
        create_database_schema(cursor)
        
        # Insert data
        inserted_count = insert_data_to_db(df, cursor)
        
        if inserted_count > 0:
            # Commit changes
            conn.commit()
            print("✅ Changes committed to database")
            
            # Verify data
            verify_data(cursor)
            
            print(f"\n🎉 Import completed successfully!")
            print(f"📊 {inserted_count} players imported")
        else:
            print("❌ No data was inserted")
            return 1
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return 1
    finally:
        if 'conn' in locals():
            conn.close()
            print("🔒 Database connection closed")
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)