// src/renderer/src/components/PositionEditor.tsx

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { useNBAStore, type Player } from '../store/nbaStore'
import { Edit, Save, X, Search, RotateCcw } from 'lucide-react'

interface PositionChange {
  id: number
  playerName: string
  originalPosition: string | null
  newPosition: string | null
}

export function PositionEditor() {
  const { filteredPlayers, applyFilters } = useNBAStore()
  const [isOpen, setIsOpen] = useState(false)
  const [positions, setPositions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [changes, setChanges] = useState<Map<number, PositionChange>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  // Load available positions
  useEffect(() => {
    const loadPositions = async () => {
      try {
        const availablePositions = await window.api.db.getPositions()
        setPositions(availablePositions)
      } catch (error) {
        console.error('Failed to load positions:', error)
      }
    }
    loadPositions()
  }, [])

  const filteredPlayersForEditor = filteredPlayers.filter(player =>
    player.PLAYER_NAME.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePositionChange = (player: Player, newPosition: string | null) => {
    if (!player.id) return

    const change: PositionChange = {
      id: player.id,
      playerName: player.PLAYER_NAME,
      originalPosition: player.position || null,
      newPosition: newPosition === 'none' ? null : newPosition
    }

    const updatedChanges = new Map(changes)
    
    // If changing back to original, remove from changes
    if (change.originalPosition === change.newPosition) {
      updatedChanges.delete(player.id)
    } else {
      updatedChanges.set(player.id, change)
    }

    setChanges(updatedChanges)
  }

  const handleSaveChanges = async () => {
    if (changes.size === 0) return

    setIsSaving(true)
    try {
      const updates = Array.from(changes.values()).map(change => ({
        id: change.id,
        position: change.newPosition
      }))

      await window.api.db.bulkUpdatePositions(updates)
      
      // Refresh the player list
      await applyFilters({})
      
      // Clear changes and close dialog
      setChanges(new Map())
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to save position changes:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelChanges = () => {
    setChanges(new Map())
    setEditingId(null)
  }

  const getPositionBadgeVariant = (position: string | null | undefined): "default" | "secondary" | "outline" => {
    if (!position) return "outline"
    switch (position) {
      case 'PG': return "default"
      case 'SG': return "default"
      case 'SF': return "secondary"
      case 'PF': return "secondary"
      case 'C': return "secondary"
      default: return "outline"
    }
  }

  const getDisplayPosition = (player: Player): string | null => {
    const change = changes.get(player.id!)
    return change ? change.newPosition : (player.position || null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Edit className="mr-2 h-4 w-4" />
          Edit Player Positions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Player Positions</DialogTitle>
          <DialogDescription>
            Assign or update positions for players. Changes will be saved to the database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Changes Summary */}
          {changes.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">
                {changes.size} unsaved change{changes.size > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelChanges}
                  disabled={isSaving}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Player List */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Player Name</TableHead>
                  <TableHead>Current Position</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayersForEditor.map((player, index) => {
                  const isEditing = editingId === player.id
                  const hasChanges = changes.has(player.id!)
                  const displayPosition = getDisplayPosition(player)

                  return (
                    <TableRow 
                      key={player.id} 
                      className={hasChanges ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.PLAYER_NAME}
                        {hasChanges && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Modified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={displayPosition || ''}
                              onValueChange={(value) => {
                                handlePositionChange(player, value)
                                setEditingId(null)
                              }}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {positions.map(pos => (
                                  <SelectItem key={pos} value={pos}>
                                    {pos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setEditingId(player.id!)}
                          >
                            {displayPosition ? (
                              <Badge variant={getPositionBadgeVariant(displayPosition)}>
                                {displayPosition}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                No position
                              </span>
                            )}
                            <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {player.total_score.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {player.GP}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}