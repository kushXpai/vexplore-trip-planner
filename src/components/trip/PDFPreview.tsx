// // src/components/trip/PDFPreview.tsx
// import { useRef } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { Trip } from '@/types/trip';
// import { formatINR, formatCurrency } from '@/data/demoData';
// import { FileDown, Printer, X } from 'lucide-react';

// interface PDFPreviewProps {
//   trip: Trip;
//   open: boolean;
//   onClose: () => void;
// }

// export function PDFPreview({ trip, open, onClose }: PDFPreviewProps) {
//   const printRef = useRef<HTMLDivElement>(null);

//   const handlePrint = () => {
//     const content = printRef.current;
//     if (!content) return;

//     const printWindow = window.open('', '_blank');
//     if (!printWindow) return;

//     printWindow.document.write(`
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <title>${trip.name} - Cost Sheet</title>
//           <style>
//             * { margin: 0; padding: 0; box-sizing: border-box; }
//             body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.5; }
//             .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
//             .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
//             .header p { color: #666; font-size: 14px; }
//             .section { margin-bottom: 25px; }
//             .section-title { font-size: 16px; font-weight: 600; color: #2563eb; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
//             .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
//             .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
//             .info-item { margin-bottom: 8px; }
//             .info-label { font-size: 11px; color: #666; text-transform: uppercase; }
//             .info-value { font-size: 14px; font-weight: 500; }
//             table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
//             th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
//             td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
//             .text-right { text-align: right; }
//             .font-bold { font-weight: 600; }
//             .text-primary { color: #2563eb; }
//             .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
//             .summary-total { background: #f3f4f6; padding: 12px; margin-top: 10px; border-radius: 8px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; }
//             .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #666; }
//             @media print { body { padding: 20px; } }
//           </style>
//         </head>
//         <body>
//           ${content.innerHTML}
//           <div class="footer">
//             <p>Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} | TripCost Studio</p>
//           </div>
//         </body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.print();
//   };

//   const transportTotal = 
//     trip.transport.flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
//     trip.transport.buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
//     trip.transport.trains.reduce((sum, t) => sum + t.totalCostINR, 0);
//   const accommodationTotal = trip.accommodation.reduce((sum, a) => sum + a.totalCostINR, 0);
//   const activitiesTotal = trip.activities.reduce((sum, a) => sum + a.totalCostINR, 0);
//   const overheadsTotal = trip.overheads.filter(o => !o.hideFromClient).reduce((sum, o) => sum + o.totalCostINR, 0);

//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl max-h-[90vh] p-0">
//         <DialogHeader className="p-4 border-b bg-muted/30">
//           <DialogTitle className="flex items-center justify-between">
//             <span>PDF Preview</span>
//             <div className="flex gap-2">
//               <Button variant="outline" size="sm" onClick={handlePrint}>
//                 <Printer className="w-4 h-4 mr-2" />
//                 Print
//               </Button>
//               <Button size="sm" onClick={handlePrint} className="gradient-primary text-primary-foreground">
//                 <FileDown className="w-4 h-4 mr-2" />
//                 Download PDF
//               </Button>
//             </div>
//           </DialogTitle>
//         </DialogHeader>
        
//         <ScrollArea className="h-[70vh]">
//           <div className="p-8 bg-white" ref={printRef}>
//             {/* Header */}
//             <div className="header text-center mb-8 pb-6 border-b-4 border-primary">
//               <h1 className="text-2xl font-bold text-primary mb-1">{trip.name}</h1>
//               <p className="text-muted-foreground">Trip Cost Sheet • {trip.institution}</p>
//             </div>

//             {/* Trip Overview */}
//             <div className="section mb-8">
//               <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Trip Overview</h2>
//               <div className="grid grid-cols-4 gap-4">
//                 <div><p className="text-xs text-muted-foreground uppercase">Destination</p><p className="font-medium">{trip.city}, {trip.country}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Duration</p><p className="font-medium">{trip.totalDays} Days / {trip.totalNights} Nights</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Start Date</p><p className="font-medium">{new Date(trip.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">End Date</p><p className="font-medium">{new Date(trip.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
//               </div>
//             </div>

