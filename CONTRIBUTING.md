# Contributing to Automated GitHub Wrapped

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the problem
- Expected vs. actual behavior
- Screenshots if applicable
- Your environment (OS, Node version, browser)

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:
- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### Submitting Pull Requests

1. **Fork the repository** and create a new branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Write clear, descriptive commit messages
   - Add comments for complex logic
   - Test your changes locally

3. **Test thoroughly**
   ```bash
   npm run dev      # Test in development
   npm run build    # Ensure it builds successfully
   npm run lint     # Check for linting errors
   ```

4. **Commit your changes**
   ```bash
   git commit -m "Add feature: description of your changes"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Provide a clear description of what your PR does
   - Reference any related issues
   - Explain any breaking changes

## 📋 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code organization
- Use CSS Modules for styling
- Keep components focused and reusable
- Add proper TypeScript types (avoid `any`)

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add new feature`
- `fix: Fix bug description`
- `docs: Update documentation`
- `refactor: Refactor code section`
- `test: Add tests`
- `chore: Update dependencies`

### Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable React components
- `lib/` - Utility functions and configurations
- `types/` - TypeScript type definitions
- `utils/` - Helper functions

### API Routes

All API routes should:
- Export `const dynamic = 'force-dynamic'` if using session/headers
- Validate user authentication via session
- Handle errors gracefully with appropriate status codes
- Return typed responses

### Testing

Before submitting a PR:
- Test authentication flow
- Test with different repository scenarios
- Check mobile responsiveness
- Verify no console errors
- Test exports functionality

## 🔒 Security

- **Never commit secrets** - Check for API keys, tokens, or passwords
- **Validate user input** - Sanitize and validate all user inputs
- **Follow security best practices** - Especially for authentication

If you discover a security vulnerability, please email the maintainer directly rather than opening a public issue.

## 🛠️ Setting Up Development Environment

1. Clone your fork
   ```bash
   git clone https://github.com/YOUR_USERNAME/github-wrapped-app.git
   cd github-wrapped-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. Run development server
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## 📝 Questions?

If you have questions about contributing, feel free to open an issue labeled with `question`.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
