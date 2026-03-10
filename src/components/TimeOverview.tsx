
import React, { useMemo, useState } from 'react';
import { Trash2, X, Calendar, Table, CalendarDays, Download, AlertTriangle, Pencil, Check, LayoutDashboard } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { calculateMonthlyBudget } from '@/lib/workdays';

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
  multiplication_factor: number;
  weekly_hours: number | null;
  created_at: string;
}

interface BudgetOverride {
  id: number;
  klant_id: number;
  maand: string;
  budget_uren: number;
}

interface DayOff {
  id: number;
  datum: string;
  omschrijving: string;
}

interface TimeOverviewProps {
  timeRecords: TimeRecord[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onDeleteRecord: (id: number) => Promise<boolean>;
  disabled: boolean;
  clients?: Client[];
  onDateClick?: (date: string) => void;
  daysOff?: DayOff[];
  budgetOverrides?: BudgetOverride[];
  onSaveBudgetOverride?: (klantId: number, maand: string, budgetUren: number) => Promise<boolean>;
  onDeleteBudgetOverride?: (klantId: number, maand: string) => Promise<boolean>;
}

export function TimeOverview({
  timeRecords,
  selectedMonth,
  onMonthChange,
  onDeleteRecord,
  disabled,
  clients = [],
  onDateClick,
  daysOff = [],
  budgetOverrides = [],
  onSaveBudgetOverride,
  onDeleteBudgetOverride,
}: TimeOverviewProps) {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<'table' | 'calendar' | 'summary'>('table');
  const [editingBudget, setEditingBudget] = useState<{ klantId: number; value: string } | null>(null);

  const months = useMemo(() => {
    const monthSet = new Set<string>();
    timeRecords.forEach(record => {
      monthSet.add(record.datum.substring(0, 7));
    });
    return Array.from(monthSet).sort().reverse();
  }, [timeRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...timeRecords];

    if (selectedClient !== 'all') {
      filtered = filtered.filter(record => record.klant_id.toString() === selectedClient);
    }

    if (startDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      filtered = filtered.filter(record => record.datum >= startDateStr);
    }

    if (endDate) {
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      filtered = filtered.filter(record => record.datum <= endDateStr);
    }

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
      const factor = client?.multiplication_factor || 1.25;
      const actualHours = parseFloat(record.uren.toString());
      const billedHours = actualHours * factor;
      const revenue = actualHours * hourlyRate;

      return {
        ...record,
        hourlyRate,
        factor,
        actualHours,
        billedHours,
        revenue
      };
    });
  }, [sortedRecords, clients]);

  const totals = useMemo(() => {
    const totalActualHours = enrichedRecords.reduce((total, record) => total + record.actualHours, 0);
    const totalBilledHours = enrichedRecords.reduce((total, record) => total + record.billedHours, 0);
    const totalRevenue = enrichedRecords.reduce((total, record) => total + record.revenue, 0);

    return { totalActualHours, totalBilledHours, totalRevenue };
  }, [enrichedRecords]);

  // Determine which month we're showing for budget calculations
  const activeMonth = useMemo(() => {
    if (selectedMonth !== 'all') return selectedMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const daysOffDates = useMemo(() => daysOff.map(d => d.datum), [daysOff]);

  // Client summary with calculated/overridden monthly budgets
  const clientSummary = useMemo(() => {
    const [yearStr, monthStr] = activeMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const summary: Record<number, {
      client: Client;
      actualHours: number;
      billedHours: number;
      calculatedBudget: number | null;
      overrideBudget: number | null;
      activeBudget: number | null;
      isOverridden: boolean;
      percentage: number;
      remaining: number;
    }> = {};

    // Initialize for all clients with weekly_hours
    clients.forEach(client => {
      const calculatedBudget = client.weekly_hours
        ? calculateMonthlyBudget(client.weekly_hours, year, month, daysOffDates)
        : null;
      const override = budgetOverrides.find(
        o => o.klant_id === client.id && o.maand === activeMonth
      );
      const overrideBudget = override ? override.budget_uren : null;
      const activeBudget = overrideBudget ?? calculatedBudget;

      summary[client.id] = {
        client,
        actualHours: 0,
        billedHours: 0,
        calculatedBudget,
        overrideBudget,
        activeBudget,
        isOverridden: overrideBudget !== null,
        percentage: 0,
        remaining: 0,
      };
    });

    enrichedRecords.forEach(record => {
      if (!summary[record.klant_id]) return;
      summary[record.klant_id].actualHours += record.actualHours;
      summary[record.klant_id].billedHours += record.billedHours;
    });

    // Calculate percentages
    Object.values(summary).forEach(entry => {
      if (entry.activeBudget && entry.activeBudget > 0) {
        entry.percentage = (entry.billedHours / entry.activeBudget) * 100;
        entry.remaining = Math.max(0, entry.activeBudget - entry.billedHours);
      }
    });

    return Object.values(summary)
      .filter(e => e.actualHours > 0 || e.activeBudget)
      .sort((a, b) => a.client.naam.localeCompare(b.client.naam));
  }, [enrichedRecords, clients, activeMonth, daysOffDates, budgetOverrides]);

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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const handleStartEditBudget = (klantId: number, currentBudget: number | null) => {
    setEditingBudget({ klantId, value: currentBudget ? currentBudget.toString() : '' });
  };

  const handleSaveBudgetOverride = async () => {
    if (!editingBudget || !onSaveBudgetOverride) return;
    const value = parseFloat(editingBudget.value);
    if (isNaN(value) || value <= 0) return;
    await onSaveBudgetOverride(editingBudget.klantId, activeMonth, value);
    setEditingBudget(null);
  };

  const handleRemoveOverride = async (klantId: number) => {
    if (!onDeleteBudgetOverride) return;
    await onDeleteBudgetOverride(klantId, activeMonth);
  };

  const exportCSV = () => {
    const headers = ['Datum', 'Klant', 'Werkelijke uren', 'Factor', 'Gefactureerde uren', 'Tarief', 'Omzet'];
    const rows = enrichedRecords.map(record => [
      formatDate(record.datum),
      record.klant_naam,
      record.actualHours.toFixed(1),
      record.factor.toFixed(2),
      record.billedHours.toFixed(1),
      record.hourlyRate.toFixed(2),
      record.revenue.toFixed(2),
    ]);

    rows.push([]);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['Klant', 'Werkelijke uren', 'Gefactureerde uren', 'Maandbudget', 'Type budget', 'Resterend', 'Verbruikt %']);

    clientSummary.forEach(entry => {
      rows.push([
        entry.client.naam,
        entry.actualHours.toFixed(1),
        entry.billedHours.toFixed(1),
        entry.activeBudget ? entry.activeBudget.toFixed(1) : '-',
        entry.isOverridden ? 'Handmatig' : 'Berekend',
        entry.activeBudget ? entry.remaining.toFixed(1) : '-',
        entry.activeBudget ? entry.percentage.toFixed(0) + '%' : '-',
      ]);
    });

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().substring(0, 10);
    link.download = `urenregistratie-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card p-6 rounded-2xl shadow-soft border border-border/50 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-8 gradient-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-card-foreground">Urenoverzicht</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-muted rounded-xl p-1 shadow-sm">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex-1 sm:flex-none h-8 px-3"
            >
              <Table className="h-4 w-4 mr-1" />
              Tabel
            </Button>
            <Button
              variant={viewMode === 'summary' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="flex-1 sm:flex-none h-8 px-3"
            >
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Overzicht
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="flex-1 sm:flex-none h-8 px-3"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Kalender
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="rounded-xl shadow-sm"
              disabled={enrichedRecords.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground hover:text-card-foreground rounded-xl shadow-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      {(viewMode === 'table' || viewMode === 'summary') && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-6 gradient-subtle rounded-2xl border border-border/30 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Klant</label>
          <Select value={selectedClient} onValueChange={setSelectedClient} disabled={disabled}>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Van datum</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                disabled={disabled}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd-MM-yyyy") : "Selecteer datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tot datum</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                disabled={disabled}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd-MM-yyyy") : "Selecteer datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {!startDate && !endDate && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maand</label>
            <Select value={selectedMonth} onValueChange={onMonthChange} disabled={disabled}>
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
            <CalendarView timeRecords={filteredRecords} clients={clients} disabled={disabled} onDateClick={onDateClick} />
          </div>
        ) : viewMode === 'summary' ? (
          <div className="space-y-4">
            {/* Active month indicator */}
            <div className="text-sm text-muted-foreground text-center">
              Budget voor <span className="font-semibold capitalize">{formatMonthName(activeMonth)}</span>
            </div>

            {clientSummary.length === 0 ? (
              <p className="text-center text-slate-500 py-4">
                {hasActiveFilters ? "Geen uren gevonden voor de geselecteerde filters." : "Nog geen uren geregistreerd."}
              </p>
            ) : (
              clientSummary.map(entry => (
                <div key={entry.client.id} className="p-4 rounded-xl border border-border/30 gradient-subtle shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-card-foreground text-lg">{entry.client.naam}</h3>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        factor &times;{(entry.client.multiplication_factor || 1.25).toFixed(2)}
                      </span>
                      {entry.client.weekly_hours && (
                        <div className="text-xs text-muted-foreground">
                          {entry.client.weekly_hours}u/week
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Werkelijke uren</div>
                      <div className="text-lg font-bold text-card-foreground">{entry.actualHours.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Gefactureerde uren</div>
                      <div className="text-lg font-bold text-blue-600">{entry.billedHours.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                        Maandbudget
                        {entry.isOverridden && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            HANDMATIG
                          </span>
                        )}
                      </div>
                      {entry.activeBudget ? (
                        <div className="flex items-center gap-1">
                          {editingBudget?.klantId === entry.client.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.5"
                                value={editingBudget.value}
                                onChange={(e) => setEditingBudget({ ...editingBudget, value: e.target.value })}
                                className="h-7 w-20 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveBudgetOverride();
                                  if (e.key === 'Escape') setEditingBudget(null);
                                }}
                              />
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSaveBudgetOverride}>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingBudget(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="text-lg font-bold text-card-foreground">
                                {entry.activeBudget.toFixed(1)}
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                  ({entry.remaining.toFixed(1)} rest)
                                </span>
                              </div>
                              {onSaveBudgetOverride && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                  onClick={() => handleStartEditBudget(entry.client.id, entry.activeBudget)}
                                  title="Budget handmatig aanpassen"
                                >
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              )}
                              {entry.isOverridden && onDeleteBudgetOverride && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleRemoveOverride(entry.client.id)}
                                  title="Terug naar berekend budget"
                                >
                                  <X className="h-3 w-3 text-purple-500" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-lg text-muted-foreground">-</span>
                          {onSaveBudgetOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-1"
                              onClick={() => handleStartEditBudget(entry.client.id, null)}
                              title="Budget handmatig instellen"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {entry.activeBudget && entry.activeBudget > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Verbruik gefactureerde uren</span>
                        <span className={cn(
                          "font-medium",
                          entry.percentage >= 100 ? "text-red-600" :
                          entry.percentage >= 80 ? "text-orange-600" :
                          "text-green-600"
                        )}>
                          {entry.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", getProgressColor(entry.percentage))}
                          style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                        />
                      </div>
                      {entry.percentage >= 80 && entry.percentage < 100 && (
                        <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium mt-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Let op: 80% van het maandbudget is bereikt!
                        </div>
                      )}
                      {entry.percentage >= 100 && (
                        <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium mt-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Maandbudget is overschreden!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show calculated vs override info */}
                  {entry.isOverridden && entry.calculatedBudget && (
                    <div className="mt-2 text-xs text-purple-600">
                      Berekend budget zou {entry.calculatedBudget.toFixed(1)}u zijn
                    </div>
                  )}
                </div>
              ))
            )}

            {clientSummary.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-100 border border-border/30 shadow-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Totaal werkelijk</div>
                    <div className="text-lg font-bold">{totals.totalActualHours.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Totaal gefactureerd</div>
                    <div className="text-lg font-bold text-blue-600">{totals.totalBilledHours.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Totaal omzet</div>
                    <div className="text-lg font-bold text-green-800">{formatCurrency(totals.totalRevenue)}</div>
                  </div>
                </div>
              </div>
            )}
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
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">Verbind eerst met Supabase</td></tr>
            ) : enrichedRecords.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">
                {hasActiveFilters ? "Geen uren gevonden voor de geselecteerde filters." : "Geen uren gevonden voor deze periode."}
              </td></tr>
            ) : (
              enrichedRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm text-slate-700">{formatDate(record.datum)}</td>
                  <td className="p-3 text-sm text-slate-700 font-medium">{record.klant_naam}</td>
                  <td className="p-3 text-sm text-slate-700 font-bold text-right">{record.actualHours.toFixed(1)}</td>
                  <td className="p-3 text-sm text-slate-600 text-right">{record.hourlyRate > 0 ? formatCurrency(record.hourlyRate) : '-'}</td>
                  <td className={`p-3 text-sm text-right font-bold ${getRevenueColor(record.revenue)}`}>
                    {record.revenue > 0 ? formatCurrency(record.revenue) : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold">
            <tr>
              <td colSpan={2} className="p-3 text-right">Totaal{hasActiveFilters ? ' (gefilterd)' : ' deze periode'}:</td>
              <td className="p-3 text-right">{totals.totalActualHours.toFixed(1)}</td>
              <td className="p-3 text-right text-slate-600">-</td>
              <td className="p-3 text-right text-green-800 font-bold">{formatCurrency(totals.totalRevenue)}</td>
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
