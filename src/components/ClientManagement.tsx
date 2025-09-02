
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit } from 'lucide-react';
import { formatHourlyRate } from '@/lib/currency';

interface Client {
  id: number;
  naam: string;
  hourly_rate: number;
  created_at: string;
}

interface ClientManagementProps {
  clients: Client[];
  onAddClient: (naam: string, hourlyRate: number) => Promise<boolean>;
  onUpdateClient: (id: number, naam: string, hourlyRate: number) => Promise<boolean>;
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');

  const handleAddClient = async () => {
    if (!newClientName.trim() || !newClientRate.trim()) return;
    
    const rate = parseFloat(newClientRate);
    if (rate <= 0) return;
    
    setIsAdding(true);
    const success = await onAddClient(newClientName.trim(), rate);
    if (success) {
      setNewClientName('');
      setNewClientRate('');
    }
    setIsAdding(false);
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    setEditName(client.naam);
    // Add null check for hourly_rate
    setEditRate((client.hourly_rate || 0).toString());
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editName.trim() || !editRate.trim()) return;
    
    const rate = parseFloat(editRate);
    if (rate <= 0) return;
    
    const success = await onUpdateClient(editingClient.id, editName.trim(), rate);
    if (success) {
      setEditingClient(null);
      setEditName('');
      setEditRate('');
    }
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setEditName('');
    setEditRate('');
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
      </div>

      <ul className="space-y-2 max-h-48 overflow-y-auto">
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
                    </div>
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
