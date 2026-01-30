'use client';

import React from "react"

import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ fileName: string; chunkIndex: number }>;
  timestamp: Date;
}

interface ChatInterfaceProps {
  hasDocuments: boolean;
}

export function ChatInterface({ hasDocuments }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !hasDocuments) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get response: ${errorMessage}`);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 p-4 dark:border-gray-700 dark:from-blue-700 dark:to-blue-800">
        <h2 className="text-lg font-semibold text-white">RAG Chatbot</h2>
        <p className="text-sm text-blue-100">
          {hasDocuments ? 'Ask questions about your documents' : 'Upload documents to get started'}
        </p>
      </div>

      {!hasDocuments && (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <p className="mb-2 text-gray-600 dark:text-gray-400">No documents uploaded yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Upload some documents in the left panel to start asking questions.
            </p>
          </div>
        </div>
      )}

      {hasDocuments && (
        <>
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="mb-2 text-gray-600 dark:text-gray-400">Start a conversation</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Ask questions about your uploaded documents.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 text-sm last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
                        h2: ({ children }) => <h2 className="mb-2 text-base font-bold">{children}</h2>,
                        h3: ({ children }) => <h3 className="mb-2 text-sm font-bold">{children}</h3>,
                        ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-opacity-20 rounded px-2 py-1 font-mono text-xs">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="mb-2 overflow-x-auto rounded bg-opacity-10 p-2 text-xs">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="mb-2 border-l-2 border-opacity-30 pl-2 italic">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 border-t border-opacity-20 pt-2">
                      <p className="text-xs opacity-75">Sources:</p>
                      <ul className="text-xs list-disc list-inside opacity-75">
                        {message.sources.map((source, idx) => (
                          <li key={idx}>
                            {source.fileName} (chunk {source.chunkIndex})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-lg bg-red-100 p-3 text-red-800 dark:bg-red-900 dark:text-red-200">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
                  <Loader className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Thinking...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
}
