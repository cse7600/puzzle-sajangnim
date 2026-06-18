'use client';

import { useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const KEYWORD_SUGGESTIONS = [
  '을지로 점심 맛집',
  '강남역 카페 추천',
  '사장님 마케팅 꿀팁',
];

/* ============================================================
 * ReceiptUploadModal
 * Centered modal with a drag-and-drop area for receipt upload.
 * ============================================================ */
export function ReceiptUploadModal({ isOpen, onClose }: ModalProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [uploaded, setUploaded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset internal state and close
  const handleClose = () => {
    setIsDragging(false);
    setFileName('');
    setUploaded(false);
    onClose();
  };

  // Simulate accepting a selected/dropped file
  const acceptFile = (name: string) => {
    setFileName(name);
    setUploaded(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file.name);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              영수증 올리기
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              영수증을 올리면 포인트가 적립됩니다
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {uploaded ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                영수증이 접수되었습니다!
              </h3>
              <p className="mt-2 text-sm font-medium text-[#0066cc]">
                +250P 적립 예정
              </p>
              {fileName && (
                <div className="mt-4 flex w-full items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate text-xs text-gray-600">
                    {fileName}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Drag-and-drop area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-gray-100 px-6 py-10 text-center transition ${
                  isDragging
                    ? 'border-[#0066cc] bg-blue-50'
                    : 'border-gray-300 hover:border-[#0066cc]/50'
                }`}
              >
                <UploadCloud className="h-9 w-9 text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  여기로 파일을 끌어다 놓으세요
                </p>
                <p className="mt-1 text-xs text-gray-400">또는</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#0058b3]"
                >
                  파일 선택
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <p className="mt-3 text-center text-xs text-gray-400">
                지원 형식: JPG, PNG, PDF
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {uploaded && (
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * NewPostDrawer
 * Right slide-in drawer for AI blog post generation.
 * ============================================================ */
export function NewPostDrawer({ isOpen, onClose }: ModalProps) {
  const [keyword, setKeyword] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);

  if (!isOpen) return null;

  // Reset internal state and close
  const handleClose = () => {
    setKeyword('');
    setIsGenerating(false);
    setGenerated(false);
    onClose();
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerated(false);
    // Simulate AI generation latency
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 1500);
  };

  const canGenerate = keyword.trim().length > 0 && !isGenerating;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="relative z-10 flex h-full w-96 max-w-full flex-col bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              AI 블로그 작성
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              키워드만 입력하면 끝
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {generated ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                포스트가 생성되었습니다!
              </h3>
              {keyword.trim() && (
                <p className="mt-2 text-sm text-gray-500">
                  키워드: {keyword.trim()}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  키워드
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 을지로 점심 맛집"
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-gray-700">
                  추천 키워드
                </p>
                <div className="flex flex-wrap gap-2">
                  {KEYWORD_SUGGESTIONS.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setKeyword(kw)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        keyword === kw
                          ? 'border-[#0066cc] bg-blue-50 text-[#0066cc]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-[#0066cc]/40 hover:bg-gray-50'
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
                <p className="text-xs leading-relaxed text-[#0066cc]">
                  AI가 SEO 최적화된 포스트를 자동 생성합니다
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          {generated ? (
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              확인
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI 블로그 생성
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
