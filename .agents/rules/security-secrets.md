## Protocolo Estricto de Cero Secretos en Código (Zero-Secret Policy)

Este repositorio procesa datos de clientes y credenciales de servicios en la nube (Supabase Oregon, Resend, TIB Courier, Cloudflare R2).

Reglas Obligatorias para toda IA y Desarrollador:
1. **PROHIBIDO HARDCODEAR SECRETOS:**
   - NUNCA escribir tokens JWT (`eyJ...`), claves de servicio (`service_role`), claves de Resend (`re_...`), contraseñas de base de datos ni credenciales privadas en archivos de código fuente (`.ts`, `.tsx`, `.js`, `.mjs`, `.json`, etc.).
   - NUNCA incluir fallbacks con claves reales:
     - ❌ `const key = process.env.KEY || 'eyJhbGci...'` (INACEPTABLE)
     - ✅ `const key = process.env.KEY || ''` (CORRECTO)
2. **FALLAR CON CLARIDAD:**
   - Si una variable de entorno crítica requerida para una operación privilegiada no está presente, lanzar un error explícito:
     `if (!key) throw new Error('VARIABLE_NAME no está configurada.');`
3. **VERIFICACIÓN AUTOMÁTICA OBLIGATORIA:**
   - Antes de realizar cualquier `git commit` o `git push`, ejecutar `node scripts/security-check.mjs`.
   - Si el script reporta alguna violación, DEBE ser corregida antes de continuar.
