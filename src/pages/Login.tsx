// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Plane, Lock, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Login error',
        description: 'Something went wrong while signing in.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left Panel – Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0f172a] p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-400/5 animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-indigo-500/5 animate-[pulse_5s_ease-in-out_infinite]" />

        {/* Logo */}
        <div className="relative z-10 animate-[fadeSlideDown_0.6s_ease-out_both]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">V-Explore</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6 animate-[fadeSlideUp_0.8s_ease-out_0.2s_both]">
          <h2 className="text-4xl font-bold leading-tight text-white">
            Manage your trips
            <br />
            <span className="text-blue-400">with confidence.</span>
          </h2>
          <p className="max-w-md text-slate-400 text-base leading-relaxed">
            Plan itineraries, track costs, manage participants, and generate quotes — all from one powerful dashboard.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-sm text-slate-400">Trips managed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">50+</p>
              <p className="text-sm text-slate-400">Destinations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-sm text-slate-400">Client satisfaction</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 animate-[fadeSlideUp_0.6s_ease-out_0.6s_both]">
          <p className="text-xs text-slate-500">© 2025 V-Explore. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right Panel – Login Form ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-[fadeSlideUp_0.7s_ease-out_0.1s_both]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden animate-[fadeSlideDown_0.5s_ease-out_both]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">V-Explore</span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-2 text-base text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2 animate-[fadeSlideUp_0.5s_ease-out_0.2s_both]">
              <Label htmlFor="email" className="text-foreground text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-11 h-12 text-base"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]">
              <Label htmlFor="password" className="text-foreground text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-11 pr-11 h-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-500 transition-colors duration-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </>
                )}
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}