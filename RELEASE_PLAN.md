# @pathmode/mcp-server Release Plan

## Manual Release (current)

```bash
cd packages/mcp-server

# 1. Build and smoke test
npm run build
npm pack
# In a temp dir, verify the packaged CLI runs:
#   mkdir /tmp/mcp-test && cd /tmp/mcp-test
#   npm init -y && npm install /path/to/pathmode-mcp-server-X.Y.Z.tgz
#   npx pathmode-mcp --help
# Clean up:
#   rm -rf /tmp/mcp-test
rm *.tgz

# 2. Bump version
npm version patch   # or minor/major

# 3. Publish
npm publish --access public

# 4. Push
git push origin main --follow-tags
```

### Version guidance

- **patch**: bug fixes, dependency updates, prompt tweaks
- **minor**: new tools, new prompts, new config options
- **major**: breaking changes to tool schemas, removed tools, changed auth flow

## Post-publish verification

After every publish, verify from a clean environment:

```bash
npm view @pathmode/mcp-server version          # correct version?
npx @pathmode/mcp-server@latest --help         # runs without error?
npx @pathmode/mcp-server@latest setup --help   # setup subcommand works?
```

## CI Publish (future)

Tag-driven GitHub Actions workflow at `.github/workflows/publish-mcp-server.yml`:

1. Trigger on tags matching `mcp-server/v*`
2. Checkout, setup Node 18+
3. `cd packages/mcp-server && npm ci && npm run build`
4. `npm publish --access public` using `NODE_AUTH_TOKEN` secret
5. Verify `npm view` shows new version

## Registry submission

Submit `server.json` to the [MCP Registry](https://github.com/modelcontextprotocol/servers) as a PR. One-time, then updates via version bumps.
