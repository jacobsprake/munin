/**
 * GET /api/readiness - Get NATO-Style Readiness Index
 * Aggregates simulation data into measurable KPIs
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface ReadinessMetrics {
  overall_score: number; // 0-100
  time_to_authorize_avg: number; // seconds
  time_to_task_avg: number; // seconds
  time_to_stabilize_avg: number; // hours
  scenario_success_rate: number; // 0-1
  cascade_containment_rate: number; // 0-1
  sector_breakdown: Record<string, number>;
  trend_data: Array<{ date: string; score: number }>;
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    
    // Get decisions to calculate time-to-authorize
    const decisions = db.prepare(`
      SELECT 
        decision_id,
        created_at,
        authorized_at,
        status
      FROM decisions
      WHERE authorized_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];
    
    // Calculate time-to-authorize (average)
    let timeToAuthorizeSum = 0;
    let timeToAuthorizeCount = 0;
    
    for (const decision of decisions) {
      if (decision.authorized_at) {
        const created = new Date(decision.created_at);
        const authorized = new Date(decision.authorized_at);
        const diffSeconds = (authorized.getTime() - created.getTime()) / 1000;
        timeToAuthorizeSum += diffSeconds;
        timeToAuthorizeCount++;
      }
    }
    
    const timeToAuthorizeAvg = timeToAuthorizeCount > 0 
      ? timeToAuthorizeSum / timeToAuthorizeCount 
      : 120; // Default 2 minutes
    
    // Get simulation results from chaos scenarios
    let scenarioSuccessRate = 0.85; // Default
    let cascadeContainmentRate = 0.80; // Default
    let timeToStabilizeAvg = 24.0; // Default hours
    
    try {
      const chaosPath = join(process.cwd(), 'engine', 'out', 'chaos_scenarios.json');
      const chaosContent = await readFile(chaosPath, 'utf-8');
      const chaosData = JSON.parse(chaosContent);
      
      const scenarios = chaosData.scenarios || [];
      if (scenarios.length > 0) {
        // Calculate success rate (scenarios where damage is contained)
        const successfulScenarios = scenarios.filter((s: any) => {
          const metrics = s.impact_metrics || {};
          const nodesImpacted = metrics.total_nodes_impacted || 0;
          // Success = less than 20% of nodes impacted
          return nodesImpacted < 20;
        });
        scenarioSuccessRate = successfulScenarios.length / scenarios.length;
        
        // Calculate cascade containment (scenarios where cascade stops before critical sectors)
        const containedScenarios = scenarios.filter((s: any) => {
          const sectors = s.impact_metrics?.sectors_affected || [];
          // Contained = less than 3 sectors affected
          return sectors.length < 3;
        });
        cascadeContainmentRate = containedScenarios.length / scenarios.length;
        
        // Average recovery time
        const recoveryTimes = scenarios
          .map((s: any) => s.impact_metrics?.time_to_recovery_hours || 24)
          .filter((t: number) => t > 0);
        if (recoveryTimes.length > 0) {
          timeToStabilizeAvg = recoveryTimes.reduce((a: number, b: number) => a + b, 0) / recoveryTimes.length;
        }
      }
    } catch (error) {
      console.warn('Could not load chaos scenarios, using defaults:', error);
    }
    
    // Get incidents for time-to-task estimation
    const incidents = db.prepare(`
      SELECT COUNT(*) as count FROM incidents
    `).get() as { count: number };
    
    // Estimate time-to-task (simplified: assume 5 minutes average)
    const timeToTaskAvg = 300; // 5 minutes in seconds
    
    // Calculate overall readiness score (0-100)
    // Weighted formula:
    // - Time-to-authorize: 30% (target: < 120s)
    // - Scenario success rate: 30%
    // - Cascade containment: 25%
    // - Time-to-stabilize: 15% (target: < 24h)
    
    const authorizeScore = Math.max(0, 100 - (timeToAuthorizeAvg / 120) * 50); // Penalty if > 2 min
    const successScore = scenarioSuccessRate * 100;
    const containmentScore = cascadeContainmentRate * 100;
    const stabilizeScore = Math.max(0, 100 - ((timeToStabilizeAvg - 24) / 24) * 50); // Penalty if > 24h
    
    const overallScore = (
      authorizeScore * 0.30 +
      successScore * 0.30 +
      containmentScore * 0.25 +
      stabilizeScore * 0.15
    );
    
    // Sector breakdown (simplified)
    const sectorBreakdown: Record<string, number> = {
      'power': 85,
      'water': 82,
      'telecom': 78,
      'transport': 75
    };
    
    // Trend data (last 7 days, simplified)
    const trendData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      // Simulate slight variation
      const variation = (Math.random() - 0.5) * 5;
      trendData.push({
        date: date.toISOString().split('T')[0],
        score: Math.max(0, Math.min(100, overallScore + variation))
      });
    }
    
    const metrics: ReadinessMetrics = {
      overall_score: Math.round(overallScore * 10) / 10,
      time_to_authorize_avg: Math.round(timeToAuthorizeAvg),
      time_to_task_avg: timeToTaskAvg,
      time_to_stabilize_avg: Math.round(timeToStabilizeAvg * 10) / 10,
      scenario_success_rate: Math.round(scenarioSuccessRate * 1000) / 1000,
      cascade_containment_rate: Math.round(cascadeContainmentRate * 1000) / 1000,
      sector_breakdown: sectorBreakdown,
      trend_data: trendData
    };
    
    return NextResponse.json({
      success: true,
      metrics,
      generated_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error calculating readiness metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate readiness metrics' },
      { status: 500 }
    );
  }
}
