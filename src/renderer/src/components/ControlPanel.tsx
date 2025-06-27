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
import { RotateCcw, Download, BarChart3, Info, Database, Plus, Minus } from 'lucide-react'

// Custom Number Input Component
interface NumberInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

function NumberInput({ id, value, onChange, placeholder, min = 0, max = 999, step = 1 }: NumberInputProps) {
  const handleIncrement = () => {
    const currentValue = parseFloat(value) || 0
    const newValue = Math.min(max, currentValue + step)
    onChange(newValue.toString())
  }

  const handleDecrement = () => {
    const currentValue = parseFloat(value) || 0
    const newValue = Math.max(min, currentValue - step)
    onChange(newValue.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Allow empty string or valid numbers
    if (inputValue === '' || (!isNaN(parseFloat(inputValue)) && isFinite(parseFloat(inputValue)))) {
      onChange(inputValue)
    }
  }

  return (
    <div className="flex w-full items-center gap-2">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        className="flex-1"
      />
      <div className="flex">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-8 rounded-r-none border-r-0"
          onClick={handleDecrement}
          disabled={parseFloat(value) <= min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-8 rounded-l-none"
          onClick={handleIncrement}
          disabled={parseFloat(value) >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

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
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={filters.view === 'top100' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('view', 'top100')}
            >
              Top 100
            </Button>
            <Button
              variant={filters.view === 'top150' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('view', 'top150')}
            >
              Top 150
            </Button>
            <Button
              variant={filters.view === 'top200' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('view', 'top200')}
            >
              Top 200
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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {availableCategories.map(category => {
                  let displayName = category.replace('z_', '').toUpperCase()
                  // Convert percentage categories to use % symbol
                  if (displayName === 'FT_PCT') displayName = 'FT%'
                  if (displayName === 'FG_PCT') displayName = 'FG%'
                  
                  const isSelected = filters.punts.includes(category)
                  
                  return (
                    <div 
                      key={category} 
                      className={`
                        flex items-center space-x-2 p-2 rounded-md border transition-colors cursor-pointer
                        ${isSelected 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-background border-border hover:bg-muted/50'
                        }
                      `}
                      onClick={() => handlePuntChange(category, !isSelected)}
                    >
                      <Checkbox
                        id={category}
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handlePuntChange(category, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={category}
                        className="text-xs font-medium leading-none cursor-pointer flex-1"
                      >
                        {displayName}
                      </Label>
                    </div>
                  )
                })}
              </div>
              
              {filters.punts.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Punting {filters.punts.length} categor{filters.punts.length === 1 ? 'y' : 'ies'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyFilters({ punts: [] })}
                      className="h-6 px-2 text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
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
            <NumberInput
              id="minGames"
              value={filters.minGames}
              onChange={(value) => handleFilterChange('minGames', value)}
              placeholder="e.g., 41"
              min={0}
              max={82}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minAvail">Min Availability %</Label>
            <NumberInput
              id="minAvail"
              value={filters.minAvail}
              onChange={(value) => handleFilterChange('minAvail', value)}
              placeholder="e.g., 50"
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minScore">Min Score</Label>
            <NumberInput
              id="minScore"
              value={filters.minScore}
              onChange={(value) => handleFilterChange('minScore', value)}
              placeholder="e.g., 2.5"
              min={-10}
              max={20}
              step={0.5}
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
    </div>
  )
}