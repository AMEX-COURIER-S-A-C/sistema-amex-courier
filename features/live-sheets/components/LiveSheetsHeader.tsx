import React from 'react';
import {
  FileSpreadsheet,
  Star,
  CloudCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ClipboardPaste,
  Sparkles,
  Download,
  Zap,
  Camera,
  Volume2,
  VolumeX,
  Mic,
  ArrowRight,
  Undo2
} from 'lucide-react';
import { Collaborator, SheetStats } from '../types';
import { soundEffects } from '@/lib/audio/soundEffects';

interface LiveSheetsHeaderProps {
  activeHojaId: string;
  docTitle: string;
  setDocTitle: (val: string) => void;
  onTitleBlur: () => void;
  isStarred: boolean;
  setIsStarred: (val: boolean) => void;
  realtimeStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  collaborators: Collaborator[];
  stats: SheetStats;
  onBackToHub: () => void;
  onExportExcel: () => void;
  onOpenPasteModal: () => void;
  onFocusBarcodeInput: () => void;
  onLoadFromDatabase: () => void;
  onResetScans: () => void;
  barcodeInput?: string;
  setBarcodeInput?: (val: string) => void;
  barcodeInputRef?: React.RefObject<HTMLInputElement | null>;
  onManualScanSubmit?: (e: React.FormEvent) => void;
  onOpenCameraScanner?: () => void;
  isMuted?: boolean;
  setIsMuted?: (val: boolean) => void;
  isVoiceEnabled?: boolean;
  setIsVoiceEnabled?: (val: boolean) => void;
  onSyncToMainPackages?: () => void;
}

