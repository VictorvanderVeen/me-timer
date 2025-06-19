
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2 } from 'lucide-react';

interface Client {
  id: number;
  naam: string;
  created_at: string;
}

interface ClientManagementProps {
  clients: Client[];
  onAddClient: (naam: string) => Promise<boolean>;
  onDeleteClient: (id: number) => Promise<boolean>;
  disabled: boolean;
}

export function ClientManagement({ clients, onAddClient, onDeleteClient, disabled }: ClientManagementProps) {
  const [newClientName, setNewClientName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    
    setIsAdding(true);
    const success = await onAddClient(newClientName.trim());
    if (success) {
      setNewClientName('');
    }
    setIsAdding(false);
  };

  const handleDeleteClient = async (id: number) => {
    if (confirm('Weet je zeker dat je deze klant wilt verwijderen?')) {
      await onDeleteClient(id);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddClient();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Klanten Beheren</h2>
      
      <div className="flex items-center space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Naam nieuwe klant"
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="flex-1"
        />
        <Button 
          onClick={handleAddClient}
          disabled={disabled || isAdding || !newClientName.trim()}
          className="bg-blue-600 hover:bg-blue-700 shrink-0"
        >
          {isAdding ? 'Toevoegen...' : 'Voeg toe'}
        </Button>
      </div>

      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {disabled ? (
          <li className="text-slate-500 px-2">Verbind eerst met Supabase</li>
        ) : clients.length === 0 ? (
          <li className="text-slate-500 px-2">Voeg je eerste klant toe.</li>
        ) : (
          clients.map(client => (
            <li key={client.id} className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
              <span>{client.naam}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClient(client.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
