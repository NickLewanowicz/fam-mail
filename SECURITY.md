# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to [nick@nicks.casa](mailto:nick@nicks.casa)
3. Include a description of the vulnerability and steps to reproduce
4. Allow reasonable time for a fix before public disclosure

## Security Considerations

- PostGrid API keys are never exposed to the frontend
- Authentication uses OIDC (Pocket ID) with JWT tokens
- All API endpoints require authentication except health checks
- Rate limiting is applied to postcard submission and webhook endpoints
- CORS is configured to restrict origins in production
