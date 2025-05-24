type Alignment = 'left' | 'center' | 'right';
type BorderStyle = 'single' | 'double' | 'rounded' | 'none';

type BoxStyle = {
  border?: BorderStyle;
  background?: string;  // ANSI color code
  padding?: number;
  innerPadding?: number;  // New property for inner padding
  width?: number;
  height?: number;
};

type Line = {
  content: string;
  alignment?: Alignment;
  style?: {
    foreground?: string;  // ANSI color code
    background?: string;  // ANSI color code
    bold?: boolean;
    italic?: boolean;
    end?: string;  // Keep the end property
  };
};

type Box = {
  style: BoxStyle;
  lines: Line[];
};

const BORDER_CHARS = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│'
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║'
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│'
  }
};

function applyStyle(text: string, style?: Line['style']): string {
  if (!style) return text;
  let result = text;
  if (style.foreground) result = `${style.foreground}${result}${style.end ?? '\x1b[0m'}`;
  if (style.background) result = `${style.background}${result}${style.end ?? '\x1b[0m'}`;
  if (style.bold) result = `\x1b[1m${result}${style.end ?? '\x1b[0m'}`;
  if (style.italic) result = `\x1b[3m${result}${style.end ?? '\x1b[0m'}`;
  return result;
}

function alignText(text: string, width: number, alignment: Alignment = 'left'): string {
  const padding = width - text.length;
  if (padding <= 0) return text.slice(0, width);

  switch (alignment) {
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    case 'right':
      return ' '.repeat(padding) + text;
    default: // left
      return text + ' '.repeat(padding);
  }
}

export function createBox(box: Box): string[] {
  const {
    border = 'single',
    background = '',
    padding = 1,
    innerPadding = 1,  // Default inner padding
    width = 20,
    height = 5
  } = box.style;

  if (border === 'none') {
    // For no border, just return the content lines with padding
    const contentWidth = width - (padding * 2);
    const lines: string[] = [];

    for (let i = 0; i < height; i++) {
      const line = box.lines[i] || { content: '' };
      const alignedContent = alignText(line.content, contentWidth, line.alignment);
      const styledContent = applyStyle(alignedContent, line.style);
      const paddedContent = ' '.repeat(padding) + styledContent + ' '.repeat(padding);
      lines.push(background + paddedContent + '\x1b[0m');
    }

    return lines;
  }
  else {
    // if box has border, update `end` prop of lines
    box.lines.forEach(line => {
      line.style = {
        end: background,
        ...line.style // overrides end prop if it exists
      };
    });
  }

  const borderChars = BORDER_CHARS[border];
  const contentWidth = width - 2 - (innerPadding * 2); // Account for borders and inner padding
  const contentHeight = height - 2; // Account for top and bottom borders

  // Initialize the box lines
  const lines: string[] = [];

  // Top border
  const topBorder = borderChars.topLeft +
    borderChars.horizontal.repeat(width - 2) +
    borderChars.topRight;
  lines.push(background + topBorder + '\x1b[0m');

  // Content lines
  for (let i = 0; i < contentHeight; i++) {
    const line = box.lines[i] || { content: '' };
    const alignedContent = alignText(line.content, contentWidth, line.alignment);
    const styledContent = applyStyle(alignedContent, line.style);
    const paddedContent = ' '.repeat(innerPadding) + styledContent + ' '.repeat(innerPadding);
    lines.push(background + borderChars.vertical + paddedContent + borderChars.vertical + '\x1b[0m');
  }

  // Bottom border
  const bottomBorder = borderChars.bottomLeft +
    borderChars.horizontal.repeat(width - 2) +
    borderChars.bottomRight;
  lines.push(background + bottomBorder + '\x1b[0m');

  return lines;
}

export function box(box: Box): string[] {
  return createBox(box);
}

export function line(content: string, alignment: Alignment = 'left', style?: Line['style']): Line {
  return { content, alignment, style };
}

export type { Box, BoxStyle, Line, Alignment, BorderStyle }; 