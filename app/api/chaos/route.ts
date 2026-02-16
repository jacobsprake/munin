/**
 * GET /api/chaos - List chaos scenarios
 * POST /api/chaos - Generate chaos scenario
 */
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioType = searchParams.get('type');
    const severity = searchParams.get('severity');

    const scenariosPath = join(process.cwd(), 'engine', 'out', 'chaos_scenarios.json');
    
    try {
      const content = await readFile(scenariosPath, 'utf-8');
      const data = JSON.parse(content);
      
      let scenarios = data.scenarios || [];
      
      // Filter by type if provided
      if (scenarioType) {
        scenarios = scenarios.filter((s: any) => s.scenario_type === scenarioType);
      }
      
      // Filter by severity if provided
      if (severity) {
        const sev = parseFloat(severity);
        scenarios = scenarios.filter((s: any) => Math.abs(s.severity - sev) < 0.1);
      }
      
      return NextResponse.json({
        success: true,
        scenarios,
        count: scenarios.length
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          scenarios: [],
          count: 0,
          message: 'No chaos scenarios generated yet. Run the chaos simulator engine first.'
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching chaos scenarios:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chaos scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario_type, severity = 1.0 } = body;

    // Trigger Python engine to generate scenario
    // In production, this would queue a job
    return NextResponse.json({
      success: true,
      message: 'Chaos scenario generation queued. Use GET /api/chaos to retrieve results.',
      scenario_type,
      severity
    });
  } catch (error: any) {
    console.error('Error generating chaos scenario:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chaos scenario' },
      { status: 500 }
    );
  }
}
