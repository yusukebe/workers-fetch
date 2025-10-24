# Workers Fetch

A curl-like CLI tool for testing Cloudflare Workers locally.

## Installation

```bash
npm install -g workers-fetch
```

## Usage

```bash
# GET request (auto-detects wrangler.json, wrangler.jsonc, or wrangler.toml)
workers-fetch

# With path
workers-fetch /api/users

# POST request
workers-fetch -X POST -H "Content-Type:application/json" -d '{"name":"test"}' /api/users

# Custom config file
workers-fetch -c wrangler.toml /api/test
```

## Options

- `[path]` - Request path (default: `/`)
- `-X, --method <method>` - HTTP method (default: GET)
- `-H, --header <headers...>` - Custom headers (multiple allowed)
- `-d, --data <data>` - Request body data
- `-c, --config <path>` - Path to wrangler config file (auto-detected if not specified)

## Output

Returns JSON format:

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"message\":\"success\"}"
}
```

## Requirements

- Valid wrangler configuration file (`wrangler.json`, `wrangler.jsonc`, or `wrangler.toml`)
- Worker dependencies installed (`npm install` or equivalent)

## How it works

Uses [`unstable_startWorker()`](https://developers.cloudflare.com/workers/testing/unstable_startworker/) to start a Worker locally and send requests.

## Author

Yusuke Wada https://github.com/yusukebe

## License

MIT
