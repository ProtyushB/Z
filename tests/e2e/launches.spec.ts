import { test, expect, _electron as electron } from '@playwright/test'
import path from 'node:path'

test('app launches and shows title X', async () => {
  // Pass the project directory (containing package.json#main → out/main/index.js)
  // rather than the script path directly. Electron 42 only sets up the app
  // lifecycle when it can resolve a package.json#main.
  const app = await electron.launch({
    args: [path.join(__dirname, '..', '..')]
  })

  const window = await app.firstWindow()
  await expect(window).toHaveTitle('X')
  // Home route is /#/workspaces; H1 is "Workspaces" after the redirect.
  await expect(window.locator('h1')).toHaveText('Workspaces')

  await app.close()
})
