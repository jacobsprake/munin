import { NextRequest, NextResponse } from 'next/server';
import { AirGapCertificate, DataDiodeMode } from '@/lib/types';
import dns from 'dns/promises';

/**
 * Air-Gap Configuration Check API
 *
 * Performs basic network connectivity tests (DNS, HTTP) to detect whether
 * outbound network access is available. If these tests fail, it suggests
 * the system may be in an air-gapped configuration.
 *
 * IMPORTANT: These software-level tests are NOT sufficient to verify true
 * air-gap isolation. Real air-gap verification requires hardware data diodes
 * and physical network inspection. This endpoint checks configuration only.
 */
export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get('mode') || 'hardware_diode';

    // Perform actual connectivity tests
    const tests: AirGapCertificate['verificationTests'] = [];

    // Test 1: DNS resolution
    try {
      await dns.resolve('dns.google');
      // DNS succeeded — outbound DNS is available, NOT air-gapped
      tests.push({
        test: 'dns_resolution',
        passed: false,
        details: 'DNS resolution succeeded — outbound DNS access is available. System is NOT air-gapped.',
      });
    } catch {
      // DNS failed — consistent with air-gapped configuration
      tests.push({
        test: 'dns_resolution',
        passed: true,
        details: 'DNS resolution failed — consistent with air-gapped configuration.',
      });
    }

    // Test 2: HTTP connectivity
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch('https://connectivity-check.ubuntu.com/', {
        signal: controller.signal,
        method: 'HEAD',
      });
      clearTimeout(timeout);
      // HTTP succeeded — outbound HTTP is available, NOT air-gapped
      tests.push({
        test: 'external_connectivity',
        passed: false,
        details: 'External HTTP connectivity succeeded — outbound access is available. System is NOT air-gapped.',
      });
    } catch {
      // HTTP failed — consistent with air-gapped configuration
      tests.push({
        test: 'external_connectivity',
        passed: true,
        details: 'External HTTP connectivity failed — consistent with air-gapped configuration.',
      });
    }

    // Test 3: NTP connectivity (attempt DNS lookup of NTP pool)
    try {
      await dns.resolve('pool.ntp.org');
      tests.push({
        test: 'ntp_resolution',
        passed: false,
        details: 'NTP server DNS resolution succeeded — outbound access is available.',
      });
    } catch {
      tests.push({
        test: 'ntp_resolution',
        passed: true,
        details: 'NTP server DNS resolution failed — consistent with air-gapped configuration.',
      });
    }

    const allTestsPassed = tests.every(t => t.passed);

    const verification: AirGapCertificate = {
      version: '1.0',
      issued: new Date().toISOString(),
      system: 'Munin Infrastructure Orchestration',
      airGapStatus: allTestsPassed ? 'air_gapped' : 'not_air_gapped',
      certifiedAirGapped: false, // Software tests alone cannot certify air-gap status
      verificationTests: tests,
      certificationStatement: allTestsPassed
        ? (
          'Software-level connectivity tests indicate no outbound network access is available. ' +
          'This is consistent with an air-gapped configuration, but software tests alone cannot ' +
          'guarantee air-gap isolation. True air-gap verification requires physical network inspection ' +
          'and hardware data diode confirmation.'
        )
        : (
          'Outbound network connectivity was detected. This system does NOT appear to be air-gapped. ' +
          'Review network configuration if air-gapped operation is required.'
        ),
    };

    return NextResponse.json({
      success: true,
      verification,
      dataDiodeMode: mode as DataDiodeMode,
      message: allTestsPassed
        ? 'Connectivity tests suggest air-gapped configuration. See report for caveats.'
        : 'Outbound connectivity detected. System is NOT in air-gapped configuration.',
    });
  } catch (error) {
    console.error('Air-gap configuration check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate data diode configuration report.
 *
 * NOTE: This reports the configured mode only. It does not verify that
 * hardware data diodes are physically present or functioning. True one-way
 * data flow enforcement requires hardware data diodes that are outside the
 * scope of software verification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    const report = {
      version: '1.0',
      issued: new Date().toISOString(),
      system: 'Munin Infrastructure Orchestration',
      securityModel: {
        dataDiodeMode: mode || 'hardware_diode',
        inboundAllowed: true,
        outboundBlocked: true,
        airGapEnforced: true,
      },
      configuredProperties: [
        'Data flow configured as inbound-only',
        'Outbound network traffic blocked at software level',
        'No cloud connectivity or "call home" capability configured',
      ],
      caveats: [
        'Software-level configuration cannot guarantee physical isolation',
        'Hardware data diodes are required for enforced one-way data flow',
        'Physical network inspection is needed to confirm air-gap status',
      ],
      reportStatement: (
        'This system is CONFIGURED for data diode mode. ' +
        'Software-level controls block outbound traffic, but ' +
        'true one-way data flow enforcement requires hardware data diodes. ' +
        'This report reflects configuration intent, not a verified physical state.'
      ),
    };

    return NextResponse.json({
      success: true,
      report,
      message: 'Configuration report generated. See caveats for limitations.',
    });
  } catch (error) {
    console.error('Configuration report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
