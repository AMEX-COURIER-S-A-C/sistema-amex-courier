async function testAjaxParams() {
  const paramsToTest = [
    { start: '2026-10-05', end: '2026-10-11' },
    { fechaInicio: '2026-10-05', fechaFin: '2026-10-11' },
    { fecIni: '2026-10-05', fecFin: '2026-10-11' },
    { f_ini: '2026-10-05', f_fin: '2026-10-11' },
    { desde: '2026-10-05', hasta: '2026-10-11' },
    { fecha_ini: '2026-10-05', fecha_fin: '2026-10-11' },
    { startDate: '2026-10-05', endDate: '2026-10-11' },
    { date_from: '2026-10-05', date_to: '2026-10-11' },
    { date: '2026-10-05' },
    { fdesde: '2026-10-05', fhasta: '2026-10-11' },
    { page: 2 },
    { offset: 2000 },
    { limit: 5000 },
    { idclient: '30453' },
    { client: '30453' }
  ];

  for (const p of paramsToTest) {
    try {
      const res = await fetch('https://www.tibcourier.com/global-courier/ajax/readListaWarehouse.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify(p)
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const first = data[0];
        const last = data[data.length - 1];
        console.log(`Param ${JSON.stringify(p)} -> Count: ${data.length}, First: [${first?.wr} - ${first?.fecRegister}], Last: [${last?.wr} - ${last?.fecRegister}]`);
      } else {
        console.log(`Param ${JSON.stringify(p)} -> Not array:`, data);
      }
    } catch (e) {
      console.log(`Param ${JSON.stringify(p)} -> Error:`, e.message);
    }
  }
}

testAjaxParams();
