// src/renderer/src/components/PositionEditor.tsx

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Progress } from './ui/progress'
import { useNBAStore, type Player } from '../store/nbaStore'
import { Edit, Save, X, Search, Users } from 'lucide-react'

interface PositionChange {
  id: number
  playerName: string
  originalPositions: string[]
  newPositions: string[]
}

export function PositionEditor() {
  const { filteredPlayers, applyFilters } = useNBAStore()
  const [isOpen, setIsOpen] = useState(false)
  const [positions, setPositions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [changes, setChanges] = useState<Map<number, PositionChange>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [showUnlabeledOnly, setShowUnlabeledOnly] = useState(false)

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

  // MOVED THIS FUNCTION UP: It needs to be declared before it's used below.
  const getDisplayPositions = (player: Player): string[] => {
    const change = changes.get(player.id!)
    return change ? change.newPositions : (player.positions || [])
  }

  const filteredPlayersForEditor = filteredPlayers.filter(player => {
    const matchesSearch = player.PLAYER_NAME.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    
    if (showUnlabeledOnly) {
      // This call now works because getDisplayPositions is declared above
      const displayPositions = getDisplayPositions(player)
      return displayPositions.length === 0
    }
    
    return true
  })

  // Calculate progress statistics
  const calculateProgress = () => {
    let labeledCount = 0
    let totalCount = filteredPlayers.length
    
    filteredPlayers.forEach(player => {
      // This call now works because getDisplayPositions is declared above
      const positions = getDisplayPositions(player)
      if (positions && positions.length > 0) {
        labeledCount++
      }
    })
    
    return {
      labeled: labeledCount,
      total: totalCount,
      percentage: totalCount > 0 ? (labeledCount / totalCount) * 100 : 0
    }
  }

  const progress = calculateProgress()

  const handlePositionToggle = (player: Player, position: string) => {
    if (!player.id) return

    const currentPositions = getDisplayPositions(player)
    const newPositions = currentPositions.includes(position)
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position]

    const change: PositionChange = {
      id: player.id,
      playerName: player.PLAYER_NAME,
      originalPositions: player.positions || [],
      newPositions: newPositions
    }

    const updatedChanges = new Map(changes)
    
    // If changing back to original, remove from changes
    if (JSON.stringify(change.originalPositions.sort()) === JSON.stringify(change.newPositions.sort())) {
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
        positions: change.newPositions
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
  }

  const PositionBadges = ({ player }: { player: Player }) => {
    const currentPositions = getDisplayPositions(player)
    
    return (
      <div className="flex flex-wrap gap-2">
        {positions.map(pos => {
          const isSelected = currentPositions.includes(pos)
          return (
            <Badge
              key={pos}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-white text-black hover:bg-gray-100' 
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
              onClick={() => handlePositionToggle(player, pos)}
            >
              {pos}
            </Badge>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Edit className="mr-2 h-4 w-4" />
          Edit Player Positions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Player Positions</DialogTitle>
          <DialogDescription>
            Click position badges to toggle them on/off for each player. White = selected, dark = unselected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Position Assignment Progress</span>
              </div>
              <span className="font-medium">
                {progress.labeled} / {progress.total} players ({progress.percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>

          {/* Search and Filter Controls */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-unlabeled"
                checked={showUnlabeledOnly}
                onCheckedChange={(checked) => setShowUnlabeledOnly(checked as boolean)}
              />
              <label
                htmlFor="show-unlabeled"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show unlabeled only
              </label>
            </div>
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
            {filteredPlayersForEditor.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <p className="text-lg text-muted-foreground mb-2">
                  {showUnlabeledOnly && searchTerm 
                    ? "No unlabeled players match your search"
                    : showUnlabeledOnly 
                    ? "All players have positions assigned! 🎉" 
                    : "No players match your search"}
                </p>
                {showUnlabeledOnly && filteredPlayersForEditor.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnlabeledOnly(false)}
                  >
                    Show all players
                  </Button>
                )}
              </div>
            ) : (
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="w-1/4">Player Name</TableHead>
                  <TableHead className="w-1/2">Positions (click to toggle)</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayersForEditor.map((player, index) => {
                  const hasChanges = changes.has(player.id!)

                  return (
                    <TableRow 
                      key={player.id} 
                      className={hasChanges ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {player.PLAYER_NAME}
                          {hasChanges && (
                            <Badge variant="outline" className="text-xs">
                              Modified
                            </Badge>
                          )}
                          {getDisplayPositions(player).length === 0 && (
                            <Badge variant="destructive" className="text-xs">
                              No position
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PositionBadges player={player} />
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
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}