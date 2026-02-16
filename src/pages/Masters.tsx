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

  // Track which country is being worked with for city/currency
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');

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
          effective_to: new Date(newTaxRate.effectiveFrom).toISOString()
        })
        .eq('rate_type', newTaxRate.rateType)
        .eq('is_current', true);

      if (updateError) throw updateError;

      // Now insert the new rate
      const { error: insertError } = await supabase.from('tax_rates').insert({
        rate_type: newTaxRate.rateType,
        rate_percentage: newTaxRate.ratePercentage,
        effective_from: newTaxRate.effectiveFrom,
        is_current: true,
      });

      if (insertError) throw insertError;

      toast.success(`New ${newTaxRate.rateType.toUpperCase()} rate added successfully`);
      setAddTaxRateOpen(false);
      setNewTaxRate({
        rateType: 'gst',
        ratePercentage: 5,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      fetchTaxRates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add tax rate');
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
    if (!confirm('Are you sure you want to delete this country?')) return;

    const { error } = await supabase.from('countries').delete().eq('id', id);

    if (error) return toast.error(error.message);

    toast.success('Country deleted');
    fetchCountries();
  };

  const handleDeleteCity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    const { error } = await supabase.from('cities').delete().eq('id', id);

    if (error) return toast.error(error.message);

    toast.success('City deleted');
    fetchCities();
  };

  const handleDeleteCurrency = async (id: string) => {
    if (!confirm('Are you sure you want to delete this currency?')) return;

    const { error } = await supabase.from('currencies').delete().eq('id', id);

    if (error) return toast.error(error.message);

    toast.success('Currency deleted');
    fetchCurrencies();
  };

  /* =========================
     HELPER FUNCTIONS
  ========================= */

  // Get country's currency
  const getCountryCurrency = (countryId: string): Currency | undefined => {
    const country = countriesList.find(c => c.id === countryId);
    if (!country) return undefined;
    return currenciesList.find(curr => curr.code === country.defaultCurrency);
  };

  // Get cities for a country
  const getCitiesForCountry = (countryId: string): City[] => {
    return citiesList.filter(city => city.countryId === countryId);
  };

  // Open add city dialog for specific country
  const openAddCityForCountry = (countryId: string) => {
    setSelectedCountryId(countryId);
    setNewCity({ name: '', countryId });
    setAddCityOpen(true);
  };

  // Open add/edit currency dialog for specific country
  const openCurrencyDialogForCountry = (countryId: string) => {
    const country = countriesList.find(c => c.id === countryId);
    if (!country) return;

    const existingCurrency = currenciesList.find(curr => curr.code === country.defaultCurrency);
    
    if (existingCurrency) {
      // Edit mode
      setEditingCurrency(existingCurrency);
    } else {
      // Add mode
      setSelectedCountryId(countryId);
      setAddCurrencyOpen(true);
    }
  };

  // Filter countries based on search
  const filteredCountries = countriesList.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  /* =========================
     TAX RATES SECTION (unchanged)
  ========================= */

  const renderTaxRatesTab = () => (
    <TabsContent value="tax-rates" className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5" />
            <CardTitle>Tax Rates Management</CardTitle>
          </div>
          {isAdmin && (
            <Button onClick={() => setAddTaxRateOpen(true)} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Rate
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!isAdmin ? (
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Tax rates can only be modified by administrators
              </p>
            </div>
          ) : null}

          <div className="space-y-6 mt-4">
            {/* Current Rates */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Current Tax Rates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {taxRatesList
                  .filter(rate => rate.is_current)
                  .map(rate => (
                    <Card key={rate.id} className="border-2 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="default" className="gradient-primary text-primary-foreground">
                                {rate.rate_type.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary">Current</Badge>
                            </div>
                            <p className="text-2xl font-bold">{rate.rate_percentage}%</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Effective from: {new Date(rate.effective_from).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Historical Rates */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <History className="h-5 w-5" />
                Historical Tax Rates
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRatesList
                    .filter(rate => !rate.is_current)
                    .map(rate => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <Badge variant="outline">{rate.rate_type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{rate.rate_percentage}%</TableCell>
                        <TableCell>{new Date(rate.effective_from).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {rate.effective_to
                            ? new Date(rate.effective_to).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  {taxRatesList.filter(rate => !rate.is_current).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No historical rates found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Masters Management</h1>
          <p className="text-muted-foreground">Manage countries, cities, currencies, and tax rates</p>
        </div>
      </div>

      <Tabs defaultValue="countries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="countries">
            <Globe className="h-4 w-4 mr-2" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="tax-rates">
            <BadgePercent className="h-4 w-4 mr-2" />
            Tax Rates
          </TabsTrigger>
        </TabsList>

        {/* UNIFIED COUNTRIES TAB */}
        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>Countries List</CardTitle>
                </div>
                <Button onClick={() => setAddCountryOpen(true)} className="gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCountries.map((country) => {
                  const currency = getCountryCurrency(country.id);
                  const cities = getCitiesForCountry(country.id);
                  
                  return (
                    <div 
                      key={country.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{country.name}</h3>
                              <Badge variant="outline">{country.code}</Badge>
                              {currency && (
                                <Badge variant="secondary">
                                  {currency.code} ({currency.symbol})
                                </Badge>
                              )}
                            </div>
                            {cities.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Cities: {cities.map(c => c.name).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {currency ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCurrencyDialogForCountry(country.id)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit Currency
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCurrencyDialogForCountry(country.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Currency
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddCityForCountry(country.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add City
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCountry(country)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCountry(country.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {filteredCountries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No countries found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {renderTaxRatesTab()}
      </Tabs>

      {/* Add Country Dialog */}
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
                placeholder="e.g., AU"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={newCountry.defaultCurrency}
                onValueChange={(v) => setNewCountry({ ...newCountry, defaultCurrency: v })}
              >
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

      {/* Add City Dialog */}
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
              <Select
                value={newCity.countryId}
                onValueChange={(v) => setNewCity({ ...newCity, countryId: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
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

      {/* Add Currency Dialog */}
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
          <DialogHeader><DialogTitle>Edit Currency Rate</DialogTitle></DialogHeader>
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