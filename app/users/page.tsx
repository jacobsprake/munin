'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Plus, Edit, Trash2, Shield, User, Eye } from 'lucide-react';
import { Role } from '@/lib/auth/rbac';

interface User {
  id: string;
  operator_id: string;
  role: Role;
  created_at: string;
  last_login_at?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    operator_id: '',
    passphrase: '',
    role: 'operator' as Role,
  });
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ operator_id: '', passphrase: '', role: 'operator' });
        fetchUsers();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: formData.role,
          passphrase: formData.passphrase || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setFormData({ operator_id: '', passphrase: '', role: 'operator' });
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const getRoleBadge = (role: Role) => {
    const roleColors: Record<Role, 'ok' | 'active' | 'warning' | 'authorized'> = {
      admin: 'authorized',
      operator: 'active',
      viewer: 'warning',
      ministry_of_defense: 'authorized',
      defense: 'authorized',
      water_authority: 'active',
      power_grid_operator: 'active',
      regulatory_compliance: 'active',
      emergency_services: 'active',
    };
    return roleColors[role] || 'warning';
  };

  const getRoleIcon = (role: Role) => {
    if (role === 'admin' || role === 'ministry_of_defense' || role === 'defense') {
      return <Shield className="w-4 h-4" />;
    }
    if (role === 'viewer') {
      return <Eye className="w-4 h-4" />;
    }
    return <User className="w-4 h-4" />;
  };

  const filteredUsers = users.filter((u) => {
    if (searchQuery && !u.operator_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !u.role.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const validRoles: Role[] = [
    'admin',
    'operator',
    'viewer',
    'ministry_of_defense',
    'defense',
    'water_authority',
    'power_grid_operator',
    'regulatory_compliance',
    'emergency_services',
  ];

  const tableRows = filteredUsers.map((user) => [
    <span key="operator" className="text-body-mono mono text-text-primary">{user.operator_id}</span>,
    <Badge key="role" status={getRoleBadge(user.role)}>
      <span className="flex items-center gap-1">
        {getRoleIcon(user.role)}
        {user.role.replace(/_/g, ' ').toUpperCase()}
      </span>
    </Badge>,
    <span key="created" className="text-body-mono mono text-text-secondary">
      {format(new Date(user.created_at), 'yyyy-MM-dd')}
    </span>,
    <span key="login" className="text-body-mono mono text-text-secondary">
      {user.last_login_at ? format(new Date(user.last_login_at), 'yyyy-MM-dd HH:mm') : 'Never'}
    </span>,
    <div key="actions" className="flex gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedUser(user);
          setFormData({ operator_id: user.operator_id, passphrase: '', role: user.role });
          setShowEditModal(true);
        }}
        className="text-text-secondary hover:text-text-primary"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteUser(user.id);
        }}
        className="text-text-secondary hover:text-red-400"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>,
  ]);

  const rightPanelContent = selectedUser ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">OPERATOR ID</div>
        <div className="text-body-mono mono text-text-primary">{selectedUser.operator_id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">ROLE</div>
        <Badge status={getRoleBadge(selectedUser.role)}>
          <span className="flex items-center gap-1">
            {getRoleIcon(selectedUser.role)}
            {selectedUser.role.replace(/_/g, ' ').toUpperCase()}
          </span>
        </Badge>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">CREATED AT</div>
        <div className="text-body-mono mono text-text-primary">
          {format(new Date(selectedUser.created_at), 'yyyy-MM-dd HH:mm:ss')}
        </div>
      </div>
      {selectedUser.last_login_at && (
        <div>
          <div className="text-label mono text-text-muted mb-1">LAST LOGIN</div>
          <div className="text-body-mono mono text-text-primary">
            {format(new Date(selectedUser.last_login_at), 'yyyy-MM-dd HH:mm:ss')}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setFormData({ operator_id: selectedUser.operator_id, passphrase: '', role: selectedUser.role });
            setShowEditModal(true);
          }}
        >
          Edit User
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleDeleteUser(selectedUser.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a user to view details
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="User Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-base-700 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-base-800 border border-base-700 rounded px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-body text-text-primary placeholder:text-text-muted focus:outline-none mono"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setFormData({ operator_id: '', passphrase: '', role: 'operator' });
              setShowCreateModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No users found</div>
          ) : (
            <Table
              headers={['Operator ID', 'Role', 'Created', 'Last Login', 'Actions']}
              rows={tableRows}
              onRowClick={(index) => {
                const user = filteredUsers[index];
                setSelectedUser(user);
              }}
              selectedRowIndex={selectedUser ? filteredUsers.findIndex((u) => u.id === selectedUser.id) : undefined}
            />
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-display-title mb-4">Create User</h2>
            <div className="space-y-4">
              <div>
                <label className="text-label mono text-text-muted mb-1 block">Operator ID</label>
                <Input
                  value={formData.operator_id}
                  onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                  placeholder="operator_001"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted mb-1 block">Passphrase</label>
                <Input
                  type="password"
                  value={formData.passphrase}
                  onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                  placeholder="Enter passphrase"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted mb-1 block">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
                >
                  {validRoles.map(role => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={handleCreateUser}>
                  Create
                </Button>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-display-title mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="text-label mono text-text-muted mb-1 block">Operator ID</label>
                <Input value={selectedUser.operator_id} disabled />
              </div>
              <div>
                <label className="text-label mono text-text-muted mb-1 block">New Passphrase (leave blank to keep current)</label>
                <Input
                  type="password"
                  value={formData.passphrase}
                  onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                  placeholder="Enter new passphrase"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted mb-1 block">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
                >
                  {validRoles.map(role => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={handleUpdateUser}>
                  Update
                </Button>
                <Button variant="secondary" onClick={() => {
                  setShowEditModal(false);
                  setFormData({ operator_id: '', passphrase: '', role: 'operator' });
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </CommandShell>
  );
}
