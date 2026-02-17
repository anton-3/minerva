FROM python:3.14-slim

# Install system dependencies: LaTeX, ffmpeg, and build tools for manim
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        texlive \
        texlive-latex-extra \
        dvisvgm \
        ffmpeg \
        libcairo2-dev \
        libpango1.0-dev \
        pkg-config \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create the videos directory
RUN mkdir -p /app/videos

EXPOSE 5000

CMD ["python", "app.py"]