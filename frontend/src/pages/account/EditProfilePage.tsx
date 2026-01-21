import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/lib/services';
import toast from 'react-hot-toast';
import type { UserGender, DocumentType, UserPreferences } from '@/types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

export function EditProfilePage() {
  const { user, profile, fetchProfile, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    birth_date: '',
    document_type: '' as DocumentType | '',
    document_number: '',
    preferred_size: '',
    preferred_shoe_size: '',
    gender: '' as UserGender | '',
    instagram_handle: '',
    avatar_url: '',
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications_email: true,
    notifications_sms: false,
    notifications_push: true,
    newsletter: true,
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    setIsLoading(true);
    try {
      await fetchProfile();
      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          bio: profile.bio || '',
          birth_date: profile.birth_date ? profile.birth_date.split('T')[0] : '',
          document_type: profile.document_type || '',
          document_number: profile.document_number || '',
          preferred_size: profile.preferred_size || '',
          preferred_shoe_size: profile.preferred_shoe_size || '',
          gender: profile.gender || '',
          instagram_handle: profile.instagram_handle || '',
          avatar_url: profile.avatar_url || '',
        });
        if (profile.preferences) {
          setPreferences(profile.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      await updateProfile({
        ...formData,
        document_type: formData.document_type || undefined,
        gender: formData.gender || undefined,
        preferences,
      });
      toast.success('Perfil actualizado correctamente');
      navigate('/account');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/account"
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar Perfil</h1>
            <p className="text-zinc-500">Actualiza tu información personal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Foto de Perfil</h2>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-zinc-700 overflow-hidden ring-4 ring-zinc-800">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400">
                      {formData.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="URL de la imagen"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <p className="text-xs text-zinc-500 mt-1">Ingresa la URL de tu foto de perfil</p>
              </div>
            </div>
          </div>

          {/* Información básica */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Información Básica</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+57 300 123 4567"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Género</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as UserGender })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos un poco sobre ti..."
                  maxLength={500}
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                />
                <p className="text-xs text-zinc-500 text-right mt-1">{formData.bio.length}/500</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Instagram</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                  <input
                    type="text"
                    value={formData.instagram_handle}
                    onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value.replace('@', '') })}
                    placeholder="tu_usuario"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documento */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Documento de Identidad</h2>
            <p className="text-sm text-zinc-500 mb-4">Esta información es opcional pero ayuda a verificar tu identidad para entregas.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tipo de Documento</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value as DocumentType })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Seleccionar...</option>
                  <option value="cc">Cédula de Ciudadanía</option>
                  <option value="ce">Cédula de Extranjería</option>
                  <option value="passport">Pasaporte</option>
                  <option value="nit">NIT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Número de Documento</label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  placeholder="1234567890"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
          </div>

          {/* Tallas preferidas */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Mis Tallas</h2>
            <p className="text-sm text-zinc-500 mb-4">Guarda tus tallas para facilitar tus compras.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-3">Talla de Ropa</label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferred_size: size })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.preferred_size === size
                          ? 'bg-white text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-3">Talla de Calzado</label>
                <div className="flex flex-wrap gap-2">
                  {SHOE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferred_shoe_size: size })}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        formData.preferred_shoe_size === size
                          ? 'bg-white text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preferencias de notificaciones */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Notificaciones</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Notificaciones por Email</p>
                  <p className="text-sm text-zinc-500">Recibe actualizaciones sobre tus pedidos</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications_email}
                  onChange={(e) => setPreferences({ ...preferences, notifications_email: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Notificaciones SMS</p>
                  <p className="text-sm text-zinc-500">Recibe alertas de envío por mensaje de texto</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifications_sms}
                  onChange={(e) => setPreferences({ ...preferences, notifications_sms: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Newsletter</p>
                  <p className="text-sm text-zinc-500">Recibe ofertas y novedades de la tienda</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.newsletter}
                  onChange={(e) => setPreferences({ ...preferences, newsletter: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-white/20"
                />
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <Link
              to="/account"
              className="flex-1 py-3 bg-zinc-800 text-white rounded-full font-medium text-center hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
