// src/pages/Masters.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Country, City, Currency } from '@/types/trip';
import { Globe, MapPin, Coins, Plus, Pencil, Trash2, BadgePercent, History, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// NEW: Tax Rate Types
interface TaxRate {
  id: string;
  rate_type: 'gst' | 'tcs';
  rate_percentage: number;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
  created_at: string;
}

export default function Masters() {
  const { isAdmin } = useAuth();
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [currenciesList, setCurrenciesList] = useState<Currency[]>([]);
  const [taxRatesList, setTaxRatesList] = useState<TaxRate[]>([]);

  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [addTaxRateOpen, setAddTaxRateOpen] = useState(false);

  const [newCountry, setNewCountry] = useState({
    name: '',
    code: '',
    defaultCurrency: 'INR',
  });

  const [newCity, setNewCity] = useState({
    name: '',
    countryId: '',
  });

  const [newCurrency, setNewCurrency] = useState({
    code: '',
    name: '',
    symbol: '',
    rateToINR: 1,
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const [newTaxRate, setNewTaxRate] = useState({
    rateType: 'gst' as 'gst' | 'tcs',
    ratePercentage: 5,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchCountries(),
      fetchCities(),
      fetchCurrencies(),
      fetchTaxRates(),
    ]);
  };

  /* =========================
     READ - Countries
  ========================= */

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) return toast.error(error.message);

    setCountriesList(
      data.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        defaultCurrency: c.default_currency,
      }))
    );
  };

  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name');

    if (error) return toast.error(error.message);

    setCitiesList(
      data.map((c) => ({
        id: c.id,
        name: c.name,
        countryId: c.country_id,
      }))
    );
  };

  const fetchCurrencies = async () => {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .order('code');

    if (error) return toast.error(error.message);

    setCurrenciesList(
      data.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        rateToINR: c.rate_to_inr,
        effectiveDate: c.effective_date,
      }))
    );
  };

  // NEW: Fetch Tax Rates
  const fetchTaxRates = async () => {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return toast.error(error.message);

    setTaxRatesList(data || []);
  };

  /* =========================
     CREATE
  ========================= */

  const handleAddCountry = async () => {
    const { error } = await supabase.from('countries').insert({
      name: newCountry.name,
      code: newCountry.code,
      default_currency: newCountry.defaultCurrency,
    });

    if (error) return toast.error(error.message);

    toast.success('Country added');
    setAddCountryOpen(false);
    setNewCountry({ name: '', code: '', defaultCurrency: 'INR' });
    fetchCountries();
  };

  const handleAddCity = async () => {
    const { error } = await supabase.from('cities').insert({
      name: newCity.name,
      country_id: newCity.countryId,
    });

    if (error) return toast.error(error.message);

    toast.success('City added');
    setAddCityOpen(false);
    setNewCity({ name: '', countryId: '' });
    fetchCities();
  };

  const handleAddCurrency = async () => {
    const { error } = await supabase.from('currencies').insert({
      code: newCurrency.code,
      name: newCurrency.name,
      symbol: newCurrency.symbol,
      rate_to_inr: newCurrency.rateToINR,
      effective_date: newCurrency.effectiveDate,
    });

    if (error) return toast.error(error.message);

    toast.success('Currency added');
    setAddCurrencyOpen(false);
    fetchCurrencies();
  };

  // NEW: Add Tax Rate
  const handleAddTaxRate = async () => {
    // Check if user is admin or superadmin
    if (!isAdmin) {
      toast.error('Only administrators can add tax rates');
      return;
    }

    try {
      // First, set all previous rates of this type as non-current
      const { error: updateError } = await supabase
        .from('tax_rates')
        .update({ 
          is_current: false,
          effective_to: new Date().toISOString().split('T')[0]
        })
        .eq('rate_type', newTaxRate.rateType)
        .eq('is_current', true);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error(`Failed to update previous rates: ${updateError.message}`);
        return;
      }

      // Insert new rate
      const { error } = await supabase.from('tax_rates').insert({
        rate_type: newTaxRate.rateType,
        rate_percentage: newTaxRate.ratePercentage,
        effective_from: newTaxRate.effectiveFrom,
        effective_to: null,
        is_current: true,
      });

      if (error) {
        console.error('Insert error:', error);
        toast.error(`Failed to add tax rate: ${error.message}`);
        return;
      }

      toast.success(`${newTaxRate.rateType.toUpperCase()} rate added successfully`);
      setAddTaxRateOpen(false);
      setNewTaxRate({
        rateType: 'gst',
        ratePercentage: 5,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      fetchTaxRates();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  /* =========================
     UPDATE
  ========================= */

  const handleSaveCountry = async () => {
    if (!editingCountry) return;

    const { error } = await supabase
      .from('countries')
      .update({
        name: editingCountry.name,
        code: editingCountry.code,
        default_currency: editingCountry.defaultCurrency,
      })
      .eq('id', editingCountry.id);

    if (error) return toast.error(error.message);

    toast.success('Country updated');
    setEditingCountry(null);
    fetchCountries();
  };

  const handleSaveCity = async () => {
    if (!editingCity) return;

    const { error } = await supabase
      .from('cities')
      .update({
        name: editingCity.name,
        country_id: editingCity.countryId,
      })
      .eq('id', editingCity.id);

    if (error) return toast.error(error.message);

    toast.success('City updated');
    setEditingCity(null);
    fetchCities();
  };

  const handleSaveCurrency = async () => {
    if (!editingCurrency) return;

    const { error } = await supabase
      .from('currencies')
      .update({
        code: editingCurrency.code,
        name: editingCurrency.name,
        symbol: editingCurrency.symbol,
        rate_to_inr: editingCurrency.rateToINR,
        effective_date: editingCurrency.effectiveDate,
      })
      .eq('id', editingCurrency.id);

    if (error) return toast.error(error.message);

    toast.success('Currency updated');
    setEditingCurrency(null);
    fetchCurrencies();
  };

  /* =========================
     DELETE
  ========================= */

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('Delete this country? This will also delete all associated cities.')) return;
    
    const { error } = await supabase.from('countries').delete().eq('id', id);
    if (error) return toast.error(error.message);
    
    toast.success('Country deleted');
    fetchCountries();
    fetchCities();
  };

  const handleDeleteCity = async (id: string) => {
    if (!confirm('Delete this city?')) return;
    
    const { error } = await supabase.from('cities').delete().eq('id', id);
    if (error) return toast.error(error.message);
    
    toast.success('City deleted');
    fetchCities();
  };

  const handleDeleteCurrency = async (id: string) => {
    if (!confirm('Delete this currency?')) return;
    
    const { error } = await supabase.from('currencies').delete().eq('id', id);
    if (error) return toast.error(error.message);
    
    toast.success('Currency deleted');
    fetchCurrencies();
  };

  /* =========================
     FILTER LOGIC
  ========================= */

  const filteredCountries = countriesList.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredCities = citiesList.filter(c => {
    const country = countriesList.find(co => co.id === c.countryId);
    return c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
           (country && country.name.toLowerCase().includes(citySearch.toLowerCase()));
  });

  // NEW: Get current and historical rates
  const currentGST = taxRatesList.find(r => r.rate_type === 'gst' && r.is_current);
  const currentTCS = taxRatesList.find(r => r.rate_type === 'tcs' && r.is_current);
  const historicalRates = taxRatesList.filter(r => !r.is_current);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Master Data Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage countries, cities, currencies, and tax rates
        </p>
      </div>

      <Tabs defaultValue="countries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="countries">
            <Globe className="w-4 h-4 mr-2" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="cities">
            <MapPin className="w-4 h-4 mr-2" />
            Cities
          </TabsTrigger>
          <TabsTrigger value="currencies">
            <Coins className="w-4 h-4 mr-2" />
            Currencies
          </TabsTrigger>
          <TabsTrigger value="tax-rates">
            <BadgePercent className="w-4 h-4 mr-2" />
            GST & TCS
          </TabsTrigger>
        </TabsList>

        {/* COUNTRIES TAB */}
        <TabsContent value="countries">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Countries ({filteredCountries.length})</CardTitle>
              <Button onClick={() => setAddCountryOpen(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Country
              </Button>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search countries..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                className="mb-4"
              />
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Default Currency</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountries.map(country => (
                      <TableRow key={country.id}>
                        <TableCell className="font-medium">{country.name}</TableCell>
                        <TableCell><Badge variant="outline">{country.code}</Badge></TableCell>
                        <TableCell>{country.defaultCurrency}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setEditingCountry(country)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCountry(country.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CITIES TAB */}
        <TabsContent value="cities">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cities ({filteredCities.length})</CardTitle>
              <Button onClick={() => setAddCityOpen(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add City
              </Button>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search cities..."
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                className="mb-4"
              />
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>City Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCities.map(city => {
                      const country = countriesList.find(c => c.id === city.countryId);
                      return (
                        <TableRow key={city.id}>
                          <TableCell className="font-medium">{city.name}</TableCell>
                          <TableCell>{country?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingCity(city)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCity(city.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CURRENCIES TAB */}
        <TabsContent value="currencies">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Currencies ({currenciesList.length})</CardTitle>
              <Button onClick={() => setAddCurrencyOpen(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Currency
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Rate to INR</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currenciesList.map(currency => (
                      <TableRow key={currency.id}>
                        <TableCell><Badge>{currency.code}</Badge></TableCell>
                        <TableCell className="font-medium">{currency.name}</TableCell>
                        <TableCell className="text-lg">{currency.symbol}</TableCell>
                        <TableCell>{currency.rateToINR.toFixed(2)}</TableCell>
                        <TableCell>{new Date(currency.effectiveDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setEditingCurrency(currency)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCurrency(currency.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: TAX RATES TAB */}
        <TabsContent value="tax-rates">
          <div className="space-y-6">
            {/* Current Rates */}
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Current Tax Rates</CardTitle>
                <Button 
                  onClick={() => setAddTaxRateOpen(true)} 
                  disabled={!isAdmin}
                  className="gradient-primary text-primary-foreground disabled:opacity-50"
                  title={!isAdmin ? "Only administrators can add tax rates" : "Add new tax rate"}
                >
                  {!isAdmin && <Lock className="w-4 h-4 mr-2" />}
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tax Rate
                </Button>
              </CardHeader>
              <CardContent>
                {!isAdmin && (
                  <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Only administrators can add or modify tax rates.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GST Card */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <BadgePercent className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg">GST Rate</h3>
                        </div>
                        <Badge>Current</Badge>
                      </div>
                      {currentGST ? (
                        <>
                          <p className="text-4xl font-bold text-primary mb-2">
                            {currentGST.rate_percentage}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Effective from: {new Date(currentGST.effective_from).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No GST rate set</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* TCS Card */}
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <BadgePercent className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="font-semibold text-lg">TCS Rate</h3>
                        </div>
                        <Badge variant="outline">Current</Badge>
                      </div>
                      {currentTCS ? (
                        <>
                          <p className="text-4xl font-bold text-blue-600 mb-2">
                            {currentTCS.rate_percentage}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Effective from: {new Date(currentTCS.effective_from).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No TCS rate set</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Historical Rates */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Rate History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historicalRates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No historical rates</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Effective To</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historicalRates.map(rate => (
                          <TableRow key={rate.id}>
                            <TableCell>
                              <Badge variant={rate.rate_type === 'gst' ? 'default' : 'outline'}>
                                {rate.rate_type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{rate.rate_percentage}%</TableCell>
                            <TableCell>{new Date(rate.effective_from).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {rate.effective_to 
                                ? new Date(rate.effective_to).toLocaleDateString() 
                                : '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(rate.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS - Add Country, City, Currency (keeping existing code) */}
      <Dialog open={addCountryOpen} onOpenChange={setAddCountryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Country</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Country Name *</Label>
              <Input
                value={newCountry.name}
                onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                placeholder="e.g., Australia"
              />
            </div>
            <div className="space-y-2">
              <Label>Country Code *</Label>
              <Input
                value={newCountry.code}
                onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                placeholder="e.g., AUS"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={newCountry.defaultCurrency} onValueChange={(v) => setNewCountry({ ...newCountry, defaultCurrency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {currenciesList.map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCountryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCountry} className="gradient-primary text-primary-foreground">Add Country</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addCityOpen} onOpenChange={setAddCityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New City</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City Name *</Label>
              <Input
                value={newCity.name}
                onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                placeholder="e.g., Sydney"
              />
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={newCity.countryId} onValueChange={(v) => setNewCity({ ...newCity, countryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {countriesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCityOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCity} className="gradient-primary text-primary-foreground">Add City</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addCurrencyOpen} onOpenChange={setAddCurrencyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Currency</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency Code *</Label>
                <Input
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., AUD"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Symbol *</Label>
                <Input
                  value={newCurrency.symbol}
                  onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                  placeholder="e.g., A$"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency Name *</Label>
              <Input
                value={newCurrency.name}
                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                placeholder="e.g., Australian Dollar"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate to INR *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newCurrency.rateToINR}
                  onChange={(e) => setNewCurrency({ ...newCurrency, rateToINR: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={newCurrency.effectiveDate}
                  onChange={(e) => setNewCurrency({ ...newCurrency, effectiveDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCurrencyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCurrency} className="gradient-primary text-primary-foreground">Add Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Add Tax Rate Dialog */}
      <Dialog open={addTaxRateOpen} onOpenChange={setAddTaxRateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Tax Rate</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tax Type *</Label>
              <Select value={newTaxRate.rateType} onValueChange={(v: 'gst' | 'tcs') => setNewTaxRate({ ...newTaxRate, rateType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="tcs">TCS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate Percentage *</Label>
              <Input
                type="number"
                step="0.1"
                value={newTaxRate.ratePercentage}
                onChange={(e) => setNewTaxRate({ ...newTaxRate, ratePercentage: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label>Effective From *</Label>
              <Input
                type="date"
                value={newTaxRate.effectiveFrom}
                onChange={(e) => setNewTaxRate({ ...newTaxRate, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Note: Adding a new rate will automatically set the previous {newTaxRate.rateType.toUpperCase()} rate as historical.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaxRateOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTaxRate} className="gradient-primary text-primary-foreground">Add Tax Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Country Dialog */}
      <Dialog open={!!editingCountry} onOpenChange={() => setEditingCountry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Country</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Country Name</Label>
              <Input
                value={editingCountry?.name || ''}
                onChange={(e) => editingCountry && setEditingCountry({ ...editingCountry, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Country Code</Label>
              <Input
                value={editingCountry?.code || ''}
                onChange={(e) => editingCountry && setEditingCountry({ ...editingCountry, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={editingCountry?.defaultCurrency || ''}
                onValueChange={(v) => editingCountry && setEditingCountry({ ...editingCountry, defaultCurrency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {currenciesList.map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCountry(null)}>Cancel</Button>
            <Button onClick={handleSaveCountry} className="gradient-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit City Dialog */}
      <Dialog open={!!editingCity} onOpenChange={() => setEditingCity(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit City</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City Name</Label>
              <Input
                value={editingCity?.name || ''}
                onChange={(e) => editingCity && setEditingCity({ ...editingCity, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={editingCity?.countryId || ''}
                onValueChange={(v) => editingCity && setEditingCity({ ...editingCity, countryId: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {countriesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCity(null)}>Cancel</Button>
            <Button onClick={handleSaveCity} className="gradient-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Currency Dialog */}
      <Dialog open={!!editingCurrency} onOpenChange={() => setEditingCurrency(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Currency</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency Code</Label>
                <Input
                  value={editingCurrency?.code || ''}
                  onChange={(e) => editingCurrency && setEditingCurrency({ ...editingCurrency, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input
                  value={editingCurrency?.symbol || ''}
                  onChange={(e) => editingCurrency && setEditingCurrency({ ...editingCurrency, symbol: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency Name</Label>
              <Input
                value={editingCurrency?.name || ''}
                onChange={(e) => editingCurrency && setEditingCurrency({ ...editingCurrency, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate to INR</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingCurrency?.rateToINR || ''}
                  onChange={(e) => editingCurrency && setEditingCurrency({ ...editingCurrency, rateToINR: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={editingCurrency?.effectiveDate || ''}
                  onChange={(e) => editingCurrency && setEditingCurrency({ ...editingCurrency, effectiveDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCurrency(null)}>Cancel</Button>
            <Button onClick={handleSaveCurrency} className="gradient-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}