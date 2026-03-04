#!/bin/bash
# 将 work-ai-assistant 上传到 GitHub (wq-powerful)
# 使用前请确认已执行：read -s GITHUB_TOKEN

set -e

PROJECT_DIR="/mnt/c/Users/SHUAI/Desktop/work-ai-assistant"
GITHUB_USER="wq-powerful"
REPO_NAME="work-ai-assistant"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 错误：\$GITHUB_TOKEN 未设置，请先运行：read -s GITHUB_TOKEN"
    exit 1
fi

echo "=== 步骤 1：在 GitHub 创建仓库 ==="
RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{
        \"name\": \"$REPO_NAME\",
        \"description\": \"Self-hosted AI assistant with RAG support - FastAPI backend, React frontend, Electron desktop app\",
        \"private\": false,
        \"auto_init\": false
    }")

if echo "$RESPONSE" | grep -q '"full_name"'; then
    echo "✅ 仓库创建成功"
elif echo "$RESPONSE" | grep -q 'already exists'; then
    echo "⚠️  仓库已存在，继续后续步骤..."
else
    echo "❌ 创建仓库失败，响应："
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "=== 步骤 2：安全审计（确认无敏感文件）==="
cd "$PROJECT_DIR"
git add --dry-run . 2>&1 | grep -E "(\.env|config\.json|release/|node_modules)" && {
    echo "❌ 警告：检测到可能的敏感文件，请检查 .gitignore！"
    exit 1
} || echo "✅ 未发现敏感文件泄露"

echo ""
echo "=== 步骤 3：添加文件并提交 ==="
git add .
echo "--- 当前提交文件列表 ---"
git status --short
echo "------------------------"
git commit -m "feat: initial commit - AI assistant with RAG, FastAPI, React and Electron"
echo "✅ 提交完成"

echo ""
echo "=== 步骤 4：关联远程仓库并推送 ==="
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
git branch -M main

git push "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git" main

# 推送成功后，恢复不含 token 的 remote URL
git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "✅ 推送成功"

echo ""
echo "=== 步骤 5：设置仓库 Topics 标签 ==="
curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/topics" \
    -d '{"names": ["ai", "rag", "fastapi", "react", "electron", "python", "typescript", "llm", "self-hosted"]}' \
    | grep -q '"names"' && echo "✅ Topics 设置成功" || echo "⚠️  Topics 设置失败（不影响主要功能）"

echo ""
echo "============================================"
echo "✅ 全部完成！请访问确认："
echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
echo "============================================"
