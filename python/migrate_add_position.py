#!/usr/bin/env python3
"""
NBA Fantasy Tool - Database Migration Script
Adds position column to existing database
"""

import sqlite3
import sys
from pathlib import Path

def migrate_database(db_path):
    """Add position column to existing database"""
    
    print(f"🔄 Migrating database: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if position column already exists
        cursor.execute("PRAGMA table_info(players)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'position' in columns:
            print("✅ Position column already exists!")
            return
        
        # Add position column
        print("➕ Adding position column...")
        cursor.execute("ALTER TABLE players ADD COLUMN position TEXT")
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        # Show current structure
        cursor.execute("PRAGMA table_info(players)")
        print("\n📋 Updated table structure:")
        for col in cursor.fetchall():
            print(f"   - {col[1]} ({col[2]})")
        
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
    backup_path = db_path.with_suffix('.db.backup')
    print(f"📦 Creating backup at: {backup_path}")
    
    import shutil
    shutil.copy2(db_path, backup_path)
    print("✅ Backup created")
    
    # Run migration
    migrate_database(db_path)
    
    print("\n🎉 Migration completed! You can now use the Position Editor in your app.")

if __name__ == "__main__":
    main()