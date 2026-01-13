/**
 * Zero-Knowledge Proof Audit API
 * Generate and verify ZKP audit reports that prove safety
 * without revealing national secrets.
 */

import { NextResponse } from 'next/server';
import {
  generateWaterSafetyZKP,
  generateGridStabilityZKP,
  generateZKPAuditReport,
  verifyZKPStatement,
  exampleWaterSafetyAudit
} from '@/lib/zkp_audit';

export async function POST(request: Request) {
  try {
    const { action, auditType, data } = await request.json();
    
    if (action === 'generate_water_safety') {
      const { pressureReadings, safetyThreshold, pumpLocations } = data;
      
      if (!pressureReadings || !safetyThreshold) {
        return NextResponse.json(
          { error: 'Missing required fields: pressureReadings, safetyThreshold' },
          { status: 400 }
        );
      }
      
      const statement = await generateWaterSafetyZKP(
        pressureReadings,
        safetyThreshold,
        pumpLocations || []
      );
      
      return NextResponse.json({
        success: true,
        statement: {
          claim: statement.claim,
          publicParams: statement.publicParams,
          proof: statement.proof.substring(0, 50) + '...', // Truncate for display
          verificationKey: statement.verificationKey,
          timestamp: statement.timestamp
        },
        note: 'Actual pressure values and pump locations are NOT included in the proof'
      });
    }
    
    if (action === 'generate_grid_stability') {
      const { frequencyReadings, stabilityRange, nodeIds } = data;
      
      if (!frequencyReadings || !stabilityRange) {
        return NextResponse.json(
          { error: 'Missing required fields: frequencyReadings, stabilityRange' },
          { status: 400 }
        );
      }
      
      const statement = await generateGridStabilityZKP(
        frequencyReadings,
        stabilityRange,
        nodeIds || []
      );
      
      return NextResponse.json({
        success: true,
        statement: {
          claim: statement.claim,
          publicParams: statement.publicParams,
          proof: statement.proof.substring(0, 50) + '...',
          verificationKey: statement.verificationKey,
          timestamp: statement.timestamp
        },
        note: 'Actual frequency values and node IDs are NOT included in the proof'
      });
    }
    
    if (action === 'generate_report') {
      if (!auditType || !data?.statements) {
        return NextResponse.json(
          { error: 'Missing required fields: auditType, data.statements' },
          { status: 400 }
        );
      }
      
      const report = await generateZKPAuditReport(auditType, data.statements);
      
      return NextResponse.json({
        success: true,
        report: {
          reportId: report.reportId,
          auditType: report.auditType,
          publicSummary: report.publicSummary,
          verificationInstructions: report.verificationInstructions,
          statementCount: report.statements.length
        },
        note: 'This report can be shared publicly without revealing national secrets'
      });
    }
    
    if (action === 'verify') {
      const { statement } = data;
      
      if (!statement) {
        return NextResponse.json(
          { error: 'Missing required field: statement' },
          { status: 400 }
        );
      }
      
      const verification = await verifyZKPStatement(statement);
      
      return NextResponse.json({
        success: true,
        verification: {
          valid: verification.valid,
          claimVerified: verification.claimVerified,
          reason: verification.reason
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'example') {
      // Generate example water safety audit
      const report = await exampleWaterSafetyAudit();
      
      return NextResponse.json({
        success: true,
        report: {
          reportId: report.reportId,
          auditType: report.auditType,
          publicSummary: report.publicSummary,
          verificationInstructions: report.verificationInstructions
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


