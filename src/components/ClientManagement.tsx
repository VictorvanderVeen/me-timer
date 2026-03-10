
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { formatHourlyRate } from '@/lib/currency';

interface Client {
  id: number;
  naam: string;
  hourly_rate: number;
  multiplication_factor: number;
  weekly_hours: number | null;
  created_at: string;
}

interface ClientManagementProps {
  clients: Client[];
  onAddClient: (naam: string, hourlyRate: number, multiplicationFactor?: number, weeklyHours?: number | null) => Promise<boolean>;
  onUpdateClient: (id: number, naam: string, hourlyRate: number, multiplicationFactor?: number, weeklyHours?: number | null) => Promise<boolean>;
  onDeleteClient: (id: number) => Promise<boolean>;
  disabled: boolean;
}

export function ClientManagement({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  disabled
}: ClientManagementProps) {
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [newClientFactor, setNewClientFactor] = useState('1.25');
  const [newClientWeeklyHours, setNewClientWeeklyHours] = useState('');
  const [showNewClientSettings, setShowNewClientSettings] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editFactor, setEditFactor] = useState('');
  const [editWeeklyHours, setEditWeeklyHours] = useState('');
  const [showEditSettings, setShowEditSettings] = useState(false);

  const handleAddClient = async () => {
    if (!newClientName.trim() || !newClientRate.trim()) return;

    const rate = parseFloat(newClientRate);
    if (rate <= 0) return;

    const factor = parseFloat(newClientFactor) || 1.25;
    const weeklyHours = newClientWeeklyHours ? parseFloat(newClientWeeklyHours) : null;

    setIsAdding(true);
    const success = await onAddClient(newClientName.trim(), rate, factor, weeklyHours);
    if (success) {
      setNewClientName('');
      setNewClientRate('');
      setNewClientFactor('1.25');
      setNewClientWeeklyHours('');
      setShowNewClientSettings(false);
    }
    setIsAdding(false);
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    setEditName(client.naam);
    setEditRate((client.hourly_rate || 0).toString());
    setEditFactor((client.multiplication_factor || 1.25).toString());
    setEditWeeklyHours(client.weekly_hours ? client.weekly_hours.toString() : '');
    setShowEditSettings(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editName.trim() || !editRate.trim()) return;

    const rate = parseFloat(editRate);
    if (rate <= 0) return;

    const factor = parseFloat(editFactor) || 1.25;
    const weeklyHours = editWeeklyHours ? parseFloat(editWeeklyHours) : null;

    const success = await onUpdateClient(editingClient.id, editName.trim(), rate, factor, weeklyHours);
    if (success) {
      setEditingClient(null);
      setEditName('');
      setEditRate('');
      setEditFactor('');
      setEditWeeklyHours('');
      setShowEditSettings(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setEditName('');
    setEditRate('');
    setEditFactor('');
    setEditWeeklyHours('');
    setShowEditSettings(false);
  };

  const handleDeleteClient = async (id: number) => {
    if (confirm('Weet je zeker dat je deze klant wilt verwijderen?')) {
      await onDeleteClient(id);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingClient) {
        handleUpdateClient();
      } else {
        handleAddClient();
      }
    }
  };

  return (
    <div className="bg-card p-6 rounded-2xl shadow-soft border border-border/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-8 gradient-secondary rounded-full"></div>
        <h2 className="text-xl font-bold text-card-foreground">Klanten Beheer</h2>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Naam nieuwe klant"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className="flex-1"
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="€/uur"
            value={newClientRate}
            onChange={(e) => setNewClientRate(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className="w-24"
          />
          <Button
            onClick={handleAddClient}
            disabled={disabled || isAdding || !newClientName.trim() || !newClientRate.trim()}
            className="gradient-secondary text-secondary-foreground font-semibold shrink-0 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            {isAdding ? 'Toevoegen...' : 'Voeg toe'}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowNewClientSettings(!showNewClientSettings)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Extra instellingen</span>
          {showNewClientSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showNewClientSettings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted/50 rounded-xl border border-border/30">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Factor</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="1.25"
                value={newClientFactor}
                onChange={(e) => setNewClientFactor(e.target.value)}
                disabled={disabled}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Weekbudget (uren/week)</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="bijv. 8 of 16"
                value={newClientWeeklyHours}
                onChange={(e) => setNewClientWeeklyHours(e.target.value)}
                disabled={disabled}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {disabled ? (
          <li className="text-slate-500 px-2">Verbind eerst met Supabase</li>
        ) : clients.length === 0 ? (
          <li className="text-slate-500 px-2">Voeg je eerste klant toe.</li>
        ) : (
          clients.map(client => (
            <li key={client.id} className="gradient-subtle p-4 rounded-xl border border-border/30 shadow-sm">
              {editingClient?.id === client.id ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 rounded-xl"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-24 rounded-xl"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEditSettings(!showEditSettings)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Facturatie-instellingen</span>
                    {showEditSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showEditSettings && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted/50 rounded-xl border border-border/30">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Factor</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editFactor}
                          onChange={(e) => setEditFactor(e.target.value)}
                          className="h-8 text-sm rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Weekbudget (uren/week)</label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="bijv. 8 of 16"
                          value={editWeeklyHours}
                          onChange={(e) => setEditWeeklyHours(e.target.value)}
                          className="h-8 text-sm rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateClient}
                      className="bg-success text-success-foreground rounded-xl"
                      disabled={!editName.trim() || !editRate.trim()}
                    >
                      Opslaan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="rounded-xl"
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-card-foreground">{client.naam}</span>
                    <div className="text-sm text-muted-foreground font-medium">
                      {formatHourlyRate(client.hourly_rate || 0)}
                      <span className="ml-2 text-xs opacity-70">
                        (&times;{(client.multiplication_factor || 1.25).toFixed(2)})
                      </span>
                    </div>
                    {client.weekly_hours && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {client.weekly_hours}u/week
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(client)}
                      className="text-accent hover:text-accent-foreground hover:bg-accent/20 p-2 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive/20 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
