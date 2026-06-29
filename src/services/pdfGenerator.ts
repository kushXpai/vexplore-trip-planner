// src/services/pdfGenerator.ts
import jsPDF from 'jspdf';
import type { Trip, Currency } from '@/types/trip';

// ─── colour palette ───────────────────────────────────────────────────────────
const C = {
  primary:      [14, 116, 144]  as [number,number,number], // cyan-700 (V-explore brand)
  darkPrimary:  [8, 70, 90]     as [number,number,number],
  lightPrimary: [207, 239, 245] as [number,number,number],
  veryLight:    [236, 252, 255] as [number,number,number],
  white:        [255, 255, 255] as [number,number,number],
  black:        [15, 23, 42]    as [number,number,number],
  slate:        [71, 85, 105]   as [number,number,number],
  lightGray:    [248, 250, 252] as [number,number,number],
  borderGray:   [226, 232, 240] as [number,number,number],
  green:        [21, 128, 61]   as [number,number,number],
  red:          [185, 28, 28]   as [number,number,number],
  orange:       [154, 52, 18]   as [number,number,number],
  amber:        [120, 53, 15]   as [number,number,number],
};

function fmtINR(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  return '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function fmtCur(amount: number, code: string, currencies: Currency[]): string {
  const cur = currencies.find(c => c.code === code);
  const sym = cur?.symbol ?? code;
  return sym + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── shared drawing helpers ───────────────────────────────────────────────────
function sectionHeader(
  doc: jsPDF, x: number, y: number, w: number, label: string,
  badge?: string, bgColor = C.lightGray, textColor = C.black,
): number {
  doc.setFillColor(...bgColor);
  doc.setDrawColor(...C.borderGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 9, 1.5, 1.5, 'FD');

  if (badge) {
    doc.setFillColor(...C.primary);
    doc.circle(x + 6, y + 4.5, 3.5, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(badge, x + 6, y + 5.7, { align: 'center' });
    doc.setTextColor(...textColor);
    doc.setFontSize(9.5);
    doc.text(label, x + 13, y + 6);
  } else {
    doc.setTextColor(...textColor);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 3, y + 6);
  }
  return y + 11;
}

function tableRow(
  doc: jsPDF, x: number, y: number, w: number,
  label: string, value: string, shaded: boolean,
  labelColor = C.slate, valueColor = C.black,
): number {
  if (shaded) {
    doc.setFillColor(...C.lightGray);
    doc.rect(x, y, w, 7, 'F');
  }
  doc.setFontSize(8);
  doc.setTextColor(...labelColor);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x + 3, y + 4.8);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + w - 3, y + 4.8, { align: 'right' });
  return y + 7;
}

function subtotalBar(
  doc: jsPDF, x: number, y: number, w: number,
  label: string, value: string,
): number {
  doc.setFillColor(...C.primary);
  doc.rect(x, y, w, 9, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x + 3, y + 6);
  doc.text(value, x + w - 3, y + 6, { align: 'right' });
  return y + 12;
}

function subHeader(
  doc: jsPDF, x: number, y: number, w: number, label: string,
): number {
  doc.setFillColor(...C.veryLight);
  doc.rect(x, y, w, 7, 'F');
  doc.setTextColor(...C.darkPrimary);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x + 3, y + 4.8);
  return y + 7;
}

function ensurePage(
  doc: jsPDF, y: number, pageH: number, margin: number, needed = 20,
): number {
  if (y + needed > pageH - 15) {
    doc.addPage();
    return margin;
  }
  return y;
}

