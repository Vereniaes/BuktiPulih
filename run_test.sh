#!/bin/bash
cd /home/vereniaes/project/uinic/BuktiPulih
PORT=3005 node .next/standalone/server.js &
PID=0
sleep 2
python3 /mnt/c/Users/ITA/.gemini/antigravity-ide/brain/0f5bfb82-263c-464e-b115-3ab89103e445/scratch/run_visual_harness.py
kill -9  2>/dev/null || true
