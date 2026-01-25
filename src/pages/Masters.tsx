import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Country, City, Currency } from '@/types/trip';
import { Globe, MapPin, Coins, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase/client';

export default function Masters() {
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [currenciesList, setCurrenciesList] = useState<Currency[]>([]);

  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);

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
    ]);
  };

  /* =========================
     READ
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

  const handleDeleteCountry = async (country: Country) => {
    const { error } = await supabase
      .from('countries')
      .delete()
      .eq('id', country.id);

    if (error) return toast.error(error.message);

    toast.success('Country deleted');
    fetchCountries();
  };

  const handleDeleteCity = async (city: City) => {
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', city.id);

    if (error) return toast.error(error.message);

    toast.success('City deleted');
    fetchCities();
  };

  const handleDeleteCurrency = async (currency: Currency) => {
    const { error } = await supabase
      .from('currencies')
      .delete()
      .eq('id', currency.id);

    if (error) return toast.error(error.message);

    toast.success('Currency deleted');
    fetchCurrencies();
  };

  /* =========================
     FILTERS
  ========================= */

  const filteredCountries = countriesList.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredCities = citiesList.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <AppLayout title="Masters">
      <div className="p-6 animate-fade-in">
        <Tabs defaultValue="countries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="countries" className="gap-2"><Globe className="w-4 h-4" />Countries</TabsTrigger>
            <TabsTrigger value="cities" className="gap-2"><MapPin className="w-4 h-4" />Cities</TabsTrigger>
            <TabsTrigger value="currencies" className="gap-2"><Coins className="w-4 h-4" />Currencies</TabsTrigger>
          </TabsList>

          <TabsContent value="countries">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Countries ({filteredCountries.length})</CardTitle>
                <Button className="gradient-primary text-primary-foreground" onClick={() => setAddCountryOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Add Country
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search countries..."
                    className="max-w-sm"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Country</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Default Currency</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountries.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.code}</TableCell>
                        <TableCell>{c.defaultCurrency}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCountry(c)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCountry(c)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cities ({filteredCities.length})</CardTitle>
                <Button className="gradient-primary text-primary-foreground" onClick={() => setAddCityOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Add City
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search cities..."
                    className="max-w-sm"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>City</TableHead>
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
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCity(city)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCity(city)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currencies">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Currencies ({currenciesList.length})</CardTitle>
                <Button className="gradient-primary text-primary-foreground" onClick={() => setAddCurrencyOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Add Currency
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Rate to INR</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currenciesList.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.code}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.symbol}</TableCell>
                        <TableCell>₹{c.rateToINR.toFixed(2)}</TableCell>
                        <TableCell>{c.effectiveDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCurrency(c)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
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
    </AppLayout>
  );
}
