import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Code,
  Crown,
  Package,
  ShoppingBag,
  TrendingUp,
  Settings,
  UserPlus,
  Check,
  X
} from 'lucide-react';
import { userService } from '@/lib/services';
import type { TeamMember, User } from '@/types';
import toast from 'react-hot-toast';

export function TeamManagementPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [teamData, usersData] = await Promise.all([
        userService.getAllTeamMembers(),
        userService.getAll({ limit: 100 })
      ]);
      setTeamMembers(teamData);
      setAllUsers(usersData.data);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position.toLowerCase()) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'developer': return <Code className="w-4 h-4 text-blue-400" />;
      case 'admin': return <Shield className="w-4 h-4 text-purple-400" />;
      default: return <Users className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getPositionLabel = (position: string) => {
    switch (position.toLowerCase()) {
      case 'owner': return 'Propietario';
      case 'developer': return 'Desarrollador';
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      default: return position;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/account"
              className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Gestión del Equipo</h1>
              <p className="text-zinc-500">Administra los miembros y permisos</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Agregar Miembro
          </button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{teamMembers.length}</p>
            <p className="text-zinc-500 text-sm">Miembros</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              {teamMembers.filter(m => m.commission_percentage > 0).length}
            </p>
            <p className="text-zinc-500 text-sm">Con Comisión</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {teamMembers.reduce((sum, m) => sum + m.commission_percentage, 0)}%
            </p>
            <p className="text-zinc-500 text-sm">Total Comisiones</p>
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold">Miembros del Equipo</h2>
          </div>

          {teamMembers.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold">
                        {member.user?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{member.user?.full_name}</h3>
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded-full text-xs">
                            {getPositionIcon(member.position)}
                            {getPositionLabel(member.position)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">{member.user?.email}</p>
                        {member.commission_percentage > 0 && (
                          <p className="text-sm text-green-400 mt-1">
                            Comisión: {member.commission_percentage}%
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {member.can_manage_products && (
                            <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                              <Package className="w-3 h-3" /> Productos
                            </span>
                          )}
                          {member.can_manage_orders && (
                            <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                              <ShoppingBag className="w-3 h-3" /> Pedidos
                            </span>
                          )}
                          {member.can_view_analytics && (
                            <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                              <TrendingUp className="w-3 h-3" /> Analytics
                            </span>
                          )}
                          {member.can_manage_settings && (
                            <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                              <Settings className="w-3 h-3" /> Configuración
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {member.notes && (
                    <p className="text-sm text-zinc-500 mt-3 ml-16 italic">"{member.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-500">No hay miembros en el equipo</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-white hover:underline text-sm mt-2"
              >
                Agregar el primer miembro
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || editingMember) && (
          <TeamMemberModal
            member={editingMember}
            users={allUsers.filter(u => !teamMembers.some(tm => tm.user_id === u.id) || editingMember?.user_id === u.id)}
            onClose={() => {
              setShowAddModal(false);
              setEditingMember(null);
            }}
            onSave={async (data) => {
              try {
                if (editingMember) {
                  await userService.updateTeamMember(editingMember.user_id, data);
                  toast.success('Miembro actualizado correctamente');
                } else {
                  await userService.createTeamMember(data);
                  toast.success('Miembro agregado correctamente');
                }
                loadData();
                setShowAddModal(false);
                setEditingMember(null);
              } catch (error: any) {
                toast.error(error.message || 'Error al guardar');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// Modal Component
function TeamMemberModal({
  member,
  users,
  onClose,
  onSave
}: {
  member: TeamMember | null;
  users: User[];
  onClose: () => void;
  onSave: (data: Partial<TeamMember>) => void;
}) {
  const [formData, setFormData] = useState({
    user_id: member?.user_id || '',
    position: member?.position || 'admin',
    commission_percentage: member?.commission_percentage || 0,
    can_manage_products: member?.can_manage_products || false,
    can_manage_orders: member?.can_manage_orders || false,
    can_view_analytics: member?.can_view_analytics || false,
    can_manage_customers: member?.can_manage_customers || false,
    can_manage_settings: member?.can_manage_settings || false,
    can_manage_team: member?.can_manage_team || false,
    notes: member?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Presets para roles comunes
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'developer':
        setFormData({
          ...formData,
          position: 'developer',
          commission_percentage: 12,
          can_manage_products: false,
          can_manage_orders: false,
          can_view_analytics: true,
          can_manage_customers: false,
          can_manage_settings: false,
          can_manage_team: false,
        });
        break;
      case 'admin':
        setFormData({
          ...formData,
          position: 'admin',
          commission_percentage: 0,
          can_manage_products: true,
          can_manage_orders: true,
          can_view_analytics: true,
          can_manage_customers: true,
          can_manage_settings: false,
          can_manage_team: false,
        });
        break;
      case 'manager':
        setFormData({
          ...formData,
          position: 'manager',
          commission_percentage: 5,
          can_manage_products: true,
          can_manage_orders: true,
          can_view_analytics: true,
          can_manage_customers: true,
          can_manage_settings: true,
          can_manage_team: false,
        });
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {member ? 'Editar Miembro' : 'Agregar Miembro'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!member && (
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Usuario</label>
              <select
                required
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="">Seleccionar usuario...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Presets Rápidos</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset('developer')}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
              >
                Developer (12%)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('admin')}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => applyPreset('manager')}
                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
              >
                Manager (5%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Posición</label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="developer, admin, etc"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Comisión (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.commission_percentage}
                onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Permisos</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'can_manage_products', label: 'Gestionar Productos', icon: Package },
                { key: 'can_manage_orders', label: 'Gestionar Pedidos', icon: ShoppingBag },
                { key: 'can_view_analytics', label: 'Ver Analytics', icon: TrendingUp },
                { key: 'can_manage_customers', label: 'Gestionar Clientes', icon: Users },
                { key: 'can_manage_settings', label: 'Configuración', icon: Settings },
                { key: 'can_manage_team', label: 'Gestionar Equipo', icon: UserPlus },
              ].map(({ key, label, icon: Icon }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    formData[key as keyof typeof formData] ? 'bg-white/10' : 'bg-zinc-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData[key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    formData[key as keyof typeof formData] ? 'bg-white text-black' : 'bg-zinc-700'
                  }`}>
                    {formData[key as keyof typeof formData] && <Check className="w-3 h-3" />}
                  </div>
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas sobre este miembro..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-800 rounded-full font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
            >
              {member ? 'Guardar Cambios' : 'Agregar Miembro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
