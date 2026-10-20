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
    <header className="sap-header header-bar-container">
      <div className="sap-brand header-bar-brand">
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
        <div className="header-brand-content" title="Sistema Amex Courier">
          <img
            src="/images/logo-amex-clean.png"
            alt="AMEX Courier"
            className="header-brand-logo"
          />
          <span className="header-brand-divider" aria-hidden="true" />
          <span className="header-brand-text">
            Sistema Amex Courier
          </span>
        </div>
      </div>
    </header>
  );
}
