import { createPortal } from 'react-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const ErrorModal = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <style>{`
        @keyframes modalPopIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-50px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .error-modal {
          animation: modalPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div className="error-modal bg-white rounded-3xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3 rounded-t-3xl">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
          <h2 className="text-lg font-bold text-red-600">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex justify-end rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ErrorModal
