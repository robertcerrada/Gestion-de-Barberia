'use client';

// src/components/modals/DeleteConfirmModal.tsx
// Ejemplo de cómo usar t() en un modal con traducción completa

import { useTranslation } from '@/hooks/useTranslation';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // Pasa la clave de traducción específica según el contexto
  messageKey?: 'appointments.confirmDelete' | 'clients.confirmDelete' | 'services.confirmDelete' | 'barbers.confirmDelete';
}

export default function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  messageKey = 'appointments.confirmDelete',
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">

        {/* Título del modal — traducido */}
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          {t('modals.deleteTitle')}
        </h2>

        {/* Mensaje específico — traducido */}
        <p className="text-gray-600 mb-1">{t(messageKey)}</p>
        <p className="text-red-500 text-sm mb-6">{t('modals.deleteWarning')}</p>

        {/* Botones — traducidos */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('common.delete')}
          </button>
        </div>

      </div>
    </div>
  );
}
