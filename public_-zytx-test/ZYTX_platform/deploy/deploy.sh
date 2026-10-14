#!/bin/bash

# ===========================================
# ZYTX Platform 一键部署脚本
# ===========================================
# 使用方法：
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装"
        exit 1
    fi
}

print_banner() {
    echo ""
    echo "=========================================="
    echo "       ZYTX Platform 部署脚本"
    echo "=========================================="
    echo ""
}

print_banner

log_info "检查环境..."
check_command docker
check_command docker

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose 未安装，请先安装"
    exit 1
fi

log_success "Docker 和 Docker Compose 已安装"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

log_info "项目目录: $PROJECT_ROOT"

if [ ! -f ".env" ]; then
    if [ -f "deploy/.env.example" ]; then
        log_warn ".env 文件不存在，正在从模板创建..."
        cp deploy/.env.example .env
        log_warn "请编辑 .env 文件配置生产环境变量！"
        log_warn "编辑命令: nano .env"
        read -p "按 Enter 继续，或 Ctrl+C 退出编辑配置..."
    else
        log_error ".env 文件不存在，请手动创建"
        exit 1
    fi fi

log_info "停止现有容器..."
docker compose down 2>/dev/null || true

log_info "构建镜像..."
docker compose build

log_info "启动服务..."
docker compose up -d

log_info "等待服务启动..."
sleep 10

log_info "检查服务状态..."
docker compose ps

echo ""
log_success "部署完成！"
echo ""
echo "=========================================="
echo "服务访问地址："
echo "  - 网站: http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
echo "  - 健康检查: http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')/health"
echo ""
echo "常用命令："
echo "  - 查看日志: docker compose logs -f"
echo "  - 重启服务: docker compose restart"
echo "  - 停止服务: docker compose down"
echo "  - 进入容器: docker compose exec flask bash"
echo "=========================================="