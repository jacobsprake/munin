# Python Style Guide for Engine

Coding conventions for the Munin engine pipeline.

## Code Style

- **Formatter**: Use `black` with default settings
- **Linter**: Use `flake8` with max line length 100
- **Type Hints**: Use type hints for all function signatures
- **Docstrings**: Use Google-style docstrings

## Naming Conventions

- **Functions**: `snake_case`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private**: Prefix with `_`

## File Organization

- One class/function per file when possible
- Group related functions in modules
- Use `__init__.py` for package exports

## Error Handling

- Use structured error classes from `engine.errors`
- Include error codes and details
- Log errors with context

## Testing

- Write tests for all new functions
- Use property-based tests (Hypothesis) for invariants
- Maintain >80% code coverage

## Performance

- Profile before optimizing
- Use vectorization (NumPy) over loops
- Enable parallelization for expensive operations
- Document performance characteristics
