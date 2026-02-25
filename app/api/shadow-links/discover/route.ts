import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { getPythonPath } from '@/lib/serverUtils';

const execAsync = promisify(exec);

/**
 * Shadow Link Discovery API
 * 
 * Runs temporal correlation analysis to discover hidden dependencies
 * between assets that are not in the registry.
 * 
 * This is the "Secret" - finding dependencies humans would miss.
 */
export async function POST() {
  try {
    const enginePath = join(process.cwd(), 'engine');
    const scriptPath = join(enginePath, 'infer_graph.py');
    
    // Run the graph inference which includes shadow link detection
    const pythonPath = getPythonPath();
    const { stdout, stderr } = await execAsync(
      `cd ${enginePath} && ${pythonPath} infer_graph.py`,
      { timeout: 30000 }
    );
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Graph inference stderr:', stderr);
    }
    
    // Read the generated graph to find shadow links
    const fs = await import('fs/promises');
    const graphPath = join(enginePath, 'out', 'graph.json');
    
    // Check if graph exists, if not we need normalized data first
    let graphExists = false;
    try {
      await fs.access(graphPath);
      graphExists = true;
    } catch {
      // Graph doesn't exist - check if we have normalized data
      const normalizedPath = join(enginePath, 'out', 'normalized_timeseries.csv');
      try {
        await fs.access(normalizedPath);
        // We have data, just need to infer graph
        const { stdout: inferStdout } = await execAsync(
          `cd ${enginePath} && ${pythonPath} infer_graph.py`,
          { timeout: 30000 }
        );
        graphExists = true;
      } catch {
        // No data at all - return error suggesting to run pipeline first
        return NextResponse.json({
          success: false,
          message: 'No graph data available. Please run the engine pipeline first (python3 engine/run.py)',
          shadowLinks: []
        }, { status: 404 });
      }
    }
    
    const graphData = JSON.parse(await fs.readFile(graphPath, 'utf-8'));
    
    // Filter for shadow links
    const shadowLinks = graphData.edges.filter((edge: any) => edge.isShadowLink === true);
    
    // Find the most significant shadow link (highest confidence)
    const topShadowLink = shadowLinks.sort((a: any, b: any) => 
      (b.confidenceScore || 0) - (a.confidenceScore || 0)
    )[0];
    
    if (!topShadowLink) {
      return NextResponse.json({
        success: false,
        message: 'No shadow links detected',
        shadowLinks: []
      });
    }
    
    // Get node labels
    const sourceNode = graphData.nodes.find((n: any) => n.id === topShadowLink.source);
    const targetNode = graphData.nodes.find((n: any) => n.id === topShadowLink.target);
    
    // Calculate correlation percentage
    const correlationPercent = Math.round((topShadowLink.confidenceScore || 0) * 100);
    
    return NextResponse.json({
      success: true,
      shadowLink: {
        id: topShadowLink.id,
        source: {
          id: topShadowLink.source,
          label: sourceNode?.label || topShadowLink.source
        },
        target: {
          id: topShadowLink.target,
          label: targetNode?.label || topShadowLink.target
        },
        correlation: topShadowLink.confidenceScore,
        correlationPercent,
        lagSeconds: topShadowLink.inferredLagSeconds,
        message: `Shadow Link Detected: ${correlationPercent}% Correlation between ${sourceNode?.label || topShadowLink.source} and ${targetNode?.label || topShadowLink.target}. Physical link inferred via temporal analysis.`
      },
      totalShadowLinks: shadowLinks.length,
      allShadowLinks: shadowLinks.slice(0, 10).map((edge: any) => ({
        id: edge.id,
        source: graphData.nodes.find((n: any) => n.id === edge.source)?.label || edge.source,
        target: graphData.nodes.find((n: any) => n.id === edge.target)?.label || edge.target,
        correlation: edge.confidenceScore,
        correlationPercent: Math.round((edge.confidenceScore || 0) * 100)
      }))
    });
  } catch (error: any) {
    console.error('Shadow link discovery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to discover shadow links'
      },
      { status: 500 }
    );
  }
}

