
import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface TimeRecord {
  id: number;
  klant_id: number;
  klant_naam: string;
  uren: number;
  datum: string;
  created_at: string;
}

interface TimeOverviewProps {
  timeRecords: TimeRecord[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onDeleteRecord: (id: number) => Promise<boolean>;
  disabled: boolean;
}

export function TimeOverview({ timeRecords, selectedMonth, onMonthChange, onDeleteRecord, disabled }: TimeOverviewProps) {
  const months = useMemo(() => {
    const monthSet = new Set<string>();
    timeRecords.forEach(record => {
      monthSet.add(record.datum.substring(0, 7));
    });
    return Array.from(monthSet).sort().reverse();
  }, [timeRecords]);

  const filteredRecords = useMemo(() => {
    if (selectedMonth === 'all') {
      return [...timeRecords];
    }
    return timeRecords.filter(record => record.datum.startsWith(selectedMonth));
  }, [timeRecords, selectedMonth]);

  const sortedRecords = useMemo(() => {
    return filteredRecords.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [filteredRecords]);

  const totalHours = useMemo(() => {
    return filteredRecords.reduce((total, record) => total + parseFloat(record.uren.toString()), 0);
  }, [filteredRecords]);

  const handleDeleteRecord = async (id: number) => {
    if (confirm('Weet je zeker dat je deze urenregistratie wilt verwijderen?')) {
      await onDeleteRecord(id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL');
  };

  const formatMonthName = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('nl-NL', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-semibold">Urenoverzicht</h2>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          disabled={disabled}
          className="px-3 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle Maanden</option>
          {months.map(month => (
            <option key={month} value={month}>
              {formatMonthName(month)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-sm font-semibold tracking-wide">Datum</th>
              <th className="p-3 text-sm font-semibold tracking-wide">Klant</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Uren</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-center">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {disabled ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  Verbind eerst met Supabase
                </td>
              </tr>
            ) : sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  Geen uren gevonden voor deze periode.
                </td>
              </tr>
            ) : (
              sortedRecords.map(record => (
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
                Totaal uren deze maand:
              </td>
              <td className="p-3 text-right">
                {totalHours.toFixed(1)}
              </td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
