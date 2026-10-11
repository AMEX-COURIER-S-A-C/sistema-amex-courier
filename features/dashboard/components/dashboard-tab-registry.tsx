import dynamic from 'next/dynamic';
import {
  BoletasShalomSkeleton,
  CobrosSkeleton,
  DashboardSkeleton,
  DniMatrixSkeleton,
  FormatoEntregaSkeleton,
  InvoicesSkeleton,
  InventorySkeleton,
  LiveSheetsSkeleton,
  RotulosA4Skeleton,
  ScannerSkeleton
} from '@/components/ui/Skeleton';

// Keep every import explicit so Next can split heavy feature bundles predictably.
export const DashboardTab = dynamic(() => import('./DashboardTab'), {
  ssr: false,
  loading: () => <DashboardSkeleton />
});

export const OperatorHubTab = dynamic(() => import('./OperatorHubTab'), {
  ssr: false,
  loading: () => <DashboardSkeleton />
});

export const InventoryTab = dynamic(() => import('@/features/inventory/components/InventoryTab'), {
  ssr: false,
  loading: () => <InventorySkeleton />
});

export const CobrosTab = dynamic(() => import('@/features/cobros/components/CobrosTab'), {
  ssr: false,
  loading: () => <CobrosSkeleton />
});

export const DirectorioClientesTab = dynamic(
  () => import('@/features/cobros/components/DirectorioClientesTab'),
  { ssr: false, loading: () => <CobrosSkeleton /> }
);

export const ScannerTab = dynamic(() => import('@/features/scanner/components/ScannerTab'), {
  ssr: false,
  loading: () => <ScannerSkeleton />
});

export const LiveSheetsTab = dynamic(() => import('@/features/live-sheets/components/LiveSheetsTab'), {
  ssr: false,
  loading: () => <LiveSheetsSkeleton />
});

export const DniMatrixTab = dynamic(() => import('@/features/dni-matrix/components/DniMatrixTab'), {
  ssr: false,
  loading: () => <DniMatrixSkeleton />
});

export const RotulosA4Tab = dynamic(() => import('@/features/rotulos/components/RotulosA4Tab'), {
  ssr: false,
  loading: () => <RotulosA4Skeleton />
});

export const BoletasShalomTab = dynamic(
  () => import('@/features/boletas-shalom/components/BoletasShalomTab'),
  { ssr: false, loading: () => <BoletasShalomSkeleton /> }
);

export const FormatoEntregaTab = dynamic(
  () => import('@/features/formato-entrega/components/FormatoEntregaTab'),
  { ssr: false, loading: () => <FormatoEntregaSkeleton /> }
);

export const InvoicesTab = dynamic(() => import('@/features/invoices/components/InvoicesTab'), {
  ssr: false,
  loading: () => <InvoicesSkeleton />
});

export const InfoAmexTab = dynamic(() => import('@/features/info-amex/components/InfoAmexTab'), {
  ssr: false,
  loading: () => <DashboardSkeleton />
});

export const InventarioJobsTab = dynamic(
  () => import('@/features/inventory-jobs/components/InventarioJobsTab'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

export const AuditoriaTab = dynamic(() => import('@/features/auditoria/components/AuditoriaTab'), {
  ssr: false,
  loading: () => <DashboardSkeleton />
});

export const AdminUsersTab = dynamic(() => import('@/features/admin-users/components/AdminUsersTab'), {
  ssr: false,
  loading: () => <DashboardSkeleton />
});

export const DespachoRutasTab = dynamic(
  () => import('@/features/despacho-rutas/components/DespachoRutasTab'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

export const ManifiestosTibTab = dynamic(
  () => import('@/features/manifiestos-tib/components/ManifiestosTibTab'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

export const ConfiguracionTab = dynamic(
  () => import('@/features/configuracion/components/ConfiguracionTab'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
