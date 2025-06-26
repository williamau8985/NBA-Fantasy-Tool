import { useRef, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { useNBAStore } from '../store/nbaStore'
import { RotateCcw, Download, BarChart3, Info, Database } from 'lucide-react'

export function ControlPanel() {
  const {
    filters,
    availableCategories,
    isLoading,
    error,
    applyFilters,
    exportFilteredData,
    getStatistics,
    loadInitialData
  } = useNBAStore()

  // Load initial data when component mounts
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    applyFilters({ [key]: value })
  }

  const handlePuntChange = (category: string, checked: boolean) => {
    const newPunts = checked 
      ? [...filters.punts, category]
      : filters.punts.filter(p => p !== category)
    applyFilters({ punts: newPunts })
  }

  const clearAllFilters = () => {
    applyFilters({
      punts: [],
      minGames: '',
      minAvail: '',
      minScore: '',
      searchTerm: '',
      view: 'all'
    })
  }

  const [statisticsText, setStatisticsText] = useState<string>('')

  const loadStatistics = async () => {
    const stats = await getStatistics()
    setStatisticsText(stats)
  }

  return (
    <div className="space-y-6">
      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">SQLite Database Connected</span>
          </div>
          <Button
            variant="outline"
            onClick={exportFilteredData}
            className="w-full mt-3"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Filtered Data
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* View Options */}
      <Card>
        <CardHeader>
          <CardTitle>View Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={filters.view === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('view', 'all')}
            >
              All
            </Button>
            <Button
              variant={filters.view === 'top20' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('view', 'top20')}
            >
              Top 20
            </Button>
            <Button
              variant={filters.view === 'top50' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('view', 'top50')}
            >
              Top 50
            </Button>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" onClick={loadStatistics}>
                <Info className="mr-2 h-4 w-4" />
                Show Statistics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>📊 NBA Draft Statistics</DialogTitle>
                <DialogDescription>
                  Comprehensive statistics from the SQLite database
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-96">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {statisticsText || 'Loading statistics...'}
                </pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Punting Categories */}
      {availableCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Punting Categories</CardTitle>
            <CardDescription>
              Exclude categories from ranking calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableCategories.map(category => {
                const displayName = category.replace('z_', '').toUpperCase()
                return (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={filters.punts.includes(category)}
                      onCheckedChange={(checked) => 
                        handlePuntChange(category, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={category}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {displayName}
                    </Label>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minGames">Min Games Played</Label>
            <Input
              id="minGames"
              type="number"
              placeholder="e.g., 41"
              value={filters.minGames}
              onChange={(e) => handleFilterChange('minGames', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minAvail">Min Availability %</Label>
            <Input
              id="minAvail"
              type="number"
              placeholder="e.g., 50"
              value={filters.minAvail}
              onChange={(e) => handleFilterChange('minAvail', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minScore">Min Score</Label>
            <Input
              id="minScore"
              type="number"
              step="0.1"
              placeholder="e.g., 2.5"
              value={filters.minScore}
              onChange={(e) => handleFilterChange('minScore', e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={clearAllFilters} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Player</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Type player name..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  )
}