import { NextResponse } from 'next/server';
import { readFile, writeFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { generateSignatureHash } from '@/lib/hash';
import { authenticate } from '@/lib/auth';
import { packetsRepo, auditLogRepo } from '@/lib/db/repositories';

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

    // Update status if all approvals are signed
    if (packet.approvals.every((a: any) => a.signedTs)) {
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

    return NextResponse.json({ success: true, packet });
  } catch (error) {
    console.error('Error authorizing packet:', error);
    return NextResponse.json({ error: 'Failed to authorize' }, { status: 500 });
  }
}

