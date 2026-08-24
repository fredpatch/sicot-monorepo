FROM python:3.11-slim AS prod

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY packages/translate-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/translate-service/main.py ./

ENV TRANSLATE_PORT=5002

EXPOSE 5002
CMD ["python", "main.py"]
