import { Page, Locator, expect } from '@playwright/test';

/**
 * Viewport configuration for responsive testing
 */
export interface ViewportConfig {
  width: number;
  height: number;
  name: string;
}

/**
 * Bounding box result with additional metadata
 */
export interface BoundingBoxResult {
  x: number;
  y: number;
  width: number;
  height: number;
  rightEdge: number;
  bottomEdge: number;
}

/**
 * Element overflow check result
 */
export interface OverflowCheckResult {
  elementName: string;
  resolution: string;
  isWithinBounds: boolean;
  overflow: {
    right: number;
    bottom: number;
  };
  elementBox: BoundingBoxResult | null;
  containerBox: BoundingBoxResult | null;
}

/**
 * Page responsive check summary
 */
export interface ResponsiveCheckSummary {
  pageName: string;
  resolution: string;
  totalElements: number;
  passedElements: number;
  failedElements: number;
  hasHorizontalScroll: boolean;
  failures: OverflowCheckResult[];
}

/**
 * Standard viewports for responsive testing
 */
export const STANDARD_VIEWPORTS: ViewportConfig[] = [
  { width: 1920, height: 1080, name: 'Full HD' },
  { width: 1680, height: 1050, name: 'Large Desktop' },
  { width: 1600, height: 900, name: 'Desktop HD+' },
  { width: 1440, height: 900, name: 'MacBook Pro' },
  { width: 1366, height: 768, name: 'Common Laptop' },
  { width: 1280, height: 720, name: 'HD Laptop' },
  { width: 1024, height: 768, name: 'Tablet Landscape' },
];

/**
 * ResponsiveHelper - Utility class for responsive layout testing.
 * Contains common methods for checking element boundaries, overflow, and viewport bounds.
 */
