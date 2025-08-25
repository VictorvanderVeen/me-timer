import React, { useState, useEffect } from 'react';
import { ConfigPanel } from './ConfigPanel';
import { ClientManagement } from './ClientManagement';
import { TimeEntry } from './TimeEntry';
import { TimeOverview } from './TimeOverview';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface Client {
  id: number;
  naam: string;
  hourly_rate: number;
  created_at: string;
}

interface TimeRecord {
  id: number;
  klant_id: number;
  klant_naam: string;
  uren: number;
  datum: string;
  created_at: string;
}

export function TimeTrackingApp() {
  const [supabase, setSupabase] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tablesExist, setTablesExist] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  const saveConfig = (url: string, key: string) => {
    localStorage.setItem('supabase-config', JSON.stringify({ url, key }));
  };

  const loadConfig = () => {
    const config = localStorage.getItem('supabase-config');
    if (config) {
      return JSON.parse(config);
    }
    return null;
  };

  const connectToSupabase = async (url: string, key: string) => {
    if (!url || !key) {
      toast.error('Vul alle velden in');
      return false;
    }

    try {
      const supabaseClient = createClient(url, key);
      
      // Test the connection by trying to access the klanten table
      const { data, error } = await supabaseClient.from('klanten').select('count', { count: 'exact', head: true });
      
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, but connection works
        setSupabase(supabaseClient);
        setIsConnected(true);
        setTablesExist(false);
        saveConfig(url, key);
        toast.error('Verbonden met Supabase, maar tabellen bestaan niet! Maak eerst de tabellen aan in je Supabase dashboard.');
        console.log('Voer deze SQL uit in je Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS klanten (
    id SERIAL PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,
    hourly_rate DECIMAL(8,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uren (
    id SERIAL PRIMARY KEY,
    klant_id INTEGER REFERENCES klanten(id) ON DELETE CASCADE,
    klant_naam VARCHAR(255) NOT NULL,
    uren DECIMAL(4,1) NOT NULL,
    datum DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optioneel)
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE uren ENABLE ROW LEVEL SECURITY;

-- Create policies (voor publieke toegang)
CREATE POLICY "Enable all operations for all users" ON klanten FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON uren FOR ALL USING (true);
        `);
        return true;
      } else if (error) {
        throw error;
      } else {
        // Everything works
        setSupabase(supabaseClient);
        setIsConnected(true);
        setTablesExist(true);
        saveConfig(url, key);
        toast.success('Verbinding succesvol!');
        await loadData(supabaseClient);
        return true;
      }
    } catch (error: any) {
      console.error('Verbindingsfout:', error);
      toast.error('Verbindingsfout: ' + error.message);
      return false;
    }
  };

  const createTables = async () => {
    if (!supabase) return false;

    try {
      // Test if tables exist now
      const { data, error } = await supabase.from('klanten').select('count', { count: 'exact', head: true });
      
      if (!error) {
        // Tables exist now!
        setTablesExist(true);
        toast.success('Tabellen gevonden! Laden van data...');
        await loadData(supabase);
        return true;
      } else if (error.code === 'PGRST116') {
        // Still don't exist
        toast.error('Tabellen bestaan nog steeds niet. Voer de SQL uit in je Supabase dashboard en probeer opnieuw.');
        console.log('SQL om uit te voeren in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS klanten (
    id SERIAL PRIMARY KEY,
    naam VARCHAR(255) NOT NULL,
    hourly_rate DECIMAL(8,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uren (
    id SERIAL PRIMARY KEY,
    klant_id INTEGER REFERENCES klanten(id) ON DELETE CASCADE,
    klant_naam VARCHAR(255) NOT NULL,
    uren DECIMAL(4,1) NOT NULL,
    datum DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE uren ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for all users" ON klanten FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON uren FOR ALL USING (true);
        `);
        return false;
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error('Fout bij controleren tabellen:', error);
      toast.error('Fout bij controleren tabellen: ' + error.message);
      return false;
    }
  };

  const loadData = async (supabaseClient = supabase) => {
    if (!supabaseClient) return;
    
    try {
      // Load clients
      const { data: klantenData, error: klantenError } = await supabaseClient
        .from('klanten')
        .select('*')
        .order('naam');
      
      if (klantenError) throw klantenError;
      setClients(klantenData || []);

      // Load time records
      const { data: urenData, error: urenError } = await supabaseClient
        .from('uren')
        .select('*')
        .order('datum', { ascending: false });
      
      if (urenError) throw urenError;
      setTimeRecords(urenData || []);
      setTablesExist(true);
      
    } catch (error: any) {
      console.error('Fout bij laden data:', error);
      toast.error('Fout bij laden data: ' + error.message);
    }
  };

  const addClient = async (naam: string, hourlyRate: number) => {
    if (!naam || !supabase || hourlyRate <= 0) return false;
    
    try {
      const { data, error } = await supabase
        .from('klanten')
        .insert([{ naam, hourly_rate: hourlyRate }])
        .select();
      
      if (error) throw error;
      
      setClients(prev => [...prev, data[0]]);
      toast.success('Klant succesvol toegevoegd!');
      return true;
    } catch (error: any) {
      console.error('Fout bij toevoegen klant:', error);
      toast.error('Fout bij toevoegen klant: ' + error.message);
      return false;
    }
  };

  const updateClient = async (id: number, naam: string, hourlyRate: number) => {
    if (!supabase || hourlyRate <= 0) return false;
    
    try {
      const { data, error } = await supabase
        .from('klanten')
        .update({ naam, hourly_rate: hourlyRate })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      setClients(prev => prev.map(client => 
        client.id === id ? data[0] : client
      ));
      
      // Update client names in existing time records
      setTimeRecords(prev => prev.map(record => 
        record.klant_id === id ? { ...record, klant_naam: naam } : record
      ));
      
      toast.success('Klant bijgewerkt!');
      return true;
    } catch (error: any) {
      console.error('Fout bij bijwerken klant:', error);
      toast.error('Fout bij bijwerken klant: ' + error.message);
      return false;
    }
  };

  const deleteClient = async (id: number) => {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('klanten')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setClients(prev => prev.filter(client => client.id !== id));
      setTimeRecords(prev => prev.filter(record => record.klant_id !== id));
      toast.success('Klant verwijderd.');
      return true;
    } catch (error: any) {
      console.error('Fout bij verwijderen klant:', error);
      toast.error('Fout bij verwijderen klant: ' + error.message);
      return false;
    }
  };

  const addTimeRecord = async (klantId: number, klantNaam: string, uren: number, datum: string) => {
    if (!supabase) return false;
    
    try {
      const { data, error } = await supabase
        .from('uren')
        .insert([{ 
          klant_id: klantId, 
          klant_naam: klantNaam, 
          uren: uren, 
          datum 
        }])
        .select();
      
      if (error) throw error;
      
      setTimeRecords(prev => [data[0], ...prev]);
      toast.success('Uren succesvol opgeslagen!');
      return true;
    } catch (error: any) {
      console.error('Fout bij opslaan uren:', error);
      toast.error('Fout bij opslaan uren: ' + error.message);
      return false;
    }
  };

  const deleteTimeRecord = async (id: number) => {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('uren')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTimeRecords(prev => prev.filter(record => record.id !== id));
      toast.success('Urenregistratie verwijderd.');
      return true;
    } catch (error: any) {
      console.error('Fout bij verwijderen uren:', error);
      toast.error('Fout bij verwijderen uren: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    const config = loadConfig();
    if (config) {
      setIsAutoConnecting(true);
      connectToSupabase(config.url, config.key).finally(() => {
        setIsAutoConnecting(false);
      });
    }
  }, []);

  const canUseApp = isConnected && tablesExist;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Urenregistratie</h1>
          <p className="text-slate-500 mt-2">Voeg klanten toe en registreer je gewerkte uren per dag.</p>
        </header>

        {/* Configuration Panel */}
        <ConfigPanel
          onConnect={connectToSupabase}
          onCreateTables={createTables}
          isConnected={isConnected}
          tablesExist={tablesExist}
          loadConfig={loadConfig}
          isAutoConnecting={isAutoConnecting}
        />

        {/* Main Content */}
        <main className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-opacity ${canUseApp ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          {/* Left Column */}
          <div className="md:col-span-1 space-y-8">
            <TimeEntry
              clients={clients}
              onAddTimeRecord={addTimeRecord}
              disabled={!canUseApp}
            />
            
            <ClientManagement
              clients={clients}
              onAddClient={addClient}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
              disabled={!canUseApp}
            />
          </div>

          {/* Right Column */}
          <div className="md:col-span-2">
            <TimeOverview
              timeRecords={timeRecords}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onDeleteRecord={deleteTimeRecord}
              disabled={!canUseApp}
              clients={clients}
            />
          </div>
        </main>
        
        {/* Footer */}
        <footer className="text-center mt-8 text-xs text-slate-400">
          <p>Status: <span>{isConnected ? (tablesExist ? 'Supabase verbonden' : 'Tabellen vereist') : 'Configuratie vereist'}</span></p>
        </footer>
      </div>
    </div>
  );
}
