'use client';

import { useState } from 'react';

interface ActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'danger' | 'warning' | 'info';
  /** Champ additionnel affiché entre la description et les boutons (ex: motif de bannissement). */
  children?: React.ReactNode;
  cancelLabel?: string;
  processingLabel?: string;
}

export function ActionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  children,
  cancelLabel = 'Annuler',
  processingLabel = 'Traitement...',
}: ActionConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl dark:bg-neo-obsidian">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {description}
        </p>
        {children}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium
              text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300
              disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition
              ${variantStyles[variant]} disabled:opacity-50`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {processingLabel}
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook utilitaire pour gérer la modale
export function useConfirmationModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: (() => Promise<void>) | null;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: '',
    variant: 'danger',
    onConfirm: null,
  });

  const showModal = (options: {
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void>;
  }) => {
    setModalState({ ...options, isOpen: true });
  };

  const hideModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return { modalState, showModal, hideModal };
}
