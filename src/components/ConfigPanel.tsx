
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ConfigPanelProps {
  onConnect: (url: string, key: string) => Promise<boolean>;
  onCreateTables: () => Promise<boolean>;
  isConnected: boolean;
  tablesExist: boolean;
  loadConfig: () => { url: string; key: string } | null;
  isAutoConnecting?: boolean;
}

export function ConfigPanel({ onConnect, onCreateTables, isConnected, tablesExist, loadConfig, isAutoConnecting }: ConfigPanelProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreatingTables, setIsCreatingTables] = useState(false);

  useEffect(() => {
    const config = loadConfig();
    if (config) {
      setUrl(config.url);
      setKey(config.key);
    }
  }, [loadConfig]);

  const handleConnect = async () => {
    setIsConnecting(true);
    await onConnect(url, key);
    setIsConnecting(false);
  };

  const handleCreateTables = async () => {
    setIsCreatingTables(true);
    await onCreateTables();
    setIsCreatingTables(false);
  };

  if (isConnected && tablesExist) {
    return null; // Hide panel when everything is set up
  }

  if (isAutoConnecting) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Automatisch verbinden met opgeslagen configuratie...</span>
        </div>
      </div>
    );
  }

  const getConnectionStatus = () => {
    if (!isConnected) return { text: 'Niet verbonden', className: 'text-slate-500' };
    if (!tablesExist) return { text: 'Verbonden - Tabellen vereist', className: 'text-orange-600' };
    return { text: 'Verbonden en klaar', className: 'text-green-600' };
  };

  const status = getConnectionStatus();

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-yellow-800 mb-2">🔧 Supabase Configuratie</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supabase-url" className="text-slate-700">Supabase URL</Label>
          <Input
            id="supabase-url"
            type="text"
            placeholder="https://jouwproject.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="supabase-key" className="text-slate-700">Anon Key</Label>
          <Input
            id="supabase-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isConnecting ? 'Verbinden...' : 'Verbinden'}
        </Button>
        <Button 
          onClick={handleCreateTables}
          disabled={!isConnected || tablesExist || isCreatingTables}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isCreatingTables ? 'Aanmaken...' : 'Tabellen Aanmaken'}
        </Button>
        <span className={`text-sm ${status.className}`}>
          {status.text}
        </span>
      </div>
    </div>
  );
}
