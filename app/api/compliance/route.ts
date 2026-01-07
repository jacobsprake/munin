/**
 * POST /api/compliance
 * Generate legal certificate for a handshake packet
 * GET /api/compliance?playbookId=xxx
 * Get compliance mapping for a playbook
 */
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { 
  generateLegalCertificate, 
  getPlaybookComplianceStatus,
  searchStatutes,
  NATIONAL_STATUTES 
} from '@/lib/compliance';
import yaml from 'js-yaml';

export async function POST(request: Request) {
  try {
    const { packetId, operatorId, operatorRole } = await request.json();
    
    if (!packetId || !operatorId || !operatorRole) {
      return NextResponse.json(
        { error: 'Missing required fields: packetId, operatorId, operatorRole' },
        { status: 400 }
      );
    }

    // Load packet
    const packetPath = join(process.cwd(), 'engine', 'out', 'packets', `${packetId}.json`);
    let packet: any;
    try {
      const packetContents = await readFile(packetPath, 'utf-8');
      packet = JSON.parse(packetContents);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Packet not found' }, { status: 404 });
      }
      throw error;
    }

    // Load playbook
    const playbookId = packet.playbookId;
    const playbooksDir = join(process.cwd(), 'playbooks');
    const playbookPath = join(playbooksDir, playbookId);
    
    let playbook: any = {};
    let playbookTitle = playbookId;
    let actions: Array<{ step: number; actionName: string }> = [];
    
    try {
      const playbookContents = await readFile(playbookPath, 'utf-8');
      playbook = yaml.load(playbookContents) as any;
      playbookTitle = playbook.title || playbookId;
      
      // Extract actions from playbook
      if (playbook.actions && Array.isArray(playbook.actions)) {
        actions = playbook.actions.map((action: any) => ({
          step: action.step || 0,
          actionName: action.action || action.actionName || 'unknown'
        }));
      }
    } catch (error: any) {
      console.warn(`Failed to load playbook ${playbookId}:`, error);
      // Continue with empty actions - will result in "REQUIRES_REVIEW"
    }

    // Check for technical verification and TEE attestation
    const hasTechnicalVerification = !!packet.technicalVerification;
    const hasTEEAttestation = !!packet.tee;

    // Generate legal certificate
    const certificate = await generateLegalCertificate(
      packetId,
      playbookId,
      playbookTitle,
      operatorId,
      operatorRole,
      actions,
      packet.evidenceRefs || [],
      hasTechnicalVerification,
      hasTEEAttestation
    );

    // Save certificate (optional - for audit trail)
    const certPath = join(process.cwd(), 'engine', 'out', 'certificates', `${certificate.certificateId}.json`);
    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(join(process.cwd(), 'engine', 'out', 'certificates'), { recursive: true });
      await import('fs/promises').then(fs => fs.writeFile(certPath, JSON.stringify(certificate, null, 2), 'utf-8'));
    } catch (error) {
      console.warn('Failed to save certificate file:', error);
    }

    return NextResponse.json({ success: true, certificate });
  } catch (error: any) {
    console.error('Error generating compliance certificate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate compliance certificate' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playbookId = searchParams.get('playbookId');
    const emergencyType = searchParams.get('emergencyType');
    const action = searchParams.get('action');

    // If searching statutes
    if (emergencyType || action) {
      const statutes = searchStatutes(emergencyType || undefined, action || undefined);
      return NextResponse.json({ statutes });
    }

    // If getting playbook compliance
    if (playbookId) {
      const playbooksDir = join(process.cwd(), 'playbooks');
      const playbookPath = join(playbooksDir, playbookId);
      
      let playbook: any = {};
      let playbookTitle = playbookId;
      let actions: Array<{ step: number; actionName: string }> = [];
      
      try {
        const playbookContents = await readFile(playbookPath, 'utf-8');
        playbook = yaml.load(playbookContents) as any;
        playbookTitle = playbook.title || playbookId;
        
        // Extract actions from playbook
        if (playbook.actions && Array.isArray(playbook.actions)) {
          actions = playbook.actions.map((action: any) => ({
            step: action.step || 0,
            actionName: action.action || action.actionName || 'unknown'
          }));
        }
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to load playbook: ${error.message}` },
          { status: 404 }
        );
      }

      const compliance = getPlaybookComplianceStatus(playbookId, playbookTitle, actions);
      return NextResponse.json({ compliance });
    }

    // Return all statutes
    return NextResponse.json({ statutes: NATIONAL_STATUTES });
  } catch (error: any) {
    console.error('Error in compliance API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