export function LiveSheetsHeader({
  docTitle,
  setDocTitle,
  onTitleBlur,
  isStarred,
  setIsStarred,
  realtimeStatus,
  collaborators,
  stats,
  onBackToHub,
  onExportExcel,
  onOpenPasteModal,
  onLoadFromDatabase,
  onResetScans,
  barcodeInput = '',
  setBarcodeInput,
  barcodeInputRef,
  onManualScanSubmit,
  onOpenCameraScanner,
  isMuted = false,
  setIsMuted,
  isVoiceEnabled = true,
  setIsVoiceEnabled,
  onSyncToMainPackages
}: LiveSheetsHeaderProps) {
  return (
    <header
      className="gsheet-header-top"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '6px 12px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        minHeight: '48px'
      }}
    >
      {/* Izquierda: Volver al Hub + Título + Operadores en Vivo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <button
          type="button"
          onClick={onBackToHub}
          title="Volver a la galería de libros Amex Excel"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#334155',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={14} />
          <span>Libros</span>
        </button>

        <div
          className="gsheet-logo-icon"
          onClick={onBackToHub}
          style={{ cursor: 'pointer', width: '28px', height: '28px', flexShrink: 0 }}
          title="Amex Excel (Univer Engine)"
        >
          <FileSpreadsheet size={16} />
        </div>

        <input
          type="text"
          className="gsheet-doc-title"
          value={docTitle}
          onChange={e => setDocTitle(e.target.value)}
          onBlur={onTitleBlur}
          title="Renombrar libro de cotejo"
          style={{
            fontSize: '14px',
            fontWeight: 700,
            maxWidth: '170px',
            padding: '2px 6px'
          }}
        />

        <button
          type="button"
          className="gsheet-star-btn"
          onClick={() => setIsStarred(!isStarred)}
          title={isStarred ? 'Destacado' : 'No destacado'}
          style={{ padding: '2px' }}
        >
          <Star size={14} fill={isStarred ? '#fbbc04' : 'none'} color={isStarred ? '#fbbc04' : '#64748b'} />
        </button>

        {/* Presencia en tiempo real compacta */}
        <div
          className="gsheet-presence-pill"
          style={{ padding: '2px 8px', fontSize: '11px' }}
          title={
            collaborators.length > 0
              ? `Operadores activos: ${collaborators.map(c => c.name).join(', ')}`
              : 'Conectando con Supabase Realtime...'
          }
        >
          <span
            className={`gsheet-presence-dot ${
              realtimeStatus === 'CONNECTED'
                ? 'online'
                : realtimeStatus === 'CONNECTING'
                ? 'connecting'
                : 'offline'
            }`}
          />
          <CloudCheck size={12} className="text-emerald-600" />
          <span style={{ fontWeight: 600 }}>{collaborators.length}</span>
          <div className="gsheet-avatars-cluster">
            {collaborators.slice(0, 3).map(c => {
              const initials = c.name
                .split(' ')
                .map(w => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              return (
                <div
                  key={c.id}
                  className="gsheet-avatar-badge"
                  style={{ backgroundColor: c.color, width: '20px', height: '20px', fontSize: '9px' }}
                  title={`${c.name}${c.activeCell ? ` • Celda ${c.activeCell}` : ''}`}
                >
                  <span>{initials}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Centro: Pistola de código de barras + Acciones rápidas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', minWidth: '280px' }}>
        {onManualScanSubmit && setBarcodeInput && (
          <form
            onSubmit={onManualScanSubmit}
            className="gsheet-gun-input-wrap"
            style={{
              maxWidth: '310px',
              width: '100%',
              height: '32px',
              padding: '0 8px'
            }}
          >
            <Zap size={14} className="gsheet-gun-icon" />
            <input
              ref={barcodeInputRef as any}
              type="text"
              className="gsheet-gun-input"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Dispara la pistola WR aquí o en Col D..."
              style={{ fontSize: '12px' }}
            />
            {onOpenCameraScanner && (
              <button
                type="button"
                onClick={onOpenCameraScanner}
                className="gsheet-btn-tool"
                title="Escanear con cámara"
                style={{ width: '24px', height: '24px' }}
              >
                <Camera size={13} />
              </button>
            )}
          </form>
        )}

        <button
          type="button"
          className="gsheet-btn-action paste"
          onClick={onOpenPasteModal}
          title="Pegar lista de paquetes de Excel / Google Sheets"
          style={{ height: '30px', padding: '0 10px', fontSize: '11.5px' }}
        >
          <ClipboardPaste size={13} />
          <span>Pegar Lista</span>
        </button>

        <button
          type="button"
          className="gsheet-btn-action secondary"
          onClick={onLoadFromDatabase}
          title="Cargar paquetes desde la base de datos"
          style={{ height: '30px', padding: '0 9px', fontSize: '11.5px' }}
        >
          <Sparkles size={13} className="text-sky-600" />
          <span>Cargar BD</span>
        </button>

        <button
          type="button"
          className="gsheet-btn-action export"
          onClick={onExportExcel}
          title="Descargar archivo .XLSX"
          style={{ height: '30px', padding: '0 9px', fontSize: '11.5px' }}
        >
          <Download size={13} />
          <span>XLSX</span>
        </button>

        <button
          type="button"
          className="gsheet-btn-action secondary"
          onClick={onResetScans}
          title="Reiniciar todos los códigos escaneados en Columna D"
          style={{ height: '30px', padding: '0 8px', fontSize: '11.5px' }}
        >
          <Undo2 size={12} className="text-amber-600" />
        </button>
      </div>

      {/* Derecha: Estadísticas + Voz TTS + Sincronizar a Lince */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div className="gsheet-stats-pill" style={{ padding: '3px 9px', fontSize: '11px', gap: '6px' }}>
          <span>
            Total: <strong>{stats.total}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="gsheet-stat-tag found">
            <CheckCircle2 size={12} /> <strong>{stats.encontrados}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="gsheet-stat-tag not-found">
            <AlertTriangle size={12} /> <strong>{stats.noEncontrados + stats.pendientes}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sky-700 font-mono">
            <strong>{stats.progreso}%</strong>
          </span>
        </div>

        {/* Botón Activar/Desactivar Voz */}
        {setIsVoiceEnabled && (
          <button
            type="button"
            className={`gsheet-btn-tool ${isVoiceEnabled ? 'active' : ''}`}
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            title={
              isVoiceEnabled
                ? 'Voz activada: anuncia el nombre del cliente, código repetido o no encontrado'
                : 'Voz desactivada (clic para activar)'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: isVoiceEnabled ? '1px solid #10b981' : '1px solid #cbd5e1',
              background: isVoiceEnabled ? '#ecfdf5' : '#f8fafc',
              color: isVoiceEnabled ? '#047857' : '#64748b',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            <Mic size={12} />
            <span>{isVoiceEnabled ? 'Voz ON' : 'Voz OFF'}</span>
          </button>
        )}

        {/* Botón Probar Voz (Desbloquea y verifica el motor TTS del navegador al instante) */}
        <button
          type="button"
          onClick={() => {
            if (setIsMuted && isMuted) setIsMuted(false);
            if (setIsVoiceEnabled && !isVoiceEnabled) setIsVoiceEnabled(true);
            soundEffects.testVoice();
          }}
          title="Probar y activar el altavoz de voz en español"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 8px',
            height: '30px',
            borderRadius: '6px',
            border: '1px solid #bae6fd',
            background: '#f0f9ff',
            color: '#0369a1',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Volume2 size={12} />
          <span>Probar Voz</span>
        </button>

        {setIsMuted && (
          <button
            type="button"
            className={`gsheet-btn-tool ${!isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Audio silenciado (clic para activar)' : 'Silenciar audio'}
            style={{ height: '30px', width: '30px' }}
          >
            {isMuted ? <VolumeX size={14} className="text-red-500" /> : <Volume2 size={14} />}
          </button>
        )}

        {onSyncToMainPackages && (
          <button
            type="button"
            className="gsheet-btn-action secondary"
            onClick={onSyncToMainPackages}
            title="Actualizar estado de los paquetes encontrados a 'En Almacén Central Lince'"
            style={{ height: '30px', padding: '0 10px', fontSize: '11.5px' }}
          >
            <ArrowRight size={13} className="text-blue-600" />
            <span>Sincronizar a Lince</span>
          </button>
        )}
      </div>
    </header>
  );
}
