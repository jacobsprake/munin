import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'engine', 'out', 'evidence.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading evidence.json:', error);
    return NextResponse.json({ windows: [] }, { status: 200 });
  }
}

