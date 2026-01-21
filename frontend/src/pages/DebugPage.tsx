import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/lib/services';

export function DebugPage() {
  const { profile } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      setIsLoading(true);
      const info = await userService.getUserDebugInfo();
      setDebugInfo(info);
    } catch (err: any) {
      setError(err.message || 'Error loading debug info');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 Información de Debug</h1>

        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">👤 Información del Usuario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">ID:</span>
                <p className="font-mono text-sm">{debugInfo?.user_id}</p>
              </div>
              <div>
                <span className="text-gray-400">Email:</span>
                <p className="font-mono text-sm">{debugInfo?.email}</p>
              </div>
              <div>
                <span className="text-gray-400">Rol:</span>
                <p className={`font-bold text-sm ${
                  debugInfo?.role === 'super_admin' ? 'text-red-400' :
                  debugInfo?.role === 'admin' ? 'text-orange-400' :
                  'text-gray-400'
                }`}>
                  {debugInfo?.role}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Es Admin:</span>
                <p className={`font-bold ${debugInfo?.is_admin ? 'text-green-400' : 'text-red-400'}`}>
                  {debugInfo?.is_admin ? '✅ SÍ' : '❌ NO'}
                </p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400">🔐 Permisos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">Es Super Admin:</span>
                <p className={`font-bold ${debugInfo?.is_super_admin ? 'text-green-400' : 'text-gray-400'}`}>
                  {debugInfo?.is_super_admin ? '✅ SÍ' : '❌ NO'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Puede acceder a /admin:</span>
                <p className={`font-bold ${debugInfo?.is_admin ? 'text-green-400' : 'text-red-400'}`}>
                  {debugInfo?.is_admin ? '✅ SÍ' : '❌ NO - Solo panel cliente'}
                </p>
              </div>
            </div>
          </div>

          {/* Team Member Info */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-400">👥 Información de Equipo</h2>
            {debugInfo?.has_team_member_record ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">Posición:</span>
                  <p className="font-medium">{debugInfo?.team_member?.position}</p>
                </div>
                <div>
                  <span className="text-gray-400">Comisión:</span>
                  <p className="font-bold text-green-400">{debugInfo?.commission_percentage}%</p>
                </div>
                <div>
                  <span className="text-gray-400">Puede gestionar productos:</span>
                  <p className={debugInfo?.team_member?.can_manage_products ? 'text-green-400' : 'text-gray-400'}>
                    {debugInfo?.team_member?.can_manage_products ? '✅ SÍ' : '❌ NO'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Puede gestionar pedidos:</span>
                  <p className={debugInfo?.team_member?.can_manage_orders ? 'text-green-400' : 'text-gray-400'}>
                    {debugInfo?.team_member?.can_manage_orders ? '✅ SÍ' : '❌ NO'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-yellow-400">⚠️ Este usuario NO es miembro del equipo</p>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">🔧 Solución de Problemas</h2>
            {!debugInfo?.is_admin && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <h3 className="font-semibold text-red-400 mb-2">❌ Problema Detectado</h3>
                <p className="text-sm text-gray-300 mb-2">
                  Este usuario NO tiene permisos de administrador.
                </p>
                <p className="text-xs text-gray-400">
                  Para que Walmer vea el panel admin, debe tener rol 'admin' o 'super_admin' en la base de datos.
                  Ejecuta: <code className="bg-gray-800 px-2 py-1 rounded">npm run seed:admins</code>
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <p><strong>Si Walmer no ve el panel admin:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 ml-4">
                <li>Verifica que tenga rol 'admin' en la base de datos</li>
                <li>Ejecuta <code className="bg-gray-800 px-1 rounded">npm run seed:admins</code> para configurar usuarios</li>
                <li>Cierra sesión y vuelve a iniciar</li>
                <li>Ve a <code className="bg-gray-800 px-1 rounded">/account</code> - debería redirigir automáticamente a <code className="bg-gray-800 px-1 rounded">/admin</code></li>
              </ol>
            </div>
          </div>

          {/* Raw Data */}
          <details className="bg-gray-900 rounded-xl p-6">
            <summary className="cursor-pointer text-lg font-semibold mb-4">📄 Datos Crudos (Debug)</summary>
            <pre className="text-xs bg-black p-4 rounded overflow-x-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={loadDebugInfo}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            🔄 Recargar Información
          </button>
        </div>
      </div>
    </div>
  );
}