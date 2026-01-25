// src/components/trip/ActualExpensesEntry.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trip } from '@/types/trip';
import { formatINR } from '@/data/demoData';
import { Calculator, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ActualExpensesEntryProps {
  trip: Trip;
  onSubmit: (analysis: ActualExpenses) => void;
}

export interface ActualExpenses {
  transport: number;
  accommodation: number;
  meals: number;
  activities: number;
  overheads: number;
  explanation: string;
}

export function ActualExpensesEntry({ trip, onSubmit }: ActualExpensesEntryProps) {
  const transportExpected = 
    trip.transport.flights.reduce((sum, f) => sum + f.totalCostINR, 0) +
    trip.transport.buses.reduce((sum, b) => sum + b.totalCostINR, 0) +
    trip.transport.trains.reduce((sum, t) => sum + t.totalCostINR, 0);
  const accommodationExpected = trip.accommodation.reduce((sum, h) => sum + h.totalCostINR, 0);
  const mealsExpected = trip.meals.totalCostINR;
  const activitiesExpected = trip.activities.reduce((sum, a) => sum + a.totalCostINR, 0);
  const overheadsExpected = trip.overheads.reduce((sum, o) => sum + o.totalCostINR, 0);

  const [actuals, setActuals] = useState<ActualExpenses>({
    transport: transportExpected,
    accommodation: accommodationExpected,
    meals: mealsExpected,
    activities: activitiesExpected,
    overheads: overheadsExpected,
    explanation: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalExpected = transportExpected + accommodationExpected + mealsExpected + activitiesExpected + overheadsExpected;
  const totalActual = actuals.transport + actuals.accommodation + actuals.meals + actuals.activities + actuals.overheads;
  const profitLoss = totalExpected - totalActual;
  const profitLossPercentage = totalExpected > 0 ? (profitLoss / totalExpected) * 100 : 0;

  const handleSubmit = () => {
    onSubmit(actuals);
    setIsSubmitted(true);
    toast.success('Actual expenses submitted successfully! Check the Analysis tab.');
  };

  const categories = [
    { name: 'Transport', expected: transportExpected, key: 'transport' as const },
    { name: 'Accommodation', expected: accommodationExpected, key: 'accommodation' as const },
    { name: 'Meals', expected: mealsExpected, key: 'meals' as const },
    { name: 'Activities', expected: activitiesExpected, key: 'activities' as const },
    { name: 'Overheads', expected: overheadsExpected, key: 'overheads' as const },
  ];

  if (isSubmitted) {
    return (
      <Card className="shadow-card border-success/30 bg-success/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Actual Expenses Submitted</p>
              <p className="text-sm text-muted-foreground">View the Analysis tab for the detailed comparison.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Enter Actual Expenses
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the real costs incurred during the trip to compare with expected costs.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Expense Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Category</th>
                  <th className="text-right p-3 font-semibold">Expected (₹)</th>
                  <th className="text-right p-3 font-semibold w-48">Actual (₹)</th>
                  <th className="text-right p-3 font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const actual = actuals[cat.key];
                  const diff = cat.expected - actual;
                  return (
                    <tr key={cat.key} className="border-t">
                      <td className="p-3 font-medium">{cat.name}</td>
                      <td className="p-3 text-right">{formatINR(cat.expected)}</td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          value={actual}
                          onChange={(e) => setActuals({ ...actuals, [cat.key]: Number(e.target.value) || 0 })}
                          className="text-right w-full"
                        />
                      </td>
                      <td className={`p-3 text-right font-medium ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {diff >= 0 ? '+' : ''}{formatINR(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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

          {/* Summary Cards */}
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
              <p className="text-sm text-muted-foreground">Profit/Loss</p>
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
              value={actuals.explanation}
              onChange={(e) => setActuals({ ...actuals, explanation: e.target.value })}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" />
            Submit Actual Expenses
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
