'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, Trash2, Download, Eye, FileBadge, FileSignature, Home, Award, User, File } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DocumentoBarbero, type TipoDocumento } from '@/lib/db';

// ── Configuración de tipos de documento ───────────────────────
const TIPOS_DOC: { value: TipoDocumento; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'dni',           label: 'DNI / Identidad',    icon: <FileBadge size={14} />,    color: '#5288E0' },
  { value: 'contrato',      label: 'Contrato',            icon: <FileSignature size={14} />, color: '#D4AF37' },
  { value: 'alquiler_silla',label: 'Alquiler de Silla',   icon: <Home size={14} />,          color: '#4CAF82' },
  { value: 'certificado',   label: 'Certificado',         icon: <Award size={14} />,         color: '#A052E0' },
  { value: 'foto_perfil',   label: 'Foto de Perfil',      icon: <User size={14} />,          color: '#E09A52' },
  { value: 'otro',          label: 'Otro',                icon: <File size={14} />,          color: '#888888' },
];

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function tipoInfo(tipo: TipoDocumento) {
  return TIPOS_DOC.find(t => t.value === tipo) ?? TIPOS_DOC[TIPOS_DOC.length - 1];
}

function isPdf(mime: string) { return mime === 'application/pdf'; }
function isImage(mime: string) { return mime.startsWith('image/'); }

// ── Componente principal ───────────────────────────────────────
interface ModalDocumentosBarberoProps {
  barberoId: number;
  barberoNombre: string;
  onClose: () => void;
}

