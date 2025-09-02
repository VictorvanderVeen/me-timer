import React, { useState, useEffect } from 'react';
import { ClientManagement } from './ClientManagement';
import { TimeEntry } from './TimeEntry';
import { TimeOverview } from './TimeOverview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
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
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedDateForEntry, setSelectedDateForEntry] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Fout bij uitloggen: ' + error.message);
    }
  };

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load clients for current user
      const { data: klantenData, error: klantenError } = await supabase
        .from('klanten')
        .select('*')
        .eq('user_id', user.id)
        .order('naam');
      
      if (klantenError) throw klantenError;
      setClients(klantenData || []);

      // Load time records for current user
      const { data: urenData, error: urenError } = await supabase
        .from('uren')
        .select('*')
        .eq('user_id', user.id)
        .order('datum', { ascending: false });
      
      if (urenError) throw urenError;
      setTimeRecords(urenData || []);
      
    } catch (error: any) {
      console.error('Fout bij laden data:', error);
      toast.error('Fout bij laden data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (naam: string, hourlyRate: number) => {
    if (!naam || !user || hourlyRate <= 0) return false;
    
    try {
      const { data, error } = await supabase
        .from('klanten')
        .insert([{ naam, hourly_rate: hourlyRate, user_id: user.id }])
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
    if (!user || hourlyRate <= 0) return false;
    
    try {
      const { data, error } = await supabase
        .from('klanten')
        .update({ naam, hourly_rate: hourlyRate })
        .eq('id', id)
        .eq('user_id', user.id)
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
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('klanten')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
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
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('uren')
        .insert([{ 
          klant_id: klantId, 
          klant_naam: klantNaam, 
          uren: uren, 
          datum,
          user_id: user.id
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
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('uren')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
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
    if (user) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-2 sm:p-4 md:p-8 max-w-6xl">
        {/* Header with User Info */}
        <header className="text-center mb-8 sm:mb-12 px-2">
          <div className="flex justify-between items-start mb-6">
            <div></div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="ml-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
              Urenregistratie
            </h1>
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-32 h-1 gradient-primary rounded-full opacity-60"></div>
          </div>
          <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
            Beheer je klanten en registreer je uren met een moderne, intuïtieve interface
          </p>
        </header>

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 px-2 sm:px-0">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-8">
            <TimeEntry
              clients={clients}
              onAddTimeRecord={addTimeRecord}
              disabled={false}
              selectedDate={selectedDateForEntry}
            />
            
            <ClientManagement
              clients={clients}
              onAddClient={addClient}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
              disabled={false}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 min-w-0">
            <TimeOverview
              timeRecords={timeRecords}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onDeleteRecord={deleteTimeRecord}
              disabled={false}
              clients={clients}
              onDateClick={setSelectedDateForEntry}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
