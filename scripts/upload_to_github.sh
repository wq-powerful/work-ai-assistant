#!/bin/bash
# 将 work-ai-assistant 上传到 GitHub (wq-powerful)
# 使用前请确认已执行：read -s GITHUB_TOKEN

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GITHUB_USER="${GITHUB_USER:-wq-powerful}"
REPO_NAME="${REPO_NAME:-$(basename "$PROJECT_DIR")}"
AUTH_HEADERS_FILE="$(mktemp)"
GIT_ASKPASS_SCRIPT="$(mktemp)"

cleanup() {
    rm -f "$AUTH_HEADERS_FILE" "$GIT_ASKPASS_SCRIPT"
}

trap cleanup EXIT

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 错误：\$GITHUB_TOKEN 未设置，请先运行：read -s GITHUB_TOKEN"
    exit 1
fi

cat > "$AUTH_HEADERS_FILE" <<EOF
Authorization: token $GITHUB_TOKEN
Accept: application/vnd.github.v3+json
EOF

cat > "$GIT_ASKPASS_SCRIPT" <<'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' "${GITHUB_USER:?}" ;;
  *Password*) printf '%s\n' "${GITHUB_TOKEN:?}" ;;
  *) exit 1 ;;
esac
EOF
chmod 700 "$GIT_ASKPASS_SCRIPT"

echo "=== 步骤 1：在 GitHub 创建仓库 ==="
RESPONSE=$(curl -s -X POST \
    -H @"$AUTH_HEADERS_FILE" \
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

if git diff --cached --quiet; then
    echo "⚠️  暂无可提交变更，跳过 commit"
else
    git commit -m "feat: initial commit - AI assistant with RAG, FastAPI, React and Electron"
    echo "✅ 提交完成"
fi

echo ""
echo "=== 步骤 4：关联远程仓库并推送 ==="
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
git branch -M main

GIT_ASKPASS="$GIT_ASKPASS_SCRIPT" GIT_TERMINAL_PROMPT=0 git push -u origin main
echo "✅ 推送成功"

echo ""
echo "=== 步骤 5：设置仓库 Topics 标签 ==="
curl -s -X PUT \
    -H @"$AUTH_HEADERS_FILE" \
    "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/topics" \
    -d '{"names": ["ai", "rag", "fastapi", "react", "electron", "python", "typescript", "llm", "self-hosted"]}' \
    | grep -q '"names"' && echo "✅ Topics 设置成功" || echo "⚠️  Topics 设置失败（不影响主要功能）"

echo ""
echo "============================================"
echo "✅ 全部完成！请访问确认："
echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
echo "============================================"
