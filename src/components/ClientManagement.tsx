
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
    setEditRate(client.hourly_rate.toString());
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
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Klanten Beheren</h2>
      
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
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
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
            <li key={client.id} className="bg-slate-100 p-3 rounded-md">
              {editingClient?.id === client.id ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-24"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateClient}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!editName.trim() || !editRate.trim()}
                    >
                      Opslaan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{client.naam}</span>
                    <div className="text-sm text-slate-600">
                      {formatHourlyRate(client.hourly_rate)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(client)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-500 hover:text-red-700 p-1"
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
