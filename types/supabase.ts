export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actas_entrega_borradores: {
        Row: {
          actualizado_en: string
          form_data: Json
          id: string
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          form_data?: Json
          id?: string
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          form_data?: Json
          id?: string
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      actas_entrega_historial: {
        Row: {
          codigo_acta: string
          creado_en: string
          destinatario: string
          destinatario_direccion: string | null
          destinatario_dni: string | null
          fecha: string
          id: string
          observaciones: string | null
          operador_email: string | null
          operador_id: string | null
          operador_nombre: string | null
          paquetes: Json
        }
        Insert: {
          codigo_acta: string
          creado_en?: string
          destinatario: string
          destinatario_direccion?: string | null
          destinatario_dni?: string | null
          fecha: string
          id?: string
          observaciones?: string | null
          operador_email?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          paquetes?: Json
        }
        Update: {
          codigo_acta?: string
          creado_en?: string
          destinatario?: string
          destinatario_direccion?: string | null
          destinatario_dni?: string | null
          fecha?: string
          id?: string
          observaciones?: string | null
          operador_email?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          paquetes?: Json
        }
        Relationships: []
      }
      almacenes_sedes: {
        Row: {
          actualizado_en: string | null
          ciudad: string | null
          codigo: string
          creado_en: string | null
          direccion: string | null
          es_activo: boolean | null
          id: string
          nombre: string
          pais: string | null
          tipo: string | null
        }
        Insert: {
          actualizado_en?: string | null
          ciudad?: string | null
          codigo: string
          creado_en?: string | null
          direccion?: string | null
          es_activo?: boolean | null
          id?: string
          nombre: string
          pais?: string | null
          tipo?: string | null
        }
        Update: {
          actualizado_en?: string | null
          ciudad?: string | null
          codigo?: string
          creado_en?: string | null
          direccion?: string | null
          es_activo?: boolean | null
          id?: string
          nombre?: string
          pais?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      auditoria_sistema: {
        Row: {
          accion: string
          creado_en: string | null
          detalles: string | null
          id: string
          ip_origen: string | null
          modulo: string
          registro_id: string | null
          usuario_email: string
          usuario_id: string | null
          usuario_nombre: string
          valores_anteriores: Json | null
          valores_nuevos: Json | null
        }
        Insert: {
          accion: string
          creado_en?: string | null
          detalles?: string | null
          id?: string
          ip_origen?: string | null
          modulo: string
          registro_id?: string | null
          usuario_email: string
          usuario_id?: string | null
          usuario_nombre: string
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Update: {
          accion?: string
          creado_en?: string | null
          detalles?: string | null
          id?: string
          ip_origen?: string | null
          modulo?: string
          registro_id?: string | null
          usuario_email?: string
          usuario_id?: string | null
          usuario_nombre?: string
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Relationships: []
      }
      boletas_shalom: {
        Row: {
          actualizado_en: string | null
          cantidad: number | null
          codigo: string | null
          creado_en: string | null
          creado_por: string | null
          descripcion: string | null
          destinatario_dni: string | null
          destinatario_nombre: string
          destinatario_telefono: string | null
          destino: string
          eliminado_en: string | null
          eliminado_por: string | null
          estado_envio: string | null
          fecha_emision: string
          forma_pago: string | null
          id: string
          monto_total: number | null
          motivo_eliminacion: string | null
          nro_orden: string | null
          pdf_url: string
          peso: number | null
          r2_key: string
          tipo_entrega: string | null
        }
        Insert: {
          actualizado_en?: string | null
          cantidad?: number | null
          codigo?: string | null
          creado_en?: string | null
          creado_por?: string | null
          descripcion?: string | null
          destinatario_dni?: string | null
          destinatario_nombre: string
          destinatario_telefono?: string | null
          destino: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado_envio?: string | null
          fecha_emision: string
          forma_pago?: string | null
          id?: string
          monto_total?: number | null
          motivo_eliminacion?: string | null
          nro_orden?: string | null
          pdf_url: string
          peso?: number | null
          r2_key: string
          tipo_entrega?: string | null
        }
        Update: {
          actualizado_en?: string | null
          cantidad?: number | null
          codigo?: string | null
          creado_en?: string | null
          creado_por?: string | null
          descripcion?: string | null
          destinatario_dni?: string | null
          destinatario_nombre?: string
          destinatario_telefono?: string | null
          destino?: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado_envio?: string | null
          fecha_emision?: string
          forma_pago?: string | null
          id?: string
          monto_total?: number | null
          motivo_eliminacion?: string | null
          nro_orden?: string | null
          pdf_url?: string
          peso?: number | null
          r2_key?: string
          tipo_entrega?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          actualizado_en: string | null
          apellido: string | null
          creado_en: string | null
          departamento: string | null
          direccion_entrega: string | null
          distrito: string | null
          documento_identidad: string
          email: string | null
          id: string
          nombre: string
          provincia: string | null
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string | null
          apellido?: string | null
          creado_en?: string | null
          departamento?: string | null
          direccion_entrega?: string | null
          distrito?: string | null
          documento_identidad: string
          email?: string | null
          id?: string
          nombre: string
          provincia?: string | null
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string | null
          apellido?: string | null
          creado_en?: string | null
          departamento?: string | null
          direccion_entrega?: string | null
          distrito?: string | null
          documento_identidad?: string
          email?: string | null
          id?: string
          nombre?: string
          provincia?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      cobros_vouchers: {
        Row: {
          cliente_id: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          codigo_cobro: string
          creado_en: string
          eliminado_en: string | null
          eliminado_por: string | null
          estado: string
          fecha_operacion: string | null
          id: string
          metodo_pago: string
          moneda: string
          monto: number
          motivo_eliminacion: string | null
          notas: string | null
          numero_operacion: string | null
          paquetes_wrs: Json
          registrado_por: string
          validado_en: string | null
          validado_por: string | null
          voucher_key: string | null
          voucher_url: string
        }
        Insert: {
          cliente_id?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          codigo_cobro: string
          creado_en?: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado?: string
          fecha_operacion?: string | null
          id?: string
          metodo_pago?: string
          moneda?: string
          monto?: number
          motivo_eliminacion?: string | null
          notas?: string | null
          numero_operacion?: string | null
          paquetes_wrs?: Json
          registrado_por?: string
          validado_en?: string | null
          validado_por?: string | null
          voucher_key?: string | null
          voucher_url: string
        }
        Update: {
          cliente_id?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          codigo_cobro?: string
          creado_en?: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado?: string
          fecha_operacion?: string | null
          id?: string
          metodo_pago?: string
          moneda?: string
          monto?: number
          motivo_eliminacion?: string | null
          notas?: string | null
          numero_operacion?: string | null
          paquetes_wrs?: Json
          registrado_por?: string
          validado_en?: string | null
          validado_por?: string | null
          voucher_key?: string | null
          voucher_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_vouchers_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      despacho_paradas: {
        Row: {
          creado_en: string
          destinatario: string
          direccion: string
          distrito: string
          entregado_en: string | null
          estado: string
          fotos: string[] | null
          id: string
          moneda_cobro: string
          monto_cobro: number
          motivo_no_entrega: string | null
          orden: number
          ruta_id: string
          telefono_normalizado: string
          telefono_raw: string
          wr_bultos: string
        }
        Insert: {
          creado_en?: string
          destinatario: string
          direccion: string
          distrito: string
          entregado_en?: string | null
          estado?: string
          fotos?: string[] | null
          id?: string
          moneda_cobro?: string
          monto_cobro?: number
          motivo_no_entrega?: string | null
          orden?: number
          ruta_id: string
          telefono_normalizado: string
          telefono_raw: string
          wr_bultos: string
        }
        Update: {
          creado_en?: string
          destinatario?: string
          direccion?: string
          distrito?: string
          entregado_en?: string | null
          estado?: string
          fotos?: string[] | null
          id?: string
          moneda_cobro?: string
          monto_cobro?: number
          motivo_no_entrega?: string | null
          orden?: number
          ruta_id?: string
          telefono_normalizado?: string
          telefono_raw?: string
          wr_bultos?: string
        }
        Relationships: [
          {
            foreignKeyName: "despacho_paradas_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "despachos_rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      despachos_rutas: {
        Row: {
          actualizado_en: string
          chofer_nombre: string
          chofer_telefono: string | null
          codigo_ruta: string
          creado_en: string
          creado_por: string | null
          estado: string
          fecha_despacho: string
          id: string
          nombre_ruta: string
          notas: string | null
          paradas_entregadas: number
          total_paradas: number
          vehiculo_placa: string | null
        }
        Insert: {
          actualizado_en?: string
          chofer_nombre: string
          chofer_telefono?: string | null
          codigo_ruta: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          fecha_despacho?: string
          id?: string
          nombre_ruta: string
          notas?: string | null
          paradas_entregadas?: number
          total_paradas?: number
          vehiculo_placa?: string | null
        }
        Update: {
          actualizado_en?: string
          chofer_nombre?: string
          chofer_telefono?: string | null
          codigo_ruta?: string
          creado_en?: string
          creado_por?: string | null
          estado?: string
          fecha_despacho?: string
          id?: string
          nombre_ruta?: string
          notas?: string | null
          paradas_entregadas?: number
          total_paradas?: number
          vehiculo_placa?: string | null
        }
        Relationships: []
      }
      dni_matrix_borradores: {
        Row: {
          actualizado_en: string
          id: string
          settings: Json
          slots_data: Json
          total_slots: number
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          id?: string
          settings?: Json
          slots_data?: Json
          total_slots?: number
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          id?: string
          settings?: Json
          slots_data?: Json
          total_slots?: number
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      entregas_ordenes: {
        Row: {
          cliente_documento: string | null
          cliente_id: string | null
          cliente_nombre: string
          codigo_entrega: string
          creado_en: string
          creado_por: string
          entregado_en: string | null
          estado: string
          fotos_evidencia: Json
          id: string
          notas: string | null
          operador_asignado: string
          paquetes_data: Json
          receptor_documento: string | null
          receptor_nombre: string | null
          receptor_parentesco: string | null
          tipo_entrega: string
          total_paquetes: number
        }
        Insert: {
          cliente_documento?: string | null
          cliente_id?: string | null
          cliente_nombre: string
          codigo_entrega: string
          creado_en?: string
          creado_por?: string
          entregado_en?: string | null
          estado?: string
          fotos_evidencia?: Json
          id?: string
          notas?: string | null
          operador_asignado?: string
          paquetes_data?: Json
          receptor_documento?: string | null
          receptor_nombre?: string | null
          receptor_parentesco?: string | null
          tipo_entrega?: string
          total_paquetes?: number
        }
        Update: {
          cliente_documento?: string | null
          cliente_id?: string | null
          cliente_nombre?: string
          codigo_entrega?: string
          creado_en?: string
          creado_por?: string
          entregado_en?: string | null
          estado?: string
          fotos_evidencia?: Json
          id?: string
          notas?: string | null
          operador_asignado?: string
          paquetes_data?: Json
          receptor_documento?: string | null
          receptor_nombre?: string | null
          receptor_parentesco?: string | null
          tipo_entrega?: string
          total_paquetes?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_ordenes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      escaneos_log: {
        Row: {
          codigo: string
          creado_en: string | null
          formato: string | null
          id: string
          modo_workflow: string | null
          operador: string | null
          operador_email: string | null
          paquete_id: string | null
          ubicacion: string | null
          usuario_id: string | null
        }
        Insert: {
          codigo: string
          creado_en?: string | null
          formato?: string | null
          id?: string
          modo_workflow?: string | null
          operador?: string | null
          operador_email?: string | null
          paquete_id?: string | null
          ubicacion?: string | null
          usuario_id?: string | null
        }
        Update: {
          codigo?: string
          creado_en?: string | null
          formato?: string | null
          id?: string
          modo_workflow?: string | null
          operador?: string | null
          operador_email?: string | null
          paquete_id?: string | null
          ubicacion?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escaneos_log_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      estanterias_posiciones: {
        Row: {
          actualizado_en: string | null
          almacen_id: string | null
          capacidad_max_paquetes: number | null
          codigo_estante: string
          codigo_posicion: string
          creado_en: string | null
          descripcion: string | null
          id: string
          nivel_piso: string
          peso_max_kg: number | null
          zona_tipo: string | null
        }
        Insert: {
          actualizado_en?: string | null
          almacen_id?: string | null
          capacidad_max_paquetes?: number | null
          codigo_estante: string
          codigo_posicion: string
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nivel_piso: string
          peso_max_kg?: number | null
          zona_tipo?: string | null
        }
        Update: {
          actualizado_en?: string | null
          almacen_id?: string | null
          capacidad_max_paquetes?: number | null
          codigo_estante?: string
          codigo_posicion?: string
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nivel_piso?: string
          peso_max_kg?: number | null
          zona_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estanterias_posiciones_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes_sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_trazabilidad: {
        Row: {
          descripcion_evento: string
          fecha_hora: string | null
          id: string
          paquete_id: string | null
          ubicacion: string
          usuario_operador: string | null
        }
        Insert: {
          descripcion_evento: string
          fecha_hora?: string | null
          id?: string
          paquete_id?: string | null
          ubicacion: string
          usuario_operador?: string | null
        }
        Update: {
          descripcion_evento?: string
          fecha_hora?: string | null
          id?: string
          paquete_id?: string | null
          ubicacion?: string
          usuario_operador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_trazabilidad_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      hojas_cotejo: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          creado_por: string | null
          descripcion: string | null
          escaneados_count: number | null
          estado: string | null
          id: string
          libro_id: string | null
          no_listados_count: number | null
          nombre_hoja: string | null
          tipo_proceso: string | null
          titulo: string
          total_items: number | null
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          creado_por?: string | null
          descripcion?: string | null
          escaneados_count?: number | null
          estado?: string | null
          id?: string
          libro_id?: string | null
          no_listados_count?: number | null
          nombre_hoja?: string | null
          tipo_proceso?: string | null
          titulo: string
          total_items?: number | null
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          creado_por?: string | null
          descripcion?: string | null
          escaneados_count?: number | null
          estado?: string | null
          id?: string
          libro_id?: string | null
          no_listados_count?: number | null
          nombre_hoja?: string | null
          tipo_proceso?: string | null
          titulo?: string
          total_items?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hojas_cotejo_libro_id_fkey"
            columns: ["libro_id"]
            isOneToOne: false
            referencedRelation: "hojas_cotejo"
            referencedColumns: ["id"]
          },
        ]
      }
      hojas_cotejo_items: {
        Row: {
          actualizado_en: string | null
          casillero: string | null
          codigo_wr: string
          consignatario: string | null
          creado_en: string | null
          escaneado_en: string | null
          escaneado_por: string | null
          estado: string | null
          hoja_id: string | null
          id: string
          notas: string | null
          orden: number | null
          peso_kg: number | null
          posicion_estante: string | null
          tracking_usa: string | null
          veces_escaneado: number | null
        }
        Insert: {
          actualizado_en?: string | null
          casillero?: string | null
          codigo_wr: string
          consignatario?: string | null
          creado_en?: string | null
          escaneado_en?: string | null
          escaneado_por?: string | null
          estado?: string | null
          hoja_id?: string | null
          id?: string
          notas?: string | null
          orden?: number | null
          peso_kg?: number | null
          posicion_estante?: string | null
          tracking_usa?: string | null
          veces_escaneado?: number | null
        }
        Update: {
          actualizado_en?: string | null
          casillero?: string | null
          codigo_wr?: string
          consignatario?: string | null
          creado_en?: string | null
          escaneado_en?: string | null
          escaneado_por?: string | null
          estado?: string | null
          hoja_id?: string | null
          id?: string
          notas?: string | null
          orden?: number | null
          peso_kg?: number | null
          posicion_estante?: string | null
          tracking_usa?: string | null
          veces_escaneado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hojas_cotejo_items_hoja_id_fkey"
            columns: ["hoja_id"]
            isOneToOne: false
            referencedRelation: "hojas_cotejo"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_jobs: {
        Row: {
          coincidencias: number | null
          creado_en: string
          csv_key: string | null
          db_actualizados: number | null
          db_sincronizado: boolean | null
          db_sincronizado_en: string | null
          duplicados: number | null
          entregado_key: string | null
          enviado_key: string | null
          error: string | null
          estado: string
          etapa: string
          filas_tib: number | null
          fuentes: string[]
          id: string
          iniciado_en: string | null
          inventario_key: string | null
          mensaje: string
          progreso: number
          recibido_key: string | null
          resultado_key: string | null
          segundos: number | null
          sin_coincidencia: number | null
          sincronizar_db: boolean | null
          terminado_en: string | null
          total_guias: number | null
          user_nombre: string | null
          usuario_id: string | null
        }
        Insert: {
          coincidencias?: number | null
          creado_en?: string
          csv_key?: string | null
          db_actualizados?: number | null
          db_sincronizado?: boolean | null
          db_sincronizado_en?: string | null
          duplicados?: number | null
          entregado_key?: string | null
          enviado_key?: string | null
          error?: string | null
          estado?: string
          etapa?: string
          filas_tib?: number | null
          fuentes?: string[]
          id?: string
          iniciado_en?: string | null
          inventario_key?: string | null
          mensaje?: string
          progreso?: number
          recibido_key?: string | null
          resultado_key?: string | null
          segundos?: number | null
          sin_coincidencia?: number | null
          sincronizar_db?: boolean | null
          terminado_en?: string | null
          total_guias?: number | null
          user_nombre?: string | null
          usuario_id?: string | null
        }
        Update: {
          coincidencias?: number | null
          creado_en?: string
          csv_key?: string | null
          db_actualizados?: number | null
          db_sincronizado?: boolean | null
          db_sincronizado_en?: string | null
          duplicados?: number | null
          entregado_key?: string | null
          enviado_key?: string | null
          error?: string | null
          estado?: string
          etapa?: string
          filas_tib?: number | null
          fuentes?: string[]
          id?: string
          iniciado_en?: string | null
          inventario_key?: string | null
          mensaje?: string
          progreso?: number
          recibido_key?: string | null
          resultado_key?: string | null
          segundos?: number | null
          sin_coincidencia?: number | null
          sincronizar_db?: boolean | null
          terminado_en?: string | null
          total_guias?: number | null
          user_nombre?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      inventario_tib_diario: {
        Row: {
          es_activo: boolean
          fecha: string
          id: string
          nombre_archivo: string
          peso_bytes: number
          r2_key: string
          subido_en: string
          subido_por_nombre: string | null
          tipo: string
        }
        Insert: {
          es_activo?: boolean
          fecha?: string
          id?: string
          nombre_archivo: string
          peso_bytes?: number
          r2_key: string
          subido_en?: string
          subido_por_nombre?: string | null
          tipo: string
        }
        Update: {
          es_activo?: boolean
          fecha?: string
          id?: string
          nombre_archivo?: string
          peso_bytes?: number
          r2_key?: string
          subido_en?: string
          subido_por_nombre?: string | null
          tipo?: string
        }
        Relationships: []
      }
      invoices_borradores: {
        Row: {
          actualizado_en: string
          id: string
          invoice_data: Json
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          id?: string
          invoice_data?: Json
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          id?: string
          invoice_data?: Json
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      invoices_historial: {
        Row: {
          consignee_dni: string | null
          consignee_name: string
          creado_en: string
          id: string
          invoice_data: Json
          invoice_date: string
          invoice_number: string
          items_count: number | null
          operador_email: string | null
          operador_id: string | null
          operador_nombre: string | null
          total_value_fob: number | null
          tracking: string | null
        }
        Insert: {
          consignee_dni?: string | null
          consignee_name: string
          creado_en?: string
          id?: string
          invoice_data: Json
          invoice_date: string
          invoice_number: string
          items_count?: number | null
          operador_email?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          total_value_fob?: number | null
          tracking?: string | null
        }
        Update: {
          consignee_dni?: string | null
          consignee_name?: string
          creado_en?: string
          id?: string
          invoice_data?: Json
          invoice_date?: string
          invoice_number?: string
          items_count?: number | null
          operador_email?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          total_value_fob?: number | null
          tracking?: string | null
        }
        Relationships: []
      }
      manifiestos_tib: {
        Row: {
          archivo_nombre: string | null
          archivo_url: string | null
          cliente: string | null
          creado_en: string | null
          creado_por: string | null
          es_cuadre_perfecto: boolean | null
          fecha_vuelo: string
          guias_declaradas: number | null
          guias_extraidas: number | null
          id: string
          modalidad: string | null
          paquetes_declarados: number | null
          paquetes_extraidos: number | null
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_url?: string | null
          cliente?: string | null
          creado_en?: string | null
          creado_por?: string | null
          es_cuadre_perfecto?: boolean | null
          fecha_vuelo: string
          guias_declaradas?: number | null
          guias_extraidas?: number | null
          id?: string
          modalidad?: string | null
          paquetes_declarados?: number | null
          paquetes_extraidos?: number | null
        }
        Update: {
          archivo_nombre?: string | null
          archivo_url?: string | null
          cliente?: string | null
          creado_en?: string | null
          creado_por?: string | null
          es_cuadre_perfecto?: boolean | null
          fecha_vuelo?: string
          guias_declaradas?: number | null
          guias_extraidas?: number | null
          id?: string
          modalidad?: string | null
          paquetes_declarados?: number | null
          paquetes_extraidos?: number | null
        }
        Relationships: []
      }
      manifiestos_tib_detalles: {
        Row: {
          creado_en: string | null
          fila_index: number | null
          id: string
          manifiesto_id: string | null
          numero_guia_amx: string
          numero_wr: string
          observacion: string | null
        }
        Insert: {
          creado_en?: string | null
          fila_index?: number | null
          id?: string
          manifiesto_id?: string | null
          numero_guia_amx: string
          numero_wr: string
          observacion?: string | null
        }
        Update: {
          creado_en?: string | null
          fila_index?: number | null
          id?: string
          manifiesto_id?: string | null
          numero_guia_amx?: string
          numero_wr?: string
          observacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifiestos_tib_detalles_manifiesto_id_fkey"
            columns: ["manifiesto_id"]
            isOneToOne: false
            referencedRelation: "manifiestos_tib"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_kardex: {
        Row: {
          codigo_paquete: string
          consignatario: string | null
          creado_en: string | null
          destino_descripcion: string
          id: string
          motivo: string | null
          origen_descripcion: string
          paquete_id: string | null
          tipo_movimiento: string
          usuario_email: string | null
          usuario_id: string | null
          usuario_operador: string | null
        }
        Insert: {
          codigo_paquete: string
          consignatario?: string | null
          creado_en?: string | null
          destino_descripcion: string
          id?: string
          motivo?: string | null
          origen_descripcion: string
          paquete_id?: string | null
          tipo_movimiento: string
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_operador?: string | null
        }
        Update: {
          codigo_paquete?: string
          consignatario?: string | null
          creado_en?: string | null
          destino_descripcion?: string
          id?: string
          motivo?: string | null
          origen_descripcion?: string
          paquete_id?: string | null
          tipo_movimiento?: string
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_operador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_kardex_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_ubicacion: {
        Row: {
          anaquel: string | null
          creado_en: string
          id: string
          motivo: string | null
          nueva_ubicacion: string
          numero_recibo_bodega: string
          paquete_id: string | null
          piso: string | null
          tipo_movimiento: string
          tracking: string | null
          ubicacion_anterior: string | null
          usuario_email: string | null
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          anaquel?: string | null
          creado_en?: string
          id?: string
          motivo?: string | null
          nueva_ubicacion: string
          numero_recibo_bodega: string
          paquete_id?: string | null
          piso?: string | null
          tipo_movimiento?: string
          tracking?: string | null
          ubicacion_anterior?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          anaquel?: string | null
          creado_en?: string
          id?: string
          motivo?: string | null
          nueva_ubicacion?: string
          numero_recibo_bodega?: string
          paquete_id?: string | null
          piso?: string | null
          tipo_movimiento?: string
          tracking?: string | null
          ubicacion_anterior?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_ubicacion_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      paquetes: {
        Row: {
          actualizado_en: string | null
          anaquel: string | null
          cliente_id: string | null
          creado_en: string | null
          creado_por: string | null
          descripcion: string | null
          dni_consignatario: string | null
          eliminado_en: string | null
          eliminado_por: string | null
          estado_amex: string
          estado_tib: string | null
          id: string
          motivo_eliminacion: string | null
          nombre_consignatario: string | null
          numero_recibo_bodega: string
          peso_kg: number | null
          piso: string | null
          posicion_estante: string | null
          tib_imagen_url: string | null
          tib_ticket_pdf_url: string | null
          tipo_empaque: string | null
          tracking: string
          ubicacion_actual: string | null
          usuario_email: string | null
        }
        Insert: {
          actualizado_en?: string | null
          anaquel?: string | null
          cliente_id?: string | null
          creado_en?: string | null
          creado_por?: string | null
          descripcion?: string | null
          dni_consignatario?: string | null
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado_amex?: string
          estado_tib?: string | null
          id?: string
          motivo_eliminacion?: string | null
          nombre_consignatario?: string | null
          numero_recibo_bodega: string
          peso_kg?: number | null
          piso?: string | null
          posicion_estante?: string | null
          tib_imagen_url?: string | null
          tib_ticket_pdf_url?: string | null
          tipo_empaque?: string | null
          tracking: string
          ubicacion_actual?: string | null
          usuario_email?: string | null
        }
        Update: {
          actualizado_en?: string | null
          anaquel?: string | null
          cliente_id?: string | null
          creado_en?: string | null
          creado_por?: string | null
          descripcion?: string | null
          dni_consignatario?: string | null
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado_amex?: string
          estado_tib?: string | null
          id?: string
          motivo_eliminacion?: string | null
          nombre_consignatario?: string | null
          numero_recibo_bodega?: string
          peso_kg?: number | null
          piso?: string | null
          posicion_estante?: string | null
          tib_imagen_url?: string | null
          tib_ticket_pdf_url?: string | null
          tipo_empaque?: string | null
          tracking?: string
          ubicacion_actual?: string | null
          usuario_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paquetes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_usuarios: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          creado_en: string | null
          email: string
          id: string
          nombre_completo: string
          rol_id: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_en?: string | null
          creado_en?: string | null
          email: string
          id: string
          nombre_completo: string
          rol_id?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_en?: string | null
          creado_en?: string | null
          email?: string
          id?: string
          nombre_completo?: string
          rol_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_usuarios_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_sistema: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          id: string
          nombre: string
          permisos: Json
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          permisos?: Json
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          permisos?: Json
        }
        Relationships: []
      }
      rotulos_borradores: {
        Row: {
          actualizado_en: string
          id: string
          slots_data: Json
          total_hojas: number
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          id?: string
          slots_data?: Json
          total_hojas?: number
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          id?: string
          slots_data?: Json
          total_hojas?: number
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      rotulos_historial: {
        Row: {
          agencia: string
          agencia_otra: string | null
          cantidad_rotulos: number | null
          creado_en: string
          destinatario_dni: string | null
          destinatario_nombre: string
          destinatario_telefono: string | null
          destino: string | null
          hoja_numero: number | null
          id: string
          lote_impresion_id: string
          numero_rotulo: number | null
          observacion: string | null
          operador_email: string | null
          operador_id: string | null
          operador_nombre: string | null
          remitente: string | null
          siglas: string | null
          slot_posicion: number | null
          slot_snapshot: Json | null
          tipo_accion: string
          total_cajas: string | null
        }
        Insert: {
          agencia?: string
          agencia_otra?: string | null
          cantidad_rotulos?: number | null
          creado_en?: string
          destinatario_dni?: string | null
          destinatario_nombre: string
          destinatario_telefono?: string | null
          destino?: string | null
          hoja_numero?: number | null
          id?: string
          lote_impresion_id: string
          numero_rotulo?: number | null
          observacion?: string | null
          operador_email?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          remitente?: string | null
          siglas?: string | null
          slot_posicion?: number | null
          slot_snapshot?: Json | null
          tipo_accion?: string
          total_cajas?: string | null
        }
        Update: {
          agencia?: string
          agencia_otra?: string | null
          cantidad_rotulos?: number | null
          creado_en?: string
          destinatario_dni?: string | null
          destinatario_nombre?: string
          destinatario_telefono?: string | null
          destino?: string | null
          hoja_numero?: number | null
          id?: string
          lote_impresion_id?: string
          numero_rotulo?: number | null
          observacion?: string | null
          operador_email?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          remitente?: string | null
          siglas?: string | null
          slot_posicion?: number | null
          slot_snapshot?: Json | null
          tipo_accion?: string
          total_cajas?: string | null
        }
        Relationships: []
      }
      scanner_staging_queue: {
        Row: {
          actualizado_en: string
          id: string
          queue_items: Json
          total_items: number
          usuario_email: string
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string
          id?: string
          queue_items?: Json
          total_items?: number
          usuario_email: string
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string
          id?: string
          queue_items?: Json
          total_items?: number
          usuario_email?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _cleanup_dead_cols_internal: { Args: never; Returns: undefined }
      asignar_ubicacion_paquete: {
        Args: {
          p_anaquel?: string
          p_codigo: string
          p_nueva_ubicacion: string
          p_operador_email?: string
          p_operador_id?: string
          p_operador_nombre?: string
          p_piso?: string
          p_tipo_movimiento?: string
        }
        Returns: Json
      }
      buscar_paquetes_servidor: {
        Args: {
          p_estado_amex?: string
          p_fecha_desde?: string
          p_fecha_hasta?: string
          p_floor_filter?: string
          p_package_type?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_shelf_filter?: string
          p_ubicacion?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_scanner_batch_v2: {
        Args: {
          p_items: Json
          p_operador_email?: string
          p_operador_id?: string
          p_operador_nombre?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
