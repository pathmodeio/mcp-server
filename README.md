# @pathmode/mcp-server

Deterministic intent preflight before your agent builds: six calibrated gates, keyless, no model call.

**This repository is the issue tracker for the package, not its source.** The server is developed in
Pathmode's private monorepo and published to npm from there. This repo previously held a hand-copied
snapshot of the source, which drifted several versions behind the published package. It no longer
carries that copy, so there is nothing here to read out of date.

To read the code, unpack the published tarball:

```bash
npm pack @pathmode/mcp-server && tar -xzf pathmode-mcp-server-*.tgz
```

## Install

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "pathmode": {
      "command": "npx",
      "args": ["@pathmode/mcp-server"]
    }
  }
}
```

No account and no API key. Specs live in `intent.md` in your repo, as plain markdown you own. Set
`PATHMODE_API_KEY` to sync intent and evidence across a team.

## Links

- [npm package](https://www.npmjs.com/package/@pathmode/mcp-server): the published server, always current
- [IntentSpec](https://intentspec.org/spec): the open specification for the `intent.md` files this server writes
- [The intent.md profile](https://intentspec.org/intent-md): the six checks `check_intent_readiness` scores against
- [Pathmode](https://pathmode.io): the platform for teams

## Issues

Bug reports and feature requests belong in [Issues](https://github.com/pathmodeio/mcp-server/issues).
Include the output of `npx @pathmode/mcp-server --version` and the client you are running.

## License

MIT
