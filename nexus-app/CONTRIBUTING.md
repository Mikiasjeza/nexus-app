# Contributing to Nexus

Thank you for your interest in contributing! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/nexus.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Make your changes
6. Test your changes: `npm run type-check && npm run lint`
7. Commit your changes: `git commit -m "Add your feature"`
8. Push to your fork: `git push origin feature/your-feature-name`
9. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run type checking
npm run type-check

# Run linter
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Design Principles

Before making UI or motion changes, read **`PRODUCT_IDENTITY.md`**. This product is:

- Quietly confident, not flashy
- Intelligent but not loud
- One focal point per screen
- Motion with meaning, not decoration

## Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Commit Messages

Use clear, descriptive commit messages:

```
feat: Add skill reordering functionality
fix: Resolve type error in SkillForm
docs: Update README with deployment instructions
style: Format code with Prettier
refactor: Simplify authentication logic
test: Add tests for skill validation
chore: Update dependencies
```

## Pull Request Process

1. Update documentation if needed
2. Add tests if applicable
3. Ensure all checks pass
4. Request review from maintainers
5. Address review feedback
6. Merge when approved

## Reporting Issues

When reporting issues, please include:

- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment details (browser, OS, Node version)

## Feature Requests

For feature requests:

1. Check if the feature already exists or is planned
2. Open an issue describing the feature
3. Explain the use case and benefits
4. Discuss implementation approach
5. Wait for feedback before implementing

## Questions?

- Open an issue for questions
- Check existing issues and discussions
- Review documentation

Thank you for contributing! 🎉
