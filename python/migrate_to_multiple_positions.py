#!/usr/bin/env python3
"""
NBA Fantasy Tool - Migrate to Multiple Positions
Converts single position column to multiple positions format
"""

import sqlite3
import json
import sys
from pathlib import Path

def migrate_to_multiple_positions(db_path):
    """Convert single position to multiple positions JSON format"""
    
    print(f"🔄 Migrating database to support multiple positions: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current schema
        cursor.execute("PRAGMA table_info(players)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'position' in columns and 'positions' not in columns:
            print("➕ Renaming 'position' column to 'positions'...")
            cursor.execute("ALTER TABLE players RENAME COLUMN position TO positions")
            conn.commit()
        elif 'positions' not in columns:
            print("➕ Adding 'positions' column...")
            cursor.execute("ALTER TABLE players ADD COLUMN positions TEXT")
            conn.commit()
        
        # Get all players with positions
        cursor.execute("SELECT id, PLAYER_NAME, positions FROM players WHERE positions IS NOT NULL")
        players = cursor.fetchall()
        
        migrated_count = 0
        for player_id, player_name, positions_data in players:
            # Skip if already in JSON format
            if positions_data and positions_data.startswith('['):
                continue
            
            # Convert single position to array
            if positions_data:
                positions_array = [positions_data]
                positions_json = json.dumps(positions_array)
                
                cursor.execute(
                    "UPDATE players SET positions = ? WHERE id = ?",
                    (positions_json, player_id)
                )
                migrated_count += 1
                print(f"✓ {player_name}: {positions_data} → {positions_array}")
        
        conn.commit()
        print(f"\n✅ Migrated {migrated_count} players to multiple positions format")
        
        # Show sample of data
        cursor.execute("""
            SELECT PLAYER_NAME, positions 
            FROM players 
            WHERE positions IS NOT NULL 
            LIMIT 5
        """)
        
        print("\n📋 Sample migrated data:")
        for name, positions in cursor.fetchall():
            positions_list = json.loads(positions) if positions else []
            print(f"   {name}: {positions_list}")
        
        # Show position statistics
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN positions LIKE '%"PG"%' THEN 1 END) as pg_count,
                COUNT(CASE WHEN positions LIKE '%"SG"%' THEN 1 END) as sg_count,
                COUNT(CASE WHEN positions LIKE '%"SF"%' THEN 1 END) as sf_count,
                COUNT(CASE WHEN positions LIKE '%"PF"%' THEN 1 END) as pf_count,
                COUNT(CASE WHEN positions LIKE '%"C"%' THEN 1 END) as c_count,
                COUNT(CASE WHEN positions IS NULL OR positions = '[]' THEN 1 END) as no_position
            FROM players
        """)
        
        stats = cursor.fetchone()
        print("\n📊 Position Statistics:")
        print(f"   PG: {stats[0]} players")
        print(f"   SG: {stats[1]} players")
        print(f"   SF: {stats[2]} players")
        print(f"   PF: {stats[3]} players")
        print(f"   C: {stats[4]} players")
        print(f"   No position: {stats[5]} players")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

def main():
    """Main function"""
    # Define database path
    db_path = Path("/Users/williamau/Library/CloudStorage/OneDrive-ConcordiaUniversity-Canada/Projects/NBA Fantasy Tool/NBA Fantasy Tool/NBA-Fantasy-Tool/database/nba-draft.db")
    
    if not db_path.exists():
        print(f"❌ Database not found at: {db_path}")
        sys.exit(1)
    
    # Create backup
    backup_path = db_path.with_suffix('.db.backup_multi_positions')
    print(f"📦 Creating backup at: {backup_path}")
    
    import shutil
    shutil.copy2(db_path, backup_path)
    print("✅ Backup created")
    
    # Run migration
    migrate_to_multiple_positions(db_path)
    
    print("\n🎉 Migration completed!")
    print("Players can now have multiple positions assigned.")
    print("Use the Position Editor in the app to assign multiple positions to players.")

if __name__ == "__main__":
    main()