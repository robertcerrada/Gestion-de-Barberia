'use client';

// src/components/modals/DeleteConfirmModal.tsx

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  message = '¿Estás seguro de que querés eliminar este elemento?',
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          Confirmar eliminación
        </h2>
        <p className="text-gray-600 mb-1">{message}</p>
        <p className="text-red-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
