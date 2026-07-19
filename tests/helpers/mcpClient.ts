import { spawn, ChildProcess } from 'child_process';

export class McpTestClient {
  private child: ChildProcess;
  private buffer = '';
  private pending = new Map<number, (msg: any) => void>();
  private nextId = 1;

  constructor(serverPath: string, env: Record<string, string> = {}) {
    this.child = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    this.child.stdout!.on('data', (d) => {
      this.buffer += d.toString();
      let idx;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            this.pending.get(msg.id)!(msg);
            this.pending.delete(msg.id);
          }
        } catch { /* non-JSON line on stdout — ignore */ }
      }
    });
  }

  request(method: string, params: any = {}): Promise<any> {
    const id = this.nextId++;
    const promise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 90_000);
      this.pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
    });
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return promise;
  }

  notify(method: string, params: any = {}): void {
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  async init(): Promise<any> {
    const res = await this.request('initialize', {
      protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'vitest', version: '1.0' },
    });
    this.notify('notifications/initialized');
    return res;
  }

  callTool(name: string, args: any): Promise<any> {
    return this.request('tools/call', { name, arguments: args });
  }

  kill(): void { this.child.kill(); }
}
