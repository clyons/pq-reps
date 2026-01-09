export function parseSimpleYaml(text: string): unknown {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, '  '))
    .filter((line) => !/^\s*#/.test(line));

  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: unknown }> = [{ indent: -1, value: root }];

  const parseValue = (value: string): unknown => {
    const trimmed = value.trim();
    if (trimmed === '') return '';
    if (trimmed === 'null') return null;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (!Number.isNaN(Number(trimmed))) return Number(trimmed);
    const unquoted = trimmed.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    return unquoted;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].value;
    if (line.trim().startsWith('- ')) {
      const itemText = line.trim().slice(2);
      if (!Array.isArray(current)) {
        throw new Error('YAML format error: list item without list parent.');
      }
      if (itemText.includes(':')) {
        const [key, ...rest] = itemText.split(':');
        const entry: Record<string, unknown> = {};
        entry[key.trim()] = parseValue(rest.join(':'));
        current.push(entry);
        stack.push({ indent, value: entry });
      } else {
        current.push(parseValue(itemText));
      }
      continue;
    }

    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim();
    const value = rest.join(':');
    const parent = current as Record<string, unknown>;
    if (value.trim() === '') {
      const nextLine = lines.slice(i + 1).find((item) => item.trim() !== '') ?? '';
      const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? indent + 2;
      const isList = nextLine.trim().startsWith('- ');
      const container = isList ? [] : {};
      parent[key] = container;
      stack.push({ indent, value: container });
      continue;
    }

    parent[key] = parseValue(value);
  }

  return root;
}
