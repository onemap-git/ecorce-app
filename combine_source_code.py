import os
import sys
from datetime import datetime
import fnmatch
import yaml

def load_config(config_file: str) -> dict:
    with open(config_file, 'r') as file:
        return yaml.safe_load(file)

def should_ignore(path, ignore_patterns):
    # Normalize path to avoid issues with different separators (e.g., backslashes on Windows)
    normalized_path = os.path.normpath(path)
    for pattern in ignore_patterns:
        # Match the pattern against the full normalized path and each path component
        if fnmatch.fnmatch(normalized_path, pattern) or any(fnmatch.fnmatch(part, pattern) for part in normalized_path.split(os.sep)):
            return True
    return False

def combine_source_code_files(directory: str, commit_hash: str, config: dict) -> str:
    supported_extensions = config['supported_extensions']
    remove_whitespace = config.get('remove_whitespace', True)
    remove_empty_lines = config.get('remove_empty_lines', True)
    ignore_patterns = config.get('ignore_paths', [])
    
    combined_code = f"# Combined source code for commit: {commit_hash}\n"
    combined_code += f"# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    for root, dirs, files in os.walk(directory):
        # Filter out directories that match ignore patterns
        dirs[:] = [d for d in dirs if not should_ignore(os.path.join(root, d), ignore_patterns)]
        
        for file in files:
            if file == 'combine_source_code.py':
                continue
            file_path = os.path.relpath(os.path.join(root, file), directory)
            if should_ignore(file_path, ignore_patterns):
                continue
            if any(file.endswith(ext) for ext in supported_extensions):
                full_file_path = os.path.join(root, file)
                combined_code += f"\n\n# ** File: {file_path} **\n"
                
                try:
                    with open(full_file_path, 'r', encoding='utf-8') as f:
                        content = f.readlines()
                        for line in content:
                            if remove_whitespace:
                                line = line.strip()
                            if remove_empty_lines and not line:
                                continue
                            combined_code += line + "\n" if remove_whitespace else line
                except UnicodeDecodeError:
                    print(f"Warning: Skipping file due to encoding issues: {file_path}")
                    continue

                combined_code += "\n"  # Add a newline to separate files

    return combined_code

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: combine_source_code.py <commit_hash>")
        sys.exit(1)
    
    commit_hash = sys.argv[1]
    config = load_config('combiner_config.yaml')
    combined_code = combine_source_code_files('.', commit_hash, config)
    os.makedirs('combined_code', exist_ok=True)
    with open(f'combined_code/combined_code_{commit_hash}.txt', 'w') as f:
        f.write(combined_code)
