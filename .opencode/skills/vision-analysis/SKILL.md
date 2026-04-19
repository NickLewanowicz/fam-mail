---
name: vision-analysis
description: Analyze images and UI screenshots using the Z.AI Vision MCP server (GLM-4.6V) for QA and validation
---

## What I Do

Provide vision capabilities to GLM 5.1 (which lacks native vision) by delegating to the Z.AI Vision MCP server. This enables UI screenshot analysis, image validation, error diagnosis, and visual QA.

## When to Use Me

- When you need to analyze a UI screenshot for visual bugs
- When validating uploaded images meet PostGrid requirements
- When diagnosing errors from screenshot evidence
- When comparing UI before/after changes
- When converting mockups to code specifications

## Available MCP Tools

### image_analysis
General-purpose image understanding. Use when other tools don't fit.
```
Tool: zai-mcp-server > image_analysis
Input: { "image_path": "/path/to/image.png" }
```

### ui_to_artifact
Convert UI screenshots into code, prompts, specs, or descriptions.
```
Tool: zai-mcp-server > ui_to_artifact
Input: { "image_path": "/path/to/screenshot.png", "output_type": "code" }
```

### extract_text_from_screenshot
OCR for code, terminals, docs, and general text.
```
Tool: zai-mcp-server > extract_text_from_screenshot
Input: { "image_path": "/path/to/terminal.png" }
```

### diagnose_error_screenshot
Analyze error snapshots and propose actionable fixes.
```
Tool: zai-mcp-server > diagnose_error_screenshot
Input: { "image_path": "/path/to/error.png" }
```

### ui_diff_check
Compare two UI screenshots to flag visual or implementation drift.
```
Tool: zai-mcp-server > ui_diff_check
Input: { "image_path_1": "/path/to/before.png", "image_path_2": "/path/to/after.png" }
```

## Best Practices

1. **Save screenshots locally first** — Vision MCP works with local file paths
2. **Use specific tools** — `diagnose_error_screenshot` for errors, `ui_to_artifact` for mockups
3. **Batch analyses** — Analyze multiple screenshots in sequence within one session
4. **Cross-reference with code** — After visual analysis, verify findings against source code
5. **Be cost-aware** — Vision API calls count against your Pro plan quota (5-hour pool)

## Workflow Example: Visual QA
```
1. Build the frontend: cd frontend && pnpm build
2. Take screenshots (via Playwright or manual capture)
3. Analyze each screenshot:
   - Use image_analysis for overall assessment
   - Use ui_diff_check for before/after comparison
4. Document findings in QA report
```
