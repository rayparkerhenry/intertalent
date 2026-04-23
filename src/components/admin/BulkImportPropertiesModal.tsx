'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiErrorResponse,
  PropertyBulkImportResponse,
  PropertyBulkSkippedRow,
} from '@/types/admin';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

const CSV_TEMPLATE = `name,address,city,state,zip
Sample Property,123 Main St,Austin,TX,78701
`;

type Phase = 'idle' | 'uploading' | 'result';

type ResultState =
  | {
      kind: 'success';
      imported: number;
      skipped: number;
      skipped_rows: PropertyBulkSkippedRow[];
    }
  | { kind: 'error'; message: string; code: string };

type BulkImportPropertiesModalProps = {
  isOpen: boolean;
  clientId: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function BulkImportPropertiesModal({
  isOpen,
  clientId,
  onClose,
  onSuccess,
}: BulkImportPropertiesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ResultState | null>(null);

  const reset = useCallback(() => {
    if (progressRef.current !== null) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setFile(null);
    setFileKey((k) => k + 1);
    setPhase('idle');
    setProgress(0);
    setResult(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    return () => {
      if (progressRef.current !== null) clearInterval(progressRef.current);
    };
  }, []);

  const validateFile = (f: File | null): string | null => {
    if (!f || f.size === 0) return 'Choose a CSV file.';
    if (f.size > MAX_CSV_BYTES) {
      return 'File too large — maximum size is 5 MB';
    }
    if (!f.name.toLowerCase().endsWith('.csv')) {
      return 'Only .csv files are accepted.';
    }
    return null;
  };

  const fileInvalid = file ? validateFile(file) : null;

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const pickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChosen = (f: File | null) => {
    setFile(f);
    setResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0] ?? null;
    onFileChosen(f);
  };

  const startProgressAnimation = () => {
    if (progressRef.current !== null) {
      clearInterval(progressRef.current);
    }
    setProgress(0);
    let v = 0;
    progressRef.current = setInterval(() => {
      v = Math.min(85, v + 1.2);
      setProgress(v);
      if (v >= 85 && progressRef.current !== null) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    }, 40);
  };

  const stopProgressAnimation = () => {
    if (progressRef.current !== null) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  };

  const runImport = async () => {
    if (clientId === null) return;

    const v = validateFile(file);
    if (v) return;
    if (!file) return;

    setPhase('uploading');
    setResult(null);
    startProgressAnimation();

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(
        `/api/admin/clients/${clientId}/properties/bulk`,
        {
          method: 'POST',
          body: fd,
        }
      );

      stopProgressAnimation();
      setProgress(100);

      const json = (await res.json()) as
        | PropertyBulkImportResponse
        | ApiErrorResponse;

      if (!json.success) {
        let message =
          'Something went wrong while importing. Please try again.';
        if (json.error === 'FILE_TOO_LARGE') {
          message = 'File too large — maximum size is 5 MB';
        } else if (json.error === 'UNSUPPORTED_FILE_TYPE') {
          message = 'Only .csv files are accepted. Please upload a valid CSV file.';
        } else if (json.error === 'MISSING_FILE') {
          message = 'Choose a CSV file.';
        } else if (json.error === 'EMPTY_FILE') {
          message = 'The file is empty.';
        } else if (json.error === 'MISSING_NAME_COLUMN') {
          message =
            'The CSV must include a header column named name (required).';
        } else if (json.error === 'INVALID_CSV') {
          message =
            'Could not read this CSV. Check the format and try again.';
        }
        setResult({ kind: 'error', message, code: json.error });
        setPhase('result');
        return;
      }

      setResult({
        kind: 'success',
        imported: json.imported,
        skipped: json.skipped,
        skipped_rows: json.skipped_rows,
      });
      setPhase('result');
    } catch {
      stopProgressAnimation();
      setProgress(100);
      setResult({
        kind: 'error',
        message:
          'Something went wrong while importing. Please try again.',
        code: 'NETWORK_ERROR',
      });
      setPhase('result');
    }
  };

  const handleTryAgain = () => {
    setResult(null);
    setPhase('idle');
    setProgress(0);
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen || clientId === null) return null;

  const showMainChrome = phase === 'idle';
  const showSuccessResult =
    phase === 'result' && result?.kind === 'success';
  const showErrorResult = phase === 'result' && result?.kind === 'error';

  const skippedSummaryText = (() => {
    if (!result || result.kind !== 'success' || result.skipped === 0) {
      return null;
    }
    const rows = result.skipped_rows;
    if (rows.length === 0) {
      return `⚠ ${result.skipped} row(s) skipped`;
    }
    const head = rows.slice(0, 3);
    const parts = head.map((r) => `Row ${r.row}: ${r.reason}`);
    let suffix = '';
    if (rows.length > 3) {
      suffix = ` (${rows.length - 3} more rows skipped total)`;
    }
    return `⚠ ${result.skipped} row(s) skipped — ${parts.join('; ')}${suffix}`;
  })();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-import-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="bulk-import-title"
          className="mb-4 text-lg font-bold text-gray-900"
        >
          📤 Import Properties from CSV
        </h2>

        <input
          key={fileKey}
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onFileChosen(f);
          }}
        />

        {phase === 'uploading' ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="mb-4 text-4xl" aria-hidden>
              ⏳
            </span>
            <p className="mb-4 text-sm font-bold text-gray-900">
              Importing properties...
            </p>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">Processing...</p>
          </div>
        ) : null}

        {showSuccessResult && result?.kind === 'success' ? (
          <div className="flex flex-col gap-4">
            <div className="border-l-4 border-green-600 bg-green-50 px-3 py-2 text-sm text-green-900">
              <span className="font-semibold text-green-800" aria-hidden>
                ✓{' '}
              </span>
              {result.imported} properties imported successfully
            </div>
            {result.skipped > 0 ? (
              <div className="border-l-4 border-orange-600 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                {skippedSummaryText}
              </div>
            ) : null}
            <p className="text-sm text-gray-600">
              {result.skipped > 0
                ? `The ${result.imported} imported properties have been added to the client and are now available in the portal search dropdown.`
                : `All ${result.imported} properties have been added to the client and are now available in the portal search dropdown.`}
            </p>
            <hr className="border-gray-200" />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDone}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        {showErrorResult && result?.kind === 'error' ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-gray-100 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
                <span>Need the format? Download the sample template</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="font-medium text-sky-800 hover:underline"
                >
                  ⬇ template.csv
                </button>
              </div>
            </div>

            <div
              className={`rounded-lg border-2 p-6 text-center ${
                fileInvalid
                  ? 'border-red-500 bg-red-50'
                  : 'border-2 border-sky-400 bg-sky-50'
              }`}
            >
              {fileInvalid ? (
                <>
                  <p className="mb-2 text-2xl font-bold text-red-600" aria-hidden>
                    ✕
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {file?.name ?? ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFileKey((k) => k + 1);
                    }}
                    className="mt-2 text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-2 text-2xl" aria-hidden>
                    ✅
                  </p>
                  <p className="text-sm font-bold text-sky-900">
                    {file?.name ?? ''}
                  </p>
                  {file ? (
                    <p className="mt-1 text-xs text-gray-600">
                      {(file.size / 1024).toFixed(1)} KB
                      {' · '}
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFileKey((k) => k + 1);
                        }}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
              {result.message}
            </div>
            <p className="text-xs text-gray-500">
              Error code: {result.code}
            </p>
            <hr className="border-gray-200" />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTryAgain}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : null}

        {showMainChrome ? (
          <>
            <div className="mb-4 rounded-md bg-gray-100 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
                <span>Need the format? Download the sample template</span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="font-medium text-sky-800 hover:underline"
                >
                  ⬇ template.csv
                </button>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pickFile();
                }
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={pickFile}
              className={`mb-3 rounded-lg border-2 p-6 text-center ${
                file && fileInvalid
                  ? 'cursor-pointer border-red-500 bg-red-50'
                  : file && !fileInvalid
                    ? 'border-sky-400 bg-sky-50'
                    : 'cursor-pointer border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {file && fileInvalid ? (
                <>
                  <p className="mb-2 text-2xl font-bold text-red-600" aria-hidden>
                    ✕
                  </p>
                  <p className="text-sm font-bold text-red-600">{file.name}</p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-red-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileKey((k) => k + 1);
                    }}
                  >
                    Remove
                  </button>
                </>
              ) : file && !fileInvalid ? (
                <>
                  <p className="mb-2 text-2xl" aria-hidden>
                    ✅
                  </p>
                  <p className="text-sm font-bold text-sky-900">{file.name}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {(file.size / 1024).toFixed(1)} KB
                    {' · '}
                    <button
                      type="button"
                      className="font-medium text-red-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileKey((k) => k + 1);
                      }}
                    >
                      Remove
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <span className="mb-2 block text-3xl" aria-hidden>
                    📂
                  </span>
                  <p className="mb-1 text-sm font-bold text-gray-900">
                    Drop your CSV file here
                  </p>
                  <p className="text-sm text-gray-600">
                    or{' '}
                    <button
                      type="button"
                      className="font-medium text-sky-800 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        pickFile();
                      }}
                    >
                      browse
                    </button>{' '}
                    to upload — .csv only, max 5 MB
                  </p>
                </>
              )}
            </div>

            {file && fileInvalid ? (
              <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
                {fileInvalid === 'Only .csv files are accepted.'
                  ? 'Only .csv files are accepted. Please upload a valid CSV file.'
                  : fileInvalid}
              </div>
            ) : null}

            <p className="mb-4 text-xs text-gray-500">
              Required column:{' '}
              <span className="font-medium text-gray-700">name</span> |
              Optional: address, city, state, zip
            </p>

            <hr className="border-gray-200" />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runImport()}
                disabled={!file || fileInvalid !== null}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
