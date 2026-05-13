const BASE_URL = import.meta.env.VITE_EXT_SUPABASE_URL;
const API_KEY  = import.meta.env.VITE_EXT_SUPABASE_ANON_KEY;

// Tamaño de página ajustado al límite del servidor externo
const PAGE_SIZE = 500;

const HEADERS = {
  apikey:         API_KEY,
  Authorization:  `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Extrae el total real del header Content-Range (solo para mostrar progreso).
 * Devuelve null si no se puede leer.
 */
function parseTotalFromContentRange(res) {
  const cr = res.headers.get('Content-Range');
  if (!cr) return null;
  const m = cr.match(/\d+-\d+\/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

/**
 * Paginación robusta que funciona independientemente del max_rows del servidor.
 *
 * Regla de parada: el servidor devuelve 0 filas o responde 416.
 * NO usa el total del Content-Range para decidir si hay más datos,
 * porque algunos servidores reportan mal ese valor.
 * Avanza `from += page.length` para adaptarse al límite real del servidor.
 */
async function fetchAllPages(url, onProgress) {
  let from    = 0;
  let total   = null; // solo para mostrar progreso, no para parar
  const results = [];

  while (true) {
    const to  = from + PAGE_SIZE - 1;

    const res = await fetch(url, {
      headers: {
        ...HEADERS,
        Range:        `${from}-${to}`,
        'Range-Unit': 'items',
        Prefer:       'count=exact',
      },
    });

    // 416 = rango fuera de límite → no hay más datos
    if (res.status === 416) break;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error ${res.status}: ${text}`);
    }

    const page = await res.json();

    // Página vacía → fin
    if (!page.length) break;

    results.push(...page);

    // Leer total para mostrar progreso (no para parar)
    if (total === null) total = parseTotalFromContentRange(res);
    if (onProgress) onProgress(results.length, total);

    // Avanzar por el número de filas REALMENTE recibidas,
    // no por PAGE_SIZE (el servidor puede tener max_rows menor)
    from += page.length;
  }

  return results;
}

/**
 * Obtiene los valores únicos de "No. Almacén" del view externo.
 * Pagina por todas las filas aunque el servidor tenga max_rows < PAGE_SIZE.
 */
export async function fetchExternalWarehouses(viewName) {
  const col  = encodeURIComponent('"No. Almacén"');
  const url  = `${BASE_URL}/rest/v1/${viewName}?select=${col}`;
  const rows = await fetchAllPages(url, null);

  const seen = new Set(
    rows.map((r) => r['No. Almacén']).filter((v) => v != null).map(String)
  );

  return [...seen].sort((a, b) => {
    const nA = parseInt(a), nB = parseInt(b);
    return !isNaN(nA) && !isNaN(nB) ? nA - nB : String(a).localeCompare(String(b));
  });
}

/**
 * Obtiene TODAS las filas de una vista del API externo.
 * Soporta filtro opcional por "No. Almacén".
 *
 * @param {string}    viewName
 * @param {Function}  [onProgress]  (fetched, total|null) => void
 * @param {string[]}  [warehouses]  si se da, filtra por esos almacenes
 */
export async function fetchExternalTable(viewName, onProgress, warehouses = null) {
  let filterParam = '';
  if (warehouses?.length) {
    const col  = encodeURIComponent('"No. Almacén"');
    const vals = warehouses.join(',');
    filterParam = `&${col}=in.(${vals})`;
  }

  const url = `${BASE_URL}/rest/v1/${viewName}?select=*${filterParam}`;
  return fetchAllPages(url, onProgress);
}