export function ModalDocumentosBarbero({ barberoId, barberoNombre, onClose }: ModalDocumentosBarberoProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [tipoSel, setTipoSel] = useState<TipoDocumento>('contrato');
  const [descripcion, setDescripcion] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState<DocumentoBarbero | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentos = useLiveQuery(
    () => db.documentos_barbero
      .where('barbero_id').equals(barberoId)
      .reverse()
      .sortBy('fecha_subida'),
    [barberoId]
  );

  const totalSize = documentos?.reduce((s, d) => s + d.tamano_bytes, 0) ?? 0;

  async function procesarArchivo(file: File) {
    setError('');

    if (file.size > MAX_SIZE_BYTES) {
      setError(`El archivo supera el límite de ${MAX_SIZE_MB} MB. Tamaño: ${formatBytes(file.size)}`);
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
      setError('Solo se admiten imágenes (JPG, PNG, WEBP) o archivos PDF.');
      return;
    }

    setSubiendo(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });

      await db.documentos_barbero.add({
        barbero_id: barberoId,
        tipo: tipoSel,
        nombre: file.name,
        descripcion: descripcion.trim() || undefined,
        mime_type: file.type,
        data: base64,
        fecha_subida: new Date(),
        tamano_bytes: file.size,
      });

      setDescripcion('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError('Error al guardar el archivo. Intenta de nuevo.');
    }
    setSubiendo(false);
  }

  async function eliminar(doc: DocumentoBarbero) {
    if (!doc.id) return;
    if (!confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    await db.documentos_barbero.delete(doc.id);
    if (vistaPrevia?.id === doc.id) setVistaPrevia(null);
  }

  function descargar(doc: DocumentoBarbero) {
    const link = document.createElement('a');
    link.href = `data:${doc.mime_type};base64,${doc.data}`;
    link.download = doc.nombre;
    link.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  }

  // Agrupar por tipo
  const grupos = TIPOS_DOC
    .map(t => ({ ...t, docs: documentos?.filter(d => d.tipo === t.value) ?? [] }))
    .filter(g => g.docs.length > 0);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-handle" />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: 2 }}>📁 Documentos</h2>
              <p style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{barberoNombre}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {totalSize > 0 && (
                <span style={{ fontSize: 11, color: 'var(--gray-muted)', background: 'var(--black-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--black-border)' }}>
                  {formatBytes(totalSize)} usados
                </span>
              )}
              <button type="button" aria-label="Cerrar documentos" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}>
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Scroll contenido */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>

            {/* ── Zona de subida ── */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--gold)' : 'rgba(212,175,55,0.3)'}`,
                borderRadius: 14,
                padding: '18px 16px',
                cursor: 'pointer',
                background: dragOver ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
            >
              <Upload size={26} color={dragOver ? 'var(--gold)' : 'var(--gray-muted)'} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: dragOver ? 'var(--gold)' : 'var(--white-soft)', marginBottom: 3 }}>
                {subiendo ? 'Guardando...' : 'Toca o arrastrá un archivo'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--gray-muted)' }}>
                JPG · PNG · WEBP · PDF — máx. {MAX_SIZE_MB} MB
              </p>
              <input
                id="documento-barbero-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                aria-label="Subir documento del barbero"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: 'var(--danger)', fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            {/* Selector de tipo + descripción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tipo de documento
                </span>
                <div role="group" aria-label="Tipo de documento" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {TIPOS_DOC.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipoSel(t.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 10px', borderRadius: 10, border: 'none',
                        background: tipoSel === t.value ? `${t.color}22` : 'var(--black-surface)',
                        outline: `1.5px solid ${tipoSel === t.value ? t.color : 'var(--black-border)'}`,
                        color: tipoSel === t.value ? t.color : 'var(--gray-muted)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: tipoSel === t.value ? 700 : 400,
                        transition: 'all 0.15s',
                        textAlign: 'left',
                      }}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="documento-barbero-descripcion" style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Descripción <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                </label>
                <input
                  id="documento-barbero-descripcion"
                  className="input-dark"
                  type="text"
                  value={descripcion}
                  maxLength={200}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Ej: Contrato firmado en marzo 2024"
                />
              </div>
            </div>

            {/* ── Lista de documentos agrupada ── */}
            {(documentos?.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--gray-muted)' }}>
                <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
                <p style={{ fontSize: 13 }}>Sin documentos aún</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Subí el primero usando la zona de arriba</p>
              </div>
            ) : (
              grupos.map(grupo => (
                <div key={grupo.value}>
                  {/* Cabecera de grupo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ color: grupo.color }}>{grupo.icon}</span>
                    <p style={{ fontSize: 11, fontWeight: 700, color: grupo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {grupo.label}
                    </p>
                    <span style={{ fontSize: 10, color: 'var(--gray-muted)', marginLeft: 2 }}>({grupo.docs.length})</span>
                    <div style={{ flex: 1, height: 1, background: `${grupo.color}22`, marginLeft: 4 }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grupo.docs.map(doc => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        color={grupo.color}
                        onDelete={() => eliminar(doc)}
                        onDownload={() => descargar(doc)}
                        onPreview={() => setVistaPrevia(doc)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Vista previa ── */}
      {vistaPrevia && (
        <ModalVistaPrevia
          doc={vistaPrevia}
          onClose={() => setVistaPrevia(null)}
          onDownload={() => descargar(vistaPrevia)}
          onDelete={() => { eliminar(vistaPrevia); }}
        />
      )}
    </>
  );
}

// ── Tarjeta de documento ───────────────────────────────────────
function DocCard({ doc, color, onDelete, onDownload, onPreview }: {
  doc: DocumentoBarbero;
  color: string;
  onDelete: () => void;
  onDownload: () => void;
  onPreview: () => void;
}) {
  const esImg = isImage(doc.mime_type);
  const esPdf = isPdf(doc.mime_type);
  const fecha = new Date(doc.fecha_subida).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div
      className="card"
      style={{
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderColor: `${color}33`,
        background: `${color}08`,
        transition: 'all 0.15s',
      }}
    >
      {/* Thumbnail o ícono PDF */}
      <button
        type="button"
        aria-label={`Vista previa de ${doc.nombre}`}
        onClick={onPreview}
        style={{
          width: 42, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: esPdf ? 'rgba(224,82,82,0.12)' : 'var(--black-surface)',
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {esImg ? (
          // data: URIs used for thumbnails — next/image cannot optimize data URIs reliably
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:${doc.mime_type};base64,${doc.data}`}
            alt={doc.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <FileText size={20} color={esPdf ? '#E05252' : color} />
        )}
      </button>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
          {doc.nombre}
        </p>
        {doc.descripcion && (
          <p style={{ fontSize: 11, color: 'var(--gray-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
            {doc.descripcion}
          </p>
        )}
        <p style={{ fontSize: 10, color: 'var(--gray-muted)' }}>
          {formatBytes(doc.tamano_bytes)} · {fecha}
        </p>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <ActionBtn onClick={onPreview} title="Ver" color={color}>
          <Eye size={14} />
        </ActionBtn>
        <ActionBtn onClick={onDownload} title="Descargar" color="#4CAF82">
          <Download size={14} />
        </ActionBtn>
        <ActionBtn onClick={onDelete} title="Eliminar" color="#E05252">
          <Trash2 size={14} />
        </ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, color, children }: { onClick: () => void; title: string; color: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}30`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}18`)}
    >
      {children}
    </button>
  );
}

// ── Modal vista previa ─────────────────────────────────────────
function ModalVistaPrevia({ doc, onClose, onDownload, onDelete }: {
  doc: DocumentoBarbero;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const esImg = isImage(doc.mime_type);
  const esPdf = isPdf(doc.mime_type);
  const dataUrl = `data:${doc.mime_type};base64,${doc.data}`;
  const info = tipoInfo(doc.tipo);

  function handleDelete() {
    onDelete();
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 100001, alignItems: 'center', padding: '16px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--black-card)',
          border: '1.5px solid rgba(212,175,55,0.25)',
          borderRadius: 18,
          width: '100%',
          maxWidth: 420,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--black-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ color: info.color, flexShrink: 0 }}>{info.icon}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {doc.nombre}
              </p>
              <p style={{ fontSize: 10, color: 'var(--gray-muted)' }}>
                {info.label} · {formatBytes(doc.tamano_bytes)}
              </p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar vista previa" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)', flexShrink: 0, marginLeft: 8 }}>
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
          {esImg && (
            // Preview uses data: URI — keep <img> and disable rule for this case
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={doc.nombre}
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
            />
          )}
          {esPdf && (
            <iframe
              src={dataUrl}
              sandbox="allow-downloads"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '60vh', border: 'none' }}
              title={doc.nombre}
            />
          )}
          {!esImg && !esPdf && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <FileText size={48} color="var(--gray-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: 'var(--gray-muted)' }}>Vista previa no disponible para este tipo de archivo.</p>
            </div>
          )}
        </div>

        {/* Descripción si existe */}
        {doc.descripcion && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--black-border)', background: 'rgba(212,175,55,0.04)', flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: 'var(--gray-muted)' }}>
              💬 <em>{doc.descripcion}</em>
            </p>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--black-border)', flexShrink: 0 }}>
          <button type="button" className="btn-gold" style={{ flex: 1, minHeight: 38, fontSize: 13 }} onClick={onDownload}>
            <Download size={15} /> Descargar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              minHeight: 38, padding: '0 14px', borderRadius: 10, border: '1.5px solid rgba(224,82,82,0.4)',
              background: 'rgba(224,82,82,0.08)', color: 'var(--danger)',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
