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
import { Plus, Pencil, Trash2, KeyRound, Users, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
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

// ─── helper: call an API route with the current session token ────────────────
async function callApi(path: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export default function UserManagement() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // ── create dialog ──
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'manager' as UserRole,
  });

  // ── edit dialog (name + role only) ──
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'manager' as UserRole });

  // ── change password dialog ──
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ── delete confirm dialog ──
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  // ── guard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Only super admins can access this page.');
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) fetchUsers();
  }, [isSuperAdmin]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roleOrder: Record<UserRole, number> = { superadmin: 1, admin: 2, manager: 3 };
      const sorted = (data ?? []).sort((a, b) => {
        const diff = roleOrder[a.role as UserRole] - roleOrder[b.role as UserRole];
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });

      setUsers(sorted);
    } catch (error: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE ─────────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await callApi('/api/create-user', {
        email: createForm.email,
        name: createForm.name,
        password: createForm.password,
        role: createForm.role,
      });

      toast.success('User created successfully');
      setIsCreateDialogOpen(false);
      setCreateForm({ email: '', name: '', password: '', role: 'manager' });
      setShowCreatePassword(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  // ── EDIT (name + role) ─────────────────────────────────────────────────────
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name, role: user.role });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: editForm.name, role: editForm.role })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsEditing(false);
    }
  };

  // ── CHANGE PASSWORD ────────────────────────────────────────────────────────
  const openPasswordDialog = (user: User) => {
    setPasswordTargetUser(user);
    setNewPassword('');
    setShowNewPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await callApi('/api/update-password', {
        userId: passwordTargetUser.id,
        newPassword,
      });

      toast.success(`Password updated for ${passwordTargetUser.name}`);
      setIsPasswordDialogOpen(false);
      setPasswordTargetUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── DELETE ─────────────────────────────────────────────────────────────────
  const openDeleteDialog = (user: User) => {
    setDeleteTargetUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;

    // Snapshot id and name immediately — state must not change mid-flight
    const targetId = deleteTargetUser.id;
    const targetName = deleteTargetUser.name;

    if (!targetId || typeof targetId !== 'string') {
      toast.error('Invalid user — missing ID');
      return;
    }

    setIsDeletingUser(true);
    try {
      await callApi('/api/delete-user', { userId: targetId });

      toast.success(`${targetName} has been deleted`);
      setIsDeleteDialogOpen(false);
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // ── render guard ───────────────────────────────────────────────────────────
  if (!isSuperAdmin) return null;

  const superadmins = users.filter(u => u.role === 'superadmin');
  const admins = users.filter(u => u.role === 'admin');
  const managers = users.filter(u => u.role === 'manager');

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-purple-600" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage system users and their access levels</p>
        </div>

        {/* Add User button + dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => {
                setCreateForm({ email: '', name: '', password: '', role: 'manager' });
                setShowCreatePassword(false);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user with specific access level</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Full Name</Label>
                  <Input
                    id="create-name"
                    placeholder="John Doe"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="john@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="create-password"
                      type={showCreatePassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Role</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(v: UserRole) => setCreateForm({ ...createForm, role: v })}
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
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[createForm.role]}</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground" disabled={isCreating}>
                  {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats ── */}
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

      {/* ── Users Table ── */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading users...
            </div>
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
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.name}
                            {isCurrentUser && (
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
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit name/role */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                              disabled={isCurrentUser}
                              title={isCurrentUser ? 'Cannot edit your own account' : 'Edit user'}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* Change password */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPasswordDialog(user)}
                              disabled={isCurrentUser}
                              title={isCurrentUser ? 'Cannot change your own password here' : 'Change password'}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(user)}
                              disabled={isCurrentUser}
                              title={isCurrentUser ? 'Cannot delete your own account' : 'Delete user'}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit User Dialog (name + role) ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update name and role for {editingUser?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingUser?.email ?? ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v: UserRole) => setEditForm({ ...editForm, role: v })}
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
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[editForm.role]}</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsEditDialogOpen(false); setEditingUser(null); }}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={isEditing}>
                {isEditing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog ── */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Set a new password for <strong>{passwordTargetUser?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsPasswordDialogOpen(false); setPasswordTargetUser(null); }}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={isChangingPassword}>
                {isChangingPassword
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                  : 'Update Password'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTargetUser?.name}</strong> ({deleteTargetUser?.email}) from both the database and authentication system. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsDeleteDialogOpen(false); setDeleteTargetUser(null); }}
              disabled={isDeletingUser}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
            >
              {isDeletingUser
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                : <><Trash2 className="w-4 h-4 mr-2" />Delete User</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}