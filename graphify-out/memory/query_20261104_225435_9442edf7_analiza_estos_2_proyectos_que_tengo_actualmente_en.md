---
type: "query"
date: "2026-11-04T22:54:35.455883+00:00"
question: "ANALIZA ESTOS 2 PROYECTOS QUE TENGO ACTUALMENTE EN GENERAL, HACIENDO UN ANALISIS PROFESIONAL A LA ESTRUCTURA EN GENERAL COMO FUNCIONA CUAL ES SU MODELO DE NEGOCIO QUE VENTAJAS TIENE ETC ANALIZANDO LOS GRAPHIFY ETC"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Paquete", "getSupabaseAdmin()", "syncTibPackagesToPortal()", "syncPackagesToClientPortal()", "tib-mirror-daemon.mjs"]
---

# Q: ANALIZA ESTOS 2 PROYECTOS QUE TENGO ACTUALMENTE EN GENERAL, HACIENDO UN ANALISIS PROFESIONAL A LA ESTRUCTURA EN GENERAL COMO FUNCIONA CUAL ES SU MODELO DE NEGOCIO QUE VENTAJAS TIENE ETC ANALIZANDO LOS GRAPHIFY ETC

## Answer

Expanded from original query via graph vocabulary: [paquete, packages, scanner, tib, portal, sync, supabase, despacho, tracking, cobros, openai, almacen]. The existing courier graph is structural, has 2317 nodes, 5229 edges, and 174 communities, and was built at f0a69527 while HEAD is 3cfa29b, so it is stale. The graph confirms Paquete and getSupabaseAdmin as cross-cutting hubs and surfaces TIB-to-portal sync helpers. A current call-site search finds those ERP portal-sync helpers have no callers outside their definitions; treat them as dormant/intended integration, not the live data path. Code inspection shows a broad internal logistics ERP with warehouse, scan, dispatch, collections, document automation, and async workers.

## Outcome

- Signal: useful

## Source Nodes

- Paquete
- getSupabaseAdmin()
- syncTibPackagesToPortal()
- syncPackagesToClientPortal()
- tib-mirror-daemon.mjs