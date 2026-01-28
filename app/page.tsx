'use client';

import { useState } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  const [hasDocuments, setHasDocuments] = useState(false);

  const handleFileUploaded = () => {
    setHasDocuments(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto h-screen max-w-7xl overflow-hidden p-4">
        <div className="flex h-full flex-col gap-4">
          {/* Header */}
          <div className="pt-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">RAG Chatbot</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload documents and ask questions using AI-powered search
            </p>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 gap-4 overflow-hidden">
            {/* Left Panel - Upload */}
            <div className="w-full overflow-y-auto md:w-1/3 lg:w-2/5">
              <UploadZone onFileUploaded={handleFileUploaded} />
            </div>

            {/* Right Panel - Chat */}
            <div className="hidden overflow-hidden md:block md:w-2/3 lg:w-3/5">
              <ChatInterface hasDocuments={hasDocuments} />
            </div>
          </div>

          {/* Mobile Chat */}
          <div className="block md:hidden pb-4">
            <ChatInterface hasDocuments={hasDocuments} />
          </div>
        </div>
      </div>
    </main>
  );
}
