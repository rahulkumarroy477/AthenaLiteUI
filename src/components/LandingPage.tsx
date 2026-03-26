import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Database, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE } from '../api';

interface LandingPageProps {
  onUploadComplete: (data: any) => void;
  userId: string;
}

export default function LandingPage({ onUploadComplete, userId }: LandingPageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) { clearInterval(interval); return 95; }
        return prev + 5;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append('file', acceptedFiles[0]);

      const response = await fetch(`${API_BASE}/api/upload?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      setUploadProgress(100);
      setTimeout(() => onUploadComplete(data), 500);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete, userId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/octet-stream': ['.parquet'],
    },
    multiple: false,
  } as any);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold tracking-widest uppercase">
            <Database className="w-3 h-3 mr-2" />
            Serverless Query Engine
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
            Athena<span className="text-blue-500">Lite</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-lg mx-auto">
            Query your CSV, JSON, and Parquet files instantly with SQL.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`
            relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12
            ${isDragActive ? 'border-blue-500 bg-blue-500/5' : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-neutral-400 group-hover:text-blue-500" />
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-white">
                {isUploading ? 'Uploading your data...' : 'Drop your data file here'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">Supports CSV, JSON, and Parquet up to 50MB</p>
            </div>
            {isUploading && (
              <div className="w-full max-w-xs mt-4">
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: FileText, label: 'CSV' },
            { icon: Database, label: 'JSON' },
            { icon: ArrowRight, label: 'Parquet' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 flex flex-col items-center space-y-2">
              <item.icon className="w-5 h-5 text-neutral-500" />
              <span className="text-xs font-medium text-neutral-400">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
