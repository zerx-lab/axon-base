# ==========================================
# Crawler 服务 Dockerfile (Python FastAPI)
# ==========================================

# 基础镜像: Python 3.12 slim
FROM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (包括 Playwright 所需依赖)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv (快速 Python 包管理器)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# 将 uv 加入 PATH (uv 安装在 /root/.local/bin)
ENV PATH="/root/.local/bin:$PATH"

# 复制项目文件
COPY pyproject.toml uv.lock* ./

# 使用 uv 创建虚拟环境并安装依赖
RUN uv sync --frozen

# 安装 Playwright 浏览器 (chromium)
RUN uv run playwright install chromium

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# 启动应用
CMD ["uv", "run", "main.py"]
