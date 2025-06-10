interface roundedRectangleOptions {
  width: number;
  height: number;
  radius: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  corners?: {
    topLeft?: boolean;
    topRight?: boolean;
    bottomLeft?: boolean;
    bottomRight?: boolean;
  };
  className?: string;
}

export class roundedRectangle {
  private element: HTMLDivElement;
  private options: Required<roundedRectangleOptions>;

  constructor(options: roundedRectangleOptions) {
    this.options = {
      backgroundColor: "#3b82f6",
      borderColor: "transparent",
      borderWidth: 0,
      corners: {
        topLeft: true,
        topRight: true,
        bottomLeft: true,
        bottomRight: true,
      },
      className: "",
      ...options,
    };

    this.element = this.createElement();
    this.applyStyles();
  }

  private createElement(): HTMLDivElement {
    const div = document.createElement("div");
    div.className = `rounded-rectangle ${this.options.className}`;
    return div;
  }

  private applyStyles(): void {
    const { corners, radius } = this.options;

    // Build border-radius string based on corner configuration
    const borderRadius = [
      corners.topLeft ? `${radius}px` : "0",
      corners.topRight ? `${radius}px` : "0",
      corners.bottomRight ? `${radius}px` : "0",
      corners.bottomLeft ? `${radius}px` : "0",
    ].join(" ");

    Object.assign(this.element.style, {
      width: `${this.options.width}px`,
      height: `${this.options.height}px`,
      backgroundColor: this.options.backgroundColor,
      borderRadius,
      border:
        this.options.borderWidth > 0
          ? `${this.options.borderWidth}px solid ${this.options.borderColor}`
          : "none",
      display: "inline-block",
      transition: "all 0.3s ease",
    });
  }

  // Convenience methods for common configurations
  static leftRounded(
    options: Omit<roundedRectangleOptions, "corners">
  ): roundedRectangle {
    return new roundedRectangle({
      ...options,
      corners: {
        topLeft: true,
        bottomLeft: true,
        topRight: false,
        bottomRight: false,
      },
    });
  }

  static rightRounded(
    options: Omit<roundedRectangleOptions, "corners">
  ): roundedRectangle {
    return new roundedRectangle({
      ...options,
      corners: {
        topLeft: false,
        bottomLeft: false,
        topRight: true,
        bottomRight: true,
      },
    });
  }

  static topRounded(
    options: Omit<roundedRectangleOptions, "corners">
  ): roundedRectangle {
    return new roundedRectangle({
      ...options,
      corners: {
        topLeft: true,
        topRight: true,
        bottomLeft: false,
        bottomRight: false,
      },
    });
  }

  static bottomRounded(
    options: Omit<roundedRectangleOptions, "corners">
  ): roundedRectangle {
    return new roundedRectangle({
      ...options,
      corners: {
        topLeft: false,
        topRight: false,
        bottomLeft: true,
        bottomRight: true,
      },
    });
  }

  // Update methods
  updateCorners(corners: Partial<roundedRectangleOptions["corners"]>): void {
    this.options.corners = { ...this.options.corners, ...corners };
    this.applyStyles();
  }

  updateSize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.applyStyles();
  }

  updateColors(backgroundColor?: string, borderColor?: string): void {
    if (backgroundColor) this.options.backgroundColor = backgroundColor;
    if (borderColor) this.options.borderColor = borderColor;
    this.applyStyles();
  }

  updateRadius(radius: number): void {
    this.options.radius = radius;
    this.applyStyles();
  }

  // Event handling
  onClick(callback: (event: MouseEvent) => void): void {
    this.element.addEventListener("click", callback);
    this.element.style.cursor = "pointer";
  }

  onHover(
    onEnter: (event: MouseEvent) => void,
    onLeave: (event: MouseEvent) => void
  ): void {
    this.element.addEventListener("mouseenter", onEnter);
    this.element.addEventListener("mouseleave", onLeave);
  }

  // Getters
  get domElement(): HTMLDivElement {
    return this.element;
  }

  get currentOptions(): Required<roundedRectangleOptions> {
    return { ...this.options };
  }

  // Utility methods
  appendTo(parent: HTMLElement): void {
    parent.appendChild(this.element);
  }

  remove(): void {
    this.element.remove();
  }

  hide(): void {
    this.element.style.display = "none";
  }

  show(): void {
    this.element.style.display = "inline-block";
  }

  animate(properties: Partial<CSSStyleDeclaration>, duration = 300): void {
    this.element.style.transition = `all ${duration}ms ease`;
    Object.assign(this.element.style, properties);
  }
}

// Usage Examples:
/*
// Basic usage with all corners rounded
const basicRect = new roundedRectangle({
  width: 200,
  height: 100,
  radius: 16,
  backgroundColor: "#3b82f6",
});

// Left side rounded only
const leftRect = roundedRectangle.leftRounded({
  width: 150,
  height: 80,
  radius: 12,
  backgroundColor: "#10b981",
});

// Right side rounded only
const rightRect = roundedRectangle.rightRounded({
  width: 150,
  height: 80,
  radius: 12,
  backgroundColor: "#f59e0b",
});

// Top rounded only
const topRect = roundedRectangle.topRounded({
  width: 120,
  height: 60,
  radius: 8,
  backgroundColor: "#ef4444",
});

// Bottom rounded only
const bottomRect = roundedRectangle.bottomRounded({
  width: 120,
  height: 60,
  radius: 8,
  backgroundColor: "#8b5cf6",
});

// Custom corner configuration
const customRect = new roundedRectangle({
  width: 180,
  height: 90,
  radius: 20,
  backgroundColor: "#06b6d4",
  corners: {
    topLeft: true,
    topRight: false,
    bottomLeft: false,
    bottomRight: true,
  },
});

// With border
const borderedRect = new roundedRectangle({
  width: 160,
  height: 70,
  radius: 10,
  backgroundColor: "#ffffff",
  borderColor: "#374151",
  borderWidth: 2,
});

// Example: Add to page and set up interactions
document.addEventListener("DOMContentLoaded", () => {
  const container = document.body;

  // Add all rectangles to the page
  [
    basicRect,
    leftRect,
    rightRect,
    topRect,
    bottomRect,
    customRect,
    borderedRect,
  ].forEach((rect, index) => {
    rect.appendTo(container);

    // Add some spacing
    if (index < 6) {
      const spacer = document.createElement("div");
      spacer.style.margin = "10px";
      container.appendChild(spacer);
    }

    // Add hover effects
    rect.onHover(
      () => rect.animate({ transform: "scale(1.05)" }),
      () => rect.animate({ transform: "scale(1)" })
    );

    // Add click handler
    rect.onClick(() => {
      console.log(`Clicked rectangle ${index + 1}`);
    });
  });
});
*/
