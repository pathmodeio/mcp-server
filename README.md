# @pathmode/mcp-server

Find the product decisions a request leaves open, before your coding agent builds. A deterministic
preflight: six calibrated checks, keyless, no model call.

This repository dogfoods the same workflow: [read its intent.md](intent.md).

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

## See it work

Given one instruction, `implement FN-412`, in [Fieldnote](https://github.com/pathmodeio/fieldnote)
(a fictional billing app whose ticket asks for a `Cancel plan` button), an agent with this server
wrote no product code. It found that the only cancel code in the repository was written for
refunds and would take paid days away from every customer who cancels, drafted an `intent.md` with
four open product choices, and stopped: preflight passed 6/6, still blocked by those choices.
[The recorded run](https://github.com/pathmodeio/fieldnote/blob/run-4/fn-412-keyless-proposal/RUN.md)
lists every tool call, and `npx -y @pathmode/cli preflight` on that branch reproduces the verdict.

## Links

- [npm package](https://www.npmjs.com/package/@pathmode/mcp-server): the published server, always current
- [IntentSpec](https://intentspec.org/spec): the open specification for the `intent.md` files this server writes
- [The intent.md profile](https://intentspec.org/intent-md): the six checks `check_intent_readiness` scores against
- [Pathmode](https://pathmode.io): the platform for teams
- Listed in the [MCP registry](https://registry.modelcontextprotocol.io/v0/servers?search=pathmode)
  and on [Smithery](https://smithery.ai/servers/pathmodeio/mcp-server), which carries the same
  server as a local bundle that runs the build it ships instead of fetching from npm at launch

## Issues

Bug reports and feature requests belong in [Issues](https://github.com/pathmodeio/mcp-server/issues).
Include the output of `npx @pathmode/mcp-server --version` and the client you are running.

## License

MIT
