---
type: "query"
date: "2026-11-05T18:57:07.073206+00:00"
question: "puedes restaurarlos?, y modificar el codigo para que proxima vez o el sistema no tenga relaciones con el inventario de wrs ? ya que el modulo de despachos y rutas es aparte y no debe tener relacion con el inventario modulo 3 aunque tenga wrs del modulo 3 el modulo 16"
contributor: "graphify"
outcome: "useful"
source_nodes: ["RutaBuilderModal.tsx", "DespachoService", "DespachoRutasTab.tsx"]
---

# Q: puedes restaurarlos?, y modificar el codigo para que proxima vez o el sistema no tenga relaciones con el inventario de wrs ? ya que el modulo de despachos y rutas es aparte y no debe tener relacion con el inventario modulo 3 aunque tenga wrs del modulo 3 el modulo 16

## Answer

Expanded from original query via graph vocabulary: despacho rutas paradas inventario paquetes WR. Restored modules 16 and 17 from their backup snapshot. Decoupled RutaBuilderModal from public.paquetes: route stops retain WR values as independent text and no longer autocomplete from inventory. The dispatch service reads and writes only despachos_rutas and despacho_paradas; schema has no FK from those or manifests to paquetes. The one-off cleanup matched WR values across modules and caused collateral deletes; add comments to cleanup guidance and document wr_bultos semantics in a Supabase migration. Missing photo objects are not restored with database references.

## Outcome

- Signal: useful

## Source Nodes

- RutaBuilderModal.tsx
- DespachoService
- DespachoRutasTab.tsx