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
import { Plus, Pencil, Users, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'admin' | 'manager';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

const USER_ROLES: UserRole[] = ['admin', 'manager'];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
};

const ROLE_COLORS: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'default',
  manager: 'secondary',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager' as UserRole,
  });
  const [loading, setLoading] = useState(true);

  // Computed values for filtered lists
  const admins = users.filter(u => u.role === 'admin');
  const managers = users.filter(u => u.role === 'manager');

  // Fetch users from Supabase
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(error);
      toast({ title: 'Failed to fetch users', variant: 'destructive' });
    } else {
      setUsers(data as User[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      email: '', 
      password: '', 
      role: 'manager',
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // leave blank
        role: user.role,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // Function to update password via API route
  const updateUserPassword = async (userId: string, newPassword: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    const response = await fetch('/api/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update password');
    }

    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update password if provided using API route
        if (formData.password.trim()) {
          try {
            await updateUserPassword(editingUser.id, formData.password);
            toast({ title: 'Password updated successfully' });
          } catch (passwordError: any) {
            console.error('Password update failed:', passwordError);
            toast({ 
              title: 'Password update failed', 
              description: passwordError.message,
              variant: 'destructive' 
            });
            // Continue with other updates even if password fails
          }
        }

        // Update metadata (name, role)
        const { data, error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            role: formData.role,
          })
          .eq('id', editingUser.id)
          .select()
          .single();

        if (error) throw error;

        setUsers(users.map(u => u.id === editingUser.id ? data : u));
        
        toast({ title: 'User updated successfully' });

      } else {
        // Create Auth user with admin API
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        const response = await fetch('/api/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user');
        }

        setUsers([...users, result.user]);
        toast({ title: 'User created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      
    } catch (error: any) {
      console.error('Error:', error);
      toast({ 
        title: editingUser ? 'Failed to update user' : 'Failed to create user', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));
      toast({ title: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ 
        title: 'Failed to delete user', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage system users and their roles
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? 'Update user information. Leave password blank to keep current password.'
                    : 'Create a new user account. All fields are required.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    disabled={!!editingUser}
                    required
                  />
                  {editingUser && (
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">
                    {editingUser ? 'New Password (optional)' : 'Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                      required={!editingUser}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'user' : 'users'} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
              <p className="text-sm">Click "Add User" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_COLORS[u.role]}>
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenDialog(u)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(u.id)}
                            disabled={u.id === currentUser?.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}