//             {/* Participants */}
//             <div className="section mb-8">
//               <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Participants</h2>
//               <div className="grid grid-cols-5 gap-4">
//                 <div><p className="text-xs text-muted-foreground uppercase">Boys</p><p className="font-medium">{trip.participants.boys}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Girls</p><p className="font-medium">{trip.participants.girls}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Male Faculty</p><p className="font-medium">{trip.participants.maleFaculty}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Female Faculty</p><p className="font-medium">{trip.participants.femaleFaculty}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Total</p><p className="font-bold text-primary">{trip.participants.totalParticipants}</p></div>
//               </div>
//             </div>

//             {/* Transport */}
//             {(trip.transport.flights.length > 0 || trip.transport.buses.length > 0 || trip.transport.trains.length > 0) && (
//               <div className="section mb-8">
//                 <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Transport</h2>
//                 {trip.transport.flights.length > 0 && (
//                   <table className="w-full text-sm mb-4">
//                     <thead><tr className="bg-muted/50"><th className="p-2 text-left">Flight</th><th className="p-2">Route</th><th className="p-2">Airline</th><th className="p-2 text-right">Cost/Person</th><th className="p-2 text-right">Total (INR)</th></tr></thead>
//                     <tbody>
//                       {trip.transport.flights.map((f, i) => (
//                         <tr key={f.id} className="border-b"><td className="p-2">Flight {i + 1}</td><td className="p-2">{f.from} → {f.to}</td><td className="p-2">{f.airline}</td><td className="p-2 text-right">{formatCurrency(f.costPerPerson, f.currency)}</td><td className="p-2 text-right font-semibold">{formatINR(f.totalCostINR)}</td></tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}
//                 {trip.transport.buses.length > 0 && (
//                   <table className="w-full text-sm mb-4">
//                     <thead><tr className="bg-muted/50"><th className="p-2 text-left">Bus</th><th className="p-2">Qty</th><th className="p-2">Days</th><th className="p-2 text-right">Cost/Bus/Day</th><th className="p-2 text-right">Total (INR)</th></tr></thead>
//                     <tbody>
//                       {trip.transport.buses.map((b) => (
//                         <tr key={b.id} className="border-b"><td className="p-2">{b.name}</td><td className="p-2">{b.quantity}</td><td className="p-2">{b.numberOfDays}</td><td className="p-2 text-right">{formatCurrency(b.costPerBus, b.currency)}</td><td className="p-2 text-right font-semibold">{formatINR(b.totalCostINR)}</td></tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}
//                 {trip.transport.trains.length > 0 && (
//                   <table className="w-full text-sm">
//                     <thead><tr className="bg-muted/50"><th className="p-2 text-left">Train</th><th className="p-2">Class</th><th className="p-2 text-right">Cost/Person</th><th className="p-2 text-right">Total (INR)</th></tr></thead>
//                     <tbody>
//                       {trip.transport.trains.map((t) => (
//                         <tr key={t.id} className="border-b"><td className="p-2">{t.name}</td><td className="p-2">{t.class}</td><td className="p-2 text-right">{formatCurrency(t.costPerPerson, t.currency)}</td><td className="p-2 text-right font-semibold">{formatINR(t.totalCostINR)}</td></tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}
//               </div>
//             )}

