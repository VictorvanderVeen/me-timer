import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, CalendarOff, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { getHolidayWeekdaysInMonth, getDutchHolidayName, getWeekdaysInMonth, getAvailableWorkdays, getDutchHolidays } from '@/lib/workdays';

interface DayOff {
  id: number;
  datum: string;
  omschrijving: string;
}

interface DaysOffManagerProps {
  daysOff: DayOff[];
  onAddDayOff: (datum: string, omschrijving: string) => Promise<boolean>;
  onAddDaysOffBulk: (dates: string[], omschrijving: string) => Promise<boolean>;
  onDeleteDayOff: (id: number) => Promise<boolean>;
  onDeleteDaysOffByRange: (ids: number[]) => Promise<boolean>;
  disabled: boolean;
}

// Parse YYYY-MM-DD as local date (not UTC)
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get all weekdays between two dates (inclusive), excluding holidays
function getWeekdaysBetween(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (start > end) return dates;

  // Collect holidays for all years in range
  const holidays = new Set<string>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    getDutchHolidays(y).forEach(h => holidays.add(h));
  }

  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    const dateStr = toDateStr(current);
    if (dow >= 1 && dow <= 5 && !holidays.has(dateStr)) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function DaysOffManager({
  daysOff,
  onAddDayOff,
  onAddDaysOffBulk,
  onDeleteDayOff,
  onDeleteDaysOffByRange,
  disabled
}: DaysOffManagerProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const monthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;
  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('nl-NL', { month: 'long', year: 'numeric' });

  const daysOffThisMonth = useMemo(() => {
    return daysOff
      .filter(d => d.datum.startsWith(monthStr))
      .sort((a, b) => a.datum.localeCompare(b.datum));
  }, [daysOff, monthStr]);

  // Group consecutive days with same description
  const groupedDaysOff = useMemo(() => {
    if (daysOffThisMonth.length === 0) return [];

    const groups: { startDate: string; endDate: string; omschrijving: string; ids: number[] }[] = [];
    let current = {
      startDate: daysOffThisMonth[0].datum,
      endDate: daysOffThisMonth[0].datum,
      omschrijving: daysOffThisMonth[0].omschrijving,
      ids: [daysOffThisMonth[0].id],
    };

    for (let i = 1; i < daysOffThisMonth.length; i++) {
      const day = daysOffThisMonth[i];
      const prevEnd = new Date(current.endDate);
      const thisDate = new Date(day.datum);
      // Check if consecutive (within 3 days to account for weekends) and same description
      const diffDays = (thisDate.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3 && day.omschrijving === current.omschrijving) {
        current.endDate = day.datum;
        current.ids.push(day.id);
      } else {
        groups.push(current);
        current = {
          startDate: day.datum,
          endDate: day.datum,
          omschrijving: day.omschrijving,
          ids: [day.id],
        };
      }
    }
    groups.push(current);
    return groups;
  }, [daysOffThisMonth]);

  const holidays = useMemo(() => {
    return getHolidayWeekdaysInMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const totalWeekdays = getWeekdaysInMonth(viewYear, viewMonth);
  const daysOffDates = daysOff.map(d => d.datum);
  const availableWorkdays = getAvailableWorkdays(viewYear, viewMonth, daysOffDates);

  // Preview: how many days would be added
  const previewDays = useMemo(() => {
    if (!startDate) return 0;
    const end = endDate || startDate;
    const existingDates = new Set(daysOff.map(d => d.datum));
    const weekdays = getWeekdaysBetween(startDate, end);
    return weekdays.filter(d => !existingDates.has(d)).length;
  }, [startDate, endDate, daysOff]);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleAdd = async () => {
    if (!startDate) return;
    const end = endDate || startDate;
    const existingDates = new Set(daysOff.map(d => d.datum));
    const weekdays = getWeekdaysBetween(startDate, end).filter(d => !existingDates.has(d));

    if (weekdays.length === 0) return;

    setIsAdding(true);
    const description = newDescription.trim();

    let success: boolean;
    if (weekdays.length === 1) {
      success = await onAddDayOff(weekdays[0], description);
    } else {
      success = await onAddDaysOffBulk(weekdays, description);
    }

    if (success) {
      setStartDate('');
      setEndDate('');
      setNewDescription('');
    }
    setIsAdding(false);
  };

  const handleDeleteGroup = async (ids: number[]) => {
    const label = ids.length === 1 ? 'deze vrije dag' : `deze ${ids.length} vrije dagen`;
    if (confirm(`Weet je zeker dat je ${label} wilt verwijderen?`)) {
      await onDeleteDaysOffByRange(ids);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-card p-6 rounded-2xl shadow-soft border border-border/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-8 bg-orange-400 rounded-full"></div>
        <h2 className="text-xl font-bold text-card-foreground">Vrije Dagen</h2>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm capitalize">{monthName}</span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Workday summary */}
      <div className="text-xs text-muted-foreground mb-4 p-3 bg-muted/50 rounded-xl space-y-1">
        <div className="flex justify-between">
          <span>Werkdagen (ma-vr):</span>
          <span className="font-medium">{totalWeekdays}</span>
        </div>
        <div className="flex justify-between">
          <span>Feestdagen:</span>
          <span className="font-medium text-red-500">-{holidays.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Vrije dagen:</span>
          <span className="font-medium text-orange-500">-{daysOffThisMonth.length}</span>
        </div>
        <div className="flex justify-between border-t border-border/30 pt-1 mt-1">
          <span className="font-semibold">Beschikbare werkdagen:</span>
          <span className="font-bold">{availableWorkdays}</span>
        </div>
      </div>

      {/* Holidays this month */}
      {holidays.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Feestdagen:</div>
          <div className="space-y-1">
            {holidays.map(h => (
              <div key={h} className="flex items-center gap-2 text-xs text-red-600">
                <Flag className="h-3 w-3" />
                <span>{formatDate(h)} - {getDutchHolidayName(h)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add days off - date range */}
      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Van</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={disabled || isAdding}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tot (optioneel)</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={disabled || isAdding}
              className="text-sm"
              min={startDate}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Reden (bijv. vakantie, ziek)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={disabled || isAdding}
            className="flex-1 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button
            onClick={handleAdd}
            disabled={disabled || !startDate || isAdding || previewDays === 0}
            size="sm"
            className="shrink-0 rounded-xl"
          >
            {isAdding ? 'Bezig...' : previewDays > 1 ? `${previewDays} dagen toevoegen` : 'Toevoegen'}
          </Button>
        </div>
        {startDate && previewDays > 0 && (
          <div className="text-xs text-muted-foreground">
            {previewDays} werkdag{previewDays !== 1 ? 'en' : ''} worden toegevoegd (weekenden en feestdagen overgeslagen)
          </div>
        )}
      </div>

      {/* Days off list - grouped */}
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {groupedDaysOff.length === 0 ? (
          <li className="text-xs text-muted-foreground px-1">Geen vrije dagen deze maand</li>
        ) : (
          groupedDaysOff.map((group, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-orange-50 border border-orange-100">
              <div className="flex items-center gap-2">
                <CalendarOff className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <div>
                  {group.startDate === group.endDate ? (
                    <span className="font-medium">{formatDate(group.startDate)}</span>
                  ) : (
                    <span className="font-medium">
                      {formatDateShort(group.startDate)} - {formatDateShort(group.endDate)}
                      <span className="text-xs text-muted-foreground ml-1">({group.ids.length} dagen)</span>
                    </span>
                  )}
                  {group.omschrijving && (
                    <span className="text-muted-foreground text-xs ml-1">- {group.omschrijving}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteGroup(group.ids)}
                className="text-red-500 hover:text-red-700 p-1 h-auto shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
