FROM python:3.11-slim AS prod

WORKDIR /app

# Tesseract (fra+eng), LibreOffice headless (.doc conversion), Poppler (pdf2image).
# Debian slim over Alpine here: LibreOffice's Alpine package is unreliable/incomplete.
RUN apt-get update && apt-get install -y --no-install-recommends \
  tesseract-ocr \
  tesseract-ocr-fra \
  libreoffice \
  poppler-utils \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY packages/ocr-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ocr-service/main.py ./

# Linux paths - overrides the Windows-path defaults baked into main.py for local dev.
ENV TESSERACT_CMD=/usr/bin/tesseract
ENV LIBREOFFICE_CMD=/usr/bin/soffice
ENV OCR_PORT=5001

EXPOSE 5001
CMD ["python", "main.py"]
