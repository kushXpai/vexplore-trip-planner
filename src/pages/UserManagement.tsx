// src/pages/UserManagement.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/supabase/client';
import { Plus, Pencil, Users, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type UserRole = 'superadmin' | 'admin' | 'manager';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

const USER_ROLES: UserRole[] = ['superadmin', 'admin', 'manager'];

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
};

const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-purple-500/10 text-purple-700 border-purple-200',
  admin: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-blue-500/10 text-blue-600 border-blue-200',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Full system access - Can manage all users, tax rates, and system settings',
  admin: 'Can manage trips, view all data, and manage tax rates',
  manager: 'Can create and manage their own trips',
};

export default function UserManagement() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'manager' as UserRole,
  });

  // Redirect if not superadmin
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Only super admins can access this page.');
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // 2. Insert into users table
      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: formData.email,
        name: formData.name,
        role: formData.role,
      });

      if (insertError) throw insertError;

      toast.success('User created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'manager',
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          role: formData.role,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'manager',
    });
    setShowPassword(false);
  };

  // Filter users by role for display
  const superadmins = users.filter(u => u.role === 'superadmin');
  const admins = users.filter(u => u.role === 'admin');
  const managers = users.filter(u => u.role === 'manager');

  if (!isSuperAdmin) {
    return null; // Don't render anything if not superadmin
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-purple-600" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system users and their access levels
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system with specific access level
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <span>{ROLE_LABELS[role]}</span>
                            {role === 'superadmin' && <Shield className="w-3 h-3 text-purple-600" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[formData.role]}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-3xl font-bold text-purple-600">{superadmins.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-3xl font-bold text-primary">{admins.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Managers</p>
                <p className="text-3xl font-bold text-blue-600">{managers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.name}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                          <div className="flex items-center gap-1">
                            {user.role === 'superadmin' && <Shield className="w-3 h-3" />}
                            {ROLE_LABELS[user.role]}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "You cannot edit your own account" : "Edit user"}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information and role</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" value={formData.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <span>{ROLE_LABELS[role]}</span>
                          {role === 'superadmin' && <Shield className="w-3 h-3 text-purple-600" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[formData.role]}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                Update User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}