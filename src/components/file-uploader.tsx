'use client';

import { useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  acceptedFileTypes?: Accept;
}

export function FileUploader({
  onFileSelected,
  acceptedFileTypes = {},
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        'border-muted-foreground/30 hover:border-primary/50',
        isDragActive && 'border-primary bg-primary/10'
      )}
    >
      <input {...getInputProps()} />
      <div className="text-center">
        <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="mt-4 font-semibold text-foreground">
          {isDragActive ? 'Drop the file here...' : 'Drag & drop file, or click to select'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supported: {Object.values(acceptedFileTypes).flat().join(', ')}
        </p>
      </div>
    </div>
  );
}
