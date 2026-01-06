# AI Enrichment Examples

These examples demonstrate how to use AI providers to enhance your extracted documentation with better descriptions, examples, and summaries.

## Available Providers

| Provider | Requires | Best For |
|----------|----------|----------|
| Claude | `ANTHROPIC_API_KEY` | High-quality documentation |
| OpenAI | `OPENAI_API_KEY` | Fast, reliable results |
| Gemini | `GOOGLE_API_KEY` | Google ecosystem |
| Ollama | Local install | Privacy, no API costs |
| Groq | `GROQ_API_KEY` | Fastest inference |

## Running Examples

### With Claude (Anthropic)

```bash
export ANTHROPIC_API_KEY=your-key-here
npx tsx examples/03-ai-enrichment/with-claude.ts
```

### With OpenAI

```bash
export OPENAI_API_KEY=your-key-here
npx tsx examples/03-ai-enrichment/with-openai.ts
```

### With Ollama (Local)

```bash
# First, install and start Ollama
ollama serve

# Pull a model
ollama pull llama3.2

# Run the example
npx tsx examples/03-ai-enrichment/with-ollama.ts
```

## Configuration Options

### Enrichment Tasks

- `descriptions` - Generate missing API descriptions
- `examples` - Create usage examples
- `summary` - Write package summary
- `params` - Document parameters
- `returns` - Document return values

### Provider Config

```typescript
createClaudePlugin({
  model: 'claude-3-haiku-20240307',  // Fast and cheap
  maxTokens: 512,
  temperature: 0.3,  // Lower = more deterministic
}, {
  tasks: ['descriptions', 'examples'],
  batchSize: 5,
  skipExisting: true,
});
```

## Model Recommendations

| Provider | Speed | Quality | Model |
|----------|-------|---------|-------|
| Claude | Medium | Excellent | claude-3-haiku-20240307 |
| OpenAI | Fast | Great | gpt-4o-mini |
| Gemini | Fast | Good | gemini-1.5-flash |
| Ollama | Slow | Good | llama3.2 |
| Groq | Fastest | Good | llama-3.1-70b-versatile |

## Cost Considerations

AI enrichment uses tokens. For a typical small package:

- ~500-1000 input tokens per entry
- ~200-500 output tokens per entry

To minimize costs:

1. Use `skipExisting: true` to skip entries with descriptions
2. Use smaller, faster models for initial passes
3. Use `batchSize` to control parallelism
4. Consider Ollama for completely free local processing
