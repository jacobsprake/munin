import { NextResponse } from 'next/server';
import { readFile, writeFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { generateSignatureHash } from '@/lib/hash';
import { authenticate } from '@/lib/auth';
import { packetsRepo, auditLogRepo } from '@/lib/db/repositories';
import { signWithPQC } from '@/lib/pqc';
import { signPacketInTEE, detectTEEPlatform } from '@/lib/tee';
import { generateLegalCertificate } from '@/lib/compliance';
import { getPythonPath } from '@/lib/utils';
import yaml from 'js-yaml';

export async function POST(request: Request) {
  try {
    const { packetId, operatorId, passphrase } = await request.json();
    if (!packetId || !operatorId || !passphrase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authenticate user
    const user = await authenticate(operatorId, passphrase);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check CMI Protocol status - if active, require Ministry of Defense authorization
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const engineDir = join(process.cwd(), 'engine');
      
      try {
        const pythonPath = getPythonPath();
        const { stdout } = await execAsync(
          `cd ${engineDir} && ${pythonPath} -c "from cmi_logic import get_cmi_status; import json; print(json.dumps(get_cmi_status()))"`
        );
        const cmiStatus = JSON.parse(stdout.trim());
        
        if (cmiStatus.cmi_active && cmiStatus.ministry_of_defense_key_required) {
          // Check if user has Ministry of Defense role/key
          const hasModKey = user.role === 'ministry_of_defense' || 
                           user.role === 'defense' || 
                           operatorId.includes('mod_') ||
                           operatorId.includes('defense_');
          
          if (!hasModKey) {
            return NextResponse.json({
              error: 'CMI Protocol Active: Ministry of Defense authorization required',
              reason: 'Sovereign Defense Handshake Required',
              cmi_status: cmiStatus,
              required_authority: 'MINISTRY_OF_DEFENSE'
            }, { status: 403 });
          }
        }
      } catch (cmiError) {
        // If CMI check fails, continue with normal authorization (fail-open for demo)
        console.warn('CMI status check failed, continuing with normal authorization:', cmiError);
      }
    } catch (error) {
      // Fail-open if CMI check system unavailable
      console.warn('CMI check system unavailable:', error);
    }

    const packetPath = join(process.cwd(), 'engine', 'out', 'packets', `${packetId}.json`);
    let packetContents: string;
    try {
      packetContents = await readFile(packetPath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Packet not found' }, { status: 404 });
      }
      throw error;
    }
    const packet = JSON.parse(packetContents);

    const timestamp = new Date().toISOString();
    
    // Generate PQC signature (quantum-resistant)
    const pqcSignature = await signWithPQC(packetContents, `${operatorId}-${passphrase}`, 'DILITHIUM-3');
    
    // Generate TEE signature (hardware-rooted truth + Logic-Lock)
    const teePlatform = await detectTEEPlatform();
    let teeSignature;
    try {
      teeSignature = await signPacketInTEE(packetContents, teePlatform, true); // Enable physics validation
    } catch (teeError: any) {
      // If TEE Logic-Lock blocks the command, return error
      if (teeError.message.includes('Logic-Lock')) {
        return NextResponse.json(
          { 
            error: 'Command blocked by Logic-Lock',
            reason: teeError.message,
            blocked: true
          },
          { status: 403 } // Forbidden - physics violation
        );
      }
      throw teeError; // Re-throw other TEE errors
    }
    
    // Also generate legacy hash for compatibility
    const signatureHash = await generateSignatureHash(
      packetContents,
      operatorId,
      passphrase,
      timestamp
    );

    // Update first pending approval
    const pendingApproval = packet.approvals.find((a: any) => !a.signedTs);
    if (pendingApproval) {
      pendingApproval.signerId = operatorId;
      pendingApproval.signedTs = timestamp;
      pendingApproval.signatureHash = signatureHash;
    }
    
    // Add PQC signature to packet
    if (!packet.pqc) {
      packet.pqc = {
        algorithm: 'DILITHIUM-3',
        publicKey: pqcSignature.publicKey,
        signature: pqcSignature.signature,
        timestamp: pqcSignature.timestamp
      };
    }
    
    // Add TEE signature to packet (hardware-rooted truth)
    packet.tee = {
      platform: teeSignature.attestation.platform,
      enclaveId: teeSignature.attestation.enclaveId,
      quote: teeSignature.attestation.quote,
      publicKey: teeSignature.attestation.publicKey,
      timestamp: teeSignature.attestation.timestamp,
      measurement: teeSignature.attestation.measurement,
      signature: teeSignature.signature,
      packetHash: teeSignature.packetHash,
      nonce: teeSignature.nonce
    };

    // Count current signatures
    const signedCount = packet.approvals.filter((a: any) => a.signedTs).length;
    
    // Check multi-sig requirements (M-of-N)
    const multiSig = packet.multiSig || { required: packet.approvals.length, threshold: packet.approvals.length, currentSignatures: 0 };
    const threshold = multiSig.threshold || packet.approvals.length;
    
    // Update multi-sig current signature count
    multiSig.currentSignatures = signedCount;
    packet.multiSig = multiSig;

    // Update status if threshold is met (M-of-N)
    if (signedCount >= threshold) {
      packet.status = 'authorized';
    }

    await writeFile(packetPath, JSON.stringify(packet, null, 2), 'utf-8');

    // Update database if packet exists there
    try {
      const dbPacket = packetsRepo.getById(packetId);
      if (dbPacket) {
        const updatedPacket = {
          ...dbPacket,
          status: packet.status,
          approvals: JSON.stringify(packet.approvals)
        };
        packetsRepo.upsert(updatedPacket);
      }
    } catch (dbError) {
      console.warn('Failed to update packet in database:', dbError);
    }

    // Get previous audit hash if packet has audit info
    let previousAuditHash: string | undefined;
    if (packet.audit?.lastAuditHash) {
      previousAuditHash = packet.audit.lastAuditHash;
    }

    // Append to audit log (both file and database)
    const auditPath = join(process.cwd(), 'engine', 'out', 'audit.jsonl');
    const auditEntry = {
      action: 'authorize',
      actor: operatorId,
      ts: timestamp,
      packetId,
      hash: signatureHash,
      previousHash: previousAuditHash,
    };

    // Update packet audit info
    const newAuditHash = await generateSignatureHash(
      JSON.stringify(auditEntry),
      operatorId,
      passphrase,
      timestamp
    );
    
    packet.audit = {
      lastAuditHash: newAuditHash,
      previousAuditHash: previousAuditHash,
    };
    
    // File-based audit log (for compatibility)
    try {
      await appendFile(auditPath, JSON.stringify(auditEntry) + '\n', 'utf-8');
    } catch (error: any) {
      // If file doesn't exist, create it first
      if (error.code === 'ENOENT') {
        const { mkdir } = await import('fs/promises');
        await mkdir(join(process.cwd(), 'engine', 'out'), { recursive: true });
        await appendFile(auditPath, JSON.stringify(auditEntry) + '\n', 'utf-8');
      } else {
        throw error;
      }
    }

    // Database audit log
    try {
      auditLogRepo.insert({
        action: 'authorize',
        actor: operatorId,
        ts: new Date(timestamp),
        packetId,
        hash: signatureHash
      });
    } catch (dbError) {
      console.warn('Failed to write audit log to database:', dbError);
    }

    // Generate legal certificate (Liability Shield)
    let legalCertificate = null;
    try {
      // Load playbook to extract actions
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
      } catch (playbookError) {
        console.warn(`Failed to load playbook for certificate: ${playbookError}`);
      }

      legalCertificate = await generateLegalCertificate(
        packetId,
        playbookId,
        playbookTitle,
        operatorId,
        user.role,
        actions,
        packet.evidenceRefs || [],
        !!packet.technicalVerification,
        !!packet.tee
      );

      // Save certificate
      const certPath = join(process.cwd(), 'engine', 'out', 'certificates', `${legalCertificate.certificateId}.json`);
      const { mkdir } = await import('fs/promises');
      await mkdir(join(process.cwd(), 'engine', 'out', 'certificates'), { recursive: true });
      await writeFile(certPath, JSON.stringify(legalCertificate, null, 2), 'utf-8');
    } catch (certError) {
      console.warn('Failed to generate legal certificate:', certError);
      // Don't fail the authorization if certificate generation fails
    }

    return NextResponse.json({ 
      success: true, 
      packet,
      legalCertificate // Include certificate in response
    });
  } catch (error) {
    console.error('Error authorizing packet:', error);
    return NextResponse.json({ error: 'Failed to authorize' }, { status: 500 });
  }
}

