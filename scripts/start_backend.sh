#!/bin/bash
echo "Starting Work AI Assistant Backend..."
cd "$(dirname "$0")/../backend" || exit 1
python main.py
