// src/components/trip/ActualExpensesEntry.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Currency, Trip } from '@/types/trip';
import {
  Calculator, Save, CheckCircle, ChevronDown, ChevronRight,
  Plane, Bus, Train, Hotel, Utensils, Ticket, Shield, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatINR = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ActualExpenses {
  // top-level totals (auto-summed from subsections)
  transport: number;
  accommodation: number;
  meals: number;
  activities: number;
  extras: number;
  overheads: number;
  explanation: string;

  // granular subsections
  flights: Record<string, number>;
  buses: Record<string, number>;
  trains: Record<string, number>;
  accommodations: Record<string, number>;
  mealItems: Record<string, number>;
  activityItems: Record<string, number>;
  overheadItems: Record<string, number>;
  visaActual: number;
  tipsActual: number;
  insuranceActual: number;
}

interface ActualExpensesEntryProps {
  trip: Trip;
  onSubmit: (analysis: ActualExpenses) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Clickable category header row — shows summed actual, not an input */
function SectionHeader({
  label,
  icon,
  expected,
  actual,
  expanded,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  expected: number;
  actual: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const diff = expected - actual;
  return (
    <tr
      className="border-t bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors select-none"
      onClick={onToggle}
    >
      <td className="p-3">
        <div className="flex items-center gap-2 font-semibold">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="text-muted-foreground">{icon}</span>
          {label}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (click to {expanded ? 'collapse' : 'expand'})
          </span>
        </div>
      </td>
      <td className="p-3 text-right font-semibold">{formatINR(expected)}</td>
      {/* actual is read-only here — it's the live sum of subsection inputs */}
      <td className="p-3 text-right font-semibold text-foreground">{formatINR(actual)}</td>
      <td className={`p-3 text-right font-semibold ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
        {diff >= 0 ? '+' : ''}{formatINR(diff)}
      </td>
    </tr>
  );
}

/** A sub-group label row (e.g. "Flights", "Buses") */
function SubGroupLabel({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <tr className="bg-muted/10">
      <td colSpan={4} className="pl-10 pt-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {icon} {label}
        </span>
      </td>
    </tr>
  );
}

/** An editable subsection row */
function SubRow({
  label,
  sublabel,
  expected,
  actual,
  onActualChange,
}: {
  label: string;
  sublabel?: string;
  expected: number;
  actual: number;
  onActualChange: (v: number) => void;
}) {
  const diff = expected - actual;
  return (
    <tr className="border-t bg-background hover:bg-muted/10 transition-colors">
      <td className="py-2 pl-10 pr-3">
        <div className="text-sm font-medium">{label}</div>
        {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
      </td>
      <td className="py-2 px-3 text-right text-sm">{formatINR(expected)}</td>
      <td className="py-2 px-3 text-right">
        <Input
          type="number"
          min={0}
          value={actual}
          onChange={(e) => onActualChange(Math.round((Number(e.target.value) || 0) * 100) / 100)}
          className="text-right w-full h-8 text-sm"
        />
      </td>
      <td className={`py-2 px-3 text-right text-sm font-medium ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
        {diff >= 0 ? '+' : ''}{formatINR(diff)}
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActualExpensesEntry({ trip, onSubmit }: ActualExpensesEntryProps) {
  const { flights, buses, trains } = trip.transport;

  // Round to 2 decimal places to avoid floating-point noise from DB values
  const r2 = (n: number) => Math.round(n * 100) / 100;

  // ── Build expected lookup maps from trip data ─────────────────────────────
  const flightExpected: Record<string, number> = {};
  flights.forEach(f => { flightExpected[f.id] = r2(f.totalCostINR); });

  const busExpected: Record<string, number> = {};
  buses.forEach(b => { busExpected[b.id] = r2(b.totalCostINR); });

  const trainExpected: Record<string, number> = {};
  trains.forEach(t => { trainExpected[t.id] = r2(t.totalCostINR); });

  const accomExpected: Record<string, number> = {};
  trip.accommodation.forEach(a => { accomExpected[a.id] = r2(a.totalCostINR); });

  const mealExpected: Record<string, number> = {};
  trip.meals.forEach(m => { mealExpected[m.id ?? m.accommodationId] = r2(m.totalCostINR); });

  const activityExpected: Record<string, number> = {};
  trip.activities.forEach(a => { activityExpected[a.id] = r2(a.totalCostINR); });

  const overheadExpected: Record<string, number> = {};
  trip.overheads.forEach(o => { overheadExpected[o.id] = r2(o.totalCostINR); });

  const visaExpected       = r2(trip.extras?.visaTotalCostINR       ?? 0);
  const tipsExpected       = r2(trip.extras?.tipsTotalCostINR       ?? 0);
  const insuranceExpected  = r2(trip.extras?.insuranceTotalCostINR  ?? 0);

  // ── Actual state — one entry per subsection ───────────────────────────────
  const [flightActuals,   setFlightActuals]   = useState<Record<string, number>>({ ...flightExpected });
  const [busActuals,      setBusActuals]      = useState<Record<string, number>>({ ...busExpected });
  const [trainActuals,    setTrainActuals]    = useState<Record<string, number>>({ ...trainExpected });
  const [accomActuals,    setAccomActuals]    = useState<Record<string, number>>({ ...accomExpected });
  const [mealActuals,     setMealActuals]     = useState<Record<string, number>>({ ...mealExpected });
  const [activityActuals, setActivityActuals] = useState<Record<string, number>>({ ...activityExpected });
  const [overheadActuals, setOverheadActuals] = useState<Record<string, number>>({ ...overheadExpected });
  const [visaActual,       setVisaActual]      = useState(visaExpected);
  const [tipsActual,       setTipsActual]      = useState(tipsExpected);
  const [insuranceActual,  setInsuranceActual] = useState(insuranceExpected);
  const [explanation, setExplanation] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ── Collapse state ────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    transport:     false,
    accommodation: false,
    meals:         false,
    activities:    false,
    extras:        false,
    overheads:     false,
  });
  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Derived totals (live, auto-summed) ────────────────────────────────────
  const sumRec = (rec: Record<string, number>) =>
    Object.values(rec).reduce((a, b) => a + b, 0);

  const transportActual    = sumRec(flightActuals) + sumRec(busActuals) + sumRec(trainActuals);
  const accommodationActual = sumRec(accomActuals);
  const mealsActual        = sumRec(mealActuals);
  const activitiesActual   = sumRec(activityActuals);
  const extrasActual       = visaActual + tipsActual + insuranceActual;
  const overheadsActual    = sumRec(overheadActuals);

  const transportExpected    = sumRec(flightExpected) + sumRec(busExpected) + sumRec(trainExpected);
  const accommodationExpected = sumRec(accomExpected);
  const mealsExpected        = sumRec(mealExpected);
  const activitiesExpected   = sumRec(activityExpected);
  const extrasExpected       = visaExpected + tipsExpected + insuranceExpected;
  const overheadsExpected    = sumRec(overheadExpected);

  const totalExpected =
    transportExpected + accommodationExpected + mealsExpected +
    activitiesExpected + extrasExpected + overheadsExpected;
  const totalActual =
    transportActual + accommodationActual + mealsActual +
    activitiesActual + extrasActual + overheadsActual;
  const profitLoss = totalExpected - totalActual;
  const profitLossPercentage =
    totalExpected > 0 ? (profitLoss / totalExpected) * 100 : 0;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    onSubmit({
      transport: transportActual,
      accommodation: accommodationActual,
      meals: mealsActual,
      activities: activitiesActual,
      extras: extrasActual,
      overheads: overheadsActual,
      explanation,
      flights:       flightActuals,
      buses:         busActuals,
      trains:        trainActuals,
      accommodations: accomActuals,
      mealItems:     mealActuals,
      activityItems: activityActuals,
      overheadItems: overheadActuals,
      visaActual,
      tipsActual,
      insuranceActual,
    });
    setIsSubmitted(true);
    toast.success('Actual expenses submitted! Check the Analysis tab.');
  };

  if (isSubmitted) {
    return (
      <Card className="shadow-card border-success/30 bg-success/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Actual Expenses Submitted</p>
              <p className="text-sm text-muted-foreground">
                View the Analysis tab for the detailed comparison.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Enter Actual Expenses
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Click any category row to expand its subsections and edit individual items.
          The category total updates automatically as you type.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {/* ── Table ── */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Category / Item</th>
                  <th className="text-right p-3 font-semibold">Expected (₹)</th>
                  <th className="text-right p-3 font-semibold w-44">Actual (₹)</th>
                  <th className="text-right p-3 font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody>

                {/* ════ TRANSPORT ════ */}
                <SectionHeader
                  label="Transport"
                  icon={<Plane className="w-4 h-4 inline" />}
                  expected={transportExpected}
                  actual={transportActual}
                  expanded={expanded.transport}
                  onToggle={() => toggle('transport')}
                />
                {expanded.transport && (
                  <>
                    {flights.length > 0 && (
                      <SubGroupLabel label="Flights" icon={<Plane className="w-3 h-3" />} />
                    )}
                    {flights.map(f => (
                      <SubRow
                        key={f.id}
                        label={`${f.airline}${f.flightNumber ? ` ${f.flightNumber}` : ''} — ${f.from} → ${f.to}`}
                        sublabel={f.description || undefined}
                        expected={flightExpected[f.id]}
                        actual={flightActuals[f.id] ?? 0}
                        onActualChange={v =>
                          setFlightActuals(prev => ({ ...prev, [f.id]: v }))
                        }
                      />
                    ))}

                    {buses.length > 0 && (
                      <SubGroupLabel label="Buses" icon={<Bus className="w-3 h-3" />} />
                    )}
                    {buses.map(b => (
                      <SubRow
                        key={b.id}
                        label={`${b.name}${b.quantity > 1 ? ` (×${b.quantity})` : ''}`}
                        sublabel={`${b.seatingCapacity} seats · ${b.numberOfDays} day${b.numberOfDays !== 1 ? 's' : ''}`}
                        expected={busExpected[b.id]}
                        actual={busActuals[b.id] ?? 0}
                        onActualChange={v =>
                          setBusActuals(prev => ({ ...prev, [b.id]: v }))
                        }
                      />
                    ))}

                    {trains.length > 0 && (
                      <SubGroupLabel label="Trains" icon={<Train className="w-3 h-3" />} />
                    )}
                    {trains.map(t => (
                      <SubRow
                        key={t.id}
                        label={`${t.name}${t.trainNumber ? ` (${t.trainNumber})` : ''}`}
                        sublabel={t.class ? `Class: ${t.class}` : undefined}
                        expected={trainExpected[t.id]}
                        actual={trainActuals[t.id] ?? 0}
                        onActualChange={v =>
                          setTrainActuals(prev => ({ ...prev, [t.id]: v }))
                        }
                      />
                    ))}
                  </>
                )}

                {/* ════ ACCOMMODATION ════ */}
                <SectionHeader
                  label="Accommodation"
                  icon={<Hotel className="w-4 h-4 inline" />}
                  expected={accommodationExpected}
                  actual={accommodationActual}
                  expanded={expanded.accommodation}
                  onToggle={() => toggle('accommodation')}
                />
                {expanded.accommodation &&
                  trip.accommodation.map(a => (
                    <SubRow
                      key={a.id}
                      label={a.hotelName}
                      sublabel={`${a.city} · ${a.numberOfNights} night${a.numberOfNights !== 1 ? 's' : ''}`}
                      expected={accomExpected[a.id]}
                      actual={accomActuals[a.id] ?? 0}
                      onActualChange={v =>
                        setAccomActuals(prev => ({ ...prev, [a.id]: v }))
                      }
                    />
                  ))
                }

                {/* ════ MEALS ════ */}
                <SectionHeader
                  label="Meals"
                  icon={<Utensils className="w-4 h-4 inline" />}
                  expected={mealsExpected}
                  actual={mealsActual}
                  expanded={expanded.meals}
                  onToggle={() => toggle('meals')}
                />
                {expanded.meals &&
                  trip.meals.map(m => {
                    const key = m.id ?? m.accommodationId;
                    return (
                      <SubRow
                        key={key}
                        label={m.hotelName}
                        sublabel={`${m.city} · ${m.numberOfNights} night${m.numberOfNights !== 1 ? 's' : ''} · ${m.totalParticipants} pax`}
                        expected={mealExpected[key]}
                        actual={mealActuals[key] ?? 0}
                        onActualChange={v =>
                          setMealActuals(prev => ({ ...prev, [key]: v }))
                        }
                      />
                    );
                  })
                }

                {/* ════ ACTIVITIES ════ */}
                <SectionHeader
                  label="Activities"
                  icon={<Ticket className="w-4 h-4 inline" />}
                  expected={activitiesExpected}
                  actual={activitiesActual}
                  expanded={expanded.activities}
                  onToggle={() => toggle('activities')}
                />
                {expanded.activities &&
                  trip.activities.map(a => (
                    <SubRow
                      key={a.id}
                      label={a.name}
                      sublabel={a.city || undefined}
                      expected={activityExpected[a.id]}
                      actual={activityActuals[a.id] ?? 0}
                      onActualChange={v =>
                        setActivityActuals(prev => ({ ...prev, [a.id]: v }))
                      }
                    />
                  ))
                }

                {/* ════ EXTRAS ════ */}
                {extrasExpected > 0 && (
                  <>
                    <SectionHeader
                      label="Extras (Visa, Tips, Insurance)"
                      icon={<Shield className="w-4 h-4 inline" />}
                      expected={extrasExpected}
                      actual={extrasActual}
                      expanded={expanded.extras}
                      onToggle={() => toggle('extras')}
                    />
                    {expanded.extras && (
                      <>
                        {visaExpected > 0 && (
                          <SubRow
                            label="Visa"
                            expected={visaExpected}
                            actual={visaActual}
                            onActualChange={setVisaActual}
                          />
                        )}
                        {tipsExpected > 0 && (
                          <SubRow
                            label="Tips"
                            expected={tipsExpected}
                            actual={tipsActual}
                            onActualChange={setTipsActual}
                          />
                        )}
                        {insuranceExpected > 0 && (
                          <SubRow
                            label="Insurance"
                            expected={insuranceExpected}
                            actual={insuranceActual}
                            onActualChange={setInsuranceActual}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ════ OVERHEADS ════ */}
                <SectionHeader
                  label="Overheads"
                  icon={<BarChart3 className="w-4 h-4 inline" />}
                  expected={overheadsExpected}
                  actual={overheadsActual}
                  expanded={expanded.overheads}
                  onToggle={() => toggle('overheads')}
                />
                {expanded.overheads &&
                  trip.overheads.map(o => (
                    <SubRow
                      key={o.id}
                      label={o.name}
                      sublabel={
                        o.costType === 'per_person'
                          ? `Per person · ${formatINR(o.amountPerParticipant)}/person`
                          : 'Lump sum'
                      }
                      expected={overheadExpected[o.id]}
                      actual={overheadActuals[o.id] ?? 0}
                      onActualChange={v =>
                        setOverheadActuals(prev => ({ ...prev, [o.id]: v }))
                      }
                    />
                  ))
                }

              </tbody>

              {/* Grand total footer */}
              <tfoot className="bg-muted/30">
                <tr className="border-t-2">
                  <td className="p-3 font-bold">Total</td>
                  <td className="p-3 text-right font-bold">{formatINR(totalExpected)}</td>
                  <td className="p-3 text-right font-bold">{formatINR(totalActual)}</td>
                  <td className={`p-3 text-right font-bold ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {profitLoss >= 0 ? '+' : ''}{formatINR(profitLoss)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Expected</p>
              <p className="text-xl font-bold">{formatINR(totalExpected)}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className="text-xl font-bold">{formatINR(totalActual)}</p>
            </div>
            <div className={`p-4 rounded-lg ${profitLoss >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p className="text-sm text-muted-foreground">Profit / Loss</p>
              <p className={`text-xl font-bold ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitLoss >= 0 ? '+' : ''}{formatINR(profitLoss)} ({profitLossPercentage.toFixed(2)}%)
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Variance Explanation (Optional)</Label>
            <Textarea
              placeholder="Explain any significant variances between expected and actual costs..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            className="w-full gradient-primary text-primary-foreground gap-2"
          >
            <Save className="w-4 h-4" />
            Submit Actual Expenses
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}