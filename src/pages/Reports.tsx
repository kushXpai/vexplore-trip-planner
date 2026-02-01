// src/pages/Reports.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { demoTrips, formatINR, currencies, countries, institutions } from '@/data/demoData';
import { 
  FileDown, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  Calendar,
  MapPin,
  Users,
  Building,
  PieChart,
  BarChart3,
  Printer,
  Download,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

export default function Reports() {
  // const navigate = useNavigate();
  // const [countryFilter, setCountryFilter] = useState('all');
  // const [institutionFilter, setInstitutionFilter] = useState('all');
  // const [statusFilter, setStatusFilter] = useState('all');
  // const [showReportPreview, setShowReportPreview] = useState(false);
  // const reportRef = useRef<HTMLDivElement>(null);

  // const filteredTrips = demoTrips.filter(trip => {
  //   if (countryFilter !== 'all' && trip.country !== countryFilter) return false;
  //   if (institutionFilter !== 'all' && trip.institution !== institutionFilter) return false;
  //   if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
  //   return true;
  // });

  // const completedTrips = filteredTrips.filter(t => t.status === 'completed' || t.status === 'locked');
  // const totalRevenue = filteredTrips.reduce((sum, t) => sum + t.totalCostINR, 0);
  // const profitableTrips = completedTrips.filter(t => t.analysis && t.analysis.profitLoss >= 0);
  // const totalProfit = completedTrips.reduce((sum, t) => sum + (t.analysis?.profitLoss || 0), 0);
  // const avgProfitMargin = completedTrips.length > 0 
  //   ? completedTrips.reduce((sum, t) => sum + (t.analysis?.profitLossPercentage || 0), 0) / completedTrips.length
  //   : 0;

  // const uniqueInstitutions = [...new Set(demoTrips.map(t => t.institution))];
  // const uniqueCountries = [...new Set(demoTrips.map(t => t.country))];

  // // Chart data
  // const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
  
  // // Revenue by Institution (College/School)
  // const revenueByInstitutionData = uniqueInstitutions.map(institution => ({
  //   name: institution.length > 25 ? institution.substring(0, 25) + '...' : institution,
  //   fullName: institution,
  //   trips: filteredTrips.filter(t => t.institution === institution).length,
  //   revenue: filteredTrips.filter(t => t.institution === institution).reduce((s, t) => s + t.totalCostINR, 0),
  // }));

  // const tripsByStatusData = [
  //   { name: 'Draft', value: filteredTrips.filter(t => t.status === 'draft').length, color: 'hsl(var(--muted-foreground))' },
  //   { name: 'Sent', value: filteredTrips.filter(t => t.status === 'sent').length, color: 'hsl(var(--warning))' },
  //   { name: 'Approved', value: filteredTrips.filter(t => t.status === 'approved').length, color: 'hsl(var(--primary))' },
  //   { name: 'Completed', value: filteredTrips.filter(t => t.status === 'completed').length, color: 'hsl(var(--success))' },
  //   { name: 'Locked', value: filteredTrips.filter(t => t.status === 'locked').length, color: 'hsl(var(--accent))' },
  // ].filter(d => d.value > 0);

  // // Last 5 completed trips for Profit/Loss chart
  // const last5CompletedTrips = completedTrips.slice(-5);
  // const profitLossData = last5CompletedTrips.map(trip => ({
  //   name: trip.name.length > 20 ? trip.name.substring(0, 20) + '...' : trip.name,
  //   profit: trip.analysis?.profitLoss || 0,
  //   margin: trip.analysis?.profitLossPercentage || 0,
  // }));

  // const handlePrintReport = () => {
  //   const printContent = reportRef.current;
  //   if (!printContent) return;
    
  //   const printWindow = window.open('', '_blank');
  //   if (!printWindow) return;
    
  //   printWindow.document.write(`
  //     <html>
  //       <head>
  //         <title>Trip Analytics Report</title>
  //         <style>
  //           body { font-family: Arial, sans-serif; padding: 20px; }
  //           table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  //           th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  //           th { background: #f5f5f5; font-weight: 600; }
  //           .header { text-align: center; margin-bottom: 20px; }
  //           .section { margin: 20px 0; }
  //           .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
  //           .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
  //           .stat-value { font-size: 24px; font-weight: bold; }
  //           .stat-label { color: #666; font-size: 12px; }
  //           .positive { color: green; }
  //           .negative { color: red; }
  //           @media print { body { print-color-adjust: exact; } }
  //         </style>
  //       </head>
  //       <body>${printContent.innerHTML}</body>
  //     </html>
  //   `);
  //   printWindow.document.close();
  //   printWindow.print();
  // };

  return (
    // <AppLayout title="Reports & Analytics">
    //   <div className="p-6 space-y-6 animate-fade-in">
    //     {/* Filters */}
    //     <Card className="shadow-card">
    //       <CardHeader>
    //         <CardTitle className="text-base flex items-center gap-2">
    //           <Filter className="w-4 h-4" />
    //           Filters
    //         </CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    //           <div className="space-y-2">
    //             <Label>Date Range</Label>
    //             <div className="flex gap-2">
    //               <Input type="date" className="flex-1" />
    //               <Input type="date" className="flex-1" />
    //             </div>
    //           </div>
    //           <div className="space-y-2">
    //             <Label>Country</Label>
    //             <Select value={countryFilter} onValueChange={setCountryFilter}>
    //               <SelectTrigger>
    //                 <SelectValue placeholder="All Countries" />
    //               </SelectTrigger>
    //               <SelectContent className="bg-popover">
    //                 <SelectItem value="all">All Countries</SelectItem>
    //                 {uniqueCountries.map(country => (
    //                   <SelectItem key={country} value={country}>{country}</SelectItem>
    //                 ))}
    //               </SelectContent>
    //             </Select>
    //           </div>
    //           <div className="space-y-2">
    //             <Label>Institution</Label>
    //             <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
    //               <SelectTrigger>
    //                 <SelectValue placeholder="All Institutions" />
    //               </SelectTrigger>
    //               <SelectContent className="bg-popover">
    //                 <SelectItem value="all">All Institutions</SelectItem>
    //                 {uniqueInstitutions.map(inst => (
    //                   <SelectItem key={inst} value={inst}>{inst}</SelectItem>
    //                 ))}
    //               </SelectContent>
    //             </Select>
    //           </div>
    //           <div className="space-y-2">
    //             <Label>Status</Label>
    //             <Select value={statusFilter} onValueChange={setStatusFilter}>
    //               <SelectTrigger>
    //                 <SelectValue placeholder="All Status" />
    //               </SelectTrigger>
    //               <SelectContent className="bg-popover">
    //                 <SelectItem value="all">All Status</SelectItem>
    //                 <SelectItem value="draft">Draft</SelectItem>
    //                 <SelectItem value="sent">Sent</SelectItem>
    //                 <SelectItem value="approved">Approved</SelectItem>
    //                 <SelectItem value="completed">Completed</SelectItem>
    //                 <SelectItem value="locked">Locked</SelectItem>
    //               </SelectContent>
    //             </Select>
    //           </div>
    //           <div className="flex items-end">
    //             <Button 
    //               variant="outline" 
    //               onClick={() => {
    //                 setCountryFilter('all');
    //                 setInstitutionFilter('all');
    //                 setStatusFilter('all');
    //               }}
    //               className="flex-1"
    //             >
    //               Clear Filters
    //             </Button>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     {/* Summary Stats */}
    //     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    //       <Card className="shadow-card">
    //         <CardContent className="p-6">
    //           <div className="flex items-center gap-3">
    //             <div className="p-2 bg-primary/10 rounded-lg">
    //               <BarChart3 className="w-5 h-5 text-primary" />
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Total Trips</p>
    //               <p className="text-2xl font-bold">{filteredTrips.length}</p>
    //             </div>
    //           </div>
    //         </CardContent>
    //       </Card>
    //       <Card className="shadow-card">
    //         <CardContent className="p-6">
    //           <div className="flex items-center gap-3">
    //             <div className="p-2 bg-success/10 rounded-lg">
    //               <PieChart className="w-5 h-5 text-success" />
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Completed</p>
    //               <p className="text-2xl font-bold">{completedTrips.length}</p>
    //             </div>
    //           </div>
    //         </CardContent>
    //       </Card>
    //       <Card className="shadow-card">
    //         <CardContent className="p-6">
    //           <div className="flex items-center gap-3">
    //             <div className="p-2 bg-accent/10 rounded-lg">
    //               <TrendingUp className="w-5 h-5 text-accent" />
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Total Revenue</p>
    //               <p className="text-xl font-bold">{formatINR(totalRevenue)}</p>
    //             </div>
    //           </div>
    //         </CardContent>
    //       </Card>
    //       <Card className="shadow-card">
    //         <CardContent className="p-6">
    //           <div className="flex items-center gap-3">
    //             <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
    //               {totalProfit >= 0 ? (
    //                 <TrendingUp className="w-5 h-5 text-success" />
    //               ) : (
    //                 <TrendingDown className="w-5 h-5 text-destructive" />
    //               )}
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Total Profit/Loss</p>
    //               <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                 {totalProfit >= 0 ? '+' : ''}{formatINR(totalProfit)}
    //               </p>
    //             </div>
    //           </div>
    //         </CardContent>
    //       </Card>
    //       <Card className="shadow-card">
    //         <CardContent className="p-6">
    //           <div className="flex items-center gap-3">
    //             <div className={`p-2 rounded-lg ${avgProfitMargin >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
    //               <PieChart className={`w-5 h-5 ${avgProfitMargin >= 0 ? 'text-success' : 'text-destructive'}`} />
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Avg Margin</p>
    //               <p className={`text-xl font-bold ${avgProfitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                 {avgProfitMargin >= 0 ? '+' : ''}{avgProfitMargin.toFixed(2)}%
    //               </p>
    //             </div>
    //           </div>
    //         </CardContent>
    //       </Card>
    //     </div>

    //     {/* Visual Analytics Charts */}
    //     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    //       {/* Revenue by Institution (College/School) */}
    //       <Card className="shadow-card">
    //         <CardHeader>
    //           <CardTitle className="text-base">Revenue by College/School</CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           <div className="h-[300px]">
    //             <ResponsiveContainer width="100%" height="100%">
    //               <BarChart data={revenueByInstitutionData} layout="vertical">
    //                 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    //                 <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
    //                 <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" fontSize={10} />
    //                 <Tooltip 
    //                   formatter={(value: number, name: string, props: any) => [formatINR(value), 'Revenue']}
    //                   labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
    //                   contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
    //                   labelStyle={{ color: 'hsl(var(--foreground))' }}
    //                 />
    //                 <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
    //               </BarChart>
    //             </ResponsiveContainer>
    //           </div>
    //         </CardContent>
    //       </Card>

    //       {/* Trips by Status */}
    //       <Card className="shadow-card">
    //         <CardHeader>
    //           <CardTitle className="text-base">Trips by Status</CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           <div className="h-[300px]">
    //             <ResponsiveContainer width="100%" height="100%">
    //               <RechartsPieChart>
    //                 <Pie
    //                   data={tripsByStatusData}
    //                   cx="50%"
    //                   cy="50%"
    //                   innerRadius={60}
    //                   outerRadius={100}
    //                   paddingAngle={2}
    //                   dataKey="value"
    //                   label={({ name, value }) => `${name}: ${value}`}
    //                   labelLine={false}
    //                 >
    //                   {tripsByStatusData.map((entry, index) => (
    //                     <Cell key={`cell-${index}`} fill={entry.color} />
    //                   ))}
    //                 </Pie>
    //                 <Tooltip 
    //                   contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
    //                 />
    //                 <Legend />
    //               </RechartsPieChart>
    //             </ResponsiveContainer>
    //           </div>
    //         </CardContent>
    //       </Card>

    //       {/* Profit/Loss Chart - Last 5 Trips */}
    //       {last5CompletedTrips.length > 0 && (
    //         <Card className="shadow-card lg:col-span-2">
    //           <CardHeader>
    //             <CardTitle className="text-base">Profit/Loss - Last 5 Trips</CardTitle>
    //           </CardHeader>
    //           <CardContent>
    //             <div className="h-[300px]">
    //               <ResponsiveContainer width="100%" height="100%">
    //                 <BarChart data={profitLossData}>
    //                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    //                   <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-15} textAnchor="end" height={60} />
    //                   <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
    //                   <Tooltip 
    //                     formatter={(value: number) => [formatINR(value), 'Profit/Loss']}
    //                     contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
    //                   />
    //                   <Bar 
    //                     dataKey="profit" 
    //                     fill="hsl(var(--success))"
    //                     radius={[4, 4, 0, 0]}
    //                   />
    //                 </BarChart>
    //               </ResponsiveContainer>
    //             </div>
    //           </CardContent>
    //         </Card>
    //       )}
    //     </div>

    //     {/* All Trips List */}
    //     <Card className="shadow-card">
    //       <CardHeader className="flex flex-row items-center justify-between">
    //         <CardTitle className="flex items-center gap-2">
    //           <BarChart3 className="w-5 h-5 text-primary" />
    //           All Trips ({filteredTrips.length})
    //         </CardTitle>
    //         <div className="flex gap-2">
    //           <Button variant="outline" size="sm" onClick={() => setShowReportPreview(true)}>
    //             <Eye className="w-4 h-4 mr-2" />
    //             Preview & Export
    //           </Button>
    //         </div>
    //       </CardHeader>
    //       <CardContent>
    //         {filteredTrips.length === 0 ? (
    //           <div className="text-center py-8 text-muted-foreground">
    //             No trips match the selected filters.
    //           </div>
    //         ) : (
    //           <div className="space-y-3">
    //             {filteredTrips.map(trip => (
    //               <div 
    //                 key={trip.id} 
    //                 className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
    //                 onClick={() => navigate(`/trips/${trip.id}`)}
    //               >
    //                 <div className="flex items-start justify-between gap-4">
    //                   <div className="flex-1 min-w-0">
    //                     <div className="flex items-center gap-3 mb-2">
    //                       <h3 className="font-semibold truncate">{trip.name}</h3>
    //                       <StatusBadge status={trip.status} />
    //                     </div>
    //                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    //                       <div className="flex items-center gap-2 text-muted-foreground">
    //                         <Building className="w-4 h-4" />
    //                         <span className="truncate">{trip.institution}</span>
    //                       </div>
    //                       <div className="flex items-center gap-2 text-muted-foreground">
    //                         <MapPin className="w-4 h-4" />
    //                         <span>{trip.city}, {trip.country}</span>
    //                       </div>
    //                       <div className="flex items-center gap-2 text-muted-foreground">
    //                         <Calendar className="w-4 h-4" />
    //                         <span>{new Date(trip.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    //                       </div>
    //                       <div className="flex items-center gap-2 text-muted-foreground">
    //                         <Users className="w-4 h-4" />
    //                         <span>{trip.participants.totalParticipants} participants</span>
    //                       </div>
    //                     </div>
    //                   </div>
    //                   <div className="text-right shrink-0">
    //                     <p className="font-bold text-lg">{formatINR(trip.totalCostINR)}</p>
    //                     {trip.analysis && (
    //                       <p className={`text-sm flex items-center gap-1 justify-end ${trip.analysis.profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                         {trip.analysis.profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
    //                         {trip.analysis.profitLoss >= 0 ? '+' : ''}{trip.analysis.profitLossPercentage.toFixed(2)}%
    //                       </p>
    //                     )}
    //                     <Button 
    //                       variant="ghost" 
    //                       size="sm" 
    //                       className="mt-2"
    //                       onClick={(e) => {
    //                         e.stopPropagation();
    //                         navigate(`/trips/${trip.id}`);
    //                       }}
    //                     >
    //                       <Eye className="w-4 h-4 mr-1" />
    //                       View Details
    //                     </Button>
    //                   </div>
    //                 </div>
                    
    //                 {/* Cost Breakdown */}
    //                 <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
    //                   <div>
    //                     <p className="text-muted-foreground">Transport</p>
    //                     <p className="font-medium">
    //                       {formatINR(
    //                         trip.transport.flights.reduce((s, f) => s + f.totalCostINR, 0) +
    //                         trip.transport.buses.reduce((s, b) => s + b.totalCostINR, 0) +
    //                         trip.transport.trains.reduce((s, t) => s + t.totalCostINR, 0)
    //                       )}
    //                     </p>
    //                   </div>
    //                   <div>
    //                     <p className="text-muted-foreground">Accommodation</p>
    //                     <p className="font-medium">{formatINR(trip.accommodation.reduce((s, h) => s + h.totalCostINR, 0))}</p>
    //                   </div>
    //                   <div>
    //                     <p className="text-muted-foreground">Meals</p>
    //                     <p className="font-medium">{formatINR(trip.meals.totalCostINR)}</p>
    //                   </div>
    //                   <div>
    //                     <p className="text-muted-foreground">Activities</p>
    //                     <p className="font-medium">{formatINR(trip.activities.reduce((s, a) => s + a.totalCostINR, 0))}</p>
    //                   </div>
    //                   <div>
    //                     <p className="text-muted-foreground">Cost/Student</p>
    //                     <p className="font-medium text-primary">{formatINR(trip.costPerStudent)}</p>
    //                   </div>
    //                 </div>
    //               </div>
    //             ))}
    //           </div>
    //         )}
    //       </CardContent>
    //     </Card>

    //     {/* Completed Trips Analysis */}
    //     {completedTrips.length > 0 && (
    //       <Card className="shadow-card">
    //         <CardHeader>
    //           <CardTitle className="flex items-center gap-2">
    //             <PieChart className="w-5 h-5 text-primary" />
    //             Profit/Loss Analysis (Completed Trips)
    //           </CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           <div className="overflow-x-auto">
    //             <table className="w-full text-sm">
    //               <thead className="bg-muted/50">
    //                 <tr>
    //                   <th className="text-left p-3 font-semibold">Trip Name</th>
    //                   <th className="text-left p-3 font-semibold">Institution</th>
    //                   <th className="text-right p-3 font-semibold">Expected</th>
    //                   <th className="text-right p-3 font-semibold">Actual</th>
    //                   <th className="text-right p-3 font-semibold">Profit/Loss</th>
    //                   <th className="text-right p-3 font-semibold">Margin %</th>
    //                 </tr>
    //               </thead>
    //               <tbody>
    //                 {completedTrips.map(trip => (
    //                   <tr key={trip.id} className="border-t hover:bg-muted/30">
    //                     <td className="p-3 font-medium">{trip.name}</td>
    //                     <td className="p-3 text-muted-foreground">{trip.institution}</td>
    //                     <td className="p-3 text-right">{formatINR(trip.analysis?.totalExpected || trip.totalCostINR)}</td>
    //                     <td className="p-3 text-right">{formatINR(trip.analysis?.totalActual || trip.totalCostINR)}</td>
    //                     <td className={`p-3 text-right font-medium ${(trip.analysis?.profitLoss || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                       {(trip.analysis?.profitLoss || 0) >= 0 ? '+' : ''}{formatINR(trip.analysis?.profitLoss || 0)}
    //                     </td>
    //                     <td className={`p-3 text-right font-medium ${(trip.analysis?.profitLossPercentage || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                       {(trip.analysis?.profitLossPercentage || 0) >= 0 ? '+' : ''}{(trip.analysis?.profitLossPercentage || 0).toFixed(2)}%
    //                     </td>
    //                   </tr>
    //                 ))}
    //               </tbody>
    //               <tfoot className="bg-muted/30 border-t-2">
    //                 <tr>
    //                   <td colSpan={2} className="p-3 font-bold">Total</td>
    //                   <td className="p-3 text-right font-bold">
    //                     {formatINR(completedTrips.reduce((s, t) => s + (t.analysis?.totalExpected || t.totalCostINR), 0))}
    //                   </td>
    //                   <td className="p-3 text-right font-bold">
    //                     {formatINR(completedTrips.reduce((s, t) => s + (t.analysis?.totalActual || t.totalCostINR), 0))}
    //                   </td>
    //                   <td className={`p-3 text-right font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                     {totalProfit >= 0 ? '+' : ''}{formatINR(totalProfit)}
    //                   </td>
    //                   <td className={`p-3 text-right font-bold ${avgProfitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
    //                     {avgProfitMargin >= 0 ? '+' : ''}{avgProfitMargin.toFixed(2)}%
    //                   </td>
    //                 </tr>
    //               </tfoot>
    //             </table>
    //           </div>
    //         </CardContent>
    //       </Card>
    //     )}

    //     {/* Report Preview Dialog */}
    //     <Dialog open={showReportPreview} onOpenChange={setShowReportPreview}>
    //       <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    //         <DialogHeader>
    //           <DialogTitle>Report Preview</DialogTitle>
    //         </DialogHeader>
    //         <div ref={reportRef} className="bg-white text-black p-6 rounded-lg">
    //           <div className="header text-center mb-6">
    //             <h1 className="text-2xl font-bold">Trip Analytics Report</h1>
    //             <p className="text-gray-500">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    //           </div>

    //           {/* Summary Stats */}
    //           <div className="section mb-6">
    //             <h2 className="text-lg font-semibold border-b pb-2 mb-4">Summary Statistics</h2>
    //             <div className="grid grid-cols-3 gap-4">
    //               <div className="stat-card border p-4 rounded-lg">
    //                 <p className="stat-label text-gray-500 text-sm">Total Trips</p>
    //                 <p className="stat-value text-2xl font-bold">{filteredTrips.length}</p>
    //               </div>
    //               <div className="stat-card border p-4 rounded-lg">
    //                 <p className="stat-label text-gray-500 text-sm">Completed Trips</p>
    //                 <p className="stat-value text-2xl font-bold">{completedTrips.length}</p>
    //               </div>
    //               <div className="stat-card border p-4 rounded-lg">
    //                 <p className="stat-label text-gray-500 text-sm">Total Revenue</p>
    //                 <p className="stat-value text-xl font-bold">{formatINR(totalRevenue)}</p>
    //               </div>
    //               <div className="stat-card border p-4 rounded-lg">
    //                 <p className="stat-label text-gray-500 text-sm">Total Profit/Loss</p>
    //                 <p className={`stat-value text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    //                   {totalProfit >= 0 ? '+' : ''}{formatINR(totalProfit)}
    //                 </p>
    //               </div>
    //               <div className="stat-card border p-4 rounded-lg">
    //                 <p className="stat-label text-gray-500 text-sm">Avg Profit Margin</p>
    //                 <p className={`stat-value text-xl font-bold ${avgProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    //                   {avgProfitMargin >= 0 ? '+' : ''}{avgProfitMargin.toFixed(2)}%
    //                 </p>
    //               </div>
    //               <div className="stat-card border p-4 rounded-lg">
    //                 <p className="stat-label text-gray-500 text-sm">Profitable Trips</p>
    //                 <p className="stat-value text-2xl font-bold text-green-600">{profitableTrips.length}</p>
    //               </div>
    //             </div>
    //           </div>

    //           {/* Revenue by Institution */}
    //           <div className="section mb-6">
    //             <h2 className="text-lg font-semibold border-b pb-2 mb-4">Revenue by College/School</h2>
    //             <table className="w-full border-collapse">
    //               <thead>
    //                 <tr className="bg-gray-100">
    //                   <th className="border p-2 text-left">Institution</th>
    //                   <th className="border p-2 text-center">Trips</th>
    //                   <th className="border p-2 text-right">Revenue</th>
    //                 </tr>
    //               </thead>
    //               <tbody>
    //                 {revenueByInstitutionData.map((item, i) => (
    //                   <tr key={i}>
    //                     <td className="border p-2">{item.fullName}</td>
    //                     <td className="border p-2 text-center">{item.trips}</td>
    //                     <td className="border p-2 text-right">{formatINR(item.revenue)}</td>
    //                   </tr>
    //                 ))}
    //               </tbody>
    //             </table>
    //           </div>

    //           {/* All Trips Table */}
    //           <div className="section mb-6">
    //             <h2 className="text-lg font-semibold border-b pb-2 mb-4">All Trips</h2>
    //             <table className="w-full border-collapse text-sm">
    //               <thead>
    //                 <tr className="bg-gray-100">
    //                   <th className="border p-2 text-left">Trip Name</th>
    //                   <th className="border p-2 text-left">Institution</th>
    //                   <th className="border p-2 text-left">Destination</th>
    //                   <th className="border p-2 text-center">Status</th>
    //                   <th className="border p-2 text-right">Cost</th>
    //                 </tr>
    //               </thead>
    //               <tbody>
    //                 {filteredTrips.map((trip) => (
    //                   <tr key={trip.id}>
    //                     <td className="border p-2">{trip.name}</td>
    //                     <td className="border p-2">{trip.institution}</td>
    //                     <td className="border p-2">{trip.city}, {trip.country}</td>
    //                     <td className="border p-2 text-center capitalize">{trip.status}</td>
    //                     <td className="border p-2 text-right">{formatINR(trip.totalCostINR)}</td>
    //                   </tr>
    //                 ))}
    //               </tbody>
    //               <tfoot>
    //                 <tr className="bg-gray-100 font-bold">
    //                   <td colSpan={4} className="border p-2">Total</td>
    //                   <td className="border p-2 text-right">{formatINR(totalRevenue)}</td>
    //                 </tr>
    //               </tfoot>
    //             </table>
    //           </div>

    //           {/* Profit/Loss Analysis */}
    //           {completedTrips.length > 0 && (
    //             <div className="section">
    //               <h2 className="text-lg font-semibold border-b pb-2 mb-4">Profit/Loss Analysis</h2>
    //               <table className="w-full border-collapse text-sm">
    //                 <thead>
    //                   <tr className="bg-gray-100">
    //                     <th className="border p-2 text-left">Trip Name</th>
    //                     <th className="border p-2 text-right">Expected</th>
    //                     <th className="border p-2 text-right">Actual</th>
    //                     <th className="border p-2 text-right">Profit/Loss</th>
    //                     <th className="border p-2 text-right">Margin</th>
    //                   </tr>
    //                 </thead>
    //                 <tbody>
    //                   {completedTrips.map((trip) => (
    //                     <tr key={trip.id}>
    //                       <td className="border p-2">{trip.name}</td>
    //                       <td className="border p-2 text-right">{formatINR(trip.analysis?.totalExpected || trip.totalCostINR)}</td>
    //                       <td className="border p-2 text-right">{formatINR(trip.analysis?.totalActual || trip.totalCostINR)}</td>
    //                       <td className={`border p-2 text-right ${(trip.analysis?.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    //                         {(trip.analysis?.profitLoss || 0) >= 0 ? '+' : ''}{formatINR(trip.analysis?.profitLoss || 0)}
    //                       </td>
    //                       <td className={`border p-2 text-right ${(trip.analysis?.profitLossPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    //                         {(trip.analysis?.profitLossPercentage || 0) >= 0 ? '+' : ''}{(trip.analysis?.profitLossPercentage || 0).toFixed(2)}%
    //                       </td>
    //                     </tr>
    //                   ))}
    //                 </tbody>
    //               </table>
    //             </div>
    //           )}
    //         </div>
    //         <DialogFooter>
    //           <Button variant="outline" onClick={() => setShowReportPreview(false)}>
    //             Close
    //           </Button>
    //           <Button onClick={handlePrintReport}>
    //             <Printer className="w-4 h-4 mr-2" />
    //             Print / Download PDF
    //           </Button>
    //         </DialogFooter>
    //       </DialogContent>
    //     </Dialog>
    //   </div>
    // </AppLayout>
    <div className="p-6">
      <h1 className="text-2xl font-bold">Reports & Analytics Page Under Construction</h1>
      <p className="mt-4 text-muted-foreground">We're working hard to bring you detailed reports and analytics soon. Stay tuned!</p>
    </div>
  );
}
