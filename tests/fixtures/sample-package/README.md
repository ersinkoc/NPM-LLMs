# sample-package

A sample package for testing npm-llms documentation extraction.

## Installation

```bash
npm install sample-package
```

## Quick Start

```ts
import { add, Calculator } from 'sample-package';

// Simple function usage
const result = add(1, 2); // 3

// Class usage
const calc = new Calculator(10);
calc.add(5).add(3);
console.log(calc.getValue()); // 18
```

## API

### Functions

#### add(a, b)

Adds two numbers together.

#### subtract(a, b)

Subtracts the second number from the first.

#### multiply(...numbers)

Multiplies any number of values.

### Classes

#### Calculator

A chainable calculator class.

## Examples

### Basic Usage

```ts
import { add, subtract, multiply } from 'sample-package';

console.log(add(1, 2));        // 3
console.log(subtract(5, 3));   // 2
console.log(multiply(2, 3, 4)); // 24
```

### Using the Calculator

```ts
import { Calculator, LogLevel } from 'sample-package';

const calc = new Calculator(0);
calc.add(10).add(20).add(30);

console.log(calc.getValue()); // 60
```

## License

MIT
