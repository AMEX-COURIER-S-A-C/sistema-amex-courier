'use client';

import React from 'react';

interface HeaderBarProps {
  currentUser?: { nombre: string; rol: string } | null;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onLogout?: () => void;
}

export default function HeaderBar({
  isSidebarCollapsed,
  onToggleSidebar,
}: HeaderBarProps) {
  return (
    <header
      className="sap-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        overflow: 'hidden'
      }}
    >
      <div className="sap-brand" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
        <button
          className="header-sidebar-toggle"
          onClick={onToggleSidebar}
          style={{
            background: isSidebarCollapsed ? 'rgba(255,255,255,0.08)' : 'rgba(37, 99, 235, 0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '15px',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          aria-label={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <i className={`fa-solid ${isSidebarCollapsed ? 'fa-bars' : 'fa-xmark'}`}></i>
        </button>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 900,
            fontSize: '14px',
            letterSpacing: '0.4px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <img
            src="/images/logo-amex-clean.png"
            alt="AMEX Courier"
            style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '10px' }}>
            Sistema Amex Courier
          </span>
        </span>
      </div>
    </header>
  );
}