// ─── main export ─────────────────────────────────────────────────────────────
export function generateTripPDF(trip: Trip, currencies: Currency[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 12;
  const W = PW - M * 2;

  let y = M;

  // ══════════ HEADER ══════════
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PW, 46, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('V-EXPLORE EDUCATION & TRIPS', PW / 2, 10, { align: 'center' });

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIP COST SHEET', PW / 2, 20, { align: 'center' });

  doc.setDrawColor(...C.white);
  doc.setLineWidth(0.4);
  doc.line(PW / 2 - 30, 22, PW / 2 + 30, 22);

  doc.setFontSize(13);
  doc.text(trip.name, PW / 2, 30, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(210, 240, 248);
  doc.text(trip.institution, PW / 2, 37, { align: 'center' });
  doc.text(`Ref: ${trip.id.slice(0, 8).toUpperCase()}`, PW / 2, 42, { align: 'center' });

  y = 51;

  // ══════════ INFO CARDS (row 1) ══════════
  const cardH = 16;
  const cardGap = 2;
  const cards4W = (W - cardGap * 3) / 4;

  const drawCard = (cx: number, label: string, val: string) => {
    doc.setFillColor(...C.lightGray);
    doc.setDrawColor(...C.borderGray);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, y, cards4W, cardH, 1.5, 1.5, 'FD');
    doc.setTextColor(...C.slate);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(label, cx + 2, y + 4.2);
    doc.setTextColor(...C.black);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(val, cards4W - 4);
    doc.text(lines, cx + 2, y + 9);
  };

  const tripTypeLabel = trip.tripType === 'institute' ? 'Institute'
    : trip.tripType === 'commercial' ? 'Commercial' : 'FTI';
  const tripCatLabel = trip.tripCategory === 'domestic' ? 'Domestic' : 'International';

  drawCard(M, 'Trip Category', tripCatLabel);
  drawCard(M + (cards4W + cardGap), 'Trip Type', tripTypeLabel);
  drawCard(M + (cards4W + cardGap) * 2, 'Duration',
    `${trip.totalDays}D / ${trip.totalNights}N`);
  drawCard(M + (cards4W + cardGap) * 3, 'Participants',
    `${trip.participants.totalParticipants}`);

  y += cardH + 3;

  // Info cards row 2
  const cards2W = (W - cardGap) / 2;
  const drawCard2 = (cx: number, cw: number, label: string, val: string) => {
    doc.setFillColor(...C.lightGray);
    doc.setDrawColor(...C.borderGray);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, y, cw, cardH, 1.5, 1.5, 'FD');
    doc.setTextColor(...C.slate);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(label, cx + 2, y + 4.2);
    doc.setTextColor(...C.black);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(val, cw - 4);
    doc.text(lines, cx + 2, y + 9);
  };

  const destText = [
    ...trip.countries,
    ...(trip.cities || []).map(c => c.name),
  ].filter(Boolean).join(', ') || '—';

  drawCard2(M, cards2W, 'Dates',
    `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`);
  drawCard2(M + cards2W + cardGap, cards2W, 'Destination', destText);

  y += cardH + 6;

  // ══════════ 1. PARTICIPANTS ══════════
  y = ensurePage(doc, y, PH, M, 50);
  y = sectionHeader(doc, M, y, W, 'Participants', undefined, C.lightGray);

  if (trip.tripType === 'institute') {
    const rows: [string, string][] = [
      ['Boys', `${trip.participants.boys}`],
      ['Girls', `${trip.participants.girls}`],
      ['Male Faculty', `${trip.participants.maleFaculty}`],
      ['Female Faculty', `${trip.participants.femaleFaculty}`],
      ['Male VXplorers', `${trip.participants.maleVXplorers}`],
      ['Female VXplorers', `${trip.participants.femaleVXplorers}`],
    ].filter(([, v]) => v !== '0') as [string, string][];
    rows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });
    const totals: [string, string][] = [
      ['Total Students', `${trip.participants.totalStudents}`],
      ['Total Faculty', `${trip.participants.totalFaculty}`],
      ['Total VXplorers', `${trip.participants.totalVXplorers}`],
    ];
    y = subtotalBar(doc, M, y, W, 'Total Participants', `${trip.participants.totalParticipants}`);
    totals.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });
  } else {
    const rows: [string, string][] = [
      ['Male Participants', `${trip.participants.maleCount}`],
      ['Female Participants', `${trip.participants.femaleCount}`],
      ['Kids', `${trip.participants.otherCount}`],
      ['Male VXplorers', `${trip.participants.commercialMaleVXplorers}`],
      ['Female VXplorers', `${trip.participants.commercialFemaleVXplorers}`],
    ].filter(([, v]) => v !== '0') as [string, string][];
    rows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });
    y = subtotalBar(doc, M, y, W, 'Total Participants', `${trip.participants.totalParticipants}`);
  }
  y += 5;

  // ══════════ 2. TRANSPORT ══════════
  const { flights, buses, trains } = trip.transport;
  const hasTransport = flights.length + buses.length + trains.length > 0;

  if (hasTransport) {
    y = ensurePage(doc, y, PH, M, 30);
    y = sectionHeader(doc, M, y, W, 'Transport', undefined, C.lightPrimary, C.darkPrimary);

    // Flights
    flights.forEach((fl, fi) => {
      y = ensurePage(doc, y, PH, M, 40);
      y = subHeader(doc, M, y, W,
        `Flight ${fi + 1}: ${fl.airline}${fl.flightNumber ? ' · ' + fl.flightNumber : ''}  ${fl.from} → ${fl.to}`);

      const fRows: [string, string][] = [];
      if (fl.departureTime) fRows.push(['Departure', fl.departureTime]);
      if (fl.arrivalTime)   fRows.push(['Arrival', fl.arrivalTime]);
      fRows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });

      if (fl.classes && fl.classes.length > 0) {
        fl.classes.forEach((cls, ci) => {
          const tot = cls.passengerCount * cls.costPerPerson;
          y = tableRow(doc, M, y, W,
            `  ${cls.class.replace(/_/g, ' ')} – ${cls.passengerCount} seats × ${fmtCur(cls.costPerPerson, fl.currency, currencies)}`,
            fmtCur(tot, fl.currency, currencies), ci % 2 === 0, C.slate, C.darkPrimary);
        });
      }
      if (fl.seatUpgrades && fl.seatUpgrades.length > 0) {
        fl.seatUpgrades.forEach((su, si) => {
          const tot = su.seatCount * su.costPerSeat;
          y = tableRow(doc, M, y, W,
            `  Seat Upgrade: ${su.label} (${su.seatCount})`,
            fmtCur(tot, fl.currency, currencies), si % 2 === 0);
        });
      }
      if (fl.mealUpgrades && fl.mealUpgrades.length > 0) {
        fl.mealUpgrades.forEach((mu, mi) => {
          const tot = mu.mealCount * mu.costPerMeal;
          y = tableRow(doc, M, y, W,
            `  Meal Upgrade: ${mu.label} (${mu.mealCount})`,
            fmtCur(tot, fl.currency, currencies), mi % 2 === 0);
        });
      }
      y = tableRow(doc, M, y, W,
        `  Total (${fl.currency})`, fmtCur(fl.totalCost, fl.currency, currencies), false, C.slate, C.primary);
      y = tableRow(doc, M, y, W,
        '  Total (INR)', fmtINR(fl.totalCostINR), false, C.slate, C.darkPrimary);
      y += 2;
    });

    // Buses
    buses.forEach((bus, bi) => {
      y = ensurePage(doc, y, PH, M, 28);
      y = subHeader(doc, M, y, W, `Bus ${bi + 1}: ${bus.name} (${bus.seatingCapacity} seats)`);
      const mode = bus.costingMode === 'lump_sum' ? 'Lump Sum' : 'Per Day';
      const bRows: [string, string][] = [
        ['Quantity', `${bus.quantity} bus${bus.quantity !== 1 ? 'es' : ''}`],
        ['Costing Mode', mode],
        ...(bus.costingMode === 'per_day'
          ? [['Days', `${bus.numberOfDays}`] as [string, string]] : []),
        ['Cost / Bus', fmtCur(bus.costPerBus, bus.currency, currencies)],
        [`Total (${bus.currency})`, fmtCur(bus.totalCost, bus.currency, currencies)],
        ['Total (INR)', fmtINR(bus.totalCostINR)],
      ];
      bRows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });
      y += 2;
    });

    // Trains
    trains.forEach((tr, ti) => {
      y = ensurePage(doc, y, PH, M, 25);
      y = subHeader(doc, M, y, W,
        `Train ${ti + 1}: ${tr.name}${tr.trainNumber ? ' · ' + tr.trainNumber : ''}`);
      const tRows: [string, string][] = [
        ...(tr.class ? [['Class', tr.class] as [string, string]] : []),
        ...(tr.timing ? [['Timing', tr.timing] as [string, string]] : []),
        ['Cost / Person', fmtCur(tr.costPerPerson, tr.currency, currencies)],
        [`Total (${tr.currency})`, fmtCur(tr.totalCost, tr.currency, currencies)],
        ['Total (INR)', fmtINR(tr.totalCostINR)],
      ];
      tRows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });
      y += 2;
    });

    const transportTotal =
      flights.reduce((s, f) => s + f.totalCostINR, 0) +
      buses.reduce((s, b) => s + b.totalCostINR, 0) +
      trains.reduce((s, t) => s + t.totalCostINR, 0);
    y = subtotalBar(doc, M, y, W, 'Total Transport', fmtINR(transportTotal));
    y += 5;
  }

  // ══════════ 3. ACCOMMODATION ══════════
  if (trip.accommodation.length > 0) {
    y = ensurePage(doc, y, PH, M, 30);
    y = sectionHeader(doc, M, y, W, 'Accommodation', undefined, C.lightPrimary, C.darkPrimary);

    trip.accommodation.forEach((hotel, hi) => {
      y = ensurePage(doc, y, PH, M, 35);
      const hotelLabel = `${hotel.hotelName}  |  ${hotel.city}  |  ${hotel.numberOfNights} night${hotel.numberOfNights !== 1 ? 's' : ''}`;
      y = subHeader(doc, M, y, W, hotelLabel);

      const hRows: [string, string][] = [
        ['Breakfast Included', hotel.breakfastIncluded ? 'Yes' : 'No'],
        ['Driver Room', hotel.driverRoom ? 'Yes' : 'No'],
        ['Total Rooms', `${hotel.totalRooms}`],
      ];
      hRows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });

      // Room types
      if (hotel.roomTypes && hotel.roomTypes.length > 0) {
        hotel.roomTypes.forEach((rt, ri) => {
          y = tableRow(doc, M, y, W,
            `  Room: ${rt.roomType} (capacity ${rt.capacityPerRoom})`,
            fmtCur(rt.costPerRoom, hotel.currency, currencies),
            ri % 2 === 0, C.slate, C.darkPrimary);
        });
      }

      // Room allocation summary
      const alloc = hotel.roomAllocation;
      const allocGroups = trip.tripType === 'institute' ? [
        { l: 'Boys Rooms',            v: alloc.boysRooms },
        { l: 'Girls Rooms',           v: alloc.girlsRooms },
        { l: 'Male Faculty Rooms',    v: alloc.maleFacultyRooms },
        { l: 'Female Faculty Rooms',  v: alloc.femaleFacultyRooms },
        { l: 'Male VXplorer Rooms',   v: alloc.maleVXplorerRooms },
        { l: 'Female VXplorer Rooms', v: alloc.femaleVXplorerRooms },
      ] : [
        { l: 'Male Rooms',            v: alloc.commercialMaleRooms },
        { l: 'Female Rooms',          v: alloc.commercialFemaleRooms },
        { l: 'Kids Rooms',            v: alloc.commercialOtherRooms },
        { l: 'Male VXplorer Rooms',   v: alloc.commercialMaleVXplorerRooms },
        { l: 'Female VXplorer Rooms', v: alloc.commercialFemaleVXplorerRooms },
      ];
      let allocIdx = 0;
      allocGroups.filter(g => g.v > 0).forEach(g => {
        y = tableRow(doc, M, y, W, `  ${g.l}`, `${g.v}`, allocIdx++ % 2 === 0);
      });

      y = tableRow(doc, M, y, W,
        `  Total (${hotel.currency})`, fmtCur(hotel.totalCost, hotel.currency, currencies),
        false, C.slate, C.primary);
      y = tableRow(doc, M, y, W, '  Total (INR)', fmtINR(hotel.totalCostINR), false, C.slate, C.darkPrimary);
      y += 3;
    });

    const accomTotal = trip.accommodation.reduce((s, h) => s + h.totalCostINR, 0);
    y = subtotalBar(doc, M, y, W, 'Total Accommodation', fmtINR(accomTotal));
    y += 5;
  }

  // ══════════ 4. MEALS ══════════
  if (trip.meals && trip.meals.length > 0) {
    y = ensurePage(doc, y, PH, M, 30);
    y = sectionHeader(doc, M, y, W, 'Meals', undefined, C.lightPrimary, C.darkPrimary);

    trip.meals.forEach((meal, mi) => {
      y = ensurePage(doc, y, PH, M, 30);
      const mLabel = `${meal.hotelName}  |  ${meal.city}  |  ${meal.numberOfNights} night${meal.numberOfNights !== 1 ? 's' : ''}${meal.restaurantName ? '  |  ' + meal.restaurantName : ''}`;
      y = subHeader(doc, M, y, W, mLabel);

      if (meal.breakfastCostPerPerson > 0) {
        const billable = Math.max(0, meal.numberOfNights - meal.freeBreakfast);
        const tot = meal.breakfastCostPerPerson * billable * meal.totalParticipants;
        y = tableRow(doc, M, y, W,
          `  Breakfast: ${fmtCur(meal.breakfastCostPerPerson, meal.currency, currencies)}/person × ${billable} nights × ${meal.totalParticipants} pax${meal.freeBreakfast > 0 ? ` (${meal.freeBreakfast} free)` : ''}`,
          fmtCur(tot, meal.currency, currencies), false, C.slate, C.darkPrimary);
      }
      if (meal.lunchCostPerPerson > 0) {
        const billable = Math.max(0, meal.numberOfNights - meal.freeLunch);
        const tot = meal.lunchCostPerPerson * billable * meal.totalParticipants;
        y = tableRow(doc, M, y, W,
          `  Lunch: ${fmtCur(meal.lunchCostPerPerson, meal.currency, currencies)}/person × ${billable} nights × ${meal.totalParticipants} pax${meal.freeLunch > 0 ? ` (${meal.freeLunch} free)` : ''}`,
          fmtCur(tot, meal.currency, currencies), true, C.slate, C.darkPrimary);
      }
      if (meal.dinnerCostPerPerson > 0) {
        const billable = Math.max(0, meal.numberOfNights - meal.freeDinner);
        const tot = meal.dinnerCostPerPerson * billable * meal.totalParticipants;
        y = tableRow(doc, M, y, W,
          `  Dinner: ${fmtCur(meal.dinnerCostPerPerson, meal.currency, currencies)}/person × ${billable} nights × ${meal.totalParticipants} pax${meal.freeDinner > 0 ? ` (${meal.freeDinner} free)` : ''}`,
          fmtCur(tot, meal.currency, currencies), false, C.slate, C.darkPrimary);
      }
      y = tableRow(doc, M, y, W, '  Total (INR)', fmtINR(meal.totalCostINR), false, C.slate, C.darkPrimary);
      y += 3;
    });

    const mealsTotal = trip.meals.reduce((s, m) => s + m.totalCostINR, 0);
    y = subtotalBar(doc, M, y, W, 'Total Meals', fmtINR(mealsTotal));
    y += 5;
  }

  // ══════════ 5. ACTIVITIES ══════════
  if (trip.activities.length > 0) {
    y = ensurePage(doc, y, PH, M, 30);
    y = sectionHeader(doc, M, y, W, 'Activities', undefined, C.lightPrimary, C.darkPrimary);

    trip.activities.forEach((act, ai) => {
      y = ensurePage(doc, y, PH, M, 25);
      const aLabel = `${act.name}${act.city ? '  |  ' + act.city : ''}`;
      y = subHeader(doc, M, y, W, aLabel);

      const aRows: [string, string][] = [];
      if (act.entryCost > 0) aRows.push(['  Entry / Ticket', fmtCur(act.entryCost, act.currency, currencies)]);
      if (act.transportCost > 0) aRows.push(['  Local Transport', fmtCur(act.transportCost, act.currency, currencies)]);
      if (act.guideCost > 0) aRows.push(['  Guide', fmtCur(act.guideCost, act.currency, currencies)]);
      aRows.push([`  Total (${act.currency})`, fmtCur(act.totalCost, act.currency, currencies)]);
      aRows.push(['  Total (INR)', fmtINR(act.totalCostINR)]);
      aRows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });
      y += 3;
    });

    const actTotal = trip.activities.reduce((s, a) => s + a.totalCostINR, 0);
    y = subtotalBar(doc, M, y, W, 'Total Activities', fmtINR(actTotal));
    y += 5;
  }

  // ══════════ 6. EXTRAS (Visa / Tips / Insurance) ══════════
  if (trip.extras) {
    const ex = trip.extras;
    const hasExtra = ex.visaCostPerPerson > 0 || ex.tipsCostPerPerson > 0 || ex.insuranceCostPerPerson > 0;
    if (hasExtra) {
      y = ensurePage(doc, y, PH, M, 30);
      y = sectionHeader(doc, M, y, W, 'Extras (Visa, Tips, Insurance)', undefined, C.lightPrimary, C.darkPrimary);

      let extIdx = 0;
      if (ex.visaCostPerPerson > 0) {
        y = tableRow(doc, M, y, W, `Visa – ${fmtCur(ex.visaCostPerPerson, ex.visaCurrency, currencies)}/person`, fmtINR(ex.visaTotalCostINR), extIdx++ % 2 === 0);
      }
      if (ex.tipsCostPerPerson > 0) {
        y = tableRow(doc, M, y, W, `Tips – ${fmtCur(ex.tipsCostPerPerson, ex.tipsCurrency, currencies)}/person`, fmtINR(ex.tipsTotalCostINR), extIdx++ % 2 === 0);
      }
      if (ex.insuranceCostPerPerson > 0) {
        y = tableRow(doc, M, y, W, `Insurance – ${fmtCur(ex.insuranceCostPerPerson, ex.insuranceCurrency, currencies)}/person`, fmtINR(ex.insuranceTotalCostINR), extIdx++ % 2 === 0);
      }
      const extrasTotal = ex.visaTotalCostINR + ex.tipsTotalCostINR + ex.insuranceTotalCostINR;
      y = subtotalBar(doc, M, y, W, 'Total Extras', fmtINR(extrasTotal));
      y += 5;
    }
  }

  // ══════════ 7. OVERHEADS ══════════
  if (trip.overheads.length > 0) {
    y = ensurePage(doc, y, PH, M, 30);
    y = sectionHeader(doc, M, y, W, 'Overheads', undefined, C.lightPrimary, C.darkPrimary);

    trip.overheads.forEach((ov, oi) => {
      const formula = ov.costType === 'per_person'
        ? `${trip.participants.totalParticipants} × ${fmtCur(ov.amountPerParticipant, ov.currency, currencies)}/person`
        : `Lump sum`;
      const label = `${ov.name}${ov.hideFromClient ? ' (Admin only)' : ''}  [${formula}]`;
      y = tableRow(doc, M, y, W, label, fmtINR(ov.totalCostINR), oi % 2 === 0);
    });

    const ovTotal = trip.overheads.reduce((s, o) => s + o.totalCostINR, 0);
    y = subtotalBar(doc, M, y, W, 'Total Overheads', fmtINR(ovTotal));
    y += 5;
  }

  // ══════════ 8. COST SUMMARY ══════════
  y = ensurePage(doc, y, PH, M, 80);
  y = sectionHeader(doc, M, y, W, 'Cost Summary', undefined, C.lightGray);

  const transportTotal =
    flights.reduce((s, f) => s + f.totalCostINR, 0) +
    buses.reduce((s, b) => s + b.totalCostINR, 0) +
    trains.reduce((s, t) => s + t.totalCostINR, 0);
  const accomTotal = trip.accommodation.reduce((s, h) => s + h.totalCostINR, 0);
  const mealsTotal2 = trip.meals.reduce((s, m) => s + m.totalCostINR, 0);
  const actTotal2 = trip.activities.reduce((s, a) => s + a.totalCostINR, 0);
  const extrasTotal2 = trip.extras
    ? (trip.extras.visaTotalCostINR + trip.extras.tipsTotalCostINR + trip.extras.insuranceTotalCostINR) : 0;
  const ovTotal2 = trip.overheads.reduce((s, o) => s + o.totalCostINR, 0);

  const summaryRows: [string, string][] = [
    ['Transport (Flights, Buses, Trains)', fmtINR(transportTotal)],
    ['Accommodation', fmtINR(accomTotal)],
    ['Meals', fmtINR(mealsTotal2)],
    ['Activities', fmtINR(actTotal2)],
    ...(extrasTotal2 > 0 ? [['Extras (Visa, Tips, Insurance)', fmtINR(extrasTotal2)] as [string, string]] : []),
    ['Overheads', fmtINR(ovTotal2)],
  ];
  summaryRows.forEach(([l, v], i) => { y = tableRow(doc, M, y, W, l, v, i % 2 === 0); });

  // subtotal before tax
  doc.setFillColor(...C.borderGray);
  doc.rect(M, y, W, 0.3, 'F');
  y += 2;
  y = tableRow(doc, M, y, W, 'Subtotal (Before Profit & Tax)', fmtINR(trip.subtotalBeforeTax), true, C.black, C.black);

  if (trip.profit > 0) {
    const pct = trip.subtotalBeforeTax > 0
      ? ((trip.profit / trip.subtotalBeforeTax) * 100).toFixed(2)
      : '0.00';
    y = tableRow(doc, M, y, W, `Admin Charges (${pct}%)`, fmtINR(trip.profit), false);
  }

  const adminSubtotal = trip.subtotalBeforeTax + trip.profit;
  y = tableRow(doc, M, y, W, 'Admin Subtotal', fmtINR(adminSubtotal), true, C.black, C.black);

  y = tableRow(doc, M, y, W, `GST (${trip.gstPercentage}%)`, fmtINR(trip.gstAmount), false);

  if (trip.tripCategory === 'international' && trip.tripType !== 'fti' && trip.tripType !== 'commercial' && trip.tcsAmount > 0) {
    y = tableRow(doc, M, y, W, `TCS (${trip.tcsPercentage}%)`, fmtINR(trip.tcsAmount), true);
  }

  y += 3;

  // Grand Total box
  doc.setFillColor(...C.primary);
  doc.roundedRect(M, y, W, 20, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Grand Total (INR)', M + 4, y + 8);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtINR(trip.grandTotalINR), M + W - 4, y + 15, { align: 'right' });
  y += 24;

  // Cost per participant
  if (trip.costPerParticipant > 0) {
    y = ensurePage(doc, y, PH, M, 20);
    const denomLabel = trip.tripType === 'institute' ? 'student' : 'participant';
    const denomCount = trip.tripType === 'institute'
      ? trip.participants.totalStudents
      : trip.participants.totalParticipants;

    doc.setFillColor(...C.veryLight);
    doc.setDrawColor(...C.lightPrimary);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, y, W, 12, 1.5, 1.5, 'FD');

    doc.setTextColor(...C.darkPrimary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cost per ${denomLabel} (${denomCount} ${denomLabel}s)`, M + 3, y + 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(fmtINR(trip.costPerParticipant), M + W - 3, y + 7.5, { align: 'right' });
    y += 16;

    // Per-person tax breakdown
    if (denomCount > 0) {
      y = ensurePage(doc, y, PH, M, 28);
      const beforeTaxPer = adminSubtotal / denomCount;
      const gstPer = trip.gstAmount / denomCount;
      const tcsPer = trip.tcsAmount / denomCount;

      y = sectionHeader(doc, M, y, W,
        `Per ${denomLabel.charAt(0).toUpperCase() + denomLabel.slice(1)} Breakdown`,
        undefined, C.veryLight, C.darkPrimary);

      y = tableRow(doc, M, y, W, 'Cost before tax', fmtINR(beforeTaxPer), true);
      y = tableRow(doc, M, y, W, `GST (${trip.gstPercentage}%)`, fmtINR(gstPer), false);
      if (trip.tripCategory === 'international' && trip.tripType !== 'fti' && trip.tripType !== 'commercial') {
        y = tableRow(doc, M, y, W, `TCS (${trip.tcsPercentage}%)`, fmtINR(tcsPer), true);
      }
      y = tableRow(doc, M, y, W,
        `Total per ${denomLabel}`, fmtINR(trip.grandTotalINR / denomCount), false, C.black, C.primary);
      y += 5;
    }
  }

  // ══════════ FOOTER on all pages ══════════
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fY = PH - 10;
    doc.setDrawColor(...C.borderGray);
    doc.setLineWidth(0.2);
    doc.line(M, fY - 3, PW - M, fY - 3);
    doc.setTextColor(...C.slate);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.text('This document is confidential and prepared exclusively for V-Explore clients.', PW / 2, fY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${p} of ${pageCount}`, PW - M, fY, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, M, fY);
  }

  // ══════════ SAVE ══════════
  const filename = `VExplore_Trip_${trip.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
