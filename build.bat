@echo off
echo Installing requirements...
py -m pip install -r requirements.txt
py -m pip install pyinstaller
echo Building executable...
py build.py
echo Done!
pause 