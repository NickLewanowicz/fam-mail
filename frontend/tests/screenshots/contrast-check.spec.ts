/* eslint-disable no-console */
import { test, expect } from '@playwright/test'
import { setupMockAuth, setupMockApi } from '../e2e/helpers'

test('contrast sweep: light (dashboard)', async ({ page }) => {
  await setupMockAuth(page)
  await setupMockApi(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForTimeout(1500)
  const failures = await page.evaluate(() => {
    function lum(r: number, g: number, b: number) {
      const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    function parse(c: string) {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
      if (!m) return null
      return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] ? parseFloat(m[4]) : 1]
    }
    function bgOf(el: Element): [number, number, number, number] {
      let cur: Element | null = el
      while (cur) {
        const c = parse(getComputedStyle(cur).backgroundColor)
        if (c && c[3] > 0.9) return c
        cur = cur.parentElement
      }
      return [255, 255, 255, 1]
    }
    // Absolutely-positioned underlays (e.g. layoutId pills) paint behind text
    // without being ancestors — check opaque siblings that geometrically
    // contain the text's rect (fixes the step-indicator morph false positive)
    function overlayBgOf(el: Element): [number, number, number, number] | null {
      const r = el.getBoundingClientRect()
      const parent = el.parentElement
      if (!parent) return null
      for (const sib of Array.from(parent.children)) {
        if (sib === el) continue
        const c = parse(getComputedStyle(sib).backgroundColor)
        if (!c || c[3] < 0.9) continue
        const sr = sib.getBoundingClientRect()
        if (sr.left <= r.left && sr.right >= r.right && sr.top <= r.top && sr.bottom >= r.bottom) return c
      }
      return null
    }
    const out: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) {
      const text = (n.textContent ?? '').trim()
      if (!text) continue
      const el = n.parentElement
      if (!el) continue
      // decorative content is intentionally exempt
      if (el.closest('[aria-hidden="true"]')) continue
      if (/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]+$/u.test(text)) continue
      const cs = getComputedStyle(el)
      // display isn't inherited: a child of a display:none ancestor still
      // reports its own display — walk up so hidden subtrees stay exempt
      let anc: Element | null = el
      let inHiddenSubtree = false
      while (anc) {
        if (getComputedStyle(anc).display === 'none') { inHiddenSubtree = true; break }
        anc = anc.parentElement
      }
      if (inHiddenSubtree || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) continue
      const fg = parse(cs.color)
      let bg = bgOf(el)
      const under = overlayBgOf(el)
      if (under) bg = under
      if (!fg || !bg) continue
      const a = fg[3]
      const comp = [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)] as [number, number, number]
      const l1 = lum(comp[0], comp[1], comp[2])
      const l2 = lum(bg[0], bg[1], bg[2])
      const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      const px = parseFloat(cs.fontSize)
      const bold = parseInt(cs.fontWeight) >= 700
      const isLarge = px >= 24 || (px >= 18.66 && bold)
      const need = isLarge ? 3 : 4.5
      if (r < need) out.push(`${r.toFixed(2)}:1 (need ${need}) [${px}px] "${text.slice(0, 40)}" <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}">`)
    }
    return out
  })
  console.log('LIGHT-MODE CONTRAST FAILURES:')
  failures.forEach((f) => console.log('  ' + f))
  expect(failures, 'light-mode contrast failures').toEqual([])
})

test('contrast sweep: editor (create flow)', async ({ page }) => {
  await setupMockAuth(page)
  await setupMockApi(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/create')
  await page.waitForTimeout(1500)
  const failures = await page.evaluate(() => {
    function lum(r: number, g: number, b: number) {
      const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    function parse(c: string) {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
      if (!m) return null
      return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] ? parseFloat(m[4]) : 1]
    }
    function bgOf(el: Element): [number, number, number, number] {
      let cur: Element | null = el
      const alphas: [number, number, number, number][] = []
      while (cur) {
        const c = parse(getComputedStyle(cur).backgroundColor)
        if (c) {
          if (c[3] > 0.9) return c
          alphas.push(c)
        }
        cur = cur.parentElement
      }
      let acc: [number, number, number, number] = [34, 18, 21, 1]
      for (const c of alphas.reverse()) {
        const a = c[3]
        acc = [c[0] * a + acc[0] * (1 - a), c[1] * a + acc[1] * (1 - a), c[2] * a + acc[2] * (1 - a), 1]
      }
      return acc
    }
    // Absolutely-positioned underlays (e.g. layoutId pills) paint behind text
    // without being ancestors — check opaque siblings that geometrically
    // contain the text's rect (fixes the step-indicator morph false positive)
    function overlayBgOf(el: Element): [number, number, number, number] | null {
      const r = el.getBoundingClientRect()
      const parent = el.parentElement
      if (!parent) return null
      for (const sib of Array.from(parent.children)) {
        if (sib === el) continue
        const c = parse(getComputedStyle(sib).backgroundColor)
        if (!c || c[3] < 0.9) continue
        const sr = sib.getBoundingClientRect()
        if (sr.left <= r.left && sr.right >= r.right && sr.top <= r.top && sr.bottom >= r.bottom) return c
      }
      return null
    }
    const out: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) {
      const text = (n.textContent ?? '').trim()
      if (!text) continue
      const el = n.parentElement
      if (!el) continue
      // decorative content is intentionally exempt
      if (el.closest('[aria-hidden="true"]')) continue
      if (/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]+$/u.test(text)) continue
      const cs = getComputedStyle(el)
      // display isn't inherited: a child of a display:none ancestor still
      // reports its own display — walk up so hidden subtrees stay exempt
      let anc: Element | null = el
      let inHiddenSubtree = false
      while (anc) {
        if (getComputedStyle(anc).display === 'none') { inHiddenSubtree = true; break }
        anc = anc.parentElement
      }
      if (inHiddenSubtree || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) continue
      const fg = parse(cs.color)
      let bg = bgOf(el)
      const under = overlayBgOf(el)
      if (under) bg = under
      if (!fg || !bg) continue
      const a = fg[3]
      const comp = [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)] as [number, number, number]
      const l1 = lum(comp[0], comp[1], comp[2])
      const l2 = lum(bg[0], bg[1], bg[2])
      const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      const px = parseFloat(cs.fontSize)
      const bold = parseInt(cs.fontWeight) >= 700
      const isLarge = px >= 24 || (px >= 18.66 && bold)
      const need = isLarge ? 3 : 4.5
      if (r < need) out.push(`${r.toFixed(2)}:1 (need ${need}) [${px}px] "${text.slice(0, 40)}" <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}">`)
    }
    return out
  })
  console.log('EDITOR CONTRAST FAILURES:')
  failures.forEach((f) => console.log('  ' + f))
  expect(failures, 'editor contrast failures').toEqual([])
})
