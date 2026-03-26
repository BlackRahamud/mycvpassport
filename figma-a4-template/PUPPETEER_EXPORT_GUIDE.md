# Puppeteer PDF Export Guide

## Resume Template Technical Specifications

This 2-page A4 resume template is optimized for **pixel-perfect Puppeteer PDF rendering** with zero bleeding and clean page breaks.

### Page Specifications
- **Dimensions**: 595 × 842px (A4 standard)
- **Sidebar Width**: 180px (fixed)
- **Content Area**: Fill container (415px calculated)
- **Anti-Bleed Padding**: 40px bottom margin on content area

### Architecture
```
ResumePage (595×842px, overflow: hidden)
├── Sidebar (180px × 100%, fill container)
│   └── Vertical Auto Layout with gap
└── ContentArea (flex-1 × 100%, fill container)
    └── Vertical Auto Layout with 40px bottom padding
```

## Puppeteer Export Script

### Basic Export (Node.js)

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navigate to your resume
  await page.goto('http://localhost:5173', {
    waitUntil: 'networkidle0'
  });
  
  // Generate PDF
  await page.pdf({
    path: 'resume.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });
  
  await browser.close();
  console.log('✅ PDF generated: resume.pdf');
})();
```

### Advanced Export with Options

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new'
  });
  
  const page = await browser.newPage();
  
  // Set viewport to A4 dimensions
  await page.setViewport({
    width: 595,
    height: 842,
    deviceScaleFactor: 2 // Higher quality
  });
  
  await page.goto('http://localhost:5173', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  // Optional: Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');
  
  // Generate high-quality PDF
  await page.pdf({
    path: 'resume-high-quality.pdf',
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    displayHeaderFooter: false
  });
  
  await browser.close();
  console.log('✅ High-quality PDF generated');
})();
```

## Chrome Headless Export

### Command Line
```bash
google-chrome --headless --disable-gpu --print-to-pdf=resume.pdf \
  --print-to-pdf-no-header --no-margins \
  http://localhost:5173
```

### With Custom Page Size
```bash
google-chrome --headless --disable-gpu \
  --print-to-pdf=resume.pdf \
  --print-to-pdf-no-header \
  --no-margins \
  --virtual-time-budget=10000 \
  http://localhost:5173
```

## Browser Print (Manual)

1. Click the "📄 Print / Save as PDF" button (top right)
2. In the print dialog:
   - **Destination**: Save as PDF
   - **Pages**: All
   - **Margins**: None
   - **Scale**: 100%
   - **Background graphics**: ✅ Enabled
3. Click Save

## Quality Checklist

Before exporting, verify:

- ✅ Both pages are exactly 595×842px
- ✅ Sidebar background extends to Y=842 (bottom edge)
- ✅ No text is clipped at page edges
- ✅ 40px bottom padding prevents last line cutoff
- ✅ Sidebar width is consistent across both pages (180px)
- ✅ No phantom layers or hidden elements
- ✅ `overflow: hidden` is set on page containers

## Troubleshooting

### Problem: Text is cut off at bottom
**Solution**: Ensure `ContentArea` has 40px bottom padding

### Problem: Sidebar doesn't reach bottom
**Solution**: Check `height: 100%` and `minHeight: 100%` on Sidebar

### Problem: Page break in middle of text
**Solution**: Adjust content to fit within 842px height or move section to next page

### Problem: Blank third page appears
**Solution**: Remove any hidden layers or ensure no content exceeds 842px

### Problem: Colors look washed out
**Solution**: Add `printBackground: true` to Puppeteer options

## Performance Tips

1. **Font Loading**: Use web-safe fonts (Inter, Roboto) for faster rendering
2. **Images**: Keep image sizes optimized
3. **Wait for Render**: Use `waitUntil: 'networkidle0'` to ensure complete load
4. **Device Scale**: Set `deviceScaleFactor: 2` for crisp text in PDFs

## File Structure

```
/src/app/components/
├── ResumePage.tsx          # 595×842px container with clip
├── Sidebar.tsx             # 180px fixed width, 100% height
├── ContentArea.tsx         # Page 1 content (32px padding)
├── ContentAreaPage2.tsx    # Page 2 with space-between layout
├── SidebarSection.tsx      # Reusable sidebar blocks
├── ContactItem.tsx         # Contact info with icons
├── SkillBar.tsx            # Visual skill ratings
├── SectionHeader.tsx       # Section titles with underline
├── ExperienceItem.tsx      # Work experience entries
├── EducationItem.tsx       # Education entries
└── PrintButton.tsx         # Browser print trigger
```

## Deployment

For production PDF generation, consider:
- Serverless functions (AWS Lambda + Puppeteer)
- Docker containers with Chrome installed
- PDF generation APIs (Gotenberg, PDF.co)
- Client-side: window.print() with print stylesheets

---

**Note**: This template uses Tailwind CSS v4 and React. The print stylesheet (`/src/styles/print.css`) automatically handles page breaks and background preservation.
