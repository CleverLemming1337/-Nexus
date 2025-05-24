import { createPrompt, useKeypress, useState } from '@inquirer/core'
import useTerminalSize from './useTerminalSize'
import inquirer from 'inquirer'
import { box, line, type Box, type Line } from './boxUtils'

interface GitAction {
  name: string
  key?: string
  value: string
  subActions?: GitAction[]
}

// Set your box size here
const ACTION_HEIGHT = 8
const ACTION_WIDTH = 16

const bel = () => process.stdout.write("\x07")

const gitActions = createPrompt((config: { actions: GitAction[], keys?: 'number' | 'letter' }, done) => {
  const [position, setPosition] = useState([0, 0])
  const [selectSubActionIndex, setSelectSubActionIndex] = useState(-1)

  const { width, height } = useTerminalSize()

  // Calculate number of columns and rows based on terminal size and action box size
  const cols = Math.max(1, Math.floor(width / ACTION_WIDTH))
  const rows = Math.ceil(config.actions.length / cols)

  if (config.keys === 'number') {
    config.actions.forEach((action, index) => {
      if (index <= 9) {
        action.key = ((index + 1) % 10).toString()
      }
    })
  } else if (config.keys === 'letter') {
    config.actions.forEach((action, index) => {
      if (index <= 25) {
        action.key = String.fromCharCode(97 + index) // 'a' is 97 in ASCII
      }
    })
  }

  // Build the grid: array of arrays of GitActions
  const grid: GitAction[][] = []
  for (let r = 0; r < rows; r++) {
    const start = r * cols
    const end = start + cols
    grid.push(config.actions.slice(start, end))
  }

  useKeypress(async (key) => {
    if (selectSubActionIndex !== -1) {
      // If a subAction is selected, handle its navigation
      if (key.name === 'up') {
        setSelectSubActionIndex(Math.max(0, selectSubActionIndex - 1))
      }
      else if (key.name === 'down') {
        setSelectSubActionIndex(Math.min(grid[position[0]][position[1]].subActions!.length - 1, selectSubActionIndex + 1))
      }
      //@ts-expect-error meta is not defined in type but exists in the event
      else if (key.name === 'return' && !key.meta) {
        const action = grid[position[0]][position[1]].subActions?.[selectSubActionIndex]
        if (action) {
          done(action.value)
        }
      }
      else if (key.name === 'escape' || key.name === 'backspace') { // Escape is uncomfortable since it is not handled immediately
        setSelectSubActionIndex(-1)
      }
      else {
        const actionWithKey = grid[position[0]][position[1]].subActions?.find(a => a.key && a.key.toLowerCase() === key.name)
        if (actionWithKey) {
          done(actionWithKey.value)
        } else {
          bel()
        }
      }
    } else {
      if (key.name === 'up') {
        setPosition([Math.max(0, position[0] - 1), position[1]])
      }
      else if (key.name === 'down') {
        if (grid[Math.min(grid.length - 1, position[0] + 1)][position[1]]) {
          setPosition([Math.min(grid.length - 1, position[0] + 1), position[1]])
        }
      }
      else if (key.name === 'left') {
        setPosition([position[0], Math.max(0, position[1] - 1)])
      }
      else if (key.name === 'right') {
        setPosition([position[0], Math.min(grid[position[0]].length - 1, position[1] + 1)])
      }
      else if (key.name === 'return') {
        //@ts-expect-error meta is not defined in type but exists in the event
        if (key.meta) {
          if (grid[position[0]][position[1]].subActions) {
            setSelectSubActionIndex(0)
          }
          else {
            bel()
          }
        }
        else {
          const action = grid[position[0]][position[1]]
          if (action) {
            done(action.value)
          }
        }
      }
      else {
        const actionWithKey = config.actions.find(a => a.key && a.key.toLowerCase() === key.name)
        if (actionWithKey) {
          done(actionWithKey.value)
        } else {
          bel()
        }
      }
    }
  })

  let output = ''

  for (let r = 0; r < rows; r++) {
    // Prepare all boxes for this row
    const boxes: string[][] = []
    for (let c = 0; c < cols; c++) {
      const action = grid[r][c]
      const isSelected = r === position[0] && c === position[1]
      
      if (!action) {
        // Empty box
        boxes.push(box({
          style: {
            border: 'single',
            width: ACTION_WIDTH,
            height: ACTION_HEIGHT,
            innerPadding: 1
          },
          lines: []
        }))
        continue
      }

      if (selectSubActionIndex !== -1 && action.subActions && action.subActions.length > 0) {
        // Render subactions
        const visibleCount = ACTION_HEIGHT - 2
        const start = Math.max(0, selectSubActionIndex - visibleCount + 1)
        const subActionsToShow = action.subActions.slice(start, start + visibleCount)
        
        const lines: Line[] = subActionsToShow.map((subAction, idx) => {
          const isSelected = start + idx === selectSubActionIndex
          const content = subAction.key 
            ? `[${subAction.key.toUpperCase()}] ${subAction.name}`
            : subAction.name
          
          return line(' ' + content, 'left', {
            background: isSelected ? '\x1b[0m' : '\x1b[7m',
          })
        })

        boxes.push(box({
          style: {
            border: 'single',
            background: '\x1b[7m',
            width: ACTION_WIDTH,
            height: ACTION_HEIGHT,
            innerPadding: 0 // No inner padding for subaction boxes
          },
          lines
        }))
      } else {
        // Regular action box
        const lines: Line[] = []
        
        // Add action name (centered)
        const words = action.name.split(' ')
        let currentLine = ''
        for (const word of words) {
          if ((currentLine + (currentLine ? ' ' : '') + word).length > ACTION_WIDTH - 4) {
            lines.push(line(currentLine, 'center'))
            currentLine = word
          } else {
            currentLine += (currentLine ? ' ' : '') + word
          }
        }
        if (currentLine) lines.push(line(currentLine, 'center'))
        
        // Add key if present (always on 4th line)
        if (action.key) {
          // Pad with empty lines if needed to reach 4th line
          while (lines.length < 3) {
            lines.push(line('', 'center'))
          }
          lines.push(line(action.key.toUpperCase(), 'center', { bold: true }))
        }
        
        // Add indicator for subactions on the last line
        if (action.subActions) {
          // Pad with empty lines if needed to reach last line
          while (lines.length < ACTION_HEIGHT - 3) {
            lines.push(line('', 'center'))
          }
          lines.push(line('*', 'right'))
        }

        boxes.push(box({
          style: {
            border: 'single',
            background: isSelected ? '\x1b[7m' : undefined,
            width: ACTION_WIDTH,
            height: ACTION_HEIGHT,
            innerPadding: 1
          },
          lines
        }))
      }
    }

    // Render each line of the boxes in this row
    for (let line = 0; line < ACTION_HEIGHT; line++) {
      let rowLine = ''
      for (let c = 0; c < cols; c++) {
        rowLine += boxes[c][line]
      }
      output += rowLine + '\n'
    }
  }

  output += selectSubActionIndex === -1 ? '\nUse arrow keys to navigate and Enter or the action key to select.' : '\nUse arrow keys to select sub action or backspace to exit'

  return output
})

export default gitActions;