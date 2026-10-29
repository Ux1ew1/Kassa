import { csv, xlsx, filename } from './export.js';
import { AccountingError } from './store.js';

export function accountingApi(accounting, sendJson) {
  return async (req, res, url) => {
    const route = url.pathname.slice('/api/accounting'.length);
    const body = async () => {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2_000_000) throw new AccountingError('Слишком большой запрос', 413);
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      try { return JSON.parse(raw || '{}'); } catch { throw new AccountingError('Некорректный JSON'); }
    };
    try {
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'GET' && route === '') return sendJson(res, 200, await accounting.state());
      if (req.method === 'PUT' && route === '/settings') return sendJson(res, 200, await accounting.settings(await body()));
      if (req.method === 'PUT' && route.startsWith('/menus/')) return sendJson(res, 200, await accounting.configure(decodeURIComponent(route.slice(7)), await body()));
      if (req.method === 'POST' && route === '/movements') return sendJson(res, 200, await accounting.move(await body()));
      if (req.method === 'POST' && route === '/sales') return sendJson(res, 200, await accounting.sell(await body()));
      if (req.method === 'POST' && route === '/close') return sendJson(res, 200, await accounting.close((await body()).shiftId));
      if (req.method === 'POST' && route === '/clear') {
        if ((await body()).confirm !== 'clear-all-reports') throw new AccountingError('Подтвердите удаление отчётов');
        return sendJson(res, 200, await accounting.clear());
      }
      if (req.method === 'GET' && route.startsWith('/reports/')) {
        const report = await accounting.report(decodeURIComponent(route.slice(9)));
        const format = url.searchParams.get('format');
        if (!format) return sendJson(res, 200, report);
        if (!['csv', 'xlsx'].includes(format)) throw new AccountingError('Неизвестный формат отчёта');
        const buffer = format === 'csv' ? Buffer.from(csv(report), 'utf8') : await xlsx(report);
        res.writeHead(200, {
          'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename(report, format)}"; filename*=UTF-8''${encodeURIComponent(filename(report, format))}`,
        });
        return res.end(buffer);
      }
      return sendJson(res, 404, { message: 'Неизвестный маршрут учёта' });
    } catch (error) {
      if (!(error instanceof AccountingError)) console.error('Accounting error:', error);
      return sendJson(res, error.status || 503, { message: error.status ? error.message : 'Не удалось сохранить учёт. Проверьте сервер и повторите запрос.', ...error.details });
    }
  };
}
