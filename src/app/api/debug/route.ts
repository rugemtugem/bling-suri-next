import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  const info: Record<string, unknown> = {};

  try {
    info.cwd = process.cwd();
    info.nodeVersion = process.version;
    info.DATABASE_URL = process.env.DATABASE_URL || '(not set)';
    info.NODE_ENV = process.env.NODE_ENV;

    // Check if db file exists
    try {
      const { statSync, existsSync } = require('fs');
      info.appDbExists = existsSync('./app.db');
      info.dataDir = existsSync('./data');
      info.prismaDir = existsSync('./prisma');

      // List files in cwd
      const { readdirSync } = require('fs');
      info.cwdFiles = readdirSync('.').filter((f: string) => !f.startsWith('node_modules'));

      // Check write permission
      try {
        const { writeFileSync, unlinkSync } = require('fs');
        writeFileSync('./_write_test', 'test');
        unlinkSync('./_write_test');
        info.writable = true;
      } catch (e: unknown) {
        info.writable = false;
        info.writeError = e instanceof Error ? e.message : String(e);
      }
    } catch (e: unknown) {
      info.fsError = e instanceof Error ? e.message : String(e);
    }

    // Try prisma db push
    try {
      const out = execSync('npx prisma db push --skip-generate 2>&1', {
        timeout: 15000,
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./app.db' }
      });
      info.dbPush = out.trim();
    } catch (e: unknown) {
      info.dbPushError = e instanceof Error ? e.message : String(e);
    }

    // Try to connect with prisma
    try {
      const { prisma } = require('@/lib/prisma');
      const count = await prisma.user.count();
      info.prismaConnected = true;
      info.userCount = count;
    } catch (e: unknown) {
      info.prismaError = e instanceof Error ? e.message : String(e);
    }

  } catch (e: unknown) {
    info.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(info);
}
