# Contributing to nostr-spaces-tools

Thank you for considering contributing to **nostr-spaces-tools**. We welcome bug
reports and pull requests from the community. Please take a moment to familiarise
yourself with the workflow below so we can review your contribution quickly.

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Create a feature branch based on `main` for your work. Use a descriptive
   name such as `feature/add-metrics`.
3. Install dependencies:

   ```bash
   cd package
   npm ci
   ```

4. Run the test suite to verify everything works:

   ```bash
   npm test --silent
   ```

5. Make your changes and ensure the build succeeds:

   ```bash
   npm run build
   ```

6. Follow the commit style `type(scope): summary`. For example,
   `feat(graph): add bandwidth scoring`.
7. Push your branch and open a pull request. Fill out the pull request template
   and link any relevant issues.

## Code Style

- Keep the existing code style and use ES modules.
- Include tests for any new functionality.
- Ensure `npm test --silent` passes before submitting a PR.

### Branch naming

Use `feature/*` or `fix/*` prefixes so branches are easy to categorise. Avoid
working directly on `main`.

### Pull requests

Your pull request should:

- Reference related issues in the description (e.g. "Closes #42").
- Include relevant tests and documentation updates.
- Pass CI checks and `npm run build` without errors.
- Comply with our [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting Issues

If you encounter a bug or have a feature request, please open an issue on GitHub
using one of the templates provided in `.github/ISSUE_TEMPLATE`. Include as much
detail as possible so we can reproduce the problem or evaluate your idea.

We appreciate your help in improving this project!

Please note that participation in this project is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).
