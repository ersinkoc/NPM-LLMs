#!/bin/bash
# Basic CLI usage examples for npm-llms
#
# Make sure you've built the project first:
#   npm run build

echo "=== npm-llms CLI Examples ==="
echo ""

# Basic extraction - generates llms.txt
echo "1. Basic extraction (llms.txt only):"
echo "   npm-llms extract lodash --llms"
echo ""

# Extract with specific version
echo "2. Extract specific version:"
echo "   npm-llms extract zod@3.22.0 --llms"
echo ""

# Generate all formats
echo "3. Generate all documentation formats:"
echo "   npm-llms extract express --all"
echo ""

# Output to specific directory
echo "4. Output to custom directory:"
echo "   npm-llms extract react --all -o ./docs/react"
echo ""

# Print to stdout (for piping)
echo "5. Print to stdout:"
echo "   npm-llms extract ms --llms --stdout"
echo ""

# Output as JSON
echo "6. JSON output for programmatic use:"
echo "   npm-llms extract chalk --json --stdout"
echo ""

# Custom token limit
echo "7. Custom token limit (smaller llms.txt):"
echo "   npm-llms extract lodash --llms --tokens 1000"
echo ""

# Clear cache
echo "8. Clear the cache:"
echo "   npm-llms cache-clear"
echo ""

# Show help
echo "9. Show help:"
echo "   npm-llms --help"
echo ""

# Example: Running actual commands
echo "=== Running Example ==="
echo ""
echo "Extracting 'ms' package..."
npm-llms extract ms --llms --stdout | head -50
