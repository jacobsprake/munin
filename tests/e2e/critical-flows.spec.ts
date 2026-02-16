/**
 * End-to-End Tests for Critical Flows
 * 
 * Tests critical user flows using Playwright:
 * - Incident detection → handshake generation → approval
 * - Shadow mode value demonstration
 * - Graph visualization and interaction
 */

import { test, expect } from '@playwright/test';

test.describe('Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000');
  });

  test('Incident Detection to Handshake Flow', async ({ page }) => {
    // Navigate to simulation page
    await page.click('text=Simulation');
    await expect(page).toHaveURL(/.*simulation/);

    // Wait for incidents to load
    await page.waitForSelector('[data-testid="incident-list"]', { timeout: 10000 });

    // Select first incident
    await page.click('[data-testid="incident-item"]:first-child');
    
    // Verify incident details displayed
    await expect(page.locator('[data-testid="incident-title"]')).toBeVisible();

    // Generate handshake
    await page.click('text=Generate Handshake');
    
    // Wait for handshake generation
    await page.waitForSelector('[data-testid="handshake-generated"]', { timeout: 10000 });

    // Navigate to handshakes page
    await page.click('text=View Handshake');
    await expect(page).toHaveURL(/.*handshakes/);

    // Verify handshake displayed
    await expect(page.locator('[data-testid="handshake-details"]')).toBeVisible();
  });

  test('Shadow Mode Value Dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard');

    // Wait for value metrics to load
    await page.waitForSelector('[data-testid="value-metrics"]', { timeout: 10000 });

    // Verify metrics displayed
    await expect(page.locator('[data-testid="time-saved"]')).toBeVisible();
    await expect(page.locator('[data-testid="damage-prevented"]')).toBeVisible();
    await expect(page.locator('[data-testid="improvement-ratio"]')).toBeVisible();
  });

  test('Graph Visualization', async ({ page }) => {
    // Navigate to graph page
    await page.goto('http://localhost:3000/graph');

    // Wait for graph to load
    await page.waitForSelector('[data-testid="graph-canvas"]', { timeout: 10000 });

    // Click on a node
    await page.click('[data-testid="graph-node"]:first-child');

    // Verify node details displayed
    await expect(page.locator('[data-testid="node-details"]')).toBeVisible();

    // Click on an edge
    await page.click('[data-testid="graph-edge"]:first-child');

    // Verify edge details displayed
    await expect(page.locator('[data-testid="edge-details"]')).toBeVisible();
  });

  test('Packet Approval Workflow', async ({ page }) => {
    // Navigate to Carlisle dashboard
    await page.goto('http://localhost:3000/carlisle-dashboard');

    // Wait for pending packets to load
    await page.waitForSelector('[data-testid="pending-packets"]', { timeout: 10000 });

    // Click approve on first packet
    const approveButton = page.locator('[data-testid="approve-button"]:first-child');
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Verify approval success
      await expect(page.locator('[data-testid="approval-success"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Role-Based Access Control', async ({ page }) => {
    // Test operator role
    await page.goto('http://localhost:3000');
    
    // Verify operator can view dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Verify operator cannot access admin functions
    const adminButton = page.locator('[data-testid="admin-panel"]');
    if (await adminButton.isVisible()) {
      await expect(adminButton).toBeDisabled();
    }
  });

  test('Air-Gap Verification Wizard', async ({ page }) => {
    // Navigate to air-gap wizard
    await page.goto('http://localhost:3000/airgap');

    // Start verification
    await page.click('text=Start Verification');

    // Wait for verification results
    await page.waitForSelector('[data-testid="verification-results"]', { timeout: 10000 });

    // Verify results displayed
    await expect(page.locator('[data-testid="verification-test"]')).toHaveCount(3);
  });
});

test.describe('Performance Tests', () => {
  test('Large Graph Rendering', async ({ page }) => {
    // Navigate to graph page
    await page.goto('http://localhost:3000/graph');

    // Measure load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="graph-canvas"]', { timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Verify load time is reasonable (< 5 seconds)
    expect(loadTime).toBeLessThan(5000);
  });

  test('Long Incident History', async ({ page }) => {
    // Navigate to simulation page
    await page.goto('http://localhost:3000/simulation');

    // Measure load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="incident-list"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Verify load time is reasonable (< 3 seconds)
    expect(loadTime).toBeLessThan(3000);
  });
});
