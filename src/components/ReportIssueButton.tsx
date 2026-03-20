import React, { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { ReportIssueModal } from './ReportIssueModal';

interface ReportIssueButtonProps {
  moduleName: string;
}

export default function ReportIssueButton({ moduleName }: ReportIssueButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center gap-2 group"
        title="Report Issue"
      >
        <MessageSquareWarning className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          Report Issue
        </span>
      </button>

      <ReportIssueModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultModule={moduleName}
      />
    </>
  );
}
