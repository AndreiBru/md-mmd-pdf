# Contributing

Thanks for contributing.

## Development

Run quality checks:

```bash
npm run check
```

Run package dry-run:

```bash
npm run pack:check
```

## Maintainer Release Steps

1. Ensure your branch is up to date:

```bash
git pull --rebase origin main
```

2. Run checks:

```bash
npm run check
npm run pack:check
```

3. Ensure npm auth is valid:

```bash
npm whoami
```

If needed, login:

```bash
npm login
```

4. Bump version:

```bash
npm version patch
# or npm version minor
# or npm version major
```

5. Push commit and tags:

```bash
git push origin main --follow-tags
```

6. Publish:

```bash
npm publish
```

If package is scoped, publish as public:

```bash
npm publish --access public
```

### npm Security Requirement

npm publish requires one of:

- account 2FA enabled for writes, or
- a granular access token with `bypass 2fa` enabled.
