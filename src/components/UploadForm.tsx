import React, { useState } from 'react';

interface UploadFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onSuccess, onError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setMessage('Please select a JSON file first.');
      return;
    }

    setIsUploading(true);
    setMessage('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(json),
        });

        if (response.ok) {
          if (onSuccess) onSuccess();
          setFile(null);
          // Reset file input
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          const errorData = await response.json();
          const errorMsg = errorData.error || 'Failed to upload file.';
          setMessage(errorMsg);
          if (onError) onError(errorMsg);
        }
      } catch (error) {
        console.error(error);
        const errorMsg = 'An error occurred. Invalid JSON or server error.';
        setMessage(errorMsg);
        if (onError) onError(errorMsg);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      const errorMsg = 'Failed to read file';
      setMessage(errorMsg);
      if (onError) onError(errorMsg);
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="file-upload" className="block text-sm font-medium text-zinc-900">
          Select JSON File
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          disabled={isUploading}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 transition"
        />
      </div>

      <button
        type="submit"
        disabled={isUploading || !file}
        className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
      >
        {isUploading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        ) : (
          'Upload Vocabulary'
        )}
      </button>

      {message && (
        <p className="text-sm text-red-600 mt-2 font-medium">
          {message}
        </p>
      )}
    </form>
  );
};

export default UploadForm;