//             {/* Accommodation */}
//             {trip.accommodation.length > 0 && (
//               <div className="section mb-8">
//                 <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Accommodation</h2>
//                 <table className="w-full text-sm">
//                   <thead><tr className="bg-muted/50"><th className="p-2 text-left">Hotel</th><th className="p-2">City</th><th className="p-2">Nights</th><th className="p-2">Rooms</th><th className="p-2 text-right">Cost/Room</th><th className="p-2 text-right">Total (INR)</th></tr></thead>
//                   <tbody>
//                     {trip.accommodation.map((h) => (
//                       <tr key={h.id} className="border-b"><td className="p-2">{h.hotelName}</td><td className="p-2">{h.city}</td><td className="p-2">{h.numberOfNights}</td><td className="p-2">{h.totalRooms}</td><td className="p-2 text-right">{formatCurrency(h.costPerRoom, h.currency)}</td><td className="p-2 text-right font-semibold">{formatINR(h.totalCostINR)}</td></tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             {/* Meals */}
//             <div className="section mb-8">
//               <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Meals</h2>
//               <div className="grid grid-cols-4 gap-4">
//                 <div><p className="text-xs text-muted-foreground uppercase">Lunch/Person</p><p className="font-medium">{formatCurrency(trip.meals.lunchCostPerPerson, trip.meals.currency)}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Dinner/Person</p><p className="font-medium">{formatCurrency(trip.meals.dinnerCostPerPerson, trip.meals.currency)}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Total Days</p><p className="font-medium">{trip.meals.totalDays}</p></div>
//                 <div><p className="text-xs text-muted-foreground uppercase">Total (INR)</p><p className="font-bold text-primary">{formatINR(trip.meals.totalCostINR)}</p></div>
//               </div>
//             </div>

//             {/* Activities */}
//             {trip.activities.length > 0 && (
//               <div className="section mb-8">
//                 <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Activities & Site Visits</h2>
//                 <table className="w-full text-sm">
//                   <thead><tr className="bg-muted/50"><th className="p-2 text-left">Activity</th><th className="p-2 text-right">Entry/Person</th><th className="p-2 text-right">Transport</th><th className="p-2 text-right">Guide</th><th className="p-2 text-right">Total (INR)</th></tr></thead>
//                   <tbody>
//                     {trip.activities.map((a) => (
//                       <tr key={a.id} className="border-b"><td className="p-2">{a.name}</td><td className="p-2 text-right">{formatCurrency(a.entryCost, a.currency)}</td><td className="p-2 text-right">{formatCurrency(a.transportCost, a.currency)}</td><td className="p-2 text-right">{formatCurrency(a.guideCost, a.currency)}</td><td className="p-2 text-right font-semibold">{formatINR(a.totalCostINR)}</td></tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             {/* Cost Summary */}
//             <div className="section mb-8 p-6 bg-muted/30 rounded-lg">
//               <h2 className="section-title text-lg font-semibold text-primary mb-4 pb-2 border-b">Cost Summary</h2>
//               <div className="space-y-2">
//                 <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Transport</span><span className="font-medium">{formatINR(transportTotal)}</span></div>
//                 <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Accommodation</span><span className="font-medium">{formatINR(accommodationTotal)}</span></div>
//                 <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Meals</span><span className="font-medium">{formatINR(trip.meals.totalCostINR)}</span></div>
//                 <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Activities</span><span className="font-medium">{formatINR(activitiesTotal)}</span></div>
//                 {overheadsTotal > 0 && <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Other Charges</span><span className="font-medium">{formatINR(overheadsTotal)}</span></div>}
//                 <div className="flex justify-between py-3 text-xl font-bold mt-4 pt-4 border-t-2"><span>Grand Total</span><span className="text-primary">{formatINR(trip.totalCostINR)}</span></div>
//                 <div className="flex justify-between py-2 bg-primary/5 px-3 rounded-lg mt-2"><span className="text-muted-foreground">Cost per Student</span><span className="font-semibold">{formatINR(trip.costPerStudent)}</span></div>
//               </div>
//             </div>
//           </div>
//         </ScrollArea>
        
//         <DialogFooter className="p-4 border-t bg-muted/30">
//           <Button variant="outline" onClick={onClose}>Close</Button>
//           <Button onClick={handlePrint} className="gradient-primary text-primary-foreground">
//             <FileDown className="w-4 h-4 mr-2" />
//             Download PDF
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }
