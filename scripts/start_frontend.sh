#!/bin/bash
echo "Starting Work AI Assistant Frontend..."
cd "$(dirname "$0")/../frontend" || exit 1
npm run dev
