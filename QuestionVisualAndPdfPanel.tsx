import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { QuestionRecord } from '../types/exam';

interface QuestionVisualAndPdfPanelProps {
  question: QuestionRecord;
  showOriginalImage: boolean;
  onToggleOriginalImage: () => void;
  showSpecificPdf: boolean;
  onToggleSpecificPdf: () => void;
}

const ZOOM_LEVELS = [100, 150, 200, 250] as const;

export const QuestionVisualAndPdfPanel: React.FC<QuestionVisualAndPdfPanelProps> = ({
  question,
  showOriginalImage,
  onToggleOriginalImage,
  showSpecificPdf,
  onToggleSpecificPdf,
}) => {
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [fullscreenImageOpen, setFullscreenImageOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setZoomPct(100);
    setImgError(false);
    setFullscreenImageOpen(false);
  }, [question.questionId, question.id]);

  useEffect(() => {
    if (!fullscreenImageOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenImageOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenImageOpen]);

  const imagePath = question.originalImagePath;
  const specificPdfUrl = question.specificPdfPath;
  const derivativePage = question.specificPdfPage ?? 1;
  const originalPage = question.sourcePdfPageOriginal ?? question.paginaPdf;

  const pdfViewerSrc = specificPdfUrl
    ? `${specificPdfUrl}#page=${derivativePage}`
    : undefined;

  return (
    <div className="space-y-3">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {imagePath && (
          <button
            type="button"
            onClick={onToggleOriginalImage}
            aria-pressed={showOriginalImage}
            className={
              showOriginalImage ? 'ui-btn-primary' : 'ui-btn-secondary'
            }
          >
            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              {showOriginalImage ? 'Ocultar questão original' : 'Ver questão original'}
            </span>
          </button>
        )}

        {specificPdfUrl && (
          <button
            type="button"
            onClick={onToggleSpecificPdf}
            aria-pressed={showSpecificPdf}
            className={
              showSpecificPdf
                ? 'ui-btn-primary'
                : 'ui-btn-secondary text-[var(--brand-primary-ink)]'
            }
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>
              {showSpecificPdf
                ? 'Ocultar PDF específico'
                : `Abrir PDF específico (pág. ${derivativePage})`}
            </span>
          </button>
        )}

        {question.referenceMaterialPath && (
          <a
            href={question.referenceMaterialPath}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-btn-secondary"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>Tabela periódica de apoio (PDF)</span>
          </a>
        )}
      </div>

      {/* Original Question WebP Crop Viewer */}
      {showOriginalImage && imagePath && (
        <section
          aria-label="Recorte fiel da questão original em WebP"
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                Recorte original fiel ({question.appLookupKey || `Q${question.questao}`})
              </span>
              <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                Pág. original {originalPage} · Pág. PDF específico {derivativePage}
                {question.imageWidthPx && question.imageHeightPx
                  ? ` · ${question.imageWidthPx}×${question.imageHeightPx}px`
                  : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setZoomPct((z) => {
                    const idx = ZOOM_LEVELS.indexOf(z as (typeof ZOOM_LEVELS)[number]);
                    return idx > 0 ? ZOOM_LEVELS[idx - 1] : 100;
                  })
                }
                disabled={zoomPct <= 100}
                aria-label="Reduzir zoom da imagem"
                className="ui-btn-secondary !min-h-[32px] !px-2 !py-1"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[46px] text-center font-mono text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
                {zoomPct}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setZoomPct((z) => {
                    const idx = ZOOM_LEVELS.indexOf(z as (typeof ZOOM_LEVELS)[number]);
                    return idx >= 0 && idx < ZOOM_LEVELS.length - 1
                      ? ZOOM_LEVELS[idx + 1]
                      : 250;
                  })
                }
                disabled={zoomPct >= 250}
                aria-label="Ampliar zoom da imagem"
                className="ui-btn-secondary !min-h-[32px] !px-2 !py-1"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenImageOpen(true)}
                className="ui-btn-secondary !min-h-[32px] !px-2.5 !py-1 text-[11px]"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Ampliar</span>
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[540px] overflow-auto rounded-lg border border-[var(--border-subtle)] bg-white p-3">
            {imgError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[var(--text-muted)]">
                <ImageIcon className="mb-2 h-6 w-6 opacity-50" />
                <p className="font-semibold text-[var(--text-primary)]">
                  Imagem original indisponível ({imagePath})
                </p>
                <p className="mt-1">
                  Consulte a página {derivativePage} do PDF específico ou a página {originalPage} do caderno original.
                </p>
              </div>
            ) : (
              <div
                className="mx-auto flex justify-center"
                style={{
                  width: zoomPct === 100 ? '100%' : `${zoomPct}%`,
                  minWidth: '100%',
                }}
              >
                <img
                  src={imagePath}
                  alt={`Questão ${question.questao} original de ${question.prova}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="max-h-[480px] w-auto max-w-full object-contain"
                  style={
                    zoomPct > 100
                      ? { maxHeight: 'none', width: '100%', height: 'auto', objectFit: 'contain' }
                      : { objectFit: 'contain' }
                  }
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Reduced Specific-Knowledge PDF Viewer */}
      {showSpecificPdf && pdfViewerSrc && (
        <section
          aria-label="Versão reduzida do PDF — Somente Conhecimentos Específicos"
          className="rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
            <div className="text-xs">
              <div className="font-semibold text-[var(--brand-secondary)]">
                PDF da Prova — Somente Conhecimentos Específicos
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)] tabular-nums">
                Posicionado na página {derivativePage}
                {question.specificPdfTotalPages
                  ? ` de ${question.specificPdfTotalPages}`
                  : ''}{' '}
                do PDF reduzido · Página original do caderno: {originalPage}
              </div>
            </div>

            <a
              href={pdfViewerSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-btn-secondary !min-h-[32px] !px-2.5 !py-1 text-[11px]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir em nova aba</span>
            </a>
          </div>

          <iframe
            key={`${question.questionId || question.id}-${derivativePage}`}
            src={pdfViewerSrc}
            title={`${question.prova} — Conhecimentos Específicos pág. ${derivativePage}`}
            className="h-[460px] w-full rounded-lg border border-[var(--border-subtle)] bg-white"
          />
        </section>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImageOpen && imagePath && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Ampliação da questão ${question.questao}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFullscreenImageOpen(false);
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
              <div className="min-w-0 text-xs">
                <span className="font-semibold text-[var(--text-primary)]">
                  {question.prova} — Questão {question.questao}
                </span>
                <span className="ml-2 font-mono text-[var(--text-muted)] tabular-nums">
                  {question.appLookupKey || question.questionId} · Pág. original {originalPage} · Pág. PDF específico {derivativePage}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenImageOpen(false)}
                aria-label="Fechar ampliação"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-5">
              <img
                src={imagePath}
                alt={`Questão ${question.questao} ampliada de ${question.prova}`}
                referrerPolicy="no-referrer"
                className="mx-auto h-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
