from pathlib import Path
path = Path('src/components/screens/ScreenAjustes.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
start, end = 700, 820
for i, line in enumerate(lines[start-1:end], start=start):
    print(f'{i:4}: {line}')
print('--- counts ---')
region = '\n'.join(lines[start-1:end])
for ch in '{}()<>':
    print(ch, region.count(ch))
