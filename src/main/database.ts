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
  positions?: string[] // Changed from position to positions array
  team_id?: number | null
  team_name?: string | null
}

export interface Team {
  id?: number
  name: string
  manager?: string | null
  notes?: string | null
}

export interface TeamWithPlayers extends Team {
  players: Player[]
}

export class DatabaseService {
  private db: sqlite3.Database | null = null
  private dbPath: string

  constructor() {
    const projectRoot = app.getAppPath()
    const databaseDir = path.join(projectRoot, 'database')
    
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
        
        this.createPlayersTable()
          .then(() => this.createTeamsTables())
          .then(() => this.migrateToMultiplePositions())
          .then(() => resolve())
          .catch(reject)
      })
    })
  }

  private createPlayersTable(): Promise<void> {
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
          positions TEXT,
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

  private createTeamsTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const createTeamsSQL = `
        CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          manager TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `

      const createTeamPlayersSQL = `
        CREATE TABLE IF NOT EXISTS team_players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_id INTEGER NOT NULL,
          player_id INTEGER NOT NULL UNIQUE,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
          FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
        )
      `

      this.db.serialize(() => {
        this.db!.run('PRAGMA foreign_keys = ON')
        this.db!.run(createTeamsSQL, (err) => {
          if (err) {
            reject(err)
            return
          }

          this.db!.run(createTeamPlayersSQL, (err2) => {
            if (err2) {
              reject(err2)
            } else {
              resolve()
            }
          })
        })
      })
    })
  }

  // Migrate from single position to multiple positions
  private migrateToMultiplePositions(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Check if we need to rename column
      this.db.all("PRAGMA table_info(players)", (err, rows: any[]) => {
        if (err) {
          reject(err)
          return
        }

        const hasPositionColumn = rows.some(row => row.name === 'position')
        const hasPositionsColumn = rows.some(row => row.name === 'positions')
        
        if (hasPositionColumn && !hasPositionsColumn) {
          // Rename position to positions
          this.db!.run("ALTER TABLE players RENAME COLUMN position TO positions", (err) => {
            if (err) {
              console.error("Error renaming position column:", err)
            }
            resolve()
          })
        } else if (!hasPositionColumn && !hasPositionsColumn) {
          // Add positions column
          this.db!.run("ALTER TABLE players ADD COLUMN positions TEXT", (err) => {
            if (err) {
              console.error("Error adding positions column:", err)
            }
            resolve()
          })
        } else {
          resolve()
        }
      })
    })
  }

  // Helper to parse positions from JSON string
  private parsePositions(positionsStr: string | null): string[] {
    if (!positionsStr) return []
    try {
      return JSON.parse(positionsStr)
    } catch {
      // Handle legacy single position format
      return positionsStr ? [positionsStr] : []
    }
  }

  // Helper to stringify positions array
  private stringifyPositions(positions: string[] | null | undefined): string | null {
    if (!positions || positions.length === 0) return null
    return JSON.stringify(positions)
  }

  async importFromCSV(csvData: Player[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      this.db.serialize(() => {
        this.db!.run('DELETE FROM team_players')
        this.db!.run('DELETE FROM players', (err) => {
        if (err) {
          reject(err)
          return
        }

        const insertSQL = `
          INSERT INTO players (
            PLAYER_NAME, GP, availability_rate, FT_PCT, total_score,
            z_pts, z_ast, z_reb, z_stl, z_blk, z_fg_pct, z_ft_pct, z_fg3m, z_tov, positions
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
            this.stringifyPositions(player.positions)
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
    })
  }

  async getAllPlayers(): Promise<Player[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        SELECT p.*, tp.team_id as team_id, t.name as team_name
        FROM players p
        LEFT JOIN team_players tp ON p.id = tp.player_id
        LEFT JOIN teams t ON tp.team_id = t.id
        ORDER BY p.total_score DESC
      `

      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          // Parse positions JSON for each player
          const players = rows.map(row => ({
            ...row,
            positions: this.parsePositions(row.positions)
          }))
          resolve(players as Player[])
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

      let selectColumns = [
        'id', 'PLAYER_NAME', 'GP', 'availability_rate', 'FT_PCT', 'positions'
      ]
      
      const zColumns = ['z_pts', 'z_ast', 'z_reb', 'z_stl', 'z_blk', 'z_fg_pct', 'z_ft_pct', 'z_fg3m', 'z_tov']
      const activeCols = filters.punts ? zColumns.filter(col => !filters.punts!.includes(col)) : zColumns
      
      selectColumns = selectColumns.concat(activeCols)
      
      const totalScoreCalc = activeCols.length > 0 
        ? activeCols.join(' + ')
        : '0'

      let sql = `
        SELECT ${selectColumns.map(col => `p.${col}`).join(', ')},
               (${totalScoreCalc}) as total_score,
               tp.team_id as team_id,
               t.name as team_name
        FROM players p
        LEFT JOIN team_players tp ON p.id = tp.player_id
        LEFT JOIN teams t ON tp.team_id = t.id
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

      // Filter by position - check if positions JSON contains the position
      if (filters.position) {
        sql += ' AND positions LIKE ?'
        params.push(`%"${filters.position}"%`)
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
          // Parse positions JSON for each player
          const players = rows.map(row => ({
            ...row,
            positions: this.parsePositions(row.positions)
          }))
          resolve(players as Player[])
        }
      })
    })
  }

  async updatePlayerPositions(id: number, positions: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        UPDATE players 
        SET positions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `

      this.db.run(sql, [this.stringifyPositions(positions), id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async bulkUpdatePositions(updates: { id: number, positions: string[] }[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        UPDATE players 
        SET positions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `

      const stmt = this.db.prepare(sql)
      let completed = 0
      let hasError = false

      updates.forEach(({ id, positions }) => {
        stmt.run([this.stringifyPositions(positions), id], (err) => {
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

      const sql = `
        SELECT p.*, tp.team_id as team_id, t.name as team_name
        FROM players p
        LEFT JOIN team_players tp ON p.id = tp.player_id
        LEFT JOIN teams t ON tp.team_id = t.id
        WHERE p.PLAYER_NAME = ?
      `

      this.db.get(sql, [name], (err, row: any) => {
        if (err) {
          reject(err)
        } else if (row) {
          resolve({
            ...row,
            positions: this.parsePositions(row.positions)
          } as Player)
        } else {
          resolve(null)
        }
      })
    })
  }

  async getTeams(): Promise<TeamWithPlayers[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        SELECT
          t.id as team_id,
          t.name,
          t.manager,
          t.notes,
          p.id as player_id,
          p.PLAYER_NAME,
          p.GP,
          p.availability_rate,
          p.FT_PCT,
          p.total_score,
          p.z_pts,
          p.z_ast,
          p.z_reb,
          p.z_stl,
          p.z_blk,
          p.z_fg_pct,
          p.z_ft_pct,
          p.z_fg3m,
          p.z_tov,
          p.positions
        FROM teams t
        LEFT JOIN team_players tp ON t.id = tp.team_id
        LEFT JOIN players p ON tp.player_id = p.id
        ORDER BY t.name ASC, p.total_score DESC
      `

      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err)
          return
        }

        const teamMap = new Map<number, TeamWithPlayers>()

        rows.forEach(row => {
          const teamId = row.team_id as number
          if (!teamMap.has(teamId)) {
            teamMap.set(teamId, {
              id: teamId,
              name: row.name,
              manager: row.manager,
              notes: row.notes,
              players: []
            })
          }

          if (row.player_id) {
            const team = teamMap.get(teamId)
            if (team) {
              team.players.push({
                id: row.player_id,
                PLAYER_NAME: row.PLAYER_NAME,
                GP: row.GP,
                availability_rate: row.availability_rate,
                FT_PCT: row.FT_PCT,
                total_score: row.total_score,
                z_pts: row.z_pts,
                z_ast: row.z_ast,
                z_reb: row.z_reb,
                z_stl: row.z_stl,
                z_blk: row.z_blk,
                z_fg_pct: row.z_fg_pct,
                z_ft_pct: row.z_ft_pct,
                z_fg3m: row.z_fg3m,
                z_tov: row.z_tov,
                positions: this.parsePositions(row.positions),
                team_id: teamId,
                team_name: row.name
              })
            }
          }
        })

        const teams: TeamWithPlayers[] = rows.length === 0
          ? []
          : Array.from(teamMap.values())

        resolve(teams)
      })
    })
  }

  async createTeam(team: Team): Promise<Team> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        INSERT INTO teams (name, manager, notes)
        VALUES (?, ?, ?)
      `

      this.db.run(sql, [team.name, team.manager || null, team.notes || null], function (err) {
        if (err) {
          reject(err)
        } else {
          resolve({ ...team, id: this.lastID })
        }
      })
    })
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const fields = Object.keys(updates)
      if (fields.length === 0) {
        resolve()
        return
      }

      const sql = `
        UPDATE teams
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

  async deleteTeam(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = 'DELETE FROM teams WHERE id = ?'

      this.db.run(sql, [id], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async assignPlayerToTeam(teamId: number, playerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = `
        INSERT INTO team_players (team_id, player_id)
        VALUES (?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          team_id = excluded.team_id,
          assigned_at = CURRENT_TIMESTAMP
      `

      this.db.run(sql, [teamId, playerId], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async removePlayerFromTeam(playerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const sql = 'DELETE FROM team_players WHERE player_id = ?'

      this.db.run(sql, [playerId], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
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
          COUNT(CASE WHEN positions LIKE '%"PG"%' THEN 1 END) as count_pg,
          COUNT(CASE WHEN positions LIKE '%"SG"%' THEN 1 END) as count_sg,
          COUNT(CASE WHEN positions LIKE '%"SF"%' THEN 1 END) as count_sf,
          COUNT(CASE WHEN positions LIKE '%"PF"%' THEN 1 END) as count_pf,
          COUNT(CASE WHEN positions LIKE '%"C"%' THEN 1 END) as count_c,
          COUNT(CASE WHEN positions IS NULL OR positions = '[]' THEN 1 END) as count_no_position
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

      // Handle positions separately if included in updates
      if (updates.positions) {
        updates = {
          ...updates,
          positions: this.stringifyPositions(updates.positions) as any
        }
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

  getZColumns(): string[] {
    return ['z_pts', 'z_ast', 'z_reb', 'z_stl', 'z_blk', 'z_fg_pct', 'z_ft_pct', 'z_fg3m', 'z_tov']
  }

  getPositions(): string[] {
    return ['PG', 'SG', 'SF', 'PF', 'C']
  }
}