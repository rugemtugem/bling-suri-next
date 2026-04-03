import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync, readdirSync } from 'fs';

export async function GET() {
  const info: Record<string, unknown> = {};

  try {
    info.cwd = process.cwd();
    info.nodeVersion = process.version;
    info.DATABASE_URL = process.env.DATABASE_URL || '(not set)';
    info.NODE_ENV = process.env.NODE_ENV;
    info.uid = process.getuid?.();
    info.gid = process.getgid?.();

    // Who am I
    try {
      info.whoami = execSync('whoami 2>&1', { encoding: 'utf8' }).trim();
    } catch { info.whoami = 'unknown'; }

    // Check data dir permissions
    try {
      info.dataDirExists = existsSync('./data');
      info.dataDirLs = execSync('ls -la ./data/ 2>&1', { encoding: 'utf8' }).trim();
    } catch (e: unknown) {
      info.dataDirError = e instanceof Error ? e.message : String(e);
    }

    // Check if data/ is writable
    try {
      writeFileSync('./data/_write_test', 'test');
      unlinkSync('./data/_write_test');
      info.dataWritable = true;
    } catch (e: unknown) {
      info.dataWritable = false;
      info.dataWriteError = e instanceof Error ? e.message : String(e);
    }

    // Check /app permissions
    try {
      info.appDirLs = execSync('ls -la /app/ 2>&1 | head -15', { encoding: 'utf8' }).trim();
    } catch { /* ignore */ }

    // Try prisma db push with full error output
    try {
      const out = execSync('DATABASE_URL=file:./data/app.db npx prisma db push --skip-generate 2>&1', {
        timeout: 15000,
        encoding: 'utf8',
      });
      info.dbPush = out.trim();
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'stdout' in e) {
        info.dbPushStdout = String((e as { stdout: unknown }).stdout);
      }
      if (e && typeof e === 'object' && 'stderr' in e) {
        info.dbPushStderr = String((e as { stderr: unknown }).stderr);
      }
      info.dbPushError = e instanceof Error ? e.message : String(e);
    }

  } catch (e: unknown) {
    info.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(info, { status: 200 });
}
