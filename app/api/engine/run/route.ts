/**
 * POST /api/engine/run
 * Trigger the Python engine pipeline to run asynchronously
 */
import { NextResponse } from 'next/server';
import { engineJobsRepo } from '@/lib/db/repositories';
import { spawn } from 'child_process';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    // Create a new job record
    const job = engineJobsRepo.create();

    // Run the engine pipeline in the background
    const enginePath = join(process.cwd(), 'engine', 'run.py');
    const pythonProcess = spawn('python3', [enginePath], {
      cwd: process.cwd(),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Update job status to running
    engineJobsRepo.updateStatus(job.id, 'running');

    // Handle process completion (non-blocking)
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        engineJobsRepo.updateStatus(job.id, 'completed', undefined, 'engine/out');
      } else {
        engineJobsRepo.updateStatus(job.id, 'failed', `Process exited with code ${code}`);
      }
    });

    pythonProcess.on('error', (error) => {
      engineJobsRepo.updateStatus(job.id, 'failed', error.message);
    });

    // Don't wait for process to complete
    pythonProcess.unref();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'running',
      message: 'Engine pipeline started'
    });
  } catch (error: any) {
    console.error('Error starting engine pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start engine pipeline' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/engine/run
 * Get status of engine jobs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      const job = engineJobsRepo.getById(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    // Return latest job
    // Note: In a real implementation, you'd want pagination
    return NextResponse.json({ message: 'Use ?jobId=<id> to get specific job status' });
  } catch (error: any) {
    console.error('Error querying engine jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query engine jobs' },
      { status: 500 }
    );
  }
}

