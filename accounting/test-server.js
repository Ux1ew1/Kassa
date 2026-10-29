import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function testServer(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kassa-server-'));
  const menu = { menus: [{ id: 'main', name: 'Тестовое меню', items: [
    { id: 1, name: 'Американо', price: 100, show: true, category: 'напитки' },
    { id: 2, name: 'Чай', price: 50, show: true, category: 'напитки' },
  ], activeOrder: [1, 2] }], activeMenuId: 'main' };
  await fs.writeFile(path.join(directory, 'menu.json'), JSON.stringify(menu));
  const reservation = net.createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', data => { log += data.toString(); }); child.stderr.on('data', data => { log += data.toString(); });
  t.after(async () => {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  while (true) {
    try { const response = await fetch(`${base}/api/accounting`); if (response.ok) break; } catch { /* Waiting for server startup. */ }
    if (Date.now() > deadline || child.exitCode !== null) throw new Error(`Server did not start: ${log.slice(-2000)}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const api = async (route = '', method = 'GET', payload) => {
    const response = await fetch(`${base}/api/accounting${route}`, { method, headers: { 'Content-Type': 'application/json' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    return { status: response.status, body: await response.json() };
  };
  return { base, api, directory, menu };
}
