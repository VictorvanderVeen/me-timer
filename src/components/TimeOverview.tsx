
import React, { useMemo, useState } from 'react';
import { Trash2, X, Calendar, Table, CalendarDays } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

interface TimeRecord {
  id: number;
  klant_id: number;
  klant_naam: string;
  uren: number;
  datum: string;
  created_at: string;
}

interface Client {
  id: number;
  naam: string;
  hourly_rate: number;
  created_at: string;
}

interface TimeOverviewProps {
  timeRecords: TimeRecord[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onDeleteRecord: (id: number) => Promise<boolean>;
  disabled: boolean;
  clients?: Client[];
  onDateClick?: (date: string) => void;
}

export function TimeOverview({ 
  timeRecords, 
  selectedMonth, 
  onMonthChange, 
  onDeleteRecord, 
  disabled,
  clients = [],
  onDateClick
}: TimeOverviewProps) {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  const months = useMemo(() => {
    const monthSet = new Set<string>();
    timeRecords.forEach(record => {
      monthSet.add(record.datum.substring(0, 7));
    });
    return Array.from(monthSet).sort().reverse();
  }, [timeRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...timeRecords];

    // Filter op klant
    if (selectedClient !== 'all') {
      filtered = filtered.filter(record => record.klant_id.toString() === selectedClient);
    }

    // Filter op datumbereik
    if (startDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      filtered = filtered.filter(record => record.datum >= startDateStr);
    }
    
    if (endDate) {
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      filtered = filtered.filter(record => record.datum <= endDateStr);
    }

    // Legacy maand filter (alleen als geen datumbereik is ingesteld)
    if (selectedMonth !== 'all' && !startDate && !endDate) {
      filtered = filtered.filter(record => record.datum.startsWith(selectedMonth));
    }

    return filtered;
  }, [timeRecords, selectedClient, startDate, endDate, selectedMonth]);

  const sortedRecords = useMemo(() => {
    return filteredRecords.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [filteredRecords]);

  const enrichedRecords = useMemo(() => {
    return sortedRecords.map(record => {
      const client = clients.find(c => c.id === record.klant_id);
      const hourlyRate = client?.hourly_rate || 0;
      const revenue = parseFloat(record.uren.toString()) * hourlyRate;
      
      return {
        ...record,
        hourlyRate,
        revenue
      };
    });
  }, [sortedRecords, clients]);

  const totals = useMemo(() => {
    const totalHours = filteredRecords.reduce((total, record) => total + parseFloat(record.uren.toString()), 0);
    const totalRevenue = enrichedRecords.reduce((total, record) => total + record.revenue, 0);
    
    return { totalHours, totalRevenue };
  }, [filteredRecords, enrichedRecords]);

  const handleDeleteRecord = async (id: number) => {
    if (confirm('Weet je zeker dat je deze urenregistratie wilt verwijderen?')) {
      await onDeleteRecord(id);
    }
  };

  const resetFilters = () => {
    setSelectedClient('all');
    setStartDate(undefined);
    setEndDate(undefined);
    onMonthChange('all');
  };

  const hasActiveFilters = selectedClient !== 'all' || startDate || endDate || selectedMonth !== 'all';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL');
  };

  const formatMonthName = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('nl-NL', { month: 'long', year: 'numeric' });
  };

  const getRevenueColor = (revenue: number) => {
    if (revenue === 0) return 'text-slate-400';
    if (revenue < 100) return 'text-green-600';
    if (revenue < 250) return 'text-green-700';
    return 'text-green-800 font-bold';
  };

  return (
    <div className="bg-card p-6 rounded-2xl shadow-soft border border-border/50 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-8 gradient-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-card-foreground">Urenoverzicht</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-xl p-1 shadow-sm">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex-1 sm:flex-none h-8 px-4"
            >
              <Table className="h-4 w-4 mr-2" />
              Tabel
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="flex-1 sm:flex-none h-8 px-4"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Kalender
            </Button>
          </div>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-card-foreground rounded-xl shadow-sm"
            >
              <X className="h-4 w-4 mr-2" />
              Reset filters
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls - alleen zichtbaar in tabelweergave */}
      {viewMode === 'table' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-6 gradient-subtle rounded-2xl border border-border/30 shadow-sm">
        {/* Klant Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Klant</label>
          <Select 
            value={selectedClient} 
            onValueChange={setSelectedClient}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Alle klanten" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle klanten</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.naam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Datum */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Van datum</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd-MM-yyyy") : "Selecteer datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Datum */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tot datum</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd-MM-yyyy") : "Selecteer datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Legacy Maand Filter (alleen zichtbaar als geen datumbereik) */}
        {!startDate && !endDate && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maand</label>
            <Select
              value={selectedMonth}
              onValueChange={onMonthChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Maanden</SelectItem>
                {months.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        </div>
      )}

      {/* Content */}
      <div className="overflow-hidden">
        {viewMode === 'calendar' ? (
          <div className="w-full">
            <CalendarView
              timeRecords={filteredRecords}
              clients={clients}
              disabled={disabled}
              onDateClick={onDateClick}
            />
          </div>
        ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-sm font-semibold tracking-wide">Datum</th>
              <th className="p-3 text-sm font-semibold tracking-wide">Klant</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Uren</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Tarief</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Omzet</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-center">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {disabled ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Verbind eerst met Supabase
                </td>
              </tr>
            ) : enrichedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  {hasActiveFilters 
                    ? "Geen uren gevonden voor de geselecteerde filters." 
                    : "Geen uren gevonden voor deze periode."
                  }
                </td>
              </tr>
            ) : (
              enrichedRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm text-slate-700">
                    {formatDate(record.datum)}
                  </td>
                  <td className="p-3 text-sm text-slate-700 font-medium">
                    {record.klant_naam}
                  </td>
                  <td className="p-3 text-sm text-slate-700 font-bold text-right">
                    {parseFloat(record.uren.toString()).toFixed(1)}
                  </td>
                  <td className="p-3 text-sm text-slate-600 text-right">
                    {record.hourlyRate > 0 ? formatCurrency(record.hourlyRate) : '-'}
                  </td>
                  <td className={`p-3 text-sm text-right font-bold ${getRevenueColor(record.revenue)}`}>
                    {record.revenue > 0 ? formatCurrency(record.revenue) : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold">
            <tr>
              <td colSpan={2} className="p-3 text-right">
                Totaal{hasActiveFilters ? ' (gefilterd)' : ' deze periode'}:
              </td>
              <td className="p-3 text-right">
                {totals.totalHours.toFixed(1)}
              </td>
              <td className="p-3 text-right text-slate-600">
                -
              </td>
              <td className="p-3 text-right text-green-800 font-bold">
                {formatCurrency(totals.totalRevenue)}
              </td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        </table>
        </div>
      )}
      </div>
    </div>
  );
}
