import { test, expect, _electron as electron } from '@playwright/test'
import path from 'node:path'

test('app launches and shows title X', async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')]
  })

  const window = await app.firstWindow()
  await expect(window).toHaveTitle('X')
  await expect(window.locator('h1')).toHaveText('X')

  await app.close()
})
