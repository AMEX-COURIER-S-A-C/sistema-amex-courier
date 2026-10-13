import type { NewClientFormData } from '@/components/modals/NewClientModal';
import type { NewPkgFormData } from '@/components/modals/NewPackageModal';

export const EMPTY_CLIENT_FORM: NewClientFormData = {
  nombre: '',
  apellido: '',
  documentoIdentidad: '',
  telefono: '',
  email: '',
  departamento: 'LIMA',
  provincia: 'LIMA',
  distrito: 'LINCE',
  direccionEntrega: ''
};

export const EMPTY_PKG_FORM: NewPkgFormData = {
  numeroReciboBodega: 'WR000000',
  tracking: '',
  tipoEmpaque: '',
  nombreConsignatario: '',
  descripcion: '',
  pesoKg: '',
  ubicacionActual: 'AmexLince',
  anaquel: 'A1',
  piso: 'P1',
  posicionEstante: 'A1-P1'
};
