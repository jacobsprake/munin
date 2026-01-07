import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const packetsDir = join(process.cwd(), 'engine', 'out', 'packets');
    const files = await readdir(packetsDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    const packets = [];
    for (const file of jsonFiles) {
      const filePath = join(packetsDir, file);
      const contents = await readFile(filePath, 'utf-8');
      packets.push(JSON.parse(contents));
    }
    packets.sort((a, b) => new Date(b.createdTs).getTime() - new Date(a.createdTs).getTime());
    return NextResponse.json(packets);
  } catch (error: any) {
    // If directory doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return NextResponse.json([], { status: 200 });
    }
    console.error('Error reading packets:', error);
    return NextResponse.json([], { status: 200 });
  }
}

