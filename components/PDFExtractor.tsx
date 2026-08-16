'use client';

import { useCallback, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do pdfjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

interface PDFExtractorProps {
  onTextExtracted: (text: string, pageCount: number) => void;
  onError: (error: string) => void;
  onProgress: (progress: number, status: string) => void;
  maxPages?: number;
}

export function PDFExtractor({
  onTextExtracted,
  onError,
  onProgress,
  maxPages = 500,
}: PDFExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      onProgress(5, 'Carregando PDF...');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const totalPages = Math.min(pdf.numPages, maxPages);
      onProgress(10, `PDF carregado: ${totalPages} páginas (limite: ${maxPages})`);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `\n--- Página ${pageNum} ---\n${pageText}\n`;
        
        const pageProgress = 10 + Math.round((pageNum / totalPages) * 80);
        setProgress(pageProgress);
        onProgress(pageProgress, `Extraindo texto: página ${pageNum}/${totalPages}`);
      }
      
      onProgress(95, 'Finalizando extração...');
      onTextExtracted(fullText.trim(), totalPages);
      setProgress(100);
      onProgress(100, `Extração concluída: ${totalPages} páginas`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      onError(`Erro ao extrair texto do PDF: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [onTextExtracted, onError, onProgress, maxPages]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      onError('Arquivo não é um PDF válido');
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      onError('Arquivo muito grande (máx. 100MB)');
      return;
    }
    
    extractTextFromPDF(file);
  }, [extractTextFromPDF, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  return (
    <div className="relative w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}
        `}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(e as any)}
      >
        {isProcessing ? (
          <div className="space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Processando PDF...</p>
              <p className="text-sm text-muted-foreground">{progress}%</p>
              <div className="w-full max-w-xs mx-auto h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Arraste um PDF ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mb-4">Limite: {maxPages} páginas | Máx. 100MB</p>
          </>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {isProcessing && progress > 0 && progress < 100 && (
        <div className="mt-4 glass rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Extraindo texto do PDF...</p>
              <p className="text-xs text-muted-foreground">Convertendo páginas para texto processável</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}