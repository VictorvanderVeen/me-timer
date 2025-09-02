import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
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

interface CalendarViewProps {
  timeRecords: TimeRecord[];
  clients: Client[];
  disabled: boolean;
  onDateClick?: (date: string) => void; // Format: YYYY-MM-DD
}

type ViewType = 'week' | 'month';

export function CalendarView({ timeRecords, clients, disabled, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');

  const enrichedRecords = useMemo(() => {
    return timeRecords.map(record => {
      const client = clients.find(c => c.id === record.klant_id);
      const hourlyRate = client?.hourly_rate || 0;
      const revenue = parseFloat(record.uren.toString()) * hourlyRate;
      
      return {
        ...record,
        hourlyRate,
        revenue
      };
    });
  }, [timeRecords, clients]);

  const getDateRange = () => {
    if (viewType === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewType === 'week') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const getRecordsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return enrichedRecords.filter(record => record.datum === dateString);
  };

  const renderWeekView = () => {
    const { start } = getDateRange();
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {days.map(day => (
          <div key={day.toISOString()} className="p-2 text-center font-medium text-sm bg-slate-100 border-r last:border-r-0">
            <div className="text-slate-600">
              {format(day, 'EEE', { locale: nl })}
            </div>
            <div className="text-lg font-bold text-slate-800">
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Content */}
        {days.map(day => {
          const dayRecords = getRecordsForDate(day);
          const totalHours = dayRecords.reduce((sum, record) => sum + parseFloat(record.uren.toString()), 0);
          const totalRevenue = dayRecords.reduce((sum, record) => sum + record.revenue, 0);
          
          return (
            <div 
              key={day.toISOString()} 
              className="min-h-[200px] p-2 border-r last:border-r-0 border-b bg-white hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onDateClick && onDateClick(format(day, 'yyyy-MM-dd'))}
              title={`Klik om uren toe te voegen voor ${format(day, 'd MMM', { locale: nl })}`}
            >
              {dayRecords.length > 0 && (
                <div className="space-y-1">
                  {dayRecords.map(record => (
                    <div key={record.id} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                      <div className="font-medium text-blue-800 truncate">
                        {record.klant_naam}
                      </div>
                      <div className="text-blue-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {parseFloat(record.uren.toString()).toFixed(1)}u
                      </div>
                      {record.revenue > 0 && (
                        <div className="text-green-600 font-medium">
                          {formatCurrency(record.revenue)}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {dayRecords.length > 1 && (
                    <div className="text-xs pt-2 border-t border-slate-200">
                      <div className="font-bold text-slate-700">
                        Totaal: {totalHours.toFixed(1)}u
                      </div>
                      {totalRevenue > 0 && (
                        <div className="font-bold text-green-700">
                          {formatCurrency(totalRevenue)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const { start, end } = getDateRange();
    const startDate = startOfWeek(start, { weekStartsOn: 1 });
    const endDate = endOfWeek(end, { weekStartsOn: 1 });
    
    const days = [];
    let currentDay = startDate;
    
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-7 gap-1">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-sm text-slate-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map(day => {
              const dayRecords = getRecordsForDate(day);
              const totalHours = dayRecords.reduce((sum, record) => sum + parseFloat(record.uren.toString()), 0);
              const totalRevenue = dayRecords.reduce((sum, record) => sum + record.revenue, 0);
              const isCurrentMonth = day >= start && day <= end;
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[100px] p-1 border rounded cursor-pointer transition-colors ${
                    isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'
                  } ${isSameDay(day, new Date()) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => onDateClick && onDateClick(format(day, 'yyyy-MM-dd'))}
                  title={`Klik om uren toe te voegen voor ${format(day, 'd MMM', { locale: nl })}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  {dayRecords.length > 0 && isCurrentMonth && (
                    <div className="space-y-1">
                      {dayRecords.slice(0, 2).map(record => (
                        <div key={record.id} className="text-xs p-1 bg-blue-50 rounded">
                          <div className="font-medium text-blue-800 truncate">
                            {record.klant_naam}
                          </div>
                          <div className="text-blue-600">
                            {parseFloat(record.uren.toString()).toFixed(1)}u
                          </div>
                        </div>
                      ))}
                      
                      {dayRecords.length > 2 && (
                        <div className="text-xs text-slate-600">
                          +{dayRecords.length - 2} meer
                        </div>
                      )}
                      
                      {dayRecords.length > 1 && (
                        <div className="text-xs font-bold text-slate-700 border-t pt-1">
                          {totalHours.toFixed(1)}u
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (disabled) {
    return (
      <div className="p-8 text-center text-slate-500">
        Verbind eerst met Supabase om de kalenderview te gebruiken
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {viewType === 'week' 
              ? `Week van ${format(getDateRange().start, 'd MMM', { locale: nl })} - ${format(getDateRange().end, 'd MMM yyyy', { locale: nl })}`
              : format(currentDate, 'MMMM yyyy', { locale: nl })
            }
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewType === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('week')}
          >
            Week
          </Button>
          <Button
            variant={viewType === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('month')}
          >
            Maand
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Vandaag
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="border rounded-lg overflow-hidden">
        {viewType === 'week' ? renderWeekView() : renderMonthView()}
      </div>
    </div>
  );
}