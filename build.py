import PyInstaller.__main__
import platform
import os
import shutil

# Get the system platform
system = platform.system().lower()

# Ensure the files exist and copy them if needed
required_files = ['phone_numbers.txt', 'proxies.txt', 'chromedriver.exe']
for file in required_files:
    if not os.path.exists(file):
        # Create empty files if they don't exist
        with open(file, 'w') as f:
            pass
        print(f"Created empty {file}")

# Create data_files string with correct separator
data_files = [f'--add-data={file};.' for file in required_files]

# Add chromedriver.exe as a binary
binaries = [f'--add-binary=chromedriver.exe;.']

PyInstaller.__main__.run([
    'payooner.py',
    '--onefile',
    '--name=PayoneerBot',
    *data_files,
    *binaries,  # Include binaries in the build
    '--hidden-import=selenium_driverless',
    '--hidden-import=dotenv',
    '--hidden-import=asyncio'
])

# After building, copy the files to dist folder
print("Copying required files to dist folder...")
if not os.path.exists('dist'):
    os.makedirs('dist')

for file in required_files:
    shutil.copy2(file, os.path.join('dist', file))
print("Build complete! Check the dist folder.")