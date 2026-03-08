# How to Preview Your Application

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:3000
   ```
   
   **Note:** If port 3000 is busy, Next.js will automatically use port 3001, 3002, etc.
   Check the terminal output to see which port is being used.

## What You Should See

### Homepage (`http://localhost:3000`)
- **Premium Navigation**: Fixed header that becomes solid on scroll
- **Hero Section**: Three layers:
  - Narrative: "AI Skill Passport" title with clear statements
  - Interactive: Cursor-reactive mesh background (move your mouse!)
  - AI Signal: Subtle "AI-assisted" indicator with soft glow
- **Smooth Animations**: Everything glides, never snaps
- **Parallax Scrolling**: Foreground moves slightly faster than background

### Dashboard (`http://localhost:3000/dashboard`)
- **Passport Metaphor**: Sections slide like passport pages
- **Living Skill Cards**: Cards that breathe when recently updated
- **Memory Trails**: Timeline expands downward like growth history

### Skills Page (`http://localhost:3000/skills`)
- **Living Entities**: Skills animate when levels change
- **Growth States**: Visual feedback when skills progress
- **Docking Animation**: Cards dock into place on scroll

## Troubleshooting

### Server Won't Start

**Error: Port already in use**
- Solution: The server will automatically try the next port (3001, 3002, etc.)
- Check the terminal output to see which port is active

**Error: Module not found**
```bash
npm install
```

**Error: TypeScript errors**
```bash
npm run type-check
```

### Browser Shows Blank Page

1. **Check the browser console** (F12) for errors
2. **Check the terminal** for compilation errors
3. **Try hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Animations Not Working

1. **Check if reduced motion is enabled** in your OS settings
2. **Try a different browser** (Chrome, Firefox, or Edge)
3. **Check browser console** for JavaScript errors

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

## Testing Features

### Test Navigation
- Scroll down → Header becomes solid
- Hover over nav items → Underline draws, slight drift
- Click logo → Should animate on load

### Test Homepage Hero
- Move mouse around → Background mesh follows cursor
- Scroll down → Parallax effect (foreground moves faster)
- Look for "AI-assisted" indicator → Top right corner

### Test Skill Cards
- Go to `/skills` or `/dashboard`
- Hover over cards → Subtle lift and scale
- Recently updated skills → Should have breathing animation

### Test Scroll Animations
- Scroll through any page → Sections fade in smoothly
- Cards should dock into place (slight rotation)
- Lines should draw themselves

## Performance Tips

- **First load might be slower** - Next.js is compiling
- **Hot reload is enabled** - Changes appear instantly
- **Check Network tab** - Should see fast load times after initial compile

## Need Help?

If you're still having issues:

1. **Check terminal output** for specific error messages
2. **Check browser console** (F12) for runtime errors
3. **Verify Node.js version**: Should be 18.0.0 or higher
   ```bash
   node --version
   ```

## Production Preview

To see the production build:

```bash
npm run build
npm run start
```

This will show you exactly what users will see when deployed.
