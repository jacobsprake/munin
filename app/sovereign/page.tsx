/**
 * Sovereign Features Showcase Page
 * Displays all 5 strategic features
 */
'use client';

import { useEffect } from 'react';
import CommandShell from '@/components/CommandShell';
import TEEStatusPanel from '@/components/TEEStatusPanel';
import ComplianceCertificatePanel from '@/components/ComplianceCertificatePanel';
import ProtocolConnectorStatus from '@/components/ProtocolConnectorStatus';
import DataDiodeStatus from '@/components/DataDiodeStatus';
import SovereignMeshPanel from '@/components/SovereignMeshPanel';
import DigitalAssetVaultPanel from '@/components/DigitalAssetVaultPanel';
import BiometricTabletPanel from '@/components/BiometricTabletPanel';
import QuantumSensorsPanel from '@/components/QuantumSensorsPanel';
import SovereignDigitalTwinPanel from '@/components/SovereignDigitalTwinPanel';
import Card from '@/components/ui/Card';
import { Shield, Brain, Plug, FileText, Lock, Radio, Archive, Tablet, Radio as SensorIcon, FlipHorizontal } from 'lucide-react';
const Mirror = FlipHorizontal;

export default function SovereignFeaturesPage() {
  return (
    <CommandShell>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <div className="text-display-title mono font-semibold text-text-primary mb-2">
              FULL-STACK SOVEREIGN ECOSYSTEM
            </div>
            <div className="text-body mono text-text-secondary">
              Munin 2026: From control layer to complete Digital-Physical Resilience.
              Governments no longer buy software; they buy sovereignty.
            </div>
          </div>

          {/* Feature Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card variant="packet" className="border-safety-emerald/30">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-safety-emerald" />
                <div className="text-label mono font-semibold text-text-primary">1. Physical Proof</div>
              </div>
              <div className="text-sm font-mono text-text-secondary">
                TEE-Hardened Handshakes. Hardware-rooted truth that cannot be forged.
              </div>
            </Card>

            <Card variant="packet" className="border-safety-cobalt/30">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="w-5 h-5 text-safety-cobalt" />
                <div className="text-label mono font-semibold text-text-primary">2. Causal Physics</div>
              </div>
              <div className="text-sm font-mono text-text-secondary">
                Causal Inference Engine. Definite predictions, not LLM guesswork.
              </div>
            </Card>

            <Card variant="packet" className="border-safety-cobalt/30">
              <div className="flex items-center gap-3 mb-3">
                <Plug className="w-5 h-5 text-safety-cobalt" />
                <div className="text-label mono font-semibold text-text-primary">3. Protocol Ancestry</div>
              </div>
              <div className="text-sm font-mono text-text-secondary">
                Universal OT-to-Graph Connectors. Zero friction, zero rip-and-replace.
              </div>
            </Card>

            <Card variant="packet" className="border-safety-emerald/30">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-safety-emerald" />
                <div className="text-label mono font-semibold text-text-primary">4. Liability Shield</div>
              </div>
              <div className="text-sm font-mono text-text-secondary">
                Statutory Compliance Mapping. Legal-as-a-Service protection.
              </div>
            </Card>

            <Card variant="packet" className="border-safety-emerald/30">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-safety-emerald" />
                <div className="text-label mono font-semibold text-text-primary">5. Sovereign Air-Gap</div>
              </div>
              <div className="text-sm font-mono text-text-secondary">
                Hardware Data Diodes. The only &quot;Safe AI&quot; for air-gapped infrastructure.
              </div>
            </Card>
          </div>

          {/* Detailed Feature Panels */}
          <div className="space-y-6">
            <div>
              <div className="text-label mono text-text-muted mb-4">FEATURE #1: PHYSICAL PROOF (TEE-HARDENED HANDSHAKES)</div>
              <TEEStatusPanel />
              <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                <div className="text-xs text-text-muted font-mono mb-2">THE STRATEGIC ADVANTAGE</div>
                <div className="text-sm font-mono text-text-primary leading-relaxed">
                  You aren&apos;t just selling &quot;secure software&quot;; you are selling <strong>Mathematical Certainty</strong> rooted in atoms. 
                  Even if a rogue admin or foreign state-actor has root access to the server, they <strong>physically cannot</strong> 
                  alter a command or fake a signature.
                </div>
              </div>
            </div>

            <div>
              <div className="text-label mono text-text-muted mb-4">FEATURE #2: CAUSAL PHYSICS (COUNTERFACTUAL ENGINE)</div>
              <Card variant="packet" className="border-safety-cobalt/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded bg-safety-cobalt/20">
                    <Brain className="w-5 h-5 text-safety-cobalt" />
                  </div>
                  <div className="flex-1">
                    <div className="text-label mono text-text-muted mb-1">CAUSAL INFERENCE ENGINE</div>
                    <div className="text-panel-title mono font-semibold text-text-primary">
                      Definite vs. Indefinite AI
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-base-800 p-3 rounded border border-base-700">
                    <div className="text-xs text-text-muted font-mono mb-2">THE COMPETITIVE ADVANTAGE</div>
                    <div className="text-sm font-mono text-text-primary leading-relaxed">
                      Instead of just correlating &quot;Power Drop&quot; with &quot;Pump Failure,&quot; Munin builds a <strong>Counterfactual Simulation</strong>. 
                      It runs 10,000 &quot;What-If&quot; scenarios per second with 99% probability predictions. Over time, Munin learns the 
                      &quot;Physics of the State&quot; better than the original engineers. This creates a <strong>Data Network Effect</strong>: 
                      the more crises you observe, the more your &quot;Causal Map&quot; becomes an uncopyable asset.
                    </div>
                  </div>
                  <div className="text-xs text-text-muted font-mono">
                    See: <code className="text-safety-cobalt">/simulation</code> for counterfactual simulations
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <div className="text-label mono text-text-muted mb-4">FEATURE #3: PROTOCOL ANCESTRY (ZERO FRICTION)</div>
              <ProtocolConnectorStatus />
              <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                <div className="text-xs text-text-muted font-mono mb-2">THE PITCH</div>
                <div className="text-sm font-mono text-text-primary leading-relaxed">
                  Tell the Minister: <em>&quot;You don&apos;t need to buy new hardware. We drop a Munin Edge-Node into your control room, 
                  and it &apos;inhales&apos; your legacy assets in 24 hours.&quot;</em> This makes adoption <strong>straightforward</strong> because 
                  it requires minimal infrastructure changes.
                </div>
              </div>
            </div>

            <div>
              <div className="text-label mono text-text-muted mb-4">FEATURE #4: LIABILITY SHIELD (LEGAL-AS-A-SERVICE)</div>
              <ComplianceCertificatePanel
                packetId="demo"
                playbookId="flood_event_pump_isolation.yaml"
              />
              <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                <div className="text-xs text-text-muted font-mono mb-2">THE COMPETITIVE ADVANTAGE</div>
                <div className="text-sm font-mono text-text-primary leading-relaxed">
                  The person in a control room doesn&apos;t care about &quot;AI&quot;; they care about <strong>not going to jail</strong> if a dam breaks. 
                  Every Munin Playbook is hard-linked to <strong>National Emergency Statutes</strong>. When a human hits the &quot;Handshake,&quot; 
                  Munin generates a legal certificate: <em>&quot;This action was performed in accordance with Article 4 of the National Water Act.&quot;</em> 
                  You are selling <strong>Legal Protection</strong>. You become the &quot;Insurance Policy&quot; for every bureaucrat in the country.
                </div>
              </div>
            </div>

            <div>
              <div className="text-label mono text-text-muted mb-4">FEATURE #5: SOVEREIGN AIR-GAP (HARDWARE DATA DIODES)</div>
              <DataDiodeStatus />
              <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                <div className="text-xs text-text-muted font-mono mb-2">THE STRATEGIC ADVANTAGE</div>
                <div className="text-sm font-mono text-text-primary leading-relaxed">
                  In 2026, the cloud is a target. Governments want &quot;AI on an Island.&quot; Munin is designed to run on hardware that allows 
                  data to flow <em>in</em> (telemetry) but makes it physically impossible for data to flow <em>out</em> (to the internet). 
                  This provides a &quot;Safe AI&quot; approach. While many systems send data to cloud servers, Munin 
                  <strong> respects the Air-Gap</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Full-Stack Sovereign Components */}
          <div className="mt-12 pt-8 border-t border-base-700">
            <div className="text-display-title mono font-semibold text-text-primary mb-4">
              THE FULL-STACK ECOSYSTEM (2026)
            </div>
            <div className="text-body mono text-text-secondary mb-8">
              Five hardware + software components that provide comprehensive capabilities:
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-label mono text-text-muted mb-4">1. SOVEREIGN MESH (EMERGENCY COMMUNICATION)</div>
                <SovereignMeshPanel />
                <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                  <div className="text-xs text-text-muted font-mono mb-2">THE STRATEGIC ADVANTAGE</div>
                  <div className="text-sm font-mono text-text-primary leading-relaxed">
                    In a total grid collapse or cyberwar, the first thing that fails is the cellular network.
                    Munin-Link Mesh Transceivers create a <strong>private, parallel network</strong> that survives
                    even when the nation&apos;s internet is cut. This provides <strong>Communication Sovereignty</strong>.
                  </div>
                </div>
              </div>

              <div>
                <div className="text-label mono text-text-muted mb-4">2. DIGITAL ASSET VAULT (BLACK-BOX RECOVERY)</div>
                <DigitalAssetVaultPanel />
                <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                  <div className="text-xs text-text-muted font-mono mb-2">THE STRATEGIC VALUE</div>
                  <div className="text-sm font-mono text-text-primary leading-relaxed">
                    When servers are wiped by ransomware, you don&apos;t call IT. You go to the Black-Box, turn the physical key,
                    and Munin restores the state&apos;s brain from a physical master-record. This provides <strong>comprehensive disaster recovery</strong>.
                  </div>
                </div>
              </div>

              <div>
                <div className="text-label mono text-text-muted mb-4">3. SOVEREIGN HANDSHAKE TABLET (BIOMETRIC KEY)</div>
                <BiometricTabletPanel />
                <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                  <div className="text-xs text-text-muted font-mono mb-2">THE IDENTITY CRISIS SOLUTION</div>
                  <div className="text-sm font-mono text-text-primary leading-relaxed">
                    High-consequence commands require physical, biometric authorization. A hacker in a distant country
                    can&apos;t authorize a disaster because they don&apos;t have the physical, biometric <strong>&quot;Key of the State.&quot;</strong>
                    Multi-Factor: Iris + Palm + FIPS 140-3 Token.
                  </div>
                </div>
              </div>

              <div>
                <div className="text-label mono text-text-muted mb-4">4. QUANTUM-RESISTANT SENSORS (MUNIN-Q)</div>
                <QuantumSensorsPanel />
                <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                  <div className="text-xs text-text-muted font-mono mb-2">FUTURE-PROOF SOVEREIGNTY</div>
                  <div className="text-sm font-mono text-text-primary leading-relaxed">
                    By 2026, standard encryption is vulnerable to &quot;Store Now, Decrypt Later&quot; from quantum computers.
                    Munin-Q sensors use <strong>Post-Quantum Cryptography (NIST FIPS 203/204)</strong> at the hardware level.
                    This protects the state&apos;s data from the quantum threats of the 2030s.
                  </div>
                </div>
              </div>

              <div>
                <div className="text-label mono text-text-muted mb-4">5. SOVEREIGN DIGITAL TWIN (MUNIN-MIRROR)</div>
                <SovereignDigitalTwinPanel />
                <div className="mt-4 bg-base-800 p-4 rounded border border-base-700">
                  <div className="text-xs text-text-muted font-mono mb-2">SIMULATION-AS-A-SERVICE</div>
                  <div className="text-sm font-mono text-text-primary leading-relaxed">
                    Governments need to &quot;practice&quot; for catastrophes without breaking things. Munin-Mirror runs stress tests
                    (500-year floods, cyber-attacks on 50% of the grid) and allows officials to rehearse Authoritative Handshakes
                    in a sandbox. You sell this as a <strong>&quot;National Resilience Audit&quot;</strong> - every year, the government
                    pays you to prove they *could* survive a catastrophe.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* The Contrarian Truth */}
          <div className="mt-12 pt-8 border-t border-base-700">
            <Card variant="packet" className="border-safety-cobalt/50 bg-safety-cobalt/5">
              <div className="text-label mono text-text-muted mb-4">THE CONTRARIAN TRUTH</div>
              <div className="text-panel-title mono font-semibold text-text-primary mb-4">
                &quot;What is one important truth that very few people agree with you on?&quot;
              </div>
              <div className="bg-base-800 p-6 rounded border border-base-700">
                <div className="text-body mono text-text-primary leading-relaxed italic">
                  &quot;Most people believe that the failure of modern infrastructure is an <strong>Engineering</strong> problem that more 
                  sensors will solve. I believe it is a <strong>Coordination</strong> problem caused by <strong>Liability Paralysis</strong>. 
                  We already have the data to see every crisis coming, but we have built a bureaucratic culture where it is illegal for 
                  officials to act at the speed of the grid. The solution isn&apos;t another dashboard; it&apos;s a <strong>Sovereign Orchestration Layer</strong> 
                  that pre-validates authority, turning the state back into a high-agency organism that can act as fast as its atoms.&quot;
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
