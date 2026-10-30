'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  Check,
  X,
  MapPin,
  Plus
} from 'lucide-react';
import {
  ZONAS_LIMA_DISTRITOS,
  normalizeDistrito,
  DistritoOption
} from '@/lib/utils/phoneUtils';

export interface DistrictSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

// Normaliza cadenas para búsqueda insensible a acentos, mayúsculas y espacios
function cleanString(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Alias y abreviaciones comunes de distritos para búsqueda ultra-rápida
const ALIASES: Record<string, string[]> = {
  'SAN MARTIN DE PORRES': ['smp', 'san martin', 'san martin porres'],
  'SAN JUAN DE LURIGANCHO': ['sjl', 'san juan lurigancho'],
  'SAN JUAN DE MIRAFLORES': ['sjm', 'san juan miraflores'],
  'VILLA EL SALVADOR': ['ves', 'villa salvador'],
  'VILLA MARIA DEL TRIUNFO': ['vmt', 'villa maria'],
  'SANTIAGO DE SURCO': ['surco'],
  'LA MOLINA': ['molina'],
  'LURIGANCHO-CHOSICA': ['chosica', 'lurigancho'],
  'CERCADO DE LIMA': ['cercado', 'lima cercado', 'lima centro', 'lima'],
  'MAGDALENA DEL MAR': ['magdalena'],
  'BREÑA': ['brena'],
  'BELLAVISTA': ['callao bellavista'],
  'CARMEN DE LA LEGUA': ['reynoso', 'carmen de la legua reynoso']
};

export default function DistrictSearchSelect({
  value,
  onChange,
  placeholder = 'Seleccionar Distrito...',
  disabled = false,
  style,
  ariaLabel = 'Distrito (Zona)'
}: DistrictSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Posicionamiento flotante seguro para evitar recortes de overflow
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placeAbove: boolean;
    maxHeight: number;
  }>({
    top: 0,
    left: 0,
    width: 270,
    placeAbove: false,
    maxHeight: 320
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Encontrar etiqueta amigable del distrito seleccionado actual
  const currentLabel = useMemo(() => {
    if (!value) return '';
    const norm = normalizeDistrito(value);
    for (const zona of ZONAS_LIMA_DISTRITOS) {
      const match = zona.distritos.find(d => d.value === norm || d.value === value);
      if (match) return match.label;
    }
    // Si es un distrito personalizado o texto directo, devolverlo capitalizado/formateado
    return value;
  }, [value]);

  // Actualizar posición en pantalla del popover flotante
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Si el elemento salió de la pantalla (por scroll excesivo), cerrar
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const estimatedDropdownHeight = 340;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;

    const width = Math.min(Math.max(rect.width, 275), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    if (left < 8) left = 8;

    const maxHeight = placeAbove
      ? Math.max(160, Math.min(estimatedDropdownHeight, spaceAbove - 16))
      : Math.max(160, Math.min(estimatedDropdownHeight, spaceBelow - 16));

    const top = placeAbove
      ? Math.max(8, rect.top - maxHeight - 4)
      : rect.bottom + 4;

    setCoords({
      top,
      left,
      width,
      placeAbove,
      maxHeight
    });
  }, []);

  // Abrir / Cerrar dropdown
  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setSearchTerm('');
        setHighlightedIndex(0);
      }
      return next;
    });
  }, [disabled]);

  // Actualizar posición y añadir listeners de scroll/resize cuando se abre
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    // Auto-foco inmediato en el buscador
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 40);

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  // Lista plana de todos los distritos con su respectiva zona
  const allDistritos = useMemo(() => {
    return ZONAS_LIMA_DISTRITOS.flatMap(z =>
      z.distritos.map(d => ({
        ...d,
        zona: z.zona
      }))
    );
  }, []);

  // Filtrado de distritos según el término de búsqueda
  const flatFilteredDistritos = useMemo(() => {
    const q = cleanString(searchTerm);
    if (!q) return allDistritos;

    return allDistritos.filter(item => {
      const cleanLabel = cleanString(item.label);
      const cleanVal = cleanString(item.value);
      const cleanZona = cleanString(item.zona);

      if (cleanLabel.includes(q) || cleanVal.includes(q) || cleanZona.includes(q)) {
        return true;
      }

      // Comprobar alias
      const itemAliases = ALIASES[item.value] || [];
      return itemAliases.some(alias => cleanString(alias).includes(q) || q.includes(cleanString(alias)));
    });
  }, [allDistritos, searchTerm]);

  // Agrupación de los distritos filtrados por zona para mantener la estructura visual
  const groupedFiltered = useMemo(() => {
    const map = new Map<string, DistritoOption[]>();
    for (const item of flatFilteredDistritos) {
      if (!map.has(item.zona)) {
        map.set(item.zona, []);
      }
      map.get(item.zona)!.push({ value: item.value, label: item.label });
    }
    return Array.from(map.entries()).map(([zona, distritos]) => ({
      zona,
      distritos
    }));
  }, [flatFilteredDistritos]);

  // Manejar selección de distrito
  const handleSelect = useCallback((distVal: string) => {
    onChange(distVal);
    setIsOpen(false);
    triggerRef.current?.focus();
  }, [onChange]);

  // Limpiar selección
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    triggerRef.current?.focus();
  }, [onChange]);

  // Seleccionar valor personalizado si no está en la lista estándar
  const handleSelectCustom = useCallback(() => {
    const customVal = searchTerm.trim().toUpperCase();
    if (!customVal) return;
    onChange(customVal);
    setIsOpen(false);
    triggerRef.current?.focus();
  }, [searchTerm, onChange]);

  // Manejo de teclado (flechas, Enter, Escape)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    const total = flatFilteredDistritos.length;
    if (total === 0) {
      if (e.key === 'Enter' && searchTerm.trim()) {
        e.preventDefault();
        handleSelectCustom();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = (prev + 1) % total;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = (prev - 1 + total) % total;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatFilteredDistritos[highlightedIndex];
      if (selected) {
        handleSelect(selected.value);
      } else if (searchTerm.trim()) {
        handleSelectCustom();
      }
    }
  }, [isOpen, flatFilteredDistritos, highlightedIndex, handleSelect, handleSelectCustom, searchTerm, toggleDropdown]);

  // Verifica si hay coincidencia exacta con el término buscado
  const exactMatchExists = useMemo(() => {
    const q = cleanString(searchTerm);
    if (!q) return true;
    return flatFilteredDistritos.some(d => cleanString(d.label) === q || cleanString(d.value) === q);
  }, [searchTerm, flatFilteredDistritos]);

  // Reiniciar highlightedIndex cuando cambia el filtro
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const normValue = value ? normalizeDistrito(value) : '';

  // Renderizar contenido del popover en un Portal seguro
  const popoverContent = isOpen && mounted ? (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-label="Lista de distritos de Lima y Callao"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        maxHeight: coords.maxHeight,
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.18), 0 8px 12px -4px rgba(15, 23, 42, 0.08)',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: '12px',
        animation: 'rutaDropdownFadeIn 0.15s ease-out'
      }}
      onKeyDown={handleKeyDown}
    >
      <style>{`
        @keyframes rutaDropdownFadeIn {
          from {
            opacity: 0;
            transform: scale(0.98) translateY(${coords.placeAbove ? '4px' : '-4px'});
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {/* Cabecera con Buscador en Vivo */}
      <div
        style={{
          padding: '8px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <Search
            className="w-3.5 h-3.5 text-slate-400"
            style={{ position: 'absolute', left: '9px', pointerEvents: 'none' }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar distrito (ej: Lince, Miraflores)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 26px 6px 28px',
              borderRadius: '6px',
              border: '1px solid #94a3b8',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f172a',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              style={{
                position: 'absolute',
                right: '7px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Borrar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lista Desplazable de Distritos Agrupados por Zona */}
      <div
        style={{
          overflowY: 'auto',
          flex: 1,
          padding: '4px 0',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {groupedFiltered.length === 0 ? (
          <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600 }}>
              No se encontró &ldquo;{searchTerm}&rdquo;
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              Puedes usarlo como distrito libre o verificar la ortografía.
            </p>
          </div>
        ) : (
          (() => {
            let globalIdx = 0;
            return groupedFiltered.map(group => (
              <div key={group.zona}>
                {/* Cabecera de la Zona (Ej: 2. Lima Centro) */}
                <div
                  style={{
                    padding: '5px 10px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    color: '#475569',
                    background: '#f1f5f9',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2
                  }}
                >
                  {group.zona}
                </div>

                {/* Distritos de la Zona */}
                <div>
                  {group.distritos.map(d => {
                    const thisIdx = globalIdx++;
                    const isSelected = normValue === d.value || value === d.value;
                    const isHighlighted = highlightedIndex === thisIdx;

                    return (
                      <div
                        key={d.value}
                        ref={el => {
                          itemRefs.current[thisIdx] = el;
                        }}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(d.value)}
                        onMouseEnter={() => setHighlightedIndex(thisIdx)}
                        style={{
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isSelected
                            ? '#eff6ff'
                            : isHighlighted
                            ? '#f8fafc'
                            : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#1e293b',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '12px',
                          borderLeft: isSelected
                            ? '3px solid #2563eb'
                            : isHighlighted
                            ? '3px solid #94a3b8'
                            : '3px solid transparent',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{d.label}</span>
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()
        )}

        {/* Opción para usar un distrito personalizado fuera de Lima/Callao */}
        {searchTerm.trim() && !exactMatchExists && (
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px 8px', background: '#f8fafc' }}>
            <button
              type="button"
              onClick={handleSelectCustom}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px dashed #93c5fd',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Usar &ldquo;<strong>{searchTerm.trim().toUpperCase()}</strong>&rdquo; como distrito
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Pie con atajo y botón para limpiar */}
      <div
        style={{
          padding: '6px 10px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '10.5px',
          color: '#64748b'
        }}
      >
        <span>
          {flatFilteredDistritos.length}{' '}
          {flatFilteredDistritos.length === 1 ? 'distrito' : 'distritos'} disponibles
        </span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: '10.5px',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <X className="w-3 h-3" /> Quitar selección
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {/* Botón Disparador en la Tabla */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: '4px',
          border: isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
          background: isOpen ? '#eff6ff' : '#ffffff',
          fontSize: '12px',
          fontWeight: 600,
          color: currentLabel ? '#0f172a' : '#94a3b8',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          textAlign: 'left',
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
          transition: 'all 0.15s ease'
        }}
        title={currentLabel ? `Distrito: ${currentLabel}` : 'Seleccionar Distrito'}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          <MapPin
            className="w-3.5 h-3.5 shrink-0"
            style={{
              color: currentLabel ? '#2563eb' : '#94a3b8'
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentLabel || placeholder}
          </span>
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          {currentLabel && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleClear(e as any);
                }
              }}
              style={{
                color: '#94a3b8',
                borderRadius: '3px',
                padding: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Limpiar distrito"
            >
              <X className="w-3 h-3 hover:text-red-500" />
            </span>
          )}
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              color: isOpen ? '#2563eb' : '#64748b'
            }}
          />
        </span>
      </button>

      {/* Dropdown Portaleado para evitar cortes de overflow */}
      {mounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </div>
  );
}
