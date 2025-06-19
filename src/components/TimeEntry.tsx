import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Client {
  id: number;
  naam: string;
  created_at: string;
}

interface TimeEntryProps {
  clients: Client[];
  onAddTimeRecord: (klantId: number, klantNaam: string, uren: number, datum: string) => Promise<boolean>;
  disabled: boolean;
}

export function TimeEntry({ clients, onAddTimeRecord, disabled }: TimeEntryProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Set today's date by default
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const klantId = parseInt(selectedClientId);
    const urenWaarde = parseFloat(hours);
    
    if (!klantId || !urenWaarde || urenWaarde <= 0 || !date) {
      return;
    }

    const selectedClient = clients.find(client => client.id === klantId);
    if (!selectedClient) return;

    setIsSubmitting(true);
    const success = await onAddTimeRecord(klantId, selectedClient.naam, urenWaarde, date);
    if (success) {
      setSelectedClientId('');
      setHours('');
      // Keep today's date
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setDate(formattedDate);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Uren Invoeren</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="client-select" className="text-slate-700">Klant</Label>
          <select
            id="client-select"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
          >
            <option value="">Selecteer een klant</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.naam}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="date-input" className="text-slate-700">Datum</Label>
          <Input
            id="date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="hours-input" className="text-slate-700">Uren</Label>
          <Input
            id="hours-input"
            type="number"
            step="0.1"
            placeholder="bv. 3.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            disabled={disabled}
            className="mt-1"
          />
        </div>

        <Button 
          type="submit" 
          disabled={disabled || isSubmitting || !selectedClientId || !hours || !date}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? 'Opslaan...' : 'Uren Opslaan'}
        </Button>
      </form>
    </div>
  );
}
