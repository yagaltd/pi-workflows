# .workflows/CONTEXT.md Format

.workflows/CONTEXT.md is a **glossary of domain terms**, nothing else. No implementation details, no specs, no scratch notes.

## Format

```markdown
# Domain Glossary

## Term Name
Definition in plain language. What it means in this project.

Related terms: [Related Term], [Other Term]
```

## Rules

1. **One entry per domain term** — not per file, class, or function
2. **No implementation details** — don't describe how it's coded, only what it means
3. **Definitions are concise** — 1-3 sentences max per term
4. **Relationships between terms** — use `Related terms:` to link related concepts
5. **Create lazily** — only add a term when it comes up in conversation or a decision depends on it
6. **Update when terms change** — if a term's meaning shifts during development, update the entry

## Example

```markdown
# Domain Glossary

## Order
A customer's request to purchase one or more items. An Order transitions through states: Pending → Confirmed → Shipped → Delivered. Can be cancelled before Shipped.

Related terms: [Customer], [Line Item], [Shipment]

## Customer
A person or business that places Orders. Identified by email and shipping address.

Related terms: [Order], [Address]

## Line Item
A single product within an Order, with quantity and price at time of order.

Related terms: [Order], [Product]
```
