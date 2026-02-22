/**
 * Demo Script Mode
 * 
 * Provides a scripted story mode that walks through pre-generated data
 * with UI cues and guided interactions for demonstrations.
 */

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  action: 'navigate' | 'highlight' | 'wait' | 'interact' | 'show_data';
  target?: string; // Component ID or route
  data?: any;
  duration?: number; // Milliseconds to wait
  cue?: string; // UI cue text
}

export interface DemoScript {
  id: string;
  name: string;
  description: string;
  duration: number; // Estimated duration in seconds
  steps: DemoStep[];
}

const DEMO_SCRIPTS: Record<string, DemoScript> = {
  carlisle_flood: {
    id: 'carlisle_flood',
    name: 'Carlisle Flood Response',
    description: 'Demonstrates Munin\'s response to a flood event using Storm Desmond data',
    duration: 600, // 10 minutes
    steps: [
      {
        id: 'step_1',
        title: 'Introduction',
        description: 'Welcome to Munin\'s flood response demonstration',
        action: 'navigate',
        target: '/carlisle-dashboard',
        cue: 'Welcome to Munin. This demo shows how Munin responds to flood events.',
      },
      {
        id: 'step_2',
        title: 'View Station Readings',
        description: 'Show real-time river level readings',
        action: 'highlight',
        target: 'station_readings',
        duration: 5000,
        cue: 'These are real-time readings from Environment Agency sensors. Notice the rising levels.',
      },
      {
        id: 'step_3',
        title: 'Incident Detection',
        description: 'Show how Munin detects the incident',
        action: 'navigate',
        target: '/simulation',
        cue: 'Munin has detected a flood event based on threshold crossings.',
      },
      {
        id: 'step_4',
        title: 'Cascade Prediction',
        description: 'Show predicted cascade timeline',
        action: 'highlight',
        target: 'cascade_timeline',
        duration: 10000,
        cue: 'Munin predicts which assets will be impacted and when, using shadow links.',
      },
      {
        id: 'step_5',
        title: 'Playbook Recommendation',
        description: 'Show recommended playbook',
        action: 'highlight',
        target: 'playbook_panel',
        duration: 5000,
        cue: 'Munin recommends a playbook based on the incident type and affected assets.',
      },
      {
        id: 'step_6',
        title: 'Generate Handshake',
        description: 'Generate authoritative handshake packet',
        action: 'interact',
        target: 'generate_handshake_button',
        cue: 'Click to generate an authoritative handshake packet with all required evidence.',
      },
      {
        id: 'step_7',
        title: 'View Packet',
        description: 'Show generated packet details',
        action: 'navigate',
        target: '/handshakes',
        duration: 8000,
        cue: 'The packet contains situation summary, proposed actions, and regulatory basis.',
      },
      {
        id: 'step_8',
        title: 'Approval Workflow',
        description: 'Show approval process',
        action: 'highlight',
        target: 'approval_panel',
        duration: 10000,
        cue: 'Operators can approve the packet. Munin tracks time-to-authorize metrics.',
      },
      {
        id: 'step_9',
        title: 'Value Demonstration',
        description: 'Show time saved and damage prevented',
        action: 'navigate',
        target: '/carlisle-dashboard',
        duration: 5000,
        cue: 'Munin\'s shadow mode demonstrates value: faster response times and damage prevention.',
      },
    ],
  },
  shadow_mode: {
    id: 'shadow_mode',
    name: 'Shadow Mode Value Proof',
    description: 'Demonstrates shadow mode passive observation and value metrics',
    duration: 480, // 8 minutes
    steps: [
      {
        id: 'step_1',
        title: 'Shadow Mode Overview',
        description: 'Introduction to shadow mode',
        action: 'navigate',
        target: '/carlisle-dashboard',
        cue: 'Shadow mode allows Munin to observe and learn without executing commands.',
      },
      {
        id: 'step_2',
        title: 'Historical Replay',
        description: 'Show historical incident replay',
        action: 'navigate',
        target: '/simulation',
        cue: 'We can replay historical incidents to compare Munin vs human response times.',
      },
      {
        id: 'step_3',
        title: 'Value Metrics',
        description: 'Show time saved and damage prevented',
        action: 'highlight',
        target: 'value_metrics',
        duration: 10000,
        cue: 'Over 6 months, Munin demonstrated significant time savings and damage prevention.',
      },
    ],
  },
};

export function getDemoScript(scriptId: string): DemoScript | null {
  return DEMO_SCRIPTS[scriptId] || null;
}

export function getAllDemoScripts(): DemoScript[] {
  return Object.values(DEMO_SCRIPTS);
}

export class DemoScriptPlayer {
  private script: DemoScript;
  private currentStepIndex: number = 0;
  private isPlaying: boolean = false;
  private onStepChange?: (step: DemoStep) => void;
  private onComplete?: () => void;

  constructor(scriptId: string) {
    const script = getDemoScript(scriptId);
    if (!script) {
      throw new Error(`Demo script '${scriptId}' not found`);
    }
    this.script = script;
  }

  setOnStepChange(callback: (step: DemoStep) => void) {
    this.onStepChange = callback;
  }

  setOnComplete(callback: () => void) {
    this.onComplete = callback;
  }

  async play() {
    this.isPlaying = true;
    this.currentStepIndex = 0;

    for (const step of this.script.steps) {
      if (!this.isPlaying) break;

      this.onStepChange?.(step);

      if (step.duration) {
        await new Promise((resolve) => setTimeout(resolve, step.duration));
      } else {
        // Wait for user interaction
        await new Promise((resolve) => {
          // In a real implementation, would wait for user to click "Next"
          setTimeout(resolve, 3000);
        });
      }
    }

    this.isPlaying = false;
    this.onComplete?.();
  }

  pause() {
    this.isPlaying = false;
  }

  next() {
    if (this.currentStepIndex < this.script.steps.length - 1) {
      this.currentStepIndex++;
      this.onStepChange?.(this.script.steps[this.currentStepIndex]);
    }
  }

  previous() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.onStepChange?.(this.script.steps[this.currentStepIndex]);
    }
  }

  getCurrentStep(): DemoStep | null {
    return this.script.steps[this.currentStepIndex] || null;
  }
}
