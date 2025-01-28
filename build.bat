@echo off
echo Installing requirements...
pip install -r requirements.txt
pip install pyinstaller
echo Building executable...
python build.py
echo Done!
pause 