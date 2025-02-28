#!/usr/bin/env python3

import re
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-f', '--file', required=True)
args = parser.parse_args()

def main() -> None:
    # テンプレートの読み込み
    with open(args.file) as f:
        orig_src = f.read()

    mod_src = orig_src

    m: re.Match = re.search(r'(\/\/\s*@version\s*\d+\.\d+\.)(\d+)\b', mod_src)
    
    if m:
        rev = int(m.group(2))
        print(f'  Revision updated: {rev} --> {rev + 1}')
        rev += 1
        mod_src = f'{mod_src[:m.start()]}{m.group(1)}{rev}{mod_src[m.end():]}'

    if mod_src == orig_src:
        raise Exception('No change.')

    with open(args.file, 'w') as f:
        f.write(mod_src)

main()