export class ResponsiveHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Set viewport size for testing
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    // Wait for layout to stabilize after resize
    await this.page.waitForTimeout(300);
  }

  /**
   * Set viewport using ViewportConfig
   */
  async setViewportConfig(config: ViewportConfig): Promise<void> {
    await this.setViewport(config.width, config.height);
  }

  /**
   * Get bounding box with computed edges
   */
  async getBoundingBox(locator: Locator): Promise<BoundingBoxResult | null> {
    const box = await locator.boundingBox();
    if (!box) return null;

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rightEdge: box.x + box.width,
      bottomEdge: box.y + box.height,
    };
  }

  /**
   * Check if page has horizontal scroll (indicates overflow)
   */
  async hasHorizontalScroll(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
  }

  /**
   * Check if page has vertical overflow beyond viewport
   */
  async hasVerticalOverflow(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
  }

  /**
   * Get current viewport dimensions
   */
  async getViewportSize(): Promise<{ width: number; height: number }> {
    return await this.page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
  }

  /**
   * Check if element is within viewport bounds
   */
  async isElementWithinViewport(locator: Locator): Promise<boolean> {
    const box = await this.getBoundingBox(locator);
    if (!box) return false;

    const viewport = await this.getViewportSize();

    return (
      box.x >= 0 &&
      box.y >= 0 &&
      box.rightEdge <= viewport.width &&
      box.bottomEdge <= viewport.height
    );
  }

  /**
   * Check if element is within a container's bounds
   */
  async isElementWithinContainer(
    element: Locator,
    container: Locator
  ): Promise<OverflowCheckResult> {
    const elementBox = await this.getBoundingBox(element);
    const containerBox = await this.getBoundingBox(container);
    const viewport = await this.getViewportSize();
    const elementName = await element.evaluate(el => el.textContent?.trim() || el.tagName);

    if (!elementBox || !containerBox) {
      return {
        elementName,
        resolution: `${viewport.width}x${viewport.height}`,
        isWithinBounds: false,
        overflow: { right: 0, bottom: 0 },
        elementBox,
        containerBox,
      };
    }

    const rightOverflow = Math.max(0, elementBox.rightEdge - containerBox.rightEdge);
    const bottomOverflow = Math.max(0, elementBox.bottomEdge - containerBox.bottomEdge);

    return {
      elementName,
      resolution: `${viewport.width}x${viewport.height}`,
      isWithinBounds: rightOverflow === 0 && bottomOverflow === 0,
      overflow: {
        right: rightOverflow,
        bottom: bottomOverflow,
      },
      elementBox,
      containerBox,
    };
  }

  /**
   * Check if element is within viewport (horizontal bounds only)
   */
  async checkElementHorizontalBounds(
    element: Locator,
    elementName: string
  ): Promise<OverflowCheckResult> {
    const elementBox = await this.getBoundingBox(element);
    const viewport = await this.getViewportSize();

    if (!elementBox) {
      return {
        elementName,
        resolution: `${viewport.width}x${viewport.height}`,
        isWithinBounds: false,
        overflow: { right: 0, bottom: 0 },
        elementBox: null,
        containerBox: null,
      };
    }

    const rightOverflow = Math.max(0, elementBox.rightEdge - viewport.width);

    return {
      elementName,
      resolution: `${viewport.width}x${viewport.height}`,
      isWithinBounds: rightOverflow === 0,
      overflow: {
        right: rightOverflow,
        bottom: 0,
      },
      elementBox,
      containerBox: null,
    };
  }

  /**
   * Check multiple elements against viewport bounds
   */
  async checkMultipleElementsBounds(
    elements: { locator: Locator; name: string }[]
  ): Promise<OverflowCheckResult[]> {
    const results: OverflowCheckResult[] = [];

    for (const { locator, name } of elements) {
      const isVisible = await locator.isVisible().catch(() => false);
      if (isVisible) {
        const result = await this.checkElementHorizontalBounds(locator, name);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Generate summary of responsive check results
   */
  generateSummary(
    pageName: string,
    results: OverflowCheckResult[],
    hasHorizontalScroll: boolean
  ): ResponsiveCheckSummary {
    const viewport = results[0]?.resolution || 'unknown';
    const failures = results.filter(r => !r.isWithinBounds);

    return {
      pageName,
      resolution: viewport,
      totalElements: results.length,
      passedElements: results.length - failures.length,
      failedElements: failures.length,
      hasHorizontalScroll,
      failures,
    };
  }

  /**
   * Take screenshot with resolution suffix
   */
  async takeScreenshot(pageName: string, width: number, height: number, outputDir = 'reports/responsive'): Promise<string> {
    const fileName = `${pageName}-${width}x${height}.png`;
    const filePath = `${outputDir}/${fileName}`;
    await this.page.screenshot({ path: filePath, fullPage: false });
    return filePath;
  }

  /**
   * Assert element is within bounds with detailed error
   */
  async assertElementWithinBounds(
    element: Locator,
    elementName: string
  ): Promise<void> {
    const result = await this.checkElementHorizontalBounds(element, elementName);
    
    expect(
      result.isWithinBounds,
      `Element "${elementName}" overflows by ${result.overflow.right}px at ${result.resolution}`
    ).toBe(true);
  }

  /**
   * Assert element is within container bounds
   */
  async assertElementWithinContainer(
    element: Locator,
    container: Locator,
    elementName: string
  ): Promise<void> {
    const result = await this.isElementWithinContainer(element, container);
    
    expect(
      result.isWithinBounds,
      `Element "${elementName}" overflows container by right: ${result.overflow.right}px, bottom: ${result.overflow.bottom}px at ${result.resolution}`
    ).toBe(true);
  }

  /**
   * Assert no horizontal scroll on page
   */
  async assertNoHorizontalScroll(): Promise<void> {
    const viewport = await this.getViewportSize();
    const hasScroll = await this.hasHorizontalScroll();
    
    expect(
      hasScroll,
      `Page has horizontal scroll at ${viewport.width}x${viewport.height}`
    ).toBe(false);
  }

  /**
   * Run responsive checks on a page for multiple viewports
   */
  async runResponsiveChecks(
    pageName: string,
    elements: { locator: Locator; name: string }[],
    viewports: ViewportConfig[] = STANDARD_VIEWPORTS
  ): Promise<ResponsiveCheckSummary[]> {
    const summaries: ResponsiveCheckSummary[] = [];

    for (const viewport of viewports) {
      await this.setViewportConfig(viewport);
      await this.page.waitForLoadState('domcontentloaded');

      const results = await this.checkMultipleElementsBounds(elements);
      const hasScroll = await this.hasHorizontalScroll();
      const summary = this.generateSummary(pageName, results, hasScroll);
      summary.resolution = `${viewport.width}x${viewport.height} (${viewport.name})`;
      
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Print responsive check report to console
   */
  printReport(summaries: ResponsiveCheckSummary[]): void {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                RESPONSIVE LAYOUT TEST REPORT                ');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const summary of summaries) {
      const status = summary.failedElements === 0 && !summary.hasHorizontalScroll ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${summary.pageName} @ ${summary.resolution}`);
      console.log(`     Elements: ${summary.passedElements}/${summary.totalElements} passed`);
      console.log(`     Horizontal Scroll: ${summary.hasHorizontalScroll ? '❌ YES' : '✅ NO'}`);

      if (summary.failures.length > 0) {
        console.log('     Failures:');
        for (const failure of summary.failures) {
          console.log(`       - "${failure.elementName}" overflows by ${failure.overflow.right}px`);
        }
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }
}
