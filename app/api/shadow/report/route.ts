/**
 * Shadow Mode Report API
 * Generate comprehensive 12-month shadow mode reports showing
 * cost savings and proof that Munin is better than human operators.
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'generate') {
      // Call Python engine to generate shadow mode report
      const scriptPath = join(process.cwd(), 'engine', 'shadow_simulation.py');
      const command = `python3 "${scriptPath}" generate_report`;
      
      try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        return NextResponse.json({
          success: true,
          report: {
            version: result.version,
            generated: result.generated,
            shadowModeStatus: result.shadow_mode_status,
            shadowModePeriod: result.shadow_mode_period,
            summary: result.summary,
            keyFindings: result.key_findings,
            costSavingsReport: result.cost_savings_report,
            topImprovements: result.top_improvements,
            conclusion: result.conclusion,
            recommendation: result.recommendation
          }
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to generate report: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    if (action === 'load') {
      // Load existing report from file
      const reportPath = join(process.cwd(), 'engine', 'out', 'shadow_report.json');
      
      try {
        const reportContents = await readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportContents);
        
        return NextResponse.json({
          success: true,
          report
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json(
            { error: 'Shadow mode report not found. Run generate first.' },
            { status: 404 }
          );
        }
        throw error;
      }
    }
    
    return NextResponse.json({ error: 'Invalid action. Use ?action=generate or ?action=load' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
