// src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/trip";
import { Plane, Shield, Users } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup, isAuthenticated } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>("staff");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const success = await login(formData.email, formData.password);
        if (success) {
          toast({
            title: "Welcome back!",
            description: `Logged in as ${selectedRole}`,
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Login failed",
            description: "Invalid credentials or role mismatch",
            variant: "destructive",
          });
        }
      } else {
        if (!formData.name.trim()) {
          toast({
            title: "Name required",
            description: "Please enter your name",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        const success = await signup(formData.name, formData.email, formData.password, selectedRole);
        if (success) {
          toast({
            title: "Account created!",
            description: `Welcome, ${formData.name}`,
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Signup failed",
            description: "Email already exists",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground">
            <Plane className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">TripFlow</h1>
            <p className="text-sm text-muted-foreground">Trip Management System</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to access your dashboard" : "Register to get started"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Role</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("admin")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRole === "admin"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Shield className={`h-6 w-6 mx-auto mb-2 ${
                    selectedRole === "admin" ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <p className={`text-sm font-medium ${
                    selectedRole === "admin" ? "text-primary" : "text-foreground"
                  }`}>Admin</p>
                  <p className="text-xs text-muted-foreground mt-1">Full access</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedRole("staff")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRole === "staff"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Users className={`h-6 w-6 mx-auto mb-2 ${
                    selectedRole === "staff" ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <p className={`text-sm font-medium ${
                    selectedRole === "staff" ? "text-primary" : "text-foreground"
                  }`}>Staff</p>
                  <p className="text-xs text-muted-foreground mt-1">Limited access</p>
                </button>
              </div>
            </div>

            {/* Auth Form */}
            <Tabs value={isLogin ? "login" : "signup"} onValueChange={(v) => setIsLogin(v === "login")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <TabsContent value="signup" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </Tabs>

            {/* Demo credentials */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground mb-2">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="font-medium">Admin</p>
                  <p className="text-muted-foreground">admin@demo.com</p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="font-medium">Staff</p>
                  <p className="text-muted-foreground">staff@demo.com</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
