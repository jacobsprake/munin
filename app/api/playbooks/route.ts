/**
 * GET /api/playbooks - List playbooks
 * POST /api/playbooks - Create/update playbook
 */
import { NextResponse } from 'next/server';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import * as yaml from 'js-yaml';

const playbooksDir = join(process.cwd(), 'playbooks');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playbookId = searchParams.get('id');

    if (playbookId) {
      // Get specific playbook
      const filePath = join(playbooksDir, `${playbookId}.yaml`);
      try {
        const content = await readFile(filePath, 'utf-8');
        const playbook = yaml.load(content) as any;
        return NextResponse.json({ success: true, playbook });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json(
            { error: 'Playbook not found' },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    // List all playbooks
    const files = await readdir(playbooksDir);
    const yamlFiles = files.filter(f => f.endsWith('.yaml'));
    const playbooks = [];

    for (const file of yamlFiles) {
      try {
        const content = await readFile(join(playbooksDir, file), 'utf-8');
        const playbook = yaml.load(content) as any;
        playbooks.push({
          id: playbook.id || file.replace('.yaml', ''),
          title: playbook.title || playbook.id,
          type: playbook.type,
          version: playbook.version || '1.0',
          description: playbook.description?.substring(0, 100) || ''
        });
      } catch (error) {
        console.warn(`Failed to parse ${file}:`, error);
      }
    }

    return NextResponse.json({ success: true, playbooks });
  } catch (error: any) {
    console.error('Error fetching playbooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch playbooks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: id, content' },
        { status: 400 }
      );
    }

    // Validate YAML
    try {
      yaml.load(content);
    } catch (yamlError: any) {
      return NextResponse.json(
        { error: `Invalid YAML: ${yamlError.message}` },
        { status: 400 }
      );
    }

    // Save playbook
    const filePath = join(playbooksDir, `${id}.yaml`);
    await writeFile(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Playbook saved successfully',
      playbook_id: id
    });
  } catch (error: any) {
    console.error('Error saving playbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save playbook' },
      { status: 500 }
    );
  }
}
