import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  UserCog,
  Mail,
  Lock,
  User,
  X,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

interface AdminFormData {
  email: string;
  password: string;
  full_name: string;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState<AdminFormData>({
    email: '',
    password: '',
    full_name: '',
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<Admin[]>('/users/admins');
      if (response.success && response.data) {
        setAdmins(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar admins');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      const response = await api.post<Admin>('/users/admins', formData);
      if (response.success) {
        toast.success('Admin creado exitosamente');
        setShowCreateModal(false);
        setFormData({ email: '', password: '', full_name: '' });
        loadAdmins();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al crear admin');
      console.error(error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAdmin) return;

    if (!formData.full_name && !formData.email && !formData.password) {
      toast.error('Debe proporcionar al menos un campo para actualizar');
      return;
    }

    try {
      const updateData: Partial<AdminFormData> = {};
      if (formData.full_name) updateData.full_name = formData.full_name;
      if (formData.email) updateData.email = formData.email;
      if (formData.password) updateData.password = formData.password;

      const response = await api.put<Admin>(`/users/admins/${selectedAdmin.id}`, updateData);
      if (response.success) {
        toast.success('Admin actualizado exitosamente');
        setShowEditModal(false);
        setSelectedAdmin(null);
        setFormData({ email: '', password: '', full_name: '' });
        loadAdmins();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar admin');
      console.error(error);
    }
  };

  const handleDelete = async (adminId: string, adminName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al admin ${adminName}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/users/admins/${adminId}`);
      if (response.success) {
        toast.success('Admin eliminado exitosamente');
        loadAdmins();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar admin');
      console.error(error);
    }
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      email: admin.email,
      password: '',
      full_name: admin.full_name,
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Administradores</h1>
              <p className="mt-2 text-gray-600">
                Administra los usuarios con permisos de administrador
              </p>
            </div>
            <Button
              onClick={() => {
                setFormData({ email: '', password: '', full_name: '' });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Crear Admin
            </Button>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Creación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCog className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{admin.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{admin.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                          admin.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(admin.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {admin.role !== 'super_admin' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id, admin.full_name)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {admin.role === 'super_admin' && (
                        <span className="text-gray-400 text-xs">No editable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Crear Administrador</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nombre Completo
                </label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@melosportt.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Contraseña
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleCreate} className="flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Crear Admin
              </Button>
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Editar Administrador</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAdmin(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nombre Completo
                </label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Nueva Contraseña
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleUpdate} className="flex-1 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Guardar Cambios
              </Button>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAdmin(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
