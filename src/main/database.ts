// Update src/main/database.ts

import sqlite3 from 'sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface Player {
  id?: number
  PLAYER_NAME: string
  GP: number
  availability_rate: number
  FT_PCT?: number
  total_score: number
  z_pts: number
  z_ast: number
  z_reb: number
  z_stl: number
  z_blk: number
  z_fg_pct: number
  z_ft_pct: number
  z_fg3m: number
  z_tov: number
  position?: string // New field for player position
}

export class DatabaseService {
  private db: sqlite3.Database | null = null
  private dbPath: string

  constructor() {
    // Use project directory instead of user data directory
    const projectRoot = app.getAppPath()
    const databaseDir = path.join(projectRoot, 'database')
    
    // Create database directory if it doesn't exist
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true })
    }
    
    this.dbPath = path.join(databaseDir, 'nba-draft.db')
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }
        
        this.createTable()
          .then(() => this.addPositionColumn())
          .then(() => resolve())
          .catch(reject)
      })
    })
  }

  private createTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const createTableSQL = `
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
          position TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `

      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  // Add position column if it doesn't exist (for migration)
  private addPositionColumn(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Check if column exists
      this.db.all("PRAGMA table_info(players)", (err, rows: any[]) => {
        if (err) {
          reject(err)
          return
        }

        const hasPositionColumn = rows.some(row => row.name === 'position')
        
        if (!hasPositionColumn) {
          // Add the column
          this.db!.run("ALTER TABLE players ADD COLUMN position TEXT", (err) => {
            if (err) {
              console.error("Error adding position column:", err)
              // Continue anyway - might already exist
            }
            resolve()
          })
        } else {
          resolve()
        }
      })
    })
  }

  async importFromCSV(csvData: Player[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Clear existing data
      this.db.run('DELETE FROM players', (err) => {
        if (err) {
          reject(err)
          return
        }

        // Insert new data
        const insertSQL = `
          INSERT INTO players (
            PLAYER_NAME, GP, availability_rate, FT_PCT, total_score,
            z_pts, z_ast, z_reb, z_stl, z_blk, z_fg_pct, z_ft_pct, z_fg3m, z_tov, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        const stmt = this.db!.prepare(insertSQL)
        
        let completed = 0
        let hasError = false

        csvData.forEach((player) => {
          stmt.run([
            player.PLAYER_NAME,
            player.GP,
            player.availability_rate,
            player.FT_PCT || null,
            player.total_score,
            player.z_pts,
            player.z_ast,
            player.z_reb,
            player.z_stl,
            player.z_blk,
            player.z_fg_pct,
            player.z_ft_pct,
            player.z_fg3m,
            player.z_tov,
            player.position || null
          ], (err) => {
            completed++
            if (err && !hasError) {
              hasError = true
              reject(err)
            } else if (completed === csvData.length && !hasError) {
              stmt.finalize()
              resolve()
            }
          })
        })
      })
    })
  }

  async getAllPlayers(): Promise<Player[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        SELECT * FROM players 
        ORDER BY total_score DESC
      `

      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows as Player[])
        }
      })
    })
  }

  async getPlayersWithFilters(filters: {
    punts?: string[]
    minGames?: number
    minAvail?: number
    minScore?: number
    searchTerm?: string
    position?: string
    limit?: number
  }): Promise<Player[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Build dynamic SQL based on filters and punts
      let selectColumns = [
        'id', 'PLAYER_NAME', 'GP', 'availability_rate', 'FT_PCT', 'position'
      ]
      
      const zColumns = ['z_pts', 'z_ast', 'z_reb', 'z_stl', 'z_blk', 'z_fg_pct', 'z_ft_pct', 'z_fg3m', 'z_tov']
      const activeCols = filters.punts ? zColumns.filter(col => !filters.punts!.includes(col)) : zColumns
      
      selectColumns = selectColumns.concat(activeCols)
      
      // Calculate total score based on non-punted columns
      const totalScoreCalc = activeCols.length > 0 
        ? activeCols.join(' + ')
        : '0'

      let sql = `
        SELECT ${selectColumns.join(', ')},
               (${totalScoreCalc}) as total_score
        FROM players
        WHERE 1=1
      `
      
      const params: any[] = []

      if (filters.minGames) {
        sql += ' AND GP >= ?'
        params.push(filters.minGames)
      }

      if (filters.minAvail) {
        sql += ' AND availability_rate >= ?'
        params.push(filters.minAvail)
      }

      if (filters.searchTerm) {
        sql += ' AND PLAYER_NAME LIKE ?'
        params.push(`%${filters.searchTerm}%`)
      }

      if (filters.position) {
        sql += ' AND position = ?'
        params.push(filters.position)
      }

      if (filters.minScore) {
        sql += ` AND (${totalScoreCalc}) >= ?`
        params.push(filters.minScore)
      }

      sql += ` ORDER BY total_score DESC`

      if (filters.limit) {
        sql += ' LIMIT ?'
        params.push(filters.limit)
      }

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows as Player[])
        }
      })
    })
  }

  async updatePlayerPosition(id: number, position: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        UPDATE players 
        SET position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `

      this.db.run(sql, [position, id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async bulkUpdatePositions(updates: { id: number, position: string | null }[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        UPDATE players 
        SET position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `

      const stmt = this.db.prepare(sql)
      let completed = 0
      let hasError = false

      updates.forEach(({ id, position }) => {
        stmt.run([position, id], (err) => {
          completed++
          if (err && !hasError) {
            hasError = true
            reject(err)
          } else if (completed === updates.length && !hasError) {
            stmt.finalize()
            resolve()
          }
        })
      })

      if (updates.length === 0) {
        stmt.finalize()
        resolve()
      }
    })
  }

  async getPlayerByName(name: string): Promise<Player | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = 'SELECT * FROM players WHERE PLAYER_NAME = ?'
      
      this.db.get(sql, [name], (err, row: any) => {
        if (err) {
          reject(err)
        } else {
          resolve(row as Player || null)
        }
      })
    })
  }

  async getStatistics(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        SELECT 
          COUNT(*) as total_players,
          AVG(total_score) as avg_score,
          MIN(total_score) as min_score,
          MAX(total_score) as max_score,
          AVG(GP) as avg_games,
          AVG(availability_rate) as avg_availability,
          COUNT(CASE WHEN GP >= 70 THEN 1 END) as players_70_plus_games,
          COUNT(CASE WHEN GP >= 50 THEN 1 END) as players_50_plus_games,
          COUNT(CASE WHEN GP < 30 THEN 1 END) as players_under_30_games,
          COUNT(CASE WHEN availability_rate >= 0.9 THEN 1 END) as players_90_plus_avail,
          COUNT(CASE WHEN availability_rate >= 0.8 THEN 1 END) as players_80_plus_avail,
          COUNT(CASE WHEN availability_rate < 0.6 THEN 1 END) as players_under_60_avail,
          COUNT(CASE WHEN position = 'PG' THEN 1 END) as count_pg,
          COUNT(CASE WHEN position = 'SG' THEN 1 END) as count_sg,
          COUNT(CASE WHEN position = 'SF' THEN 1 END) as count_sf,
          COUNT(CASE WHEN position = 'PF' THEN 1 END) as count_pf,
          COUNT(CASE WHEN position = 'C' THEN 1 END) as count_c,
          COUNT(CASE WHEN position IS NULL THEN 1 END) as count_no_position
        FROM players
      `

      this.db.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const fields = Object.keys(updates).filter(key => key !== 'id')
      const sql = `
        UPDATE players 
        SET ${fields.map(field => `${field} = ?`).join(', ')},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      
      const params = [...fields.map(field => (updates as any)[field]), id]

      this.db.run(sql, params, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async deletePlayer(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      this.db.run('DELETE FROM players WHERE id = ?', [id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve()
        return
      }

      this.db.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.db = null
          resolve()
        }
      })
    })
  }

  // Utility method to get available z columns
  getZColumns(): string[] {
    return ['z_pts', 'z_ast', 'z_reb', 'z_stl', 'z_blk', 'z_fg_pct', 'z_ft_pct', 'z_fg3m', 'z_tov']
  }

  // Get available positions
  getPositions(): string[] {
    return ['PG', 'SG', 'SF', 'PF', 'C']
  }
}