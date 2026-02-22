'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileCheck2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { FileUploader } from '@/components/file-uploader';

export default function ImportStudentsPage() {
  const [files, setFiles] = useState<File[]>([]);

  const handleUpload = () => {
    // TODO: Implement webhook call for `STUDENT_IMPORT_PROCESS`
    // This would involve reading the file (e.g., using a library like PapaParse for CSV)
    // and sending the parsed data to the backend.
    console.log("Uploading files:", files);
    alert(`Simulating upload for ${files.length} file(s). Check the console.`);
  };

  return (
    <div>
        <div className="mb-4">
            <Button asChild variant="outline" size="sm">
                <Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Students</Link>
            </Button>
        </div>
      <PageHeader
        title="Import Students"
        description="Bulk-add students to your classes using a CSV or Excel file."
      />
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select a .csv or .xlsx file to import. The first row should contain the headers: 
            <code className="mx-1 p-1 bg-muted rounded-sm text-xs">fullName</code>, 
            <code className="mx-1 p-1 bg-muted rounded-sm text-xs">studentIdNumber</code>,
            <code className="mx-1 p-1 bg-muted rounded-sm text-xs">className</code>, and
            <code className="mx-1 p-1 bg-muted rounded-sm text-xs">parentEmail</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploader
            onFilesSelected={setFiles}
            acceptedFileTypes={{
                'text/csv': ['.csv'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            }}
          />
           {files.length > 0 && (
            <div className="mt-4 p-3 border rounded-md bg-muted/50">
              <h4 className="text-sm font-medium mb-2">Selected file:</h4>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <FileCheck2 className="h-4 w-4 text-green-500" />
                <span>{files[0].name}</span>
                <span className="text-muted-foreground">- ({(files[0].size / 1024).toFixed(2)} KB)</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleUpload} disabled={files.length === 0}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload and Process File
            </Button>
        </CardFooter>
      </Card>
       <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
        TODO: Implement webhook call for `STUDENT_IMPORT_PROCESS`.
      </p>
    </div>
  );
}
