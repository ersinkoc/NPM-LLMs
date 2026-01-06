#!/bin/bash
# CLI examples with AI enrichment
#
# These examples require API keys to be set as environment variables

echo "=== npm-llms with AI Enrichment ==="
echo ""

# Check for API keys
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
  echo "Warning: No AI API keys detected"
  echo "Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GROQ_API_KEY"
  echo ""
fi

# With Claude
echo "1. With Claude AI:"
echo "   export ANTHROPIC_API_KEY=your-key"
echo "   npm-llms extract lodash --llms --ai claude"
echo ""

# With OpenAI
echo "2. With OpenAI:"
echo "   export OPENAI_API_KEY=your-key"
echo "   npm-llms extract lodash --llms --ai openai"
echo ""

# With Gemini
echo "3. With Google Gemini:"
echo "   export GOOGLE_API_KEY=your-key"
echo "   npm-llms extract lodash --llms --ai gemini"
echo ""

# With Groq (fastest)
echo "4. With Groq (fastest inference):"
echo "   export GROQ_API_KEY=your-key"
echo "   npm-llms extract lodash --llms --ai groq"
echo ""

# With local Ollama (no API key needed)
echo "5. With Ollama (local, no API key):"
echo "   # First start Ollama: ollama serve"
echo "   npm-llms extract lodash --llms --ai ollama --ai-model llama3.2"
echo ""

# Specify AI model
echo "6. Specify AI model:"
echo "   npm-llms extract lodash --llms --ai openai --ai-model gpt-4o"
echo ""

# Example actual run with environment check
echo "=== Running Example ==="
echo ""

if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "Running with Claude..."
  npm-llms extract ms --llms --ai claude --stdout | head -30
elif [ -n "$OPENAI_API_KEY" ]; then
  echo "Running with OpenAI..."
  npm-llms extract ms --llms --ai openai --stdout | head -30
else
  echo "No API key found. Running without AI enrichment..."
  npm-llms extract ms --llms --stdout | head -30
fi
