'use client';

import React from "react"

import { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: Date;
  chunksAdded: number;
}

interface UploadZoneProps {
  onFileUploaded: (file: UploadedFile) => void;
}

export function UploadZone({ onFileUploaded }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(Array.from(e.target.files));
    }
  }, []);

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        const uploadedFile: UploadedFile = {
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          chunksAdded: data.chunksAdded,
        };

        setUploadedFiles((prev) => [uploadedFile, ...prev]);
        onFileUploaded(uploadedFile);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[v0] Upload failed:', errorMsg);
        setError(`Error uploading ${file.name}: ${errorMsg}`);
      }
    }

    setIsUploading(false);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="mb-3 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold">Upload Documents</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Drag and drop your files here or click to select
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
            accept=".txt,.md,.json,.csv,.pdf,.docx"
            disabled={isUploading}
          />
          <Button
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={isUploading}
            variant="outline"
          >
            {isUploading ? 'Uploading...' : 'Select Files'}
          </Button>
          <p className="mt-3 text-xs text-gray-500">
            Supported: TXT, MD, JSON, CSV, PDF, DOCX
          </p>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="mb-3 font-semibold">Uploaded Documents ({uploadedFiles.length})</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB • {file.chunksAdded} chunks
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.name)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
